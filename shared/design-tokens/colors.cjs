/**
 * Bayit+ Design System - Colors (CommonJS)
 * Shared between web and TV apps
 */

// Primary - Cyan/Teal (brand color)
const primary = {
  50: '#ecfeff',
  100: '#cffafe',
  200: '#a5f3fc',
  300: '#67e8f9',
  400: '#22d3ee',
  500: '#00d9ff',
  600: '#00a8c6',
  700: '#0e7490',
  800: '#155e75',
  900: '#164e63',
  950: '#083344',
  DEFAULT: '#00d9ff',
}

// Secondary - Purple
const secondary = {
  50: '#faf5ff',
  100: '#f3e8ff',
  200: '#e9d5ff',
  300: '#d8b4fe',
  400: '#c084fc',
  500: '#a855f7',
  600: '#8a2be2',
  700: '#7c3aed',
  800: '#6b21a8',
  900: '#581c87',
  950: '#3b0764',
  DEFAULT: '#8a2be2',
}

// Dark/Neutral
const dark = {
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
const success = {
  400: '#4ade80',
  500: '#10b981',
  600: '#059669',
  DEFAULT: '#10b981',
}

const warning = {
  400: '#fbbf24',
  500: '#f59e0b',
  600: '#d97706',
  DEFAULT: '#f59e0b',
}

const error = {
  400: '#f87171',
  500: '#ef4444',
  600: '#dc2626',
  DEFAULT: '#ef4444',
}

const live = '#ff4444'
const gold = '#ffd700'

const glass = {
  bg: 'rgba(26, 26, 46, 0.7)',
  bgLight: 'rgba(26, 26, 46, 0.5)',
  bgStrong: 'rgba(26, 26, 46, 0.85)',
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  borderFocus: 'rgba(0, 217, 255, 0.5)',
}

module.exports = {
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
