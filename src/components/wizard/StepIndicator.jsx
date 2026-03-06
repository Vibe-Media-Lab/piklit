import React from 'react';
import { Check } from 'lucide-react';

/**
 * 위자드 스텝 진행 표시 바
 * @param {number} currentStep - 현재 활성 스텝 (1-based)
 * @param {string[]} labels - 각 스텝의 라벨 배열
 * @param {function} onStepClick - 스텝 클릭 핸들러 (선택)
 */
const StepIndicator = ({ currentStep, labels, onStepClick }) => (
    <>
        {/* 데스크톱: 원형 + 커넥터 */}
        <div className="wizard-step-indicator wizard-step-desktop">
            {labels.map((label, i) => {
                const step = i + 1;
                const status = step === currentStep ? 'active' : step < currentStep ? 'completed' : 'pending';
                return (
                    <React.Fragment key={step}>
                        <div className="wizard-step-item">
                            <div className={`wizard-step-circle ${status}`}>
                                {step < currentStep ? <Check size={14} /> : step}
                            </div>
                            <span className={`wizard-step-label ${status}`}>
                                {label}
                            </span>
                        </div>
                        {step < labels.length && <div className={`wizard-step-connector ${step < currentStep ? 'completed' : ''}`} />}
                    </React.Fragment>
                );
            })}
        </div>

        {/* 모바일: 텍스트 + 세그먼트 바 */}
        <div className="wizard-step-indicator wizard-step-mobile">
            <div className="wizard-step-mobile-label">
                {currentStep}단계: {labels[currentStep - 1]}
            </div>
            <div className="wizard-step-segments">
                {labels.map((_, i) => {
                    const step = i + 1;
                    const status = step === currentStep ? 'active' : step < currentStep ? 'completed' : 'pending';
                    return (
                        <button
                            key={step}
                            className={`wizard-step-segment ${status}`}
                            onClick={() => step < currentStep && onStepClick?.(step)}
                            disabled={step >= currentStep}
                            aria-label={`${step}단계: ${labels[i]}`}
                        />
                    );
                })}
            </div>
        </div>
    </>
);

export default StepIndicator;
