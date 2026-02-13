import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import '../../styles/history.css';

const AI_ACTION_LABELS = {
    keywordAnalysis: '키워드분석',
    competitorAnalysis: '경쟁분석',
    fullDraft: '본문생성',
    introOptimize: '도입부최적화',
    titleRecommend: '제목추천',
    tagExtract: '태그추출',
    imageGenerate: '이미지생성',
    selectionRewrite: '부분수정',
    photoAnalysis: '사진분석',
    outlineGenerate: '아웃라인',
};

const PostHistory = () => {
    const { posts, currentPostId } = useEditor();
    const [isOpen, setIsOpen] = useState(false);

    const post = posts.find(p => p.id === currentPostId);
    if (!post) return null;

    const seoScore = post.seoScore || 0;
    const charCount = post.charCount || 0;
    const editSessions = post.editSessions || [];
    const aiUsage = post.aiUsage || {};

    const hasAnyHistory = editSessions.length > 0 || Object.keys(aiUsage).length > 0 || seoScore > 0;
    if (!hasAnyHistory) return null;

    const formatTime = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    const formatDuration = (startIso, endIso) => {
        if (!startIso || !endIso) return '';
        const ms = new Date(endIso) - new Date(startIso);
        const mins = Math.round(ms / 60000);
        if (mins < 1) return '1분 미만';
        if (mins < 60) return `${mins}분`;
        return `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
    };

    // Build timeline from sessions + creation
    const timelineItems = [];

    // Creation event
    if (post.createdAt) {
        timelineItems.push({
            type: 'create',
            date: post.createdAt,
            label: `글 생성 (${post.mode === 'ai' ? 'AI' : '직접 작성'})`,
            detail: post.categoryId ? `카테고리: ${post.categoryId}` : '',
        });
    }

    // Edit sessions
    editSessions.forEach((session, i) => {
        const duration = formatDuration(session.startedAt, session.endedAt);
        const charDelta = (session.charsAfter || 0) - (session.charsBefore || 0);
        const seoDelta = (session.seoScoreAfter || 0) - (session.seoScoreBefore || 0);

        let detail = '';
        if (charDelta !== 0) {
            detail += `${session.charsBefore?.toLocaleString() || 0} → ${session.charsAfter?.toLocaleString() || 0}자`;
        }
        if (seoDelta !== 0) {
            detail += (detail ? ', ' : '') + `SEO ${session.seoScoreBefore || 0} → ${session.seoScoreAfter || 0}`;
        }

        timelineItems.push({
            type: 'edit',
            date: session.startedAt,
            label: `수정${duration ? ` (${duration})` : ''}`,
            detail,
            aiActions: session.aiActions || [],
        });
    });

    // Sort by date
    timelineItems.sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
        <div className="post-history">
            <button
                className={`post-history-toggle ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                이 글의 히스토리
                <span>{isOpen ? '▲' : '▼'}</span>
            </button>

            <div className={`post-history-content ${isOpen ? 'open' : ''}`}>
                {/* SEO Mini Gauge */}
                {seoScore > 0 && (
                    <div className="mini-gauge">
                        <div className="mini-gauge-label">
                            <span>SEO 점수</span>
                            <span>{seoScore}점</span>
                        </div>
                        <div className="mini-gauge-track">
                            <div
                                className="mini-gauge-fill seo"
                                style={{ width: `${seoScore}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Char Count Gauge */}
                {charCount > 0 && (
                    <div className="mini-gauge">
                        <div className="mini-gauge-label">
                            <span>글자수</span>
                            <span>{charCount.toLocaleString()}자</span>
                        </div>
                        <div className="mini-gauge-track">
                            <div
                                className="mini-gauge-fill chars"
                                style={{ width: `${Math.min(100, (charCount / 3000) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Timeline */}
                {timelineItems.length > 0 && (
                    <div className="timeline" style={{ marginTop: '16px' }}>
                        {timelineItems.map((item, i) => (
                            <div key={i} className="timeline-item">
                                <div className={`timeline-dot ${item.type}`} />
                                <div className="timeline-date">
                                    {formatTime(item.date)} {item.label}
                                </div>
                                {item.detail && (
                                    <div className="timeline-detail">{item.detail}</div>
                                )}
                                {item.aiActions && item.aiActions.length > 0 && (
                                    <div className="timeline-ai-tags">
                                        {item.aiActions.map((action, j) => (
                                            <span key={j} className="timeline-ai-tag">
                                                {AI_ACTION_LABELS[action] || action}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* AI Usage Summary */}
                {Object.keys(aiUsage).length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '8px' }}>
                            AI 사용 내역
                        </div>
                        <div className="ai-usage-badges">
                            {Object.entries(AI_ACTION_LABELS).map(([key, label]) => {
                                const count = aiUsage[key] || 0;
                                return (
                                    <span
                                        key={key}
                                        className={`ai-usage-badge ${count > 0 ? 'active' : 'inactive'}`}
                                    >
                                        {label}{count > 0 ? ` ${count}` : ''}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PostHistory;
