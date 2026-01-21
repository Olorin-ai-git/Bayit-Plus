/**
 * Olorin Corporate Color Palette
 * Feature: 004-new-olorin-frontend
 *
 * Olorin corporate colors for investigation wizard.
 * MANDATORY: Use these exact colors for all wizard components.
 */

/**
 * Olorin Corporate Colors
 * Purple color palette for dark theme
 */
export const olorinColors = {
  // Backgrounds (Dark Theme - Purple)
  bgPrimary: '#1A0B2E',
  bgSecondary: '#2D1B4E',
  bgTertiary: '#3E2C5F',

  // Accent Colors (Purple Palette)
  accentPrimary: '#A855F7',
  accentPrimaryHover: '#9333EA',
  accentSecondary: '#C084FC',
  accentSecondaryHover: '#A855F7',

  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#818CF8',

  // Text Colors
  textPrimary: '#F9FAFB',
  textSecondary: '#D8B4FE',
  textTertiary: '#C084FC',
  textDisabled: '#7C3AED',

  // Border Colors
  borderPrimary: '#6B21A8',
  borderSecondary: '#7C3AED',
  borderAccent: '#A855F7'
} as const;

/**
 * Risk level color mappings
 */
export const riskColors = {
  critical: {
    bg: 'bg-red-900/30',
    text: 'text-red-400',
    border: 'border-red-500',
    hex: '#EF4444'
  },
  high: {
    bg: 'bg-amber-900/20',
    text: 'text-amber-400',
    border: 'border-amber-500',
    hex: '#F59E0B'
  },
  medium: {
    bg: 'bg-purple-900/30',
    text: 'text-purple-400',
    border: 'border-purple-500',
    hex: '#C084FC'
  },
  low: {
    bg: 'bg-gray-800/50',
    text: 'text-gray-400',
    border: 'border-gray-600',
    hex: '#6B7280'
  }
} as const;

/**
 * Status color mappings
 */
export const statusColors = {
  success: {
    bg: 'bg-green-900/20',
    text: 'text-green-300',
    border: 'border-green-500',
    hex: olorinColors.success
  },
  error: {
    bg: 'bg-red-900/20',
    text: 'text-red-300',
    border: 'border-red-500',
    hex: olorinColors.error
  },
  warning: {
    bg: 'bg-yellow-900/20',
    text: 'text-yellow-300',
    border: 'border-yellow-500',
    hex: olorinColors.warning
  },
  info: {
    bg: 'bg-blue-900/20',
    text: 'text-blue-300',
    border: 'border-blue-500',
    hex: olorinColors.info
  }
} as const;

/**
 * Interaction state classes
 */
export const interactionStates = {
  default: 'transition-all duration-200',
  hover: 'hover:brightness-110 hover:scale-105',
  active: 'active:scale-95',
  disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
  loading: 'animate-pulse'
} as const;

/**
 * Typography hierarchy classes
 */
export const typography = {
  h1: 'text-3xl font-bold text-corporate-textPrimary',
  h2: 'text-2xl font-semibold text-corporate-textPrimary',
  h3: 'text-xl font-medium text-corporate-textPrimary',
  body: 'text-base text-corporate-textSecondary',
  secondary: 'text-sm text-corporate-textTertiary',
  label: 'text-sm font-medium text-corporate-textPrimary'
} as const;

/**
 * Get risk color classes by score
 * @param score - Risk score (0-100)
 * @returns Risk color classes
 */
export function getRiskColorsByScore(score: number) {
  if (score >= 80) return riskColors.critical;
  if (score >= 60) return riskColors.high;
  if (score >= 40) return riskColors.medium;
  return riskColors.low;
}

/**
 * Get status color classes by type
 * @param type - Status type
 * @returns Status color classes
 */
export function getStatusColors(type: keyof typeof statusColors) {
  return statusColors[type];
}
