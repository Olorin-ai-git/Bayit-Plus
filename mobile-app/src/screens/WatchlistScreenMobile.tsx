/**
 * WatchlistScreenMobile
 *
 * Mobile-optimized watchlist screen with responsive grid
 * Features:
 * - 2 columns on phone
 * - 3-5 columns on tablet (based on orientation)
 * - Filter tabs (All, Continue, Movies, Series)
 * - Pull-to-refresh
 * - Progress indicator for continue watching
 * - Touch-optimized watchlist cards
 * - Remove from watchlist functionality
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { watchlistService } from '@bayit/shared-services';
import { GlassView, GlassCategoryPill } from '@bayit/shared';
import { getLocalizedName } from '@bayit/shared-utils';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
import { spacing, colors, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

interface WatchlistItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
  type: 'movie' | 'series';
  year?: string;
  duration?: string;
  addedAt?: string;
  progress?: number; // 0-100 for continue watching
}

type FilterType = 'all' | 'continue' | 'movies' | 'series';

type WatchlistRoute = RouteProp<RootStackParamList, 'Watchlist'>;

export const WatchlistScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<WatchlistRoute>();
  const { isRTL, direction } = useDirection();
  const { orientation } = useResponsive();

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const currentLang = i18n.language;

  // Responsive column count: 2 on phone, 3-5 on tablet based on orientation
  const numColumns = getGridColumns({
    phone: 2,
    tablet: orientation === 'landscape' ? 5 : 3,
  });

  useEffect(() => {
    loadWatchlist();
  }, [i18n.language]);

  const loadWatchlist = async () => {
    try {
      setIsLoading(true);
      const response = await watchlistService.getWatchlist();
      const items = response.items || response.watchlist || [];
      setWatchlist(items);
    } catch (error) {
      console.error('Error loading watchlist:', error);
      setWatchlist([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWatchlist();
    setRefreshing(false);
  }, []);

  const filteredWatchlist = watchlist.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'movies') return item.type === 'movie';
    if (filter === 'series') return item.type === 'series';
    if (filter === 'continue') return item.progress !== undefined && item.progress > 0;
    return true;
  });

  const handleItemPress = (item: WatchlistItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedName(item, currentLang),
      type: 'vod' as const,
    });
  };

  const handleRemoveFromWatchlist = async (item: WatchlistItem) => {
    try {
      await watchlistService.removeFromWatchlist(item.id);
      setWatchlist((prev) => prev.filter((w) => w.id !== item.id));
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
  };

  const filterOptions: { id: FilterType; labelKey: string }[] = [
    { id: 'all', labelKey: 'watchlist.filters.all' },
    { id: 'continue', labelKey: 'watchlist.filters.continue' },
    { id: 'movies', labelKey: 'watchlist.filters.movies' },
    { id: 'series', labelKey: 'watchlist.filters.series' },
  ];

  const renderWatchlistItem = ({ item }: { item: WatchlistItem }) => {
    const localizedTitle = getLocalizedName(item, currentLang);
    const typeIcon = item.type === 'movie' ? '🎬' : '📺';

    return (
      <View className="flex-1 px-1 py-2">
        <Pressable onPress={() => handleItemPress(item)}>
          <GlassView className="rounded-xl overflow-hidden">
            {/* Thumbnail */}
            {item.thumbnail ? (
              <Image
                source={{ uri: item.thumbnail }}
                className="w-full aspect-video bg-white/5"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full aspect-video bg-white/5 items-center justify-center">
                <Text className="text-5xl">{typeIcon}</Text>
              </View>
            )}

            {/* Progress bar for continue watching */}
            {item.progress !== undefined && item.progress > 0 && (
              <View className="absolute bottom-[52px] left-0 right-0 h-1 bg-black/50">
                <View className="h-full" style={{ width: `${item.progress}%`, backgroundColor: colors.primary }} />
              </View>
            )}

            {/* Type badge */}
            <View className="absolute top-2 rounded-xl px-2 py-1 bg-black/70" style={isRTL ? { left: 8 } : { right: 8 }}>
              <Text className="text-sm">{typeIcon}</Text>
            </View>

            {/* Remove button */}
            <Pressable
              className="absolute top-2 w-7 h-7 rounded-full bg-red-500/90 justify-center items-center"
              style={isRTL ? { right: 8 } : { left: 8 }}
              onPress={() => handleRemoveFromWatchlist(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-sm font-bold" style={{ color: colors.text }}>✕</Text>
            </Pressable>

            {/* Card info */}
            <View className="p-4">
              <Text
                className="text-white text-lg font-semibold mb-1"
                style={{ textAlign: isRTL ? 'right' : 'left', ...typography.h4 }}
                numberOfLines={2}
              >
                {localizedTitle}
              </Text>
              <Text
                className="text-gray-400 text-xs"
                style={{ textAlign: isRTL ? 'right' : 'left', ...typography.caption }}
              >
                {item.year}
                {item.year && item.duration ? ' • ' : ''}
                {item.duration}
              </Text>
              {item.progress !== undefined && item.progress > 0 && (
                <Text
                  className="text-xs font-semibold mt-1"
                  style={{ textAlign: isRTL ? 'right' : 'left', color: colors.primary, ...typography.caption }}
                >
                  {item.progress}% {t('watchlist.watched')}
                </Text>
              )}
            </View>
          </GlassView>
        </Pressable>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4" style={{ ...typography.body, color: colors.text }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className="items-center px-6 pt-6 pb-4" style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}>
        <View
          className="w-12 h-12 rounded-full bg-purple-500/20 justify-center items-center"
          style={{ marginLeft: isRTL ? spacing.md : 0, marginRight: isRTL ? 0 : spacing.md }}
        >
          <Text className="text-2xl">📋</Text>
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold" style={{ textAlign: isRTL ? 'right' : 'left', ...typography.h2 }}>
            {t('watchlist.title')}
          </Text>
          <Text className="text-gray-400 text-xs mt-0.5" style={{ textAlign: isRTL ? 'right' : 'left', ...typography.caption }}>
            {watchlist.length} {t('watchlist.items')}
          </Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View className="py-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
        >
          {filterOptions.map((option) => (
            <GlassCategoryPill
              key={option.id}
              category={{ id: option.id, name: t(option.labelKey) }}
              selected={filter === option.id}
              onPress={() => handleFilterChange(option.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Watchlist grid */}
      <FlatList
        key={`grid-${numColumns}`}
        data={filteredWatchlist}
        renderItem={renderWatchlistItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: spacing.md }}
        contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20 px-6">
            <GlassView className="p-8 items-center w-full">
              <Text className="text-6xl mb-4">📋</Text>
              <Text className="text-white font-semibold text-xl mb-2" style={{ textAlign: isRTL ? 'right' : 'left', ...typography.h3 }}>
                {t('watchlist.empty')}
              </Text>
              <Text className="text-gray-400 text-center" style={{ textAlign: isRTL ? 'right' : 'left', ...typography.body }}>
                {t('watchlist.emptyHint')}
              </Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

export default WatchlistScreenMobile;
