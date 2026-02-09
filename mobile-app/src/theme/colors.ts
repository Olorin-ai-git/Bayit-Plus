/**
 * Bayit+ Mobile Color Theme
 *
 * Mirrors the canonical design tokens from @olorin/design-tokens.
 * All color values match DesignTokens.swift and packages/ui/design-tokens/src/colors.ts exactly.
 *
 * Usage:
 *   import { Colors } from '../theme/colors';
 *   backgroundColor: Colors.Background.primary
 *
 * Color mapping from commonly hardcoded values:
 *   '#0d0d1a'                     -> Colors.Background.primary
 *   '#1a1a2e'                     -> Colors.Background.elevated
 *   '#fff' / '#ffffff' / '#FFFFFF' -> Colors.Text.primary
 *   'rgba(255,255,255,0.7)'       -> Colors.Text.secondary
 *   'rgba(255,255,255,0.5)'       -> Colors.Text.muted
 *   'rgba(255,255,255,0.3)'       -> Colors.Text.disabled
 *   '#7e22ce'                     -> Colors.Primary.default (p700)
 *   '#a855f7'                     -> Colors.Primary.p500
 *   '#6366f1'                     -> Colors.Primary.p500 (closest match - indigo mapped to purple)
 *   '#9333ea'                     -> Colors.Primary.p600
 *   '#c084fc'                     -> Colors.Primary.p400
 *   '#581c87'                     -> Colors.Primary.p900
 *   '#10b981'                     -> Colors.Success.default
 *   '#ef4444'                     -> Colors.Error.default
 *   '#f59e0b'                     -> Colors.Warning.default
 *   '#3b82f6'                     -> Colors.Info.default
 *   '#ff4444'                     -> Colors.Special.live
 *   '#ffd700'                     -> Colors.Special.gold
 *   'rgba(0,0,0,0.7)'            -> Colors.Glass.bg
 *   'rgba(0,0,0,0.5)'            -> Colors.Glass.bgLight
 */

/** Primary Purple brand palette */
export const Primary = {
  p50: '#faf5ff',
  p100: '#f3e8ff',
  p200: '#e9d5ff',
  p300: '#d8b4fe',
  p400: '#c084fc',
  p500: '#a855f7',
  p600: '#9333ea',
  p700: '#7e22ce',
  p800: '#6b21a8',
  p900: '#581c87',
  p950: '#3b0764',
  default: '#7e22ce',
} as const;

/** Secondary Purple accents */
export const Secondary = {
  s400: '#e879f9',
  s500: '#d946ef',
  s600: '#c026d3',
  s700: '#a21caf',
  s800: '#86198f',
  default: '#86198f',
} as const;

/** Dark/Neutral - blacks and grays */
export const Dark = {
  d50: '#fafafa',
  d100: '#f5f5f5',
  d200: '#e5e5e5',
  d300: '#d4d4d4',
  d400: '#a3a3a3',
  d500: '#737373',
  d600: '#525252',
  d700: '#404040',
  d800: '#262626',
  d900: '#171717',
  d950: '#000000',
  default: '#000000',
} as const;

/** Semantic success colors */
export const Success = {
  s400: '#4ade80',
  s500: '#10b981',
  s600: '#059669',
  default: '#10b981',
} as const;

/** Semantic warning colors */
export const Warning = {
  w400: '#fbbf24',
  w500: '#f59e0b',
  w600: '#d97706',
  default: '#f59e0b',
} as const;

/** Semantic error colors */
export const ErrorColor = {
  e400: '#f87171',
  e500: '#ef4444',
  e600: '#dc2626',
  default: '#ef4444',
} as const;

/** Semantic info colors */
export const Info = {
  i400: '#60a5fa',
  i500: '#3b82f6',
  i600: '#2563eb',
  default: '#3b82f6',
} as const;

/** Special purpose colors */
export const Special = {
  live: '#ff4444',
  gold: '#ffd700',
} as const;

/** Avatar palette - decorative colors for profile avatars */
export const AvatarPalette = [
  '#a855f7', // purple
  '#ff6b6b', // coral
  '#4ecdc4', // teal
  '#ffd93d', // amber
  '#6c5ce7', // indigo
  '#a8e6cf', // mint
  '#ff8b94', // pink
  '#ffaaa5', // peach
] as const;

/** Glass / glassmorphism overlay colors */
export const Glass = {
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
} as const;

/** Text colors (dark mode - light text on dark backgrounds) */
export const Text = {
  primary: '#ffffff',
  secondary: 'rgba(255, 255, 255, 0.7)',
  muted: 'rgba(255, 255, 255, 0.5)',
  disabled: 'rgba(255, 255, 255, 0.3)',
} as const;

/** Background / surface colors */
export const Background = {
  primary: '#0d0d1a',
  elevated: '#1a1a2e',
} as const;

/** Complete Colors namespace for convenient access */
export const Colors = {
  Primary,
  Secondary,
  Dark,
  Success,
  Warning,
  Error: ErrorColor,
  Info,
  Special,
  Glass,
  Text,
  Background,
  AvatarPalette,
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export default Colors;
