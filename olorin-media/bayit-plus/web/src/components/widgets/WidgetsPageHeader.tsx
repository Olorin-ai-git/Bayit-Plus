/**
 * WidgetsPageHeader - Page header with title and create button
 *
 * Displays:
 * - Icon and title
 * - Widget count
 * - New widget button
 */

import { View, Text, Pressable } from 'react-native';
import { Plus, Grid3x3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useDirection } from '@/hooks/useDirection';
import { colors } from '@bayit/shared/theme';

const WidgetsPageHeaderPropsSchema = z.object({
  widgetCount: z.number(),
  onCreateWidget: z.function().args().returns(z.void()),
});

type WidgetsPageHeaderProps = z.infer<typeof WidgetsPageHeaderPropsSchema>;

/**
 * WidgetsPageHeader - Header section for widgets page
 */
export default function WidgetsPageHeader({ widgetCount, onCreateWidget }: WidgetsPageHeaderProps) {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  return (
    <View className="flex-row justify-between items-center mb-6">
      {/* Left side: Icon + Title */}
      <View className="flex-row items-center gap-3">
        <View className="w-14 h-14 rounded-full bg-purple-700/30 justify-center items-center">
          <Grid3x3 size={28} color={colors.primary} />
        </View>
        <View>
          <Text
            className="text-[32px] font-bold text-white"
            style={{ textAlign }}
          >
            {t('nav.widgets')}
          </Text>
          <Text
            className="text-sm text-gray-400 mt-1"
            style={{ textAlign }}
          >
            {widgetCount} {t('widgets.itemsTotal') || 'total widgets'}
          </Text>
        </View>
      </View>

      {/* Right side: Create button */}
      <Pressable
        className="flex-row items-center gap-2 px-4 py-2 rounded-lg bg-purple-600"
        onPress={onCreateWidget}
      >
        <Plus size={20} color={colors.text} />
        <Text className="text-sm font-semibold text-white">
          {t('common.new') || 'New Widget'}
        </Text>
      </Pressable>
    </View>
  );
}
