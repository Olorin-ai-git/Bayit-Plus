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
    <View style={styles.sensitivitySection}>
      <Text style={[styles.sensitivityLabel, isRTL && styles.textRTL]}>
        {t('profile.voice.wakeWordSensitivity', 'Wake Word Sensitivity')}
      </Text>
      <Text style={[styles.sensitivityDesc, isRTL && styles.textRTL]}>
        {t('profile.voice.wakeWordSensitivityDesc', 'Higher sensitivity detects the wake word more easily but may cause false triggers')}
      </Text>
      <View style={[styles.sensitivityOptions, isRTL && styles.sensitivityOptionsRTL]}>
        {options.map((sensitivity) => {
          const isSelected = Math.abs(selectedSensitivity - sensitivity.value) < 0.1;
          return (
            <Pressable
              key={sensitivity.value}
              onPress={() => onSensitivityChange(sensitivity.value)}
              style={({ hovered }: any) => [
                styles.sensitivityOption,
                isSelected && styles.sensitivityOptionSelected,
                hovered && styles.sensitivityOptionHovered,
              ]}
            >
              <Text
                style={[
                  styles.sensitivityText,
                  isSelected && styles.sensitivityTextSelected,
                ]}
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
  sensitivitySection: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: spacing.sm,
  },
  sensitivityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  sensitivityDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  textRTL: {
    textAlign: 'right',
  },
  sensitivityOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sensitivityOptionsRTL: {
    flexDirection: 'row-reverse',
  },
  sensitivityOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sensitivityOptionSelected: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  sensitivityOptionHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sensitivityText: {
    fontSize: 13,
    color: colors.text,
  },
  sensitivityTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
});
