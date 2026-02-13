import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { EditorProvider } from './context/EditorContext';
import { ToastProvider } from './components/common/Toast';
import PostListPage from './pages/PostListPage';
import EditorPage from './pages/EditorPage';
import StartWizardPage from './pages/StartWizardPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import './styles/global.css';
import './styles/components.css';

function App() {
    return (
        <Router>
            <EditorProvider>
                <ToastProvider>
                    <Routes>
                        <Route path="/" element={<PostListPage />} />
                        <Route path="/start" element={<StartWizardPage />} />
                        <Route path="/editor/:id" element={
                            <ErrorBoundary>
                                <EditorPage />
                            </ErrorBoundary>
                        } />
                    </Routes>
                </ToastProvider>
            </EditorProvider>
        </Router>
    );
}

export default App;
