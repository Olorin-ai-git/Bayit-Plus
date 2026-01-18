/**
 * Mobile Theme System
 *
 * Central export for all theme values:
 * - Typography (mobile-optimized)
 * - Spacing (mobile-optimized with touch targets)
 * - Colors (from shared design tokens)
 * - Border radius, shadows, etc.
 *
 * IMPORTANT: Colors are imported from shared design tokens for consistency
 * across web, mobile, and TV platforms.
 */

export * from './typography';
export * from './spacing';

// Import shared design tokens for color consistency
const {
  primary,
  secondary,
  dark,
  success,
  warning,
  error,
  glass,
  live,
} = require('@bayit/shared/design-tokens/colors.cjs');

/**
 * Colors - mapped from shared design tokens
 * Ensures consistency with web and TV apps
 */
export const colors = {
  // Primary - Dark Purple (brand color)
  primary: primary.DEFAULT,      // #7e22ce
  primaryDark: primary[800],     // #6b21a8
  primaryLight: primary[400],    // #c084fc

  // Secondary
  secondary: secondary.DEFAULT,  // #86198f
  secondaryDark: secondary[700], // #a21caf
  secondaryLight: secondary[400], // #e879f9

  // Background - Pure blacks for OLED optimization
  background: dark.DEFAULT,      // #000000
  backgroundLight: dark[900],    // #171717
  backgroundElevated: dark[800], // #262626

  // Text
  text: '#ffffff',
  textSecondary: dark[400],      // #a3a3a3
  textTertiary: dark[500],       // #737373
  textMuted: dark[500],          // #737373
  textDisabled: dark[600],       // #525252

  // Semantic colors
  success: success.DEFAULT,      // #10b981
  error: error.DEFAULT,          // #ef4444
  warning: warning.DEFAULT,      // #f59e0b
  info: primary.DEFAULT,         // #7e22ce

  // Glass effects - Dark purple-tinted (glassmorphism)
  glass: glass.bg,               // rgba(10, 10, 10, 0.7)
  glassLight: glass.bgLight,     // rgba(10, 10, 10, 0.5)
  glassStrong: glass.bgStrong,   // rgba(10, 10, 10, 0.85)
  glassBorder: glass.border,     // rgba(126, 34, 206, 0.25)
  glassBorderLight: glass.borderLight, // rgba(126, 34, 206, 0.15)
  glassBorderFocus: glass.borderFocus, // rgba(126, 34, 206, 0.7)

  // Purple glass variants
  glassPurple: glass.purpleLight,  // rgba(88, 28, 135, 0.35)
  glassPurpleStrong: glass.purpleStrong, // rgba(88, 28, 135, 0.55)
  glassPurpleGlow: glass.purpleGlow, // rgba(126, 34, 206, 0.35)

  // Special colors
  live: live,                    // #ff4444

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayHeavy: 'rgba(0, 0, 0, 0.8)',
};

/**
 * Shadows
 */
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
};

/**
 * Z-index levels
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
};
