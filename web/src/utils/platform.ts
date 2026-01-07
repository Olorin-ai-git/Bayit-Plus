/**
 * Platform utilities for cross-platform code
 * Web app version - always web, never TV
 */
import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isTV = false; // Web app is not for TV
export const isMobile = false; // Web app runs in browser

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
  if (isWeb && options.web !== undefined) {
    return options.web;
  }
  return options.default;
}

export default {
  isWeb,
  isTV,
  isMobile,
  platformSelect,
};
