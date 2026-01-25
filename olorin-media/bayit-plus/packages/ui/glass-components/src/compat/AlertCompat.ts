/**
 * Alert.alert Compatibility Layer
 *
 * Drop-in replacement for React Native Alert.alert()
 * Redirects to GlassToast notification system.
 *
 * DEPRECATED: Use Notifications.show() instead.
 * This file will be removed after full migration.
 */

import { Notifications } from '../hooks/useNotifications';

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Alert.alert compatibility function
 *
 * @deprecated Use Notifications.show() instead
 */
export function alertCompat(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: { cancelable?: boolean }
): void {
  // Determine level based on title/message keywords
  const text = `${title} ${message || ''}`.toLowerCase();
  let level: 'error' | 'warning' | 'success' | 'info' = 'info';

  if (text.includes('error') || text.includes('failed') || text.includes('fail')) {
    level = 'error';
  } else if (text.includes('warning') || text.includes('caution')) {
    level = 'warning';
  } else if (text.includes('success') || text.includes('complete')) {
    level = 'success';
  }

  // Show notification
  Notifications.show({
    level,
    message: message || title,
    title: message ? title : undefined,
    dismissable: options?.cancelable ?? true,
    duration: level === 'error' ? 5000 : 3000,
    action: buttons && buttons.length > 0 && buttons[0].onPress
      ? {
          label: buttons[0].text || 'OK',
          type: 'dismiss',
          onPress: buttons[0].onPress,
        }
      : undefined,
  });
}

/**
 * Global Alert object for backward compatibility
 *
 * @deprecated Use Notifications API instead
 */
export const AlertCompat = {
  alert: alertCompat,
};
