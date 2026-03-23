import React, { useState } from 'react';
import { ClipboardList, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { AIService } from '../../services/openai';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';

const GuideCompliancePanel = ({ sponsorGuide }) => {
    const { content, recordAiAction } = useEditor();
    const { showToast } = useToast();
    const [checking, setChecking] = useState(false);
    const [result, setResult] = useState(null);

    if (!sponsorGuide) return null;

    const handleCheck = async () => {
        if (!content || content.length < 50) {
            showToast('본문이 너무 짧습니다. 글 생성 후 체크하세요.', 'warning');
            return;
        }
        setChecking(true);
        recordAiAction('checkGuideCompliance');
        try {
            const res = await AIService.checkGuideCompliance(content, sponsorGuide);
            setResult(res);
        } catch (err) {
            showToast('가이드 체크 실패: ' + err.message, 'error');
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="guide-compliance-panel">
            <div className="guide-compliance-header">
                <ClipboardList size={16} />
                <span>가이드 준수 체크</span>
                {result && (
                    <span className={`guide-compliance-score ${result.overallPass ? 'pass' : 'fail'}`}>
                        {result.score}
                    </span>
                )}
            </div>

            {!result ? (
                <button className="guide-compliance-btn" onClick={handleCheck} disabled={checking}>
                    {checking ? <><Loader2 size={14} className="spin" /> 체크 중...</> : '가이드 준수 체크 실행'}
                </button>
            ) : (
                <div className="guide-compliance-results">
                    {result.checks?.map((check, i) => (
                        <div key={i} className={`guide-check-item ${check.pass ? 'pass' : 'fail'}`}>
                            <div className="guide-check-status">
                                {check.pass ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                <span className="guide-check-label">{check.label}</span>
                            </div>
                            {!check.pass && check.suggestion && (
                                <div className="guide-check-suggestion">
                                    <AlertCircle size={12} />
                                    <span>{check.suggestion}</span>
                                </div>
                            )}
                        </div>
                    ))}
                    <button className="guide-compliance-btn guide-compliance-recheck" onClick={handleCheck} disabled={checking}>
                        {checking ? <><Loader2 size={14} className="spin" /> 재체크 중...</> : '다시 체크'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default GuideCompliancePanel;
