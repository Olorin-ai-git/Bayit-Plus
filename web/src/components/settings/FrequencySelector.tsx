/**
 * FrequencySelector Component
 * Radio button selector for comprehension quiz frequency
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@olorin/design-tokens';
import type { ComprehensionFrequency } from '@/types/comprehension';

interface FrequencySelectorProps {
  frequency: ComprehensionFrequency;
  onFrequencyChange: (frequency: ComprehensionFrequency) => void;
  isRTL?: boolean;
}

export function FrequencySelector({
  frequency,
  onFrequencyChange,
  isRTL = false,
}: FrequencySelectorProps) {
  const { t } = useTranslation();

  const frequencyOptions: {
    value: ComprehensionFrequency;
    label: string;
    description: string;
  }[] = [
    {
      value: 'off',
      label: t('comprehension.frequency.off'),
      description: t('comprehension.frequency.off_desc'),
    },
    {
      value: 'low',
      label: t('comprehension.frequency.low'),
      description: t('comprehension.frequency.low_desc'),
    },
    {
      value: 'normal',
      label: t('comprehension.frequency.normal'),
      description: t('comprehension.frequency.normal_desc'),
    },
    {
      value: 'high',
      label: t('comprehension.frequency.high'),
      description: t('comprehension.frequency.high_desc'),
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>
        {t('comprehension.frequency.title')}
      </Text>
      {frequencyOptions.map((option) => (
        <Pressable
          key={option.value}
          style={[
            styles.frequencyOption,
            isRTL && styles.frequencyOptionRTL,
          ]}
          onPress={() => onFrequencyChange(option.value)}
          accessible={true}
          accessibilityRole="radio"
          accessibilityLabel={option.label}
          accessibilityHint={option.description}
          accessibilityState={{ checked: frequency === option.value }}
        >
          <View
            style={[
              styles.radioButton,
              isRTL && styles.radioButtonRTL,
              frequency === option.value && styles.radioButtonSelected,
            ]}
          >
            {frequency === option.value && (
              <View style={styles.radioButtonInner} />
            )}
          </View>
          <View style={styles.frequencyContent}>
            <Text style={styles.frequencyLabel}>{option.label}</Text>
            <Text style={styles.frequencyDescription}>
              {option.description}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  frequencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  frequencyOptionRTL: {
    flexDirection: 'row-reverse',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.glass.border,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonRTL: {
    marginRight: 0,
    marginLeft: spacing.sm,
  },
  radioButtonSelected: {
    borderColor: colors.success.DEFAULT,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success.DEFAULT,
  },
  frequencyContent: {
    flex: 1,
  },
  frequencyLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  frequencyDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
