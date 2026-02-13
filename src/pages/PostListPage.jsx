import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../context/EditorContext';
import '../styles/components.css';

const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
};

const calculateStats = (posts) => {
    if (!posts || posts.length === 0) return null;

    const totalPosts = posts.length;

    // 평균 글자수
    const charCounts = posts.map(p => stripHtml(p.content).length);
    const avgChars = Math.round(charCounts.reduce((a, b) => a + b, 0) / totalPosts);

    // 키워드 빈도 Top 5 (main + sub 합산)
    const kwFreq = {};
    posts.forEach(p => {
        if (p.keywords?.main) {
            const kw = p.keywords.main.trim();
            if (kw) kwFreq[kw] = (kwFreq[kw] || 0) + 1;
        }
        (p.keywords?.sub || []).forEach(s => {
            const kw = s?.trim();
            if (kw) kwFreq[kw] = (kwFreq[kw] || 0) + 1;
        });
    });
    const topKeywords = Object.entries(kwFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    const maxKwCount = topKeywords.length > 0 ? topKeywords[0][1] : 1;

    // 최근 7일 작성 활동
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        const count = posts.filter(p => p.createdAt && p.createdAt.slice(0, 10) === key).length;
        days.push({ key, label, count });
    }
    const maxDayCount = Math.max(...days.map(d => d.count), 1);

    return { totalPosts, avgChars, topKeywords, maxKwCount, days, maxDayCount };
};

const StatsDashboard = ({ stats }) => {
    if (!stats) return null;
    return (
        <div className="stats-dashboard">
            <h3 style={{ marginBottom: '20px', color: 'var(--color-text-main)' }}>작성 통계</h3>
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats.totalPosts}</div>
                    <div className="stat-label">총 글 수</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.avgChars.toLocaleString()}</div>
                    <div className="stat-label">평균 글자수</div>
                </div>
            </div>

            {stats.topKeywords.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--color-text-sub)' }}>키워드 Top 5</h4>
                    <div className="keyword-bar-list">
                        {stats.topKeywords.map(([kw, count]) => (
                            <div key={kw} className="keyword-bar-row">
                                <span className="keyword-bar-label">{kw}</span>
                                <div className="keyword-bar-track">
                                    <div
                                        className="keyword-bar-fill"
                                        style={{ width: `${(count / stats.maxKwCount) * 100}%` }}
                                    />
                                </div>
                                <span className="keyword-bar-count">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--color-text-sub)' }}>최근 7일 활동</h4>
                <div className="activity-chart">
                    {stats.days.map(d => (
                        <div key={d.key} className="activity-bar-col">
                            <div className="activity-bar-wrapper">
                                <div
                                    className="activity-bar-fill"
                                    style={{ height: d.count > 0 ? `${(d.count / stats.maxDayCount) * 100}%` : '0%' }}
                                />
                            </div>
                            <span className="activity-bar-label">{d.label}</span>
                            {d.count > 0 && <span className="activity-bar-count">{d.count}</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const PostListPage = () => {
    const navigate = useNavigate();
    const { posts, createPost, deletePost } = useEditor();

    const stats = useMemo(() => calculateStats(posts), [posts]);

    const handleCreate = () => {
        navigate('/start');
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
        <div className="main-container" style={{ display: 'block', maxWidth: '800px', margin: '0 auto', paddingTop: '40px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h1 style={{ color: 'var(--color-primary)' }}>작성 히스토리</h1>
                <button
                    className="add-block-btn"
                    onClick={handleCreate}
                    style={{ background: 'var(--color-accent)', color: 'white', borderColor: 'var(--color-accent)', padding: '10px 20px', fontSize: '1rem' }}
                >
                    + 새 글 작성
                </button>
            </header>

            {stats && <StatsDashboard stats={stats} />}

            <div className="post-list">
                {sortedPosts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-sub)' }}>
                        <p style={{ marginBottom: '16px', fontSize: '1.2rem' }}>📝 작성된 글이 없습니다.</p>
                        <p>새 글 작성 버튼을 눌러 블로그 포스팅을 시작해보세요!</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {sortedPosts.map(post => {
                            const plainText = stripHtml(post.content);
                            const charCount = plainText.length;
                            const preview = plainText.slice(0, 80) + (plainText.length > 80 ? '…' : '');
                            const subKeywords = (post.keywords?.sub || []).filter(k => k);

                            return (
                                <div
                                    key={post.id}
                                    onClick={() => handleEdit(post.id)}
                                    style={{
                                        padding: '24px',
                                        background: 'var(--color-surface)',
                                        borderRadius: 'var(--radius-lg)',
                                        boxShadow: 'var(--shadow-sm)',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: post.title ? 'var(--color-text-main)' : 'var(--color-text-sub)' }}>
                                            {post.title || '(제목 없음)'}
                                        </h3>

                                        {preview.trim() && (
                                            <p style={{
                                                fontSize: '0.875rem',
                                                color: 'var(--color-text-sub)',
                                                marginBottom: '10px',
                                                lineHeight: '1.5',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {preview}
                                            </p>
                                        )}

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                            {post.keywords?.main && (
                                                <span style={{
                                                    padding: '2px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600',
                                                    background: 'var(--color-accent)',
                                                    color: 'white'
                                                }}>
                                                    #{post.keywords.main}
                                                </span>
                                            )}
                                            {subKeywords.map((kw, i) => (
                                                <span key={i} style={{
                                                    padding: '2px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem',
                                                    background: 'var(--color-background)',
                                                    color: 'var(--color-text-sub)',
                                                    border: '1px solid var(--color-border)'
                                                }}>
                                                    #{kw}
                                                </span>
                                            ))}
                                        </div>

                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                            <span>📝 {charCount.toLocaleString()}자</span>
                                            <span>📅 생성: {formatDate(post.createdAt)}</span>
                                            <span>🕒 수정: {formatDate(post.updatedAt)}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(e, post.id)}
                                        style={{ color: 'var(--color-error)', padding: '8px', opacity: 0.7, flexShrink: 0, marginLeft: '12px' }}
                                    >
                                        삭제
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PostListPage;
