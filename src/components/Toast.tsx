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
            className="pointer-events-auto w-full sm:w-90 flex items-start gap-3 p-3.5 rounded-xl card shadow-(--shadow-lg) animate-toast-in"
          >
            <div className="shrink-0 mt-px">
              {toast.type === 'success' && <CheckCircle className="h-4.5 w-4.5 text-success" />}
              {toast.type === 'error' && <AlertTriangle className="h-4.5 w-4.5 text-danger" />}
              {toast.type === 'info' && <Info className="h-4.5 w-4.5 text-accent" />}
            </div>

            <p className="flex-1 text-[13px] leading-snug text-fg">{toast.message}</p>

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
