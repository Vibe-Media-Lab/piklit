import React, { useState, useCallback } from 'react';
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
    AlertTriangle,
} from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { createPost, navigationGuardRef } = useEditor();
    const navigate = useNavigate();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    // 이탈 방지 모달 상태
    const [leaveModal, setLeaveModal] = useState(null); // { pendingAction: () => void }

    // 가드 체크 후 내비게이션 실행
    const guardedNavigate = useCallback((action) => {
        const guard = navigationGuardRef?.current;
        if (guard) {
            setLeaveModal({ pendingAction: action });
        } else {
            action();
        }
    }, [navigationGuardRef]);

    const handleNewPost = () => {
        guardedNavigate(() => {
            const newId = createPost({ mode: 'ai' });
            navigate(`/editor/${newId}`, { state: { isNew: true } });
        });
    };

    const handleLogout = async () => {
        guardedNavigate(async () => {
            await logout();
            navigate('/');
        });
    };

    // NavLink 클릭 가로채기
    const handleNavClick = (e, to) => {
        const guard = navigationGuardRef?.current;
        if (guard) {
            e.preventDefault();
            setLeaveModal({ pendingAction: () => navigate(to) });
        }
    };

    // 모달 액션
    const handleLeave = () => {
        const action = leaveModal?.pendingAction;
        setLeaveModal(null);
        // 가드 해제 후 실행
        if (navigationGuardRef) navigationGuardRef.current = null;
        if (action) action();
    };

    const handleStay = () => {
        setLeaveModal(null);
    };

    return (
        <>
            <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
                {/* 로고 */}
                <div className="sidebar-logo">
                    <NavLink
                        to="/posts"
                        className="sidebar-logo-link"
                        onClick={(e) => handleNavClick(e, '/posts')}
                    >
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
                        onClick={(e) => handleNavClick(e, '/posts')}
                    >
                        <FileText size={18} />
                        {!collapsed && <span>내 글</span>}
                    </NavLink>
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                        onClick={(e) => handleNavClick(e, '/dashboard')}
                    >
                        <BarChart3 size={18} />
                        {!collapsed && <span>성장 리포트</span>}
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

            {/* 이탈 방지 확인 모달 */}
            {leaveModal && (
                <div
                    className="leave-guard-overlay"
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onClick={handleStay}
                >
                    <div
                        className="leave-guard-modal"
                        style={{
                            background: 'var(--color-bg, #fff)',
                            borderRadius: '12px',
                            padding: '28px 24px 20px',
                            maxWidth: '380px',
                            width: '90vw',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            marginBottom: '12px',
                        }}>
                            <AlertTriangle size={22} color="var(--color-warning, #E67E22)" />
                            <span style={{
                                fontSize: '1.05rem', fontWeight: 600,
                                color: 'var(--color-text, #37352F)',
                            }}>
                                페이지를 떠나시겠습니까?
                            </span>
                        </div>
                        <p style={{
                            fontSize: '0.9rem',
                            color: 'var(--color-text-sub, #787774)',
                            margin: '0 0 20px',
                            lineHeight: 1.5,
                        }}>
                            작성 중인 내용이 저장되지 않을 수 있습니다.
                        </p>
                        <div style={{
                            display: 'flex', gap: '8px', justifyContent: 'flex-end',
                        }}>
                            <button
                                onClick={handleStay}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--color-border, #E3E2E0)',
                                    background: 'var(--color-bg, #fff)',
                                    color: 'var(--color-text, #37352F)',
                                    fontSize: '0.88rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleLeave}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: 'var(--color-danger, #EB5757)',
                                    color: '#fff',
                                    fontSize: '0.88rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                            >
                                저장 안 함
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
