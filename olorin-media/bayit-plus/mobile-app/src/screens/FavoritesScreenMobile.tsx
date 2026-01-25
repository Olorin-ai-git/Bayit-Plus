/**
 * FavoritesScreenMobile
 *
 * Mobile-optimized favorites screen with responsive grid
 * Features:
 * - 2 columns on phone
 * - 3-5 columns on tablet (based on orientation)
 * - Pull-to-refresh
 * - Touch-optimized favorite cards
 * - Remove favorite functionality
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { favoritesService } from '@bayit/shared-services';
import { GlassView } from '@bayit/shared';
import { getLocalizedName, getLocalizedDescription } from '@bayit/shared-utils';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
import { spacing, colors, typography } from '@olorin/design-tokens';
import type { RootStackParamList } from '../navigation/types';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('FavoritesScreenMobile');

interface FavoriteItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
  type: 'movie' | 'series' | 'channel' | 'podcast' | 'radio';
  addedAt?: string;
}

const TYPE_ICONS: Record<string, string> = {
  movie: '🎬',
  series: '📺',
  channel: '📡',
  podcast: '🎙️',
  radio: '📻',
};

type FavoritesRoute = RouteProp<RootStackParamList, 'Favorites'>;

export const FavoritesScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<FavoritesRoute>();
  const { isRTL, direction } = useDirection();
  const { orientation } = useResponsive();

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentLang = i18n.language;

  // Responsive column count: 2 on phone, 3-5 on tablet based on orientation
  const numColumns = getGridColumns({
    phone: 2,
    tablet: orientation === 'landscape' ? 5 : 3,
  });

  useEffect(() => {
    loadFavorites();
  }, [i18n.language]);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const response = await favoritesService.getFavorites();
      const items = response.items || response.favorites || [];
      setFavorites(items);
    } catch (error) {
      moduleLogger.error('Error loading favorites:', error);
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  }, []);

  const handleItemPress = (item: FavoriteItem) => {
    const typeMap: Record<string, 'vod' | 'live' | 'radio' | 'podcast'> = {
      movie: 'vod',
      series: 'vod',
      channel: 'live',
      podcast: 'podcast',
      radio: 'radio',
    };

    navigation.navigate('Player', {
      id: item.id,
      title: getLocalizedName(item, currentLang),
      type: typeMap[item.type] || 'vod',
    });
  };

  const handleRemoveFavorite = async (item: FavoriteItem) => {
    try {
      await favoritesService.removeFromFavorites(item.id);
      setFavorites((prev) => prev.filter((f) => f.id !== item.id));
    } catch (error) {
      moduleLogger.error('Error removing favorite:', error);
    }
  };

  const renderFavorite = ({ item }: { item: FavoriteItem }) => {
    const localizedTitle = getLocalizedName(item, currentLang);
    const localizedSubtitle = item.subtitle
      ? currentLang === 'he'
        ? item.subtitle
        : currentLang === 'es'
          ? item.subtitle_es || item.subtitle_en || item.subtitle
          : item.subtitle_en || item.subtitle
      : undefined;

    return (
      <View className="flex-1 px-1 py-2">
        <Pressable onPress={() => handleItemPress(item)}>
          <GlassView className="rounded-xl overflow-hidden">
            {/* Thumbnail */}
            {item.thumbnail ? (
              <Image
                source={{ uri: item.thumbnail }}
                className="w-full aspect-video"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full aspect-video bg-white/5 justify-center items-center">
                <Text className="text-5xl">
                  {TYPE_ICONS[item.type] || '⭐'}
                </Text>
              </View>
            )}

            {/* Type badge */}
            <View className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} bg-black/70 rounded-xl px-2 py-1`}>
              <Text className="text-sm">{TYPE_ICONS[item.type]}</Text>
            </View>

            {/* Remove button */}
            <Pressable
              className={`absolute top-2 ${isRTL ? 'right-2' : 'left-2'} w-7 h-7 rounded-full bg-red-500/90 justify-center items-center`}
              onPress={() => handleRemoveFavorite(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-sm text-white font-bold">✕</Text>
            </Pressable>

            {/* Card info */}
            <View className="p-4">
              <Text
                className={`text-base font-semibold text-white mb-1 ${isRTL ? 'text-right' : 'text-left'}`}
                style={{ textAlign: isRTL ? 'right' : 'left' }}
                numberOfLines={2}
              >
                {localizedTitle}
              </Text>
              {localizedSubtitle && (
                <Text
                  className={`text-xs text-text-secondary ${isRTL ? 'text-right' : 'text-left'}`}
                  style={{ textAlign: isRTL ? 'right' : 'left' }}
                  numberOfLines={1}
                >
                  {localizedSubtitle}
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
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-base text-white mt-4">{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className={`flex-row items-center px-6 pt-6 pb-4 ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
        <View
          className="w-12 h-12 rounded-full bg-yellow-500/20 justify-center items-center"
          style={{ marginLeft: isRTL ? 16 : 0, marginRight: isRTL ? 0 : 16 }}
        >
          <Text className="text-2xl">⭐</Text>
        </View>
        <View className="flex-1">
          <Text className={`text-3xl font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`} style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('favorites.title')}
          </Text>
          <Text className={`text-xs text-text-secondary mt-0.5 ${isRTL ? 'text-right' : 'text-left'}`} style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {favorites.length} {t('favorites.items')}
          </Text>
        </View>
      </View>

      {/* Favorites grid */}
      <FlatList
        key={`grid-${numColumns}`}
        data={favorites}
        renderItem={renderFavorite}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-24 px-6">
            <GlassView className="p-8 items-center w-full">
              <Text className="text-6xl mb-4">⭐</Text>
              <Text className={`text-xl font-semibold text-white mb-2 ${isRTL ? 'text-right' : 'text-left'}`} style={{ textAlign: isRTL ? 'right' : 'left' }}>
                {t('favorites.empty')}
              </Text>
              <Text className={`text-base text-text-secondary text-center ${isRTL ? 'text-right' : 'text-left'}`} style={{ textAlign: isRTL ? 'right' : 'left' }}>
                {t('favorites.emptyHint')}
              </Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

export default FavoritesScreenMobile;
