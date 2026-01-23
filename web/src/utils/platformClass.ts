/**
 * Platform-aware className utility for cross-platform compatibility
 *
 * React Native Web supports className via react-native-web, but not all
 * Tailwind utilities work on native platforms (iOS, Android, tvOS).
 *
 * This utility filters out web-only utilities when rendering on native platforms.
 *
 * @module platformClass
 */

import { Platform } from 'react-native';

/**
 * Web-only Tailwind utilities that don't work on React Native
 * These will be filtered out when Platform.OS !== 'web'
 */
const WEB_ONLY_PATTERNS = [
  /^cursor-/,           // cursor-pointer, cursor-ns-resize, etc.
  /^hover:/,            // hover:bg-purple-500, hover:scale-105, etc.
  /backdrop-blur/,      // backdrop-blur-xl, backdrop-blur-lg, etc.
  /^select-/,           // select-none, select-text, etc.
  /^pointer-events-/,   // pointer-events-none, pointer-events-auto
  /^scroll-/,           // scroll-smooth, scroll-auto, etc.
  /^snap-/,             // snap-start, snap-center, etc.
  /^will-change-/,      // will-change-transform, etc.
  /^appearance-/,       // appearance-none
  /^outline-offset-/,   // outline-offset-2, etc.
];

/**
 * Check if a className utility is web-only
 */
function isWebOnlyUtility(className: string): boolean {
  return WEB_ONLY_PATTERNS.some(pattern => pattern.test(className));
}

/**
 * Filter className string to remove web-only utilities for native platforms
 *
 * @param className - Space-separated className string
 * @returns Filtered className string safe for native platforms
 */
export function filterNativeCompatibleClasses(className: string): string {
  if (Platform.OS === 'web') {
    return className; // No filtering needed on web
  }

  return className
    .split(' ')
    .filter(cls => !isWebOnlyUtility(cls))
    .join(' ');
}

/**
 * Platform-aware className utility
 *
 * @example
 * import { platformClass } from '@/utils/platformClass';
 *
 * // Simple usage (auto-filters for native)
 * <View className={platformClass('hover:bg-purple-500 cursor-pointer backdrop-blur-xl')} />
 * // On web: 'hover:bg-purple-500 cursor-pointer backdrop-blur-xl'
 * // On iOS/Android: '' (all filtered out)
 *
 * // With native fallback
 * <View className={platformClass(
 *   'hover:bg-purple-500/20 cursor-pointer backdrop-blur-xl',
 *   'bg-purple-500/20'
 * )} />
 * // On web: 'hover:bg-purple-500/20 cursor-pointer backdrop-blur-xl'
 * // On iOS/Android: 'bg-purple-500/20'
 *
 * @param webClass - Full className string with web utilities
 * @param nativeClass - Optional native-safe fallback className
 * @returns Platform-appropriate className string
 */
export function platformClass(
  webClass: string,
  nativeClass?: string
): string {
  if (Platform.OS === 'web') {
    return webClass;
  }

  // Use explicit native fallback if provided
  if (nativeClass !== undefined) {
    return nativeClass;
  }

  // Otherwise filter out web-only utilities from webClass
  return filterNativeCompatibleClasses(webClass);
}

/**
 * Platform-specific style object for dynamic values
 *
 * Usage:
 * @example
 * <View
 *   className={platformClass('w-full')}
 *   style={platformStyle({
 *     web: { cursor: isDragging ? 'grabbing' : 'grab' },
 *     ios: { },
 *     android: { },
 *   })}
 * />
 */
export function platformStyle(styles: {
  web?: Record<string, any>;
  ios?: Record<string, any>;
  android?: Record<string, any>;
  native?: Record<string, any>;  // Fallback for both iOS and Android
}): Record<string, any> | undefined {
  if (Platform.OS === 'web') {
    return styles.web;
  }

  if (Platform.OS === 'ios') {
    return styles.ios || styles.native;
  }

  if (Platform.OS === 'android') {
    return styles.android || styles.native;
  }

  return styles.native;
}

/**
 * Check if current platform is TV (tvOS or Android TV)
 */
export const isTV = Platform.isTV || false;

/**
 * Get platform-specific size for touch targets
 *
 * iOS: 44x44pt minimum (iOS HIG)
 * Android: 48x48dp minimum (Material Design)
 * Web: Can be smaller (mouse precision)
 * TV: 60x60pt minimum (10-foot UI)
 *
 * @param webSize - Size in pixels for web
 * @returns Tailwind className for platform-appropriate size
 */
export function getPlatformTouchSize(webSize: number = 32): string {
  if (isTV) {
    return 'w-[60px] h-[60px]';  // TV 10-foot UI
  }

  return Platform.select({
    ios: 'w-11 h-11',      // 44px (iOS HIG minimum)
    android: 'w-12 h-12',  // 48px (Material Design minimum)
    web: `w-${webSize} h-${webSize}`,
  }) || 'w-11 h-11';  // Fallback to iOS size
}

/**
 * Platform detection utilities
 */
export const PlatformUtils = {
  isWeb: Platform.OS === 'web',
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  isTV,
  isMobile: Platform.OS === 'ios' || Platform.OS === 'android',
} as const;
