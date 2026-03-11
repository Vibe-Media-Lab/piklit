import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EditorProvider } from './context/EditorContext';
import { ToastProvider } from './components/common/Toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';
import BugReportButton from './components/common/BugReportButton';
import BetaExpiredModal from './components/common/BetaExpiredModal';
import MobileFab from './components/common/MobileFab';
import { callBetaStatus } from './services/firebase';
import { installConsoleCapture } from './utils/consoleCapture';
import './styles/global.css';
import './styles/components.css';

installConsoleCapture();

// 청크 로드 실패 시 자동 새로고침 (배포 후 캐시 불일치 방지)
const safeImport = (importFn) => () =>
    importFn().catch(() => {
        const reloaded = sessionStorage.getItem('chunk_reload');
        if (!reloaded) {
            sessionStorage.setItem('chunk_reload', '1');
            window.location.reload();
            return new Promise(() => {}); // reload 중 빈 Promise
        }
        sessionStorage.removeItem('chunk_reload');
        return Promise.reject(new Error('페이지를 불러올 수 없습니다. 새로고침해주세요.'));
    });

// 정상 로드 시 플래그 제거
sessionStorage.removeItem('chunk_reload');

const LandingPage = React.lazy(safeImport(() => import('./pages/LandingPage')));
const PostListPage = React.lazy(safeImport(() => import('./pages/PostListPage')));
const EditorPage = React.lazy(safeImport(() => import('./pages/EditorPage')));
const HistoryPage = React.lazy(safeImport(() => import('./pages/HistoryPage')));
const AdminBugsPage = React.lazy(safeImport(() => import('./pages/AdminBugsPage')));
const AdminBetaPage = React.lazy(safeImport(() => import('./pages/AdminBetaPage')));
const AdminUsersPage = React.lazy(safeImport(() => import('./pages/AdminUsersPage')));

// 베타 만료 감지 훅
const useBetaExpired = () => {
    const { isLoggedIn } = useAuth();
    const [betaExpired, setBetaExpired] = useState(null);
    const [dismissed, setDismissed] = useState(
        () => sessionStorage.getItem('beta_expired_dismissed') === 'true'
    );

    useEffect(() => {
        if (!isLoggedIn || dismissed) return;
        callBetaStatus()
            .then(result => {
                if (result.data?.expired) {
                    setBetaExpired(result.data);
                }
            })
            .catch(() => {}); // 실패 시 무시
    }, [isLoggedIn, dismissed]);

    const dismiss = () => {
        setDismissed(true);
        setBetaExpired(null);
        sessionStorage.setItem('beta_expired_dismissed', 'true');
    };

    return { betaExpired: dismissed ? null : betaExpired, dismissBetaExpired: dismiss };
};

// 로그인 필요 라우트 보호 컴포넌트
const ProtectedRoute = ({ children, betaExpired, onBetaDismiss, onBetaNavigate }) => {
    const { isLoggedIn, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                height: '100vh', color: 'var(--color-text-sub)'
            }}>
                로딩 중...
            </div>
        );
    }

    if (!isLoggedIn) {
        return <Navigate to="/" replace />;
    }

    return (
        <AppLayout>
            {children}
            {betaExpired && (
                <BetaExpiredModal
                    stats={betaExpired.stats}
                    onClose={onBetaDismiss}
                    onNavigate={onBetaNavigate}
                />
            )}
        </AppLayout>
    );
};

const PageLoading = () => (
    <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', color: 'var(--color-text-sub)'
    }}>
        로딩 중...
    </div>
);

function AppRoutes() {
    const { betaExpired, dismissBetaExpired } = useBetaExpired();

    const handleBetaNavigate = () => {
        dismissBetaExpired();
    };

    const protectedProps = {
        betaExpired,
        onBetaDismiss: dismissBetaExpired,
        onBetaNavigate: handleBetaNavigate,
    };

    return (
        <Suspense fallback={<PageLoading />}>
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/posts" element={
                <ProtectedRoute {...protectedProps}>
                    <PostListPage />
                </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
                <ProtectedRoute {...protectedProps}>
                    <HistoryPage />
                </ProtectedRoute>
            } />
            <Route path="/editor/:id" element={
                <ProtectedRoute {...protectedProps}>
                    <ErrorBoundary>
                        <EditorPage />
                    </ErrorBoundary>
                </ProtectedRoute>
            } />
            <Route path="/admin/bugs" element={
                <ProtectedRoute {...protectedProps}>
                    <AdminBugsPage />
                </ProtectedRoute>
            } />
            <Route path="/admin/beta" element={
                <ProtectedRoute {...protectedProps}>
                    <AdminBetaPage />
                </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
                <ProtectedRoute {...protectedProps}>
                    <AdminUsersPage />
                </ProtectedRoute>
            } />
        </Routes>
        </Suspense>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <EditorProvider>
                    <ToastProvider>
                        <AppRoutes />
                        <MobileFab />
                        <BugReportButton />
                    </ToastProvider>
                </EditorProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;
