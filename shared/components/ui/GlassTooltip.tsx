import React, { useState, useRef } from 'react';
import { View, Text, Platform } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { GlassView } from './GlassView';

interface GlassTooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
}

/**
 * GlassTooltip - A tooltip component with glassmorphic styling
 * Wraps children and shows tooltip on hover (web only)
 */
export const GlassTooltip: React.FC<GlassTooltipProps> = ({
  content,
  children,
  position = 'top',
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<View>(null);

  // Only show tooltip on web with mouse hover
  if (Platform.OS !== 'web' || disabled || !content) {
    return <>{children}</>;
  }

  const getPositionClass = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  const getArrowClass = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -ml-1.5 border-[6px] border-transparent border-t-white/10';
      case 'left':
        return 'left-full top-1/2 -mt-1.5 border-[6px] border-transparent border-r-white/10';
      case 'right':
        return 'right-full top-1/2 -mt-1.5 border-[6px] border-transparent border-l-white/10';
      case 'top':
      default:
        return 'bottom-full left-1/2 -ml-1.5 border-[6px] border-transparent border-b-white/10';
    }
  };

  return (
    <View
      ref={containerRef}
      className="relative"
      // @ts-ignore - web only
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <View className={`absolute z-[1000] pointer-events-none ${getPositionClass()}`}>
          <GlassView className="px-4 py-2 rounded-lg max-w-[200px] min-w-[150px]" intensity="high">
            <Text className="text-[13px] text-center leading-[18px]" style={{ color: colors.text }}>{content}</Text>
          </GlassView>
          <View className={`absolute w-0 h-0 border-solid ${getArrowClass()}`} />
        </View>
      )}
    </View>
  );
};

export default GlassTooltip;
