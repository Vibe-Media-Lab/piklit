import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { AIService } from '../../services/openai';

const AIAnalysisDashboard = () => {
    const { analysis, content, keywords, setKeywords } = useEditor();
    const { checks, issues } = analysis;
    const score = Object.values(checks).filter(Boolean).length;
    const maxScore = Object.keys(checks).length;
    const percentage = Math.round((score / maxScore) * 100);

    const [loading, setLoading] = useState(false);
    const [extractedTags, setExtractedTags] = useState([]);
    const [copiedTag, setCopiedTag] = useState(null); // 개별 복사 피드백
    const [copiedAll, setCopiedAll] = useState(false); // 전체 복사 피드백

    const handleExtractTags = async () => {
        if (content.length < 50) return alert("본문 내용을 좀 더 작성해주세요.");
        const apiKey = AIService.getKey();
        if (!apiKey) return alert("설정에서 API Key를 먼저 등록해주세요.");

        setLoading(true);
        setExtractedTags([]);
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            const text = doc.body.textContent || "";

            const tags = await AIService.extractTags(text);
            const cleanTags = (Array.isArray(tags) ? tags : []).map(t => t.replace('#', ''));
            setExtractedTags(cleanTags);
        } catch (e) {
            alert("태그 추출 오류: " + e.message);
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

            {/* AI Actions - 태그 추출만 */}
            <div style={{ marginBottom: '24px' }}>
                <button
                    onClick={handleExtractTags}
                    disabled={loading}
                    style={{
                        width: '100%', padding: '10px', background: '#6c5ce7', color: 'white',
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
                                background: copiedAll ? '#6c5ce7' : 'none',
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
                                    background: copiedTag === tag ? '#6c5ce7' : '#F3F0FF',
                                    color: copiedTag === tag ? 'white' : '#6c5ce7',
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
                                <span>{issue.type === 'error' ? '' : ''}</span>
                                {issue.text}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

        </div>
    );
};

export default AIAnalysisDashboard;
