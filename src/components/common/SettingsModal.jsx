import React, { useState, useEffect } from 'react';

const SettingsModal = ({ isOpen, onClose }) => {
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        if (isOpen) {
            setApiKey(localStorage.getItem('openai_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '');
        }
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem('openai_api_key', apiKey);
        onClose();
        alert('API Key가 저장되었습니다.');
    };

    if (!isOpen) return null;

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
                width: '400px',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>⚙️ 설정</h3>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Google Gemini API Key</label>
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
                        AI 기능을 사용하려면 Google Gemini API Key가 필요합니다. (.env 설정 우선)
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
                            background: 'var(--color-primary)',
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
        </div >
    );
};

export default SettingsModal;
