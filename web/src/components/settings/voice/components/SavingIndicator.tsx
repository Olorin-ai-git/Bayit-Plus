/**
 * Saving Indicator Component
 * Shows when settings are being saved
 */

import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface SavingIndicatorProps {
  visible: boolean;
}

export function SavingIndicator({ visible }: SavingIndicatorProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#A855F7" />
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
    color: '#6B7280',
  },
});
