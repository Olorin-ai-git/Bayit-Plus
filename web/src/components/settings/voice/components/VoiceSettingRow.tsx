/**
 * Voice Setting Row Component
 * Displays a single voice setting with toggle
 */

import { View, Text, Pressable } from 'react-native';
import { Toggle } from './Toggle';
import { SettingRowProps } from '../types';

export function VoiceSettingRow({
  label,
  description,
  value,
  onToggle,
  disabled,
  isRTL = false,
}: SettingRowProps) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      className={`flex-row items-center justify-between py-2 gap-4 ${
        isRTL ? 'flex-row-reverse' : ''
      } ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <View className="flex-1">
        <Text className={`text-[15px] font-medium text-white ${
          isRTL ? 'text-right' : ''
        } ${
          disabled ? 'text-gray-400' : ''
        }`}>
          {label}
        </Text>
        <Text className={`text-[13px] text-gray-400 mt-0.5 leading-[18px] ${
          isRTL ? 'text-right' : ''
        } ${
          disabled ? 'text-gray-500' : ''
        }`}>
          {description}
        </Text>
      </View>
      <Toggle value={value} onToggle={onToggle} disabled={disabled} />
    </Pressable>
  );
}
