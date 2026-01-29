/**
 * Expo Haptics Web Shim
 *
 * No-op implementation of expo-haptics for web builds.
 * Haptic feedback is only available on native iOS/Android.
 */

export const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
} as const;

export const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
} as const;

export const impactAsync = async (_style?: string): Promise<void> => {};

export const notificationAsync = async (_type?: string): Promise<void> => {};

export const selectionAsync = async (): Promise<void> => {};

export default {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  notificationAsync,
  selectionAsync,
};
