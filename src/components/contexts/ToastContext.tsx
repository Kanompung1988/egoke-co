import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showWarning: (message: string) => void;
    showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 5000);
    }, []);

    const showSuccess = useCallback((message: string) => addToast(message, 'success'), [addToast]);
    const showError = useCallback((message: string) => addToast(message, 'error'), [addToast]);
    const showWarning = useCallback((message: string) => addToast(message, 'warning'), [addToast]);
    const showInfo = useCallback((message: string) => addToast(message, 'info'), [addToast]);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    const getToastStyles = (type: ToastType) => {
        const baseStyles = 'px-6 py-4 rounded-lg shadow-2xl backdrop-blur-sm border-2 flex items-center gap-3 min-w-80';
        
        switch (type) {
            case 'success':
                return `${baseStyles} bg-green-500/95 border-green-400 text-white`;
            case 'error':
                return `${baseStyles} bg-red-500/95 border-red-400 text-white`;
            case 'warning':
                return `${baseStyles} bg-amber-500/95 border-amber-400 text-white`;
            case 'info':
                return `${baseStyles} bg-blue-500/95 border-blue-400 text-white`;
        }
    };

    const getToastIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
        }
    };

    return (
        <ToastContext.Provider value={{ showSuccess, showError, showWarning, showInfo }}>
            {children}
            
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`${getToastStyles(toast.type)} animate-fade-in-down pointer-events-auto transform transition-all hover:scale-105`}
                        onClick={() => removeToast(toast.id)}
                        role="alert"
                    >
                        <span className="text-2xl">{getToastIcon(toast.type)}</span>
                        <span className="flex-1 font-semibold">{toast.message}</span>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="hover:opacity-70 transition-opacity"
                            aria-label="Close notification"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
