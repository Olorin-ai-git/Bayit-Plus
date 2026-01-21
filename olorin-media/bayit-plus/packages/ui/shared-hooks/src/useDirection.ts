/**
 * useDirection Hook
 *
 * Provides RTL/LTR direction utilities based on system I18nManager.
 * Platform-agnostic hook for React Native and Web.
 */

import { useState, useEffect, useCallback } from 'react';
import { I18nManager } from 'react-native';

type Direction = 'rtl' | 'ltr';
type FlexDirection = 'row' | 'row-reverse';
type TextAlign = 'left' | 'right';
type JustifyContent = 'flex-start' | 'flex-end';
type AlignItems = 'flex-start' | 'flex-end';

export interface DirectionResult {
  /** Whether the current direction is RTL */
  isRTL: boolean;
  /** The current direction ('rtl' or 'ltr') */
  direction: Direction;
  /** Flex direction for horizontal layouts */
  flexDirection: FlexDirection;
  /** Text alignment */
  textAlign: TextAlign;
  /** Horizontal justify content */
  justifyContent: JustifyContent;
  /** Horizontal align items */
  alignItems: AlignItems;
  /** Set RTL mode manually */
  setRTL: (rtl: boolean) => void;
}

/**
 * Hook to get and manage text direction based on RTL/LTR settings.
 * Uses React Native's I18nManager for system-level RTL detection.
 *
 * @param defaultRTL - Optional default RTL setting (defaults to system setting)
 * @returns Direction configuration object with helper properties
 *
 * @example
 * ```tsx
 * const { isRTL, flexDirection, textAlign } = useDirection();
 *
 * return (
 *   <View style={{ flexDirection }}>
 *     <Text style={{ textAlign }}>Hello</Text>
 *   </View>
 * );
 * ```
 */
export const useDirection = (defaultRTL?: boolean): DirectionResult => {
  const [isRTL, setIsRTL] = useState(() => {
    return defaultRTL ?? I18nManager.isRTL;
  });

  useEffect(() => {
    // Sync with system setting if no default provided
    if (defaultRTL === undefined) {
      setIsRTL(I18nManager.isRTL);
    }
  }, [defaultRTL]);

  const setRTL = useCallback((rtl: boolean) => {
    setIsRTL(rtl);
    // Update React Native's I18nManager for native RTL support
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
    }
  }, []);

  return {
    isRTL,
    direction: isRTL ? 'rtl' : 'ltr',
    flexDirection: isRTL ? 'row-reverse' : 'row',
    textAlign: isRTL ? 'right' : 'left',
    justifyContent: isRTL ? 'flex-end' : 'flex-start',
    alignItems: isRTL ? 'flex-end' : 'flex-start',
    setRTL,
  };
};

export default useDirection;
