import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useEditor } from '../../context/EditorContext';
import { Loader2 } from 'lucide-react';
import { useToast } from '../common/Toast';
import { analyzeHumanness } from '../../utils/humanness';
import { AIService } from '../../services/openai';
import { MetricBar } from '../common/MetricBar';

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

const HumannessPanel = ({ onLocate }) => {
    const { content, suggestedTone, keywords, recordAiAction, editorRef, humanTip, setHumanTip } = useEditor();
    const { showToast } = useToast();
    const [isOpen, setIsOpen] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState(null);
    const [appliedIndices, setAppliedIndices] = useState(new Set());
    const prevHumanTipRef = useRef(null);

    // 팝업에서 적용 시 (humanTip이 index 포함 상태에서 null로 전환) → applied 동기화
    useEffect(() => {
        const prev = prevHumanTipRef.current;
        if (prev && prev.index != null && humanTip === null) {
            setAppliedIndices(s => new Set([...s, prev.index]));
        }
        prevHumanTipRef.current = humanTip;
    }, [humanTip]);

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
            // 감점 항목 추출 (만점 미달인 지표만)
            const weakMetrics = Object.values(metrics)
                .filter(m => m.score < m.maxScore)
                .sort((a, b) => (a.score / a.maxScore) - (b.score / b.maxScore));
            const res = await AIService.analyzeHumanness(text, keywords.main, suggestedTone, weakMetrics);
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

    // 원문 클릭 시 바텀시트 닫기 → 에디터 형광펜 + TIP 카드 표시
    const handleLocateOriginal = useCallback((suggestion, index) => {
        // TIP 데이터를 context에 설정 (TiptapEditor에서 TIP 카드 렌더링)
        setHumanTip({ ...suggestion, index });

        // 모바일: 바텀시트 닫기 (미니바 없이 TIP 카드만 표시하도록 빈 문자열)
        if (onLocate) onLocate(null);

        // 약간의 딜레이 후 스크롤 + 형광펜 (바텀시트 닫힘 애니메이션 대기)
        setTimeout(() => {
            const editorEl = document.querySelector('.tiptap-content-area');
            if (!editorEl) return;

            // 이전 하이라이트 제거
            editorEl.querySelectorAll('.humanness-inline-highlight').forEach(el => {
                el.classList.remove('humanness-inline-highlight');
            });

            const searchText = (suggestion.original || '').trim().slice(0, 30);
            const paragraphs = editorEl.querySelectorAll('p');
            for (const p of paragraphs) {
                if (p.textContent.includes(searchText)) {
                    p.classList.add('humanness-inline-highlight');
                    p.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    break;
                }
            }
        }, 350);
    }, [setHumanTip, onLocate]);

    const handleApplySuggestion = useCallback((suggestion, index) => {
        const editor = editorRef?.current;
        if (!editor) {
            showToast('에디터를 찾을 수 없습니다.', 'error');
            return;
        }

        const { original, revised } = suggestion;
        if (!original || !revised) return;

        // TipTap 에디터 전체 텍스트에서 원문 위치 찾기
        // ProseMirror textContent는 블록 노드 사이에 구분자 없이 붙으므로
        // 공백 정규화 후 검색, 실패 시 앞 20자 부분 매칭 시도
        const docText = editor.state.doc.textContent;
        const searchText = original.trim();
        let pos = docText.indexOf(searchText);

        // 정확 매칭 실패 → 공백 정규화 후 재시도
        if (pos === -1) {
            const normalize = s => s.replace(/\s+/g, ' ').trim();
            const normDoc = normalize(docText);
            const normSearch = normalize(searchText);
            pos = normDoc.indexOf(normSearch);
        }

        // 그래도 실패 → 앞 20자 부분 매칭
        if (pos === -1) {
            const partial = searchText.slice(0, 20).trim();
            if (partial.length >= 8) {
                pos = docText.indexOf(partial);
            }
        }

        if (pos === -1) {
            showToast('원문을 본문에서 찾을 수 없습니다.', 'warning');
            return;
        }

        // 부분 매칭일 때는 원본 길이만큼만 교체
        const replaceLength = docText.indexOf(searchText) !== -1
            ? searchText.length
            : Math.min(searchText.length, docText.length - pos);

        // 텍스트 오프셋 → ProseMirror position 매핑 테이블 구축
        // 노드 경계(서식 태그 등)를 정확히 반영
        const posMap = []; // { textOffset, pmPos }
        let textOffset = 0;
        editor.state.doc.descendants((node, nodePos) => {
            if (node.isText) {
                for (let i = 0; i < node.text.length; i++) {
                    posMap.push({ textOffset: textOffset + i, pmPos: nodePos + i });
                }
                textOffset += node.text.length;
            }
        });
        // 끝 위치용: 마지막 문자 다음 position
        if (posMap.length > 0) {
            const last = posMap[posMap.length - 1];
            posMap.push({ textOffset: last.textOffset + 1, pmPos: last.pmPos + 1 });
        }

        const fromEntry = posMap.find(e => e.textOffset === pos);
        const toEntry = posMap.find(e => e.textOffset === pos + replaceLength);

        if (fromEntry && toEntry) {
            editor.chain()
                .insertContentAt({ from: fromEntry.pmPos, to: toEntry.pmPos }, revised)
                .run();
            setAppliedIndices(prev => new Set([...prev, index]));
            // 형광펜 제거 + TIP 팝업 닫기
            document.querySelectorAll('.humanness-inline-highlight').forEach(el => {
                el.classList.remove('humanness-inline-highlight');
            });
            setHumanTip(null);
            showToast('수정안이 적용되었습니다.', 'success');
        } else {
            showToast('원문 위치를 특정할 수 없습니다.', 'warning');
        }
    }, [editorRef, showToast, setHumanTip]);

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
                            {/* 지표 바 차트 */}
                            <div className="humanness-metrics-list">
                                {Object.values(metrics).map((m, i) => (
                                    <MetricBar key={i} label={m.label} score={m.score} maxScore={m.maxScore}/>
                                ))}
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
                                    자연스러운 글입니다!
                                </div>
                            )}

                            {/* AI 휴먼라이징 제안 버튼 */}
                            <button
                                className="humanness-ai-btn"
                                onClick={handleAiAnalyze}
                                disabled={aiLoading}
                            >
                                {aiLoading ? <span className="btn-loading-spinner"><Loader2 size={14} className="spin" /> 분석 중...</span> : 'AI 휴먼라이징 제안'}
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
                                                <div
                                                    className="humanness-ai-original humanness-ai-locatable"
                                                    onClick={() => handleLocateOriginal(s, i)}
                                                    title="클릭하면 본문에서 위치를 찾아줍니다"
                                                >{s.original}</div>
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
