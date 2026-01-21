/**
 * Volume Control Component
 * TTS volume slider with increment/decrement buttons
 */

import { View, Text, Pressable } from 'react-native';
import { Volume2, Plus, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VolumeControlProps {
  volume: number;
  isRTL: boolean;
  onVolumeChange: (volume: number) => void;
}

export function VolumeControl({ volume, isRTL, onVolumeChange }: VolumeControlProps) {
  const { t } = useTranslation();

  return (
    <View className="pt-2 border-t border-white/5 mt-4">
      <View className={`flex-row items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Volume2 size={14} color="#9CA3AF" />
        <Text className={`flex-1 text-[13px] font-medium text-white ${isRTL ? 'text-right' : ''}`}>
          {t('profile.voice.ttsVolume', 'Voice Volume')}
        </Text>
        <Text className="text-[13px] font-semibold text-purple-500">
          {Math.round(volume * 100)}%
        </Text>
      </View>
      <View className={`flex-row items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Pressable
          onPress={() => onVolumeChange(Math.max(0, volume - 0.1))}
          className="w-8 h-8 rounded-lg bg-white/5 justify-center items-center"
        >
          <Minus size={14} color="#ffffff" />
        </Pressable>
        <View className="flex-1 h-1 bg-white/5 rounded-sm overflow-hidden">
          <View
            className="h-full bg-purple-500 rounded-sm"
            style={{ width: `${volume * 100}%` }}
          />
        </View>
        <Pressable
          onPress={() => onVolumeChange(Math.min(1, volume + 0.1))}
          className="w-8 h-8 rounded-lg bg-white/5 justify-center items-center"
        >
          <Plus size={14} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}
