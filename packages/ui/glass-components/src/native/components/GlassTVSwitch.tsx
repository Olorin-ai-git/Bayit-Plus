/**
 * GlassTVSwitch Component
 *
 * A tvOS-compatible toggle switch component with glassmorphic styling.
 * Replaces native Switch which is not available on tvOS.
 * Supports focus states and TV remote navigation.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Pressable,
  Animated,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme';

export interface GlassTVSwitchProps {
  /** Current switch value */
  value: boolean;
  /** Value change callback */
  onValueChange: (value: boolean) => void;
  /** Disable the switch */
  disabled?: boolean;
  /** Track colors for off/on states */
  trackColor?: {
    false: string;
    true: string;
  };
  /** Thumb color */
  thumbColor?: string;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic TV-compatible switch component
 */
export const GlassTVSwitch: React.FC<GlassTVSwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  trackColor = {
    false: colors.backgroundLighter,
    true: colors.primary,
  },
  thumbColor = colors.text,
  style,
  testID,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 100,
    }).start();
  }, [value, animatedValue]);

  const handleToggle = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  const thumbTranslateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, Platform.isTV ? 26 : 22],
  });

  const trackBackgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [trackColor.false, trackColor.true],
  });

  return (
    <Pressable
      onPress={handleToggle}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      disabled={disabled}
      className={`p-1 rounded-[20px] border-2 ${isFocused ? 'border-primary bg-primary/10' : 'border-transparent'} ${disabled ? 'opacity-50' : ''}`}
      style={style}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      testID={testID}
    >
      <Animated.View
        className={`justify-center ${Platform.isTV ? 'w-[52px] h-[28px] rounded-[14px]' : 'w-[44px] h-[24px] rounded-[12px]'} ${isFocused ? 'shadow-primary shadow-opacity-50 shadow-radius-8' : ''}`}
        style={{ backgroundColor: trackBackgroundColor }}
      >
        <Animated.View
          className={`shadow-md elevation-2 ${Platform.isTV ? 'w-[24px] h-[24px] rounded-[12px]' : 'w-[20px] h-[20px] rounded-[10px]'}`}
          style={{
            backgroundColor: thumbColor,
            transform: [{ translateX: thumbTranslateX }],
          }}
        />
      </Animated.View>
    </Pressable>
  );
};

export default GlassTVSwitch;
