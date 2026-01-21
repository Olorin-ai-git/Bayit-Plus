/**
 * Sensitivity Selector Component
 * Sensitivity level selection for wake word detection
 */

import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { SensitivityOption } from '../types';

interface SensitivitySelectorProps {
  selectedSensitivity: number;
  options: SensitivityOption[];
  isRTL: boolean;
  onSensitivityChange: (sensitivity: number) => void;
}

export function SensitivitySelector({
  selectedSensitivity,
  options,
  isRTL,
  onSensitivityChange,
}: SensitivitySelectorProps) {
  const { t } = useTranslation();

  return (
    <View className="pt-2 border-t border-white/5 mt-2">
      <Text className={`text-sm font-medium text-white mb-1 ${isRTL ? 'text-right' : ''}`}>
        {t('profile.voice.wakeWordSensitivity', 'Wake Word Sensitivity')}
      </Text>
      <Text className={`text-[13px] text-white/60 mb-4 ${isRTL ? 'text-right' : ''}`}>
        {t('profile.voice.wakeWordSensitivityDesc', 'Higher sensitivity detects the wake word more easily but may cause false triggers')}
      </Text>
      <View className={`flex-row gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {options.map((sensitivity) => {
          const isSelected = Math.abs(selectedSensitivity - sensitivity.value) < 0.1;
          return (
            <Pressable
              key={sensitivity.value}
              onPress={() => onSensitivityChange(sensitivity.value)}
              className={`flex-1 items-center justify-center py-4 rounded-lg ${
                isSelected
                  ? 'bg-purple-700/30 border border-purple-400/40'
                  : 'bg-white/5 hover:bg-white/8'
              }`}
            >
              <Text
                className={`text-[13px] ${
                  isSelected ? 'text-purple-500 font-medium' : 'text-white'
                }`}
              >
                {t(`profile.voice.${sensitivity.labelKey}`, sensitivity.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
