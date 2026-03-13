import React, { useState, useMemo } from 'react';
import { ChevronDown, Check, X, AlertTriangle, Sparkles, Hash, ChevronRight, BarChart3 } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { AIService } from '../../services/openai';
import { Loader2 } from 'lucide-react';
import { analyzeHumanness } from '../../utils/humanness';
import ReadabilityPanel from './ReadabilityPanel';
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

const getScoreClass = (pct) => pct >= 80 ? 'good' : pct >= 60 ? 'mid' : 'low';
const getScoreColor = (pct) => pct >= 80 ? 'var(--color-green, #10B981)' : pct >= 60 ? 'var(--color-yellow, #F59E0B)' : 'var(--color-red, #EF4444)';

const AIAnalysisDashboard = ({ onLocate, compact, mode }) => {
    const { analysis, content, title, setTitle, setContent, keywords, suggestedTone, recordAiAction } = useEditor();
    const { checks, issues, keywordDensity, introLength, headingCount } = analysis;
    const score = Object.values(checks).filter(Boolean).length;
    const maxScore = Object.keys(checks).length || 1;
    const seoPercentage = Math.round((score / maxScore) * 100);
    const { showToast } = useToast();

    // 자연스러움 점수 계산
    const humanResult = useMemo(() => analyzeHumanness(content, suggestedTone), [content, suggestedTone]);
    const naturalPercentage = humanResult.isEmpty ? 0 : humanResult.score;

    // 종합 점수 (SEO 60% + 자연스러움 40%)
    const totalPercentage = humanResult.isEmpty
        ? seoPercentage
        : Math.round(seoPercentage * 0.6 + naturalPercentage * 0.4);

    const [loading, setLoading] = useState(false);
    const [seoFixLoading, setSeoFixLoading] = useState(false);
    const [extractedTags, setExtractedTags] = useState([]);
    const [copiedTag, setCopiedTag] = useState(null);
    const [copiedAll, setCopiedAll] = useState(false);
    const [tagOpen, setTagOpen] = useState(false);

    const fixableIssues = issues.filter(i => AI_FIXABLE_IDS.has(i.id));

    const handleFixSeoIssues = async () => {
        if (fixableIssues.length === 0) return;
        setSeoFixLoading(true);
        recordAiAction('seoFix');
        try {
            const subKeywords = keywords.sub?.filter(k => k.trim()) || [];
            const result = await AIService.fixSeoIssues(
                content, title, keywords.main, subKeywords, fixableIssues, suggestedTone || 'friendly'
            );
            if (result.title && result.title !== title) setTitle(result.title);
            if (result.content && result.content !== content) setContent(result.content);
            const fixCount = result.fixes?.length || fixableIssues.length;
            showToast(`SEO 이슈 ${fixCount}건 수정 완료`, 'success');
        } catch (e) {
            showToast('SEO 수정 오류: ' + e.message, 'error');
        } finally {
            setSeoFixLoading(false);
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

    // ── v3 SEO 체크리스트 (lucide 아이콘) ──
    const renderV3SeoChecklist = () => (
        <>
            {issues.length === 0 ? (
                <div className="v3-perfect">
                    <Check size={16} /> 모든 항목 통과
                </div>
            ) : (
                <div className="v3-checklist">
                    {issues.map((issue, idx) => (
                        <div key={idx} className="v3-check-item">
                            <span className={`v3-check-icon ${issue.type === 'error' ? 'fail' : issue.type === 'warning' ? 'warn' : 'info'}`}>
                                {issue.type === 'error' ? <X size={13} /> : <AlertTriangle size={12} />}
                            </span>
                            <span className="v3-check-label">{issue.text}</span>
                            {issue.metric && <span className="v3-check-value">{issue.metric}</span>}
                            {AI_FIXABLE_IDS.has(issue.id) && (
                                <span className="v3-check-ai-badge"><Sparkles size={10} /> AI</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    // ── v3 개선 제안 (개별 AI 수정 버튼) ──
    const renderV3Suggestions = () => (
        <>
            {fixableIssues.length === 0 ? (
                <div className="v3-perfect">
                    <Check size={16} /> 개선할 항목이 없습니다
                </div>
            ) : (
                <div className="v3-suggestions">
                    {fixableIssues.map((issue, idx) => (
                        <div key={idx} className="v3-suggestion-item">
                            <div className="v3-suggestion-header">
                                <span className="v3-suggestion-badge seo">SEO · {issue.text.split(' ')[0]}</span>
                                <button
                                    className="v3-suggestion-fix-btn"
                                    onClick={handleFixSeoIssues}
                                    disabled={seoFixLoading}
                                >
                                    {seoFixLoading
                                        ? <Loader2 size={11} className="spin" />
                                        : <><Sparkles size={11} /> AI 수정</>
                                    }
                                </button>
                            </div>
                            <div className="v3-suggestion-desc">{issue.text}</div>
                            {issue.metric && (
                                <div className="v3-suggestion-detail">현재: {issue.metric}</div>
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

    // ── 모바일 mode="overview": 점수 + 태그 + 히스토리 ──
    if (mode === 'overview') {
        return (
            <div className="ai-dashboard v3">
                {renderV3Gauge()}
                {renderV3TagTool()}
                <Section title="작성 히스토리" defaultOpen={false}>
                    <PostHistory />
                </Section>
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

            <Section title="SEO" icon={BarChart3} score={seoPercentage} scoreClass={getScoreClass(seoPercentage)}>
                {renderV3SeoChecklist()}
            </Section>

            <Section title="자연스러움" icon={Sparkles} score={humanResult.isEmpty ? null : naturalPercentage} scoreClass={getScoreClass(naturalPercentage)}>
                <HumannessPanel onLocate={onLocate} />
            </Section>

            <Section title="개선 제안" count={fixableIssues.length} defaultOpen={true}>
                {renderV3Suggestions()}
            </Section>

            {renderV3TagTool()}
        </div>
    );
};

export default AIAnalysisDashboard;
