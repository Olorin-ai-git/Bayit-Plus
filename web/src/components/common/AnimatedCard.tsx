/**
 * AnimatedCard - Wrapper component for staggered fade-in/slide-in animations
 * 
 * Uses CSS animations for smooth performance. Automatically calculates
 * animation delay based on the item's index for staggering effect.
 */

import React from 'react';
import { View, ViewStyle } from 'react-native';

// Animation styles are in shared/styles/globals.css

interface AnimatedCardProps {
  index: number;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'grid' | 'carousel' | 'row';
  isRTL?: boolean;
  /** Maximum index for delay calculation (prevents very long delays for large lists) */
  maxDelayIndex?: number;
}

/**
 * Wraps children with staggered animation based on index
 */
export default function AnimatedCard({
  index,
  children,
  style,
  variant = 'grid',
  isRTL = false,
  maxDelayIndex = 50,
}: AnimatedCardProps) {
  // Cap the delay index to prevent extremely long delays
  const delayIndex = Math.min(index, maxDelayIndex - 1);
  
  // Build CSS class names based on variant and index
  let className = '';
  
  switch (variant) {
    case 'carousel':
      className = `animated-carousel-card${isRTL ? '-rtl' : ''} animated-carousel-delay-${Math.min(delayIndex, 15)}`;
      break;
    case 'row':
      className = `animated-row${isRTL ? '-rtl' : ''} animated-row-delay-${Math.min(delayIndex, 19)}`;
      break;
    case 'grid':
    default:
      className = `animated-card animated-card-delay-${delayIndex}`;
      break;
  }

  return (
    <View 
      style={style}
      // @ts-ignore - Web-specific className prop
      className={className}
    >
      {children}
    </View>
  );
}

/**
 * Hook to get animation class names directly (for components that can't use AnimatedCard wrapper)
 */
export function useStaggerAnimation(
  index: number,
  variant: 'grid' | 'carousel' | 'row' = 'grid',
  isRTL = false,
  maxDelayIndex = 50
): string {
  const delayIndex = Math.min(index, maxDelayIndex - 1);
  
  switch (variant) {
    case 'carousel':
      return `animated-carousel-card${isRTL ? '-rtl' : ''} animated-carousel-delay-${Math.min(delayIndex, 15)}`;
    case 'row':
      return `animated-row${isRTL ? '-rtl' : ''} animated-row-delay-${Math.min(delayIndex, 19)}`;
    case 'grid':
    default:
      return `animated-card animated-card-delay-${delayIndex}`;
  }
}
