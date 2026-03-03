import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EditorProvider } from './context/EditorContext';
import { ToastProvider } from './components/common/Toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';
import './styles/global.css';
import './styles/components.css';

const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const PostListPage = React.lazy(() => import('./pages/PostListPage'));
const EditorPage = React.lazy(() => import('./pages/EditorPage'));
const HistoryPage = React.lazy(() => import('./pages/HistoryPage'));

// 로그인 필요 라우트 보호 컴포넌트
const ProtectedRoute = ({ children }) => {
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

    return <AppLayout>{children}</AppLayout>;
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
    return (
        <Suspense fallback={<PageLoading />}>
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/posts" element={
                <ProtectedRoute>
                    <PostListPage />
                </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <HistoryPage />
                </ProtectedRoute>
            } />
            <Route path="/editor/:id" element={
                <ProtectedRoute>
                    <ErrorBoundary>
                        <EditorPage />
                    </ErrorBoundary>
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
                    </ToastProvider>
                </EditorProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;
