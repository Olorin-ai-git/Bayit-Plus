/**
 * GlassChevron Component
 *
 * Animated expand/collapse chevron with glassmorphic styling.
 * Used for tree-style navigation and collapsible sections.
 */

import React, { useEffect, useRef } from 'react';
import {
  Pressable,
  Animated,
  ViewStyle,
  StyleProp,
  Platform,
  I18nManager,
} from 'react-native';
import { colors } from '../../theme';
import { useTVFocus } from '../../hooks/useTVFocus';

export type ChevronSize = 'sm' | 'md' | 'lg';

export interface GlassChevronProps {
  /** Expanded state */
  expanded?: boolean;
  /** Press handler */
  onPress?: () => void;
  /** Size preset */
  size?: ChevronSize;
  /** Chevron color */
  color?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** TV preferred focus */
  hasTVPreferredFocus?: boolean;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Force RTL layout */
  isRTL?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// Detect TV platform
const isTV = Platform.isTV || Platform.OS === 'android';

const SIZE_CONFIG: Record<ChevronSize, { container: number; icon: number; strokeWidth: number }> = {
  sm: { container: isTV ? 32 : 28, icon: isTV ? 14 : 12, strokeWidth: 2 },
  md: { container: isTV ? 40 : 36, icon: isTV ? 18 : 16, strokeWidth: 2.5 },
  lg: { container: isTV ? 48 : 44, icon: isTV ? 22 : 20, strokeWidth: 3 },
};

// Custom chevron icon component
interface ChevronIconProps {
  size: number;
  strokeWidth: number;
  color: string;
}

const ChevronIcon: React.FC<ChevronIconProps> = ({ size, strokeWidth, color }) => {
  const lineLength = size * 0.5;
  const lineStyle: ViewStyle = {
    width: lineLength,
    height: strokeWidth,
    backgroundColor: color,
    borderRadius: strokeWidth / 2,
    position: 'absolute',
  };

  return (
    <Animated.View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Top line of chevron */}
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
      {/* Bottom line of chevron */}
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

/**
 * Glassmorphic animated chevron component
 */
export const GlassChevron: React.FC<GlassChevronProps> = ({
  expanded = false,
  onPress,
  size = 'md',
  color = colors.primaryLight,
  disabled = false,
  style,
  hasTVPreferredFocus = false,
  accessibilityLabel,
  isRTL: forceRTL,
  testID,
}) => {
  const isRTL = forceRTL ?? I18nManager.isRTL;
  const rotateAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { handleFocus, handleBlur, focusStyle, isFocused } = useTVFocus({
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

  // RTL-aware rotation
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
      testID={testID}
      {...({ hasTVPreferredFocus } as object)}
    >
      <Animated.View
        className="items-center justify-center rounded-sm border-2"
        style={[
          containerSize,
          {
            backgroundColor: colors.glassLight,
            borderColor: colors.glassBorder,
            opacity: disabled ? 0.5 : 1,
            transform: [{ scale: scaleAnim }],
          },
          isFocused ? focusStyle : undefined,
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

export default GlassChevron;
