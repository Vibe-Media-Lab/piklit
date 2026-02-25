import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { AIService } from '../../services/openai';
import { Loader2 } from 'lucide-react';
import ReadabilityPanel from './ReadabilityPanel';
import HumannessPanel from './HumannessPanel';
import PostHistory from './PostHistory';
import ThumbnailPanel from './ThumbnailPanel';

const SidebarGroup = ({ title, defaultOpen = false, children }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="sidebar-group">
            <button className={`sidebar-group-toggle ${open ? 'open' : ''}`} onClick={() => setOpen(prev => !prev)}>
                <span>{title}</span>
                <ChevronDown size={16} className={`sidebar-group-chevron ${open ? 'open' : ''}`} />
            </button>
            {open && <div className="sidebar-group-body">{children}</div>}
        </div>
    );
};

const AIAnalysisDashboard = () => {
    const { analysis, content, recordAiAction } = useEditor();
    const { checks, issues, keywordDensity, introLength, headingCount } = analysis;
    const score = Object.values(checks).filter(Boolean).length;
    const maxScore = Object.keys(checks).length || 1;
    const percentage = Math.round((score / maxScore) * 100);
    const { showToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [extractedTags, setExtractedTags] = useState([]);
    const [copiedTag, setCopiedTag] = useState(null);
    const [copiedAll, setCopiedAll] = useState(false);
    const [activeMetric, setActiveMetric] = useState(null);

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
        } catch (e) {
            showToast("태그 추출 오류: " + e.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyTags = () => {
        const tagText = extractedTags.join(',');
        navigator.clipboard.writeText(tagText);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 1500);
    };

    const handleCopySingleTag = (tag) => {
        navigator.clipboard.writeText(tag);
        setCopiedTag(tag);
        setTimeout(() => setCopiedTag(null), 1500);
    };

    return (
        <div className="ai-dashboard">
            {/* Score Gauge — 항상 표시 */}
            <div className="dashboard-gauge">
                <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#e0e0e0" strokeWidth="12" />
                    <circle
                        cx="60" cy="60" r="54" fill="none" stroke="var(--color-primary)" strokeWidth="12"
                        strokeDasharray="339.292"
                        strokeDashoffset={339.292 * (1 - percentage / 100)}
                        transform="rotate(-90 60 60)"
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                </svg>
                <div className="dashboard-gauge-text">
                    <div className="dashboard-gauge-score">{percentage}점</div>
                    <div className="dashboard-gauge-label">SEO 점수</div>
                </div>
            </div>

            {/* 그룹 1: SEO 분석 (기본 펼침) */}
            <SidebarGroup title="SEO 분석" defaultOpen={true}>
                {/* Metrics Cards */}
                <div className="metrics-grid">
                    <div
                        className={`metric-card metric-clickable ${activeMetric === 'density' ? 'active' : ''}`}
                        onClick={() => setActiveMetric(prev => prev === 'density' ? null : 'density')}
                    >
                        <div className="metric-value">{keywordDensity != null ? `${keywordDensity}%` : '-'}</div>
                        <div className="metric-label">키워드 밀도</div>
                    </div>
                    <div
                        className={`metric-card metric-clickable ${activeMetric === 'intro' ? 'active' : ''}`}
                        onClick={() => setActiveMetric(prev => prev === 'intro' ? null : 'intro')}
                    >
                        <div className="metric-value">{introLength != null ? `${introLength}자` : '-'}</div>
                        <div className="metric-label">도입부 길이</div>
                    </div>
                    <div
                        className={`metric-card metric-clickable ${activeMetric === 'heading' ? 'active' : ''}`}
                        onClick={() => setActiveMetric(prev => prev === 'heading' ? null : 'heading')}
                    >
                        <div className="metric-value">{headingCount != null ? headingCount : '-'}</div>
                        <div className="metric-label">소제목 수</div>
                    </div>
                </div>
                {activeMetric && (
                    <div className="metric-info-bar">
                        {activeMetric === 'density' && '(출현 횟수 × 키워드 글자수) ÷ 전체 글자수 × 100 — 적정: 1~3%'}
                        {activeMetric === 'intro' && '첫 번째 문단의 글자수 — 권장: 140~160자'}
                        {activeMetric === 'heading' && 'H2, H3 태그 합산 개수 — 1,500자당 3~5개 권장'}
                    </div>
                )}

                {/* 체크리스트 */}
                <div className="dashboard-checklist">
                    <h4 className="dashboard-section-title">최적화 체크리스트</h4>
                    {issues.length === 0 ? (
                        <div className="dashboard-perfect">완벽합니다!</div>
                    ) : (
                        <ul className="dashboard-issues">
                            {issues.map((issue, idx) => (
                                <li key={idx} className={`dashboard-issue dashboard-issue-${issue.type}`}>
                                    <span>{issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                                    {issue.text}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* 가독성 */}
                <ReadabilityPanel />
            </SidebarGroup>

            {/* 그룹 2: AI 도구 */}
            <SidebarGroup title="AI 도구" defaultOpen={false}>
                {/* 태그 추출 */}
                <div className="dashboard-tag-section">
                    <button
                        onClick={handleExtractTags}
                        disabled={loading}
                        className="dashboard-tag-btn"
                    >
                        {loading ? <span className="btn-loading-spinner"><Loader2 size={14} className="spin" /> 분석 중...</span> : '# 블로그 태그 추출'}
                    </button>
                </div>

                {extractedTags.length > 0 && (
                    <div className="dashboard-tag-result">
                        <div className="dashboard-tag-header">
                            <h4 className="dashboard-section-title">추출된 태그</h4>
                            <button onClick={handleCopyTags} className={`dashboard-copy-btn ${copiedAll ? 'copied' : ''}`}>
                                {copiedAll ? '복사됨!' : '전체 복사'}
                            </button>
                        </div>
                        <p className="dashboard-tag-hint">클릭하면 개별 복사됩니다</p>
                        <div className="dashboard-tag-chips">
                            {extractedTags.map((tag, i) => (
                                <span
                                    key={i}
                                    onClick={() => handleCopySingleTag(tag)}
                                    className={`dashboard-tag-chip ${copiedTag === tag ? 'copied' : ''}`}
                                >
                                    {copiedTag === tag ? '복사됨!' : `#${tag}`}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* AI 감지 분석 */}
                <HumannessPanel />

                {/* 썸네일 생성 */}
                <ThumbnailPanel />
            </SidebarGroup>

            {/* 그룹 3: 히스토리 */}
            <SidebarGroup title="작성 히스토리" defaultOpen={false}>
                <PostHistory />
            </SidebarGroup>
        </div>
    );
};

export default AIAnalysisDashboard;
