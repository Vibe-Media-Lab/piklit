import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES, getToneForCategory } from '../data/categories';
import { useEditor } from '../context/EditorContext';
import '../styles/components.css'; // Uses new wizard-* classes

const StartWizardPage = () => {
    const navigate = useNavigate();
    const { createPost } = useEditor();

    // Step state: 1 (Category), 2 (Topic/Subject), 3 (Preview)
    const [step, setStep] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [mode, setMode] = useState('direct'); // 'direct' or 'ai'

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        setStep(2);
    };

    const handleKeywordSubmit = (e) => {
        e.preventDefault();
        if (keyword.trim()) {
            setStep(3);
        }
    };

    const handleStart = () => {
        if (!selectedCategory) return;

        // Create new post ID
        const newId = createPost();

        const autoTone = getToneForCategory(selectedCategory.id);

        // Navigate with state to pre-fill editor
        navigate(`/editor/${newId}`, {
            state: {
                initialMainKeyword: keyword,
                initialTone: autoTone,
                initialCategory: selectedCategory.label,
                initialCategoryId: selectedCategory.id, // Pass ID for AI lookup
                initialTemplateId: selectedCategory.templateId,
                initialMode: mode
            }
        });
    };

    return (
        <div className="wizard-container">
            {/* Progress Bar (Minimalist dots) */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '60px' }}>
                {[1, 2, 3].map(s => (
                    <div key={s} style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: s === step ? 'var(--color-primary)' : 'var(--color-border)',
                        transition: 'background 0.3s'
                    }} />
                ))}
            </div>

            {/* STEP 1: Topic Selection */}
            {step === 1 && (
                <div className="wizard-step">
                    <h2 className="wizard-title">어떤 글을 쓰실 건가요?</h2>
                    <p className="wizard-desc">주제를 선택하면 가장 알맞은 톤앤무드를 추천해드려요.</p>

                    <div className="wizard-grid">
                        {CATEGORIES.map(cat => (
                            <div
                                key={cat.id}
                                className="wizard-card"
                                onClick={() => handleCategorySelect(cat)}
                            >
                                <span className="wizard-card-icon">{cat.icon}</span>
                                <span className="wizard-card-label">{cat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 2: Topic/Subject Input */}
            {step === 2 && (
                <div className="wizard-step">
                    <button
                        onClick={() => setStep(1)}
                        className="wizard-btn-text"
                    >
                        ← 뒤로가기
                    </button>
                    <h2 className="wizard-title">무엇을 작성할 것인가요?</h2>
                    <p className="wizard-desc">작성할 주제를 입력해주세요. (예: 장소명, 제품명, 주제)</p>

                    <form onSubmit={handleKeywordSubmit}>
                        <input
                            type="text"
                            className="wizard-input"
                            placeholder={{
                                food: '예: 제주 김선문 식당',
                                cafe: '예: 성수동 카페 온도',
                                shopping: '예: 애플 맥미니 M4',
                                comparison: '예: 다이슨 에어랩 vs 샤오미 드라이어',
                                review: '예: 삼성 갤럭시 S25 울트라',
                                travel: '예: 제주도 2박3일 여행',
                                tech: '예: 애플 비전프로 개발자 리뷰',
                                recipe: '예: 초간단 원팬 파스타',
                                parenting: '예: 12개월 아기 이유식',
                                tips: '예: 자취방 곰팡이 제거 꿀팁',
                            }[selectedCategory?.id] || '예: 작성할 주제를 입력하세요'}
                            value={keyword}
                            onChange={e => setKeyword(e.target.value)}
                            autoFocus
                        />
                        <div style={{ marginTop: '20px' }}>
                            <button
                                type="submit"
                                disabled={!keyword.trim()}
                                className="wizard-btn-primary"
                            >
                                다음 단계로
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* STEP 3: Preview & Launch */}
            {step === 3 && (
                <div className="wizard-step">
                    <button
                        onClick={() => setStep(2)}
                        className="wizard-btn-text"
                    >
                        ← 수정하기
                    </button>
                    <h2 className="wizard-title">작성 준비 완료!</h2>
                    <p className="wizard-desc">선택하신 설정으로 에디터를 엽니다.</p>

                    <div style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        padding: '40px',
                        borderRadius: '4px',
                        marginBottom: '40px',
                        textAlign: 'left',
                        maxWidth: '500px',
                        margin: '0 auto 40px auto'
                    }}>
                        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: '2rem', marginRight: '20px' }}>{selectedCategory.icon}</span>
                            <div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Topic</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{selectedCategory.label}</div>
                            </div>
                        </div>
                        <div style={{ marginBottom: '24px', paddingLeft: '50px' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>주제</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-main)' }}>{keyword}</div>
                        </div>
                        <div style={{ paddingLeft: '50px' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommended tone</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🤖 {getToneForCategory(selectedCategory.id)}
                            </div>
                        </div>
                    </div>

                    {/* Mode Toggle */}
                    <div style={{
                        border: '2px solid #EEE',
                        display: 'inline-flex',
                        padding: '20px 40px',
                        gap: '40px',
                        marginBottom: '40px',
                        background: 'white',
                    }}>
                        <button
                            onClick={() => setMode('direct')}
                            style={{
                                background: 'none',
                                border: 'none',
                                borderBottom: mode === 'direct' ? '3px solid #333' : '3px solid transparent',
                                padding: '10px 0',
                                fontSize: '1.1rem',
                                fontWeight: mode === 'direct' ? 'bold' : 'normal',
                                color: mode === 'direct' ? '#333' : '#999',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            ✍️ 직접 작성
                        </button>
                        <div style={{ width: '1px', background: '#EEE' }}></div>
                        <button
                            onClick={() => setMode('ai')}
                            style={{
                                background: 'none',
                                border: 'none',
                                borderBottom: mode === 'ai' ? '3px solid var(--color-accent)' : '3px solid transparent',
                                padding: '10px 0',
                                fontSize: '1.1rem',
                                fontWeight: mode === 'ai' ? 'bold' : 'normal',
                                color: mode === 'ai' ? 'var(--color-accent)' : '#999',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            ✨ AI 자동 작성
                        </button>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                        <button
                            onClick={handleStart}
                            className="wizard-btn-primary"
                            style={{ fontSize: '1.1rem', padding: '16px 48px' }}
                        >
                            블로그 작성 시작하기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StartWizardPage;
