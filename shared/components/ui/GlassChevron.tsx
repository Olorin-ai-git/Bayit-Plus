/**
 * GlassChevron - Animated expand/collapse chevron with glass morphism styling
 *
 * Used for tree-style navigation to expand/collapse parent nodes
 * to reveal children items.
 */

import React, { useEffect, useRef } from 'react';
import {
  Pressable,
  Animated,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, borderRadius, spacing } from '../theme';
import { isTV } from '../utils/platform';
import { useTVFocus } from '../hooks/useTVFocus';
import { useDirection } from '../../hooks/useDirection';

type ChevronSize = 'sm' | 'md' | 'lg';

interface GlassChevronProps {
  /** Whether the chevron is in expanded state */
  expanded?: boolean;
  /** Callback when chevron is pressed */
  onPress?: () => void;
  /** Size variant */
  size?: ChevronSize;
  /** Custom color for the chevron */
  color?: string;
  /** Whether the chevron is disabled */
  disabled?: boolean;
  /** Additional styles for the container */
  style?: StyleProp<ViewStyle>;
  /** TV focus support */
  hasTVPreferredFocus?: boolean;
  /** Accessibility label */
  accessibilityLabel?: string;
}

const SIZE_CONFIG: Record<ChevronSize, { container: number; icon: number; strokeWidth: number }> = {
  sm: { container: isTV ? 32 : 28, icon: isTV ? 14 : 12, strokeWidth: 2 },
  md: { container: isTV ? 40 : 36, icon: isTV ? 18 : 16, strokeWidth: 2.5 },
  lg: { container: isTV ? 48 : 44, icon: isTV ? 22 : 20, strokeWidth: 3 },
};

export const GlassChevron: React.FC<GlassChevronProps> = ({
  expanded = false,
  onPress,
  size = 'md',
  color = colors.primaryLight,
  disabled = false,
  style,
  hasTVPreferredFocus = false,
  accessibilityLabel,
}) => {
  const { isRTL } = useDirection();
  const rotateAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { handleFocus, handleBlur, focusStyle } = useTVFocus({
    styleType: 'button',
  });

  const config = SIZE_CONFIG[size];

  // Animate rotation when expanded state changes
  useEffect(() => {
    Animated.spring(rotateAnim, {
      toValue: expanded ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [expanded, rotateAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  // RTL-aware rotation:
  // LTR: collapsed = right (0deg), expanded = down (90deg)
  // RTL: collapsed = left (180deg), expanded = down (90deg)
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: isRTL ? ['180deg', '90deg'] : ['0deg', '90deg'],
  });

  const containerSize = {
    width: config.container,
    height: config.container,
  };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (expanded ? 'Collapse' : 'Expand')}
      accessibilityState={{ expanded, disabled }}
      // @ts-ignore - TV-specific prop
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      <Animated.View
        className={`items-center justify-center rounded-sm bg-white/10 border-2 border-white/20 ${disabled ? 'opacity-50' : ''}`}
        style={[
          containerSize,
          focusStyle,
          { transform: [{ scale: scaleAnim }] },
          style,
        ]}
      >
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <ChevronIcon
            size={config.icon}
            strokeWidth={config.strokeWidth}
            color={disabled ? colors.textMuted : color}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

// Custom chevron icon component (chevron-right shape)
interface ChevronIconProps {
  size: number;
  strokeWidth: number;
  color: string;
}

const ChevronIcon: React.FC<ChevronIconProps> = ({ size, strokeWidth, color }) => {
  // Using SVG-like path rendering via View transforms for cross-platform
  const lineLength = size * 0.5;
  const lineStyle: ViewStyle = {
    width: lineLength,
    height: strokeWidth,
    backgroundColor: color,
    borderRadius: strokeWidth / 2,
    position: 'absolute',
  };

  return (
    <Animated.View className="items-center justify-center" style={{ width: size, height: size }}>
      {/* Top line of chevron (angled up-right) */}
      <Animated.View
        style={[
          lineStyle,
          {
            transform: [
              { rotate: '45deg' },
              { translateY: -lineLength * 0.25 },
              { translateX: lineLength * 0.1 },
            ],
          },
        ]}
      />
      {/* Bottom line of chevron (angled down-right) */}
      <Animated.View
        style={[
          lineStyle,
          {
            transform: [
              { rotate: '-45deg' },
              { translateY: lineLength * 0.25 },
              { translateX: lineLength * 0.1 },
            ],
          },
        ]}
      />
    </Animated.View>
  );
};

export default GlassChevron;
