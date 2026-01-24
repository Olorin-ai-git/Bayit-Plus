/**
 * Bayit+ Web Theme Colors
 *
 * Centralized color system for consistent styling
 * Based on shared design tokens from /shared/theme
 */

export const colors = {
  // Primary - Purple (main brand color)
  primary: '#a855f7',
  primaryDark: '#7e22ce',
  primaryLight: '#c084fc',
  primaryLighter: '#d8b4fe',

  // Secondary - Deep Purple (accents)
  secondary: '#c026d3',
  secondaryDark: '#a21caf',
  secondaryLight: '#e879f9',

  // Backgrounds - Pure black with subtle variations
  background: '#000000',
  backgroundLight: '#0a0a0a',
  backgroundLighter: '#171717',
  backgroundElevated: '#262626',

  // Glass - Purple-tinted glassmorphic effects
  glass: 'rgba(10, 10, 10, 0.7)',
  glassLight: 'rgba(10, 10, 10, 0.5)',
  glassMedium: 'rgba(10, 10, 10, 0.6)',
  glassStrong: 'rgba(10, 10, 10, 0.85)',
  glassPurple: 'rgba(59, 7, 100, 0.4)',
  glassPurpleLight: 'rgba(107, 33, 168, 0.3)',

  // Glass Borders
  glassBorder: 'rgba(168, 85, 247, 0.2)',
  glassBorderLight: 'rgba(168, 85, 247, 0.1)',
  glassBorderStrong: 'rgba(168, 85, 247, 0.4)',
  glassBorderFocus: 'rgba(168, 85, 247, 0.6)',
  glassBorderWhite: 'rgba(255, 255, 255, 0.1)',

  // Glass Effects
  glassOverlay: 'rgba(0, 0, 0, 0.5)',
  glassOverlayStrong: 'rgba(0, 0, 0, 0.8)',
  glassOverlayPurple: 'rgba(59, 7, 100, 0.6)',
  glassGlow: 'rgba(168, 85, 247, 0.3)',
  glassGlowStrong: 'rgba(168, 85, 247, 0.5)',
  glassHighlight: 'rgba(216, 180, 254, 0.15)',

  // Text - White with varying opacity
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  textDimmed: 'rgba(255, 255, 255, 0.4)',
  textHint: 'rgba(255, 255, 255, 0.3)',

  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#a855f7',

  // Interactive states
  hover: 'rgba(255, 255, 255, 0.1)',
  focus: 'rgba(168, 85, 247, 0.5)',
  active: 'rgba(168, 85, 247, 0.3)',
  disabled: 'rgba(255, 255, 255, 0.2)',

  // Component-specific
  inputBackground: 'rgba(255, 255, 255, 0.1)',
  inputBackgroundFocus: 'rgba(255, 255, 255, 0.15)',
  inputBorder: 'transparent',
  inputBorderFocus: 'rgba(168, 85, 247, 0.5)',

  cardBackground: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.1)',
  cardHover: 'rgba(255, 255, 255, 0.08)',

  pillBackground: 'rgba(255, 255, 255, 0.1)',
  pillBorder: 'rgba(168, 85, 247, 0.3)',
  pillActive: 'rgba(168, 85, 247, 0.3)',
  pillActiveBorder: 'rgba(168, 85, 247, 0.5)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
