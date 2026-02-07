/**
 * Icon Color Theme Mapping
 * Maps icons to brand colors with glassmorphic styling configuration
 * Integrates with Olorin Design Tokens for color consistency
 */

import type { IconStyling, GlassLevel } from './iconRegistry';

/**
 * Color palette from Olorin Design Tokens
 * Primary brand color: Purple (#7e22ce)
 */
const COLORS = {
  primary: '#7e22ce',      // Main brand purple
  secondary: '#86198f',     // Deep purple accent
  success: '#10b981',       // Green
  warning: '#f59e0b',       // Amber
  error: '#ef4444',         // Red
  info: '#3b82f6',          // Blue
  gold: '#fbbf24',          // Gold
} as const;

/**
 * Icon color theme mapping
 * Each icon name maps to color, glass level, and optional gradient
 */
export const ICON_COLOR_THEME: Record<string, IconStyling> = {
  // Navigation - Primary icons
  home: {
    defaultColor: COLORS.primary,
    glassLevel: 'medium',
    backgroundColor: 'rgba(126, 34, 206, 0.1)',
    borderColor: 'rgba(126, 34, 206, 0.25)',
  },
  live: {
    defaultColor: COLORS.error,
    glassLevel: 'medium',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  vod: {
    defaultColor: COLORS.primary,
    glassLevel: 'medium',
    backgroundColor: 'rgba(126, 34, 206, 0.1)',
    borderColor: 'rgba(126, 34, 206, 0.25)',
  },
  radio: {
    defaultColor: COLORS.secondary,
    glassLevel: 'medium',
    backgroundColor: 'rgba(134, 25, 143, 0.1)',
    borderColor: 'rgba(134, 25, 143, 0.25)',
  },
  podcasts: {
    defaultColor: COLORS.success,
    glassLevel: 'medium',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  audiobooks: {
    defaultColor: COLORS.info,
    glassLevel: 'medium',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  epg: {
    defaultColor: COLORS.warning,
    glassLevel: 'medium',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  search: {
    defaultColor: COLORS.info,
    glassLevel: 'light',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  profile: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
    backgroundColor: 'rgba(126, 34, 206, 0.08)',
    borderColor: 'rgba(126, 34, 206, 0.15)',
  },
  settings: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
    backgroundColor: 'rgba(126, 34, 206, 0.08)',
    borderColor: 'rgba(126, 34, 206, 0.15)',
  },
  support: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
    backgroundColor: 'rgba(126, 34, 206, 0.08)',
    borderColor: 'rgba(126, 34, 206, 0.15)',
  },
  admin: {
    defaultColor: COLORS.primary,
    glassLevel: 'medium',
    backgroundColor: 'rgba(126, 34, 206, 0.1)',
    borderColor: 'rgba(126, 34, 206, 0.25)',
  },

  // Content Discovery
  discover: {
    defaultColor: COLORS.primary,
    glassLevel: 'medium',
    backgroundColor: 'rgba(126, 34, 206, 0.1)',
    borderColor: 'rgba(126, 34, 206, 0.25)',
  },
  judaism: {
    defaultColor: COLORS.info,
    glassLevel: 'medium',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  children: {
    defaultColor: COLORS.warning,
    glassLevel: 'medium',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },

  // Games & Social
  games: {
    defaultColor: COLORS.warning,
    glassLevel: 'medium',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  friends: {
    defaultColor: COLORS.secondary,
    glassLevel: 'light',
    backgroundColor: 'rgba(134, 25, 143, 0.08)',
    borderColor: 'rgba(134, 25, 143, 0.15)',
  },

  // Library & Favorites
  favorites: {
    defaultColor: COLORS.error,
    glassLevel: 'light',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  watchlist: {
    defaultColor: COLORS.warning,
    glassLevel: 'light',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  playlist: {
    defaultColor: COLORS.warning,
    glassLevel: 'light',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  downloads: {
    defaultColor: COLORS.success,
    glassLevel: 'light',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  recordings: {
    defaultColor: COLORS.error,
    glassLevel: 'light',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  widgets: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
    backgroundColor: 'rgba(126, 34, 206, 0.08)',
    borderColor: 'rgba(126, 34, 206, 0.15)',
  },

  // Subscription
  plans: {
    defaultColor: COLORS.gold,
    glassLevel: 'medium',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },

  // Actions
  play: {
    defaultColor: COLORS.success,
    glassLevel: 'light',
  },
  pause: {
    defaultColor: COLORS.warning,
    glassLevel: 'light',
  },
  skip: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
  },
  skipBack: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
  },
  volumeUp: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
  },
  volumeDown: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
  },
  mute: {
    defaultColor: COLORS.error,
    glassLevel: 'light',
  },
  fullscreen: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
  },
  exitFullscreen: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
  },
  add: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
  },
  remove: {
    defaultColor: COLORS.error,
    glassLevel: 'light',
  },
  close: {
    defaultColor: COLORS.error,
    glassLevel: 'light',
  },
  menu: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
  },
  back: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
  },
  forward: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
  },
  edit: {
    defaultColor: COLORS.warning,
    glassLevel: 'light',
  },
  delete: {
    defaultColor: COLORS.error,
    glassLevel: 'light',
  },
  share: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
  },
  download: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
  },

  // Status Icons
  loading: {
    defaultColor: COLORS.info,
    glassLevel: 'light',
  },
  success: {
    defaultColor: COLORS.success,
    glassLevel: 'light',
  },
  error: {
    defaultColor: COLORS.error,
    glassLevel: 'light',
  },
  warning: {
    defaultColor: COLORS.warning,
    glassLevel: 'light',
  },
  info: {
    defaultColor: COLORS.info,
    glassLevel: 'light',
  },
  check: {
    defaultColor: COLORS.success,
    glassLevel: 'light',
  },
  clock: {
    defaultColor: COLORS.info,
    glassLevel: 'light',
  },

  // UI Elements
  dropdown: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
  },
  expand: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
  },
  collapse: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
  },
  more: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
  },

  // ============================================
  // NEW ICONS - Emoji Migration (2026-01-31)
  // ============================================

  // Navigation/UI Icons
  logout: {
    defaultColor: COLORS.secondary,
    glassLevel: 'light',
    backgroundColor: 'rgba(134, 25, 143, 0.08)',
    borderColor: 'rgba(134, 25, 143, 0.15)',
  },
  lock: {
    defaultColor: COLORS.warning,
    glassLevel: 'medium',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  unlock: {
    defaultColor: COLORS.success,
    glassLevel: 'light',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  key: {
    defaultColor: COLORS.gold,
    glassLevel: 'medium',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  globe: {
    defaultColor: COLORS.info,
    glassLevel: 'light',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  location: {
    defaultColor: COLORS.error,
    glassLevel: 'medium',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  calendar: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
    backgroundColor: 'rgba(126, 34, 206, 0.08)',
    borderColor: 'rgba(126, 34, 206, 0.15)',
  },
  notification: {
    defaultColor: COLORS.warning,
    glassLevel: 'medium',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },

  // Content Type Icons
  stories: {
    defaultColor: COLORS.primary,
    glassLevel: 'medium',
    backgroundColor: 'rgba(126, 34, 206, 0.1)',
    borderColor: 'rgba(126, 34, 206, 0.25)',
  },
  music: {
    defaultColor: COLORS.secondary,
    glassLevel: 'medium',
    backgroundColor: 'rgba(134, 25, 143, 0.1)',
    borderColor: 'rgba(134, 25, 143, 0.25)',
  },
  educational: {
    defaultColor: COLORS.info,
    glassLevel: 'medium',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  cartoons: {
    defaultColor: COLORS.primary,
    glassLevel: 'medium',
    backgroundColor: 'rgba(126, 34, 206, 0.1)',
    borderColor: 'rgba(126, 34, 206, 0.25)',
  },
  news: {
    defaultColor: COLORS.secondary,
    glassLevel: 'medium',
    backgroundColor: 'rgba(134, 25, 143, 0.1)',
    borderColor: 'rgba(134, 25, 143, 0.25)',
  },
  document: {
    defaultColor: COLORS.secondary,
    glassLevel: 'light',
    backgroundColor: 'rgba(134, 25, 143, 0.08)',
    borderColor: 'rgba(134, 25, 143, 0.15)',
  },
  folder: {
    defaultColor: COLORS.primary,
    glassLevel: 'light',
    backgroundColor: 'rgba(126, 34, 206, 0.08)',
    borderColor: 'rgba(126, 34, 206, 0.15)',
  },
  broadcast: {
    defaultColor: COLORS.error,
    glassLevel: 'medium',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },

  // Action Icons
  trash: {
    defaultColor: COLORS.error,
    glassLevel: 'light',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  record: {
    defaultColor: COLORS.error,
    glassLevel: 'medium',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  stop: {
    defaultColor: COLORS.secondary,
    glassLevel: 'light',
  },
  eye: {
    defaultColor: COLORS.secondary,
    glassLevel: 'light',
  },
  eyeOff: {
    defaultColor: COLORS.secondary,
    glassLevel: 'light',
  },
  upload: {
    defaultColor: COLORS.info,
    glassLevel: 'light',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },

  // Status/Category Icons
  rainbow: {
    defaultColor: COLORS.gold,
    glassLevel: 'medium',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  baby: {
    defaultColor: COLORS.primary,
    glassLevel: 'medium',
    backgroundColor: 'rgba(126, 34, 206, 0.1)',
    borderColor: 'rgba(126, 34, 206, 0.25)',
  },
  users: {
    defaultColor: COLORS.secondary,
    glassLevel: 'medium',
    backgroundColor: 'rgba(134, 25, 143, 0.1)',
    borderColor: 'rgba(134, 25, 143, 0.25)',
  },
  target: {
    defaultColor: COLORS.error,
    glassLevel: 'medium',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  flame: {
    defaultColor: COLORS.error,
    glassLevel: 'medium',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  gem: {
    defaultColor: COLORS.gold,
    glassLevel: 'medium',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },

  // Cultural/Religious Icons
  candle: {
    defaultColor: COLORS.warning,
    glassLevel: 'medium',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  moon: {
    defaultColor: COLORS.info,
    glassLevel: 'light',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  synagogue: {
    defaultColor: COLORS.info,
    glassLevel: 'medium',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
};

/**
 * Get icon styling by name with fallback to defaults
 */
export function getIconStyling(iconName: string): IconStyling {
  return (
    ICON_COLOR_THEME[iconName] || {
      defaultColor: COLORS.primary,
      glassLevel: 'light' as GlassLevel,
    }
  );
}

/**
 * Get icon color by name
 */
export function getIconColor(iconName: string): string {
  const styling = ICON_COLOR_THEME[iconName];
  return styling?.defaultColor || COLORS.primary;
}

/**
 * Get glass level for icon
 */
export function getIconGlassLevel(iconName: string): GlassLevel {
  const styling = ICON_COLOR_THEME[iconName];
  return styling?.glassLevel || 'light';
}

/**
 * Export color palette for external use
 */
export const COLORS_PALETTE = COLORS;

export default {
  ICON_COLOR_THEME,
  COLORS_PALETTE,
  getIconStyling,
  getIconColor,
  getIconGlassLevel,
};
