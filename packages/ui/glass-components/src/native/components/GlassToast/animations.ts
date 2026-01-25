/**
 * GlassToast Animations
 * React Native Reanimated animations for toast entry/exit
 */

import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { I18nManager } from 'react-native';

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 90,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
};

interface AnimationResult {
  animatedStyle: any;
  slideAnim: SharedValue<number>;
  opacityAnim: SharedValue<number>;
}

/**
 * Toast entry/exit animations with RTL support
 */
export const useToastAnimation = (
  isVisible: boolean,
  onDismissComplete: () => void,
  prefersReducedMotion: boolean = false
): AnimationResult => {
  const isRTL = I18nManager.isRTL;
  const initialOffset = isRTL ? -400 : 400;

  const slideAnim = useSharedValue(initialOffset);
  const opacityAnim = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      // Entry animation
      const duration = prefersReducedMotion ? 0 : 300;
      slideAnim.value = prefersReducedMotion
        ? 0
        : withSpring(0, SPRING_CONFIG);
      opacityAnim.value = withTiming(1, { duration });
    } else {
      // Exit animation
      const duration = prefersReducedMotion ? 0 : 250;
      slideAnim.value = withTiming(initialOffset, { duration });
      opacityAnim.value = withTiming(0, { duration }, (finished) => {
        if (finished) {
          runOnJS(onDismissComplete)();
        }
      });
    }
  }, [isVisible, prefersReducedMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: slideAnim.value }],
      opacity: opacityAnim.value,
    };
  });

  return {
    animatedStyle,
    slideAnim,
    opacityAnim,
  };
};

/**
 * Swipe gesture animation values
 */
export const useSwipeAnimation = (
  slideAnim: SharedValue<number>,
  opacityAnim: SharedValue<number>,
  threshold: number = 50
) => {
  const isRTL = I18nManager.isRTL;

  const onSwipeUpdate = (translationX: number) => {
    const direction = isRTL ? -1 : 1;
    if (translationX * direction > 0) {
      slideAnim.value = translationX;
      opacityAnim.value = Math.max(0, 1 - Math.abs(translationX) / 200);
    }
  };

  const onSwipeEnd = (
    translationX: number,
    velocity: number,
    onDismiss: () => void
  ) => {
    if (Math.abs(translationX) > threshold || Math.abs(velocity) > 500) {
      const targetX = isRTL ? -400 : 400;
      slideAnim.value = withTiming(targetX, { duration: 250 });
      opacityAnim.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) {
          runOnJS(onDismiss)();
        }
      });
    } else {
      // Snap back
      slideAnim.value = withSpring(0, SPRING_CONFIG);
      opacityAnim.value = withTiming(1, { duration: 200 });
    }
  };

  return {
    onSwipeUpdate,
    onSwipeEnd,
  };
};
