import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isTV = Platform.isTV;
export const isMobile = !isWeb && !Platform.isTV;
export const isAndroidTV = Platform.OS === 'android' && Platform.isTV;
export const isTVOS = Platform.OS === 'ios' && Platform.isTV;

// Check if device supports blur effects
export const supportsBlur = isWeb || isIOS;

// Get platform-specific value
export function platformSelect<T>(options: {
  web?: T;
  ios?: T;
  android?: T;
  tv?: T;
  tvos?: T;
  default: T;
}): T {
  if (isTVOS && options.tvos !== undefined) return options.tvos;
  if (isTV && options.tv !== undefined) return options.tv;
  if (isWeb && options.web !== undefined) return options.web;
  if (isIOS && options.ios !== undefined) return options.ios;
  if (isAndroid && options.android !== undefined) return options.android;
  return options.default;
}
