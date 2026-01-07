/**
 * Shared platform utilities for cross-platform code
 */
import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isTV = Platform.isTV || false;
export const isMobile = !isWeb && !Platform.isTV;
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

/**
 * Platform-specific value selection
 */
export function platformSelect<T>(options: {
  web?: T;
  ios?: T;
  android?: T;
  tv?: T;
  default: T;
}): T {
  if (isTV && options.tv !== undefined) {
    return options.tv;
  }
  if (isWeb && options.web !== undefined) {
    return options.web;
  }
  if (isIOS && options.ios !== undefined) {
    return options.ios;
  }
  if (isAndroid && options.android !== undefined) {
    return options.android;
  }
  return options.default;
}

export default {
  isWeb,
  isTV,
  isMobile,
  isIOS,
  isAndroid,
  platformSelect,
};
