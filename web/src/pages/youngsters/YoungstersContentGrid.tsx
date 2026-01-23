/**
 * YoungstersContentGrid - Grid layout with loading and empty states
 */

import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { GlassCard } from '@bayit/shared/ui';
import { platformClass } from '@/utils/platformClass';
import YoungstersContentCard from './YoungstersContentCard';
import { YoungstersContentItemSchema } from './types';

const YoungstersContentGridPropsSchema = z.object({
  content: z.array(YoungstersContentItemSchema),
  isLoading: z.boolean(),
  numColumns: z.number(),
});

type YoungstersContentGridProps = z.infer<typeof YoungstersContentGridPropsSchema>;

/**
 * Content grid with loading and empty states
 * Displays content in responsive grid layout
 */
export default function YoungstersContentGrid({
  content,
  isLoading,
  numColumns,
}: YoungstersContentGridProps) {
  const { t } = useTranslation();

  // Loading state
  if (isLoading) {
    return (
      <View className={platformClass('flex-1 justify-center items-center py-20')}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  // Empty state
  if (content.length === 0) {
    return (
      <View className={platformClass('flex-1 justify-center items-center py-20')}>
        <GlassCard className={platformClass('p-6 items-center bg-purple-500/10')}>
          <Text className={platformClass('text-6xl mb-4')}>🎯</Text>
          <Text className={platformClass('text-xl font-semibold text-purple-500 mb-2')}>
            {t('youngsters.noContent')}
          </Text>
          <Text className={platformClass('text-base text-gray-400')}>
            {t('youngsters.tryAnotherCategory')}
          </Text>
        </GlassCard>
      </View>
    );
  }

  // Content grid
  return (
    <FlatList
      data={content}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      key={numColumns}
      contentContainerStyle={{ gap: 16 }}
      columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
      renderItem={({ item }) => (
        <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
          <YoungstersContentCard item={item} />
        </View>
      )}
    />
  );
}
