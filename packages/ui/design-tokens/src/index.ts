/**
 * Olorin Design System - Design Tokens
 *
 * Unified design tokens for all Olorin platforms:
 * - Web apps (Tailwind CSS)
 * - Mobile apps (NativeWind)
 * - TV apps (tvOS, Android TV, WebOS, Tizen)
 * - Partner Portal
 *
 * Usage:
 * - Web (Tailwind): Import preset into tailwind.config.js
 * - React Native: Import tokens directly
 * - Direct: Import specific tokens as needed
 */

// Re-export all modules
export * from './colors';
export * from './spacing';
export * from './typography';
export * from './shadows';
export * from './animations';
export * from './adminButtonStyles';
export * from './touchTarget';
export * from './contentTypes';

// Import for composite objects
import {
  colors,
  primary,
  secondary,
  dark,
  success,
  warning,
  error,
  info,
  glass,
  gradients,
  live,
  gold,
} from './colors';

import { spacing, spacingAliases, borderRadius, extendedSpacing } from './spacing';

import {
  fontFamily,
  fontSize,
  fontSizeTV,
  fontWeight,
  lineHeight,
  letterSpacing,
  typography,
} from './typography';

import { touchTarget } from './touchTarget';

import { boxShadow, shadowRN, backdropBlur } from './shadows';

import {
  keyframes,
  animation,
  transitionTimingFunction,
  transitionDuration,
  transitionProperty,
} from './animations';

/**
 * Complete theme object for direct usage
 */
export const theme = {
  colors: {
    primary,
    secondary,
    dark,
    success,
    warning,
    error,
    info,
    transparent: 'transparent',
    current: 'currentColor',
    white: '#ffffff',
    black: '#000000',
  },
  spacing,
  spacingAliases,
  borderRadius,
  fontFamily,
  fontSize,
  fontSizeTV,
  fontWeight,
  lineHeight,
  letterSpacing,
  boxShadow,
  shadowRN,
  backdropBlur,
  keyframes,
  animation,
  transitionTimingFunction,
  transitionDuration,
  transitionProperty,
  // Glass-specific utilities
  glass: {
    bg: glass.bg,
    bgLight: glass.bgLight,
    bgStrong: glass.bgStrong,
    border: glass.border,
    borderLight: glass.borderLight,
    borderFocus: glass.borderFocus,
    blur: '16px',
    blurLight: '8px',
    blurStrong: '24px',
  },
  gradients,
  special: {
    live,
    gold,
  },
};

/**
 * Tailwind-ready theme configuration
 */
export const tailwindTheme = {
  colors: theme.colors,
  spacing: extendedSpacing,
  borderRadius: {
    sm: `${borderRadius.sm}px`,
    DEFAULT: `${borderRadius.DEFAULT}px`,
    md: `${borderRadius.md}px`,
    lg: `${borderRadius.lg}px`,
    xl: `${borderRadius.xl}px`,
    '2xl': `${borderRadius['2xl']}px`,
    full: `${borderRadius.full}px`,
  },
  fontFamily: theme.fontFamily,
  boxShadow: theme.boxShadow,
  backdropBlur: theme.backdropBlur,
  keyframes: theme.keyframes,
  animation: theme.animation,
  transitionTimingFunction: theme.transitionTimingFunction,
  transitionDuration: theme.transitionDuration,
};

/**
 * React Native specific theme
 */
export const reactNativeTheme = {
  colors: theme.colors,
  spacing: theme.spacing,
  borderRadius: theme.borderRadius,
  fontFamily: theme.fontFamily,
  fontSize: theme.fontSize,
  fontSizeTV: theme.fontSizeTV,
  fontWeight: theme.fontWeight,
  lineHeight: theme.lineHeight,
  typography: typography,
  touchTarget: touchTarget,
  shadowRN: theme.shadowRN,
  glass: theme.glass,
};

export default theme;
