import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { type Toast, ToastContext } from '../../contexts/ToastContext';

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    const newToast = { ...toast, id };
    setToasts((prev) => {
      const next = [...prev, newToast];
      const removed = next.length > 4 ? next.shift() : undefined;
      if (removed) {
        const removedTimeout = timeoutRefs.current.get(removed.id);
        if (removedTimeout) clearTimeout(removedTimeout);
        timeoutRefs.current.delete(removed.id);
      }
      return next;
    });

    const duration = toast.duration ?? 5000;
    const timeout = setTimeout(() => {
      removeToast(id);
    }, duration);
    timeoutRefs.current.set(id, timeout);
  }, [removeToast]);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const showError = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message });
  }, [addToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  }, [addToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{
      toasts,
      addToast,
      removeToast,
      showSuccess,
      showError,
      showWarning,
      showInfo,
    }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-[calc(1rem+env(safe-area-inset-top))] right-4 left-4 z-[100] space-y-2 sm:left-auto sm:max-w-sm" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem = ({ toast, onRemove }: ToastItemProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), 10);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(() => onRemove(toast.id), 200);
  };

  const getToastStyles = () => {
    const baseStyles = "pointer-events-auto transform border-l-4 bg-primary-dark/95 shadow-2xl shadow-black/30 backdrop-blur-xl transition-all duration-200 ease-out";
    const visibilityStyles = isVisible 
      ? "translate-x-0 opacity-100" 
      : "translate-x-full opacity-0";
    
    switch (toast.type) {
      case 'success':
        return `${baseStyles} ${visibilityStyles} border-accent-green`;
      case 'error':
        return `${baseStyles} ${visibilityStyles} border-red-400`;
      case 'warning':
        return `${baseStyles} ${visibilityStyles} border-amber-300`;
      case 'info':
        return `${baseStyles} ${visibilityStyles} border-sky-400`;
      default:
        return `${baseStyles} ${visibilityStyles} border-gray-400`;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <CheckCircle2 className="h-5 w-5 text-accent-green" />
        );
      case 'error':
        return (
          <XCircle className="h-5 w-5 text-red-400" />
        );
      case 'warning':
        return (
          <AlertTriangle className="h-5 w-5 text-amber-300" />
        );
      case 'info':
        return (
          <Info className="h-5 w-5 text-sky-400" />
        );
    }
  };

  return (
    <div
      className={`${getToastStyles()} w-full max-w-[calc(100vw-2rem)] rounded-xl border-y border-r border-white/10 p-4 text-white`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <div className="flex items-start space-x-3">
        <div className="shrink-0" aria-hidden="true">
          {getIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">{toast.title}</p>
          {toast.message && (
            <p className="text-sm opacity-90 mt-1">{toast.message}</p>
          )}
        </div>
        <button
          onClick={handleRemove}
          className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
