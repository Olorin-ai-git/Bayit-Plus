/**
 * Safe Area Handling Helper
 * Ensures all screens respect device safe areas (notches, status bars, bottom navigation)
 * Works with react-native-safe-area-context
 */

import React from 'react';
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
 * Hook to get safe area padding for a specific configuration
 * This is a hook and must be called from within a React component
 */
export function useSafeAreaPadding(config: SafeAreaConfig): { top?: number; bottom?: number; left?: number; right?: number } {
  const insets = useSafeAreaInsets();

  return React.useMemo(() => {
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
  }, [insets, config]);
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
 * Hook to check if device has notch/safe area requirements
 * This is a hook and must be called from within a React component
 */
export function useHasNotch(): boolean {
  const insets = useSafeAreaInsets();

  return React.useMemo(() => {
    return insets.top > (Platform.OS === 'android' ? 25 : 20) || insets.bottom > 0;
  }, [insets.top, insets.bottom]);
}

/**
 * Hook to get safe area inset value for a specific position
 * This is a hook and must be called from within a React component
 */
export function useSafeAreaValue(position: 'top' | 'bottom' | 'left' | 'right'): number {
  const insets = useSafeAreaInsets();

  return React.useMemo(() => {
    return insets[position];
  }, [insets, position]);
}

/**
 * Hook to create style object with safe area padding
 * This is a hook and must be called from within a React component
 */
export function useSafeAreaStyle(config: SafeAreaConfig = SAFE_AREA_PRESETS.FULL) {
  const insets = useSafeAreaInsets();

  return React.useMemo(() => {
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
  }, [insets, config]);
}

/**
 * Hook for platform-specific safe area handling
 * This is a hook and must be called from within a React component
 */
export function usePlatformSafeArea(): SafeAreaDimensions {
  const insets = useSafeAreaInsets();

  return React.useMemo(() => {
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
  }, [insets]);
}
