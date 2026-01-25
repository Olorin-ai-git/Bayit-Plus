/**
 * GlassToast Types
 * TypeScript definitions for the unified notification system
 */

export type NotificationLevel = 'debug' | 'info' | 'warning' | 'success' | 'error';

export type NotificationPosition = 'top' | 'bottom';

export type ActionType = 'navigate' | 'retry' | 'dismiss';

export interface NotificationAction {
  label: string;
  type: ActionType;
  onPress: () => void;
}

export interface Notification {
  id: string;
  level: NotificationLevel;
  message: string;
  title?: string;
  duration?: number;
  dismissable?: boolean;
  iconName?: string;
  action?: NotificationAction;
  createdAt: number;
  priority: number;
}

export interface NotificationOptions {
  level: NotificationLevel;
  message: string;
  title?: string;
  duration?: number;
  dismissable?: boolean;
  iconName?: string;
  action?: NotificationAction;
}

export interface I18nNotificationOptions extends Partial<NotificationOptions> {
  messageKey?: string;
  messageParams?: Record<string, string | number>;
  titleKey?: string;
  titleParams?: Record<string, string | number>;
  message?: string;
  title?: string;
}

export interface GlassToastProps {
  notification: Notification;
  position?: NotificationPosition;
  onDismiss: (id: string) => void;
}

export interface GlassToastContainerProps {
  position?: NotificationPosition;
  maxVisible?: number;
}
