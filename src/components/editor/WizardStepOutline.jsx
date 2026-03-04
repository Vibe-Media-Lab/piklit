import React, { useState } from 'react';
import {
    Wand2, ArrowLeft, Loader2, Bot, RefreshCw, CheckCircle,
    ClipboardList, ChevronUp, ChevronDown, Plus, Trash2,
    BarChart3, Sparkles
} from 'lucide-react';
import WizardStepIndicator from './WizardStepIndicator';
import { AIService } from '../../services/openai';

const TONES = [
    { id: 'friendly', label: '🥳 친근한 이웃형' },
    { id: 'professional', label: '🔎 전문 정보형' },
    { id: 'honest', label: '📝 내돈내산 솔직형' },
    { id: 'emotional', label: '☕️ 감성 에세이형' },
    { id: 'guide', label: '📚 단계별 가이드형' }
];

const WizardStepOutline = ({
    mainKeyword,
    selectedCategory,
    selectedKeywords,
    selectedTone,
    // eslint-disable-next-line no-unused-vars
    selectedLength,
    categoryId,
    photoData,
    competitorData,
    outlineItems,
    getKw,
    onOutlineChange,
    onGenerate,
    onPrev,
    recordAiAction,
    showToast
}) => {
    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);

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
                onOutlineChange(result.outline);
            }
        } catch (e) {
            showToast('아웃라인 생성 중 오류가 발생했습니다: ' + e.message, 'error');
        } finally {
            setIsGeneratingOutline(false);
        }
    };

    const handleOutlineEdit = (index, newTitle) => {
        onOutlineChange(outlineItems.map((item, i) => i === index ? { ...item, title: newTitle } : item));
    };

    const handleOutlineToggleLevel = (index) => {
        onOutlineChange(outlineItems.map((item, i) =>
            i === index ? { ...item, level: item.level === 'h2' ? 'h3' : 'h2' } : item
        ));
    };

    const handleOutlineMove = (index, direction) => {
        const arr = [...outlineItems];
        const target = index + direction;
        if (target < 0 || target >= arr.length) return;
        [arr[index], arr[target]] = [arr[target], arr[index]];
        onOutlineChange(arr);
    };

    const handleOutlineDelete = (index) => {
        onOutlineChange(outlineItems.filter((_, i) => i !== index));
    };

    const handleOutlineAdd = (afterIndex) => {
        const arr = [...outlineItems];
        arr.splice(afterIndex + 1, 0, { level: 'h3', title: '' });
        onOutlineChange(arr);
    };

    const StepIndicator = () => (
        <WizardStepIndicator aiStep={4} />
    );

    return (
        <div className="wizard-card-wrap">
            <StepIndicator />

            <h2 className="wizard-step-heading">
                <Wand2 size={20} /> Step 4: 아웃라인 + 생성
            </h2>
            <p className="wizard-step-desc">
                AI가 소제목 구조를 생성합니다. 수정 후 본문을 생성하세요.
            </p>
            <div className="wizard-step-meta">
                <span>주제: <strong>{mainKeyword || '미설정'}</strong></span>
                {selectedCategory && <span>카테고리: {selectedCategory.icon} <strong>{selectedCategory.label}</strong></span>}
            </div>

            {/* 작성 정보 요약 */}
            <div className="wizard-summary-grid">
                <div className="wizard-summary-card">
                    <div className="summary-label">메인 키워드</div>
                    <div className="summary-value">{mainKeyword}</div>
                </div>
                <div className="wizard-summary-card">
                    <div className="summary-label">서브 키워드</div>
                    <div className="summary-value">{selectedKeywords.length}개</div>
                </div>
                <div className="wizard-summary-card">
                    <div className="summary-label">톤앤무드</div>
                    <div className="summary-value">{TONES.find(t => t.id === selectedTone)?.label?.replace(/^[^\s]+\s/, '') || '미선택'}</div>
                </div>
                <div className="wizard-summary-card">
                    <div className="summary-label">사진</div>
                    <div className="summary-value">
                        {(() => {
                            const total = Object.values(photoData.metadata).reduce((sum, v) => sum + v, 0);
                            return total > 0 ? `${total}장` : '없음';
                        })()}
                    </div>
                </div>
            </div>

            {/* 아웃라인 생성 버튼 */}
            <div className="wizard-section-mb">
                <button
                    onClick={handleGenerateOutline}
                    disabled={isGeneratingOutline}
                    className="wizard-btn-accent"
                >
                    {isGeneratingOutline
                        ? <><Loader2 size={16} className="spin" /> 아웃라인 생성 중...</>
                        : outlineItems.length > 0
                            ? <><RefreshCw size={16} /> 아웃라인 다시 생성</>
                            : <><Bot size={16} /> AI 아웃라인 생성하기</>
                    }
                </button>
            </div>

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

            {/* 아웃라인 편집 UI */}
            {outlineItems.length > 0 && (
                <div className="outline-editor">
                    <div className="outline-header">
                        <label>
                            <ClipboardList size={16} /> 소제목 구조
                        </label>
                        <span className="outline-count">
                            H2 {outlineItems.filter(i => i.level === 'h2').length} / H3 {outlineItems.filter(i => i.level === 'h3').length}
                        </span>
                    </div>

                    <div className="outline-list">
                        {outlineItems.map((item, idx) => (
                            <div key={idx} className={`outline-row ${item.level === 'h3' ? 'is-h3' : ''}`}>
                                <button
                                    onClick={() => handleOutlineToggleLevel(idx)}
                                    className={`outline-level-btn ${item.level}`}
                                    title="H2/H3 전환"
                                >
                                    {item.level.toUpperCase()}
                                </button>

                                <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => handleOutlineEdit(idx, e.target.value)}
                                    placeholder="소제목 입력..."
                                    className={`outline-input ${item.level}`}
                                />

                                <div className="outline-actions">
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
                                    ><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {competitorData?.average?.headingCount && (
                        <div className={`outline-competitor-bar ${outlineItems.length >= competitorData.average.headingCount ? 'sufficient' : 'insufficient'}`}>
                            <BarChart3 size={14} />
                            경쟁 블로그 평균 소제목 {competitorData.average.headingCount}개 — 현재 {outlineItems.length}개
                            {outlineItems.length >= competitorData.average.headingCount
                                ? <><CheckCircle size={14} /> 충분</>
                                : ' — 부족'
                            }
                        </div>
                    )}
                </div>
            )}

            <div className="wizard-nav">
                <button
                    onClick={onPrev}
                    className="wizard-btn-ghost"
                >
                    <ArrowLeft size={16} /> 이전: 이미지 업로드
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

export default WizardStepOutline;
