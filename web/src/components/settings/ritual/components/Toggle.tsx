/**
 * Toggle Component
 * Reusable toggle switch for ritual settings
 */

import { View, Pressable, StyleSheet } from 'react-native';
import { ToggleProps } from '../types';

export function Toggle({ value, onToggle, disabled }: ToggleProps) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      className="w-[52px] h-7 rounded-full p-0.5 flex-row items-center"
      style={[
        value ? styles.backgroundActive : styles.backgroundInactive,
        value && styles.justifyEnd,
        disabled && styles.disabled,
      ]}
    >
      <View className="w-6 h-6 rounded-full bg-white" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backgroundActive: {
    backgroundColor: 'rgb(147, 51, 234)', // purple-600
  },
  backgroundInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // white/10
  },
  justifyEnd: {
    justifyContent: 'flex-end',
  },
  disabled: {
    opacity: 0.5,
  },
});
