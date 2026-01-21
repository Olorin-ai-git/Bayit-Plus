/**
 * Unified TV Focus System
 *
 * Provides consistent focus/highlight styling across the entire TV app.
 * All TV interactive components should use these styles for a cohesive UX.
 */

import { Platform } from 'react-native';
import { colors } from '../theme';

// TV Focus Behavior Constants
export const TV_FOCUS = {
  SCALE_FACTOR: 1.08,           // Subtle scale increase on focus
  BORDER_WIDTH: 3,               // Strong border on focus
  BORDER_COLOR: colors.primary,  // Cyan #a855f7
  GLOW_RADIUS: 20,               // px for box-shadow
  OUTLINE_WIDTH: 2,              // Extra outline for prominence (web only)
  OUTLINE_OFFSET: 2,             // px outward from border
  ANIMATION_DURATION: 150,       // ms for spring animation
  SPRING_FRICTION: 5,            // Spring friction for smooth animation
} as const;

/**
 * Unified focus border style for all components
 * Use in CardFocused, ButtonFocused, etc. styles
 */
export const focusBorder = {
  borderWidth: TV_FOCUS.BORDER_WIDTH,
  borderColor: TV_FOCUS.BORDER_COLOR,
} as const;

/**
 * Unified focus glow style using box-shadow
 * Creates a prominent glow effect for TV focus
 */
export const focusGlow = (color: string = colors.primary) => ({
  // Primary glow
  boxShadow: `
    0 0 ${TV_FOCUS.GLOW_RADIUS}px ${color}80,
    0 0 ${TV_FOCUS.GLOW_RADIUS * 1.5}px ${color}60,
    inset 0 0 ${TV_FOCUS.GLOW_RADIUS / 2}px ${color}40
  `.trim().replace(/\n\s+/g, ' '),
  outline: `${TV_FOCUS.OUTLINE_WIDTH}px solid ${color}`,
  outlineOffset: `${TV_FOCUS.OUTLINE_OFFSET}px`,
} as const);

/**
 * Unified focus shadow style for native platforms
 * Use for iOS/Android shadow effects
 */
export const focusShadow = {
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.6,
  shadowRadius: 12,
  elevation: 8,  // Android
} as const;

/**
 * Unified focus animation spring config
 * Use with Animated.spring() in React Native
 */
export const focusSpringConfig = {
  toValue: TV_FOCUS.SCALE_FACTOR,
  friction: TV_FOCUS.SPRING_FRICTION,
  tension: 40,
  useNativeDriver: true,
} as const;

/**
 * Unified blur animation spring config
 * Returns to normal scale
 */
export const blurSpringConfig = {
  toValue: 1,
  friction: TV_FOCUS.SPRING_FRICTION,
  tension: 40,
  useNativeDriver: true,
} as const;

/**
 * Complete focused state styles for standard cards
 * Combines border, glow, and shadow effects
 */
export const cardFocusedStyle = {
  ...focusBorder,
  ...(Platform.OS === 'web' && focusGlow()),
  ...(Platform.OS !== 'web' && focusShadow),
} as const;

/**
 * Complete focused state styles for buttons
 * Includes border and glow
 */
export const buttonFocusedStyle = {
  ...focusBorder,
  ...(Platform.OS === 'web' && focusGlow()),
} as const;

/**
 * Complete focused state styles for inputs
 * Focused input styling
 */
export const inputFocusedStyle = {
  borderColor: colors.primary,
  borderWidth: 2,
  ...(Platform.OS === 'web' && {
    boxShadow: `0 0 ${TV_FOCUS.GLOW_RADIUS}px ${colors.primary}60`,
  }),
  ...(Platform.OS !== 'web' && focusShadow),
} as const;

/**
 * Web-only outline style for extra focus visibility
 * Use when component doesn't support borders well
 */
export const webOutlineStyle = {
  outline: `${TV_FOCUS.OUTLINE_WIDTH}px solid ${colors.primary}`,
  outlineOffset: `${TV_FOCUS.OUTLINE_OFFSET}px`,
  boxShadow: `0 0 ${TV_FOCUS.GLOW_RADIUS}px ${colors.primary}60`,
} as const;

/**
 * Quick focus visibility class for debugging
 * Temporarily visible on all platforms for troubleshooting
 */
export const debugFocusStyle = {
  borderWidth: TV_FOCUS.BORDER_WIDTH,
  borderColor: '#ff00ff',  // Magenta for visibility
  ...(Platform.OS === 'web' && {
    outline: `${TV_FOCUS.OUTLINE_WIDTH}px solid #ff00ff`,
    boxShadow: '0 0 20px #ff00ff80',
  }),
} as const;
