/**
 * TVSwitch - A tvOS-compatible toggle switch component
 * Replaces native Switch which is not available on tvOS
 */
import React, { useState } from 'react';
import {
  View,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { colors } from '@olorin/design-tokens';

interface TVSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  trackColor?: {
    false: string;
    true: string;
  };
  thumbColor?: string;
}

export const TVSwitch: React.FC<TVSwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  trackColor = {
    false: colors.backgroundLighter,
    true: colors.primary,
  },
  thumbColor = colors.text,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
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
      className={`p-1 rounded-full border-2 ${isFocused || disabled ? '' : 'border-transparent'} ${isFocused ? 'border-purple-500 bg-purple-500/10' : ''} ${disabled ? 'opacity-50' : ''}`}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <Animated.View
        className={`${Platform.isTV ? 'w-[52px] h-7 rounded-[14px]' : 'w-11 h-6 rounded-xl'} justify-center`}
        style={{
          backgroundColor: trackBackgroundColor,
          ...(isFocused ? { shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8 } : {})
        }}
      >
        <Animated.View
          className={`${Platform.isTV ? 'w-6 h-6 rounded-xl' : 'w-5 h-5 rounded-full'} shadow-md`}
          style={{
            backgroundColor: thumbColor,
            transform: [{ translateX: thumbTranslateX }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 2,
          }}
        />
      </Animated.View>
    </Pressable>
  );
};

export default TVSwitch;
