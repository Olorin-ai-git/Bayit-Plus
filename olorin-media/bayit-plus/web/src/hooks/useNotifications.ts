/**
 * useNotifications Hook (Web App)
 * Simple notification hook for admin pages
 */

import { useState, useCallback } from 'react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
}

let notificationId = 0;

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const show = useCallback((
    type: NotificationType,
    message: string,
    title?: string
  ) => {
    const id = `notification-${++notificationId}`;
    const notification: Notification = { id, type, message, title };

    setNotifications(prev => [...prev, notification]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);

    return id;
  }, []);

  const success = useCallback((message: string, title?: string) => {
    return show('success', message, title);
  }, [show]);

  const error = useCallback((message: string, title?: string) => {
    return show('error', message, title);
  }, [show]);

  const warning = useCallback((message: string, title?: string) => {
    return show('warning', message, title);
  }, [show]);

  const info = useCallback((message: string, title?: string) => {
    return show('info', message, title);
  }, [show]);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    show,
    success,
    error,
    warning,
    info,
    dismiss,
  };
};
