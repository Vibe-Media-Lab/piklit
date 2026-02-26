import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../context/EditorContext';
import { useAuth } from '../context/AuthContext';
import { callGetUsageInfo } from '../services/firebase';
import { FileText, Trash2, Plus } from 'lucide-react';
import '../styles/components.css';
import '../styles/history.css';

const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
};

const UsageBar = () => {
    const { user } = useAuth();
    const [usage, setUsage] = useState(null);
    const [loading, setLoading] = useState(false);

    const hasOwnKey = !!localStorage.getItem('openai_api_key');

    useEffect(() => {
        if (!user || hasOwnKey) return;
        setLoading(true);
        callGetUsageInfo()
            .then(result => setUsage(result.data))
            .catch(err => console.error('사용량 조회 실패:', err))
            .finally(() => setLoading(false));
    }, [user, hasOwnKey]);

    // API 키 있는 사용자: 사용량 바 숨김
    if (hasOwnKey || !user) return null;
    if (loading) return <div className="usage-bar"><span className="usage-bar-text">사용량 확인 중...</span></div>;
    if (!usage) return null;

    const percent = Math.round((usage.used / usage.limit) * 100);

    return (
        <div className="usage-bar">
            <div className="usage-bar-info">
                <span className="usage-bar-text">
                    이번 달 <strong>{usage.used}/{usage.limit}회</strong> 사용
                </span>
                <a href="/settings" className="usage-bar-upgrade" onClick={(e) => e.preventDefault()}>
                    무제한으로 업그레이드
                </a>
            </div>
            <div className="usage-bar-track">
                <div
                    className="usage-bar-fill"
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
        </div>
    );
};

const PostListPage = () => {
    const navigate = useNavigate();
    const { posts, createPost, deletePost } = useEditor();

    const handleCreate = () => {
        const newId = createPost({ mode: 'ai' });
        navigate(`/editor/${newId}`, { state: { isNew: true } });
    };

    const handleEdit = (id) => {
        navigate(`/editor/${id}`);
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        if (window.confirm('정말 삭제하시겠습니까?')) {
            deletePost(id);
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        const d = new Date(isoString);
        return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    };

    const sortedPosts = [...posts].sort((a, b) =>
        new Date(b.updatedAt) - new Date(a.updatedAt)
    );

    return (
        <div className="post-list-container">
            <UsageBar />

            {sortedPosts.length === 0 ? (
                <div className="post-list-empty">
                    <div className="post-list-empty-icon">
                        <FileText size={48} strokeWidth={1} />
                    </div>
                    <p className="post-list-empty-title">아직 작성한 글이 없습니다</p>
                    <p>사진만 올리면 AI가 블로그 글을 완성해드립니다</p>
                    <button className="posts-empty-cta" onClick={handleCreate}>
                        <Plus size={18} />
                        첫 글 작성하기
                    </button>
                </div>
            ) : (
                <>
                    {/* 새 글 CTA */}
                    <div className="posts-cta" onClick={handleCreate}>
                        <div className="posts-cta-icon">
                            <Plus size={24} />
                        </div>
                        <div className="posts-cta-text">
                            <span className="posts-cta-title">새 글 작성하기</span>
                            <span className="posts-cta-desc">사진만 올리면 5분이면 완성</span>
                        </div>
                    </div>

                    {/* 최근 글 */}
                    <h3 className="post-list-section-title">최근 글</h3>
                    <div className="post-list-stack">
                        {sortedPosts.map(post => {
                            const plainText = stripHtml(post.content);
                            const charCount = plainText.length;
                            const preview = plainText.slice(0, 80) + (plainText.length > 80 ? '…' : '');
                            const subKeywords = (post.keywords?.sub || []).filter(k => k);

                            return (
                                <div
                                    key={post.id}
                                    className="post-card"
                                    onClick={() => handleEdit(post.id)}
                                >
                                    <div className="post-card-body">
                                        <h3 className={`post-card-title ${!post.title ? 'untitled' : ''}`}>
                                            {post.title || '(제목 없음)'}
                                        </h3>

                                        {preview.trim() && (
                                            <p className="post-card-preview">{preview}</p>
                                        )}

                                        <div className="post-card-keywords">
                                            {post.keywords?.main && (
                                                <span className="post-card-keyword-main">
                                                    #{post.keywords.main}
                                                </span>
                                            )}
                                            {subKeywords.map((kw, i) => (
                                                <span key={i} className="post-card-keyword-sub">
                                                    #{kw}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="post-card-meta">
                                            {post.seoScore > 0 && (
                                                <span className={`seo-badge ${post.seoScore >= 70 ? 'score-high' : post.seoScore >= 40 ? 'score-mid' : 'score-low'}`}>
                                                    SEO {post.seoScore}점
                                                </span>
                                            )}
                                            {post.mode === 'ai' && (
                                                <span className="post-card-ai-badge">AI</span>
                                            )}
                                            <span>{charCount.toLocaleString()}자</span>
                                            <span>{formatDate(post.updatedAt)}</span>
                                        </div>
                                    </div>
                                    <button
                                        className="post-card-delete"
                                        onClick={(e) => handleDelete(e, post.id)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default PostListPage;
