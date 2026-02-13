/**
 * History utility functions
 * - Post schema migration
 * - Daily stats aggregation
 * - History pruning (180-day retention)
 * - Storage usage monitoring
 */

const HISTORY_KEY = 'naver_blog_history';
const MAX_DAILY_DAYS = 180;
const MAX_WEEKLY_WEEKS = 12;
const MAX_KEYWORD_HISTORY = 100;
const MAX_EDIT_SESSIONS = 10;

// --- Strip HTML helper ---
const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

// --- Post Schema Migration ---
export const migratePost = (post) => {
    if (!post) return post;

    const parser = new DOMParser();
    const doc = parser.parseFromString(post.content || '', 'text/html');
    const plainText = stripHtml(post.content);

    return {
        ...post,
        categoryId: post.categoryId || 'daily',
        tone: post.tone || 'friendly',
        mode: post.mode || 'direct',
        seoScore: post.seoScore ?? 0,
        charCount: post.charCount ?? plainText.replace(/\s/g, '').length,
        imageCount: post.imageCount ?? doc.querySelectorAll('img').length,
        headingCount: post.headingCount ?? doc.querySelectorAll('h2, h3').length,
        editSessions: post.editSessions || [],
        aiUsage: post.aiUsage || {},
    };
};

export const migratePosts = (posts) => {
    if (!Array.isArray(posts)) return [];
    return posts.map(migratePost);
};

// --- History Store ---
export const loadHistory = () => {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return createEmptyHistory();
        const data = JSON.parse(raw);
        if (data.version !== 1) return createEmptyHistory();
        return data;
    } catch {
        return createEmptyHistory();
    }
};

export const saveHistory = (history) => {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.warn('[History] Save failed:', e.message);
    }
};

export const createEmptyHistory = () => ({
    version: 1,
    dailyStats: {},
    weeklyScores: [],
    categoryStats: {},
    keywordHistory: {},
});

// --- Daily Stats Aggregation ---
export const updateDailyStats = (history, post, isNewPost = false) => {
    const today = new Date().toISOString().slice(0, 10);
    const stats = history.dailyStats[today] || {
        postsCreated: 0,
        postsEdited: 0,
        totalCharsWritten: 0,
        totalEditMinutes: 0,
        avgSeoScore: 0,
        aiActionsCount: 0,
        keywordsUsed: [],
    };

    if (isNewPost) {
        stats.postsCreated += 1;
    } else {
        stats.postsEdited += 1;
    }

    stats.totalCharsWritten += post.charCount || 0;

    if (post.seoScore) {
        const totalPosts = stats.postsCreated + stats.postsEdited;
        stats.avgSeoScore = Math.round(
            ((stats.avgSeoScore * (totalPosts - 1)) + post.seoScore) / totalPosts
        );
    }

    // Track keywords used today
    if (post.keywords?.main) {
        const kw = post.keywords.main.trim();
        if (kw && !stats.keywordsUsed.includes(kw)) {
            stats.keywordsUsed.push(kw);
        }
    }

    // AI actions count
    const aiCount = Object.values(post.aiUsage || {}).reduce((sum, v) => sum + (v || 0), 0);
    stats.aiActionsCount = Math.max(stats.aiActionsCount, aiCount);

    history.dailyStats[today] = stats;
    return history;
};

// --- Session Stats ---
export const addEditSession = (post, session) => {
    if (!session || !session.startedAt) return post;

    const endedAt = session.endedAt || new Date().toISOString();
    const durationMs = new Date(endedAt) - new Date(session.startedAt);

    // Skip sessions shorter than 5 seconds
    if (durationMs < 5000) return post;

    const newSession = {
        startedAt: session.startedAt,
        endedAt,
        charsBefore: session.charsBefore || 0,
        charsAfter: session.charsAfter || 0,
        seoScoreBefore: session.seoScoreBefore || 0,
        seoScoreAfter: session.seoScoreAfter || 0,
        aiActions: session.aiActions || [],
    };

    const sessions = [...(post.editSessions || []), newSession];
    // Keep only the last MAX_EDIT_SESSIONS
    return {
        ...post,
        editSessions: sessions.slice(-MAX_EDIT_SESSIONS),
    };
};

// --- Update Edit Minutes ---
export const addEditMinutesToDaily = (history, minutes) => {
    const today = new Date().toISOString().slice(0, 10);
    const stats = history.dailyStats[today];
    if (stats) {
        stats.totalEditMinutes += minutes;
    }
    return history;
};

// --- Weekly Scores ---
export const updateWeeklyScores = (history, posts) => {
    // Get current ISO week
    const now = new Date();
    const weekKey = getISOWeek(now);

    const recentPosts = posts.filter(p => {
        if (!p.updatedAt) return false;
        const diff = now - new Date(p.updatedAt);
        return diff < 7 * 24 * 60 * 60 * 1000; // last 7 days
    });

    if (recentPosts.length === 0) return history;

    const avgScore = Math.round(
        recentPosts.reduce((sum, p) => sum + (p.seoScore || 0), 0) / recentPosts.length
    );

    const existing = history.weeklyScores.findIndex(w => w.week === weekKey);
    if (existing >= 0) {
        history.weeklyScores[existing] = { week: weekKey, avgScore, postCount: recentPosts.length };
    } else {
        history.weeklyScores.push({ week: weekKey, avgScore, postCount: recentPosts.length });
    }

    // Keep only last MAX_WEEKLY_WEEKS
    history.weeklyScores = history.weeklyScores.slice(-MAX_WEEKLY_WEEKS);
    return history;
};

// --- Category Stats ---
export const updateCategoryStats = (history, posts) => {
    const stats = {};
    posts.forEach(p => {
        const cat = p.categoryId || 'daily';
        stats[cat] = (stats[cat] || 0) + 1;
    });
    history.categoryStats = stats;
    return history;
};

// --- Keyword History ---
export const updateKeywordHistory = (history, post) => {
    const today = new Date().toISOString().slice(0, 10);
    const keywords = [
        post.keywords?.main,
        ...(post.keywords?.sub || []),
    ].filter(k => k && k.trim());

    keywords.forEach(kw => {
        const key = kw.trim();
        if (!history.keywordHistory[key]) {
            history.keywordHistory[key] = {
                count: 1,
                lastUsed: today,
                firstUsed: today,
            };
        } else {
            history.keywordHistory[key].count += 1;
            history.keywordHistory[key].lastUsed = today;
        }
    });

    // Prune to MAX_KEYWORD_HISTORY (keep most used)
    const entries = Object.entries(history.keywordHistory);
    if (entries.length > MAX_KEYWORD_HISTORY) {
        entries.sort((a, b) => b[1].count - a[1].count);
        history.keywordHistory = Object.fromEntries(entries.slice(0, MAX_KEYWORD_HISTORY));
    }

    return history;
};

// --- Pruning ---
export const pruneHistory = (history) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_DAILY_DAYS);
    const cutoffKey = cutoff.toISOString().slice(0, 10);

    const pruned = {};
    for (const [date, stats] of Object.entries(history.dailyStats)) {
        if (date >= cutoffKey) {
            pruned[date] = stats;
        }
    }
    history.dailyStats = pruned;

    // Weekly scores pruning already handled by MAX_WEEKLY_WEEKS slice
    return history;
};

// --- Full History Rebuild (from posts array) ---
export const rebuildHistory = (posts) => {
    const history = createEmptyHistory();

    posts.forEach(post => {
        const p = migratePost(post);
        updateCategoryStats(history, [p]);
        updateKeywordHistory(history, p);
    });

    // Rebuild category stats from all posts
    updateCategoryStats(history, posts.map(migratePost));

    return history;
};

// --- Storage Usage ---
export const getStorageUsage = () => {
    let total = 0;
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += localStorage.getItem(key).length * 2; // UTF-16
        }
    }
    const maxSize = 5 * 1024 * 1024; // ~5MB
    return {
        usedBytes: total,
        maxBytes: maxSize,
        usedPercent: Math.round((total / maxSize) * 100),
        usedKB: Math.round(total / 1024),
        maxKB: Math.round(maxSize / 1024),
    };
};

// --- ISO Week Helper ---
const getISOWeek = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

// --- Compute SEO Score from analysis checks ---
export const computeSeoScore = (checks) => {
    if (!checks || typeof checks !== 'object') return 0;
    const total = Object.keys(checks).length;
    if (total === 0) return 0;
    const passed = Object.values(checks).filter(Boolean).length;
    return Math.round((passed / total) * 100);
};

// --- Get streak (consecutive days of writing) ---
export const getStreak = (dailyStats) => {
    if (!dailyStats || Object.keys(dailyStats).length === 0) return 0;

    const today = new Date();
    let streak = 0;

    for (let i = 0; i < MAX_DAILY_DAYS; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const stat = dailyStats[key];

        if (stat && (stat.postsCreated > 0 || stat.postsEdited > 0)) {
            streak++;
        } else if (i === 0) {
            // Today may not have activity yet, still check yesterday
            continue;
        } else {
            break;
        }
    }

    return streak;
};
