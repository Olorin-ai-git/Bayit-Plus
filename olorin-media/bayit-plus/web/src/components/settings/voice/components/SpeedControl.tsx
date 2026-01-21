/**
 * Speed Control Component
 * TTS speed selector with preset options
 */

import { View, Text, Pressable } from 'react-native';
import { Gauge } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

const TTS_SPEEDS = [0.75, 1.0, 1.25, 1.5];

interface SpeedControlProps {
  speed: number;
  isRTL: boolean;
  onSpeedChange: (speed: number) => void;
}

export function SpeedControl({ speed, isRTL, onSpeedChange }: SpeedControlProps) {
  const { t } = useTranslation();

  return (
    <View className="pt-2 border-t border-white/5 mt-4">
      <View className={`flex-row items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Gauge size={14} color={colors.textMuted} />
        <Text className={`flex-1 text-[13px] font-medium text-white ${isRTL ? 'text-right' : ''}`}>
          {t('profile.voice.ttsSpeed', 'Speaking Speed')}
        </Text>
        <Text className="text-[13px] font-semibold text-purple-500">
          {speed.toFixed(1)}x
        </Text>
      </View>
      <View className={`flex-row gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {TTS_SPEEDS.map((speedOption) => {
          const isSelected = Math.abs(speed - speedOption) < 0.05;
          return (
            <Pressable
              key={speedOption}
              onPress={() => onSpeedChange(speedOption)}
              className={`flex-1 items-center justify-center py-2 rounded ${
                isSelected
                  ? 'bg-purple-700/30 border border-purple-400/40'
                  : 'bg-white/5'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  isSelected ? 'text-purple-500' : 'text-white'
                }`}
              >
                {speedOption === 1.0 ? t('common.normal', 'Normal') : `${speedOption}x`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
