import React, { useState, useMemo, useCallback } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { analyzeHumanness } from '../../utils/humanness';
import { AIService } from '../../services/openai';

const GRADE_COLORS = {
    A: '#16A34A',
    B: '#2563EB',
    C: '#D97706',
    D: '#EF4444',
    '-': '#999'
};

const GRADE_LABELS = {
    A: '사람 느낌',
    B: '양호',
    C: 'AI 느낌',
    D: 'AI 감지 위험',
    '-': '분석 대기'
};

const MetricBar = ({ label, score, maxScore }) => {
    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const barColor = pct >= 80 ? '#16A34A' : pct >= 60 ? '#2563EB' : pct >= 40 ? '#D97706' : '#EF4444';

    return (
        <div className="humanness-metric">
            <div className="humanness-metric-header">
                <span className="humanness-metric-label">{label}</span>
                <span className="humanness-metric-score" style={{ color: barColor }}>
                    {score}/{maxScore}
                </span>
            </div>
            <div className="humanness-metric-bar-bg">
                <div
                    className="humanness-metric-bar-fill"
                    style={{ width: `${pct}%`, background: barColor }}
                />
            </div>
        </div>
    );
};

const HumannessPanel = () => {
    const { content, suggestedTone, keywords, recordAiAction, editorRef } = useEditor();
    const { showToast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState(null);
    const [appliedIndices, setAppliedIndices] = useState(new Set());

    const result = useMemo(() => analyzeHumanness(content, suggestedTone), [content, suggestedTone]);
    const { score, grade, metrics, suggestions, isEmpty } = result;

    const gradeColor = GRADE_COLORS[grade] || '#999';

    const handleAiAnalyze = useCallback(async () => {
        if (!content || content === '<p></p>') {
            return showToast('본문을 먼저 작성해주세요.', 'warning');
        }
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const text = doc.body.textContent || '';
        if (text.replace(/\s/g, '').length < 100) {
            return showToast('100자 이상 작성 후 이용해주세요.', 'warning');
        }

        setAiLoading(true);
        setAppliedIndices(new Set());
        recordAiAction('humanness');
        try {
            const res = await AIService.analyzeHumanness(text, keywords.main);
            if (res?.suggestions) {
                setAiSuggestions(res);
            } else {
                showToast('AI 분석 결과를 해석할 수 없습니다.', 'error');
            }
        } catch (e) {
            showToast('AI 분석 오류: ' + e.message, 'error');
        } finally {
            setAiLoading(false);
        }
    }, [content, keywords.main, recordAiAction, showToast]);

    const handleApplySuggestion = useCallback((suggestion, index) => {
        const editor = editorRef?.current;
        if (!editor) {
            showToast('에디터를 찾을 수 없습니다.', 'error');
            return;
        }

        const { original, revised } = suggestion;
        if (!original || !revised) return;

        // TipTap 에디터 전체 텍스트에서 원문 위치 찾기
        const docText = editor.state.doc.textContent;
        const searchText = original.trim();
        const pos = docText.indexOf(searchText);

        if (pos === -1) {
            showToast('원문을 본문에서 찾을 수 없습니다.', 'warning');
            return;
        }

        // TipTap 문서의 텍스트 오프셋 → 실제 문서 position으로 변환
        let from = null;
        let to = null;
        let textOffset = 0;

        editor.state.doc.descendants((node, nodePos) => {
            if (from !== null) return false; // 이미 찾았으면 중단
            if (node.isText) {
                const nodeText = node.text;
                const startInNode = pos - textOffset;
                const endInNode = pos + searchText.length - textOffset;
                if (startInNode >= 0 && startInNode < nodeText.length) {
                    from = nodePos + startInNode;
                    // 끝이 같은 노드 안에 있을 수도, 다음 노드까지 이어질 수도 있음
                    if (endInNode <= nodeText.length) {
                        to = nodePos + endInNode;
                    }
                }
                textOffset += nodeText.length;
            }
        });

        // from만 찾고 to를 못 찾은 경우 (여러 노드에 걸쳐있는 경우) — 간단한 범위 계산
        if (from !== null && to === null) {
            to = from + searchText.length;
        }

        if (from !== null && to !== null) {
            editor.chain()
                .focus()
                .insertContentAt({ from, to }, revised)
                .run();
            setAppliedIndices(prev => new Set([...prev, index]));
            showToast('수정안이 적용되었습니다.', 'success');
        } else {
            showToast('원문 위치를 특정할 수 없습니다.', 'warning');
        }
    }, [editorRef, showToast]);

    return (
        <div className="humanness-panel">
            <button
                className="humanness-panel-toggle"
                onClick={() => setIsOpen(prev => !prev)}
            >
                <span>
                    {isEmpty
                        ? 'AI 감지 분석'
                        : <>AI 감지 분석 <strong style={{ color: gradeColor }}>{score}점 ({GRADE_LABELS[grade]})</strong></>
                    }
                </span>
                <span style={{ fontSize: '0.8rem', color: '#999' }}>
                    {isOpen ? '접기 \u25B2' : '펼치기 \u25BC'}
                </span>
            </button>

            {isOpen && (
                <div className="humanness-panel-body">
                    {isEmpty ? (
                        <p style={{ color: '#888', fontSize: '0.88rem', textAlign: 'center', padding: '20px 0' }}>
                            {suggestions[0]?.text || '본문을 작성하면 AI 감지 분석이 시작됩니다.'}
                        </p>
                    ) : (
                        <>
                            {/* 점수 게이지 */}
                            <div className="humanness-gauge-row">
                                <div className="humanness-gauge">
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
                                    <div className="humanness-gauge-text">
                                        <span className="humanness-gauge-score" style={{ color: gradeColor }}>{score}</span>
                                        <span className="humanness-gauge-label">{GRADE_LABELS[grade]}</span>
                                    </div>
                                </div>

                                <div className="humanness-metrics-list">
                                    {Object.values(metrics).map((m, i) => (
                                        <MetricBar key={i} label={m.label} score={m.score} maxScore={m.maxScore} />
                                    ))}
                                </div>
                            </div>

                            {/* 로컬 개선 제안 */}
                            {suggestions.length > 0 && (
                                <div className="humanness-suggestions">
                                    <div className="humanness-suggestions-title">개선 포인트</div>
                                    {suggestions.slice(0, 4).map((s, i) => (
                                        <div key={i} className={`humanness-suggestion-item humanness-suggestion-${s.type}`}>
                                            <span className="humanness-suggestion-icon">
                                                {s.type === 'warning' ? '!' : 'i'}
                                            </span>
                                            <span>{s.text}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {suggestions.length === 0 && (
                                <div className="humanness-perfect">
                                    사람이 쓴 것처럼 자연스럽습니다!
                                </div>
                            )}

                            {/* AI 휴먼라이징 제안 버튼 */}
                            <button
                                className="humanness-ai-btn"
                                onClick={handleAiAnalyze}
                                disabled={aiLoading}
                            >
                                {aiLoading ? '분석 중...' : 'AI 휴먼라이징 제안'}
                            </button>

                            {/* AI 제안 결과 */}
                            {aiSuggestions && (
                                <div className="humanness-ai-results">
                                    {aiSuggestions.overallTip && (
                                        <div className="humanness-ai-tip">{aiSuggestions.overallTip}</div>
                                    )}
                                    {aiSuggestions.suggestions?.map((s, i) => {
                                        const isApplied = appliedIndices.has(i);
                                        return (
                                            <div key={i} className={`humanness-ai-card ${isApplied ? 'humanness-ai-card-applied' : ''}`}>
                                                <div className="humanness-ai-original">{s.original}</div>
                                                <div className="humanness-ai-arrow">
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </div>
                                                <div className="humanness-ai-revised">{s.revised}</div>
                                                <div className="humanness-ai-card-footer">
                                                    <span className="humanness-ai-reason">{s.reason}</span>
                                                    <button
                                                        className={`humanness-ai-apply-btn ${isApplied ? 'applied' : ''}`}
                                                        onClick={() => handleApplySuggestion(s, i)}
                                                        disabled={isApplied}
                                                    >
                                                        {isApplied ? '적용됨' : '적용'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default HumannessPanel;
