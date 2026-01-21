/**
 * Bayit+ Design System - Typography (CommonJS)
 */

const fontFamily = {
  sans: ['Inter', 'Heebo', 'system-ui', 'sans-serif'],
  hebrew: ['Heebo', 'Inter', 'sans-serif'],
  mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
}

const fontSize = {
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

const fontSizeTV = {
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

const fontWeight = {
  thin: 100,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
}

const lineHeight = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
}

module.exports = {
  fontFamily,
  fontSize,
  fontSizeTV,
  fontWeight,
  lineHeight,
}
