/**
 * Sensitivity Selector Component
 * Sensitivity level selection for wake word detection
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
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
    <View style={styles.container}>
      <Text
        style={[styles.title, isRTL && styles.textRight]}
      >
        {t('profile.voice.wakeWordSensitivity', 'Wake Word Sensitivity')}
      </Text>
      <Text
        style={[styles.description, isRTL && styles.textRight]}
      >
        {t('profile.voice.wakeWordSensitivityDesc', 'Higher sensitivity detects the wake word more easily but may cause false triggers')}
      </Text>
      <View
        style={[styles.optionsRow, isRTL && styles.flexRowReverse]}
      >
        {options.map((sensitivity) => {
          const isSelected = Math.abs(selectedSensitivity - sensitivity.value) < 0.1;
          return (
            <Pressable
              key={sensitivity.value}
              onPress={() => onSensitivityChange(sensitivity.value)}
              style={[
                styles.option,
                isSelected ? styles.sensitivitySelected : styles.sensitivityUnselected
              ]}
            >
              <Text
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
  container: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
  },
  textRight: {
    textAlign: 'right',
  },
  flexRowReverse: {
    flexDirection: 'row-reverse',
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
    fontSize: 13,
    color: '#a855f7',
    fontWeight: '500',
  },
  sensitivityTextUnselected: {
    fontSize: 13,
    color: '#ffffff',
  },
});
