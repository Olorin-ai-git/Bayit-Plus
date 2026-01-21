/**
 * Bayit+ Design System - Typography
 * Shared between web and TV apps
 */

// Font families
export const fontFamily = {
  sans: ['Inter', 'Heebo', 'system-ui', 'sans-serif'],
  hebrew: ['Heebo', 'Inter', 'sans-serif'],
  mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
}

// Font sizes - Mobile/Web
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
}

// Font sizes - TV (10-foot UI, scaled up)
export const fontSizeTV = {
  xs: 14,
  sm: 16,
  base: 18,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 36,
  '4xl': 44,
  '5xl': 56,
  '6xl': 72,
}

// Font weights
export const fontWeight = {
  thin: 100,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
}

// Line heights
export const lineHeight = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
}

export default {
  fontFamily,
  fontSize,
  fontSizeTV,
  fontWeight,
  lineHeight,
}
