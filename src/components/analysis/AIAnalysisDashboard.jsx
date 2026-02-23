import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { AIService } from '../../services/openai';
import PostHistory from './PostHistory';

const AIAnalysisDashboard = () => {
    const { analysis, content, recordAiAction } = useEditor();
    const { checks, issues, keywordDensity, introLength, headingCount } = analysis;
    const score = Object.values(checks).filter(Boolean).length;
    const maxScore = Object.keys(checks).length || 1;
    const percentage = Math.round((score / maxScore) * 100);
    const { showToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [extractedTags, setExtractedTags] = useState([]);
    const [copiedTag, setCopiedTag] = useState(null); // 개별 복사 피드백
    const [copiedAll, setCopiedAll] = useState(false); // 전체 복사 피드백

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
            {/* Score Gauge */}
            <div style={{ textAlign: 'center', marginBottom: '24px', position: 'relative' }}>
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
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{percentage}점</div>
                    <div style={{ fontSize: '0.7rem', color: '#888' }}>SEO 점수</div>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-value">{keywordDensity != null ? `${keywordDensity}%` : '-'}</div>
                    <div className="metric-label">키워드 밀도</div>
                </div>
                <div className="metric-card">
                    <div className="metric-value">{introLength != null ? `${introLength}자` : '-'}</div>
                    <div className="metric-label">도입부 길이</div>
                </div>
                <div className="metric-card">
                    <div className="metric-value">{headingCount != null ? headingCount : '-'}</div>
                    <div className="metric-label">소제목 수</div>
                </div>
            </div>

            {/* AI Actions - 태그 추출만 */}
            <div style={{ marginBottom: '24px' }}>
                <button
                    onClick={handleExtractTags}
                    disabled={loading}
                    style={{
                        width: '100%', padding: '10px', background: '#FF6B35', color: 'white',
                        border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem'
                    }}
                >
                    {loading ? '분석 중...' : '# 블로그 태그 추출'}
                </button>
            </div>

            {/* 추출된 태그 결과 */}
            {extractedTags.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h4 style={{ fontSize: '0.85rem', margin: 0 }}>추출된 태그</h4>
                        <button
                            onClick={handleCopyTags}
                            style={{
                                background: copiedAll ? '#FF6B35' : 'none',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                color: copiedAll ? 'white' : '#666',
                                transition: 'all 0.2s'
                            }}
                        >
                            {copiedAll ? '복사됨!' : '전체 복사'}
                        </button>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: '#999', margin: '0 0 6px 0' }}>
                        클릭하면 개별 복사됩니다
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {extractedTags.map((tag, i) => (
                            <span
                                key={i}
                                onClick={() => handleCopySingleTag(tag)}
                                style={{
                                    padding: '4px 10px',
                                    background: copiedTag === tag ? '#FF6B35' : '#FFF3ED',
                                    color: copiedTag === tag ? 'white' : '#FF6B35',
                                    borderRadius: '12px',
                                    fontSize: '0.8rem',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {copiedTag === tag ? '복사됨!' : `#${tag}`}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Issues List */}
            <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>최적화 체크리스트</h4>

                {issues.length === 0 ? (
                    <div style={{ padding: '12px', background: '#d4edda', color: '#155724', borderRadius: '8px', fontSize: '0.85rem' }}>
                        완벽합니다!
                    </div>
                ) : (
                    <ul style={{ paddingLeft: '0', listStyle: 'none' }}>
                        {issues.map((issue, idx) => (
                            <li key={idx} style={{
                                padding: '10px',
                                marginBottom: '8px',
                                background: issue.type === 'error' ? '#f8d7da' : '#fff3cd',
                                color: issue.type === 'error' ? '#721c24' : '#856404',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                display: 'flex', alignItems: 'start', gap: '8px'
                            }}>
                                <span>{issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                                {issue.text}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Post History Timeline */}
            <PostHistory />
        </div>
    );
};

export default AIAnalysisDashboard;
