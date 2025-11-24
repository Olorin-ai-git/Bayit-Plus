/**
 * useNotifications Hook
 *
 * Toast notification management with Event Bus integration.
 * Listens for notification events and displays toasts.
 */

import { useState, useCallback } from 'react';
import { useEventListener as useEventBusSubscription, useEventEmitter as useEventBusPublish } from '../events/UnifiedEventBus';
import type { Notification } from '../types/core/notification.types';

/**
 * Hook for managing notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const publish = useEventBusPublish();

  // Subscribe to notification events from event bus
  useEventBusSubscription('ui:notification', (event) => {
    addNotification(event.notification);
  });

  /**
   * Add notification
   */
  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [...prev, notification]);
  }, []);

  /**
   * Remove notification
   */
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  /**
   * Clear all notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Show success notification
   */
  const showSuccess = useCallback((message: string, title?: string, duration?: number) => {
    const notification: Notification = {
      id: `success-${Date.now()}`,
      type: 'success',
      title: title || 'Success',
      message,
      duration,
      timestamp: new Date(),
      isRead: false
    };
    publish('ui:notification', { notification });
  }, [publish]);

  /**
   * Show error notification
   */
  const showError = useCallback((message: string, title?: string, duration?: number) => {
    const notification: Notification = {
      id: `error-${Date.now()}`,
      type: 'error',
      title: title || 'Error',
      message,
      duration: duration ?? 0, // Errors don't auto-hide by default
      timestamp: new Date(),
      isRead: false
    };
    publish('ui:notification', { notification });
  }, [publish]);

  /**
   * Show warning notification
   */
  const showWarning = useCallback((message: string, title?: string, duration?: number) => {
    const notification: Notification = {
      id: `warning-${Date.now()}`,
      type: 'warning',
      title: title || 'Warning',
      message,
      duration,
      timestamp: new Date(),
      isRead: false
    };
    publish('ui:notification', { notification });
  }, [publish]);

  /**
   * Show info notification
   */
  const showInfo = useCallback((message: string, title?: string, duration?: number) => {
    const notification: Notification = {
      id: `info-${Date.now()}`,
      type: 'info',
      title: title || 'Info',
      message,
      duration,
      timestamp: new Date(),
      isRead: false
    };
    publish('ui:notification', { notification });
  }, [publish]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}
