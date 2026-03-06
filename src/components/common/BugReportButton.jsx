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
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    left: '24px',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: '#37352F',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99,
                }}
            >
                🐛
            </button>

            {isOpen && (
                <div className="bug-report-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 1100,
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px',
                        width: '420px',
                        maxWidth: '90vw',
                        boxShadow: 'var(--shadow-lg)',
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: '4px' }}>Bug Report</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', marginBottom: '16px' }}>
                            문제를 설명해주세요. 콘솔 로그와 화면 캡쳐는 자동으로 첨부됩니다.
                        </p>

                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="어떤 문제가 발생했나요? (예: 글 생성 버튼을 눌렀는데 오류가 났어요)"
                            rows={4}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                resize: 'vertical',
                                fontSize: '0.9rem',
                                boxSizing: 'border-box',
                            }}
                            autoFocus
                        />

                        <div style={{
                            marginTop: '12px',
                            padding: '10px',
                            background: '#F7F6F3',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.75rem',
                            color: 'var(--color-text-sub)',
                        }}>
                            자동 첨부: 화면 스크린샷, 콘솔 로그, 브라우저 정보, 현재 URL
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                            <button
                                onClick={() => { setIsOpen(false); setDescription(''); }}
                                style={{
                                    padding: '8px 16px',
                                    background: 'var(--color-bg)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                }}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={sending}
                                style={{
                                    padding: '8px 16px',
                                    background: '#37352F',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    opacity: sending ? 0.6 : 1,
                                }}
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
