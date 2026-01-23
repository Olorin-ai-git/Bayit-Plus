/**
 * AnimatedCard - Wrapper component for staggered fade-in/slide-in animations
 * 
 * Uses CSS animations with native div elements for web.
 * Automatically calculates animation delay based on the item's index.
 */

import React, { CSSProperties } from 'react';
import { View, ViewStyle, Platform, StyleSheet } from 'react-native';

interface AnimatedCardProps {
  index: number;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[] | any;
  className?: string;
  variant?: 'grid' | 'carousel' | 'row';
  isRTL?: boolean;
  /** Maximum index for delay calculation (prevents very long delays for large lists) */
  maxDelayIndex?: number;
}

// Delay increments in milliseconds for each variant
const DELAY_INCREMENT = {
  grid: 40,
  carousel: 50,
  row: 30,
};

// Maximum delays for each variant
const MAX_DELAY_INDEX = {
  grid: 50,
  carousel: 15,
  row: 20,
};

/**
 * Wraps children with staggered animation based on index
 */
export default function AnimatedCard({
  index,
  children,
  style,
  className,
  variant = 'grid',
  isRTL = false,
  maxDelayIndex = 50,
}: AnimatedCardProps) {
  // Cap the delay index to prevent extremely long delays
  const maxIndex = Math.min(maxDelayIndex, MAX_DELAY_INDEX[variant]);
  const delayIndex = Math.min(index, maxIndex - 1);
  const delayMs = delayIndex * DELAY_INCREMENT[variant];

  // Get the appropriate animation name
  const getAnimationName = (): string => {
    switch (variant) {
      case 'carousel':
        return isRTL ? 'carouselCardSlideInRTL' : 'carouselCardSlideIn';
      case 'row':
        return isRTL ? 'rowFadeSlideInRTL' : 'rowFadeSlideIn';
      case 'grid':
      default:
        return 'cardFadeSlideIn';
    }
  };

  // Only apply animations on web platform
  if (Platform.OS !== 'web') {
    return <View style={style} className={className}>{children}</View>;
  }

  const animationName = getAnimationName();
  const duration = variant === 'row' ? '0.35s' : '0.4s';
  const easing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

  // Flatten styles for web
  const flattenedStyle = StyleSheet.flatten(style) || {};

  // Create web-compatible CSS styles
  const webStyle: CSSProperties = {
    ...flattenedStyle,
    animation: `${animationName} ${duration} ${easing} ${delayMs}ms both`,
  };

  return (
    <div style={webStyle} className={className}>
      {children}
    </div>
  );
}

/**
 * Hook to get animation styles directly (for components that can't use AnimatedCard wrapper)
 */
export function useStaggerAnimationStyle(
  index: number,
  variant: 'grid' | 'carousel' | 'row' = 'grid',
  isRTL = false,
  maxDelayIndex = 50
): CSSProperties {
  if (Platform.OS !== 'web') {
    return {};
  }

  const maxIndex = Math.min(maxDelayIndex, MAX_DELAY_INDEX[variant]);
  const delayIndex = Math.min(index, maxIndex - 1);
  const delayMs = delayIndex * DELAY_INCREMENT[variant];

  const getAnimationName = () => {
    switch (variant) {
      case 'carousel':
        return isRTL ? 'carouselCardSlideInRTL' : 'carouselCardSlideIn';
      case 'row':
        return isRTL ? 'rowFadeSlideInRTL' : 'rowFadeSlideIn';
      case 'grid':
      default:
        return 'cardFadeSlideIn';
    }
  };

  const animationName = getAnimationName();
  const duration = variant === 'row' ? '0.35s' : '0.4s';
  const easing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

  return {
    animation: `${animationName} ${duration} ${easing} ${delayMs}ms both`,
  };
}
