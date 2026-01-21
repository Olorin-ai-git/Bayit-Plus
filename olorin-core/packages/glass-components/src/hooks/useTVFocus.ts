/**
 * useTVFocus Hook
 *
 * Provides consistent focus behavior and state management for TV components.
 * Handles focus state, animations, and styling in a unified way.
 *
 * Usage:
 * ```tsx
 * const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus();
 *
 * <TouchableOpacity
 *   onFocus={handleFocus}
 *   onBlur={handleBlur}
 * >
 *   <Animated.View style={[baseStyle, scaleTransform, isFocused && focusStyle]}>
 *     {children}
 *   </Animated.View>
 * </TouchableOpacity>
 * ```
 */

import { useState, useRef, useCallback } from 'react';
import { Animated, Platform } from 'react-native';
import {
  TV_FOCUS,
  focusSpringConfig,
  blurSpringConfig,
  cardFocusedStyle,
  buttonFocusedStyle,
  inputFocusedStyle,
  webOutlineStyle,
} from '../theme';

export type FocusStyleType = 'card' | 'button' | 'input' | 'outline' | 'none';

export interface UseTVFocusOptions {
  /**
   * Type of focus styling to apply
   * @default 'card'
   */
  styleType?: FocusStyleType;

  /**
   * Enable animations on focus/blur
   * @default true
   */
  animated?: boolean;

  /**
   * Custom callback when focus gained
   */
  onFocus?: () => void;

  /**
   * Custom callback when focus lost
   */
  onBlur?: () => void;

  /**
   * Only enable focus behavior on TV
   * @default false
   */
  tvOnly?: boolean;
}

export interface UseTVFocusReturn {
  /** Whether component currently has focus */
  isFocused: boolean;

  /** Handle focus event - pass to onFocus prop */
  handleFocus: () => void;

  /** Handle blur event - pass to onBlur prop */
  handleBlur: () => void;

  /** Animated scale value for transform animations */
  scaleAnim: Animated.Value;

  /** Ready-to-use focus styles based on styleType */
  focusStyle: Record<string, unknown>;

  /** Scale transform value for use in style */
  scaleTransform: { transform: [{ scale: Animated.Value }] };
}

/**
 * Detect if running on a TV platform
 */
const isTV = Platform.isTV || Platform.OS === 'android';

/**
 * Hook for managing TV focus state and animations
 */
export const useTVFocus = (options: UseTVFocusOptions = {}): UseTVFocusReturn => {
  const {
    styleType = 'card',
    animated = true,
    onFocus: customOnFocus,
    onBlur: customOnBlur,
    tvOnly = false,
  } = options;

  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = useCallback(() => {
    setIsFocused(true);

    // Only animate on TV or non-web platforms
    if (animated && (isTV || Platform.OS !== 'web')) {
      Animated.spring(scaleAnim, focusSpringConfig).start();
    }

    customOnFocus?.();
  }, [animated, customOnFocus, scaleAnim]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);

    // Reset animation
    if (animated && (isTV || Platform.OS !== 'web')) {
      Animated.spring(scaleAnim, blurSpringConfig).start();
    }

    customOnBlur?.();
  }, [animated, customOnBlur, scaleAnim]);

  // Select focus style based on type
  let focusStyle: Record<string, unknown> = {};
  if (isFocused) {
    switch (styleType) {
      case 'card':
        focusStyle = cardFocusedStyle;
        break;
      case 'button':
        focusStyle = buttonFocusedStyle;
        break;
      case 'input':
        focusStyle = inputFocusedStyle;
        break;
      case 'outline':
        focusStyle = Platform.OS === 'web' ? webOutlineStyle : cardFocusedStyle;
        break;
      case 'none':
        focusStyle = {};
        break;
    }
  }

  // Skip focus behavior if tvOnly and not on TV
  if (tvOnly && !isTV && Platform.OS === 'web') {
    return {
      isFocused: false,
      handleFocus: () => {},
      handleBlur: () => {},
      scaleAnim: new Animated.Value(1),
      focusStyle: {},
      scaleTransform: { transform: [{ scale: scaleAnim }] },
    };
  }

  return {
    isFocused,
    handleFocus,
    handleBlur,
    scaleAnim,
    focusStyle,
    scaleTransform: { transform: [{ scale: scaleAnim }] },
  };
};

export default useTVFocus;
