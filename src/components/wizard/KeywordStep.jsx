import React, { useState } from 'react';
import {
    Search, CheckCircle, Tag, Flame, Bot,
    ArrowLeft, ArrowRight,
    Loader2, BarChart3,
    RefreshCw, Plus, Edit3
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { AIService } from '../../services/openai';

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

// ── 헬퍼 ──

const getKw = (item) => item?.keyword || item;
const getDifficulty = (item) => item?.difficulty || 'medium';

const DifficultyBadge = ({ difficulty }) => {
    const map = {
        easy: { emoji: '🟢', label: '쉬움' },
        medium: { emoji: '🟡', label: '보통' },
        hard: { emoji: '🔴', label: '어려움' },
    };
    const d = map[difficulty] || map.medium;
    return <span title={d.label} style={{ marginLeft: '4px', fontSize: '0.75rem' }}>{d.emoji}</span>;
};

// ── KeywordStep 컴포넌트 ──

const KeywordStep = ({
    mainKeyword,
    selectedCategory,
    selectedKeywords,
    competitorData,
    categoryId,
    wizardData,
    setSelectedKeywords,
    setCompetitorData,
    onPrev,
    onNext,
    canProceed,
    renderStepIndicator,
}) => {
    const { recordAiAction } = useEditor();
    const { showToast } = useToast();

    // 내부 상태
    const [suggestedKeywords, setSuggestedKeywords] = useState([]);
    const [customKeywordInput, setCustomKeywordInput] = useState('');
    const [isAnalyzingKeywords, setIsAnalyzingKeywords] = useState(false);
    const [isCheckingDifficulty, setIsCheckingDifficulty] = useState(false);
    const [difficultyChecked, setDifficultyChecked] = useState(false);
    const [seasonKeywords, setSeasonKeywords] = useState([]);
    const [isAnalyzingSeason, setIsAnalyzingSeason] = useState(false);

    // ── 핸들러 ──

    const handleAnalyzeKeywords = async () => {
        const topic = wizardData?.initialMainKeyword || mainKeyword;
        if (!topic) return showToast('주제를 먼저 입력해주세요.', 'warning');

        setIsAnalyzingKeywords(true);
        recordAiAction('keywordAnalysis');
        try {
            const excludeKeywords = selectedKeywords.map(k => getKw(k)).join(', ');
            const result = await AIService.analyzeKeywords(topic, excludeKeywords);

            if (result) {
                if (result.competitors && result.competitors.blogs) {
                    setCompetitorData(result.competitors);
                }
                if (result.subKeywords && Array.isArray(result.subKeywords)) {
                    const normalized = result.subKeywords.map(item =>
                        typeof item === 'string'
                            ? { keyword: item, difficulty: 'medium' }
                            : { keyword: item.keyword || item, difficulty: item.difficulty || 'medium' }
                    );

                    const existingKws = [...suggestedKeywords.map(k => k.keyword || k), ...selectedKeywords.map(k => k.keyword || k)];
                    const newKeywords = normalized.filter(kw => !existingKws.includes(kw.keyword));

                    if (newKeywords.length > 0) {
                        if (selectedKeywords.length === 0) {
                            const autoSelect = newKeywords.slice(0, 5);
                            const rest = newKeywords.slice(5);
                            setSelectedKeywords(autoSelect);
                            setSuggestedKeywords(prev => [...prev, ...rest]);
                        } else {
                            setSuggestedKeywords(prev => [...prev, ...newKeywords]);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('키워드 분석 오류:', e);
            showToast('키워드 분석 중 오류가 발생했습니다.', 'error');
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
        setSelectedKeywords(prev => prev.map(addDifficulty));
        setSuggestedKeywords(prev => prev.map(addDifficulty));
        setDifficultyChecked(true);
        setIsCheckingDifficulty(false);
    };

    const handleKeywordToggle = (kwObj) => {
        const kw = kwObj.keyword || kwObj;
        const isSelected = selectedKeywords.some(k => (k.keyword || k) === kw);
        if (isSelected) {
            setSelectedKeywords(prev => prev.filter(k => (k.keyword || k) !== kw));
        } else {
            if (selectedKeywords.length < 5) {
                setSelectedKeywords(prev => [...prev, kwObj]);
                setSuggestedKeywords(prev => prev.filter(k => (k.keyword || k) !== kw));
            } else {
                showToast('서브 키워드는 최대 5개까지 선택할 수 있습니다.', 'warning');
            }
        }
    };

    const handleRemoveSelectedKeyword = (kwObj) => {
        const kw = kwObj.keyword || kwObj;
        setSelectedKeywords(prev => prev.filter(k => (k.keyword || k) !== kw));
        if (kwObj.isCustom) {
            // 직접 입력한 키워드는 복귀 없이 삭제
        } else if (kwObj.isSeason) {
            setSeasonKeywords(prev => [...prev, { keyword: kw, reason: kwObj.reason || '', timing: kwObj.timing || '' }]);
        } else {
            setSuggestedKeywords(prev => [...prev, kwObj]);
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
        setSelectedKeywords(prev => [...prev, { keyword: kw, isCustom: true }]);
        setCustomKeywordInput('');
    };

    const handleAnalyzeSeasonKeywords = async () => {
        const topic = wizardData?.initialMainKeyword || mainKeyword;
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
            console.error('시즌 키워드 분석 오류:', e);
            showToast('시즌 키워드 분석 중 오류가 발생했습니다.', 'error');
        } finally {
            setIsAnalyzingSeason(false);
        }
    };

    const handleAddSeasonKeyword = (seasonKw) => {
        if (selectedKeywords.length >= 5) {
            return showToast('서브 키워드는 최대 5개까지 선택할 수 있습니다.', 'warning');
        }
        setSelectedKeywords(prev => [...prev, {
            keyword: seasonKw.keyword,
            difficulty: 'medium',
            isSeason: true,
            reason: seasonKw.reason,
            timing: seasonKw.timing
        }]);
        setSeasonKeywords(prev => prev.filter(sk => sk.keyword !== seasonKw.keyword));
    };

    // ── 렌더링 ──

    return (
        <div className="wizard-card-wrap">
            {renderStepIndicator()}

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

            <div className="wizard-nav">
                <button
                    onClick={onPrev}
                    className="wizard-btn-ghost"
                >
                    <ArrowLeft size={16} /> 이전: 주제 선택
                </button>
                <button
                    onClick={onNext}
                    disabled={!canProceed}
                    className="wizard-btn-primary"
                >
                    다음: 톤앤무드 <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

export { LENGTH_OPTIONS, LENGTH_MIDPOINTS, recommendLength, getKw, getDifficulty, DifficultyBadge };
export default KeywordStep;
