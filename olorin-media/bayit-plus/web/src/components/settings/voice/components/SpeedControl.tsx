/**
 * Speed Control Component
 * TTS speed selector with preset options
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
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
      <View className="flex-row items-center gap-2 mb-4" style={isRTL && styles.rtlRow}>
        <Gauge size={14} color={colors.textMuted} />
        <Text className="flex-1 text-[13px] font-medium text-white" style={isRTL && styles.rtlText}>
          {t('profile.voice.ttsSpeed', 'Speaking Speed')}
        </Text>
        <Text className="text-[13px] font-semibold text-purple-500">
          {speed.toFixed(1)}x
        </Text>
      </View>
      <View className="flex-row gap-2" style={isRTL && styles.rtlRow}>
        {TTS_SPEEDS.map((speedOption) => {
          const isSelected = Math.abs(speed - speedOption) < 0.05;
          return (
            <Pressable
              key={speedOption}
              onPress={() => onSpeedChange(speedOption)}
              className="flex-1 items-center justify-center py-2 rounded"
              style={[isSelected ? styles.speedSelected : styles.speedUnselected]}
            >
              <Text
                className="text-xs font-medium"
                style={[isSelected ? styles.speedTextSelected : styles.speedTextUnselected]}
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

const styles = StyleSheet.create({
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
  },
  speedSelected: {
    backgroundColor: 'rgba(126, 34, 206, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.4)',
  },
  speedUnselected: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  speedTextSelected: {
    color: '#a855f7',
  },
  speedTextUnselected: {
    color: '#ffffff',
  },
});
