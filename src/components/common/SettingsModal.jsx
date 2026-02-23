import React, { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { useAuth } from '../../context/AuthContext';
import { callGetUsageInfo } from '../../services/firebase';

const SettingsModal = ({ isOpen, onClose }) => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [apiKey, setApiKey] = useState('');
    const [usage, setUsage] = useState(null);
    const [usageLoading, setUsageLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setApiKey(localStorage.getItem('openai_api_key') || '');
            // 사용량 조회
            if (user) {
                setUsageLoading(true);
                callGetUsageInfo()
                    .then(result => setUsage(result.data))
                    .catch(err => console.error('사용량 조회 실패:', err))
                    .finally(() => setUsageLoading(false));
            }
        }
    }, [isOpen, user]);

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem('openai_api_key', apiKey.trim());
            showToast('API Key가 저장되었습니다. 무제한으로 사용할 수 있습니다.', 'success');
        } else {
            localStorage.removeItem('openai_api_key');
            showToast('API Key가 제거되었습니다. 무료 체험으로 전환됩니다.', 'success');
        }
        onClose();
    };

    if (!isOpen) return null;

    const hasOwnKey = !!localStorage.getItem('openai_api_key');
    const usagePercent = usage ? Math.round((usage.used / usage.limit) * 100) : 0;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                width: '440px',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px' }}>설정</h3>

                {/* 사용량 표시 */}
                {!hasOwnKey && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '16px',
                        background: '#FFF8F5',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid #FFE0D0'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>무료 체험</span>
                            {usageLoading ? (
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-sub)' }}>조회 중...</span>
                            ) : usage ? (
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: usagePercent >= 80 ? '#EB5757' : 'var(--color-brand)' }}>
                                    {usage.used} / {usage.limit}회 사용
                                </span>
                            ) : null}
                        </div>
                        {usage && (
                            <div style={{
                                height: '6px',
                                background: '#E3E2E0',
                                borderRadius: '3px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.min(usagePercent, 100)}%`,
                                    background: usagePercent >= 80 ? '#EB5757' : 'var(--color-brand)',
                                    borderRadius: '3px',
                                    transition: 'width 0.3s'
                                }} />
                            </div>
                        )}
                        {usage && usage.used >= usage.limit && (
                            <p style={{ fontSize: '0.8rem', color: '#EB5757', marginTop: '8px', marginBottom: 0 }}>
                                무료 체험이 소진되었습니다. 아래에서 직접 API 키를 등록하면 무제한 사용 가능합니다.
                            </p>
                        )}
                    </div>
                )}

                {hasOwnKey && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '12px 16px',
                        background: '#F0FFF4',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid #C6F6D5',
                        fontSize: '0.85rem',
                        color: '#27AE60',
                        fontWeight: 600
                    }}>
                        직접 API 키 사용 중 (무제한)
                    </div>
                )}

                {/* API 키 입력 */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        Google Gemini API Key (선택)
                    </label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIza..."
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)'
                        }}
                    />
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-sub)', marginTop: '8px' }}>
                        직접 API 키를 등록하면 무료 체험 횟수와 관계없이 무제한으로 사용할 수 있습니다.
                    </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--color-bg)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer'
                        }}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--color-brand)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
