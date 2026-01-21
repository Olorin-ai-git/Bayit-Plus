/**
 * Toggle Component
 * Reusable toggle switch for settings
 */

import { View, Pressable } from 'react-native';
import { colors } from '@bayit/shared/theme';
import { ToggleProps } from '../types';

export function Toggle({ value, onToggle, disabled }: ToggleProps) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      className={`w-[52px] h-7 rounded-full p-0.5 flex-row items-center ${
        value ? 'bg-purple-600 justify-end' : 'bg-white/10'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <View className="w-6 h-6 rounded-full bg-white" />
    </Pressable>
  );
}
