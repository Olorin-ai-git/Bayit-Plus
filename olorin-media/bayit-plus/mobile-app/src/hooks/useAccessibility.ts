/**
 * Hook: useAccessibility
 *
 * Composite hook combining all accessibility features
 * Returns object with font scaling, reduced motion, and direction (RTL) support
 *
 * Usage:
 * const { scaledFontSize, isReduceMotionEnabled, isRTL, direction } = useAccessibility();
 */

import { useScaledFontSize } from './useScaledFontSize';
import { useReducedMotion } from './useReducedMotion';
import { useDirection } from '@bayit/shared-hooks';

interface AccessibilityState {
  scaledFontSize: ReturnType<typeof useScaledFontSize>;
  isReduceMotionEnabled: boolean;
  isRTL: boolean;
  direction: 'ltr' | 'rtl';
}

export const useAccessibility = (): AccessibilityState => {
  const scaledFontSize = useScaledFontSize();
  const isReduceMotionEnabled = useReducedMotion();
  const { isRTL, direction } = useDirection();

  return {
    scaledFontSize,
    isReduceMotionEnabled,
    isRTL,
    direction,
  };
};
