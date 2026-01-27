/**
 * Glass UI Theme - TV Focus and Animation Constants
 *
 * Provides platform-specific focus styles and animation configurations
 * for tvOS, Android TV, and web platforms.
 */

import { Platform, Animated } from 'react-native';

/**
 * TV Focus Constants
 */
export const TV_FOCUS = {
  SCALE_FOCUSED: 1.05,
  SCALE_NORMAL: 1.0,
  DURATION_MS: 200,
  BORDER_WIDTH_FOCUSED: 3,
  BORDER_WIDTH_NORMAL: 1,
} as const;

/**
 * Spring Animation Configuration for Focus
 */
export const focusSpringConfig: Animated.SpringAnimationConfig = {
  toValue: TV_FOCUS.SCALE_FOCUSED,
  useNativeDriver: true,
  friction: 8,
  tension: 40,
};

/**
 * Spring Animation Configuration for Blur
 */
export const blurSpringConfig: Animated.SpringAnimationConfig = {
  toValue: TV_FOCUS.SCALE_NORMAL,
  useNativeDriver: true,
  friction: 8,
  tension: 40,
};

/**
 * Card Focused Style
 */
export const cardFocusedStyle = {
  borderWidth: TV_FOCUS.BORDER_WIDTH_FOCUSED,
  borderColor: 'rgba(96, 165, 250, 0.8)', // blue-400 with opacity
  shadowColor: '#3b82f6',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.5,
  shadowRadius: 8,
  elevation: 8,
} as const;

/**
 * Button Focused Style
 */
export const buttonFocusedStyle = {
  borderWidth: TV_FOCUS.BORDER_WIDTH_FOCUSED,
  borderColor: 'rgba(96, 165, 250, 1.0)', // blue-400
  backgroundColor: 'rgba(59, 130, 246, 0.2)', // blue-500 with low opacity
  shadowColor: '#3b82f6',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.4,
  shadowRadius: 6,
  elevation: 6,
} as const;

/**
 * Input Focused Style
 */
export const inputFocusedStyle = {
  borderWidth: 2,
  borderColor: 'rgba(96, 165, 250, 0.9)', // blue-400
  backgroundColor: 'rgba(59, 130, 246, 0.1)',
  shadowColor: '#3b82f6',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 4,
} as const;

/**
 * Web Outline Style (for web platform keyboard navigation)
 */
export const webOutlineStyle = Platform.OS === 'web' ? {
  outlineWidth: 2,
  outlineStyle: 'solid',
  outlineColor: '#3b82f6',
  outlineOffset: 2,
} as const : {};

/**
 * Re-export design tokens for convenience
 */
export * from '@olorin/design-tokens';

/**
 * Import specific items from design-tokens for direct export
 */
import {
  colors as designColors,
  spacing as designSpacing,
  spacingAliases,
  borderRadius as designBorderRadius,
  fontSize as designFontSize,
  boxShadow,
  shadowRN,
  glass as glassColors,
} from '@olorin/design-tokens';

/**
 * Extended colors object with convenience aliases for backwards compatibility
 */
export const colors = {
  ...designColors,
  // Override primary/secondary/semantic colors with their DEFAULT string values for direct use
  primary: designColors.primary.DEFAULT,
  secondary: designColors.secondary.DEFAULT,
  error: designColors.error.DEFAULT,
  success: designColors.success.DEFAULT,
  warning: designColors.warning.DEFAULT,
  info: designColors.info.DEFAULT,
  // Convenience aliases for GlassView component
  glassLight: glassColors.bgLight,
  glassMedium: glassColors.bgMedium,
  glass: glassColors.bg,
  glassStrong: glassColors.bgStrong,
  // Convenience aliases for GlassButton component
  primary700: designColors.primary[700],
  primary800: designColors.primary[800],
  glassPurpleLight: glassColors.purpleLight,
  glassPurpleStrong: glassColors.purpleStrong,
  glassBorder: glassColors.border,
  glassBorderLight: glassColors.borderLight,
  glassBorderFocus: glassColors.borderFocus,
  glassBorderWhite: 'rgba(255, 255, 255, 0.2)', // White glass border
  glassOverlay: 'rgba(0, 0, 0, 0.5)', // Glass overlay
  overlay: 'rgba(0, 0, 0, 0.75)', // Overlay/backdrop color
  background: glassColors.bg, // Background color
  backgroundLighter: glassColors.bgLight, // Lighter background
  text: '#ffffff', // Default text color
  textMuted: 'rgba(255, 255, 255, 0.6)', // Muted text color
  textSecondary: 'rgba(255, 255, 255, 0.8)', // Secondary text color
  primaryLight: designColors.primary[400],
};

/**
 * Shadows export for useGlassTheme
 */
export const shadows = {
  boxShadow,
  shadowRN,
};

/**
 * Extended spacing with aliases merged for convenience
 */
export const spacing = {
  ...designSpacing,
  ...spacingAliases, // Add sm, md, lg, xl, etc.
};

export const borderRadius = designBorderRadius;
export const fontSize = designFontSize;

/**
 * Complete glass theme configuration
 */
export const glassTheme = {
  colors,
  spacing,
  borderRadius,
  fontSize,
  shadows,
  glass: glassColors,
};
