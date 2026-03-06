import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useParams, NavLink, useNavigate } from 'react-router-dom';
import { useEditor } from '../../context/EditorContext';
import { copyToClipboard, exportAsMarkdown, exportAsHtml, exportAsText } from '../../utils/clipboard';
import { Save, Copy, Download, Check, ChevronDown, Plus, User, Settings, LogOut } from 'lucide-react';
import SettingsModal from '../common/SettingsModal';

const PAGE_TITLES = {
    '/posts': '내 글',
    '/dashboard': '성장 리포트',
};

const TopBar = () => {
    const { title, content, savePost, currentPostId } = useEditor();
    const location = useLocation();
    const { id } = useParams();
    const [copyStatus, setCopyStatus] = useState('idle');
    const [saveStatus, setSaveStatus] = useState('idle');
    const [exportOpen, setExportOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const exportRef = useRef(null);
    const profileRef = useRef(null);

    useEffect(() => {
        if (!exportOpen && !profileOpen) return;
        const handleClickOutside = (e) => {
            if (exportOpen && exportRef.current && !exportRef.current.contains(e.target)) {
                setExportOpen(false);
            }
            if (profileOpen && profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [exportOpen, profileOpen]);

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

    // 페이지 타이틀 결정 — URL params 기반 (currentPostId 설정 지연과 무관하게 즉시 표시)
    const getPageTitle = () => {
        if (id) return title || '새 글';
        return PAGE_TITLES[location.pathname] || '';
    };

    const isEditor = !!id;
    const navigate = useNavigate();

    return (
        <div className="app-topbar">
            <h2 className="topbar-title">{getPageTitle()}</h2>

            {/* 모바일 네비게이션 (768px 이하에서 표시) */}
            <nav className="topbar-mobile-nav">
                <NavLink to="/posts" className={({ isActive }) => `topbar-mobile-nav-item${isActive ? ' active' : ''}`}>
                    내 글
                </NavLink>
                <NavLink to="/dashboard" className={({ isActive }) => `topbar-mobile-nav-item${isActive ? ' active' : ''}`}>
                    리포트
                </NavLink>
                <button className="topbar-new-post-fab" onClick={() => navigate('/start')} aria-label="새 글 작성">
                    <Plus size={18} />
                </button>
                <div className="topbar-profile-wrapper" ref={profileRef}>
                    <button className="topbar-profile-btn" onClick={() => setProfileOpen(prev => !prev)} aria-label="프로필 설정">
                        <User size={18} />
                    </button>
                    {profileOpen && (
                        <div className="topbar-profile-dropdown">
                            <button onClick={() => { setSettingsOpen(true); setProfileOpen(false); }}>
                                <Settings size={15} /> 설정
                            </button>
                            <button onClick={() => { setProfileOpen(false); }}>
                                <LogOut size={15} /> 로그아웃
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {isEditor && (
                <div className="topbar-actions">
                    <button className="topbar-btn" onClick={handleSave}>
                        {saveStatus === 'success'
                            ? <><Check size={15} /> <span>저장됨</span></>
                            : <><Save size={15} /> <span>저장</span></>
                        }
                    </button>
                    <button className="topbar-btn topbar-btn-primary" onClick={handleCopy}>
                        {copyStatus === 'success'
                            ? <><Check size={15} /> <span>복사됨</span></>
                            : <><Copy size={15} /> <span>블로그로 복사</span></>
                        }
                    </button>
                    <div className="export-dropdown" ref={exportRef}>
                        <button className="topbar-btn" onClick={() => setExportOpen(prev => !prev)}>
                            <Download size={15} /> <span>내보내기</span> <ChevronDown size={14} />
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
            )}
            <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
    );
};

export default TopBar;
