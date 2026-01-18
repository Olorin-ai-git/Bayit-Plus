/**
 * Saving Indicator Component
 * Shows when settings are being saved
 */

import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@bayit/shared/theme';

interface SavingIndicatorProps {
  visible: boolean;
}

export function SavingIndicator({ visible }: SavingIndicatorProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <View style={styles.savingIndicator}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.savingText}>{t('common.saving', 'Saving...')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  savingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
