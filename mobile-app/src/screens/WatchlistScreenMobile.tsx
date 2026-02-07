/**
 * PlaylistScreenMobile
 *
 * Mobile-optimized playlist screen with responsive grid
 * Features:
 * - 2 columns on phone
 * - 3-5 columns on tablet (based on orientation)
 * - Filter tabs (All, Continue, Movies, Series)
 * - Pull-to-refresh
 * - Progress indicator for continue watching
 * - Touch-optimized playlist cards
 * - Remove from playlist functionality
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
import { playlistService } from '@bayit/shared-services';
import { GlassView, GlassCategoryPill } from '@bayit/shared';
import { getLocalizedName } from '@bayit/shared-utils';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useResponsive } from '../hooks/useResponsive';
import { useSafeAreaPadding } from '../hooks/useSafeAreaPadding';
import { getGridColumns } from '../utils/responsive';
import { spacing, colors, typography } from '@olorin/design-tokens';
import type { RootStackParamList } from '../navigation/types';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('PlaylistScreenMobile');

interface PlaylistItem {
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

type PlaylistRoute = RouteProp<RootStackParamList, 'Playlist'>;

export const PlaylistScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<PlaylistRoute>();
  const { isRTL, direction } = useDirection();
  const { orientation } = useResponsive();
  const safeAreaPadding = useSafeAreaPadding();

  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
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
    loadPlaylist();
  }, [i18n.language]);

  const loadPlaylist = async () => {
    try {
      setIsLoading(true);
      const response = await playlistService.getPlaylist();
      const items = response.items || [];
      setPlaylistItems(items);
    } catch (error) {
      moduleLogger.error('Error loading playlist:', error);
      setPlaylistItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPlaylist();
    setRefreshing(false);
  }, []);

  const filteredItems = playlistItems.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'movies') return item.type === 'movie';
    if (filter === 'series') return item.type === 'series';
    if (filter === 'continue') return item.progress !== undefined && item.progress > 0;
    return true;
  });

  const handleItemPress = (item: PlaylistItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedName(item, currentLang),
      type: 'vod' as const,
    });
  };

  const handleRemove = async (item: PlaylistItem) => {
    try {
      await playlistService.removeItem(item.id);
      setPlaylistItems((prev) => prev.filter((w) => w.id !== item.id));
    } catch (error) {
      moduleLogger.error('Error removing from playlist:', error);
    }
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
  };

  const filterOptions: { id: FilterType; labelKey: string }[] = [
    { id: 'all', labelKey: 'playlist.filters.all' },
    { id: 'continue', labelKey: 'playlist.filters.continue' },
    { id: 'movies', labelKey: 'playlist.filters.movies' },
    { id: 'series', labelKey: 'playlist.filters.series' },
  ];

  const renderPlaylistItem = ({ item }: { item: PlaylistItem }) => {
    const localizedTitle = getLocalizedName(item, currentLang);
    const typeIconName = item.type === 'movie' ? 'vod' : 'live';

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
                <NativeIcon name={typeIconName} size="xxl" color="#a855f7" />
              </View>
            )}

            {/* Progress bar for continue watching */}
            {item.progress !== undefined && item.progress > 0 && (
              <View className="absolute bottom-[52px] left-0 right-0 h-1 bg-black/50">
                <View className="h-full" style={{ width: `${item.progress}%`, backgroundColor: colors.primary.DEFAULT }} />
              </View>
            )}

            {/* Type badge */}
            <View className="absolute top-2 rounded-xl px-2 py-1 bg-black/70" style={isRTL ? { left: 8 } : { right: 8 }}>
              <NativeIcon name={typeIconName} size="sm" color="#ffffff" />
            </View>

            {/* Remove button */}
            <Pressable
              className="absolute top-2 w-7 h-7 rounded-full bg-red-500/90 justify-center items-center"
              style={isRTL ? { right: 8 } : { left: 8 }}
              onPress={() => handleRemove(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <NativeIcon name="x" size="sm" color={colors.text} />
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
                  style={{ textAlign: isRTL ? 'right' : 'left', color: colors.primary.DEFAULT, ...typography.caption }}
                >
                  {item.progress}% {t('playlist.watched')}
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
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text className="mt-4" style={{ ...typography.body, color: colors.text }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={[{ backgroundColor: colors.background }, safeAreaPadding]}>
      {/* Header */}
      <View className="items-center px-6 pb-4" style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}>
        <View
          className="w-12 h-12 rounded-full bg-purple-500/20 justify-center items-center"
          style={{ marginLeft: isRTL ? spacing.md : 0, marginRight: isRTL ? 0 : spacing.md }}
        >
          <NativeIcon name="clipboard" size="lg" color="#a855f7" />
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold" style={{ textAlign: isRTL ? 'right' : 'left', ...typography.h2 }}>
            {t('playlist.title')}
          </Text>
          <Text className="text-gray-400 text-xs mt-0.5" style={{ textAlign: isRTL ? 'right' : 'left', ...typography.caption }}>
            {playlistItems.length} {t('playlist.items')}
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

      {/* Playlist grid */}
      <FlatList
        key={`grid-${numColumns}`}
        data={filteredItems}
        renderItem={renderPlaylistItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: spacing.md }}
        contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.DEFAULT}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20 px-6">
            <GlassView className="p-8 items-center w-full">
              <View className="mb-4">
                <NativeIcon name="clipboard" size="xxl" color="#a855f7" />
              </View>
              <Text className="text-white font-semibold text-xl mb-2" style={{ textAlign: isRTL ? 'right' : 'left', ...typography.h3 }}>
                {t('playlist.empty')}
              </Text>
              <Text className="text-gray-400 text-center" style={{ textAlign: isRTL ? 'right' : 'left', ...typography.body }}>
                {t('playlist.emptyHint')}
              </Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

export default PlaylistScreenMobile;
