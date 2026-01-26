/**
 * Shared Theme - Re-exports from Glass UI theme
 *
 * This module provides theme exports for shared screens and components.
 * Uses @olorin/design-tokens for consistent styling across platforms.
 */

export {
  colors,
  spacing,
  borderRadius,
  fontSize,
  shadows,
  glassTheme,
  TV_FOCUS,
  focusSpringConfig,
  blurSpringConfig,
  cardFocusedStyle,
  buttonFocusedStyle,
  inputFocusedStyle,
  webOutlineStyle,
} from '@olorin/glass-ui/theme';

// Re-export everything from design tokens
export * from '@olorin/design-tokens';
