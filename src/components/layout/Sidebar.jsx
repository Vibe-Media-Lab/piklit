import React, { useState, useCallback, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEditor } from '../../context/EditorContext';
import SettingsModal from '../common/SettingsModal';
import {
    FileText,
    BarChart3,
    Settings,
    Plus,
    AlertTriangle,
    Bug,
    Users,
    Shield,
    Menu,
} from 'lucide-react';
import { callBetaStatus } from '../../services/firebase';

const PLAN_LABELS = {
    free: '무료 체험',
    beta: 'Beta',
    byok: 'BYOK',
    pro: 'Pro',
    master: 'Master',
};

const Sidebar = () => {
    const { user, logout, isAdmin } = useAuth();
    const { createPost, navigationGuardRef, posts, currentPostId, deletePost, revertPost } = useEditor();
    const navigate = useNavigate();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const [leaveModal, setLeaveModal] = useState(null);

    // 사용자 플랜 판별
    const [userPlan, setUserPlan] = useState('free');
    useEffect(() => {
        if (!user) return;
        if (isAdmin) { setUserPlan('master'); return; }
        if (localStorage.getItem('openai_api_key')) { setUserPlan('byok'); return; }
        callBetaStatus()
            .then(result => {
                if (result.data?.active) setUserPlan('beta');
            })
            .catch(() => {});
    }, [user, isAdmin]);

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

        // 저장 안 함 처리: 수동 저장 이력 없는 글 → 삭제, 있는 글 → 스냅샷 롤백
        const currentPost = posts.find(p => p.id === currentPostId);
        if (currentPost) {
            if (!currentPost.savedAt) {
                deletePost(currentPost.id);
            } else if (currentPost._snapshot) {
                revertPost(currentPost.id);
            }
        }

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
                    {isAdmin && (
                        <>
                            <div className="sidebar-nav-divider" />
                            {!collapsed && <span className="sidebar-nav-section-label">관리자</span>}
                            <NavLink
                                to="/admin/bugs"
                                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                            >
                                <Bug size={18} />
                                {!collapsed && <span>버그 리포트</span>}
                            </NavLink>
                            <NavLink
                                to="/admin/beta"
                                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                            >
                                <Users size={18} />
                                {!collapsed && <span>베타 테스터</span>}
                            </NavLink>
                            <NavLink
                                to="/admin/users"
                                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                            >
                                <Shield size={18} />
                                {!collapsed && <span>관리자 목록</span>}
                            </NavLink>
                        </>
                    )}
                </nav>

                {/* 하단: 프로필 + 접기 */}
                <div className="sidebar-bottom">
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
                                    <div className="sidebar-profile-row">
                                        <span className="sidebar-profile-name">{user.displayName}</span>
                                        <button
                                            className="sidebar-settings-btn"
                                            onClick={() => setIsSettingsOpen(true)}
                                            title="설정"
                                        >
                                            <Settings size={18} />
                                        </button>
                                    </div>
                                    <span className={`sidebar-plan-badge sidebar-plan-badge--${userPlan}`}>
                                        {PLAN_LABELS[userPlan]}
                                    </span>
                                </div>
                            )}
                            {collapsed && (
                                <button
                                    className="sidebar-settings-btn"
                                    onClick={() => setIsSettingsOpen(true)}
                                    title="설정"
                                >
                                    <Settings size={18} />
                                </button>
                            )}
                        </div>
                    )}

                    <button
                        className="sidebar-collapse-btn"
                        onClick={() => setCollapsed(!collapsed)}
                        title={collapsed ? '펼치기' : '접기'}
                    >
                        <Menu size={18} />
                    </button>
                </div>
            </aside>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {/* 이탈 방지 확인 모달 */}
            {leaveModal && (
                <div className="leave-guard-overlay" onClick={handleStay}>
                    <div className="leave-guard-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="leave-guard-header">
                            <AlertTriangle size={22} className="leave-guard-icon" />
                            <span className="leave-guard-title">작성 중인 내용이 있어요</span>
                        </div>
                        <p className="leave-guard-desc">
                            저장하지 않고 나가면 내용이 사라질 수 있어요.
                        </p>
                        <div className="leave-guard-actions">
                            <button className="leave-guard-btn-cancel" onClick={handleStay}>계속 작성</button>
                            <button className="leave-guard-btn-leave" onClick={handleLeave}>나가기</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
