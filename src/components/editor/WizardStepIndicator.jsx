import React from 'react';
import { Check } from 'lucide-react';

const STEP_LABELS = ['주제 선택', '키워드 + 설정', '이미지 업로드', '아웃라인 + 생성'];

const WizardStepIndicator = ({ aiStep }) => (
    <div className="wizard-step-indicator">
        {[1, 2, 3, 4].map(s => (
            <React.Fragment key={s}>
                <div className="wizard-step-item">
                    <div className={`wizard-step-circle ${s === aiStep ? 'active' : s < aiStep ? 'completed' : 'pending'}`}>
                        {s < aiStep ? <Check size={14} /> : s}
                    </div>
                    <span className={`wizard-step-label ${s === aiStep ? 'active' : s < aiStep ? 'completed' : 'pending'}`}>
                        {STEP_LABELS[s - 1]}
                    </span>
                </div>
                {s < 4 && <div className={`wizard-step-connector ${s < aiStep ? 'completed' : ''}`} />}
            </React.Fragment>
        ))}
    </div>
);

export default WizardStepIndicator;
