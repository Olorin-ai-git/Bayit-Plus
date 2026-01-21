/**
 * Bayit+ Design System - Colors (ES Module)
 * Unified Purple/Black Glassmorphic Theme
 * Shared across all platforms: web, mobile, TV, tvOS
 */

// Primary - Dark Purple (brand color for glassmorphic UI)
export const primary = {
  50: '#faf5ff',
  100: '#f3e8ff',
  200: '#e9d5ff',
  300: '#d8b4fe',
  400: '#c084fc',
  500: '#a855f7',
  600: '#9333ea',
  700: '#7e22ce',
  800: '#6b21a8',  // Dark purple
  900: '#581c87',  // Darker purple
  950: '#3b0764',  // Darkest purple
  DEFAULT: '#7e22ce',  // Changed to dark purple (700)
}

// Secondary - Deep Dark Purple (for accents and highlights)
export const secondary = {
  50: '#fdf4ff',
  100: '#fae8ff',
  200: '#f5d0fe',
  300: '#f0abfc',
  400: '#e879f9',
  500: '#d946ef',
  600: '#c026d3',
  700: '#a21caf',
  800: '#86198f',  // Dark magenta-purple
  900: '#701a75',  // Darker magenta-purple
  950: '#4a044e',  // Darkest magenta-purple
  DEFAULT: '#86198f',  // Changed to dark purple (800)
}

// Dark/Neutral - Pure blacks and grays for glassmorphic backgrounds
export const dark = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
  950: '#000000',  // Pure black for OLED
  DEFAULT: '#000000',
}

// Semantic colors
export const success = {
  400: '#4ade80',
  500: '#10b981',
  600: '#059669',
  DEFAULT: '#10b981',
}

export const warning = {
  400: '#fbbf24',
  500: '#f59e0b',
  600: '#d97706',
  DEFAULT: '#f59e0b',
}

export const error = {
  400: '#f87171',
  500: '#ef4444',
  600: '#dc2626',
  DEFAULT: '#ef4444',
}

// Special colors
export const live = '#ff4444'
export const gold = '#ffd700'

// Glass effect colors (for glassmorphic backgrounds with dark purple tints)
export const glass = {
  bg: 'rgba(10, 10, 10, 0.7)',  // Dark purple-tinted black
  bgLight: 'rgba(10, 10, 10, 0.5)',
  bgStrong: 'rgba(10, 10, 10, 0.85)',
  border: 'rgba(126, 34, 206, 0.25)',  // Dark purple border (primary 700)
  borderLight: 'rgba(126, 34, 206, 0.15)',
  borderFocus: 'rgba(126, 34, 206, 0.7)',  // Stronger dark purple for focus
  purpleLight: 'rgba(88, 28, 135, 0.35)',  // For dark purple-tinted glass backgrounds
  purpleStrong: 'rgba(88, 28, 135, 0.55)',
  purpleGlow: 'rgba(126, 34, 206, 0.35)',  // Dark purple glow effect
}

// Gradients
export const gradients = {
  primary: 'linear-gradient(135deg, #7e22ce 0%, #86198f 100%)',  // Dark purple gradient
  dark: 'linear-gradient(135deg, #0f172a 0%, #000000 100%)',
  glass: 'linear-gradient(135deg, rgba(10, 10, 10, 0.8) 0%, rgba(0, 0, 0, 0.8) 100%)',
}

// Shadows with dark purple glow
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.2)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.25)',
  glow: '0 0 20px rgba(126, 34, 206, 0.35)',  // Dark purple glow
  'glow-lg': '0 0 40px rgba(126, 34, 206, 0.5)',
  'glow-primary': '0 0 20px rgba(126, 34, 206, 0.35)',
  'glow-secondary': '0 0 20px rgba(134, 25, 143, 0.35)',
}
