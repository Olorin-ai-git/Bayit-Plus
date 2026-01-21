/**
 * Bayit+ Shared Theme
 * Uses shared design tokens for consistency between web and TV apps
 */

// Import shared design tokens
const {
  primary,
  secondary,
  dark,
  success,
  warning,
  error,
  glass,
  live,
  gold,
} = require('../design-tokens/colors.cjs');
const {
  spacing: sharedSpacing,
  borderRadius: sharedBorderRadius,
} = require('../design-tokens/spacing.cjs');
const { fontSizeTV } = require('../design-tokens/typography.cjs');
const { boxShadow, shadowRN } = require('../design-tokens/shadows.cjs');

// Colors - Unified Purple/Black Glassmorphic Theme
export const colors = {
  // Primary - Purple (main brand color)
  primary: primary.DEFAULT,           // #a855f7
  primaryDark: primary[700],          // #7e22ce
  primaryLight: primary[400],         // #c084fc
  primaryLighter: primary[300],       // #d8b4fe
  
  // Secondary - Deep Purple (accents)
  secondary: secondary.DEFAULT,       // #c026d3
  secondaryDark: secondary[700],      // #a21caf
  secondaryLight: secondary[400],     // #e879f9
  
  // Backgrounds - Pure black with subtle variations
  background: dark.DEFAULT,           // #000000
  backgroundLight: dark[950],         // #0a0a0a
  backgroundLighter: dark[900],       // #171717
  backgroundElevated: dark[800],      // #262626
  
  // Glass - Purple-tinted glassmorphic effects
  glass: glass.bg,                    // rgba(10, 10, 10, 0.7)
  glassLight: glass.bgLight,          // rgba(10, 10, 10, 0.5)
  glassMedium: glass.bgMedium,        // rgba(10, 10, 10, 0.6)
  glassStrong: glass.bgStrong,        // rgba(10, 10, 10, 0.85)
  glassPurple: glass.bgPurple,        // rgba(59, 7, 100, 0.4)
  glassPurpleLight: glass.bgPurpleLight, // rgba(107, 33, 168, 0.3)
  
  // Glass Borders
  glassBorder: glass.border,          // rgba(168, 85, 247, 0.2)
  glassBorderLight: glass.borderLight, // rgba(168, 85, 247, 0.1)
  glassBorderStrong: glass.borderStrong, // rgba(168, 85, 247, 0.4)
  glassBorderFocus: glass.borderFocus, // rgba(168, 85, 247, 0.6)
  glassBorderWhite: glass.borderWhite, // rgba(255, 255, 255, 0.1)
  
  // Glass Effects
  glassOverlay: glass.overlay,        // rgba(0, 0, 0, 0.5)
  glassOverlayStrong: glass.overlayStrong, // rgba(0, 0, 0, 0.8)
  glassOverlayPurple: glass.overlayPurple, // rgba(59, 7, 100, 0.6)
  glassGlow: glass.glow,              // rgba(168, 85, 247, 0.3)
  glassGlowStrong: glass.glowStrong,  // rgba(168, 85, 247, 0.5)
  glassHighlight: glass.highlight,    // rgba(216, 180, 254, 0.15)
  
  // Text - White with varying opacity
  text: '#ffffff',
  textSecondary: dark[400],           // #a3a3a3
  textMuted: dark[500],               // #737373
  textDimmed: dark[600],              // #525252
  
  // Status colors
  success: success.DEFAULT,           // #10b981
  warning: warning.DEFAULT,           // #f59e0b
  error: error.DEFAULT,               // #ef4444
  info: primary.DEFAULT,              // #a855f7 (using primary purple for info)
  live: live,                         // #ef4444
  gold: gold,                         // #fbbf24
  
  // Legacy aliases (for backward compatibility)
  overlay: glass.overlay,
  overlayDark: glass.overlayStrong,
};

// Spacing - from shared tokens
export const spacing = {
  xs: sharedSpacing[1],    // 4
  sm: sharedSpacing[2],    // 8
  md: sharedSpacing[4],    // 16
  lg: sharedSpacing[6],    // 24
  xl: sharedSpacing[8],    // 32
  xxl: sharedSpacing[12],  // 48
};

// Border radius - from shared tokens
export const borderRadius = {
  sm: sharedBorderRadius.sm,
  md: sharedBorderRadius.md,
  lg: sharedBorderRadius.lg,
  xl: sharedBorderRadius.xl,
  full: sharedBorderRadius.full,
};

// Font sizes - TV-optimized from shared tokens
export const fontSize = fontSizeTV;

// TV-specific sizing (larger for 10-foot UI)
export const tvFontSize = fontSizeTV;

// Shadows - from shared tokens
export const shadows = {
  sm: shadowRN.sm,
  md: shadowRN.md,
  lg: shadowRN.lg,
  glass: shadowRN.glass,
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  }),
};

// Re-export for convenience
export { boxShadow };
