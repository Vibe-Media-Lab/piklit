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

const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const PostListPage = React.lazy(() => import('./pages/PostListPage'));
const EditorPage = React.lazy(() => import('./pages/EditorPage'));
const HistoryPage = React.lazy(() => import('./pages/HistoryPage'));
const AdminBugsPage = React.lazy(() => import('./pages/AdminBugsPage'));

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

    const handleBetaNavigate = (planId) => {
        dismissBetaExpired();
        // TODO: 결제 페이지 연동 시 planId별 라우팅 추가
        // 현재는 모달 닫기만 처리
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
