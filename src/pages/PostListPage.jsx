import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../context/EditorContext';
import { useAuth } from '../context/AuthContext';
import { callGetUsageInfo, callBetaStatus } from '../services/firebase';
import { Upload, Bot, Rocket, Plus, AlertTriangle, Sparkles } from 'lucide-react';
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
    const [betaStatus, setBetaStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    const hasOwnKey = !!localStorage.getItem('openai_api_key');

    useEffect(() => {
        if (!user || hasOwnKey) return;
        setLoading(true);
        Promise.all([
            callGetUsageInfo().then(r => setUsage(r.data)),
            callBetaStatus().then(r => setBetaStatus(r.data)).catch(() => {})
        ])
            .catch(err => console.error('사용량 조회 실패:', err))
            .finally(() => setLoading(false));
    }, [user, hasOwnKey]);

    // API 키 있는 사용자: 사용량 바 숨김
    if (hasOwnKey || !user) return null;
    if (loading) return <div className="usage-bar"><span className="usage-bar-text">사용량 확인 중...</span></div>;
    if (!usage) return null;

    // 베타 테스터 모드 (프로모보다 우선)
    if (betaStatus?.active) {
        return (
            <div className="usage-bar beta">
                <div className="usage-bar-info">
                    <span className="usage-bar-text">
                        <strong>Beta Tester</strong> (D-{betaStatus.daysLeft})
                    </span>
                    <span className="usage-bar-beta-badge">Pro 무제한</span>
                </div>
                <div className="usage-bar-track">
                    <div className="usage-bar-fill beta" style={{ width: '100%' }} />
                </div>
                <span className="usage-bar-text usage-bar-text-block">
                    모든 Pro 기능 무제한 사용 가능
                </span>
            </div>
        );
    }

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
                <span className="usage-bar-text usage-bar-text-block">
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

    const longPressRef = useRef(null);

    const handleLongPressStart = useCallback((id) => {
        longPressRef.current = setTimeout(() => {
            setDeleteTarget(id);
        }, 600);
    }, []);

    const handleLongPressEnd = useCallback(() => {
        if (longPressRef.current) {
            clearTimeout(longPressRef.current);
            longPressRef.current = null;
        }
    }, []);

    const handleDeleteConfirm = () => {
        if (deleteTarget) deletePost(deleteTarget);
        setDeleteTarget(null);
    };

    const formatRelativeDate = (isoString) => {
        if (!isoString) return '-';
        const d = new Date(isoString);
        const now = new Date();
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return '방금 전';
        if (diffMin < 60) return `${diffMin}분 전`;
        if (diffHr < 24) return `${diffHr}시간 전`;
        if (diffDay === 1) return '어제';
        if (diffDay < 7) return `${diffDay}일 전`;
        return `${d.getMonth() + 1}/${d.getDate()}`;
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
                    <div className="post-list-stack">
                        {sortedPosts.map(post => {
                            const plainText = stripHtml(post.content);
                            const charCount = plainText.length;
                            const preview = plainText.slice(0, 80) + (plainText.length > 80 ? '…' : '');
                            const seoClass = post.seoScore >= 70 ? 'score-high' : post.seoScore >= 40 ? 'score-mid' : 'score-muted';
                            return (
                                <div
                                    key={post.id}
                                    className="post-card"
                                    onClick={() => handleEdit(post.id)}
                                    onMouseDown={() => handleLongPressStart(post.id)}
                                    onMouseUp={handleLongPressEnd}
                                    onMouseLeave={handleLongPressEnd}
                                    onTouchStart={() => handleLongPressStart(post.id)}
                                    onTouchEnd={handleLongPressEnd}
                                >
                                    <div className="post-card-body">
                                        <div className="post-card-top">
                                            <h3 className={`post-card-title ${!post.title ? 'untitled' : ''}`}>
                                                {post.title || '(제목 없음)'}
                                            </h3>
                                            {post.seoScore > 0 && (
                                                <span className={`seo-badge-compact ${seoClass}`}>
                                                    {post.seoScore}
                                                </span>
                                            )}
                                        </div>

                                        {preview.trim() && (
                                            <p className="post-card-preview">{preview}</p>
                                        )}

                                        <div className="post-card-meta">
                                            {post.keywords?.main && (
                                                <span className="post-card-keyword-inline">#{post.keywords.main}</span>
                                            )}
                                            {charCount > 0 && <span>{charCount.toLocaleString()}자</span>}
                                            <span>{formatRelativeDate(post.updatedAt)}</span>
                                        </div>
                                    </div>
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
