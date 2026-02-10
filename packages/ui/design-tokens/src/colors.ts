/**
 * Olorin Design System - Colors
 * Unified Purple/Black Glassmorphic Theme
 * Shared across all platforms: web, mobile, TV, tvOS
 */

export interface ColorScaleValues {
  [key: string]: string;
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
  DEFAULT: string;
}

export interface SemanticColorScaleValues {
  [key: string]: string;
  400: string;
  500: string;
  600: string;
  DEFAULT: string;
}

/**
 * ColorScale is typed as string intersection so it can be used directly where
 * string is expected (e.g., as a color prop), while also supporting indexed access
 * like colors.primary[500]. At runtime these are plain objects.
 */
export type ColorScale = string & ColorScaleValues;
export type SemanticColorScale = string & SemanticColorScaleValues;

export interface GlassColors {
  /** Dark purple-tinted black background */
  bg: string;
  /** Lighter glass background */
  bgLight: string;
  /** Medium glass background */
  bgMedium: string;
  /** Stronger glass background */
  bgStrong: string;
  /** Dark purple border */
  border: string;
  /** Light border variant */
  borderLight: string;
  /** Strong border for focus states */
  borderFocus: string;
  /** Light purple tinted glass */
  purpleLight: string;
  /** Strong purple tinted glass */
  purpleStrong: string;
  /** Purple glow effect */
  purpleGlow: string;
}

export interface GradientColors {
  primary: string;
  dark: string;
  glass: string;
}

export interface ShadowColors {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  glow: string;
  'glow-lg': string;
  'glow-primary': string;
  'glow-secondary': string;
}

/** Primary - Dark Purple (brand color for glassmorphic UI) */
export const primary = {
  50: '#faf5ff',
  100: '#f3e8ff',
  200: '#e9d5ff',
  300: '#d8b4fe',
  400: '#c084fc',
  500: '#a855f7',
  600: '#9333ea',
  700: '#7e22ce',
  800: '#6b21a8',
  900: '#581c87',
  950: '#3b0764',
  DEFAULT: '#7e22ce',
} as ColorScale;

/** Secondary - Deep Dark Purple (for accents and highlights) */
export const secondary = {
  50: '#fdf4ff',
  100: '#fae8ff',
  200: '#f5d0fe',
  300: '#f0abfc',
  400: '#e879f9',
  500: '#d946ef',
  600: '#c026d3',
  700: '#a21caf',
  800: '#86198f',
  900: '#701a75',
  950: '#4a044e',
  DEFAULT: '#86198f',
} as ColorScale;

/** Dark/Neutral - Pure blacks and grays for glassmorphic backgrounds */
export const dark = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
  950: '#000000',
  DEFAULT: '#000000',
} as ColorScale;

/** Success semantic color */
export const success = {
  400: '#4ade80',
  500: '#10b981',
  600: '#059669',
  DEFAULT: '#10b981',
} as SemanticColorScale;

/** Warning semantic color */
export const warning = {
  400: '#fbbf24',
  500: '#f59e0b',
  600: '#d97706',
  DEFAULT: '#f59e0b',
} as SemanticColorScale;

/** Error semantic color */
export const error = {
  400: '#f87171',
  500: '#ef4444',
  600: '#dc2626',
  DEFAULT: '#ef4444',
} as SemanticColorScale;

/** Info semantic color */
export const info = {
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  DEFAULT: '#3b82f6',
} as SemanticColorScale;

/** Live indicator color */
export const live = '#ff4444';

/** Gold/premium color */
export const gold = '#ffd700';

/** Glass effect colors (for glassmorphic backgrounds with dark purple tints) */
export const glass: GlassColors = {
  bg: 'rgba(10, 10, 10, 0.7)',
  bgLight: 'rgba(10, 10, 10, 0.5)',
  bgMedium: 'rgba(10, 10, 10, 0.6)',
  bgStrong: 'rgba(10, 10, 10, 0.85)',
  border: 'rgba(126, 34, 206, 0.25)',
  borderLight: 'rgba(126, 34, 206, 0.15)',
  borderFocus: 'rgba(126, 34, 206, 0.7)',
  purpleLight: 'rgba(88, 28, 135, 0.35)',
  purpleStrong: 'rgba(88, 28, 135, 0.55)',
  purpleGlow: 'rgba(126, 34, 206, 0.35)',
};

/** Gradient presets */
export const gradients: GradientColors = {
  primary: 'linear-gradient(135deg, #7e22ce 0%, #86198f 100%)',
  dark: 'linear-gradient(135deg, #0f172a 0%, #000000 100%)',
  glass: 'linear-gradient(135deg, rgba(10, 10, 10, 0.8) 0%, rgba(0, 0, 0, 0.8) 100%)',
};

/** Shadow presets with dark purple glow */
export const shadowColors: ShadowColors = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.2)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.25)',
  glow: '0 0 20px rgba(126, 34, 206, 0.35)',
  'glow-lg': '0 0 40px rgba(126, 34, 206, 0.5)',
  'glow-primary': '0 0 20px rgba(126, 34, 206, 0.35)',
  'glow-secondary': '0 0 20px rgba(134, 25, 143, 0.35)',
};

/** Quiz answer button colors (child-friendly palette) */
export interface QuizAnswerColor {
  bg: string;
  border: string;
}

export const quizAnswerColors: QuizAnswerColor[] = [
  { bg: 'rgba(255, 127, 80, 0.3)', border: 'rgba(255, 127, 80, 0.6)' },   // Coral
  { bg: 'rgba(32, 178, 170, 0.3)', border: 'rgba(32, 178, 170, 0.6)' },   // Teal
  { bg: 'rgba(255, 215, 0, 0.3)', border: 'rgba(255, 215, 0, 0.6)' },     // Yellow
  { bg: 'rgba(152, 251, 152, 0.3)', border: 'rgba(152, 251, 152, 0.6)' }, // Mint
];

/** Complete colors object for Tailwind config */
export const colors = {
  primary,
  secondary,
  dark,
  success,
  warning,
  error,
  info,
  live,
  gold,
  transparent: 'transparent',
  current: 'currentColor',
  white: '#ffffff',
  black: '#000000',

  // Semantic text colors (dark mode - light text on dark backgrounds)
  text: '#ffffff',              // Primary text color (white for dark theme)
  textPrimary: '#ffffff',       // Alias for text (primary text color)
  textSecondary: 'rgba(255, 255, 255, 0.7)',  // Secondary text
  textMuted: 'rgba(255, 255, 255, 0.5)',      // Muted/disabled text
  textDisabled: 'rgba(255, 255, 255, 0.3)',   // Disabled text

  // Input/Form colors
  inputBackground: glass.bgLight,              // Input background (light glass)
  inputBackgroundFocus: glass.bgMedium,        // Input background when focused
  inputBorder: glass.borderLight,              // Input border (light purple)
  inputBorderFocus: glass.borderFocus,         // Input border when focused
  inputText: '#ffffff',                        // Input text color
  inputPlaceholder: 'rgba(255, 255, 255, 0.5)', // Input placeholder text

  // Button colors
  buttonPrimary: primary.DEFAULT,              // Primary button background
  buttonPrimaryHover: primary[600],            // Primary button hover
  buttonSecondary: glass.bgMedium,             // Secondary button background
  buttonSecondaryHover: glass.bgStrong,        // Secondary button hover
  buttonText: '#ffffff',                       // Button text color
  buttonDisabled: glass.bgLight,               // Disabled button background
  buttonDisabledText: 'rgba(255, 255, 255, 0.3)', // Disabled button text

  // Flattened glass properties (for convenience/backward compatibility)
  glass: glass.bg,              // Default glass background (medium intensity)
  glassLight: glass.bgLight,
  glassMedium: glass.bgMedium,
  glassStrong: glass.bgStrong,
  glassBorder: glass.border,
  glassBorderLight: glass.borderLight,
  glassBorderFocus: glass.borderFocus,
  glassBorderStrong: glass.border,  // Alias for border
  glassBorderWhite: 'rgba(255, 255, 255, 0.1)',  // White tinted border
  glassPurple: glass.purpleStrong,
  glassPurpleLight: glass.purpleLight,
  glassGlowStrong: 'rgba(126, 34, 206, 0.5)',  // Strong purple glow
  glassOverlay: 'rgba(10, 10, 10, 0.8)',  // Overlay background
  glassOverlayStrong: 'rgba(10, 10, 10, 0.95)',  // Strong overlay
  glassOverlayPurple: 'rgba(88, 28, 135, 0.4)',  // Purple-tinted overlay
  glassWhiteSubtle: 'rgba(255, 255, 255, 0.06)',  // Subtle white overlay for badges/pills
  glassWhiteFaint: 'rgba(255, 255, 255, 0.03)',   // Faint white overlay for secondary surfaces

  // Split screen subtitle colors (solid for WCAG AA contrast compliance)
  splitScreenLeft: '#3b82f6',     // Solid blue for left pane border
  splitScreenRight: '#8b5cf6',    // Solid purple for right pane border
  splitScreenLeftBg: 'rgba(59, 130, 246, 0.15)',  // Light blue background
  splitScreenRightBg: 'rgba(139, 92, 246, 0.15)', // Light purple background

  // Semantic aliases (used by shared components)
  background: dark[950],           // Page/app background (dark theme)
  backgroundLighter: dark[800],    // Lighter background for cards/sections
  primaryLight: primary[300],      // Light purple variant for highlights
  primaryDark: primary[900],       // Darker purple variant
  cardBackground: glass.bgLight,   // Card/panel background
  border: glass.border,            // Default border color
  purple: primary,                 // Purple color scale alias
  gray: dark,                      // Gray/neutral color scale alias
  bg: dark[950],                   // Short alias for background
  backgroundLight: dark[700],      // Light background variant
  accent: primary.DEFAULT,         // Accent color (primary purple)
  surfaceAlt: dark[800],           // Alternative surface color
  red: error,                      // Red color alias (maps to error scale)
  surface: dark[900],              // Surface color for cards
  overlay: 'rgba(0, 0, 0, 0.5)',  // Overlay background
};

export default colors;
