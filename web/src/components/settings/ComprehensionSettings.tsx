/**
 * ComprehensionSettings Component
 * Settings panel for comprehension quiz feature configuration
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MessageSquareQuote } from 'lucide-react-native';
import { colors, spacing } from '@olorin/design-tokens';
import { useSettingsStore } from '@/stores/settingsStore';
import { CustomToggle } from './CustomToggle';
import { FrequencySelector } from './FrequencySelector';
import type { ComprehensionFrequency } from '@/types/comprehension';

interface ComprehensionSettingsProps {
  isRTL?: boolean;
}

export function ComprehensionSettings({
  isRTL = false,
}: ComprehensionSettingsProps) {
  const { t, i18n } = useTranslation();
  const isTV = Platform.isTV || Platform.OS === 'tvos';
  const isHebrew = i18n.language === 'he' || isRTL;

  const { comprehensionQuizEnabled, comprehensionQuizFrequency, updateSettings } = useSettingsStore();

  const [enabled, setEnabled] = React.useState(comprehensionQuizEnabled);
  const [frequency, setFrequency] =
    React.useState<ComprehensionFrequency>(comprehensionQuizFrequency || 'normal');

  const handleToggleEnabled = async () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    await updateSettings({ comprehensionQuizEnabled: newEnabled });
  };

  const handleFrequencyChange = async (
    newFrequency: ComprehensionFrequency
  ) => {
    setFrequency(newFrequency);
    await updateSettings({ comprehensionQuizFrequency: newFrequency });
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={[styles.header, isHebrew && styles.headerRTL]}>
        <View
          style={[styles.headerIcon, isHebrew && styles.headerIconRTL]}
        >
          <MessageSquareQuote
            size={isTV ? 28 : 20}
            color={colors.success.DEFAULT}
          />
        </View>
        <Text style={styles.headerText}>
          {t('comprehension.title')}
        </Text>
      </View>

      {/* Enable/Disable Toggle */}
      <View style={styles.toggleRow}>
        <View style={styles.toggleContent}>
          <Text style={styles.toggleLabel}>
            {t('comprehension.enable')}
          </Text>
          <Text style={styles.toggleDescription}>
            {t('comprehension.enable_desc')}
          </Text>
        </View>
        <CustomToggle enabled={enabled} onToggle={handleToggleEnabled} />
      </View>

      {/* Frequency Selector */}
      {enabled && (
        <FrequencySelector
          frequency={frequency}
          onFrequencyChange={handleFrequencyChange}
          isRTL={isHebrew}
        />
      )}

      {/* Info Message */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {t('comprehension.info_message')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glass.bg,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerIcon: {
    marginRight: spacing.sm,
  },
  headerIconRTL: {
    marginRight: 0,
    marginLeft: spacing.sm,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.borderLight,
  },
  toggleContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.success[50] + '1A',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.success.DEFAULT,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
