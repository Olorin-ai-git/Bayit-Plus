/**
 * Mobile Theme System
 *
 * Central export for all theme values:
 * - Typography (mobile-optimized)
 * - Spacing (mobile-optimized with touch targets)
 * - Colors (from shared theme)
 * - Border radius, shadows, etc.
 */

export * from './typography';
export * from './spacing';

/**
 * Colors from shared theme
 * Import from shared if available, otherwise define here
 */
export const colors = {
  // Primary
  primary: '#00d9ff',
  primaryDark: '#00a8cc',
  primaryLight: '#33e2ff',

  // Background
  background: '#0d0d1a',
  backgroundLight: '#1a1a2e',
  backgroundElevated: '#252540',

  // Text
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  textDisabled: 'rgba(255, 255, 255, 0.3)',

  // Semantic
  success: '#00e676',
  error: '#ff3b30',
  warning: '#ffcc00',
  info: '#00d9ff',

  // Glass effects
  glassLight: 'rgba(255, 255, 255, 0.1)',
  glassMedium: 'rgba(255, 255, 255, 0.15)',
  glassDark: 'rgba(0, 0, 0, 0.3)',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayHeavy: 'rgba(0, 0, 0, 0.8)',
};

/**
 * Shadows
 */
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
};

/**
 * Z-index levels
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
};
