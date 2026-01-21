/**
 * Voice Mode Card Component
 * Displays voice operation mode selection cards
 */

import { View, Text, Pressable } from 'react-native';
import { Check } from 'lucide-react';
import { VoiceModeOption } from '../types';

interface VoiceModeCardProps {
  mode: VoiceModeOption;
  isSelected: boolean;
  isRTL: boolean;
  onSelect: () => void;
  t: (key: string, fallback?: string) => string;
}

export function VoiceModeCard({ mode, isSelected, isRTL, onSelect, t }: VoiceModeCardProps) {
  return (
    <Pressable
      onPress={onSelect}
      className={`p-4 rounded-xl bg-white/5 border border-white/10 ${
        isRTL ? 'flex-row-reverse' : ''
      } ${
        isSelected ? 'bg-purple-900/30 border-purple-500/40' : ''
      } hover:bg-white/8`}
    >
      <View className="flex-row items-center gap-4">
        <Text className="text-[28px]">{mode.icon}</Text>
        <View className="flex-1">
          <Text className={`text-[15px] font-semibold ${isSelected ? 'text-purple-500' : 'text-white'}`}>
            {t(mode.labelKey, mode.labelKey)}
          </Text>
          <Text className={`text-xs text-gray-400 mt-0.5 ${isRTL ? 'text-right' : ''}`}>
            {t(mode.descKey, mode.descKey)}
          </Text>
        </View>
        {isSelected && (
          <Check size={20} color="#A855F7" className="ml-2" />
        )}
      </View>
    </Pressable>
  );
}
