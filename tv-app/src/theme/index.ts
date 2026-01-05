export const colors = {
  // Primary
  primary: '#00d9ff',
  primaryDark: '#00a8c6',
  primaryLight: '#5ce1ff',

  // Secondary (purple for radio/accents)
  secondary: '#8a2be2',
  secondaryDark: '#6a1fb2',
  secondaryLight: '#a855f7',

  // Backgrounds
  background: '#0d0d1a',
  backgroundLight: '#1a1a2e',
  backgroundLighter: '#252542',

  // Glass
  glass: 'rgba(26, 26, 46, 0.7)',
  glassLight: 'rgba(26, 26, 46, 0.5)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassBorderFocus: 'rgba(0, 217, 255, 0.5)',

  // Text
  text: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#666666',

  // Status
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  live: '#ff4444',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayDark: 'rgba(0, 0, 0, 0.8)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  title: 42,
  hero: 48,
};

// TV-specific sizing (larger for 10-foot UI)
export const tvFontSize = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 36,
  title: 48,
  hero: 56,
};

export const shadows = {
  sm: {
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  md: {
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
  },
  lg: {
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
  },
  glow: (color: string) => ({
    boxShadow: `0 0 20px ${color}`,
  }),
};
