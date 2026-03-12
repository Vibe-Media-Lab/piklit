import React, { useState } from 'react';
import {
    ArrowLeft, ArrowRight, Sparkles, Wand2,
    Edit3, BarChart3, Loader2, ChevronDown
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { AIService } from '../../services/openai';
import CompetitorAnalysis from '../analysis/CompetitorAnalysis';
import WannabeStylePanel, { WannabePresetCard } from '../editor/WannabeStylePanel';
import { deletePreset, getPresetsByType } from '../../utils/wannabeStyle';
import { recommendLength, LENGTH_OPTIONS } from './KeywordStep';
import '../../styles/WannabeStyle.css';

const TONES = [
    { id: 'friendly', label: '🥳 친근한 이웃형', desc: '해요체, 이모지, 감탄사',
      sample: '여기 진짜 숨은 맛집이에요 🍽️ 제가 3번이나 갔는데 매번 웨이팅 있더라고요. 근데 그만큼 맛은 보장된다는 뜻이겠죠?!' },
    { id: 'professional', label: '🔎 전문 정보형', desc: '합쇼체, 개조식, 신뢰감',
      sample: '이 제품의 핵심은 발열 성능입니다. 실측 결과 30분 만에 20도까지 상승했으며, 동급 제품 대비 15% 빠른 수치입니다.' },
    { id: 'honest', label: '📝 내돈내산 솔직형', desc: '단호한 문체, 장단점 명확',
      sample: '맛은 괜찮은데 가격이 좀 있어요. 1인분 15,000원이면 솔직히 이 동네 물가 감안해도 비싼 편. 근데 양은 넉넉해요.' },
    { id: 'emotional', label: '☕️ 감성 에세이형', desc: '평어체, 명조체 감성, 여백',
      sample: '창밖으로 노을이 번졌다. 커피잔을 감싸 쥔 손끝이 따뜻했다. 이런 오후가 자주 오면 좋겠다고 생각했다.' },
    { id: 'guide', label: '📚 단계별 가이드형', desc: '권유형, 번호표, 팁 박스',
      sample: '먼저 재료를 준비하세요. 꿀팁: 양파는 반달 모양으로 썰면 식감이 살아요. 그다음 센 불에서 2분간 볶아주세요.' }
];

const PARAGRAPH_STYLES = [
    { id: 'oneline', label: '한 줄씩', preview: '한 문장마다 줄바꿈. 파워블로거 스타일로 빠르게 읽히는 글이 됩니다.' },
    { id: 'normal', label: '보통', preview: '2~3문장을 한 문단으로 묶습니다. 가장 자연스럽고 읽기 편한 호흡입니다.' },
    { id: 'long', label: '긴 호흡', preview: '4~5문장을 한 문단으로 구성합니다. 에세이나 전문 정보글에 적합합니다.' },
];

const ToneStep = ({
    mainKeyword,
    selectedCategory,
    selectedTone,
    selectedLength,
    competitorData,
    paragraphStyle,
    setToneState,
    setSelectedLength,
    setParagraphStyle,
    setCompetitorData,
    selectedWannabeStyle,
    setSelectedWannabeStyle,
    selectedMyStyle,
    setSelectedMyStyle,
    userPlan,
    onPrev,
    onNext,
    renderStepIndicator,
}) => {
    const { recordAiAction } = useEditor();
    const { showToast } = useToast();

    const [showWannabeModal, setShowWannabeModal] = useState(false);
    const [wannabeModalType, setWannabeModalType] = useState('wannabe');
    const [wannabePresets, setWannabePresets] = useState(() => getPresetsByType('wannabe'));
    const [myStylePresets, setMyStylePresets] = useState(() => getPresetsByType('mystyle'));
    const [isAnalyzingCompetitors, setIsAnalyzingCompetitors] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(true);

    const handleAnalyzeCompetitors = async () => {
        if (!mainKeyword?.trim()) return showToast('메인 키워드를 먼저 입력해주세요.', 'warning');
        setIsAnalyzingCompetitors(true);
        recordAiAction('competitorAnalysis');
        try {
            const result = await AIService.analyzeCompetitors(mainKeyword, selectedCategory?.id || 'daily');
            if (result?.average) {
                setCompetitorData(result);
                if (result.average.charCount) {
                    const recommended = recommendLength(result.average.charCount);
                    if (recommended) setSelectedLength(recommended);
                }
            } else {
                showToast('분석 결과 형식이 올바르지 않습니다. 다시 시도해주세요.', 'error');
            }
        } catch (e) {
            console.error('경쟁 블로그 분석 오류:', e);
            if (e.message?.includes('429')) {
                showToast('API 호출 제한에 걸렸습니다. 잠시 후(약 30초) 다시 시도해주세요.', 'error');
            } else {
                showToast(`경쟁 블로그 분석 중 오류: ${e.message}`, 'error');
            }
        } finally {
            setIsAnalyzingCompetitors(false);
        }
    };

    return (
        <div className="wizard-card-wrap">
            {renderStepIndicator()}

            <h2 className="wizard-step-heading">
                <Sparkles size={20} /> 스타일 설정
            </h2>
            <p className="wizard-step-desc">
                글의 문체, 분량, 호흡을 설정하세요.
            </p>

            {/* ── 1. 톤앤무드 선택 (핵심) ── */}
            <div className="wizard-section-card">
                <label className="wizard-label">
                    <Sparkles size={16} /> 톤앤무드
                </label>
                <div className="wizard-tone-chip-grid">
                    {TONES.map(t => (
                        <div
                            key={t.id}
                            className={`wizard-tone-chip ${selectedTone === t.id ? 'selected' : ''}`}
                            onClick={() => setToneState(t.id)}
                        >
                            <span className="wizard-tone-chip-label">{t.label}</span>
                            <span className="wizard-tone-chip-desc">{t.desc}</span>
                        </div>
                    ))}
                </div>
                {selectedTone && (
                    <div className="wizard-tone-preview">
                        <span className="wizard-tone-preview-label">미리보기</span>
                        <p className="wizard-tone-preview-text">
                            {TONES.find(t => t.id === selectedTone)?.sample}
                        </p>
                    </div>
                )}
            </div>

            {/* ── 2. 글자수 ── */}
            <div className="wizard-section-card" style={{ marginTop: '16px' }}>
                <label className="wizard-label">
                    <Edit3 size={16} /> 글자수
                </label>
                <div className="wizard-tone-chip-grid">
                    {LENGTH_OPTIONS.map(l => (
                        <button
                            key={l}
                            className={`wizard-length-chip ${selectedLength === l ? 'selected' : ''}`}
                            onClick={() => setSelectedLength(l)}
                        >
                            {l}
                        </button>
                    ))}
                </div>
                {competitorData?.average?.charCount > 0 && (
                    <p className="wizard-length-recommend">
                        <BarChart3 size={12} /> 경쟁 평균 {competitorData.average.charCount.toLocaleString()}자 → <strong>{recommendLength(competitorData.average.charCount)}</strong> 추천
                    </p>
                )}
            </div>

            {/* ── 3. 문단 호흡 ── */}
            <div className="wizard-section-card" style={{ marginTop: '16px' }}>
                <label className="wizard-label">
                    <Edit3 size={16} /> 문단 호흡
                </label>
                <div className="wizard-paragraph-row-3">
                    {PARAGRAPH_STYLES.map(opt => (
                        <button
                            key={opt.id}
                            className={`wizard-paragraph-chip ${paragraphStyle === opt.id ? 'selected' : ''}`}
                            onClick={() => setParagraphStyle(opt.id)}
                        >
                            <span className="wizard-paragraph-chip-label">{opt.label}</span>
                        </button>
                    ))}
                </div>
                {paragraphStyle && (
                    <div className="wizard-tone-preview">
                        <p className="wizard-tone-preview-text">
                            {PARAGRAPH_STYLES.find(p => p.id === paragraphStyle)?.preview}
                        </p>
                    </div>
                )}
            </div>

            {/* ── 3. 고급 옵션 (경쟁분석 + 워너비) ── */}
            <div className="wizard-advanced-section" style={{ marginTop: '16px' }}>
                <button
                    className="wizard-advanced-toggle"
                    onClick={() => {
                        setAdvancedOpen(!advancedOpen);
                        const count = parseInt(localStorage.getItem('piklit_advanced_seen') || '0', 10);
                        localStorage.setItem('piklit_advanced_seen', String(count + 1));
                    }}
                >
                    <span>고급 옵션</span>
                    {parseInt(localStorage.getItem('piklit_advanced_seen') || '0', 10) < 2 && !advancedOpen && (
                        <span className="wizard-advanced-dot" />
                    )}
                    <span className="wizard-advanced-badges">
                        {competitorData && <span className="wizard-advanced-badge done">경쟁분석 완료</span>}
                        {selectedWannabeStyle && <span className="wizard-advanced-badge done">워너비 적용</span>}
                        {selectedMyStyle && <span className="wizard-advanced-badge done">내 스타일 적용</span>}
                    </span>
                    <ChevronDown size={14} className={`wizard-advanced-arrow ${advancedOpen ? 'open' : ''}`} />
                </button>

                {advancedOpen && (
                    <div className="wizard-advanced-body">
                        {/* 경쟁 블로그 분석 — 컴팩트 */}
                        <div className="wizard-advanced-item">
                            <CompetitorAnalysis
                                data={competitorData}
                                loading={isAnalyzingCompetitors}
                                onAnalyze={handleAnalyzeCompetitors}
                                compact
                            />
                        </div>

                        {/* 스타일 분석 (워너비 + 내 스타일 통합) */}
                        <div className="wizard-advanced-item">
                            <label className="wizard-label" style={{ marginBottom: 8 }}>
                                <Sparkles size={14} /> 스타일 분석
                            </label>
                            {(wannabePresets.length > 0 || myStylePresets.length > 0) && (
                                <div className="wannabe-preset-grid-compact">
                                    {wannabePresets.map(p => (
                                        <WannabePresetCard
                                            key={p.id}
                                            preset={p}
                                            selected={selectedWannabeStyle?.id === p.id}
                                            onSelect={(preset) => {
                                                setSelectedWannabeStyle(selectedWannabeStyle?.id === preset.id ? null : preset);
                                            }}
                                            onDelete={(id) => {
                                                deletePreset(id);
                                                setWannabePresets(getPresetsByType('wannabe'));
                                                if (selectedWannabeStyle?.id === id) setSelectedWannabeStyle(null);
                                            }}
                                        />
                                    ))}
                                    {myStylePresets.map(p => (
                                        <WannabePresetCard
                                            key={p.id}
                                            preset={p}
                                            selected={selectedMyStyle?.id === p.id}
                                            onSelect={(preset) => {
                                                setSelectedMyStyle(selectedMyStyle?.id === preset.id ? null : preset);
                                            }}
                                            onDelete={(id) => {
                                                deletePreset(id);
                                                setMyStylePresets(getPresetsByType('mystyle'));
                                                if (selectedMyStyle?.id === id) setSelectedMyStyle(null);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                            <button
                                className="wannabe-analyze-compact"
                                onClick={() => { setWannabeModalType('wannabe'); setShowWannabeModal(true); }}
                            >
                                <Wand2 size={14} /> 타 블로그 스타일 분석하기
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 워너비 스타일 분석 모달 */}
            <WannabeStylePanel
                isOpen={showWannabeModal}
                onClose={() => setShowWannabeModal(false)}
                initialType={wannabeModalType}
                onSave={(preset) => {
                    if ((preset.type || 'wannabe') === 'mystyle') {
                        setMyStylePresets(getPresetsByType('mystyle'));
                        setSelectedMyStyle(preset);
                    } else {
                        setWannabePresets(getPresetsByType('wannabe'));
                        setSelectedWannabeStyle(preset);
                    }
                    recordAiAction('wannabeStyleAnalysis');
                    showToast('스타일 분석 완료! 프리셋이 저장되었습니다.');
                }}
                userPlan={userPlan || 'free'}
            />

            <div className="wizard-nav">
                <button onClick={onPrev} className="wizard-btn-ghost">
                    <ArrowLeft size={16} /> 이전
                </button>
                <button onClick={onNext} className="wizard-btn-primary">
                    다음 <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

export { TONES };
export default ToneStep;
