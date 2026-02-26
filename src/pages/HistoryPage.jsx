import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEditor } from '../context/EditorContext';
import { loadHistory, getStreak } from '../utils/history';
import { BarChart3 } from 'lucide-react';
import '../styles/history.css';

const PERIOD_OPTIONS = [
    { key: '7d', label: '7일' },
    { key: '30d', label: '30일' },
    { key: '90d', label: '90일' },
    { key: 'all', label: '전체' },
];

const AI_ACTION_LABELS = {
    keywordAnalysis: '키워드',
    competitorAnalysis: '경쟁분석',
    fullDraft: '본문생성',
    introOptimize: '도입부',
    titleRecommend: '제목추천',
    tagExtract: '태그추출',
    imageGenerate: '이미지',
    selectionRewrite: '부분수정',
    photoAnalysis: '사진분석',
    outlineGenerate: '아웃라인',
};

const MIN_POSTS_FOR_REPORT = 3;

const HistoryPage = () => {
    const { posts } = useEditor();
    const [period, setPeriod] = useState('30d');
    const history = useMemo(() => loadHistory(), [posts]);

    // 최소 글 수 가드
    if (posts.length < MIN_POSTS_FOR_REPORT) {
        return (
            <div className="history-container">
                <div className="dashboard-locked">
                    <div className="dashboard-locked-icon">
                        <BarChart3 size={48} strokeWidth={1} />
                    </div>
                    <h2 className="dashboard-locked-title">성장 리포트</h2>
                    <p className="dashboard-locked-desc">
                        글 {MIN_POSTS_FOR_REPORT}개 이상 작성하면<br />
                        나의 성장 기록을 확인할 수 있어요
                    </p>
                    <Link to="/posts" className="history-empty-cta">
                        글 작성하러 가기
                    </Link>
                </div>
            </div>
        );
    }

    // Filter posts by period
    const filteredPosts = useMemo(() => {
        if (period === 'all') return posts;
        const days = { '7d': 7, '30d': 30, '90d': 90 }[period] || 30;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return posts.filter(p => p.createdAt && new Date(p.createdAt) >= cutoff);
    }, [posts, period]);

    // ===== Summary Cards Data (3개: 총 글 수, 평균 SEO, 연속 작성일) =====
    const summaryData = useMemo(() => {
        const totalPosts = filteredPosts.length;

        // Average SEO score
        const postsWithScore = filteredPosts.filter(p => p.seoScore > 0);
        const avgSeo = postsWithScore.length > 0
            ? Math.round(postsWithScore.reduce((s, p) => s + p.seoScore, 0) / postsWithScore.length)
            : 0;

        return { totalPosts, avgSeo };
    }, [filteredPosts]);

    const streak = useMemo(() => getStreak(history.dailyStats), [history]);

    // ===== SEO Trend Data =====
    const seoTrendData = useMemo(() => {
        const scores = history.weeklyScores || [];
        if (scores.length === 0) {
            return filteredPosts
                .filter(p => p.seoScore > 0)
                .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
                .slice(-12)
                .map(p => ({
                    label: new Date(p.updatedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
                    score: p.seoScore,
                }));
        }
        return scores.map(w => ({
            label: w.week,
            score: w.avgScore,
        }));
    }, [history, filteredPosts]);

    // ===== AI Usage Data =====
    const aiUsageData = useMemo(() => {
        let aiCount = 0;
        let directCount = 0;
        const actionTotals = {};

        filteredPosts.forEach(p => {
            if (p.mode === 'ai') aiCount++;
            else directCount++;

            Object.entries(p.aiUsage || {}).forEach(([action, count]) => {
                actionTotals[action] = (actionTotals[action] || 0) + count;
            });
        });

        const total = aiCount + directCount;
        const aiPercent = total > 0 ? Math.round((aiCount / total) * 100) : 0;

        const topActions = Object.entries(actionTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);
        const maxAction = topActions.length > 0 ? topActions[0][1] : 1;

        return { aiCount, directCount, aiPercent, total, topActions, maxAction };
    }, [filteredPosts]);

    return (
        <div className="history-container">
            {/* Header */}
            <div className="history-header">
                <h1>성장 리포트</h1>
                <div className="period-filter">
                    {PERIOD_OPTIONS.map(opt => (
                        <button
                            key={opt.key}
                            className={`period-btn ${period === opt.key ? 'active' : ''}`}
                            onClick={() => setPeriod(opt.key)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards — 3개 */}
            <div className="summary-cards summary-cards-3">
                <div className="summary-card">
                    <div className="summary-card-value">{summaryData.totalPosts}</div>
                    <div className="summary-card-label">총 글 수</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-value">{summaryData.avgSeo}점</div>
                    <div className="summary-card-label">평균 SEO</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-value">
                        {streak > 0 ? `${streak}일` : '-'}
                    </div>
                    <div className="summary-card-label">연속 작성</div>
                </div>
            </div>

            {/* SEO Score Trend */}
            {seoTrendData.length > 0 && (
                <div className="history-section">
                    <h3>SEO 점수 추이</h3>
                    <div className="dot-chart">
                        <div className="dot-chart-goal" style={{ bottom: '80%' }}>
                            <span>목표 80점</span>
                        </div>
                        <div className="dot-chart-area">
                            {seoTrendData.map((d, i) => (
                                <div key={i} className="dot-chart-col" style={{ height: '100%' }}>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
                                        <div
                                            className={`dot-chart-dot ${d.score >= 70 ? 'score-high' : d.score >= 40 ? 'score-mid' : 'score-low'}`}
                                            style={{ marginBottom: `${(d.score / 100) * 100}%` }}
                                            data-score={d.score}
                                        />
                                    </div>
                                    <span className="dot-chart-label">{d.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* AI Usage */}
            <div className="history-section">
                <h3>AI 활용 비율</h3>
                <div className="stacked-bar">
                    {aiUsageData.aiCount > 0 && (
                        <div
                            className="stacked-bar-segment ai"
                            style={{ width: `${aiUsageData.aiPercent}%` }}
                        >
                            {aiUsageData.aiPercent > 15 ? `AI ${aiUsageData.aiPercent}%` : ''}
                        </div>
                    )}
                    {aiUsageData.directCount > 0 && (
                        <div
                            className="stacked-bar-segment direct"
                            style={{ width: `${100 - aiUsageData.aiPercent}%` }}
                        >
                            {(100 - aiUsageData.aiPercent) > 15 ? `직접 ${100 - aiUsageData.aiPercent}%` : ''}
                        </div>
                    )}
                </div>
                <div className="stacked-bar-legend">
                    <div className="stacked-bar-legend-item">
                        <div className="stacked-bar-legend-dot ai" />
                        <span>AI 작성 {aiUsageData.aiCount}편</span>
                    </div>
                    <div className="stacked-bar-legend-item">
                        <div className="stacked-bar-legend-dot direct" />
                        <span>직접 작성 {aiUsageData.directCount}편</span>
                    </div>
                </div>

                {aiUsageData.topActions.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                        <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-sub)', marginBottom: '10px' }}>
                            AI 기능별 사용 횟수
                        </h4>
                        <div className="hbar-list">
                            {aiUsageData.topActions.map(([action, count]) => (
                                <div key={action} className="hbar-row">
                                    <span className="hbar-label" style={{ flex: '0 0 80px' }}>
                                        {AI_ACTION_LABELS[action] || action}
                                    </span>
                                    <div className="hbar-track">
                                        <div
                                            className="hbar-fill ai"
                                            style={{ width: `${(count / aiUsageData.maxAction) * 100}%` }}
                                        />
                                    </div>
                                    <span className="hbar-count">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryPage;
