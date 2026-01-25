/**
 * NotificationContext
 * React Context provider for notification system
 */

import React, { createContext, useContext, type ReactNode } from 'react';
import { GlassToastContainer } from '../native/components/GlassToastContainer';
import { useNotificationStore } from '../stores/notificationStore';
import { sanitizeMessage, validateAction } from '../utils/sanitization';
import type {
  NotificationOptions,
  NotificationPosition,
} from '../native/components/GlassToast/types';

interface NotificationContextValue {
  show: (options: NotificationOptions) => string;
  showDebug: (message: string, title?: string) => string;
  showInfo: (message: string, title?: string) => string;
  showWarning: (message: string, title?: string) => string;
  showSuccess: (message: string, title?: string) => string;
  showError: (message: string, title?: string) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
  position?: NotificationPosition;
  maxVisible?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  position = 'bottom',
  maxVisible = 3,
}) => {
  const { add, remove, clear } = useNotificationStore();

  const show = (options: NotificationOptions): string => {
    // Sanitize message
    const sanitizedMessage = sanitizeMessage(options.message);

    // Validate action if provided
    if (options.action && !validateAction(options.action)) {
      console.warn('[NotificationProvider] Invalid action provided, ignoring');
      options.action = undefined;
    }

    return add({
      ...options,
      message: sanitizedMessage,
    });
  };

  const showDebug = (message: string, title?: string): string => {
    return show({ level: 'debug', message, title });
  };

  const showInfo = (message: string, title?: string): string => {
    return show({ level: 'info', message, title });
  };

  const showWarning = (message: string, title?: string): string => {
    return show({ level: 'warning', message, title });
  };

  const showSuccess = (message: string, title?: string): string => {
    return show({ level: 'success', message, title });
  };

  const showError = (message: string, title?: string): string => {
    return show({ level: 'error', message, title });
  };

  const value: NotificationContextValue = {
    show,
    showDebug,
    showInfo,
    showWarning,
    showSuccess,
    showError,
    dismiss: remove,
    clear,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <GlassToastContainer position={position} maxVisible={maxVisible} />
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotificationContext must be used within NotificationProvider'
    );
  }
  return context;
};

export default NotificationProvider;
