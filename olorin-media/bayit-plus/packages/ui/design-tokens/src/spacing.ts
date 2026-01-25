/**
 * Olorin Design System - Spacing
 * Shared between web and TV apps
 */

export interface SpacingScale {
  px: number;
  0: number;
  0.5: number;
  1: number;
  1.5: number;
  2: number;
  2.5: number;
  3: number;
  3.5: number;
  4: number;
  5: number;
  6: number;
  7: number;
  8: number;
  9: number;
  10: number;
  11: number;
  12: number;
  14: number;
  16: number;
  18: number;
  20: number;
  24: number;
  28: number;
  32: number;
  36: number;
  40: number;
  44: number;
  48: number;
  // Named aliases (for convenience)
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

export interface SpacingAliases {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

export interface BorderRadiusScale {
  none: number;
  sm: number;
  DEFAULT: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  full: number;
}

/** Base spacing scale (in pixels for RN, rem for web via Tailwind) */
const baseSpacing = {
  px: 1,
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  18: 72,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
};

/** Spacing scale with named aliases */
export const spacing: SpacingScale = {
  ...baseSpacing,
  // Named aliases for convenience
  xs: 4,   // spacing[1]
  sm: 8,   // spacing[2]
  md: 16,  // spacing[4]
  lg: 24,  // spacing[6]
  xl: 32,  // spacing[8]
  '2xl': 48, // spacing[12]
};

/** Named spacing aliases */
export const spacingAliases: SpacingAliases = {
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[6],
  xl: spacing[8],
  '2xl': spacing[12],
};

/** Border radius values */
export const borderRadius: BorderRadiusScale = {
  none: 0,
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
};

/** Extended spacing for Tailwind */
export const extendedSpacing = {
  18: '4.5rem',
  88: '22rem',
  128: '32rem',
};

export default {
  spacing,
  spacingAliases,
  borderRadius,
  extendedSpacing,
};
