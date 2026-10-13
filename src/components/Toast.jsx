import { createContext, useContext, useState, useCallback } from 'react';
import '../css/toast.css';

const ToastContext = createContext(null);

const TOAST_ICONS = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info',
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now() + Math.random();
        const toast = { id, message, type, duration };
        
        setToasts(prev => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const value = {
        showToast,
        removeToast,
        success: (message, duration) => showToast(message, 'success', duration),
        error: (message, duration) => showToast(message, 'error', duration),
        info: (message, duration) => showToast(message, 'info', duration),
        warning: (message, duration) => showToast(message, 'warning', duration),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
                {toasts.map(toast => (
                    <div 
                        key={toast.id} 
                        className={`toast toast-${toast.type}`}
                        role={toast.type === 'error' ? 'alert' : 'status'}
                        style={toast.duration > 0 ? { '--toast-duration': `${toast.duration}ms` } : undefined}
                        onClick={() => removeToast(toast.id)}
                    >
                        <span className="toast-icon material-icons" aria-hidden="true">
                            {TOAST_ICONS[toast.type] || TOAST_ICONS.info}
                        </span>
                        <span className="toast-message">{toast.message}</span>
                        <button 
                            type="button"
                            aria-label="Dismiss notification"
                            className="toast-close"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeToast(toast.id);
                            }}
                        >
                            <span className="material-icons" aria-hidden="true">close</span>
                        </button>
                        {toast.duration > 0 && <span className="toast-progress" aria-hidden="true" />}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}


