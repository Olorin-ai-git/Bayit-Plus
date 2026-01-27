/**
 * Icon Styling Configuration
 * Defines glass background effects, shadows, and visual styling for icons
 * Used across all platforms: Web, iOS, tvOS, Android
 */

import type { GlassLevel } from './iconRegistry';

/**
 * Glass background effect definitions
 * Controls opacity, blur, and border styling for glassmorphic icon containers
 */
export const GLASS_EFFECTS: Record<GlassLevel, {
  backgroundColor: string;
  backdropFilter: string;
  borderColor: string;
  borderWidth: string;
  shadow: string;
  glow: string;
}> = {
  light: {
    backgroundColor: 'rgba(10, 10, 10, 0.5)',
    backdropFilter: 'blur(4px)',
    borderColor: 'rgba(126, 34, 206, 0.15)',
    borderWidth: '1px',
    shadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    glow: '0 0 16px rgba(126, 34, 206, 0.25)',
  },
  medium: {
    backgroundColor: 'rgba(10, 10, 10, 0.6)',
    backdropFilter: 'blur(8px)',
    borderColor: 'rgba(126, 34, 206, 0.25)',
    borderWidth: '1px',
    shadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
    glow: '0 0 24px rgba(126, 34, 206, 0.35)',
  },
  strong: {
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    backdropFilter: 'blur(12px)',
    borderColor: 'rgba(126, 34, 206, 0.7)',
    borderWidth: '1.5px',
    shadow: '0 16px 24px rgba(0, 0, 0, 0.3)',
    glow: '0 0 32px rgba(126, 34, 206, 0.5)',
  },
};

/**
 * Gradient presets for colored icon variants
 */
export const GRADIENT_PRESETS = {
  purple: 'linear-gradient(135deg, #7e22ce 0%, #86198f 100%)',
  glass: 'linear-gradient(135deg, rgba(10, 10, 10, 0.8) 0%, rgba(0, 0, 0, 0.8) 100%)',
} as const;

/**
 * Icon container sizing for different contexts
 * Used in both web (px) and native (absolute units)
 */
export const ICON_CONTAINER_SIZES = {
  sm: {
    padding: '8px',
    borderRadius: '8px',
    maxWidth: '40px',
    maxHeight: '40px',
  },
  md: {
    padding: '12px',
    borderRadius: '12px',
    maxWidth: '48px',
    maxHeight: '48px',
  },
  lg: {
    padding: '16px',
    borderRadius: '16px',
    maxWidth: '56px',
    maxHeight: '56px',
  },
  xl: {
    padding: '20px',
    borderRadius: '20px',
    maxWidth: '64px',
    maxHeight: '64px',
  },
} as const;

/**
 * Animation states for icons (hover, focus, active)
 */
export const ICON_ANIMATIONS = {
  web: {
    hover: 'opacity-80 scale-105 transition-all duration-200',
    focus: 'ring-2 ring-offset-2 ring-offset-transparent ring-purple-500 scale-110',
    active: 'opacity-100 scale-100',
  },
  native: {
    focusScale: 1.1,
    focusOpacity: 0.9,
    blurOpacity: 0.6,
  },
  tv: {
    focusScale: 1.15,
    focusGlowOpacity: 1,
    unfocusScale: 1.0,
    unfocusGlowOpacity: 0.6,
  },
} as const;

/**
 * Get glass effect styling for a given level
 */
export function getGlassEffectStyle(level: GlassLevel) {
  return GLASS_EFFECTS[level];
}

/**
 * Get glass background CSS for web platform
 */
export function getGlassBackgroundCSS(level: GlassLevel): string {
  const effect = GLASS_EFFECTS[level];
  return `
    background-color: ${effect.backgroundColor};
    backdrop-filter: ${effect.backdropFilter};
    border: ${effect.borderWidth} solid ${effect.borderColor};
    box-shadow: ${effect.shadow};
  `.trim();
}

/**
 * Get glow effect CSS for web platform
 */
export function getGlassGlowCSS(level: GlassLevel): string {
  return `box-shadow: ${GLASS_EFFECTS[level].glow};`;
}

/**
 * Get glass background inline styles for React/React Native
 */
export function getGlassBackgroundStyle(level: GlassLevel) {
  const effect = GLASS_EFFECTS[level];
  return {
    backgroundColor: effect.backgroundColor,
    borderColor: effect.borderColor,
    borderWidth: parseInt(effect.borderWidth),
  };
}

export default {
  GLASS_EFFECTS,
  GRADIENT_PRESETS,
  ICON_CONTAINER_SIZES,
  ICON_ANIMATIONS,
  getGlassEffectStyle,
  getGlassBackgroundCSS,
  getGlassGlowCSS,
  getGlassBackgroundStyle,
};
