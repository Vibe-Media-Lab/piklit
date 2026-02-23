import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEditor } from '../../context/EditorContext';
import SettingsModal from '../common/SettingsModal';
import {
    FileText,
    BarChart3,
    Settings,
    Plus,
    LogOut,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { createPost } = useEditor();
    const navigate = useNavigate();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const handleNewPost = () => {
        const newId = createPost({ mode: 'ai' });
        navigate(`/editor/${newId}`, { state: { isNew: true } });
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <>
            <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
                {/* 로고 */}
                <div className="sidebar-logo">
                    <NavLink to="/posts" className="sidebar-logo-link">
                        <img src="/logo.png" alt="Piklit" className="sidebar-logo-img" />
                        {!collapsed && <span className="sidebar-logo-text">Piklit</span>}
                    </NavLink>
                </div>

                {/* 새 글 작성 */}
                <button className="sidebar-new-post" onClick={handleNewPost}>
                    <Plus size={18} strokeWidth={2.5} />
                    {!collapsed && <span>새 글 작성</span>}
                </button>

                {/* 네비게이션 */}
                <nav className="sidebar-nav">
                    <NavLink
                        to="/posts"
                        className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                    >
                        <FileText size={18} />
                        {!collapsed && <span>글 목록</span>}
                    </NavLink>
                    <NavLink
                        to="/history"
                        className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                    >
                        <BarChart3 size={18} />
                        {!collapsed && <span>히스토리</span>}
                    </NavLink>
                </nav>

                {/* 하단: 설정 + 프로필 */}
                <div className="sidebar-bottom">
                    <button
                        className="sidebar-nav-item"
                        onClick={() => setIsSettingsOpen(true)}
                    >
                        <Settings size={18} />
                        {!collapsed && <span>설정</span>}
                    </button>

                    {user && (
                        <div className="sidebar-profile">
                            <img
                                src={user.photoURL}
                                alt={user.displayName}
                                className="sidebar-profile-img"
                                referrerPolicy="no-referrer"
                            />
                            {!collapsed && (
                                <div className="sidebar-profile-info">
                                    <span className="sidebar-profile-name">{user.displayName}</span>
                                    <button className="sidebar-logout-btn" onClick={handleLogout}>
                                        <LogOut size={14} />
                                        <span>로그아웃</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 접기/펼치기 버튼 */}
                    <button
                        className="sidebar-collapse-btn"
                        onClick={() => setCollapsed(!collapsed)}
                        title={collapsed ? '펼치기' : '접기'}
                    >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        {!collapsed && <span>접기</span>}
                    </button>
                </div>
            </aside>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </>
    );
};

export default Sidebar;
