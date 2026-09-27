'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast stack */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-10000 flex flex-col items-end gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="relative overflow-hidden pointer-events-auto w-full sm:w-90 flex items-start gap-3 p-3.5 rounded-xl card shadow-(--shadow-lg) animate-toast-in"
          >
            <div
              className={`shrink-0 h-7 w-7 rounded-lg flex items-center justify-center animate-pop-in ${
                toast.type === 'success'
                  ? 'bg-success-soft text-success'
                  : toast.type === 'error'
                    ? 'bg-danger-soft text-danger'
                    : 'bg-accent-soft text-accent-fg'
              }`}
            >
              {toast.type === 'success' && <CheckCircle className="h-4 w-4" />}
              {toast.type === 'error' && <AlertTriangle className="h-4 w-4" />}
              {toast.type === 'info' && <Info className="h-4 w-4" />}
            </div>

            <p className="flex-1 text-[13px] leading-snug text-fg pt-1">{toast.message}</p>

            {/* Time left before auto-dismiss */}
            <span
              aria-hidden
              className={`absolute left-0 bottom-0 h-0.5 w-full animate-toast-progress ${
                toast.type === 'error' ? 'bg-danger' : toast.type === 'success' ? 'bg-success' : 'bg-accent'
              }`}
            />

            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 -m-1 p-1 rounded-md text-faint hover:text-fg hover:bg-subtle transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
