import React, { createContext, useContext, useState, useCallback } from 'react';
import '../../styles/toast.css';

const ToastContext = createContext();

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within a ToastProvider');
    return ctx;
};

let toastIdCounter = 0;

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info') => {
        const id = ++toastIdCounter;
        setToasts(prev => {
            const next = [...prev, { id, message, type }];
            // 최대 5개 스택
            return next.length > 5 ? next.slice(-5) : next;
        });
        // 3초 후 자동 사라짐
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-container" aria-live="polite">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`toast toast-${toast.type}`}
                        role="alert"
                        onClick={() => removeToast(toast.id)}
                    >
                        <span className="toast-icon">
                            {toast.type === 'success' && '✅'}
                            {toast.type === 'error' && '❌'}
                            {toast.type === 'warning' && '⚠️'}
                            {toast.type === 'info' && 'ℹ️'}
                        </span>
                        <span className="toast-message">{toast.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
