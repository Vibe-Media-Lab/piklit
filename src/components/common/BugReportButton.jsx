import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';
import { callSubmitBugReport } from '../../services/firebase';
import { getConsoleLogs } from '../../utils/consoleCapture';

const BugReportButton = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [description, setDescription] = useState('');
    const [sending, setSending] = useState(false);

    if (!user) return null;

    const handleSubmit = async () => {
        if (!description.trim()) return showToast('문제 설명을 입력해주세요.', 'warning');

        setSending(true);
        try {
            // 콘솔 로그 수집
            const consoleLogs = JSON.stringify(getConsoleLogs(), null, 0);

            // 스크린샷 캡쳐
            let screenshot = '';
            try {
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(document.body, {
                    scale: 0.5,
                    useCORS: true,
                    logging: false,
                    ignoreElements: (el) => el.classList?.contains('bug-report-overlay'),
                });
                screenshot = canvas.toDataURL('image/jpeg', 0.6);
            } catch (e) {
                console.warn('스크린샷 캡쳐 실패:', e);
            }

            await callSubmitBugReport({
                description: description.trim(),
                consoleLogs,
                screenshot,
                url: window.location.href,
                userAgent: navigator.userAgent,
            });

            showToast('버그 리포트가 전송되었습니다. 감사합니다!', 'success');
            setDescription('');
            setIsOpen(false);
        } catch (err) {
            showToast('전송 실패: ' + err.message, 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                title="버그 신고"
                className="bug-report-fab"
            >
                🐛
            </button>

            {isOpen && (
                <div className="bug-report-overlay">
                    <div className="bug-report-modal">
                        <h3>Bug Report</h3>
                        <p className="bug-report-desc">
                            문제를 설명해주세요. 콘솔 로그와 화면 캡쳐는 자동으로 첨부됩니다.
                        </p>

                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="어떤 문제가 발생했나요? (예: 글 생성 버튼을 눌렀는데 오류가 났어요)"
                            rows={4}
                            autoFocus
                        />

                        <div className="bug-report-info">
                            자동 첨부: 화면 스크린샷, 콘솔 로그, 브라우저 정보, 현재 URL
                        </div>

                        <div className="bug-report-actions">
                            <button
                                className="bug-report-btn-cancel"
                                onClick={() => { setIsOpen(false); setDescription(''); }}
                            >
                                취소
                            </button>
                            <button
                                className="bug-report-btn-submit"
                                onClick={handleSubmit}
                                disabled={sending}
                            >
                                {sending ? '전송 중...' : '전송'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BugReportButton;
