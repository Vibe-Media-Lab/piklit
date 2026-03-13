import React, { useState, useMemo } from 'react';
import { ChevronDown, Check, X, AlertTriangle, Sparkles, Hash, ChevronRight, BarChart3 } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { AIService } from '../../services/openai';
import { Loader2 } from 'lucide-react';
import { analyzeHumanness } from '../../utils/humanness';
import { analyzeReadability } from '../../utils/readability';
import HumannessPanel from './HumannessPanel';
import PostHistory from './PostHistory';

// v3 접기/펼치기 섹션
const Section = ({ title, icon: Icon, score, scoreClass, count, defaultOpen = false, children }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="v3-section">
            <button className="v3-section-header" onClick={() => setOpen(prev => !prev)}>
                <span className="v3-section-title">
                    {Icon && <Icon size={14} className="v3-section-icon" />}
                    {title}
                </span>
                <span className="v3-section-right">
                    {score != null && <span className={`v3-section-score ${scoreClass || ''}`}>{score}%</span>}
                    {count != null && <span className="v3-section-score v3-section-count">{count}건</span>}
                    <ChevronDown size={14} className={`v3-section-toggle ${open ? 'open' : ''}`} />
                </span>
            </button>
            {open && <div className="v3-section-body">{children}</div>}
        </div>
    );
};

// AI 수정 가능한 이슈 ID
const AI_FIXABLE_IDS = new Set([
    'title_start', 'title_long', 'title_short',
    'key_density', 'key_first', 'sub_missing',
    'structure_missing', 'heading_keyword',
    'keyword_density_low', 'keyword_density_high',
    'intro_short', 'intro_long',
]);

// SEO 체크 항목 정의 (checks 키 → 라벨 + 메트릭 함수)
const SEO_CHECK_ITEMS = [
    { key: 'titleLength', label: '제목 30자 이내', metric: (a) => `${a._titleLen}자` },
    { key: 'titleKeyStart', label: '제목에 메인 키워드 포함' },
    { key: 'introParagraphLength', label: '도입부 길이', metric: (a) => a.introLength > 0 ? `${a.introLength}자` : null },
    { key: 'mainKeyDensity', label: '키워드 밀도', metric: (a) => a.keywordDensity > 0 ? `${a.keywordDensity}%` : null },
    { key: 'structure', label: '소제목 3개 이상', metric: (a) => `${a.headingCount}개` },
    { key: 'contentLength', label: null, metric: (a) => `${a.totalChars?.toLocaleString()}자` },
    { key: 'imageCount', label: '이미지 5장 이상', metric: (a) => `${a.imageCount}장` },
    { key: 'videoPresence', label: '동영상 추가 권장', metric: () => null },
    { key: 'mainKeyFirstPara', label: '첫 문단 키워드 포함' },
    { key: 'headingKeywords', label: '소제목 키워드 포함' },
    { key: 'subKeyPresence', label: '서브 키워드 포함' },
    { key: 'imageAltText', label: '이미지 Alt 속성' },
];

// 자연스러움 메트릭 라벨
const HUMAN_METRIC_LABELS = {
    sentenceVariety: '문장 길이',
    personalExpr: '개인 표현',
    aiPattern: '표현 패턴',
    colloquial: '구어체 마커',
    paraVariety: '문단 길이',
    informal: '이모지/비격식',
};

const getScoreClass = (pct) => pct >= 80 ? 'good' : pct >= 60 ? 'mid' : 'low';
const getScoreColor = (pct) => pct >= 80 ? 'var(--color-green, #10B981)' : pct >= 60 ? 'var(--color-yellow, #F59E0B)' : 'var(--color-red, #EF4444)';
const getBarColor = (pct) => pct >= 80 ? 'var(--color-green, #10B981)' : pct >= 60 ? 'var(--color-yellow, #F59E0B)' : 'var(--color-red, #EF4444)';

const AIAnalysisDashboard = ({ onLocate, compact, mode }) => {
    const { analysis, content, title, setTitle, setContent, keywords, suggestedTone, recordAiAction, targetLength } = useEditor();
    const { checks, issues, keywordDensity, introLength, headingCount, totalChars, imageCount } = analysis;
    const score = Object.values(checks).filter(Boolean).length;
    const maxScore = Object.keys(checks).length || 1;
    const seoPercentage = Math.round((score / maxScore) * 100);
    const { showToast } = useToast();

    // 자연스러움 점수 계산
    const humanResult = useMemo(() => analyzeHumanness(content, suggestedTone), [content, suggestedTone]);
    const naturalPercentage = humanResult.isEmpty ? 0 : humanResult.score;

    // 가독성 점수 계산
    const readabilityResult = useMemo(() => analyzeReadability(content), [content]);

    // 종합 점수 (SEO 60% + 자연스러움 40%)
    const totalPercentage = humanResult.isEmpty
        ? seoPercentage
        : Math.round(seoPercentage * 0.6 + naturalPercentage * 0.4);

    const [loading, setLoading] = useState(false);
    const [seoFixLoading, setSeoFixLoading] = useState(false);
    const [seoFixLoadingId, setSeoFixLoadingId] = useState(null);
    const [extractedTags, setExtractedTags] = useState([]);
    const [copiedTag, setCopiedTag] = useState(null);
    const [copiedAll, setCopiedAll] = useState(false);
    const [tagOpen, setTagOpen] = useState(false);
    const [scoreToast, setScoreToast] = useState(null);

    const fixableIssues = issues.filter(i => AI_FIXABLE_IDS.has(i.id));

    // 자연스러움 제안 중 우선순위 높은 것
    const humanSuggestions = useMemo(() => {
        if (humanResult.isEmpty) return [];
        return humanResult.suggestions
            .filter(s => s.type !== 'info' && s.priority > 0)
            .slice(0, 3);
    }, [humanResult]);

    // 통합 개선 제안 (SEO 전체 이슈 + 자연스러움, 동영상/이미지 제외)
    const SUGGESTION_EXCLUDE_IDS = new Set(['video_missing', 'img_count_low', 'img_count_high', 'img_alt_missing', 'img_alt_duplicate']);
    const allSuggestions = useMemo(() => {
        const seo = issues
            .filter(i => !SUGGESTION_EXCLUDE_IDS.has(i.id))
            .map(i => ({ ...i, category: 'SEO', fixable: AI_FIXABLE_IDS.has(i.id) }));
        const natural = humanSuggestions.map(s => ({ ...s, category: '자연스러움', id: 'human_' + s.text.slice(0, 10), fixable: false }));
        return [...seo, ...natural];
    }, [issues, humanSuggestions]);

    // 분석에 필요한 메트릭 묶음
    const analysisMetrics = useMemo(() => ({
        ...analysis,
        _titleLen: title.length,
    }), [analysis, title]);

    const handleFixSeoIssues = async (targetIssue) => {
        const issuesToFix = targetIssue ? [targetIssue] : fixableIssues;
        if (issuesToFix.length === 0) return;
        const prevSeo = seoPercentage;
        const prevTotal = totalPercentage;
        if (targetIssue) setSeoFixLoadingId(targetIssue.id);
        else setSeoFixLoading(true);
        recordAiAction('seoFix');
        try {
            const subKeywords = keywords.sub?.filter(k => k.trim()) || [];
            const result = await AIService.fixSeoIssues(
                content, title, keywords.main, subKeywords, issuesToFix, suggestedTone || 'friendly'
            );
            if (result.title && result.title !== title) setTitle(result.title);
            if (result.content && result.content !== content) setContent(result.content);
            const fixCount = result.fixes?.length || issuesToFix.length;
            showToast(`SEO 이슈 ${fixCount}건 수정 완료`, 'success');
            setScoreToast({
                message: `SEO 이슈 ${fixCount}건 수정 완료`,
                prevSeo,
                prevTotal,
            });
        } catch (e) {
            showToast('SEO 수정 오류: ' + e.message, 'error');
        } finally {
            setSeoFixLoading(false);
            setSeoFixLoadingId(null);
        }
    };

    const handleExtractTags = async () => {
        if (content.length < 50) return showToast("본문 내용을 좀 더 작성해주세요.", "warning");
        setLoading(true);
        setExtractedTags([]);
        recordAiAction('tagExtract');
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            const text = doc.body.textContent || "";
            const tags = await AIService.extractTags(text);
            const cleanTags = (Array.isArray(tags) ? tags : []).map(t => t.replace('#', ''));
            setExtractedTags(cleanTags);
            setTagOpen(true);
        } catch (e) {
            showToast("태그 추출 오류: " + e.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyTags = () => {
        navigator.clipboard.writeText(extractedTags.join(','));
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 1500);
    };

    const handleCopySingleTag = (tag) => {
        navigator.clipboard.writeText(tag);
        setCopiedTag(tag);
        setTimeout(() => setCopiedTag(null), 1500);
    };

    // ── v3 종합 점수 게이지 ──
    const renderV3Gauge = () => {
        const circumference = 2 * Math.PI * 58;
        const offset = circumference * (1 - totalPercentage / 100);
        return (
            <div className="v3-score-header">
                <div className="v3-gauge-wrap">
                    <svg viewBox="0 0 140 140" width="130" height="130">
                        <circle cx="70" cy="70" r="58" fill="none" stroke="var(--color-border, #E3E2E0)" strokeWidth="10" />
                        <circle
                            cx="70" cy="70" r="58" fill="none"
                            stroke={getScoreColor(totalPercentage)}
                            strokeWidth="10" strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            transform="rotate(-90 70 70)"
                            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                        />
                    </svg>
                    <div className="v3-gauge-text">
                        <div className="v3-gauge-num">{totalPercentage}<span className="v3-gauge-pct">%</span></div>
                        <div className="v3-gauge-label">종합 점수</div>
                    </div>
                </div>
                <div className="v3-score-breakdown">
                    <div className="v3-score-part">
                        <div className={`v3-score-part-value ${getScoreClass(seoPercentage)}`}>
                            {seoPercentage}<span className="v3-score-part-pct">%</span>
                        </div>
                        <div className="v3-score-part-label">SEO</div>
                    </div>
                    <div className="v3-score-part">
                        <div className={`v3-score-part-value ${humanResult.isEmpty ? '' : getScoreClass(naturalPercentage)}`}>
                            {humanResult.isEmpty ? '-' : <>{naturalPercentage}<span className="v3-score-part-pct">%</span></>}
                        </div>
                        <div className="v3-score-part-label">자연스러움</div>
                    </div>
                </div>
            </div>
        );
    };

    // ── v3 점수 변화 토스트 ──
    const renderScoreToast = () => {
        if (!scoreToast) return null;
        return (
            <div className="v3-score-toast">
                <span className="v3-score-toast-icon">📈</span>
                <span className="v3-score-toast-text">
                    {scoreToast.message}<br />
                    <strong>SEO {scoreToast.prevSeo}% → {seoPercentage}%</strong> · 종합 {scoreToast.prevTotal}% → {totalPercentage}%
                </span>
                <button className="v3-score-toast-close" onClick={() => setScoreToast(null)}>✕</button>
            </div>
        );
    };

    // ── v3 SEO 체크리스트 — 통과/실패 모든 항목 표시 ──
    const renderV3SeoChecklist = () => {
        // 이슈 ID → 이슈 객체 매핑
        const issueMap = {};
        issues.forEach(i => { issueMap[i.id] = i; });

        return (
            <div className="v3-checklist">
                {SEO_CHECK_ITEMS.map(({ key, label: rawLabel, metric }) => {
                    const passed = checks[key];
                    const metricValue = metric ? metric(analysisMetrics) : null;
                    const label = rawLabel || (key === 'contentLength' ? `본문 ${targetLength?.toLocaleString() || '1,500'}자 이상` : key);
                    // 실패한 항목에 대응하는 이슈 찾기
                    const relatedIssue = !passed && issues.find(i => {
                        const keyMap = {
                            titleKeyStart: 'title_start',
                            titleLength: 'title_long',
                            mainKeyDensity: 'key_density',
                            mainKeyFirstPara: 'key_first',
                            subKeyPresence: 'sub_missing',
                            structure: 'structure_missing',
                            headingKeywords: 'heading_keyword',
                            introParagraphLength: 'intro_short',
                        };
                        return i.id === keyMap[key] || i.id === key;
                    });
                    const isFixable = relatedIssue && AI_FIXABLE_IDS.has(relatedIssue.id);

                    return (
                        <div key={key} className="v3-check-item">
                            <span className={`v3-check-icon ${passed ? 'pass' : 'fail'}`}>
                                {passed ? <Check size={13} /> : <X size={13} />}
                            </span>
                            <span className="v3-check-label">
                                {!passed && relatedIssue ? relatedIssue.text : label}
                            </span>
                            {metricValue && <span className="v3-check-value">{metricValue}</span>}
                            {!passed && relatedIssue?.metric && !metricValue && (
                                <span className="v3-check-value">{relatedIssue.metric}</span>
                            )}
                            {isFixable && (
                                <span className="v3-check-ai-badge"><Sparkles size={10} /> AI</span>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // ── v3 자연스러움 바 차트 ──
    const renderV3HumannessBars = () => {
        if (humanResult.isEmpty) {
            return <div className="v3-perfect" style={{ color: 'var(--color-text-sub)' }}>본문 작성 시 분석이 시작됩니다</div>;
        }

        const { metrics } = humanResult;
        return (
            <div className="v3-natural-bars">
                {Object.entries(metrics).map(([key, m]) => {
                    const pct = m.maxScore > 0 ? Math.round((m.score / m.maxScore) * 100) : 0;
                    return (
                        <div key={key} className="v3-natural-bar-row">
                            <span className="v3-natural-bar-label">{HUMAN_METRIC_LABELS[key] || key}</span>
                            <div className="v3-natural-bar-track">
                                <div
                                    className="v3-natural-bar-fill"
                                    style={{ width: `${pct}%`, background: getBarColor(pct) }}
                                />
                            </div>
                            <span className="v3-natural-bar-value">{pct}%</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ── v3 개선 제안 — SEO + 자연스러움 통합 ──
    const renderV3Suggestions = () => (
        <>
            {allSuggestions.length === 0 ? (
                <div className="v3-perfect">
                    <Check size={16} /> 개선할 항목이 없습니다
                </div>
            ) : (
                <div className="v3-suggestions">
                    {allSuggestions.map((item, idx) => (
                        <div key={idx} className="v3-suggestion-item">
                            <div className="v3-suggestion-header">
                                <span className={`v3-suggestion-badge ${item.category === 'SEO' ? 'seo' : 'natural'}`}>
                                    {item.category} · {(item.text || '').split(' ')[0]}
                                </span>
                                {item.fixable && (
                                    <button
                                        className="v3-suggestion-fix-btn"
                                        onClick={() => handleFixSeoIssues(item)}
                                        disabled={seoFixLoading || seoFixLoadingId != null}
                                    >
                                        {seoFixLoadingId === item.id
                                            ? <Loader2 size={11} className="spin" />
                                            : <><Sparkles size={11} /> AI 수정</>
                                        }
                                    </button>
                                )}
                            </div>
                            <div className="v3-suggestion-desc">{item.text}</div>
                            {item.metric && (
                                <div className="v3-suggestion-detail">현재: {item.metric}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    // ── v3 태그 도구 버튼 ──
    const renderV3TagTool = () => (
        <>
            <button className="v3-tool-btn" onClick={() => { if (!extractedTags.length) handleExtractTags(); else setTagOpen(prev => !prev); }}>
                <span className="v3-tool-icon tag">
                    <Hash size={16} />
                </span>
                <span className="v3-tool-info">
                    <span className="v3-tool-name">블로그 태그 추출</span>
                    <span className="v3-tool-desc">본문 기반 해시태그 자동 생성</span>
                </span>
                <span className={`v3-tool-arrow ${tagOpen ? 'open' : ''}`}>
                    {loading ? <Loader2 size={16} className="spin" /> : <ChevronRight size={16} />}
                </span>
            </button>
            {tagOpen && extractedTags.length > 0 && (
                <div className="v3-tag-expand">
                    <div className="v3-tag-chips">
                        {extractedTags.map((tag, i) => (
                            <span
                                key={i}
                                onClick={() => handleCopySingleTag(tag)}
                                className={`v3-tag-chip ${copiedTag === tag ? 'copied' : ''}`}
                            >
                                {copiedTag === tag ? '복사됨!' : `#${tag}`}
                            </span>
                        ))}
                    </div>
                    <div className="v3-tag-actions">
                        <button className="v3-tag-action-btn" onClick={handleExtractTags} disabled={loading}>
                            + 5개 더 추출
                        </button>
                        <button className={`v3-tag-action-btn primary ${copiedAll ? 'copied' : ''}`} onClick={handleCopyTags}>
                            {copiedAll ? '복사됨!' : '전체 복사'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );

    // ── v3 가독성 바 차트 ──
    const renderV3ReadabilityBars = () => {
        if (readabilityResult.isEmpty) {
            return <div className="v3-perfect" style={{ color: 'var(--color-text-sub)' }}>본문 작성 시 분석이 시작됩니다</div>;
        }
        const { metrics: rMetrics, suggestions: rSuggestions } = readabilityResult;
        return (
            <>
                <div className="v3-natural-bars">
                    {Object.entries(rMetrics).map(([key, m]) => {
                        const pct = m.maxScore > 0 ? Math.round((m.score / m.maxScore) * 100) : 0;
                        return (
                            <div key={key} className="v3-natural-bar-row">
                                <span className="v3-natural-bar-label">{m.label || key}</span>
                                <div className="v3-natural-bar-track">
                                    <div className="v3-natural-bar-fill" style={{ width: `${pct}%`, background: getBarColor(pct) }} />
                                </div>
                                <span className="v3-natural-bar-value">{pct}%</span>
                            </div>
                        );
                    })}
                </div>
                {rSuggestions.length > 0 && (
                    <div className="v3-suggestions" style={{ marginTop: 12 }}>
                        {rSuggestions.slice(0, 3).map((s, i) => (
                            <div key={i} className="v3-suggestion-item">
                                <div className="v3-suggestion-desc">
                                    <span className={`v3-suggestion-badge natural`}>개선 제안</span> {s.text}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </>
        );
    };

    // ── 모바일 mode="natural": 자연스러움 + 가독성 V3 ──
    if (mode === 'natural') {
        return (
            <div className="ai-dashboard v3">
                <Section title="AI 감지 분석" icon={Sparkles} score={humanResult.isEmpty ? null : naturalPercentage} scoreClass={getScoreClass(naturalPercentage)} defaultOpen={true}>
                    {renderV3HumannessBars()}
                    <HumannessPanel onLocate={onLocate} suggestOnly />
                </Section>
                <Section title="가독성 점수" icon={BarChart3} score={readabilityResult.isEmpty ? null : readabilityResult.score} scoreClass={getScoreClass(readabilityResult.score)}>
                    {renderV3ReadabilityBars()}
                </Section>
            </div>
        );
    }

    // ── 모바일 mode="overview": 점수 + 태그 + 히스토리 ──
    if (mode === 'overview') {
        return (
            <div className="ai-dashboard v3">
                {renderV3Gauge()}
                {renderV3TagTool()}
                <PostHistory />
            </div>
        );
    }

    // ── 모바일 mode="seo": SEO 체크리스트 + 제안 ──
    if (mode === 'seo') {
        return (
            <div className="ai-dashboard v3">
                {renderV3SeoChecklist()}
                <div style={{ padding: '0 16px 16px' }}>
                    {renderV3Suggestions()}
                </div>
            </div>
        );
    }

    // ── 데스크톱 기본 (v3 디자인) ──
    return (
        <div className="ai-dashboard v3">
            {renderV3Gauge()}
            {renderScoreToast()}

            <Section title="SEO" icon={BarChart3} score={seoPercentage} scoreClass={getScoreClass(seoPercentage)}>
                {renderV3SeoChecklist()}
            </Section>

            <Section title="자연스러움" icon={Sparkles} score={humanResult.isEmpty ? null : naturalPercentage} scoreClass={getScoreClass(naturalPercentage)}>
                {renderV3HumannessBars()}
            </Section>

            <Section title="개선 제안" count={allSuggestions.length} defaultOpen={true}>
                {renderV3Suggestions()}
            </Section>

            {renderV3TagTool()}
        </div>
    );
};

export default AIAnalysisDashboard;
