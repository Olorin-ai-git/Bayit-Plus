import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { WatchlistCard } from './WatchlistCard';
import { z } from 'zod';

/**
 * WatchlistGrid Component
 *
 * Displays the watchlist content in a responsive grid layout.
 */

// Zod schema for props validation
const WatchlistItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  title_en: z.string().optional(),
  title_es: z.string().optional(),
  subtitle: z.string().optional(),
  subtitle_en: z.string().optional(),
  subtitle_es: z.string().optional(),
  thumbnail: z.string().optional(),
  type: z.enum(['movie', 'series', 'live', 'podcast', 'radio', 'channel']),
  category: z.string().optional(),
  is_kids_content: z.boolean().optional(),
  year: z.string().optional(),
  duration: z.string().optional(),
  addedAt: z.string().optional(),
  progress: z.number().optional(),
});

const WatchlistGridPropsSchema = z.object({
  items: z.array(WatchlistItemSchema),
  onItemPress: z.function().args(WatchlistItemSchema).returns(z.void()),
  onRemoveItem: z.function().args(z.string()).returns(z.void()),
  getLocalizedText: z.function().args(z.any(), z.string()).returns(z.string()),
});

type WatchlistItem = z.infer<typeof WatchlistItemSchema>;
type WatchlistGridProps = z.infer<typeof WatchlistGridPropsSchema>;

// Empty state component
const EmptyState: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  return (
    <View className="flex-1 justify-center items-center py-[60px]">
      <GlassCard className="p-12 items-center">
        <Text className="text-[64px] mb-4">📋</Text>
        <Text className="text-[20px] font-semibold text-white mb-2" style={[isRTL ? styles.textRight : styles.textLeft]}>
          {t('watchlist.empty')}
        </Text>
        <Text className="text-[16px] text-gray-400" style={[isRTL ? styles.textRight : styles.textLeft]}>
          {t('watchlist.emptyHint')}
        </Text>
      </GlassCard>
    </View>
  );
};

// Main grid component
export const WatchlistGrid: React.FC<WatchlistGridProps> = ({
  items,
  onItemPress,
  onRemoveItem,
  getLocalizedText,
}) => {
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={5}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 16 }}
      renderItem={({ item }) => (
        <WatchlistCard
          item={item}
          onPress={() => onItemPress(item)}
          onRemove={() => onRemoveItem(item.id)}
          getLocalizedText={getLocalizedText}
        />
      )}
      ListEmptyComponent={<EmptyState />}
    />
  );
};

const styles = StyleSheet.create({
  textRight: {
    textAlign: 'right',
  },
  textLeft: {
    textAlign: 'left',
  },
});
