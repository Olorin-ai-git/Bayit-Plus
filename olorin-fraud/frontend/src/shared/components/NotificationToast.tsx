/**
 * NotificationToast Component
 * Feature: 004-new-olorin-frontend
 *
 * Toast notification component with Olorin styling.
 * Supports success/error/warning/info types with auto-dismiss.
 */

import React, { useEffect } from 'react';
import { statusColors } from '@shared/styles/olorin-palette';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationToastProps {
  /** Notification type */
  type: NotificationType;
  /** Notification message */
  message: string;
  /** Optional detailed description */
  description?: string;
  /** Show/hide state */
  visible: boolean;
  /** Callback when dismissed */
  onDismiss: () => void;
  /** Auto-dismiss timeout in milliseconds (0 = no auto-dismiss, errors don't auto-dismiss) */
  autoHideDuration?: number;
}

/**
 * NotificationToast component
 */
export const NotificationToast: React.FC<NotificationToastProps> = ({
  type,
  message,
  description,
  visible,
  onDismiss,
  autoHideDuration = 5000
}) => {
  // Auto-dismiss (except for errors)
  useEffect(() => {
    if (visible && autoHideDuration > 0 && type !== 'error') {
      const timer = setTimeout(onDismiss, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [visible, autoHideDuration, type, onDismiss]);

  if (!visible) return null;

  const colors = statusColors[type];

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md ${colors.bg} ${colors.border} border-2 rounded-lg shadow-lg p-4 animate-slide-in-right`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className={colors.text}>{getIcon()}</div>

        <div className="flex-1">
          <h4 className={`font-semibold ${colors.text}`}>{message}</h4>
          {description && (
            <p className={`text-sm mt-1 ${colors.text} opacity-80`}>
              {description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className={`${colors.text} hover:opacity-70 transition-opacity`}
          aria-label="Dismiss notification"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
