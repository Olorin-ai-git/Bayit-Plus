/**
 * Bayit+ Design System - Spacing
 * Shared between web and TV apps
 */

// Base spacing scale (in pixels for RN, rem for web via Tailwind)
export const spacing = {
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
}

// Named spacing aliases
export const spacingAliases = {
  xs: spacing[1],     // 4px
  sm: spacing[2],     // 8px
  md: spacing[4],     // 16px
  lg: spacing[6],     // 24px
  xl: spacing[8],     // 32px
  '2xl': spacing[12], // 48px
}

// Border radius
export const borderRadius = {
  none: 0,
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
}

export default {
  spacing,
  spacingAliases,
  borderRadius,
}
