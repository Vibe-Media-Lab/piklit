import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EditorProvider } from './context/EditorContext';
import { ToastProvider } from './components/common/Toast';
import LandingPage from './pages/LandingPage';
import PostListPage from './pages/PostListPage';
import EditorPage from './pages/EditorPage';
import HistoryPage from './pages/HistoryPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';
import './styles/global.css';
import './styles/components.css';

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

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/posts" element={
                <ProtectedRoute>
                    <PostListPage />
                </ProtectedRoute>
            } />
            <Route path="/history" element={
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
