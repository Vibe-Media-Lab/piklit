import React from 'react';
import { Check } from 'lucide-react';

/**
 * 위자드 스텝 진행 표시 바
 * @param {number} currentStep - 현재 활성 스텝 (1-based)
 * @param {string[]} labels - 각 스텝의 라벨 배열
 */
const StepIndicator = ({ currentStep, labels }) => (
    <div className="wizard-step-indicator">
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
);

export default StepIndicator;
