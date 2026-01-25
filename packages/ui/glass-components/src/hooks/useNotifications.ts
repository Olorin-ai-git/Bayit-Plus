/**
 * useNotifications Hook
 * Hook-based API for displaying notifications with i18n support
 */

import { useNotificationContext } from '../contexts/NotificationContext';
import { useNotificationStore } from '../stores/notificationStore';
import { sanitizeMessage } from '../utils/sanitization';
import type {
  NotificationOptions,
  I18nNotificationOptions,
} from '../native/components/GlassToast/types';

export const useNotifications = () => {
  const store = useNotificationStore();

  // i18n-aware notification methods
  const showWithI18n = (options: I18nNotificationOptions & NotificationOptions) => {
    // If using i18n keys, translation should be done by caller
    // This hook just provides the interface
    const message = options.message || '';
    const title = options.title;

    return store.add({
      ...options,
      message: sanitizeMessage(message),
      title,
    });
  };

  return {
    // Basic methods
    show: (options: NotificationOptions) => store.add(options),
    showDebug: (message: string, title?: string) =>
      store.add({ level: 'debug', message, title }),
    showInfo: (message: string, title?: string) =>
      store.add({ level: 'info', message, title }),
    showWarning: (message: string, title?: string) =>
      store.add({ level: 'warning', message, title }),
    showSuccess: (message: string, title?: string) =>
      store.add({ level: 'success', message, title }),
    showError: (message: string, title?: string) =>
      store.add({ level: 'error', message, title }),

    // i18n method
    showWithI18n,

    // Management
    dismiss: store.remove,
    clear: store.clear,
    clearByLevel: store.clearByLevel,

    // State access
    notifications: store.notifications,
  };
};

/**
 * Imperative API for use outside React components
 * Useful for error handlers, API interceptors, etc.
 */
export const Notifications = {
  show: (options: NotificationOptions): string => {
    return useNotificationStore.getState().add(options);
  },

  showDebug: (message: string, title?: string): string => {
    return useNotificationStore.getState().add({ level: 'debug', message, title });
  },

  showInfo: (message: string, title?: string): string => {
    return useNotificationStore.getState().add({ level: 'info', message, title });
  },

  showWarning: (message: string, title?: string): string => {
    return useNotificationStore.getState().add({ level: 'warning', message, title });
  },

  showSuccess: (message: string, title?: string): string => {
    return useNotificationStore.getState().add({ level: 'success', message, title });
  },

  showError: (message: string, title?: string): string => {
    return useNotificationStore.getState().add({ level: 'error', message, title });
  },

  dismiss: (id: string): void => {
    useNotificationStore.getState().remove(id);
  },

  clear: (): void => {
    useNotificationStore.getState().clear();
  },

  clearByLevel: (level: string): void => {
    useNotificationStore.getState().clearByLevel(level);
  },
};
