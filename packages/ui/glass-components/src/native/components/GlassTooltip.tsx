/**
 * GlassTooltip Component
 *
 * Tooltip with glassmorphic styling.
 * Web-only component that shows on hover.
 */

import React, { useState, useRef } from 'react';
import { View, Text, Platform } from 'react-native';
import { colors, spacing } from '../../theme';
import { GlassView } from './GlassView';

export interface GlassTooltipProps {
  /** Tooltip content text */
  content: string;
  /** Element to wrap */
  children: React.ReactNode;
  /** Tooltip position */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Disable tooltip */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic tooltip component (web only)
 */
export const GlassTooltip: React.FC<GlassTooltipProps> = ({
  content,
  children,
  position = 'top',
  disabled = false,
  testID,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<View>(null);

  // Only show tooltip on web with mouse hover
  if (Platform.OS !== 'web' || disabled || !content) {
    return <>{children}</>;
  }

  const getPositionClassName = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-[75px] mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-[20px] mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-[20px] ml-2';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-[75px] mb-2';
    }
  };

  const getArrowClassName = () => {
    const baseClasses = 'absolute w-0 h-0 border-[6px] border-solid border-transparent';
    switch (position) {
      case 'bottom':
        return `${baseClasses} bottom-full left-1/2 -ml-[6px] border-b-white/10`;
      case 'left':
        return `${baseClasses} left-full top-1/2 -mt-[6px] border-l-white/10`;
      case 'right':
        return `${baseClasses} right-full top-1/2 -mt-[6px] border-r-white/10`;
      case 'top':
      default:
        return `${baseClasses} top-full left-1/2 -ml-[6px] border-t-white/10`;
    }
  };

  return (
    <View
      ref={containerRef}
      className="relative"
      testID={testID}
      {...{
        onMouseEnter: () => setIsVisible(true),
        onMouseLeave: () => setIsVisible(false),
      }}
    >
      {children}

      {isVisible && (
        <View className={`absolute z-[1000] ${getPositionClassName()}`}>
          <GlassView className="px-4 py-2 rounded-lg max-w-[200px] min-w-[150px]" intensity="high">
            <Text className="text-[13px] text-center leading-[18px]" style={{ color: colors.text }}>{content}</Text>
          </GlassView>
          <View className={getArrowClassName()} />
        </View>
      )}
    </View>
  );
};

export default GlassTooltip;
