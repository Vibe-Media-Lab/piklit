import React, { useState } from 'react';
import {
    ArrowLeft, ArrowRight, Sparkles, Wand2,
    Edit3, BarChart3, Loader2
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { AIService } from '../../services/openai';
import CompetitorAnalysis from '../analysis/CompetitorAnalysis';
import WannabeStylePanel, { WannabePresetCard } from '../editor/WannabeStylePanel';
import { getPresets, deletePreset, getPresetLimit } from '../../utils/wannabeStyle';
import { recommendLength, LENGTH_OPTIONS } from './KeywordStep';
import '../../styles/WannabeStyle.css';

const TONES = [
    { id: 'friendly', label: '🥳 친근한 이웃형', emoji: '🥳', desc: '해요체, 이모지, 감탄사',
      sample: '여기 진짜 숨은 맛집이에요 🍽️ 제가 3번이나 갔는데 매번 웨이팅 있더라고요. 근데 그만큼 맛은 보장된다는 뜻이겠죠?!' },
    { id: 'professional', label: '🔎 전문 정보형', emoji: '🔎', desc: '합쇼체, 개조식 요약, 신뢰감',
      sample: '이 제품의 핵심은 발열 성능입니다. 실측 결과 30분 만에 20도까지 상승했으며, 동급 제품 대비 15% 빠른 수치입니다.' },
    { id: 'honest', label: '📝 내돈내산 솔직형', emoji: '📝', desc: '단호한 문체, 장단점 명확',
      sample: '맛은 괜찮은데 가격이 좀 있어요. 1인분 15,000원이면 솔직히 이 동네 물가 감안해도 비싼 편. 근데 양은 넉넉해요.' },
    { id: 'emotional', label: '☕️ 감성 에세이형', emoji: '☕️', desc: '평어체, 명조체 감성, 여백',
      sample: '창밖으로 노을이 번졌다. 커피잔을 감싸 쥔 손끝이 따뜻했다. 이런 오후가 자주 오면 좋겠다고 생각했다.' },
    { id: 'guide', label: '📚 단계별 가이드형', emoji: '📚', desc: '권유형, 번호표, 팁 박스',
      sample: '먼저 재료를 준비하세요. 꿀팁: 양파는 반달 모양으로 썰면 식감이 살아요. 그다음 센 불에서 2분간 볶아주세요.' }
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
    userPlan,
    onPrev,
    onNext,
    renderStepIndicator,
}) => {
    const { recordAiAction } = useEditor();
    const { showToast } = useToast();

    const [showWannabeModal, setShowWannabeModal] = useState(false);
    const [wannabePresets, setWannabePresets] = useState(() => getPresets());
    const [isAnalyzingCompetitors, setIsAnalyzingCompetitors] = useState(false);

    const limit = getPresetLimit(userPlan || 'free');

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
                경쟁 블로그를 분석하고 글의 분량과 문체를 설정하세요.
            </p>

            {/* 경쟁 블로그 분석 */}
            <CompetitorAnalysis
                data={competitorData}
                loading={isAnalyzingCompetitors}
                onAnalyze={handleAnalyzeCompetitors}
            />

            {/* 글자수 선택 */}
            <div className="wizard-section-card" style={{ marginTop: '20px' }}>
                <label className="wizard-label">
                    <Edit3 size={16} /> 글자수 선택
                </label>
                <div className="wizard-length-grid">
                    {LENGTH_OPTIONS.map(l => (
                        <button
                            key={l}
                            className={`wizard-length-option ${selectedLength === l ? 'selected' : ''}`}
                            onClick={() => setSelectedLength(l)}
                        >
                            {l}
                        </button>
                    ))}
                </div>
                {competitorData?.average?.charCount > 0 && (
                    <p className="wizard-length-recommend">
                        <span>
                            <BarChart3 size={14} /> 경쟁 블로그 평균 {competitorData.average.charCount.toLocaleString()}자 기준으로 <strong>{recommendLength(competitorData.average.charCount)}</strong>를 추천합니다
                        </span>
                    </p>
                )}
            </div>

            {/* 톤앤무드 선택 */}
            <div className="wizard-section-card" style={{ marginTop: '20px' }}>
                <label className="wizard-label">
                    <Sparkles size={16} /> 톤앤무드 선택
                </label>
                <div className="wizard-tone-grid">
                    {TONES.map(t => (
                        <div
                            key={t.id}
                            className={`wizard-tone-option ${selectedTone === t.id ? 'selected' : ''}`}
                            onClick={() => setToneState(t.id)}
                        >
                            <div className="wizard-tone-label">{t.label}</div>
                            <div className="wizard-tone-desc">{t.desc}</div>
                            {selectedTone === t.id && (
                                <div className="wizard-tone-sample">
                                    <div className="wizard-tone-sample-label">미리보기</div>
                                    <p className="wizard-tone-sample-text">{t.sample}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 문단 호흡 선택 */}
            <div className="wizard-section-card" style={{ marginTop: '20px' }}>
                <label className="wizard-label">
                    <Edit3 size={16} /> 문단 호흡
                </label>
                <div className="paragraph-style-grid">
                    {[
                        { id: 'oneline', label: '한 줄씩 끊기', desc: '파워블로거' },
                        { id: 'normal', label: '보통', desc: '2~3문장' },
                        { id: 'long', label: '긴 호흡', desc: '4~5문장' },
                    ].map(opt => (
                        <button
                            key={opt.id}
                            className={`paragraph-style-option ${paragraphStyle === opt.id ? 'selected' : ''}`}
                            onClick={() => setParagraphStyle(opt.id)}
                        >
                            <span className="paragraph-style-label">{opt.label}</span>
                            <span className="paragraph-style-desc">{opt.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 선택/필수 구분선 ── */}
            <div className="wannabe-divider">
                <span className="wannabe-divider-line" />
                <span className="wannabe-divider-label">선택사항</span>
                <span className="wannabe-divider-line" />
            </div>

            {/* 워너비 스타일 (선택사항) */}
            <div className="wannabe-section-card wannabe-optional">
                <div className="wannabe-section-header">
                    <div className="wannabe-section-title">
                        <Wand2 size={18} />
                        <span>워너비 스타일</span>
                        <span className="wannabe-optional-badge">선택</span>
                    </div>
                    <span className="wannabe-usage-badge">
                        {wannabePresets.length}/{limit} 프리셋
                    </span>
                </div>
                <p className="wannabe-section-desc">
                    좋아하는 블로거처럼 쓰고 싶다면? URL이나 스크린샷만 첨부하면 AI가 문체를 분석하여 복제합니다.
                </p>

                {wannabePresets.length > 0 && (
                    <div className="wannabe-preset-grid">
                        {wannabePresets.map(p => (
                            <WannabePresetCard
                                key={p.id}
                                preset={p}
                                selected={selectedWannabeStyle?.id === p.id}
                                onSelect={(preset) => {
                                    if (selectedWannabeStyle?.id === preset.id) {
                                        setSelectedWannabeStyle(null);
                                    } else {
                                        setSelectedWannabeStyle(preset);
                                    }
                                }}
                                onDelete={(id) => {
                                    deletePreset(id);
                                    setWannabePresets(getPresets());
                                    if (selectedWannabeStyle?.id === id) {
                                        setSelectedWannabeStyle(null);
                                    }
                                }}
                            />
                        ))}
                    </div>
                )}

                <button
                    className="wannabe-analyze-cta"
                    onClick={() => setShowWannabeModal(true)}
                >
                    <Sparkles size={16} /> 스타일 분석해보기
                </button>
            </div>

            {/* 워너비 스타일 분석 모달 */}
            <WannabeStylePanel
                isOpen={showWannabeModal}
                onClose={() => setShowWannabeModal(false)}
                onSave={(preset) => {
                    setWannabePresets(getPresets());
                    setSelectedWannabeStyle(preset);
                    recordAiAction('wannabeStyleAnalysis');
                    showToast('스타일 분석 완료! 프리셋이 저장되었습니다.');
                }}
                userPlan={userPlan || 'free'}
            />

            <div className="wizard-nav">
                <button onClick={onPrev} className="wizard-btn-ghost">
                    <ArrowLeft size={16} /> 이전: 키워드
                </button>
                <button onClick={onNext} className="wizard-btn-primary">
                    다음: 이미지 업로드 <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

export { TONES };
export default ToneStep;
