/**
 * Bayit+ Shared Theme
 * Uses shared design tokens for consistency between web and TV apps
 */

// Import shared design tokens
const {
  primary,
  secondary,
  dark,
  success,
  warning,
  error,
  glass,
  live,
  gold,
} = require('../design-tokens/colors.cjs');
const {
  spacing: sharedSpacing,
  borderRadius: sharedBorderRadius,
} = require('../design-tokens/spacing.cjs');
const { fontSizeTV } = require('../design-tokens/typography.cjs');
const { boxShadow, shadowRN } = require('../design-tokens/shadows.cjs');

// Colors - mapped from shared tokens
export const colors = {
  // Primary
  primary: primary.DEFAULT,
  primaryDark: primary[700],
  primaryLight: primary[300],

  // Secondary (purple for radio/accents)
  secondary: secondary.DEFAULT,
  secondaryDark: secondary[700],
  secondaryLight: secondary[400],

  // Backgrounds
  background: dark[950],
  backgroundLight: dark[900],
  backgroundLighter: dark[800],

  // Glass
  glass: glass.bg,
  glassLight: glass.bgLight,
  glassStrong: glass.bgStrong,
  glassBorder: glass.border,
  glassBorderLight: glass.borderLight,
  glassBorderFocus: glass.borderFocus,

  // Text
  text: '#ffffff',
  textSecondary: dark[400],
  textMuted: dark[500],

  // Status
  success: success.DEFAULT,
  warning: warning.DEFAULT,
  error: error.DEFAULT,
  live: live,

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayDark: 'rgba(0, 0, 0, 0.8)',
};

// Spacing - from shared tokens
export const spacing = {
  xs: sharedSpacing[1],    // 4
  sm: sharedSpacing[2],    // 8
  md: sharedSpacing[4],    // 16
  lg: sharedSpacing[6],    // 24
  xl: sharedSpacing[8],    // 32
  xxl: sharedSpacing[12],  // 48
};

// Border radius - from shared tokens
export const borderRadius = {
  sm: sharedBorderRadius.sm,
  md: sharedBorderRadius.md,
  lg: sharedBorderRadius.lg,
  xl: sharedBorderRadius.xl,
  full: sharedBorderRadius.full,
};

// Font sizes - TV-optimized from shared tokens
export const fontSize = fontSizeTV;

// TV-specific sizing (larger for 10-foot UI)
export const tvFontSize = fontSizeTV;

// Shadows - from shared tokens
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

// Re-export for convenience
export { boxShadow };
