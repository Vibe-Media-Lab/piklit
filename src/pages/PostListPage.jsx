import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../context/EditorContext';
import { useAuth } from '../context/AuthContext';
import { callGetUsageInfo } from '../services/firebase';
import { Upload, Bot, Rocket, Trash2, Plus, AlertTriangle, Sparkles } from 'lucide-react';
import RecommendSection from '../components/common/RecommendSection';
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

    // 프로모션 모드
    if (usage.isPromo) {
        return (
            <div className="usage-bar promo">
                <div className="usage-bar-info">
                    <span className="usage-bar-text">
                        <strong>첫 달 무료 체험 중</strong> (D-{usage.promoDaysLeft ?? '?'})
                    </span>
                    <span className="usage-bar-promo-badge">무제한</span>
                </div>
                <div className="usage-bar-track">
                    <div className="usage-bar-fill promo" style={{ width: '100%' }} />
                </div>
                <span className="usage-bar-text" style={{ marginTop: '4px', display: 'block' }}>
                    무제한 글 생성 가능
                </span>
            </div>
        );
    }

    // 일반 모드
    const percent = Math.round((usage.used / usage.limit) * 100);
    const isNearLimit = percent >= 80;

    return (
        <div className={`usage-bar${isNearLimit ? ' near-limit' : ''}`}>
            <div className="usage-bar-info">
                <span className="usage-bar-text">
                    이번 달 <strong>{usage.used}/{usage.limit}회</strong> 사용
                </span>
                {isNearLimit ? (
                    <button className="usage-bar-upgrade-btn" onClick={() => window.location.href = '/#pricing'}>
                        <Sparkles size={14} />
                        BYOK로 무제한 사용하기
                    </button>
                ) : (
                    <a href="/settings" className="usage-bar-upgrade" onClick={(e) => e.preventDefault()}>
                        무제한으로 업그레이드
                    </a>
                )}
            </div>
            <div className="usage-bar-track">
                <div
                    className={`usage-bar-fill${isNearLimit ? ' warning' : ''}`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
            {isNearLimit && (
                <p className="usage-bar-warning-text">
                    무료 횟수가 거의 소진되었습니다. BYOK 요금제(월 4,900원)로 무제한 글 생성하세요.
                </p>
            )}
        </div>
    );
};

const DeleteModal = ({ onConfirm, onCancel }) => {
    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [onCancel]);

    return (
        <div className="delete-modal-overlay" onClick={onCancel}>
            <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                <div className="delete-modal-icon">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="delete-modal-title">글을 삭제하시겠습니까?</h3>
                <p className="delete-modal-desc">삭제된 글은 복구할 수 없습니다.</p>
                <div className="delete-modal-actions">
                    <button className="delete-modal-cancel" onClick={onCancel}>취소</button>
                    <button className="delete-modal-confirm" onClick={onConfirm}>삭제</button>
                </div>
            </div>
        </div>
    );
};

const ONBOARDING_STEPS = [
    { icon: Upload, title: '사진 올리기', desc: '매장·음식·여행 사진을 드래그 & 드롭' },
    { icon: Bot, title: 'AI가 글 작성', desc: '키워드 분석 + SEO 본문 자동 생성' },
    { icon: Rocket, title: '네이버에 발행', desc: '복사 한 번으로 블로그에 바로 발행' },
];

const PostListPage = () => {
    const navigate = useNavigate();
    const { posts, createPost, deletePost } = useEditor();
    const [deleteTarget, setDeleteTarget] = useState(null);

    const handleCreate = () => {
        const newId = createPost({ mode: 'ai' });
        navigate(`/editor/${newId}`, { state: { isNew: true } });
    };

    const handleEdit = (id) => {
        navigate(`/editor/${id}`);
    };

    const handleDeleteClick = (e, id) => {
        e.stopPropagation();
        setDeleteTarget(id);
    };

    const handleDeleteConfirm = () => {
        if (deleteTarget) deletePost(deleteTarget);
        setDeleteTarget(null);
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
                    <div className="post-list-empty-header">
                        <h2 className="post-list-empty-title">첫 블로그 글을 만들어 보세요</h2>
                        <p className="post-list-empty-subtitle">사진만 올리면 AI가 SEO 최적화 글을 완성합니다</p>
                    </div>
                    <div className="onboarding-steps">
                        {ONBOARDING_STEPS.map((step, i) => (
                            <React.Fragment key={i}>
                                <div className="onboarding-step">
                                    <div className="onboarding-step-icon">
                                        <step.icon size={24} />
                                    </div>
                                    <span className="onboarding-step-num">STEP {i + 1}</span>
                                    <strong className="onboarding-step-title">{step.title}</strong>
                                    <span className="onboarding-step-desc">{step.desc}</span>
                                </div>
                                {i < ONBOARDING_STEPS.length - 1 && (
                                    <div className="onboarding-arrow">→</div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
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

                    {/* 다음 글 추천 */}
                    <RecommendSection />

                    {/* 최근 글 */}
                    <h3 className="post-list-section-title">최근 글</h3>
                    <div className="post-list-stack">
                        {sortedPosts.map(post => {
                            const plainText = stripHtml(post.content);
                            const charCount = plainText.length;
                            const preview = plainText.slice(0, 120) + (plainText.length > 120 ? '…' : '');
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

                                        <div className="post-card-meta">
                                            {post.seoScore > 0 && (
                                                <span className={`seo-badge ${post.seoScore >= 70 ? 'score-high' : post.seoScore >= 40 ? 'score-mid' : 'score-low'}`}>
                                                    SEO {post.seoScore}점
                                                </span>
                                            )}
                                            {post.mode === 'ai' && (
                                                <span className="post-card-ai-badge">AI</span>
                                            )}
                                            {post.keywords?.main && (
                                                <span className="post-card-keyword-inline">#{post.keywords.main}</span>
                                            )}
                                            <span>{charCount.toLocaleString()}자</span>
                                            <span>{formatDate(post.updatedAt)}</span>
                                        </div>
                                    </div>
                                    <button
                                        className="post-card-delete"
                                        onClick={(e) => handleDeleteClick(e, post.id)}
                                        aria-label="삭제"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {deleteTarget && (
                <DeleteModal
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
};

export default PostListPage;
