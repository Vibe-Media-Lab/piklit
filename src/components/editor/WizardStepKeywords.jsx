import React, { useState } from 'react';
import {
    Search, Edit3, CheckCircle, Tag, Flame, Bot,
    ArrowLeft, ArrowRight, ChevronDown, Loader2, BarChart3,
    Settings, Sparkles, RefreshCw, Plus
} from 'lucide-react';
import { AIService } from '../../services/openai';
import CompetitorAnalysis from '../analysis/CompetitorAnalysis';
import WizardStepIndicator from './WizardStepIndicator';

// ── 상수 ──

const LENGTH_OPTIONS = ['800~1200자', '1200~1800자', '1800~2500자', '2500~3000자'];
const LENGTH_MIDPOINTS = [1000, 1500, 2150, 2750];

const recommendLength = (avgCharCount) => {
    if (!avgCharCount) return null;
    let closest = LENGTH_OPTIONS[0];
    let minDiff = Math.abs(avgCharCount - LENGTH_MIDPOINTS[0]);
    for (let i = 1; i < LENGTH_MIDPOINTS.length; i++) {
        const diff = Math.abs(avgCharCount - LENGTH_MIDPOINTS[i]);
        if (diff < minDiff) {
            minDiff = diff;
            closest = LENGTH_OPTIONS[i];
        }
    }
    return closest;
};

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

// ── 내부 컴포넌트 ──

const DifficultyBadge = ({ difficulty }) => {
    const map = {
        easy: { emoji: '🟢', label: '쉬움' },
        medium: { emoji: '🟡', label: '보통' },
        hard: { emoji: '🔴', label: '어려움' },
    };
    const d = map[difficulty] || map.medium;
    return <span title={d.label} style={{ marginLeft: '4px', fontSize: '0.75rem' }}>{d.emoji}</span>;
};

// ── 메인 컴포넌트 ──

const WizardStepKeywords = ({
    mainKeyword,
    selectedCategory,
    selectedKeywords,
    suggestedKeywords,
    competitorData,
    selectedTone,
    selectedLength,
    categoryId,
    wizardData,
    canProceedToStep2,
    getKw,
    getDifficulty,
    locationState,
    onSelectedKeywordsChange,
    onSuggestedKeywordsChange,
    onCompetitorDataChange,
    onToneChange,
    onLengthChange,
    onMainKeywordChange,
    onPrev,
    onNext,
    recordAiAction,
    showToast,
}) => {
    // 로컬 상태
    const [customKeywordInput, setCustomKeywordInput] = useState('');
    const [isAnalyzingKeywords, setIsAnalyzingKeywords] = useState(false);
    const [isCheckingDifficulty, setIsCheckingDifficulty] = useState(false);
    const [difficultyChecked, setDifficultyChecked] = useState(false);
    const [seasonKeywords, setSeasonKeywords] = useState([]);
    const [isAnalyzingSeason, setIsAnalyzingSeason] = useState(false);
    const [isAnalyzingCompetitors, setIsAnalyzingCompetitors] = useState(false);
    const [showSettings, setShowSettings] = useState(true);

    // ── 핸들러 ──

    const handleAnalyzeKeywords = async () => {
        const topic = wizardData?.initialMainKeyword || locationState?.initialMainKeyword || mainKeyword;
        if (!topic) return showToast('메인 키워드를 먼저 입력해주세요.', 'warning');

        setIsAnalyzingKeywords(true);
        recordAiAction('keywordAnalysis');
        try {
            const existingKws = [
                ...selectedKeywords.map(k => getKw(k)),
                ...suggestedKeywords.map(k => getKw(k))
            ];
            const result = await AIService.analyzeKeywords(
                topic,
                categoryId,
                existingKws.length > 0 ? existingKws : undefined
            );
            if (result?.keywords && Array.isArray(result.keywords)) {
                const existingSet = new Set(existingKws);
                const filtered = result.keywords
                    .filter(kw => !existingSet.has(kw.keyword || kw))
                    .map(kw => typeof kw === 'string' ? { keyword: kw } : kw);
                onSuggestedKeywordsChange(prev => [...prev, ...filtered]);

                if (!mainKeyword && result.mainKeyword) {
                    onMainKeywordChange(result.mainKeyword);
                }
            }
        } catch (e) {
            if (e.message?.includes('429')) {
                showToast('API 호출 제한에 걸렸습니다. 잠시 후(약 30초) 다시 시도해주세요.', 'error');
            } else {
                showToast('키워드 분석 중 오류가 발생했습니다.', 'error');
            }
        } finally {
            setIsAnalyzingKeywords(false);
        }
    };

    const handleCheckDifficulty = () => {
        setIsCheckingDifficulty(true);
        const addDifficulty = (kwObj) => {
            const word = kwObj.keyword || kwObj;
            const wordCount = word.trim().split(/\s+/).length;
            let difficulty = 'medium';
            if (wordCount <= 2) difficulty = 'hard';
            else if (wordCount >= 4) difficulty = 'easy';
            return { ...kwObj, difficulty };
        };
        onSelectedKeywordsChange(prev => prev.map(addDifficulty));
        onSuggestedKeywordsChange(prev => prev.map(addDifficulty));
        setDifficultyChecked(true);
        setIsCheckingDifficulty(false);
    };

    const handleKeywordToggle = (kwObj) => {
        const kw = kwObj.keyword || kwObj;
        const isSelected = selectedKeywords.some(k => (k.keyword || k) === kw);
        if (isSelected) {
            onSelectedKeywordsChange(prev => prev.filter(k => (k.keyword || k) !== kw));
        } else {
            if (selectedKeywords.length < 5) {
                onSelectedKeywordsChange(prev => [...prev, kwObj]);
                onSuggestedKeywordsChange(prev => prev.filter(k => (k.keyword || k) !== kw));
            } else {
                showToast('서브 키워드는 최대 5개까지 선택할 수 있습니다.', 'warning');
            }
        }
    };

    const handleRemoveSelectedKeyword = (kwObj) => {
        const kw = kwObj.keyword || kwObj;
        onSelectedKeywordsChange(prev => prev.filter(k => (k.keyword || k) !== kw));
        if (kwObj.isCustom) {
            // 직접 입력한 키워드는 복귀 없이 삭제
        } else if (kwObj.isSeason) {
            setSeasonKeywords(prev => [...prev, { keyword: kw, reason: kwObj.reason || '', timing: kwObj.timing || '' }]);
        } else {
            onSuggestedKeywordsChange(prev => [...prev, kwObj]);
        }
    };

    const handleAddCustomKeyword = () => {
        const kw = customKeywordInput.trim();
        if (!kw) return;
        if (selectedKeywords.length >= 5) {
            return showToast('서브 키워드는 최대 5개까지 선택할 수 있습니다.', 'warning');
        }
        const allKws = selectedKeywords.map(k => (k.keyword || k));
        if (allKws.includes(kw)) {
            return showToast('이미 추가된 키워드입니다.', 'warning');
        }
        onSelectedKeywordsChange(prev => [...prev, { keyword: kw, isCustom: true }]);
        setCustomKeywordInput('');
    };

    const handleAnalyzeSeasonKeywords = async () => {
        const topic = wizardData?.initialMainKeyword || locationState?.initialMainKeyword || mainKeyword;
        if (!topic) return showToast('메인 키워드를 먼저 입력해주세요.', 'warning');

        setIsAnalyzingSeason(true);
        recordAiAction('seasonKeywordAnalysis');
        try {
            const existingKws = [
                ...selectedKeywords.map(k => getKw(k)),
                ...suggestedKeywords.map(k => getKw(k))
            ];
            const result = await AIService.analyzeSeasonKeywords(topic, categoryId, existingKws);
            if (result?.seasonKeywords && Array.isArray(result.seasonKeywords)) {
                const existingSet = new Set(existingKws);
                const filtered = result.seasonKeywords.filter(sk => !existingSet.has(sk.keyword));
                setSeasonKeywords(filtered);
            }
        } catch (e) {
            showToast('시즌 키워드 분석 중 오류가 발생했습니다.', 'error');
        } finally {
            setIsAnalyzingSeason(false);
        }
    };

    const handleAddSeasonKeyword = (seasonKw) => {
        if (selectedKeywords.length >= 5) {
            return showToast('서브 키워드는 최대 5개까지 선택할 수 있습니다.', 'warning');
        }
        onSelectedKeywordsChange(prev => [...prev, {
            keyword: seasonKw.keyword,
            difficulty: 'medium',
            isSeason: true,
            reason: seasonKw.reason,
            timing: seasonKw.timing
        }]);
        setSeasonKeywords(prev => prev.filter(sk => sk.keyword !== seasonKw.keyword));
    };

    const handleAnalyzeCompetitors = async () => {
        if (!mainKeyword.trim()) return showToast('메인 키워드를 먼저 입력해주세요.', 'warning');
        setIsAnalyzingCompetitors(true);
        recordAiAction('competitorAnalysis');
        try {
            const result = await AIService.analyzeCompetitors(mainKeyword, selectedCategory?.id || 'daily');
            if (result?.average) {
                onCompetitorDataChange(result);
                if (result.average.charCount) {
                    const recommended = recommendLength(result.average.charCount);
                    if (recommended) onLengthChange(recommended);
                }
            } else {
                showToast('분석 결과 형식이 올바르지 않습니다. 다시 시도해주세요.', 'error');
            }
        } catch (e) {
            if (e.message?.includes('429')) {
                showToast('API 호출 제한에 걸렸습니다. 잠시 후(약 30초) 다시 시도해주세요.', 'error');
            } else {
                showToast(`경쟁 블로그 분석 중 오류: ${e.message}`, 'error');
            }
        } finally {
            setIsAnalyzingCompetitors(false);
        }
    };

    // ── 렌더링 ──

    return (
        <div className="wizard-card-wrap">
            <WizardStepIndicator aiStep={2} />

            <h2 className="wizard-step-heading">
                <Search size={20} /> Step 2: 키워드 + 설정
            </h2>
            <p className="wizard-step-desc">
                AI가 SEO 키워드를 제안합니다. 키워드를 선택하고 설정을 조정하세요.
            </p>
            <div className="wizard-step-meta">
                <span>주제: <strong>{mainKeyword || '미설정'}</strong></span>
                {selectedCategory && <span>카테고리: {selectedCategory.icon} <strong>{selectedCategory.label}</strong></span>}
            </div>

            {/* ── 1단계: AI 키워드 분석 버튼 (분석 전에만 상단) ── */}
            {suggestedKeywords.length === 0 && selectedKeywords.length === 0 && (
                <button
                    onClick={handleAnalyzeKeywords}
                    disabled={isAnalyzingKeywords}
                    className="wizard-btn-accent"
                >
                    {isAnalyzingKeywords
                        ? <><Loader2 size={16} className="spin" /> 키워드 분석 중...</>
                        : <><Bot size={16} /> AI 키워드 분석하기</>
                    }
                </button>
            )}

            {/* 키워드 분석 프로그레스 */}
            {isAnalyzingKeywords && (
                <div className="ai-progress-card">
                    <div className="ai-progress-header">
                        <Loader2 size={16} className="spin" />
                        네이버 검색 데이터를 기반으로 키워드를 분석하고 있습니다
                        <div className="ai-progress-dots"><span /><span /><span /></div>
                    </div>
                    <div className="ai-progress-bar-track">
                        <div className="ai-progress-bar-fill" />
                    </div>
                    <div className="ai-progress-steps">
                        <div className="ai-progress-step done">
                            <div className="ai-progress-step-icon"><CheckCircle size={14} /></div>
                            검색어 전달 완료
                        </div>
                        <div className="ai-progress-step active">
                            <div className="ai-progress-step-icon"><Loader2 size={14} /></div>
                            네이버 실시간 검색 데이터 수집 중
                        </div>
                        <div className="ai-progress-step">
                            <div className="ai-progress-step-icon"><Search size={14} /></div>
                            SEO 최적화 키워드 추출
                        </div>
                    </div>
                </div>
            )}

            {/* 분석 전 가이드 */}
            {suggestedKeywords.length === 0 && selectedKeywords.length === 0 && !isAnalyzingKeywords && (
                <p className="wizard-info-box">
                    <Search size={14} /> 위 버튼을 클릭하면 네이버 검색 데이터 기반으로 SEO 키워드를 추천받을 수 있습니다.
                </p>
            )}

            {/* ── 2단계: 키워드 선택 카드 (분석 결과 후 노출) ── */}
            {(suggestedKeywords.length > 0 || selectedKeywords.length > 0) && (
                <div className="wizard-section-card">
                    {/* 제안된 키워드 목록 */}
                    {suggestedKeywords.length > 0 && (
                        <div className="wizard-suggested-section">
                            <label className="wizard-label">
                                <Tag size={16} /> AI 제안 키워드 (클릭하여 선택)
                            </label>
                            <div className="wizard-chip-list">
                                {suggestedKeywords.map((kwObj, i) => (
                                    <span
                                        key={i}
                                        onClick={() => handleKeywordToggle(kwObj)}
                                        className={`wizard-suggested-chip ${selectedKeywords.length >= 5 ? 'disabled' : ''}`}
                                    >
                                        + {getKw(kwObj)}
                                        {difficultyChecked && <DifficultyBadge difficulty={getDifficulty(kwObj)} />}
                                    </span>
                                ))}
                            </div>
                            <button
                                onClick={handleAnalyzeKeywords}
                                disabled={isAnalyzingKeywords}
                                className="wizard-btn-accent wizard-mt-8"
                            >
                                {isAnalyzingKeywords
                                    ? <><Loader2 size={16} className="spin" /> 키워드 분석 중...</>
                                    : <><RefreshCw size={16} /> 추가 키워드 더 받기</>
                                }
                            </button>
                        </div>
                    )}

                    {/* 선택된 키워드 */}
                    <div className="wizard-selected-keywords">
                        <label className="wizard-label">
                            <CheckCircle size={16} /> 선택한 서브 키워드 ({selectedKeywords.length}/5)
                            {selectedKeywords.length < 3 && (
                                <span className="wizard-min-warning">최소 3개 선택 필요</span>
                            )}
                        </label>
                        <div className="wizard-chip-list">
                            {selectedKeywords.length === 0 ? (
                                <span className="wizard-chip-placeholder">위 제안된 키워드를 클릭하여 선택하세요</span>
                            ) : (
                                selectedKeywords.map((kwObj, i) => (
                                    <span
                                        key={i}
                                        onClick={() => handleRemoveSelectedKeyword(kwObj)}
                                        className={`wizard-keyword-chip ${kwObj.isCustom ? 'custom' : kwObj.isSeason ? 'season' : ''}`}
                                    >
                                        {kwObj.isSeason && <Flame size={13} />}{kwObj.isCustom && <Edit3 size={13} />}{getKw(kwObj)}
                                        {difficultyChecked && <DifficultyBadge difficulty={getDifficulty(kwObj)} />}
                                        <span className="chip-remove">×</span>
                                    </span>
                                ))
                            )}
                        </div>

                        {/* 키워드 직접 입력 */}
                        <div className="wizard-custom-input-row">
                            <input
                                type="text"
                                value={customKeywordInput}
                                onChange={e => setCustomKeywordInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomKeyword(); } }}
                                placeholder="키워드 직접 입력"
                                disabled={selectedKeywords.length >= 5}
                                className="wizard-custom-input"
                            />
                            <button
                                onClick={handleAddCustomKeyword}
                                disabled={!customKeywordInput.trim() || selectedKeywords.length >= 5}
                                className="wizard-custom-add-btn"
                            >
                                <Plus size={14} /> 추가
                            </button>
                        </div>
                    </div>

                    {/* 키워드 강도 확인 */}
                    <div className="wizard-keyword-actions">
                        {!difficultyChecked && (
                            <button
                                onClick={handleCheckDifficulty}
                                disabled={isCheckingDifficulty}
                                className="wizard-btn-secondary"
                            >
                                {isCheckingDifficulty
                                    ? <><Loader2 size={16} className="spin" /> 확인 중...</>
                                    : <><BarChart3 size={16} /> 키워드 강도 확인하기</>
                                }
                            </button>
                        )}
                        {difficultyChecked && (
                            <span className="wizard-difficulty-done">
                                <CheckCircle size={16} /> 강도 확인 완료
                            </span>
                        )}
                    </div>

                    {/* 시즌 트렌드 (키워드 카드 안에 배치 — 보조 옵션) */}
                    <div className="wizard-season-section">
                        <button
                            onClick={handleAnalyzeSeasonKeywords}
                            disabled={isAnalyzingSeason || !mainKeyword.trim()}
                            className="wizard-btn-accent"
                        >
                            {isAnalyzingSeason
                                ? <><Loader2 size={16} className="spin" /> 시즌 트렌드를 분석하고 있습니다...</>
                                : seasonKeywords.length > 0
                                    ? <><RefreshCw size={16} /> 시즌 트렌드 키워드 다시 추천받기</>
                                    : <><Flame size={16} /> 시즌 트렌드 키워드 추천받기</>
                            }
                        </button>

                        {isAnalyzingSeason && (
                            <div className="ai-progress-card">
                                <div className="ai-progress-header">
                                    <Loader2 size={16} className="spin" />
                                    시즌 트렌드 키워드를 분석하고 있습니다
                                    <div className="ai-progress-dots"><span /><span /><span /></div>
                                </div>
                                <div className="ai-progress-bar-track">
                                    <div className="ai-progress-bar-fill" />
                                </div>
                                <div className="ai-progress-steps">
                                    <div className="ai-progress-step done">
                                        <div className="ai-progress-step-icon"><CheckCircle size={14} /></div>
                                        시즌 데이터 요청 완료
                                    </div>
                                    <div className="ai-progress-step active">
                                        <div className="ai-progress-step-icon"><Loader2 size={14} /></div>
                                        현재 시즌 트렌드 검색 중
                                    </div>
                                    <div className="ai-progress-step">
                                        <div className="ai-progress-step-icon"><Flame size={14} /></div>
                                        트렌드 키워드 추출
                                    </div>
                                </div>
                            </div>
                        )}

                        {seasonKeywords.length > 0 && !isAnalyzingSeason && (
                            <div className="wizard-season-panel">
                                <label className="wizard-label">
                                    <Flame size={16} /> 시즌 트렌드 키워드
                                </label>
                                <div className="wizard-season-list">
                                    {seasonKeywords.map((sk, i) => (
                                        <div key={i} className="wizard-season-card">
                                            <div className="wizard-season-card-body">
                                                <div className="wizard-season-card-title">
                                                    <Flame size={14} /> {sk.keyword}
                                                </div>
                                                <div className="wizard-season-card-meta">
                                                    {sk.reason} · {sk.timing}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddSeasonKeyword(sk)}
                                                disabled={selectedKeywords.length >= 5}
                                                className="wizard-season-add-btn"
                                            >
                                                + 선택
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 진행 상태 (키워드 카드 안에 배치) */}
                    <div className={`wizard-info-box ${selectedKeywords.length >= 3 ? 'success' : ''}`}>
                        <p>
                            {selectedKeywords.length >= 3
                                ? <><CheckCircle size={14} /> {selectedKeywords.length}개의 서브 키워드가 선택되었습니다. 다음 단계로 진행할 수 있습니다.</>
                                : `${3 - selectedKeywords.length}개의 서브 키워드를 더 선택해주세요.`
                            }
                        </p>
                    </div>
                </div>
            )}

            {/* ── 3단계: 경쟁 블로그 분석 (키워드 분석 후 노출) ── */}
            {(suggestedKeywords.length > 0 || selectedKeywords.length > 0) && (
                <div className="wizard-section-mt">
                    <CompetitorAnalysis
                        data={competitorData}
                        loading={isAnalyzingCompetitors}
                        onAnalyze={handleAnalyzeCompetitors}
                    />
                </div>
            )}

            {/* ── 4단계: 세부 설정 (경쟁 분석 완료 or 키워드 3개 이상 선택 시 노출) ── */}
            {(competitorData || selectedKeywords.length >= 3) && (
                <div className="wizard-section-mt">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="wizard-settings-toggle"
                    >
                        <span className="wizard-settings-toggle-label">
                            <Settings size={16} /> 세부 설정 (톤앤무드 · 글자수)
                        </span>
                        <span className={`wizard-settings-chevron ${showSettings ? 'open' : ''}`}>
                            <ChevronDown size={16} />
                        </span>
                    </button>

                    {showSettings && (
                        <div className="wizard-settings-panel">
                            {/* 글자수 선택 */}
                            <div className="wizard-section-mb">
                                <label className="wizard-label">
                                    <Edit3 size={16} /> 글자수 선택
                                </label>
                                <div className="wizard-length-grid">
                                    {LENGTH_OPTIONS.map(l => (
                                        <button
                                            key={l}
                                            className={`wizard-length-option ${selectedLength === l ? 'selected' : ''}`}
                                            onClick={() => onLengthChange(l)}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                                {competitorData?.average?.charCount && (
                                    <p className="wizard-length-recommend">
                                        <span>
                                            <BarChart3 size={14} /> 경쟁 블로그 평균 {competitorData.average.charCount.toLocaleString()}자 기준으로 <strong>{recommendLength(competitorData.average.charCount)}</strong>를 추천합니다
                                        </span>
                                    </p>
                                )}
                            </div>

                            {/* 톤앤무드 선택 */}
                            <div>
                                <label className="wizard-label">
                                    <Sparkles size={16} /> 톤앤무드 선택
                                </label>
                                <div className="wizard-tone-grid">
                                    {TONES.map(t => (
                                        <div
                                            key={t.id}
                                            className={`wizard-tone-option ${selectedTone === t.id ? 'selected' : ''}`}
                                            onClick={() => onToneChange(t.id)}
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
                        </div>
                    )}
                </div>
            )}

            <div className="wizard-nav">
                <button
                    onClick={onPrev}
                    className="wizard-btn-ghost"
                >
                    <ArrowLeft size={16} /> 이전: 주제 선택
                </button>
                <button
                    onClick={onNext}
                    disabled={!canProceedToStep2}
                    className="wizard-btn-primary"
                >
                    다음: 이미지 업로드 <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default WizardStepKeywords;
