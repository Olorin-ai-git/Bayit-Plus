/**
 * Bayit+ Design System - Colors
 * Shared between web and TV apps
 *
 * Usage:
 * - Web: Import into tailwind.config.js
 * - TV: Import into NativeWind config or theme
 */

// Primary - Cyan/Teal (brand color)
export const primary = {
  50: '#ecfeff',
  100: '#cffafe',
  200: '#a5f3fc',
  300: '#67e8f9',
  400: '#22d3ee',
  500: '#00d9ff',  // Main brand cyan
  600: '#00a8c6',
  700: '#0e7490',
  800: '#155e75',
  900: '#164e63',
  950: '#083344',
  DEFAULT: '#00d9ff',
}

// Secondary - Purple (accents, radio)
export const secondary = {
  50: '#faf5ff',
  100: '#f3e8ff',
  200: '#e9d5ff',
  300: '#d8b4fe',
  400: '#c084fc',
  500: '#a855f7',
  600: '#8a2be2',  // Main purple
  700: '#7c3aed',
  800: '#6b21a8',
  900: '#581c87',
  950: '#3b0764',
  DEFAULT: '#8a2be2',
}

// Dark/Neutral - Background shades
export const dark = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#0a0f1a',
  DEFAULT: '#0f172a',
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

// Glass effect colors (for rgba backgrounds)
export const glass = {
  bg: 'rgba(26, 26, 46, 0.7)',
  bgLight: 'rgba(26, 26, 46, 0.5)',
  bgStrong: 'rgba(26, 26, 46, 0.85)',
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  borderFocus: 'rgba(0, 217, 255, 0.5)',
}

// Gradients
export const gradients = {
  primary: 'linear-gradient(135deg, #00d9ff 0%, #8a2be2 100%)',
  dark: 'linear-gradient(135deg, #0f172a 0%, #0a0f1a 100%)',
  glass: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)',
}

// Export all colors for Tailwind
export default {
  primary,
  secondary,
  dark,
  success,
  warning,
  error,
  live,
  gold,
  glass,
}
