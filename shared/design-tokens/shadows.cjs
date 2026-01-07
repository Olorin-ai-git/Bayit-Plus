/**
 * Bayit+ Design System - Shadows (CommonJS)
 */

const boxShadow = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

  // Glass shadows
  glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.25)',
  'glass-lg': '0 16px 48px 0 rgba(0, 0, 0, 0.45)',

  // Glow effects
  glow: '0 0 20px rgba(0, 217, 255, 0.3)',
  'glow-lg': '0 0 40px rgba(0, 217, 255, 0.4)',
  'glow-primary': '0 0 20px rgba(0, 217, 255, 0.3)',
  'glow-secondary': '0 0 20px rgba(138, 43, 226, 0.3)',
  'glow-success': '0 0 20px rgba(16, 185, 129, 0.3)',
  'glow-error': '0 0 20px rgba(239, 68, 68, 0.3)',
  'glow-warning': '0 0 20px rgba(245, 158, 11, 0.3)',

  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  none: 'none',
}

const shadowRN = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.37,
    shadowRadius: 32,
    elevation: 8,
  },
}

module.exports = {
  boxShadow,
  shadowRN,
}
