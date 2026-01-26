/**
 * Hook: useReducedMotion
 *
 * Checks if user has Reduce Motion accessibility setting enabled
 * Allows disabling animations for users who prefer reduced motion
 *
 * Usage:
 * const isReduceMotionEnabled = useReducedMotion();
 * if (!isReduceMotionEnabled) {
 *   // Run animations
 * }
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export const useReducedMotion = (): boolean => {
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    const checkReducedMotion = async () => {
      try {
        const enabled = await AccessibilityInfo.isReduceMotionEnabled();
        setIsReduceMotionEnabled(enabled);
      } catch {
        setIsReduceMotionEnabled(false);
      }
    };

    checkReducedMotion();

    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        setIsReduceMotionEnabled(enabled);
      }
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  return isReduceMotionEnabled;
};
