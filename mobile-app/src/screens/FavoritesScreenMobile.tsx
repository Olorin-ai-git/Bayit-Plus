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
  StyleSheet,
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
import { spacing, colors, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

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
      console.error('Error loading favorites:', error);
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
      console.error('Error removing favorite:', error);
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
      <View style={styles.cardWrapper}>
        <Pressable onPress={() => handleItemPress(item)}>
          <GlassView style={styles.card}>
            {/* Thumbnail */}
            {item.thumbnail ? (
              <Image
                source={{ uri: item.thumbnail }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                <Text style={styles.placeholderIcon}>
                  {TYPE_ICONS[item.type] || '⭐'}
                </Text>
              </View>
            )}

            {/* Type badge */}
            <View style={[styles.typeBadge, isRTL ? { left: 8 } : { right: 8 }]}>
              <Text style={styles.typeBadgeText}>{TYPE_ICONS[item.type]}</Text>
            </View>

            {/* Remove button */}
            <Pressable
              style={[styles.removeButton, isRTL ? { right: 8 } : { left: 8 }]}
              onPress={() => handleRemoveFavorite(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.removeIcon}>✕</Text>
            </Pressable>

            {/* Card info */}
            <View style={styles.cardInfo}>
              <Text
                style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}
                numberOfLines={2}
              >
                {localizedTitle}
              </Text>
              {localizedSubtitle && (
                <Text
                  style={[styles.cardSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <View
          style={[
            styles.headerIcon,
            { marginLeft: isRTL ? spacing.md : 0, marginRight: isRTL ? 0 : spacing.md },
          ]}
        >
          <Text style={styles.headerIconText}>⭐</Text>
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('favorites.title')}
          </Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
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
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.gridContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <GlassView style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>⭐</Text>
              <Text style={[styles.emptyTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('favorites.empty')}
              </Text>
              <Text style={[styles.emptySubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('favorites.emptyHint')}
              </Text>
            </GlassView>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.md,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 24,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  gridContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  cardWrapper: {
    flex: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 14,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIcon: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
  },
  cardInfo: {
    padding: spacing.md,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default FavoritesScreenMobile;
