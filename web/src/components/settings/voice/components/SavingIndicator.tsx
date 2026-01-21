/**
 * Saving Indicator Component
 * Shows when settings are being saved
 */

import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';

interface SavingIndicatorProps {
  visible: boolean;
}

export function SavingIndicator({ visible }: SavingIndicatorProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <View className="flex-row items-center justify-center gap-2 p-4">
      <ActivityIndicator size="small" color="#A855F7" />
      <Text className="text-sm text-gray-500">{t('common.saving', 'Saving...')}</Text>
    </View>
  );
}
