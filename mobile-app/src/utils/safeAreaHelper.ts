/**
 * Safe Area Handling Helper
 * Ensures all screens respect device safe areas (notches, status bars, bottom navigation)
 * Works with react-native-safe-area-context
 */

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

export interface SafeAreaDimensions {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface SafeAreaConfig {
  applyToTop: boolean;
  applyToBottom: boolean;
  applyToLeft: boolean;
  applyToRight: boolean;
  minPadding?: number;
}

/**
 * Hook to get current safe area insets
 * Usage: const insets = useSafeArea()
 */
export function useSafeArea(): SafeAreaDimensions {
  const insets = useSafeAreaInsets();
  return {
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
  };
}

/**
 * Get safe area padding for a specific configuration
 */
export function getSafeAreaPadding(config: SafeAreaConfig): { top?: number; bottom?: number; left?: number; right?: number } {
  const insets = useSafeAreaInsets();
  const padding: { top?: number; bottom?: number; left?: number; right?: number } = {};

  if (config.applyToTop) {
    padding.top = Math.max(insets.top, config.minPadding || 0);
  }
  if (config.applyToBottom) {
    padding.bottom = Math.max(insets.bottom, config.minPadding || 0);
  }
  if (config.applyToLeft) {
    padding.left = Math.max(insets.left, config.minPadding || 0);
  }
  if (config.applyToRight) {
    padding.right = Math.max(insets.right, config.minPadding || 0);
  }

  return padding;
}

/**
 * Standard safe area configurations
 */
export const SAFE_AREA_PRESETS = {
  // Full safe area (all sides)
  FULL: {
    applyToTop: true,
    applyToBottom: true,
    applyToLeft: true,
    applyToRight: true,
  } as SafeAreaConfig,

  // Horizontal only (sides)
  HORIZONTAL: {
    applyToTop: false,
    applyToBottom: false,
    applyToLeft: true,
    applyToRight: true,
  } as SafeAreaConfig,

  // Vertical only (top and bottom)
  VERTICAL: {
    applyToTop: true,
    applyToBottom: true,
    applyToLeft: false,
    applyToRight: false,
  } as SafeAreaConfig,

  // Top only (status bar)
  TOP: {
    applyToTop: true,
    applyToBottom: false,
    applyToLeft: false,
    applyToRight: false,
  } as SafeAreaConfig,

  // Bottom only (navigation bar/tab bar)
  BOTTOM: {
    applyToTop: false,
    applyToBottom: true,
    applyToLeft: false,
    applyToRight: false,
  } as SafeAreaConfig,

  // None (no safe area, content behind status bar)
  NONE: {
    applyToTop: false,
    applyToBottom: false,
    applyToLeft: false,
    applyToRight: false,
  } as SafeAreaConfig,
};

/**
 * Check if device has notch/safe area requirements
 */
export function hasNotch(): boolean {
  const insets = useSafeAreaInsets();
  return insets.top > (Platform.OS === 'android' ? 25 : 20) || insets.bottom > 0;
}

/**
 * Get safe area inset value
 */
export function getSafeAreaValue(position: 'top' | 'bottom' | 'left' | 'right'): number {
  const insets = useSafeAreaInsets();
  return insets[position];
}

/**
 * Create style object with safe area padding
 */
export function createSafeAreaStyle(config: SafeAreaConfig = SAFE_AREA_PRESETS.FULL) {
  const insets = useSafeAreaInsets();
  const padding: { paddingTop?: number; paddingBottom?: number; paddingLeft?: number; paddingRight?: number } = {};

  if (config.applyToTop) {
    padding.paddingTop = Math.max(insets.top, config.minPadding || 0);
  }
  if (config.applyToBottom) {
    padding.paddingBottom = Math.max(insets.bottom, config.minPadding || 0);
  }
  if (config.applyToLeft) {
    padding.paddingLeft = Math.max(insets.left, config.minPadding || 0);
  }
  if (config.applyToRight) {
    padding.paddingRight = Math.max(insets.right, config.minPadding || 0);
  }

  return padding;
}

/**
 * Platform-specific safe area handling
 */
export function getPlatformSafeArea(): SafeAreaDimensions {
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'android') {
    // Android includes notification bar in safe area
    return {
      top: Math.max(insets.top, 24), // Status bar min height
      bottom: insets.bottom,
      left: insets.left,
      right: insets.right,
    };
  } else if (Platform.OS === 'ios') {
    // iOS includes notch, face ID, home indicator
    return {
      top: insets.top,
      bottom: insets.bottom,
      left: insets.left,
      right: insets.right,
    };
  }

  return insets;
}
