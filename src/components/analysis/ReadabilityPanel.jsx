import React, { useState, useMemo, useCallback } from 'react';
import { useEditor } from '../../context/EditorContext';
import { analyzeReadability, locateSuggestion } from '../../utils/readability';

const GRADE_COLORS = {
    A: '#16A34A',
    B: '#2563EB',
    C: '#D97706',
    D: '#EF4444',
    '-': '#999'
};

const GRADE_LABELS = {
    A: '우수',
    B: '양호',
    C: '보통',
    D: '개선 필요',
    '-': '분석 대기'
};

const MetricBar = ({ label, score, maxScore }) => {
    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const barColor = pct >= 80 ? '#16A34A' : pct >= 60 ? '#2563EB' : pct >= 40 ? '#D97706' : '#EF4444';

    return (
        <div className="readability-metric">
            <div className="readability-metric-header">
                <span className="readability-metric-label">{label}</span>
                <span className="readability-metric-score" style={{ color: barColor }}>
                    {score}/{maxScore}
                </span>
            </div>
            <div className="readability-metric-bar-bg">
                <div
                    className="readability-metric-bar-fill"
                    style={{ width: `${pct}%`, background: barColor }}
                />
            </div>
        </div>
    );
};

const ReadabilityPanel = () => {
    const { content } = useEditor();
    const [isOpen, setIsOpen] = useState(false);

    const result = useMemo(() => analyzeReadability(content), [content]);
    const { score, grade, metrics, suggestions, isEmpty } = result;

    const gradeColor = GRADE_COLORS[grade] || '#999';

    const handleSuggestionClick = useCallback((suggestion) => {
        if (suggestion.locateType) {
            locateSuggestion(suggestion.locateType);
        }
    }, []);

    return (
        <div className="readability-panel">
            <button
                className="readability-panel-toggle"
                onClick={() => setIsOpen(prev => !prev)}
            >
                <span>
                    {isEmpty
                        ? '가독성 점수'
                        : <>가독성 점수 <strong style={{ color: gradeColor }}>{score}점 ({GRADE_LABELS[grade]})</strong></>
                    }
                </span>
                <span style={{ fontSize: '0.8rem', color: '#999' }}>
                    {isOpen ? '접기 ▲' : '펼치기 ▼'}
                </span>
            </button>

            {isOpen && (
                <div className="readability-panel-body">
                    {isEmpty ? (
                        <p style={{ color: '#888', fontSize: '0.88rem', textAlign: 'center', padding: '20px 0' }}>
                            {suggestions[0]?.text || '본문을 작성하면 가독성 분석이 시작됩니다.'}
                        </p>
                    ) : (
                        <>
                            {/* 점수 게이지 */}
                            <div className="readability-gauge-row">
                                <div className="readability-gauge">
                                    <svg width="90" height="90" viewBox="0 0 90 90">
                                        <circle cx="45" cy="45" r="38" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                                        <circle
                                            cx="45" cy="45" r="38" fill="none"
                                            stroke={gradeColor} strokeWidth="8"
                                            strokeDasharray="238.76"
                                            strokeDashoffset={238.76 * (1 - score / 100)}
                                            strokeLinecap="round"
                                            transform="rotate(-90 45 45)"
                                            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                                        />
                                    </svg>
                                    <div className="readability-gauge-text">
                                        <span className="readability-gauge-score" style={{ color: gradeColor }}>{score}</span>
                                        <span className="readability-gauge-label">{GRADE_LABELS[grade]}</span>
                                    </div>
                                </div>

                                {/* 지표 바 차트 */}
                                <div className="readability-metrics-list">
                                    {Object.values(metrics).map((m, i) => (
                                        <MetricBar key={i} label={m.label} score={m.score} maxScore={m.maxScore} />
                                    ))}
                                </div>
                            </div>

                            {/* 개선 제안 */}
                            {suggestions.length > 0 && (
                                <div className="readability-suggestions">
                                    <div className="readability-suggestions-title">개선 제안</div>
                                    {suggestions.slice(0, 5).map((s, i) => (
                                        <div
                                            key={i}
                                            className={`readability-suggestion-item readability-suggestion-${s.type} ${s.locateType ? 'readability-suggestion-clickable' : ''}`}
                                            onClick={() => handleSuggestionClick(s)}
                                        >
                                            <span className="readability-suggestion-icon">
                                                {s.type === 'warning' ? '!' : 'i'}
                                            </span>
                                            <span>{s.text}</span>
                                            {s.locateType && (
                                                <span className="readability-suggestion-locate">위치 보기</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {suggestions.length === 0 && (
                                <div className="readability-perfect">
                                    가독성이 우수합니다!
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReadabilityPanel;
