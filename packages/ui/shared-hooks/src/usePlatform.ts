/**
 * usePlatform Hook
 *
 * Provides platform detection utilities for cross-platform apps.
 * Detects iOS, Android, Web, TV, and specific TV platforms.
 */

import { useMemo } from 'react';
import { Platform } from 'react-native';

export interface PlatformInfo {
  /** Current platform OS */
  os: 'ios' | 'android' | 'web' | 'windows' | 'macos';
  /** Is running on iOS */
  isIOS: boolean;
  /** Is running on Android */
  isAndroid: boolean;
  /** Is running on Web */
  isWeb: boolean;
  /** Is running on a TV platform */
  isTV: boolean;
  /** Is running on Apple TV (tvOS) */
  isTVOS: boolean;
  /** Is running on Android TV */
  isAndroidTV: boolean;
  /** Is running on Samsung Tizen */
  isTizen: boolean;
  /** Is running on LG webOS */
  isWebOS: boolean;
  /** Is running on mobile (phone or tablet) */
  isMobile: boolean;
  /** Platform version */
  version: string | number | undefined;
  /** Is running in development mode */
  isDev: boolean;
}

/**
 * Detect if running on Tizen (Samsung TV)
 */
const detectTizen = (): boolean => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // @ts-expect-error - Tizen API may not be typed
    return typeof window.tizen !== 'undefined';
  }
  return false;
};

/**
 * Detect if running on webOS (LG TV)
 */
const detectWebOS = (): boolean => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // @ts-expect-error - webOS API may not be typed
    return typeof window.webOS !== 'undefined' || typeof window.PalmSystem !== 'undefined';
  }
  return false;
};

/**
 * usePlatform Hook
 *
 * Provides comprehensive platform detection for cross-platform apps.
 *
 * @returns Platform information object
 *
 * @example
 * ```tsx
 * const { isTV, isIOS, isMobile } = usePlatform();
 *
 * if (isTV) {
 *   // TV-specific rendering
 * } else if (isMobile) {
 *   // Mobile-specific rendering
 * }
 * ```
 */
export function usePlatform(): PlatformInfo {
  return useMemo(() => {
    const os = Platform.OS as PlatformInfo['os'];
    const isIOS = os === 'ios';
    const isAndroid = os === 'android';
    const isWeb = os === 'web';

    // TV detection
    const isNativeTV = Platform.isTV;
    const isTizen = detectTizen();
    const isWebOS = detectWebOS();
    const isTV = isNativeTV || isTizen || isWebOS;

    // Specific TV platform detection
    const isTVOS = isIOS && isNativeTV;
    const isAndroidTV = isAndroid && isNativeTV;

    // Mobile detection (not TV, not desktop web)
    const isMobile = !isTV && (isIOS || isAndroid);

    return {
      os,
      isIOS,
      isAndroid,
      isWeb,
      isTV,
      isTVOS,
      isAndroidTV,
      isTizen,
      isWebOS,
      isMobile,
      version: Platform.Version,
      isDev: __DEV__,
    };
  }, []);
}

/**
 * Get platform-specific value
 *
 * @param values - Object with platform-specific values
 * @returns Value for the current platform
 *
 * @example
 * ```tsx
 * const spacing = usePlatformValue({
 *   ios: 16,
 *   android: 12,
 *   tv: 48,
 *   web: 24,
 *   default: 16,
 * });
 * ```
 */
export function usePlatformValue<T>(
  values: Partial<{
    ios: T;
    android: T;
    web: T;
    tv: T;
    tvos: T;
    androidtv: T;
    tizen: T;
    webos: T;
    mobile: T;
    default: T;
  }>
): T {
  const platform = usePlatform();

  // Check specific platforms first
  if (platform.isTizen && values.tizen !== undefined) return values.tizen;
  if (platform.isWebOS && values.webos !== undefined) return values.webos;
  if (platform.isTVOS && values.tvos !== undefined) return values.tvos;
  if (platform.isAndroidTV && values.androidtv !== undefined) return values.androidtv;

  // Check general platforms
  if (platform.isTV && values.tv !== undefined) return values.tv;
  if (platform.isMobile && values.mobile !== undefined) return values.mobile;
  if (platform.isIOS && values.ios !== undefined) return values.ios;
  if (platform.isAndroid && values.android !== undefined) return values.android;
  if (platform.isWeb && values.web !== undefined) return values.web;

  // Fallback to default
  return values.default!;
}

export default usePlatform;
