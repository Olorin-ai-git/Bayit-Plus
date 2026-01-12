/**
 * Mobile Typography System
 *
 * Font sizes optimized for mobile viewing (1ft distance, not 10ft like TV)
 * Scales responsively based on device size using getFontSize helper
 */

import { getFontSize } from '../utils/responsive';

export const typography = {
  // Headings
  h1: {
    fontSize: getFontSize(32),
    fontWeight: '700' as const,
    lineHeight: getFontSize(40),
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: getFontSize(24),
    fontWeight: '600' as const,
    lineHeight: getFontSize(32),
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: getFontSize(20),
    fontWeight: '600' as const,
    lineHeight: getFontSize(28),
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: getFontSize(18),
    fontWeight: '600' as const,
    lineHeight: getFontSize(24),
    letterSpacing: -0.1,
  },
  h5: {
    fontSize: getFontSize(16),
    fontWeight: '600' as const,
    lineHeight: getFontSize(22),
  },

  // Body text
  body: {
    fontSize: getFontSize(16),
    fontWeight: '400' as const,
    lineHeight: getFontSize(24),
  },
  bodyMedium: {
    fontSize: getFontSize(16),
    fontWeight: '500' as const,
    lineHeight: getFontSize(24),
  },
  bodySmall: {
    fontSize: getFontSize(14),
    fontWeight: '400' as const,
    lineHeight: getFontSize(20),
  },
  bodySmallMedium: {
    fontSize: getFontSize(14),
    fontWeight: '500' as const,
    lineHeight: getFontSize(20),
  },

  // UI elements
  button: {
    fontSize: getFontSize(16),
    fontWeight: '600' as const,
    lineHeight: getFontSize(24),
    letterSpacing: 0.1,
  },
  buttonSmall: {
    fontSize: getFontSize(14),
    fontWeight: '600' as const,
    lineHeight: getFontSize(20),
    letterSpacing: 0.1,
  },
  caption: {
    fontSize: getFontSize(12),
    fontWeight: '400' as const,
    lineHeight: getFontSize(16),
  },
  captionMedium: {
    fontSize: getFontSize(12),
    fontWeight: '500' as const,
    lineHeight: getFontSize(16),
  },
  label: {
    fontSize: getFontSize(14),
    fontWeight: '500' as const,
    lineHeight: getFontSize(20),
    letterSpacing: 0.1,
  },
  labelSmall: {
    fontSize: getFontSize(12),
    fontWeight: '500' as const,
    lineHeight: getFontSize(16),
    letterSpacing: 0.1,
  },

  // Special text
  overline: {
    fontSize: getFontSize(10),
    fontWeight: '600' as const,
    lineHeight: getFontSize(14),
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
};

/**
 * Font family presets (to be configured with actual fonts)
 */
export const fontFamily = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
  // For Hebrew support
  hebrewRegular: 'System',
  hebrewBold: 'System',
};
