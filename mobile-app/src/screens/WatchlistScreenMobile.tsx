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
  StyleSheet,
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
                <Text style={styles.placeholderIcon}>{typeIcon}</Text>
              </View>
            )}

            {/* Progress bar for continue watching */}
            {item.progress !== undefined && item.progress > 0 && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
              </View>
            )}

            {/* Type badge */}
            <View style={[styles.typeBadge, isRTL ? { left: 8 } : { right: 8 }]}>
              <Text style={styles.typeBadgeText}>{typeIcon}</Text>
            </View>

            {/* Remove button */}
            <Pressable
              style={[styles.removeButton, isRTL ? { right: 8 } : { left: 8 }]}
              onPress={() => handleRemoveFromWatchlist(item)}
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
              <Text
                style={[styles.cardMeta, { textAlign: isRTL ? 'right' : 'left' }]}
              >
                {item.year}
                {item.year && item.duration ? ' • ' : ''}
                {item.duration}
              </Text>
              {item.progress !== undefined && item.progress > 0 && (
                <Text
                  style={[styles.progressText, { textAlign: isRTL ? 'right' : 'left' }]}
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
          <Text style={styles.headerIconText}>📋</Text>
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('watchlist.title')}
          </Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {watchlist.length} {t('watchlist.items')}
          </Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
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
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('watchlist.empty')}
              </Text>
              <Text style={[styles.emptySubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('watchlist.emptyHint')}
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
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
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
  filterSection: {
    paddingVertical: spacing.sm,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
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
  progressContainer: {
    position: 'absolute',
    bottom: 52, // Above card info
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
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
  cardMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  progressText: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
    fontWeight: '600',
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

export default WatchlistScreenMobile;
