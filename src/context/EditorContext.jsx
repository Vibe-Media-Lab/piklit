import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { analyzePost } from '../utils/analysis';

const EditorContext = createContext();

export const useEditor = () => useContext(EditorContext);

export const EditorProvider = ({ children }) => {
    const [posts, setPosts] = useState([]);
    const [currentPostId, setCurrentPostId] = useState(null);

    // Editor State
    const [keywords, setKeywords] = useState({ main: '', sub: ['', '', ''] });
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('<p></p>');
    const [analysis, setAnalysis] = useState({ checks: {}, issues: [], totalChars: 0, imageCount: 0, hasVideo: false });
    const [suggestedTone, setSuggestedTone] = useState('friendly');
    const [targetLength, setTargetLength] = useState(1500);
    const editorRef = React.useRef(null);
    const lastCursorPosRef = React.useRef(null);

    // 1. Load Posts
    useEffect(() => {
        const savedPosts = localStorage.getItem('naver_blog_posts');
        if (savedPosts) {
            setPosts(JSON.parse(savedPosts));
        }
    }, []);

    // 2. Save Posts
    useEffect(() => {
        localStorage.setItem('naver_blog_posts', JSON.stringify(posts));
    }, [posts]);

    // 3. Auto-save (Debounced)
    useEffect(() => {
        if (!currentPostId) return;

        const timer = setTimeout(() => {
            setPosts(prevPosts => prevPosts.map(p =>
                p.id === currentPostId
                    ? { ...p, title, content, keywords, updatedAt: new Date().toISOString() }
                    : p
            ));
        }, 1000);

        return () => clearTimeout(timer);
    }, [title, content, keywords, currentPostId]);

    // 4. Analysis
    useEffect(() => {
        const result = analyzePost(title, content, keywords, targetLength);
        setAnalysis(result);
    }, [title, content, keywords, targetLength]);

    // MEMOIZED ACTIONS
    const createPost = useCallback(() => {
        const newPost = {
            id: crypto.randomUUID(),
            title: '',
            content: '<p></p>',
            keywords: { main: '', sub: ['', '', ''] },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        setPosts(prev => [newPost, ...prev]);
        return newPost.id;
    }, []);

    // postsRef로 posts 참조 — openPostStable의 dependency 제거용
    const postsRef = React.useRef(posts);
    useEffect(() => { postsRef.current = posts; }, [posts]);

    const openPostStable = useCallback((id) => {
        const post = postsRef.current.find(p => p.id === id);
        if (post) {
            setCurrentPostId(id);
            setTitle(post.title || '');
            setContent(post.content || '<p></p>');
            setKeywords(post.keywords || { main: '', sub: ['', '', ''] });
        }
    }, []); // No dependency on posts!

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

    // Memoize the context value
    const value = useMemo(() => ({
        posts,
        currentPostId,
        createPost,
        openPost: openPostStable, // Use the stable version
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
    }), [posts, currentPostId, createPost, openPostStable, savePost, deletePost, keywords, updateMainKeyword, updateSubKeyword, updateSubKeywords, title, content, analysis, suggestedTone, targetLength]);

    return (
        <EditorContext.Provider value={value}>
            {children}
        </EditorContext.Provider>
    );
};
