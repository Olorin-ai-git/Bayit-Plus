/**
 * Olorin Glass UI - Theme Configuration
 * Provides consistent theming for Glass components across platforms
 */

import {
  primary,
  secondary,
  dark,
  success,
  warning,
  error,
  info,
  glass,
  live,
  gold,
  type ColorScale,
  type SemanticColorScale,
  type GlassColors,
} from '@olorin/design-tokens/colors';

import {
  spacing as sharedSpacing,
  borderRadius as sharedBorderRadius,
  type SpacingScale,
  type BorderRadiusScale,
} from '@olorin/design-tokens/spacing';

import { fontSizeTV, fontFamily, fontWeight, lineHeight } from '@olorin/design-tokens/typography';

import { shadowRN, boxShadow, backdropBlur } from '@olorin/design-tokens/shadows';

/**
 * Glass UI Colors - mapped from design tokens
 */
export const colors = {
  // Primary brand color
  primary: primary.DEFAULT,
  primaryDark: primary[700],
  primaryLight: primary[300],
  primary50: primary[50],
  primary100: primary[100],
  primary200: primary[200],
  primary300: primary[300],
  primary400: primary[400],
  primary500: primary[500],
  primary600: primary[600],
  primary700: primary[700],
  primary800: primary[800],
  primary900: primary[900],
  primary950: primary[950],

  // Secondary (purple for accents)
  secondary: secondary.DEFAULT,
  secondaryDark: secondary[700],
  secondaryLight: secondary[400],

  // Backgrounds (dark theme)
  background: dark[950],
  backgroundLight: dark[900],
  backgroundLighter: dark[800],

  // Glass effects
  glass: glass.bg,
  glassLight: glass.bgLight,
  glassMedium: glass.bgMedium,
  glassStrong: glass.bgStrong,
  glassBorder: glass.border,
  glassBorderLight: glass.borderLight,
  glassBorderFocus: glass.borderFocus,
  glassBorderWhite: 'rgba(255, 255, 255, 0.1)',
  glassPurpleLight: glass.purpleLight,
  glassPurpleStrong: glass.purpleStrong,
  glassPurpleGlow: glass.purpleGlow,
  glassOverlay: 'rgba(0, 0, 0, 0.5)',

  // Text
  text: '#ffffff',
  textSecondary: dark[400],
  textMuted: dark[500],

  // Semantic
  success: success.DEFAULT,
  warning: warning.DEFAULT,
  error: error.DEFAULT,
  info: info.DEFAULT,
  live: live,
  gold: gold,

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayDark: 'rgba(0, 0, 0, 0.8)',

  // Utility
  transparent: 'transparent',
  white: '#ffffff',
  black: '#000000',
};

/**
 * Spacing scale for Glass UI
 */
export const spacing = {
  xs: sharedSpacing[1], // 4
  sm: sharedSpacing[2], // 8
  md: sharedSpacing[4], // 16
  lg: sharedSpacing[6], // 24
  xl: sharedSpacing[8], // 32
  xxl: sharedSpacing[12], // 48
  ...sharedSpacing,
};

/**
 * Border radius scale for Glass UI
 */
export const borderRadius = {
  ...sharedBorderRadius,
};

/**
 * Font sizes - TV-optimized by default
 */
export const fontSize = fontSizeTV;

/**
 * Shadows for React Native
 */
export const shadows = {
  sm: shadowRN.sm,
  md: shadowRN.md,
  lg: shadowRN.lg,
  glass: shadowRN.glass,
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  }),
};

/**
 * TV Focus configuration
 */
export const TV_FOCUS = {
  SCALE_FOCUSED: 1.05,
  SCALE_UNFOCUSED: 1.0,
  BORDER_WIDTH_FOCUSED: 3,
  BORDER_COLOR_FOCUSED: colors.primary,
  GLOW_COLOR: colors.primary,
  ANIMATION_DURATION: 200,
};

/**
 * Spring configuration for focus animations
 */
export const focusSpringConfig = {
  toValue: TV_FOCUS.SCALE_FOCUSED,
  friction: 5,
  tension: 100,
  useNativeDriver: true,
};

export const blurSpringConfig = {
  toValue: TV_FOCUS.SCALE_UNFOCUSED,
  friction: 5,
  tension: 100,
  useNativeDriver: true,
};

/**
 * Focus styles for different component types
 */
export const cardFocusedStyle = {
  borderWidth: TV_FOCUS.BORDER_WIDTH_FOCUSED,
  borderColor: TV_FOCUS.BORDER_COLOR_FOCUSED,
  ...shadows.glow(TV_FOCUS.GLOW_COLOR),
};

export const buttonFocusedStyle = {
  borderWidth: 2,
  borderColor: TV_FOCUS.BORDER_COLOR_FOCUSED,
  ...shadows.glow(TV_FOCUS.GLOW_COLOR),
};

export const inputFocusedStyle = {
  borderWidth: 2,
  borderColor: TV_FOCUS.BORDER_COLOR_FOCUSED,
};

export const webOutlineStyle = {
  outline: `2px solid ${TV_FOCUS.BORDER_COLOR_FOCUSED}`,
  outlineOffset: 2,
};

/**
 * Complete Glass theme object
 */
export const glassTheme = {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontFamily,
  fontWeight,
  lineHeight,
  shadows,
  boxShadow,
  backdropBlur,
  focus: {
    TV_FOCUS,
    focusSpringConfig,
    blurSpringConfig,
    cardFocusedStyle,
    buttonFocusedStyle,
    inputFocusedStyle,
    webOutlineStyle,
  },
};

export default glassTheme;

// Re-export design tokens for convenience
export { fontFamily, fontWeight, lineHeight, boxShadow, backdropBlur };
