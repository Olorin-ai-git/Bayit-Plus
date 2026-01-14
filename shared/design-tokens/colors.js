/**
 * Bayit+ Design System - Colors (ES Module)
 * Unified Purple/Black Glassmorphic Theme
 * Shared across all platforms: web, mobile, TV, tvOS
 */

// Primary - Purple (brand color for glassmorphic UI)
export const primary = {
  50: '#faf5ff',
  100: '#f3e8ff',
  200: '#e9d5ff',
  300: '#d8b4fe',
  400: '#c084fc',
  500: '#a855f7',  // Main purple
  600: '#9333ea',
  700: '#7e22ce',
  800: '#6b21a8',
  900: '#581c87',
  950: '#3b0764',
  DEFAULT: '#a855f7',
}

// Secondary - Deep Purple (for accents and highlights)
export const secondary = {
  50: '#fdf4ff',
  100: '#fae8ff',
  200: '#f5d0fe',
  300: '#f0abfc',
  400: '#e879f9',
  500: '#d946ef',
  600: '#c026d3',
  700: '#a21caf',
  800: '#86198f',
  900: '#701a75',
  950: '#4a044e',
  DEFAULT: '#c026d3',
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

// Glass effect colors (for glassmorphic backgrounds with purple tints)
export const glass = {
  bg: 'rgba(10, 10, 10, 0.7)',  // Purple-tinted black
  bgLight: 'rgba(10, 10, 10, 0.5)',
  bgStrong: 'rgba(10, 10, 10, 0.85)',
  border: 'rgba(168, 85, 247, 0.2)',  // Purple border
  borderLight: 'rgba(168, 85, 247, 0.1)',
  borderFocus: 'rgba(168, 85, 247, 0.6)',  // Stronger purple for focus
  purpleLight: 'rgba(107, 33, 168, 0.3)',  // For purple-tinted glass backgrounds
  purpleStrong: 'rgba(107, 33, 168, 0.5)',
  purpleGlow: 'rgba(168, 85, 247, 0.4)',  // Purple glow effect
}

// Gradients
export const gradients = {
  primary: 'linear-gradient(135deg, #a855f7 0%, #c026d3 100%)',  // Purple gradient
  dark: 'linear-gradient(135deg, #0f172a 0%, #000000 100%)',
  glass: 'linear-gradient(135deg, rgba(10, 10, 10, 0.8) 0%, rgba(0, 0, 0, 0.8) 100%)',
}

// Shadows with purple glow
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.2)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.25)',
  glow: '0 0 20px rgba(168, 85, 247, 0.3)',  // Purple glow
  'glow-lg': '0 0 40px rgba(168, 85, 247, 0.4)',
  'glow-primary': '0 0 20px rgba(168, 85, 247, 0.3)',
  'glow-secondary': '0 0 20px rgba(192, 38, 211, 0.3)',
}
