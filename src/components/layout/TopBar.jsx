import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useParams, NavLink, useNavigate } from 'react-router-dom';
import { useEditor } from '../../context/EditorContext';
import { useAuth } from '../../context/AuthContext';
import { copyToClipboard, exportAsMarkdown, exportAsHtml, exportAsText } from '../../utils/clipboard';
import { Save, Copy, Download, Check, ChevronDown } from 'lucide-react';
import SettingsModal from '../common/SettingsModal';
import { useToast } from '../common/Toast';

const PAGE_TITLES = {
    '/posts': '내 글',
    '/dashboard': '성장 리포트',
    '/admin/bugs': '버그 리포트',
    '/admin/beta': '베타 테스터',
    '/admin/users': '관리자 목록',
};

const TopBar = () => {
    const { title, content, savePost, posts } = useEditor();
    const { logout, isAdmin } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const [copyStatus, setCopyStatus] = useState('idle');
    const [saveStatus, setSaveStatus] = useState('idle');
    const [exportOpen, setExportOpen] = useState(false);
    const [myMenuOpen, setMyMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const exportRef = useRef(null);

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
        const result = await copyToClipboard(title, content);
        if (result === 'text-only') {
            setCopyStatus('success');
            showToast('텍스트로 복사되었습니다. 서식은 HTML 내보내기를 이용하세요.', 'info');
            setTimeout(() => setCopyStatus('idle'), 2000);
        } else if (result) {
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

    return (
        <div className="app-topbar">
            <h2 className="topbar-title">{getPageTitle()}</h2>

            {/* 모바일 네비게이션 (768px 이하에서 표시) */}
            <nav className="topbar-mobile-nav">
                <NavLink to="/posts" className={({ isActive }) => `topbar-mobile-nav-item${isActive ? ' active' : ''}`}>
                    내 글{posts.length > 0 && <span className="topbar-nav-badge">{posts.length}</span>}
                </NavLink>
                <NavLink to="/dashboard" className={({ isActive }) => `topbar-mobile-nav-item${isActive ? ' active' : ''}`}>
                    리포트
                </NavLink>
                <button
                    className={`topbar-mobile-nav-item${myMenuOpen ? ' active' : ''}`}
                    onClick={() => setMyMenuOpen(true)}
                >
                    마이
                </button>
            </nav>

            {/* 마이 메뉴 바텀시트 */}
            {myMenuOpen && (
                <div className="my-menu-overlay" onClick={() => setMyMenuOpen(false)}>
                    <div className="my-menu-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="my-menu-handle" />
                        {isAdmin && (
                            <>
                                <button className="my-menu-item" onClick={() => { setMyMenuOpen(false); navigate('/admin/bugs'); }}>
                                    버그 리포트
                                </button>
                                <button className="my-menu-item" onClick={() => { setMyMenuOpen(false); navigate('/admin/beta'); }}>
                                    베타 테스터
                                </button>
                                <button className="my-menu-item" onClick={() => { setMyMenuOpen(false); navigate('/admin/users'); }}>
                                    관리자 목록
                                </button>
                                <div className="my-menu-divider" />
                            </>
                        )}
                        <button className="my-menu-item" onClick={() => { setSettingsOpen(true); setMyMenuOpen(false); }}>
                            설정
                        </button>
                        <button className="my-menu-item" onClick={() => { setMyMenuOpen(false); logout(); }}>
                            로그아웃
                        </button>
                        <button className="my-menu-cancel" onClick={() => setMyMenuOpen(false)}>
                            닫기
                        </button>
                    </div>
                </div>
            )}

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
