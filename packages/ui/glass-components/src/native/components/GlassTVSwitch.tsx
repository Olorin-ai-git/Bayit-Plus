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
  StyleSheet,
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
      style={[
        styles.container,
        isFocused && styles.containerFocused,
        disabled && styles.containerDisabled,
        style,
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.track,
          Platform.isTV && styles.trackTV,
          { backgroundColor: trackBackgroundColor },
          isFocused && styles.trackFocused,
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            Platform.isTV && styles.thumbTV,
            {
              backgroundColor: thumbColor,
              transform: [{ translateX: thumbTranslateX }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 4,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  containerFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  containerDisabled: {
    opacity: 0.5,
  },
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  trackTV: {
    width: 52,
    height: 28,
    borderRadius: 14,
  },
  trackFocused: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbTV: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});

export default GlassTVSwitch;
