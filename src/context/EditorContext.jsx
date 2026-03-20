import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { analyzePost } from '../utils/analysis';
import { analyzeHumanness } from '../utils/humanness';
import {
    migratePosts, computeSeoScore,
    loadHistory, saveHistory, updateDailyStats,
    addEditSession, addEditMinutesToDaily,
    updateWeeklyScores, updateCategoryStats,
    updateKeywordHistory, pruneHistory,
} from '../utils/history';
import { useAuth } from './AuthContext';
import { savePostToCloud, loadPostsFromCloud, deletePostFromCloud, migrateLocalToCloud } from '../services/postSync';

const EditorContext = createContext();

export const useEditor = () => useContext(EditorContext);

export const EditorProvider = ({ children }) => {
    const { user } = useAuth();

    // 1. Posts — 동기 초기화 (localStorage는 동기 API이므로 첫 렌더부터 데이터 사용 가능)
    const [posts, setPosts] = useState(() => {
        const savedPosts = localStorage.getItem('naver_blog_posts');
        if (savedPosts) {
            const parsed = migratePosts(JSON.parse(savedPosts));
            // 빈 글 자동 정리 (제목 없음 + 내용 20자 미만)
            return parsed.filter(p => p.title?.trim() || (p.content?.replace(/<[^>]*>/g, '').trim().length > 20));
        }
        return [];
    });
    const [currentPostId, setCurrentPostId] = useState(null);
    const [cloudLoading, setCloudLoading] = useState(false);
    const [cloudSyncStatus, setCloudSyncStatus] = useState('idle'); // idle | syncing | synced | error
    const [migrationNeeded, setMigrationNeeded] = useState(false);

    // Editor State
    const [keywords, setKeywords] = useState({ main: '', sub: ['', '', ''] });
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('<p></p>');
    const [analysis, setAnalysis] = useState({ checks: {}, issues: [], totalChars: 0, imageCount: 0, hasVideo: false, keywordDensity: 0, introLength: 0, headingCount: 0 });
    const [suggestedTone, setSuggestedTone] = useState('friendly');
    const [targetLength, setTargetLength] = useState(1500);
    const [photoPreviewUrls, setPhotoPreviewUrls] = useState([]);
    const [humanTip, setHumanTip] = useState(null); // { original, revised, reason, index }
    const [humanAppliedIndices, setHumanAppliedIndices] = useState(new Set());
    const editorRef = React.useRef(null);
    const lastCursorPosRef = React.useRef(null);

    // Session tracking ref (in-memory only, no re-renders)
    const sessionRef = React.useRef(null);

    // 1-a. 로그인 시 Firestore에서 글 로드 + 마이그레이션 감지
    const cloudInitRef = useRef(false);
    useEffect(() => {
        if (!user || cloudInitRef.current) return;
        cloudInitRef.current = true;

        setCloudLoading(true);
        loadPostsFromCloud()
            .then(cloudPosts => {
                if (cloudPosts.length > 0) {
                    // 클라우드 글이 있으면 로컬과 병합 (클라우드 우선)
                    setPosts(localPosts => {
                        const cloudIds = new Set(cloudPosts.map(p => p.id));
                        const localOnly = localPosts.filter(p => !cloudIds.has(p.id));
                        const merged = [...cloudPosts, ...localOnly];
                        // 로컬에만 있는 글이 있으면 마이그레이션 필요
                        if (localOnly.length > 0) setMigrationNeeded(true);
                        return merged;
                    });
                } else {
                    // 클라우드 비어있고 로컬에 글이 있으면 마이그레이션 필요
                    const savedPosts = localStorage.getItem('naver_blog_posts');
                    if (savedPosts) {
                        const parsed = JSON.parse(savedPosts);
                        if (parsed.length > 0) setMigrationNeeded(true);
                    }
                }
            })
            .catch(err => console.warn('[Cloud] 글 로드 실패:', err.message))
            .finally(() => setCloudLoading(false));
    }, [user]);

    // 1-b. 마이그레이션 자동 실행 (로컬 → 클라우드)
    useEffect(() => {
        if (!migrationNeeded || !user) return;
        setMigrationNeeded(false);

        const localPosts = posts.filter(p => p.title?.trim() || (p.content?.replace(/<[^>]*>/g, '').trim().length > 20));
        if (localPosts.length === 0) return;

        console.log(`[Cloud] 로컬 글 ${localPosts.length}개 마이그레이션 시작...`);
        migrateLocalToCloud(user.uid, localPosts, (current, total) => {
            console.log(`[Cloud] 마이그레이션 ${current}/${total}`);
        })
        .then(({ migrated, failed }) => {
            console.log(`[Cloud] 마이그레이션 완료: 성공 ${migrated}, 실패 ${failed}`);
        })
        .catch(err => console.warn('[Cloud] 마이그레이션 실패:', err.message));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [migrationNeeded, user]);

    // 1-c. History rebuild (마운트 시 1회)
    useEffect(() => {
        if (posts.length === 0) return;
        const history = loadHistory();
        updateCategoryStats(history, posts);
        posts.forEach(p => updateKeywordHistory(history, p));
        updateWeeklyScores(history, posts);
        pruneHistory(history);
        saveHistory(history);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 초기 로드 시 1회만 실행 — posts는 동기 초기화로 이미 존재

    // 2. Save Posts (localStorage) — 먼저 원본 저장 시도, 용량 초과 시 이미지 제거 후 재시도
    useEffect(() => {
        try {
            localStorage.setItem('naver_blog_posts', JSON.stringify(posts));
        } catch (e) {
            // 용량 초과 시 base64 이미지 제거 후 재시도
            console.warn('[EditorContext] localStorage 용량 초과, 이미지 제거 후 재시도');
            try {
                const stripped = posts.map(p => ({
                    ...p,
                    content: p.content
                        ? p.content.replace(/<img[^>]*src="data:image\/[^"]{1000,}"[^>]*>/g, '<p style="text-align:center;color:#999;font-size:0.8rem;">[이미지 — 에디터에서 확인]</p>')
                        : p.content,
                }));
                localStorage.setItem('naver_blog_posts', JSON.stringify(stripped));
            } catch (e2) {
                console.warn('[EditorContext] localStorage 저장 최종 실패:', e2.message);
            }
        }
    }, [posts]);

    // 2-b. 클라우드 동기화 (디바운스 10초)
    const cloudSaveTimerRef = useRef(null);
    const lastCloudSavedRef = useRef(null);
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    const saveToCloud = useCallback((post) => {
        const u = userRef.current;
        if (!u || !post?.id) return;
        // 손상된 content 클라우드 업로드 방지
        if (post.content?.includes('[이미지 — 에디터에서 확인]') || post.content?.includes('__stripped__')) return;
        // 같은 글 연속 저장 방지
        if (lastCloudSavedRef.current === `${post.id}_${post.updatedAt}`) return;

        setCloudSyncStatus('syncing');
        savePostToCloud(u.uid, post)
            .then(() => {
                lastCloudSavedRef.current = `${post.id}_${post.updatedAt}`;
                setCloudSyncStatus('synced');
            })
            .catch(err => {
                console.warn('[Cloud] 저장 실패:', err.message);
                setCloudSyncStatus('error');
            });
    }, []);

    // 3. Auto-save (Debounced 3초) — with SEO snapshot update
    const autoSave = useCallback(() => {
        // 플레이스홀더 content가 에디터에 로드된 상태에서는 자동저장 건너뛰기 (이미지 데이터 보호)
        if (contentRef.current?.includes('[이미지 — 에디터에서 확인]') || contentRef.current?.includes('__stripped__')) return;
        setPosts(prevPosts => prevPosts.map(p => {
            if (p.id !== currentPostIdRef.current) return p;
            const result = analyzePost(titleRef.current, contentRef.current, keywordsRef.current, targetLengthRef.current, p.categoryId || 'daily');
            const seoScore = result.totalChars < 10 ? 0 : computeSeoScore(result.checks);
            const humanResult = result.totalChars < 10 ? { isEmpty: true, score: 0 } : analyzeHumanness(contentRef.current, p.tone || 'friendly');
            const totalScore = humanResult.isEmpty ? seoScore : Math.round(seoScore * 0.6 + humanResult.score * 0.4);
            return {
                ...p,
                title: titleRef.current,
                content: contentRef.current,
                keywords: keywordsRef.current,
                updatedAt: new Date().toISOString(),
                seoScore,
                totalScore,
                charCount: result.totalChars,
                imageCount: result.imageCount,
                headingCount: result.headingCount,
            };
        }));
    }, []);

    // Refs for latest values (페이지 이탈 시 즉시 저장에 사용)
    const currentPostIdRef = useRef(currentPostId);
    const titleRef = useRef(title);
    const contentRef = useRef(content);
    const keywordsRef = useRef(keywords);
    const targetLengthRef = useRef(targetLength);
    useEffect(() => { currentPostIdRef.current = currentPostId; }, [currentPostId]);
    useEffect(() => { titleRef.current = title; }, [title]);
    useEffect(() => { contentRef.current = content; }, [content]);
    useEffect(() => { keywordsRef.current = keywords; }, [keywords]);
    useEffect(() => { targetLengthRef.current = targetLength; }, [targetLength]);

    useEffect(() => {
        if (!currentPostId) return;
        const timer = setTimeout(() => {
            autoSave();
            // 클라우드 동기화 (디바운스 10초)
            if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
            cloudSaveTimerRef.current = setTimeout(() => {
                const post = postsRef.current.find(p => p.id === currentPostIdRef.current);
                if (post) saveToCloud(post);
            }, 10000);
        }, 3000);
        return () => clearTimeout(timer);
    }, [title, content, keywords, currentPostId, targetLength, autoSave, saveToCloud]);

    // 페이지 이탈 시 즉시 저장
    useEffect(() => {
        const handleBeforeUnload = () => { if (currentPostIdRef.current) autoSave(); };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [autoSave]);

    // 4. Analysis — 현재 포스트의 categoryId 반영
    const currentCategoryId = useMemo(() => {
        const post = posts.find(p => p.id === currentPostId);
        return post?.categoryId || 'daily';
    }, [posts, currentPostId]);

    useEffect(() => {
        const result = analyzePost(title, content, keywords, targetLength, currentCategoryId);
        setAnalysis(result);
    }, [title, content, keywords, targetLength, currentCategoryId]);

    // MEMOIZED ACTIONS
    const createPost = useCallback((meta = {}) => {
        const newPost = {
            id: crypto.randomUUID(),
            title: '',
            content: '<p></p>',
            keywords: { main: '', sub: ['', '', ''] },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Extended schema
            categoryId: meta.categoryId || 'daily',
            tone: meta.tone || 'friendly',
            mode: meta.mode || 'direct',
            seoScore: 0,
            charCount: 0,
            imageCount: 0,
            headingCount: 0,
            editSessions: [],
            aiUsage: {},
        };
        setPosts(prev => [newPost, ...prev]);

        // Update daily stats
        const history = loadHistory();
        updateDailyStats(history, newPost, true);
        saveHistory(history);

        return newPost.id;
    }, []);

    // postsRef로 posts 참조 — openPostStable의 dependency 제거용
    const postsRef = React.useRef(posts);
    useEffect(() => { postsRef.current = posts; }, [posts]);

    const openPostStable = useCallback((id) => {
        const post = postsRef.current.find(p => p.id === id);
        if (post) {
            // Close previous session if exists
            if (sessionRef.current && sessionRef.current.postId !== id) {
                closeSessionInternal();
            }

            setCurrentPostId(id);
            setTitle(post.title || '');
            setContent(post.content || '<p></p>');
            setKeywords(post.keywords || { main: '', sub: ['', '', ''] });

            // Start a new edit session
            const plainText = (post.content || '').replace(/<[^>]*>/g, '');
            sessionRef.current = {
                postId: id,
                startedAt: new Date().toISOString(),
                charsBefore: plainText.replace(/\s/g, '').length,
                seoScoreBefore: post.seoScore || 0,
                aiActions: [],
            };
        }
    }, []); // No dependency on posts!

    // Internal session close (does not trigger state update)
    const closeSessionInternal = () => {
        const session = sessionRef.current;
        if (!session) return;

        const endedAt = new Date().toISOString();
        const post = postsRef.current.find(p => p.id === session.postId);
        if (!post) {
            sessionRef.current = null;
            return;
        }

        const plainText = (post.content || '').replace(/<[^>]*>/g, '');
        const charsAfter = plainText.replace(/\s/g, '').length;
        const seoScoreAfter = post.seoScore || 0;

        const completedSession = {
            ...session,
            endedAt,
            charsAfter,
            seoScoreAfter,
        };

        // Duration check — skip sessions < 5 seconds
        const durationMs = new Date(endedAt) - new Date(session.startedAt);
        if (durationMs >= 5000) {
            const updatedPost = addEditSession(post, completedSession);

            // Update post in state
            setPosts(prev => prev.map(p => p.id === session.postId ? updatedPost : p));

            // Update history
            const history = loadHistory();
            updateDailyStats(history, updatedPost, false);
            addEditMinutesToDaily(history, Math.round(durationMs / 60000));
            updateWeeklyScores(history, postsRef.current);
            updateKeywordHistory(history, updatedPost);
            updateCategoryStats(history, postsRef.current);
            pruneHistory(history);
            saveHistory(history);
        }

        sessionRef.current = null;
    };

    // Public closeSession (for route change/unmount)
    const closeSession = useCallback(() => {
        closeSessionInternal();
    }, []);

    // Record AI action in current session
    const recordAiAction = useCallback((actionName) => {
        // Update session ref
        if (sessionRef.current) {
            if (!sessionRef.current.aiActions.includes(actionName)) {
                sessionRef.current.aiActions.push(actionName);
            }
        }

        // Update post aiUsage
        setPosts(prev => prev.map(p => {
            if (p.id !== (sessionRef.current?.postId || null)) return p;
            const aiUsage = { ...p.aiUsage };
            aiUsage[actionName] = (aiUsage[actionName] || 0) + 1;
            return { ...p, aiUsage };
        }));
    }, []);

    // Close session on beforeunload
    useEffect(() => {
        const handleBeforeUnload = () => {
            closeSessionInternal();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    const savePost = useCallback(() => {
        if (!currentPostId) return false;
        const now = new Date().toISOString();
        const updatedPost = { id: currentPostId, title, content, keywords, updatedAt: now };
        setPosts(prevPosts => prevPosts.map(p =>
            p.id === currentPostId
                ? { ...p, title, content, keywords, updatedAt: now, savedAt: now,
                    _snapshot: { title, content, keywords } }
                : p
        ));
        // 명시적 저장 시 즉시 클라우드 동기화
        if (userRef.current) {
            const fullPost = postsRef.current.find(p => p.id === currentPostId);
            if (fullPost) saveToCloud({ ...fullPost, ...updatedPost });
        }
        return true;
    }, [currentPostId, title, content, keywords, saveToCloud]);

    const revertPost = useCallback((id) => {
        setPosts(prev => prev.map(p => {
            if (p.id !== id || !p._snapshot) return p;
            return { ...p, title: p._snapshot.title, content: p._snapshot.content, keywords: p._snapshot.keywords, updatedAt: p.savedAt };
        }));
    }, []);

    const deletePost = useCallback((id) => {
        setPosts(prev => prev.filter(p => p.id !== id));
        setCurrentPostId(curr => curr === id ? null : curr);

        // 클라우드 삭제
        if (userRef.current) {
            deletePostFromCloud(userRef.current.uid, id).catch(err =>
                console.warn('[Cloud] 삭제 실패:', err.message)
            );
        }

        // Update category stats after deletion
        setTimeout(() => {
            const history = loadHistory();
            const remaining = postsRef.current.filter(p => p.id !== id);
            updateCategoryStats(history, remaining);
            saveHistory(history);
        }, 0);
    }, []);

    const updateMainKeyword = useCallback((val) => setKeywords(prev => ({ ...prev, main: val })), []);
    const updateSubKeyword = useCallback((index, val) => {
        setKeywords(prev => {
            const newSub = [...prev.sub];
            newSub[index] = val;
            return { ...prev, sub: newSub };
        });
    }, []);
    const updateSubKeywords = useCallback((subArray) => {
        setKeywords(prev => ({ ...prev, sub: subArray }));
    }, []);

    // 에디터 이탈 방지 가드 — EditorPage가 설정, Sidebar가 체크
    const navigationGuardRef = React.useRef(null);

    // Update post metadata (categoryId, tone, mode)
    const updatePostMeta = useCallback((postId, meta) => {
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, ...meta } : p
        ));
    }, []);

    // Memoize the context value
    const value = useMemo(() => ({
        posts,
        currentPostId,
        createPost,
        openPost: openPostStable,
        savePost,
        deletePost,
        revertPost,

        keywords,
        updateMainKeyword,
        updateSubKeyword,
        updateSubKeywords,
        title,
        setTitle,
        content,
        setContent,
        analysis,

        suggestedTone,
        setSuggestedTone,
        targetLength,
        setTargetLength,
        editorRef,
        lastCursorPosRef,

        // New: session & history
        closeSession,
        recordAiAction,
        updatePostMeta,

        // Photo previews (for ThumbnailPanel)
        photoPreviewUrls,
        setPhotoPreviewUrls,

        // 휴먼라이징 인라인 TIP
        humanTip,
        setHumanTip,
        humanAppliedIndices,
        setHumanAppliedIndices,

        // 에디터 이탈 방지 가드
        navigationGuardRef,

        // 클라우드 동기화 상태
        cloudLoading,
        cloudSyncStatus,
    }), [posts, currentPostId, createPost, openPostStable, savePost, deletePost, revertPost, keywords, updateMainKeyword, updateSubKeyword, updateSubKeywords, title, content, analysis, suggestedTone, targetLength, closeSession, recordAiAction, updatePostMeta, photoPreviewUrls, humanTip, humanAppliedIndices, cloudLoading, cloudSyncStatus]);

    return (
        <EditorContext.Provider value={value}>
            {children}
        </EditorContext.Provider>
    );
};
