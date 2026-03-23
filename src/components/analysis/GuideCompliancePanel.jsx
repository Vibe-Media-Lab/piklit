import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ClipboardList, Loader2, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { AIService } from '../../services/openai';
import { useEditor } from '../../context/EditorContext';
import { useToast } from '../common/Toast';

const GuideCompliancePanel = ({ sponsorGuide, autoRun = false, onAutoRunDone }) => {
    const { content, title, recordAiAction } = useEditor();
    const { showToast } = useToast();
    const [checking, setChecking] = useState(false);
    const [result, setResult] = useState(null);
    const [collapsed, setCollapsed] = useState(false);
    const panelRef = useRef(null);

    const runCheck = useCallback(async () => {
        if (!content || content.length < 50 || !sponsorGuide) return;
        setChecking(true);
        setCollapsed(false);
        recordAiAction('checkGuideCompliance');
        try {
            const htmlWithTitle = title ? `<h1>${title}</h1>\n${content}` : content;
            const res = await AIService.checkGuideCompliance(htmlWithTitle, sponsorGuide);
            setResult(res);
            setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        } catch (err) {
            showToast('가이드 체크 실패: ' + err.message, 'error');
        } finally {
            setChecking(false);
        }
    }, [content, title, sponsorGuide]);

    // autoRun: 축하 카드에서 바로 체크 실행
    useEffect(() => {
        if (autoRun && !checking && content?.length > 50) {
            runCheck();
            onAutoRunDone?.();
        }
    }, [autoRun]);

    if (!sponsorGuide) return null;

    const handleCheck = () => {
        if (!content || content.length < 50) {
            showToast('본문이 너무 짧습니다. 글 생성 후 체크하세요.', 'warning');
            return;
        }
        runCheck();
    };

    const passCount = result?.checks?.filter(c => c.pass).length || 0;
    const totalCount = result?.checks?.length || 0;

    return (
        <div className="guide-compliance-panel" ref={panelRef}>
            <div className="guide-compliance-header" onClick={() => result && setCollapsed(prev => !prev)} style={{ cursor: result ? 'pointer' : 'default' }}>
                <ClipboardList size={16} />
                <span>가이드 준수 체크</span>
                {result && (
                    <>
                        <span className={`guide-compliance-score ${result.overallPass ? 'pass' : 'fail'}`}>
                            {passCount}/{totalCount}
                        </span>
                        {result.overallPass
                            ? <span className="guide-compliance-badge pass">통과</span>
                            : <span className="guide-compliance-badge fail">미충족</span>
                        }
                        {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </>
                )}
            </div>

            {!result ? (
                <button className="guide-compliance-btn" onClick={handleCheck} disabled={checking}>
                    {checking ? <><Loader2 size={14} className="spin" /> 체크 중...</> : '가이드 준수 체크 실행'}
                </button>
            ) : !collapsed && (
                <div className="guide-compliance-results">
                    {result.checks?.map((check, i) => (
                        <div key={i} className={`guide-check-item ${check.pass ? 'pass' : 'fail'}`}>
                            <div className="guide-check-status">
                                {check.pass ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                <span className="guide-check-label">{check.label}</span>
                            </div>
                            {check.details?.length > 0 && (
                                <div className="guide-check-details">
                                    {check.details.map((d, j) => (
                                        <span key={j} className={`guide-detail-chip ${typeof d === 'object' ? (d.pass ? 'pass' : 'fail') : ''}`}>
                                            {typeof d === 'object' ? `${d.keyword || d.item}: ${d.count ?? ''}${d.pass ? ' ✓' : ' ✗'}` : d}
                                        </span>
                                    ))}
                                </div>
                            )}
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
