/**
 * Saving Indicator Component
 * Shows when settings are being saved
 */

import { View, Text, StyleSheet } from 'react-native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { useTranslation } from 'react-i18next';

interface SavingIndicatorProps {
  visible: boolean;
}

export function SavingIndicator({ visible }: SavingIndicatorProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <GlassLoadingSpinner size="small" />
      <Text style={styles.text}>{t('common.saving', 'Saving...')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  text: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
