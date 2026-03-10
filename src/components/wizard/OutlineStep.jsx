import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { AIService } from '../../services/openai';
import { TONES } from './ToneStep';
import { getKw } from './KeywordStep';
import {
    Wand2, Bot, ClipboardList, ArrowLeft,
    ChevronDown, ChevronUp, Loader2, BarChart3,
    Sparkles, RefreshCw, Plus, Trash2, CheckCircle
} from 'lucide-react';

const OutlineStep = ({
    mainKeyword,
    selectedKeywords,
    selectedTone,
    competitorData,
    outlineItems,
    photoData,
    categoryId,
    setOutlineItems,
    onPrev,
    onGenerate,
    renderStepIndicator,
}) => {
    const { recordAiAction } = useEditor();
    const { showToast } = useToast();
    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
    const [activeIndex, setActiveIndex] = useState(null);
    const [hasEdited, setHasEdited] = useState(false);

    const handleGenerateOutline = async () => {
        setIsGeneratingOutline(true);
        recordAiAction('outlineGenerate');
        try {
            const keywordStrings = selectedKeywords.map(k => getKw(k));
            const result = await AIService.generateOutline(
                mainKeyword, keywordStrings, selectedTone,
                categoryId,
                competitorData
            );
            if (result?.outline && Array.isArray(result.outline)) {
                setOutlineItems(result.outline);
                setActiveIndex(null);
            }
        } catch (e) {
            console.error('[아웃라인] 생성 오류:', e);
            showToast('아웃라인 생성 중 오류가 발생했습니다: ' + e.message, 'error');
        } finally {
            setIsGeneratingOutline(false);
        }
    };

    const handleOutlineEdit = (index, newTitle) => {
        setOutlineItems(prev => prev.map((item, i) => i === index ? { ...item, title: newTitle } : item));
    };

    const handleOutlineToggleLevel = (index) => {
        setOutlineItems(prev => prev.map((item, i) =>
            i === index ? { ...item, level: item.level === 'h2' ? 'h3' : 'h2' } : item
        ));
    };

    const handleOutlineMove = (index, direction) => {
        setOutlineItems(prev => {
            const arr = [...prev];
            const target = index + direction;
            if (target < 0 || target >= arr.length) return arr;
            [arr[index], arr[target]] = [arr[target], arr[index]];
            return arr;
        });
        setActiveIndex(index + direction);
    };

    const handleOutlineDelete = (index) => {
        setOutlineItems(prev => prev.filter((_, i) => i !== index));
        setActiveIndex(null);
    };

    const handleOutlineAdd = (afterIndex) => {
        setOutlineItems(prev => {
            const arr = [...prev];
            arr.splice(afterIndex + 1, 0, { level: 'h2', title: '' });
            return arr;
        });
        setActiveIndex(afterIndex + 1);
    };

    const handleRowClick = (idx) => {
        setActiveIndex(activeIndex === idx ? null : idx);
        if (!hasEdited) setHasEdited(true);
    };

    return (
        <div className="wizard-card-wrap">
            {renderStepIndicator()}

            <h2 className="wizard-step-heading">
                <Wand2 size={20} /> 아웃라인 + 생성
            </h2>
            <p className="wizard-step-desc">
                AI가 소제목 구조를 생성합니다. 수정 후 본문을 생성하세요.
            </p>
            <div className="wizard-summary-inline">
                <span>{mainKeyword}</span>
                <span className="wizard-summary-dot">·</span>
                <span>서브키워드 {selectedKeywords.length}개</span>
                <span className="wizard-summary-dot">·</span>
                <span>{TONES.find(t => t.id === selectedTone)?.label?.replace(/^[^\s]+\s/, '') || '미선택'}</span>
                <span className="wizard-summary-dot">·</span>
                <span>사진 {(() => {
                    const total = Object.values(photoData.metadata).reduce((sum, v) => sum + v, 0);
                    return total > 0 ? `${total}장` : '없음';
                })()}</span>
            </div>

            {outlineItems.length === 0 && (
                <div className="wizard-section-mb">
                    <button
                        onClick={handleGenerateOutline}
                        disabled={isGeneratingOutline}
                        className="wizard-btn-accent"
                    >
                        {isGeneratingOutline
                            ? <><Loader2 size={16} className="spin" /> 아웃라인 생성 중...</>
                            : <><Bot size={16} /> AI 아웃라인 생성하기</>
                        }
                    </button>
                </div>
            )}

            {isGeneratingOutline && (
                <div className="ai-progress-card wizard-section-mb">
                    <div className="ai-progress-header">
                        <Loader2 size={16} className="spin" />
                        글의 구조를 설계하고 있습니다
                        <div className="ai-progress-dots"><span /><span /><span /></div>
                    </div>
                    <div className="ai-progress-bar-track">
                        <div className="ai-progress-bar-fill" />
                    </div>
                    <div className="ai-progress-steps">
                        <div className="ai-progress-step done">
                            <div className="ai-progress-step-icon"><CheckCircle size={14} /></div>
                            키워드·사진 데이터 수집 완료
                        </div>
                        <div className="ai-progress-step active">
                            <div className="ai-progress-step-icon"><Loader2 size={14} /></div>
                            경쟁 블로그 구조 반영 중
                        </div>
                        <div className="ai-progress-step">
                            <div className="ai-progress-step-icon"><ClipboardList size={14} /></div>
                            소제목 아웃라인 생성
                        </div>
                    </div>
                </div>
            )}

            {outlineItems.length > 0 && (
                <div className="outline-editor">
                    <div className="outline-header">
                        <label>
                            <ClipboardList size={16} /> 소제목 구조
                        </label>
                        <span className="outline-count">
                            소제목 {outlineItems.length}개
                        </span>
                    </div>

                    <div className="outline-list">
                        {outlineItems.map((item, idx) => {
                            const isActive = activeIndex === idx;

                            return (
                                <div key={idx} className={`outline-row ${isActive ? 'is-active' : ''}`}>
                                    {/* 읽기 모드: 탭하면 편집 */}
                                    {!isActive && (
                                        <div
                                            className="outline-row-read"
                                            onClick={() => handleRowClick(idx)}
                                        >
                                            <span className="outline-dot" />
                                            <span className="outline-text">
                                                {item.title || '소제목 입력...'}
                                            </span>
                                        </div>
                                    )}

                                    {/* 편집 모드 */}
                                    {isActive && (
                                        <div className="outline-row-edit">
                                            <div className="outline-edit-top">
                                                <span className="outline-dot" />
                                                <input
                                                    type="text"
                                                    value={item.title}
                                                    onChange={(e) => handleOutlineEdit(idx, e.target.value)}
                                                    placeholder="소제목 입력..."
                                                    className="outline-input"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="outline-edit-actions">
                                                <button
                                                    onClick={() => handleOutlineMove(idx, -1)}
                                                    disabled={idx === 0}
                                                    className="outline-action-btn"
                                                    title="위로 이동"
                                                ><ChevronUp size={14} /></button>
                                                <button
                                                    onClick={() => handleOutlineMove(idx, 1)}
                                                    disabled={idx === outlineItems.length - 1}
                                                    className="outline-action-btn"
                                                    title="아래로 이동"
                                                ><ChevronDown size={14} /></button>
                                                <button
                                                    onClick={() => handleOutlineAdd(idx)}
                                                    className="outline-action-btn add"
                                                    title="아래에 항목 추가"
                                                ><Plus size={14} /></button>
                                                <button
                                                    onClick={() => handleOutlineDelete(idx)}
                                                    disabled={outlineItems.length <= 1}
                                                    className="outline-action-btn delete"
                                                    title="삭제"
                                                ><Trash2 size={14} /> 삭제</button>
                                                <button
                                                    onClick={() => setActiveIndex(null)}
                                                    className="outline-action-btn done"
                                                ><CheckCircle size={14} /> 완료</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {!hasEdited && (
                        <p className="outline-tap-hint">소제목을 탭하면 편집할 수 있습니다</p>
                    )}

                    <div className="outline-bottom-bar">
                        {competitorData?.average?.headingCount > 0 && (
                            <div className={`outline-competitor-bar ${outlineItems.length >= competitorData.average.headingCount ? 'sufficient' : 'insufficient'}`}>
                                <BarChart3 size={13} />
                                평균 {competitorData.average.headingCount}개 — 현재 {outlineItems.length}개
                                {outlineItems.length >= competitorData.average.headingCount && <CheckCircle size={13} />}
                            </div>
                        )}
                        <button
                            onClick={handleGenerateOutline}
                            disabled={isGeneratingOutline}
                            className="outline-regenerate-btn"
                        >
                            {isGeneratingOutline
                                ? <><Loader2 size={13} className="spin" /> 생성 중...</>
                                : <><RefreshCw size={13} /> 다시 생성</>
                            }
                        </button>
                    </div>
                </div>
            )}

            <div className="wizard-nav">
                <button
                    onClick={onPrev}
                    className="wizard-btn-ghost"
                >
                    <ArrowLeft size={16} /> 이전
                </button>
                <button
                    onClick={onGenerate}
                    disabled={outlineItems.length === 0}
                    className="wizard-btn-primary wizard-btn-generate"
                >
                    <Sparkles size={18} /> AI 본문 생성 시작
                </button>
            </div>
        </div>
    );
};

export default OutlineStep;
