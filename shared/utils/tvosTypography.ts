/**
 * tvOS Typography Utilities
 * Provides text scaling for 10-foot TV viewing experience
 */

import { Platform, PixelRatio } from 'react-native'

/**
 * tvOS text scale factor
 * Apple recommends 1.3x-1.5x scaling for TV interfaces
 */
const TVOS_SCALE_FACTOR = 1.3

/**
 * Check if running on tvOS
 */
export function isTVOS(): boolean {
  return Platform.isTV && Platform.OS === 'ios'
}

/**
 * Typography scale based on platform
 */
export const typography = {
  /** Heading sizes */
  h1: isTVOS() ? 48 : 36,
  h2: isTVOS() ? 39 : 30,
  h3: isTVOS() ? 32 : 24,
  h4: isTVOS() ? 26 : 20,
  h5: isTVOS() ? 21 : 16,
  h6: isTVOS() ? 18 : 14,

  /** Body text sizes */
  bodyLarge: isTVOS() ? 22 : 17,
  bodyMedium: isTVOS() ? 20 : 15,
  bodySmall: isTVOS() ? 18 : 14,

  /** UI element text */
  buttonLarge: isTVOS() ? 24 : 18,
  buttonMedium: isTVOS() ? 20 : 16,
  buttonSmall: isTVOS() ? 18 : 14,

  /** Subtitle text */
  subtitleLarge: isTVOS() ? 31 : 24,
  subtitleMedium: isTVOS() ? 26 : 20,
  subtitleSmall: isTVOS() ? 21 : 16,

  /** Caption and labels */
  caption: isTVOS() ? 16 : 12,
  label: isTVOS() ? 18 : 14,

  /** Minimum readable size for TV */
  minimum: isTVOS() ? 16 : 12,
}

/**
 * Scale font size for tvOS
 * @param webSize - Font size optimized for web/mobile
 * @returns Scaled size for tvOS or original size for other platforms
 */
export function scaleFontSize(webSize: number): number {
  if (!isTVOS()) return webSize
  return Math.round(webSize * TVOS_SCALE_FACTOR)
}

/**
 * Get responsive font size based on platform and context
 * @param size - Base size category
 * @returns Appropriate font size for platform
 */
export function getResponsiveFontSize(
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
): number {
  const sizes = {
    xs: { web: 12, tv: 16 },
    sm: { web: 14, tv: 18 },
    md: { web: 16, tv: 21 },
    lg: { web: 18, tv: 23 },
    xl: { web: 20, tv: 26 },
    '2xl': { web: 24, tv: 31 },
    '3xl': { web: 30, tv: 39 },
  }

  return isTVOS() ? sizes[size].tv : sizes[size].web
}

/**
 * Get line height for text
 * tvOS needs more generous line spacing
 */
export function getLineHeight(fontSize: number): number {
  const baseMultiplier = 1.5
  const tvMultiplier = 1.6
  return isTVOS() ? fontSize * tvMultiplier : fontSize * baseMultiplier
}

/**
 * Get letter spacing for text
 * tvOS benefits from slightly increased letter spacing
 */
export function getLetterSpacing(fontSize: number): number {
  if (!isTVOS()) return 0
  return fontSize * 0.01 // 1% of font size
}

/**
 * Subtitle-specific typography
 */
export const subtitleTypography = {
  /**
   * Get font size for subtitle based on user preference
   */
  getFontSize(preference: 'small' | 'medium' | 'large'): number {
    const sizes = {
      small: isTVOS() ? 21 : 16,
      medium: isTVOS() ? 26 : 20,
      large: isTVOS() ? 31 : 24,
    }
    return sizes[preference]
  },

  /**
   * Get line height for subtitles
   */
  getLineHeight(fontSize: number): number {
    return fontSize * (isTVOS() ? 1.4 : 1.3)
  },

  /**
   * Get padding for subtitle container
   */
  getPadding(): number {
    return isTVOS() ? 24 : 16
  },

  /**
   * Get border radius for subtitle background
   */
  getBorderRadius(): number {
    return isTVOS() ? 12 : 8
  },
}

/**
 * Touch target sizes for tvOS
 * Apple TV requires larger touch targets due to remote control
 */
export const touchTargets = {
  /** Minimum touch target size */
  minimum: isTVOS() ? 80 : 44,

  /** Standard button size */
  button: isTVOS() ? 100 : 44,

  /** Large interactive element */
  large: isTVOS() ? 120 : 60,

  /** Icon button size */
  icon: isTVOS() ? 88 : 44,
}

/**
 * Spacing scale for tvOS
 * More generous spacing for 10-foot UI
 */
export const spacing = {
  xs: isTVOS() ? 6 : 4,
  sm: isTVOS() ? 12 : 8,
  md: isTVOS() ? 18 : 12,
  lg: isTVOS() ? 24 : 16,
  xl: isTVOS() ? 36 : 24,
  '2xl': isTVOS() ? 48 : 32,
  '3xl': isTVOS() ? 72 : 48,
}

/**
 * Create text style object for React Native
 */
export function createTextStyle(options: {
  size?: keyof typeof typography
  weight?: 'normal' | 'bold' | '600' | '700'
  color?: string
}): object {
  const { size = 'bodyMedium', weight = 'normal', color = '#ffffff' } = options

  return {
    fontSize: typography[size],
    fontWeight: weight,
    color,
    lineHeight: getLineHeight(typography[size]),
    letterSpacing: getLetterSpacing(typography[size]),
  }
}
