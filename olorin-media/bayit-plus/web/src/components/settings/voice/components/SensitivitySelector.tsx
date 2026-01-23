/**
 * Sensitivity Selector Component
 * Sensitivity level selection for wake word detection
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
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
      <Text
        className="text-sm font-medium text-white mb-1"
        style={[isRTL && styles.textRight]}
      >
        {t('profile.voice.wakeWordSensitivity', 'Wake Word Sensitivity')}
      </Text>
      <Text
        className="text-[13px] text-white/60 mb-4"
        style={[isRTL && styles.textRight]}
      >
        {t('profile.voice.wakeWordSensitivityDesc', 'Higher sensitivity detects the wake word more easily but may cause false triggers')}
      </Text>
      <View
        className="flex-row gap-2"
        style={[isRTL && styles.flexRowReverse]}
      >
        {options.map((sensitivity) => {
          const isSelected = Math.abs(selectedSensitivity - sensitivity.value) < 0.1;
          return (
            <Pressable
              key={sensitivity.value}
              onPress={() => onSensitivityChange(sensitivity.value)}
              className="flex-1 items-center justify-center py-4 rounded-lg"
              style={[isSelected ? styles.sensitivitySelected : styles.sensitivityUnselected]}
            >
              <Text
                className="text-[13px]"
                style={[isSelected ? styles.sensitivityTextSelected : styles.sensitivityTextUnselected]}
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

const styles = StyleSheet.create({
  textRight: {
    textAlign: 'right' as const,
  },
  flexRowReverse: {
    flexDirection: 'row-reverse' as const,
  },
  sensitivitySelected: {
    backgroundColor: 'rgba(126, 34, 206, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.4)',
  },
  sensitivityUnselected: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sensitivityTextSelected: {
    color: '#a855f7',
    fontWeight: '500',
  },
  sensitivityTextUnselected: {
    color: '#ffffff',
  },
});
