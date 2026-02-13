import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import './Layout.css';
import { useEditor } from '../../context/EditorContext';
import { copyToClipboard, exportAsMarkdown, exportAsHtml, exportAsText } from '../../utils/clipboard';
import SettingsModal from '../common/SettingsModal';

const Header = () => {
    const { title, content, savePost, currentPostId } = useEditor();
    const [copyStatus, setCopyStatus] = useState('idle'); // idle, success, error
    const [saveStatus, setSaveStatus] = useState('idle'); // idle, success
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const exportRef = useRef(null);

    // 외부 클릭 시 드롭다운 닫힘
    useEffect(() => {
        if (!exportOpen) return;
        const handleClickOutside = (e) => {
            if (exportRef.current && !exportRef.current.contains(e.target)) {
                setExportOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [exportOpen]);

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
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <NavLink
                        to="/history"
                        style={({ isActive }) => ({
                            padding: '8px 14px',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            color: isActive ? 'var(--color-accent)' : 'var(--color-text-sub)',
                            textDecoration: 'none',
                            borderRadius: 'var(--radius-lg)',
                            transition: 'color 0.2s, background 0.2s',
                            background: isActive ? 'var(--color-accent-bg)' : 'transparent',
                        })}
                    >
                        히스토리
                    </NavLink>
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
                    <div className="export-dropdown" ref={exportRef}>
                        <button
                            onClick={() => setExportOpen(prev => !prev)}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'var(--color-surface)',
                                color: 'var(--color-text-main)',
                                borderRadius: 'var(--radius-lg)',
                                fontWeight: '600',
                                border: '1px solid var(--color-border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            내보내기 ▾
                        </button>
                        {exportOpen && (
                            <div className="export-dropdown-menu">
                                <button onClick={() => { exportAsMarkdown(title, content); setExportOpen(false); }}>
                                    Markdown (.md)
                                </button>
                                <button onClick={() => { exportAsHtml(title, content); setExportOpen(false); }}>
                                    HTML (.html)
                                </button>
                                <button onClick={() => { exportAsText(title, content); setExportOpen(false); }}>
                                    텍스트 (.txt)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </>
    );
};

export default Header;
