/**
 * TV Focus Styles
 * Reusable focus styling constants for TV components
 */

import { colors } from '@olorin/design-tokens';

/**
 * TV Focus constants
 */
export const TV_FOCUS = {
  scale: 1.05,
  duration: 200,
  borderWidth: 3,
  borderColor: colors.primary.DEFAULT,
};

/**
 * Focus spring animation config
 */
export const focusSpringConfig = {
  toValue: TV_FOCUS.scale,
  useNativeDriver: true,
  friction: 8,
  tension: 100,
};

/**
 * Blur spring animation config
 */
export const blurSpringConfig = {
  toValue: 1,
  useNativeDriver: true,
  friction: 8,
  tension: 100,
};

/**
 * Card focus style
 */
export const cardFocusedStyle = {
  borderWidth: TV_FOCUS.borderWidth,
  borderColor: TV_FOCUS.borderColor,
  backgroundColor: `${colors.primary}20`,
};

/**
 * Button focus style
 */
export const buttonFocusedStyle = {
  borderWidth: TV_FOCUS.borderWidth,
  borderColor: TV_FOCUS.borderColor,
  backgroundColor: colors.primary[600],
};

/**
 * Input focus style
 */
export const inputFocusedStyle = {
  borderWidth: TV_FOCUS.borderWidth,
  borderColor: TV_FOCUS.borderColor,
  backgroundColor: `${colors.primary}10`,
};

/**
 * Web outline style (for web focus)
 */
export const webOutlineStyle = {
  outlineWidth: 2,
  outlineColor: TV_FOCUS.borderColor,
  outlineStyle: 'solid' as const,
};
