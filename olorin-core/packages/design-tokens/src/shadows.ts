/**
 * Olorin Design System - Shadows
 * Glassmorphic shadows with purple glow effects
 * Shared between web and TV apps
 */

export interface BoxShadowScale {
  [key: string]: string;
  sm: string;
  DEFAULT: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  glass: string;
  'glass-sm': string;
  'glass-lg': string;
  glow: string;
  'glow-lg': string;
  'glow-primary': string;
  'glow-secondary': string;
  'glow-success': string;
  'glow-error': string;
  'glow-warning': string;
  inner: string;
  none: string;
}

export interface ShadowRN {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface ShadowRNScale {
  sm: ShadowRN;
  md: ShadowRN;
  lg: ShadowRN;
  glass: ShadowRN;
}

/** Box shadows for web (CSS strings) */
export const boxShadow: BoxShadowScale = {
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
  glow: '0 0 20px rgba(168, 85, 247, 0.3)',
  'glow-lg': '0 0 40px rgba(168, 85, 247, 0.4)',
  'glow-primary': '0 0 20px rgba(168, 85, 247, 0.3)',
  'glow-secondary': '0 0 20px rgba(192, 38, 211, 0.3)',
  'glow-success': '0 0 20px rgba(16, 185, 129, 0.3)',
  'glow-error': '0 0 20px rgba(239, 68, 68, 0.3)',
  'glow-warning': '0 0 20px rgba(245, 158, 11, 0.3)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  none: 'none',
};

/** Shadow for React Native (elevation + shadow props) */
export const shadowRN: ShadowRNScale = {
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
};

/** Backdrop blur values */
export const backdropBlur = {
  none: '0',
  xs: '4px',
  sm: '8px',
  DEFAULT: '12px',
  md: '16px',
  lg: '24px',
  xl: '40px',
  '2xl': '64px',
  glass: '16px',
  'glass-lg': '24px',
};

export default {
  boxShadow,
  shadowRN,
  backdropBlur,
};
