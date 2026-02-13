import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { analyzePost } from '../utils/analysis';
import {
    migratePosts, computeSeoScore,
    loadHistory, saveHistory, updateDailyStats,
    addEditSession, addEditMinutesToDaily,
    updateWeeklyScores, updateCategoryStats,
    updateKeywordHistory, pruneHistory,
} from '../utils/history';

const EditorContext = createContext();

export const useEditor = () => useContext(EditorContext);

export const EditorProvider = ({ children }) => {
    const [posts, setPosts] = useState([]);
    const [currentPostId, setCurrentPostId] = useState(null);

    // Editor State
    const [keywords, setKeywords] = useState({ main: '', sub: ['', '', ''] });
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('<p></p>');
    const [analysis, setAnalysis] = useState({ checks: {}, issues: [], totalChars: 0, imageCount: 0, hasVideo: false, keywordDensity: 0, introLength: 0, headingCount: 0 });
    const [suggestedTone, setSuggestedTone] = useState('friendly');
    const [targetLength, setTargetLength] = useState(1500);
    const editorRef = React.useRef(null);
    const lastCursorPosRef = React.useRef(null);

    // Session tracking ref (in-memory only, no re-renders)
    const sessionRef = React.useRef(null);

    // 1. Load Posts (with migration)
    useEffect(() => {
        const savedPosts = localStorage.getItem('naver_blog_posts');
        if (savedPosts) {
            const parsed = JSON.parse(savedPosts);
            const migrated = migratePosts(parsed);
            setPosts(migrated);

            // Rebuild history from migrated posts on first load
            const history = loadHistory();
            updateCategoryStats(history, migrated);
            migrated.forEach(p => updateKeywordHistory(history, p));
            updateWeeklyScores(history, migrated);
            pruneHistory(history);
            saveHistory(history);
        }
    }, []);

    // 2. Save Posts
    useEffect(() => {
        localStorage.setItem('naver_blog_posts', JSON.stringify(posts));
    }, [posts]);

    // 3. Auto-save (Debounced) — with SEO snapshot update
    useEffect(() => {
        if (!currentPostId) return;

        const timer = setTimeout(() => {
            setPosts(prevPosts => prevPosts.map(p => {
                if (p.id !== currentPostId) return p;

                // Compute SEO snapshot
                const result = analyzePost(title, content, keywords, targetLength);
                const seoScore = computeSeoScore(result.checks);

                return {
                    ...p,
                    title,
                    content,
                    keywords,
                    updatedAt: new Date().toISOString(),
                    seoScore,
                    charCount: result.totalChars,
                    imageCount: result.imageCount,
                    headingCount: result.headingCount,
                };
            }));
        }, 1000);

        return () => clearTimeout(timer);
    }, [title, content, keywords, currentPostId, targetLength]);

    // 4. Analysis
    useEffect(() => {
        const result = analyzePost(title, content, keywords, targetLength);
        setAnalysis(result);
    }, [title, content, keywords, targetLength]);

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
        setPosts(prevPosts => prevPosts.map(p =>
            p.id === currentPostId
                ? { ...p, title, content, keywords, updatedAt: new Date().toISOString() }
                : p
        ));
        return true;
    }, [currentPostId, title, content, keywords]);

    const deletePost = useCallback((id) => {
        setPosts(prev => prev.filter(p => p.id !== id));
        setCurrentPostId(curr => curr === id ? null : curr);

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
    }), [posts, currentPostId, createPost, openPostStable, savePost, deletePost, keywords, updateMainKeyword, updateSubKeyword, updateSubKeywords, title, content, analysis, suggestedTone, targetLength, closeSession, recordAiAction, updatePostMeta]);

    return (
        <EditorContext.Provider value={value}>
            {children}
        </EditorContext.Provider>
    );
};
