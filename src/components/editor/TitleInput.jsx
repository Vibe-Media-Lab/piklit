import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';
import { AIService } from '../../services/openai';
import { Bot, RefreshCw, AlertCircle } from 'lucide-react';

const TitleInput = () => {
    const { title, setTitle, keywords, content, suggestedTone, posts, currentPostId } = useEditor();
    const { showToast } = useToast();
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const mainKeyword = keywords.main.trim();
    const startsWithKeyword = mainKeyword && title.startsWith(mainKeyword);

    const handleRecommendToken = async () => {
        if (!mainKeyword) return showToast('메인 키워드를 먼저 설정해주세요.', 'warning');

        setLoading(true);
        setError(null);
        setRecommendations([]);

        try {
            const currentCategory = posts.find(p => p.id === currentPostId)?.categoryId || 'daily';
            const titles = await AIService.recommendTitles(mainKeyword, keywords.sub, content, suggestedTone, currentCategory);
            setRecommendations(titles);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const applyTitle = (newTitle) => {
        setTitle(newTitle);
        setRecommendations([]);
    };

    return (
        <div className="title-section">
            <div className="title-header">
                <button
                    onClick={handleRecommendToken}
                    disabled={loading || !mainKeyword}
                    className="title-ai-btn"
                    title={!mainKeyword ? "메인 키워드를 먼저 설정해주세요" : "AI가 SEO 최적화 제목을 추천합니다"}
                >
                    <Bot size={13} />
                    {loading ? '생성 중...' : '타이틀 AI 추천'}
                </button>
                <span className={`title-counter ${title.length > 30 ? 'warning' : ''}`}>
                    {title.length}/25
                </span>
            </div>

            {error && (
                <div className="title-error">
                    <AlertCircle size={12} /> {error}
                </div>
            )}

            {recommendations.length > 0 && (
                <div className="title-rec-wrap">
                    <div className="title-rec-header">
                        <span className="title-rec-label">추천 제목 (탭하여 적용)</span>
                        <button
                            onClick={handleRecommendToken}
                            disabled={loading}
                            className="title-rec-refresh"
                        >
                            <RefreshCw size={12} /> 다시
                        </button>
                    </div>
                    <div className="title-rec-list">
                        {recommendations.map((rec, idx) => (
                            <button
                                key={idx}
                                onClick={() => applyTitle(rec)}
                                className="title-rec-item"
                            >
                                {rec}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <input
                className="text-input title-input"
                type="text"
                placeholder={mainKeyword ? `${mainKeyword} + 구체적인 상황/타겟` : '제목을 입력하세요'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={startsWithKeyword ? { borderColor: 'var(--color-success)' } : undefined}
            />
            {!startsWithKeyword && mainKeyword && (
                <p className="title-tip">메인 키워드로 시작하면 검색 노출에 유리해요</p>
            )}
        </div>
    );
};

export default TitleInput;
