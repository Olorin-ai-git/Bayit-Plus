/**
 * Mobile Spacing System
 *
 * Spacing values optimized for mobile with tablet scaling
 * Ensures proper touch targets and visual hierarchy
 */

import { getSpacing } from '../utils/responsive';

/**
 * Spacing scale (base values in pixels)
 * Automatically scales 1.5x on tablets
 */
export const spacing = {
  xxs: getSpacing(2),
  xs: getSpacing(4),
  sm: getSpacing(8),
  md: getSpacing(12),
  lg: getSpacing(16),
  xl: getSpacing(24),
  xxl: getSpacing(32),
  xxxl: getSpacing(48),
  xxxxl: getSpacing(64),
};

/**
 * iOS Human Interface Guidelines touch target minimum
 * All interactive elements should be at least 44x44pt
 */
export const touchTarget = {
  minWidth: 44,
  minHeight: 44,
};

/**
 * Safe area insets
 * Use react-native-safe-area-context for actual values
 */
export const safeArea = {
  top: spacing.md,
  bottom: spacing.md,
  left: spacing.md,
  right: spacing.md,
};

/**
 * Border radius values
 */
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

/**
 * Common layout constants
 */
export const layout = {
  headerHeight: 56,
  tabBarHeight: 60,
  bottomSheetHandleHeight: 20,
  bottomSheetPadding: spacing.lg,
};
