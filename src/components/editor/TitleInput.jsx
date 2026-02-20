import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { AIService } from '../../services/openai';

const TitleInput = () => {
    const { title, setTitle, keywords, content } = useEditor();
    const { showToast } = useToast();
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Simple visual validation
    const mainKeyword = keywords.main.trim();
    const startsWithKeyword = mainKeyword && title.startsWith(mainKeyword);

    const handleRecommendToken = async () => {
        if (!mainKeyword) return showToast('메인 키워드를 먼저 설정해주세요.', 'warning');

        setLoading(true);
        setError(null);
        setRecommendations([]);

        try {
            const titles = await AIService.recommendTitles(mainKeyword, keywords.sub, content);
            setRecommendations(titles);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const applyTitle = (newTitle) => {
        setTitle(newTitle);
        setRecommendations([]); // Clear after selection to clean up UI
    };

    return (
        <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label className="input-label" style={{ marginBottom: 0 }}>게시글 제목</label>
                    <button
                        onClick={handleRecommendToken}
                        disabled={loading || !mainKeyword}
                        style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            background: '#f0f0f0',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            cursor: mainKeyword ? 'pointer' : 'not-allowed',
                            color: '#333',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        title={!mainKeyword ? "메인 키워드를 먼저 설정해주세요" : "AI가 SEO 최적화 제목을 추천합니다"}
                    >
                        {loading ? '생성 중...' : '🤖 AI 제목 추천'}
                    </button>
                </div>
                <span style={{
                    fontSize: '0.875rem',
                    color: title.length > 30 ? 'var(--color-warning)' : 'var(--color-text-sub)'
                }}>
                    {title.length} / 25 자
                </span>
            </div>

            {error && <div style={{ color: 'red', fontSize: '0.8rem', marginBottom: '8px' }}>⚠️ {error}</div>}

            {recommendations.length > 0 && (
                <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#666' }}>추천 제목 (클릭하여 적용):</span>
                        <button
                            onClick={handleRecommendToken}
                            disabled={loading}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: '0.75rem', color: 'var(--color-accent)',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            🔄 다른 제목 추천
                        </button>
                    </div>
                    {recommendations.map((rec, idx) => (
                        <button
                            key={idx}
                            onClick={() => applyTitle(rec)}
                            style={{
                                textAlign: 'left',
                                padding: '6px 10px',
                                background: '#f8f9fa',
                                border: '1px solid #eee',
                                borderRadius: '6px',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                color: '#333',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#e9ecef'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#f8f9fa'}
                        >
                            {rec}
                        </button>
                    ))}
                </div>
            )}

            <input
                className="text-input title-input"
                type="text"
                placeholder="[메인 키워드] + [구체적인 상황/타겟]"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                    borderColor: startsWithKeyword ? 'var(--color-success)' : ''
                }}
            />
            {!startsWithKeyword && mainKeyword && (
                <p style={{ color: 'var(--color-warning)', fontSize: '0.875rem', marginTop: '4px' }}>
                    💡 팁: 제목은 메인 키워드 "{mainKeyword}"(으)로 시작하는 것이 좋습니다.
                </p>
            )}
        </div>
    );
};

export default TitleInput;
