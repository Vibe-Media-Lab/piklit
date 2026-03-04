import React from 'react';
import { Sparkles, Loader2, Search, Tag, CheckCircle } from 'lucide-react';

const GENERATION_STEPS = [
    { label: '준비 중 (이미지 변환)', icon: <Loader2 size={16} /> },
    { label: '사진 분석 중', icon: <Search size={16} /> },
    { label: 'ALT 텍스트 생성 중', icon: <Tag size={16} /> },
    { label: '본문 작성 중', icon: <Sparkles size={16} /> },
];

const GenerationLoadingScreen = ({ generationStep }) => {
    const progressPercent = Math.round((generationStep / (GENERATION_STEPS.length - 1)) * 100);

    return (
        <div>
            <div className="generation-loading">
                <div className="generation-card">
                    <div className="generation-icon">
                        <Sparkles size={48} />
                    </div>
                    <h2>AI가 글을 작성하고 있어요</h2>
                    <p className="generation-subtitle">
                        잠시만 기다려주세요. 곧 완성됩니다!
                    </p>

                    <div className="generation-progress-track">
                        <div className="generation-progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>

                    <div className="generation-steps">
                        {GENERATION_STEPS.map((step, idx) => {
                            const isDone = idx < generationStep;
                            const isCurrent = idx === generationStep;
                            return (
                                <div key={idx} className={`generation-step ${isDone ? 'done' : isCurrent ? 'current' : ''}`}>
                                    <span className="generation-step-icon">
                                        {isDone ? <CheckCircle size={16} /> : isCurrent ? step.icon : <span className="generation-step-placeholder" />}
                                    </span>
                                    <span>{step.label}</span>
                                    {isCurrent && (
                                        <span className="generation-step-status">진행 중...</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GenerationLoadingScreen;
