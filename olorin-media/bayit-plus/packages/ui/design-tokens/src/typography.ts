/**
 * Olorin Design System - Typography
 * Multi-script font support for international audience
 * Shared between web and TV apps
 */

export interface FontFamily {
  sans: string[];
  hebrew: string[];
  cjk: string[];
  mono: string[];
}

export interface FontSizeScale {
  xs: number;
  sm: number;
  base: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
  '4xl': number;
  '5xl': number;
  '6xl': number;
}

export interface FontWeightScale {
  [key: string]: string;
  thin: string;
  light: string;
  normal: string;
  medium: string;
  semibold: string;
  bold: string;
  extrabold: string;
}

export interface LineHeightScale {
  [key: string]: string;
  none: string;
  tight: string;
  snug: string;
  normal: string;
  relaxed: string;
  loose: string;
}

/** Multi-script font families */
export const fontFamily: FontFamily = {
  sans: [
    'Inter',
    'Heebo',
    'Noto Sans SC',
    'Noto Sans JP',
    'Noto Sans Devanagari',
    'Noto Sans Tamil',
    'Noto Sans Bengali',
    'system-ui',
    'sans-serif',
  ],
  hebrew: ['Heebo', 'Inter', 'sans-serif'],
  cjk: ['Noto Sans SC', 'Noto Sans JP', 'Inter', 'sans-serif'],
  mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'monospace'],
};

/** Font sizes - Mobile/Web (in pixels) */
export const fontSize: FontSizeScale = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
};

/** Font sizes - TV (10-foot UI, scaled up) */
export const fontSizeTV: FontSizeScale = {
  xs: 14,
  sm: 16,
  base: 18,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 36,
  '4xl': 44,
  '5xl': 56,
  '6xl': 72,
};

/** Font weights */
export const fontWeight: FontWeightScale = {
  thin: '100',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

/** Line heights */
export const lineHeight: LineHeightScale = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
};

/** Letter spacing */
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
};

/** Composite typography styles for React Native */
export const typography = {
  /** Body text - default paragraph style */
  body: {
    fontSize: fontSize.base,
    lineHeight: fontSize.base * 1.5,
    fontWeight: fontWeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  /** Small body text */
  bodySmall: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
    fontWeight: fontWeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  /** Large body text */
  bodyLarge: {
    fontSize: fontSize.lg,
    lineHeight: fontSize.lg * 1.5,
    fontWeight: fontWeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  /** Heading 1 */
  h1: {
    fontSize: fontSize['4xl'],
    lineHeight: fontSize['4xl'] * 1.2,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  /** Heading 2 */
  h2: {
    fontSize: fontSize['3xl'],
    lineHeight: fontSize['3xl'] * 1.25,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
  },
  /** Heading 3 */
  h3: {
    fontSize: fontSize['2xl'],
    lineHeight: fontSize['2xl'] * 1.3,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.normal,
  },
  /** Heading 4 */
  h4: {
    fontSize: fontSize.xl,
    lineHeight: fontSize.xl * 1.35,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.normal,
  },
  /** Caption text */
  caption: {
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.4,
    fontWeight: fontWeight.normal,
    letterSpacing: letterSpacing.wide,
  },
  /** Label text */
  label: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.4,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.wide,
  },
};

export default {
  fontFamily,
  fontSize,
  fontSizeTV,
  fontWeight,
  lineHeight,
  letterSpacing,
  typography,
};
