/**
 * ToastProvider Component - Provides shared toast state
 * All components using useToast will share the same toast state
 * Integrated with UnifiedEventBus for global API error notifications
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Toast } from './Toast';
import { eventBusInstance } from '@shared/events/UnifiedEventBus';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
}

interface ToastContextType {
  showToast: (variant: ToastVariant, title: string | undefined, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (variant: ToastVariant, title: string | undefined, message: string) => {
      const id = Math.random().toString(36).substr(2, 9);
      const toast: ToastMessage = { id, variant, title, message };
      setToasts((prev) => [...prev, toast]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen to event bus for UI notifications (including API errors)
  useEffect(() => {
    const handleNotification = (event: {
      notification: {
        id: string;
        type: 'info' | 'success' | 'warning' | 'error';
        title?: string;
        message: string;
        duration?: number;
      };
    }) => {
      const { id, type, title, message, duration } = event.notification;
      const toast: ToastMessage = { id, variant: type, title, message };
      setToasts((prev) => [...prev, toast]);

      // Auto-remove based on duration or default 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration || 5000);
    };

    eventBusInstance.on('ui:notification:show', handleNotification);

    return () => {
      eventBusInstance.off('ui:notification:show', handleNotification);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              id={toast.id}
              variant={toast.variant}
              title={toast.title}
              message={toast.message}
              onClose={() => removeToast(toast.id)}
              autoHide={true}
              duration={5000}
            />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};



