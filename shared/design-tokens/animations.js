/**
 * Bayit+ Design System - Animations
 * Shared between web and TV apps
 */

// Timing functions
export const transitionTimingFunction = {
  DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
}

// Durations (in ms)
export const transitionDuration = {
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
}

// Keyframe animations for Tailwind
export const keyframes = {
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
    '0%, 100%': { boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)' },
    '50%': { boxShadow: '0 0 40px rgba(0, 217, 255, 0.5)' },
  },
  float: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-10px)' },
  },
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
}

// Animation presets
export const animation = {
  'slide-up': 'slideUp 0.3s ease-out',
  'slide-down': 'slideDown 0.3s ease-out',
  'slide-left': 'slideLeft 0.3s ease-out',
  'slide-right': 'slideRight 0.3s ease-out',
  'fade-in': 'fadeIn 0.3s ease-out',
  'fade-out': 'fadeOut 0.3s ease-out',
  'scale-in': 'scaleIn 0.2s ease-out',
  'glow-pulse': 'glowPulse 2s ease-in-out infinite',
  'float': 'float 6s ease-in-out infinite',
  'shimmer': 'shimmer 2s linear infinite',
}

export default {
  transitionTimingFunction,
  transitionDuration,
  keyframes,
  animation,
}
