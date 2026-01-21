/**
 * Canonical Notification Types
 * SINGLE SOURCE OF TRUTH for all notification-related types
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

/**
 * Notification interface - used across all services
 * This is the ONLY notification type definition in the codebase
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
  timestamp: Date;
  isRead: boolean;
}
