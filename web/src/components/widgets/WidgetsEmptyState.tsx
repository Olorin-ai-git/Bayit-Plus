/**
 * WidgetsEmptyState - Empty state display when no widgets exist
 *
 * Shows friendly message encouraging users to create their first widget
 */

import { View, Text } from 'react-native';
import { Grid3x3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@bayit/shared/ui';

/**
 * WidgetsEmptyState - Empty state for when no personal widgets exist
 */
export default function WidgetsEmptyState() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 justify-center items-center py-20">
      <GlassCard className="p-12 items-center">
        <Grid3x3 size={64} color="rgba(168, 85, 247, 0.5)" />
        <Text className="text-xl font-semibold text-white mt-4 mb-2">
          {t('widgets.emptyPersonal') || 'No personal widgets yet'}
        </Text>
        <Text className="text-sm text-gray-400">
          {t('widgets.emptyPersonalHint') || 'Create your first personal widget or add system widgets above'}
        </Text>
      </GlassCard>
    </View>
  );
}
