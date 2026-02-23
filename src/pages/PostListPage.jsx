import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../context/EditorContext';
import { FileText, Trash2 } from 'lucide-react';
import '../styles/components.css';
import '../styles/history.css';

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
            <h3>작성 통계</h3>
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
                <div className="stats-section">
                    <h4>키워드 Top 5</h4>
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

            <div className="stats-section">
                <h4>최근 7일 활동</h4>
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
            {stats && <StatsDashboard stats={stats} />}

            <div className="post-list">
                {sortedPosts.length === 0 ? (
                    <div className="post-list-empty">
                        <div className="post-list-empty-icon">
                            <FileText size={48} strokeWidth={1} />
                        </div>
                        <p className="post-list-empty-title">작성된 글이 없습니다.</p>
                        <p>새 글 작성 버튼을 눌러 블로그 포스팅을 시작해보세요!</p>
                    </div>
                ) : (
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
                )}
            </div>
        </div>
    );
};

export default PostListPage;
