import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEditor } from '../context/EditorContext';
import { CATEGORIES } from '../data/categories';
import { loadHistory, getStreak, getStorageUsage } from '../utils/history';
import '../styles/history.css';

const PERIOD_OPTIONS = [
    { key: '7d', label: '7일' },
    { key: '30d', label: '30일' },
    { key: '90d', label: '90일' },
    { key: 'all', label: '전체' },
];

const DONUT_COLORS = [
    '#FF6B35', '#E55A2B', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#64748B',
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

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const HistoryPage = () => {
    const { posts } = useEditor();
    const [period, setPeriod] = useState('30d');
    const history = useMemo(() => loadHistory(), [posts]);
    const storageUsage = useMemo(() => getStorageUsage(), [posts]);

    // Filter posts by period
    const filteredPosts = useMemo(() => {
        if (period === 'all') return posts;
        const days = { '7d': 7, '30d': 30, '90d': 90 }[period] || 30;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return posts.filter(p => p.createdAt && new Date(p.createdAt) >= cutoff);
    }, [posts, period]);

    // Filter daily stats by period
    const filteredDailyStats = useMemo(() => {
        if (period === 'all') return history.dailyStats;
        const days = { '7d': 7, '30d': 30, '90d': 90 }[period] || 30;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffKey = cutoff.toISOString().slice(0, 10);
        const filtered = {};
        for (const [date, stats] of Object.entries(history.dailyStats)) {
            if (date >= cutoffKey) filtered[date] = stats;
        }
        return filtered;
    }, [history, period]);

    // ===== Summary Cards Data =====
    const summaryData = useMemo(() => {
        const totalPosts = filteredPosts.length;

        // This week posts
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekPosts = posts.filter(p => p.createdAt && new Date(p.createdAt) >= weekStart).length;

        // Last week posts (for delta)
        const lastWeekStart = new Date(weekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekPosts = posts.filter(p => {
            if (!p.createdAt) return false;
            const d = new Date(p.createdAt);
            return d >= lastWeekStart && d < weekStart;
        }).length;
        const weekDelta = weekPosts - lastWeekPosts;

        // Average SEO score
        const postsWithScore = filteredPosts.filter(p => p.seoScore > 0);
        const avgSeo = postsWithScore.length > 0
            ? Math.round(postsWithScore.reduce((s, p) => s + p.seoScore, 0) / postsWithScore.length)
            : 0;

        // Total edit minutes
        const totalMinutes = Object.values(filteredDailyStats)
            .reduce((s, d) => s + (d.totalEditMinutes || 0), 0);
        const totalHours = Math.round(totalMinutes / 60);

        return { totalPosts, weekPosts, weekDelta, avgSeo, totalHours };
    }, [filteredPosts, filteredDailyStats, posts]);

    // ===== Productivity Trend Data =====
    const productivityData = useMemo(() => {
        const days = { '7d': 7, '30d': 30, '90d': 90, 'all': 90 }[period] || 30;
        const data = [];
        const now = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const label = `${d.getMonth() + 1}/${d.getDate()}`;
            const stat = history.dailyStats[key];
            data.push({
                key,
                label,
                count: stat ? (stat.postsCreated + stat.postsEdited) : 0,
                created: stat?.postsCreated || 0,
            });
        }
        return data;
    }, [history, period]);

    const maxBarCount = useMemo(() =>
        Math.max(...productivityData.map(d => d.count), 1),
        [productivityData]
    );

    const streak = useMemo(() => getStreak(history.dailyStats), [history]);

    // ===== SEO Trend Data =====
    const seoTrendData = useMemo(() => {
        const scores = history.weeklyScores || [];
        if (scores.length === 0) {
            // Fallback: build from posts
            return filteredPosts
                .filter(p => p.seoScore > 0)
                .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
                .slice(-12)
                .map(p => ({
                    label: new Date(p.updatedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
                    score: p.seoScore,
                    count: 1,
                }));
        }
        return scores.map(w => ({
            label: w.week,
            score: w.avgScore,
            count: w.postCount,
        }));
    }, [history, filteredPosts]);

    // ===== Category Donut Data =====
    const categoryData = useMemo(() => {
        const stats = {};
        filteredPosts.forEach(p => {
            const cat = p.categoryId || 'daily';
            stats[cat] = (stats[cat] || 0) + 1;
        });
        const entries = Object.entries(stats).sort((a, b) => b[1] - a[1]);
        const total = entries.reduce((s, [, v]) => s + v, 0);
        return { entries, total };
    }, [filteredPosts]);

    const donutGradient = useMemo(() => {
        if (categoryData.total === 0) return 'conic-gradient(#E0E0E0 0deg, #E0E0E0 360deg)';
        let angle = 0;
        const segments = [];
        categoryData.entries.forEach(([, count], i) => {
            const degrees = (count / categoryData.total) * 360;
            const color = DONUT_COLORS[i % DONUT_COLORS.length];
            segments.push(`${color} ${angle}deg ${angle + degrees}deg`);
            angle += degrees;
        });
        return `conic-gradient(${segments.join(', ')})`;
    }, [categoryData]);

    // ===== Keyword Strategy Data =====
    const keywordData = useMemo(() => {
        const kh = history.keywordHistory || {};
        const entries = Object.entries(kh)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10);
        const maxCount = entries.length > 0 ? entries[0][1].count : 1;

        // Reuse vs new keywords this period
        const periodKeywords = new Set();
        filteredPosts.forEach(p => {
            if (p.keywords?.main) periodKeywords.add(p.keywords.main.trim());
            (p.keywords?.sub || []).forEach(k => { if (k?.trim()) periodKeywords.add(k.trim()); });
        });

        let reused = 0;
        let fresh = 0;
        periodKeywords.forEach(kw => {
            if (kh[kw] && kh[kw].count > 1) reused++;
            else fresh++;
        });

        return { entries, maxCount, reused, fresh };
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

    // ===== Writing Pattern Heatmap =====
    const heatmapData = useMemo(() => {
        // 7 rows (days) x 24 cols (hours)
        const grid = Array.from({ length: 7 }, () => Array(24).fill(0));

        filteredPosts.forEach(p => {
            if (!p.createdAt) return;
            const d = new Date(p.createdAt);
            const day = d.getDay(); // 0=Sun
            const hour = d.getHours();
            grid[day][hour]++;
        });

        let maxVal = 0;
        grid.forEach(row => row.forEach(v => { if (v > maxVal) maxVal = v; }));

        return { grid, maxVal: maxVal || 1 };
    }, [filteredPosts]);

    const getCategoryLabel = (id) => {
        const cat = CATEGORIES.find(c => c.id === id);
        return cat ? cat.label : id;
    };

    const getCategoryIcon = (id) => {
        const cat = CATEGORIES.find(c => c.id === id);
        return cat ? cat.icon : '';
    };

    // ===== Determine bar chart label sampling =====
    const showEveryNth = productivityData.length > 15
        ? (productivityData.length > 45 ? 7 : (productivityData.length > 20 ? 5 : 3))
        : 1;

    return (
        <div className="history-container">
            {/* Header */}
            <div className="history-header">
                <h1>작성 히스토리</h1>
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

            {/* Storage Warning */}
            {storageUsage.usedPercent >= 80 && (
                <div className="storage-warning">
                    <span>저장 공간 {storageUsage.usedPercent}% 사용 중 ({storageUsage.usedKB}KB / {storageUsage.maxKB}KB). 오래된 글을 정리해주세요.</span>
                </div>
            )}

            {filteredPosts.length === 0 ? (
                <div className="history-empty">
                    <div className="big-icon">📊</div>
                    <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>아직 작성한 글이 없습니다</p>
                    <p>글을 작성하면 상세한 통계와 분석을 볼 수 있어요.</p>
                    <Link to="/start" style={{
                        display: 'inline-block', marginTop: '20px',
                        padding: '12px 24px', background: 'var(--color-primary)',
                        color: 'white', borderRadius: '8px', textDecoration: 'none',
                        fontWeight: 600
                    }}>
                        첫 글 작성하기
                    </Link>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="summary-cards">
                        <div className="summary-card">
                            <div className="summary-card-value">{summaryData.totalPosts}</div>
                            <div className="summary-card-label">총 글 수</div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-card-value">{summaryData.weekPosts}편</div>
                            <div className="summary-card-label">금주 작성</div>
                            {summaryData.weekDelta !== 0 && (
                                <div className={`summary-card-delta ${summaryData.weekDelta > 0 ? 'up' : 'down'}`}>
                                    {summaryData.weekDelta > 0 ? '+' : ''}{summaryData.weekDelta} vs 지난주
                                </div>
                            )}
                        </div>
                        <div className="summary-card">
                            <div className="summary-card-value">{summaryData.avgSeo}점</div>
                            <div className="summary-card-label">평균 SEO</div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-card-value">{summaryData.totalHours}h</div>
                            <div className="summary-card-label">총 작성시간</div>
                        </div>
                    </div>

                    {/* Productivity Trend */}
                    <div className="history-section">
                        <h3>생산성 트렌드</h3>
                        <div className="bar-chart">
                            {productivityData.map((d, i) => (
                                <div key={d.key} className="bar-chart-col">
                                    <div className="bar-chart-bar-wrapper">
                                        {d.count > 0 && (
                                            <div
                                                className="bar-chart-bar"
                                                style={{ height: `${(d.count / maxBarCount) * 100}%` }}
                                                data-count={d.count}
                                            />
                                        )}
                                    </div>
                                    {i % showEveryNth === 0 && (
                                        <span className="bar-chart-label">{d.label}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                        {streak > 0 && (
                            <div className="streak-badge">
                                연속 작성: {streak}일
                            </div>
                        )}
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

                    {/* Two-column: Category + Keyword */}
                    <div className="history-grid-2">
                        {/* Category Distribution */}
                        <div className="history-section">
                            <h3>카테고리 분포</h3>
                            <div className="donut-chart-container">
                                <div className="donut-chart" style={{ background: donutGradient }}>
                                    <div className="donut-chart-inner">
                                        {categoryData.total}편
                                    </div>
                                </div>
                                <div className="donut-legend">
                                    {categoryData.entries.slice(0, 6).map(([catId, count], i) => (
                                        <div key={catId} className="donut-legend-item">
                                            <div className="donut-legend-color" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                                            <span className="donut-legend-label">
                                                {getCategoryIcon(catId)} {getCategoryLabel(catId)}
                                            </span>
                                            <span className="donut-legend-count">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Keyword Strategy */}
                        <div className="history-section">
                            <h3>키워드 전략</h3>
                            {keywordData.reused + keywordData.fresh > 0 && (
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', marginBottom: '8px' }}>
                                        <span style={{ color: 'var(--color-accent)' }}>재사용 {keywordData.reused}개</span>
                                        <span style={{ color: '#F59E0B' }}>신규 {keywordData.fresh}개</span>
                                    </div>
                                    <div className="stacked-bar">
                                        {keywordData.reused > 0 && (
                                            <div
                                                className="stacked-bar-segment"
                                                style={{
                                                    width: `${(keywordData.reused / (keywordData.reused + keywordData.fresh)) * 100}%`,
                                                    background: 'linear-gradient(90deg, var(--color-accent), #81D4FA)'
                                                }}
                                            >
                                                {keywordData.reused > 0 ? `${Math.round((keywordData.reused / (keywordData.reused + keywordData.fresh)) * 100)}%` : ''}
                                            </div>
                                        )}
                                        {keywordData.fresh > 0 && (
                                            <div
                                                className="stacked-bar-segment"
                                                style={{
                                                    width: `${(keywordData.fresh / (keywordData.reused + keywordData.fresh)) * 100}%`,
                                                    background: 'linear-gradient(90deg, #F59E0B, #FCD34D)'
                                                }}
                                            >
                                                {keywordData.fresh > 0 ? `${Math.round((keywordData.fresh / (keywordData.reused + keywordData.fresh)) * 100)}%` : ''}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="hbar-list">
                                {keywordData.entries.slice(0, 5).map(([kw, data]) => (
                                    <div key={kw} className="hbar-row">
                                        <span className="hbar-label">{kw}</span>
                                        <div className="hbar-track">
                                            <div
                                                className="hbar-fill keyword-reuse"
                                                style={{ width: `${(data.count / keywordData.maxCount) * 100}%` }}
                                            />
                                        </div>
                                        <span className="hbar-count">{data.count}회</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Two-column: AI Usage + Writing Pattern */}
                    <div className="history-grid-2">
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

                        {/* Writing Pattern Heatmap */}
                        <div className="history-section">
                            <h3>작성 패턴</h3>
                            <div className="heatmap-container">
                                <div className="heatmap-grid">
                                    {/* Header row: hours */}
                                    <div />
                                    {Array.from({ length: 24 }, (_, h) => (
                                        <div key={`h-${h}`} className="heatmap-header">
                                            {h % 3 === 0 ? `${h}시` : ''}
                                        </div>
                                    ))}

                                    {/* Day rows */}
                                    {[0, 1, 2, 3, 4, 5, 6].map(day => (
                                        <React.Fragment key={`day-${day}`}>
                                            <div className="heatmap-day-label">{DAY_LABELS[day]}</div>
                                            {Array.from({ length: 24 }, (_, h) => {
                                                const count = heatmapData.grid[day][h];
                                                const intensity = count > 0 ? Math.max(0.15, count / heatmapData.maxVal) : 0;
                                                return (
                                                    <div
                                                        key={`${day}-${h}`}
                                                        className="heatmap-cell"
                                                        style={{
                                                            backgroundColor: count > 0
                                                                ? `rgba(255, 107, 53, ${intensity})`
                                                                : '#F3F4F6',
                                                        }}
                                                        data-tooltip={count > 0 ? `${DAY_LABELS[day]} ${h}시: ${count}편` : ''}
                                                    />
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </div>
                                <div className="heatmap-legend">
                                    <span>적음</span>
                                    {[0.15, 0.35, 0.55, 0.75, 1].map((opacity, i) => (
                                        <div
                                            key={i}
                                            className="heatmap-legend-cell"
                                            style={{ backgroundColor: `rgba(255, 107, 53, ${opacity})` }}
                                        />
                                    ))}
                                    <span>많음</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default HistoryPage;
