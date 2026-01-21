/**
 * Bayit+ Design System - Design Tokens
 *
 * Shared design tokens for web and TV apps.
 * Ensures visual consistency across platforms.
 *
 * Usage:
 * - Web (Tailwind): Import into tailwind.config.js
 * - TV (NativeWind): Import into nativewind config
 * - Direct: Import specific tokens as needed
 */

export * from './colors.js'
export * from './spacing.js'
export * from './typography.js'
export * from './shadows.js'
export * from './animations.js'

import colors, { primary, secondary, dark, success, warning, error, glass } from './colors.js'
import spacing, { borderRadius } from './spacing.js'
import typography, { fontFamily, fontSize, fontSizeTV } from './typography.js'
import shadows, { boxShadow } from './shadows.js'
import animations, { keyframes, animation } from './animations.js'

// Complete theme object
export const theme = {
  colors: {
    primary,
    secondary,
    dark,
    success,
    warning,
    error,
    transparent: 'transparent',
    current: 'currentColor',
    white: '#ffffff',
    black: '#000000',
  },
  spacing: spacing.spacing,
  borderRadius,
  fontFamily,
  fontSize,
  fontSizeTV,
  boxShadow,
  keyframes,
  animation,

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
}

// Tailwind-ready config export
export const tailwindTheme = {
  colors: theme.colors,
  spacing: theme.spacing,
  borderRadius: theme.borderRadius,
  fontFamily: theme.fontFamily,
  boxShadow: theme.boxShadow,
  keyframes: theme.keyframes,
  animation: theme.animation,
}

export default theme
