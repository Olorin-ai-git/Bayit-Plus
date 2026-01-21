/**
 * Olorin Design System - Animations
 * Smooth animations for glassmorphic UI
 * Shared between web and TV apps
 */

export interface TimingFunctions {
  [key: string]: string;
  DEFAULT: string;
  linear: string;
  in: string;
  out: string;
  'in-out': string;
  bounce: string;
}

export interface DurationScale {
  [key: string]: string;
  75: string;
  100: string;
  150: string;
  200: string;
  300: string;
  500: string;
  700: string;
  1000: string;
  DEFAULT: string;
  fast: string;
  normal: string;
  slow: string;
}

export interface KeyframeDefinition {
  [key: string]: {
    transform?: string;
    opacity?: string;
    boxShadow?: string;
    backgroundPosition?: string;
  };
}

export interface Keyframes {
  [key: string]: KeyframeDefinition;
  slideUp: KeyframeDefinition;
  slideDown: KeyframeDefinition;
  slideLeft: KeyframeDefinition;
  slideRight: KeyframeDefinition;
  fadeIn: KeyframeDefinition;
  fadeOut: KeyframeDefinition;
  scaleIn: KeyframeDefinition;
  pulse: KeyframeDefinition;
  glowPulse: KeyframeDefinition;
  float: KeyframeDefinition;
  shimmer: KeyframeDefinition;
}

export interface AnimationPresets {
  [key: string]: string;
  'slide-up': string;
  'slide-down': string;
  'slide-left': string;
  'slide-right': string;
  'fade-in': string;
  'fade-out': string;
  'scale-in': string;
  'glow-pulse': string;
  float: string;
  shimmer: string;
}

/** Timing functions */
export const transitionTimingFunction: TimingFunctions = {
  DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

/** Durations */
export const transitionDuration: DurationScale = {
  75: '75ms',
  100: '100ms',
  150: '150ms',
  200: '200ms',
  300: '300ms',
  500: '500ms',
  700: '700ms',
  1000: '1000ms',
  DEFAULT: '200ms',
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
};

/** Keyframe animations for Tailwind */
export const keyframes: Keyframes = {
  slideUp: {
    '0%': { transform: 'translateY(10px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  slideDown: {
    '0%': { transform: 'translateY(-10px)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
  slideLeft: {
    '0%': { transform: 'translateX(10px)', opacity: '0' },
    '100%': { transform: 'translateX(0)', opacity: '1' },
  },
  slideRight: {
    '0%': { transform: 'translateX(-10px)', opacity: '0' },
    '100%': { transform: 'translateX(0)', opacity: '1' },
  },
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  fadeOut: {
    '0%': { opacity: '1' },
    '100%': { opacity: '0' },
  },
  scaleIn: {
    '0%': { transform: 'scale(0.95)', opacity: '0' },
    '100%': { transform: 'scale(1)', opacity: '1' },
  },
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },
  glowPulse: {
    '0%, 100%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)' },
    '50%': { boxShadow: '0 0 40px rgba(168, 85, 247, 0.5)' },
  },
  float: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-10px)' },
  },
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
};

/** Animation presets */
export const animation: AnimationPresets = {
  'slide-up': 'slideUp 0.3s ease-out',
  'slide-down': 'slideDown 0.3s ease-out',
  'slide-left': 'slideLeft 0.3s ease-out',
  'slide-right': 'slideRight 0.3s ease-out',
  'fade-in': 'fadeIn 0.3s ease-out',
  'fade-out': 'fadeOut 0.3s ease-out',
  'scale-in': 'scaleIn 0.2s ease-out',
  'glow-pulse': 'glowPulse 2s ease-in-out infinite',
  float: 'float 6s ease-in-out infinite',
  shimmer: 'shimmer 2s linear infinite',
};

/** Transition properties */
export const transitionProperty = {
  none: 'none',
  all: 'all',
  DEFAULT:
    'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter',
  colors: 'color, background-color, border-color, text-decoration-color, fill, stroke',
  opacity: 'opacity',
  shadow: 'box-shadow',
  transform: 'transform',
};

export default {
  transitionTimingFunction,
  transitionDuration,
  keyframes,
  animation,
  transitionProperty,
};
