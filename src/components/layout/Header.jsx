import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Layout.css';
import { useEditor } from '../../context/EditorContext';
import { copyToClipboard } from '../../utils/clipboard';
import SettingsModal from '../common/SettingsModal';

const Header = () => {
    const { title, content, savePost, currentPostId } = useEditor();
    const [copyStatus, setCopyStatus] = useState('idle'); // idle, success, error
    const [saveStatus, setSaveStatus] = useState('idle'); // idle, success
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleSave = () => {
        const success = savePost();
        if (success) {
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }
    };

    const handleCopy = async () => {
        const success = await copyToClipboard(title, content);
        if (success) {
            setCopyStatus('success');
            setTimeout(() => setCopyStatus('idle'), 2000);
        } else {
            setCopyStatus('error');
            setTimeout(() => setCopyStatus('idle'), 2000);
        }
    };

    return (
        <>
            <header className="header">
                <div className="header-logo">
                    <NavLink to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                        NAVER <span>블로그 에디터</span>
                    </NavLink>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        style={{
                            padding: '8px',
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.2rem',
                            cursor: 'pointer'
                        }}
                        title="설정"
                    >
                        ⚙️
                    </button>
                    {currentPostId && (
                        <button
                            onClick={handleSave}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: saveStatus === 'success' ? 'var(--color-success)' : 'var(--color-surface)',
                                color: saveStatus === 'success' ? 'white' : 'var(--color-text-main)',
                                borderRadius: 'var(--radius-lg)',
                                fontWeight: '600',
                                border: saveStatus === 'success' ? 'none' : '1px solid var(--color-border)',
                                transition: 'background-color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            {saveStatus === 'success' ? (
                                <>✅ 저장 완료!</>
                            ) : (
                                <>💾 저장</>
                            )}
                        </button>
                    )}
                    <button
                        onClick={handleCopy}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: copyStatus === 'success' ? 'var(--color-success)' : 'var(--color-primary)',
                            color: 'white',
                            borderRadius: 'var(--radius-lg)',
                            fontWeight: '600',
                            transition: 'background-color 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        {copyStatus === 'success' ? (
                            <>✅ 복사 완료!</>
                        ) : (
                            <>📋 블로그로 복사</>
                        )}
                    </button>
                </div>
            </header>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </>
    );
};

export default Header;
