/**
 * PodcastsScreenMobile
 *
 * Mobile-optimized podcasts screen with responsive grid
 * Features:
 * - 2 columns on phone
 * - 3-5 columns on tablet (based on orientation)
 * - Horizontal scrolling category filters
 * - Touch-optimized podcast cards
 * - Pull-to-refresh
 * - Episode list view
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { podcastService, contentService } from '@bayit/shared-services';
import { GlassCategoryPill, GlassView, GlassBadge, GlassButton } from '@bayit/shared';
import { getLocalizedName, getLocalizedDescription } from '@bayit/shared-utils';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
import { BottomSheet } from '../components';
import { spacing, colors, typography } from '@olorin/design-tokens';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('PodcastsScreenMobile');

interface Podcast {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  coverUrl?: string;
  thumbnail?: string;
  category?: string;
  episodeCount?: number;
  author?: string;
  lastUpdated?: string;
}

interface Episode {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  duration?: number;
  publishedAt?: string;
  thumbnailUrl?: string;
}

interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
}

export const PodcastsScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL, direction } = useDirection();
  const { orientation } = useResponsive();

  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [filteredPodcasts, setFilteredPodcasts] = useState<Podcast[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Episode bottom sheet state
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesVisible, setEpisodesVisible] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  const currentLang = i18n.language;

  // Responsive column count: 2 on phone, 3-5 on tablet based on orientation
  const numColumns = getGridColumns({
    phone: 2,
    tablet: orientation === 'landscape' ? 5 : 3,
  });

  useEffect(() => {
    loadPodcasts();
  }, [i18n.language]);

  useEffect(() => {
    filterPodcasts();
  }, [selectedCategory, podcasts]);

  const loadPodcasts = async () => {
    try {
      setIsLoading(true);

      // Use Promise.allSettled for graceful partial failure handling
      const results = await Promise.allSettled([
        podcastService.getShows(),
        contentService.getCategories(),
      ]);

      const podcastsRes = results[0].status === 'fulfilled' ? results[0].value : { shows: [] };
      const categoriesRes = results[1].status === 'fulfilled' ? results[1].value : { categories: [] };

      // Log any failures for debugging
      if (results[0].status === 'rejected') {
        moduleLogger.warn('Failed to load podcasts:', results[0].reason);
      }
      if (results[1].status === 'rejected') {
        moduleLogger.warn('Failed to load categories:', results[1].reason);
      }

      const podcastsData = (podcastsRes.shows || []).map((podcast: any) => ({
        ...podcast,
        coverUrl: podcast.cover || podcast.thumbnail,
      }));

      setPodcasts(podcastsData);

      const categoriesData = categoriesRes.categories || [];
      setCategories(categoriesData);

      setIsLoading(false);
    } catch (error) {
      moduleLogger.error('Error loading podcasts:', error);
      setIsLoading(false);
    }
  };

  const filterPodcasts = () => {
    if (!selectedCategory) {
      setFilteredPodcasts(podcasts);
    } else {
      setFilteredPodcasts(
        podcasts.filter((podcast) => podcast.category === selectedCategory)
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPodcasts();
    setRefreshing(false);
  };

  const handlePodcastPress = async (podcast: Podcast) => {
    setSelectedPodcast(podcast);
    setEpisodesVisible(true);
    setLoadingEpisodes(true);

    try {
      const episodesRes = await podcastService.getEpisodes(podcast.id);
      setEpisodes(episodesRes.episodes || []);
    } catch (error) {
      moduleLogger.error('Error loading episodes:', error);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const handleEpisodePress = (episode: Episode) => {
    setEpisodesVisible(false);
    navigation.navigate('Player', {
      id: episode.id,
      title: getLocalizedName(episode, currentLang),
      type: 'podcast',
    });
  };

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(currentLang);
  };

  const renderPodcast = ({ item }: { item: Podcast }) => {
    const localizedTitle = getLocalizedName(item, currentLang);
    const localizedDescription = getLocalizedDescription(item, currentLang);

    return (
      <View style={styles.podcastWrapper}>
        <Pressable onPress={() => handlePodcastPress(item)}>
          <GlassView style={styles.podcastCard}>
            {/* Cover image */}
            {item.coverUrl ? (
              <Image
                source={{ uri: item.coverUrl }}
                style={styles.cover}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Text style={styles.coverText}>🎙️</Text>
              </View>
            )}

            {/* Episode count badge */}
            {item.episodeCount && item.episodeCount > 0 && (
              <View style={styles.episodeBadge}>
                <GlassBadge variant="secondary">
                  <Text style={styles.episodeCount}>{item.episodeCount}</Text>
                </GlassBadge>
              </View>
            )}

            {/* Podcast info */}
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={2}>
                {localizedTitle}
              </Text>
              {item.author && (
                <Text style={styles.author} numberOfLines={1}>
                  {item.author}
                </Text>
              )}
            </View>
          </GlassView>
        </Pressable>
      </View>
    );
  };

  const renderEpisode = ({ item }: { item: Episode }) => {
    const localizedTitle = getLocalizedName(item, currentLang);
    const localizedDescription = getLocalizedDescription(item, currentLang);

    return (
      <Pressable onPress={() => handleEpisodePress(item)}>
        <GlassView style={styles.episodeCard}>
          <View style={styles.episodeContent}>
            <Text style={styles.episodeTitle} numberOfLines={2}>
              {localizedTitle}
            </Text>
            {localizedDescription && (
              <Text style={styles.episodeDescription} numberOfLines={2}>
                {localizedDescription}
              </Text>
            )}
            <View style={styles.episodeMeta}>
              {item.duration && (
                <Text style={styles.episodeMetaText}>
                  {formatDuration(item.duration)}
                </Text>
              )}
              {item.publishedAt && (
                <Text style={styles.episodeMetaText}>
                  {formatDate(item.publishedAt)}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.playIconContainer}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        </GlassView>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Category filters - wrapping layout */}
      {categories.length > 0 && (
        <View style={styles.categoriesSection}>
          <GlassCategoryPill
            label={t('podcasts.allPodcasts')}
            emoji="🎧"
            isActive={selectedCategory === null}
            onPress={() => setSelectedCategory(null)}
          />
          {categories.map((category) => {
            // Enhanced emoji mappings for categories
            const emojiMap: Record<string, string> = {
              'קומי': '😂',
              'comedy': '😂',
              'פסיכולוגיה': '🧠',
              'psychology': '🧠',
              'כללה': '📌',
              'general': '📌',
              'טכנולוגיה': '💻',
              'technology': '💻',
              'tech': '💻',
              'חדשות ואקטואליה': '📰',
              'news': '📰',
              'היסטוריה': '📚',
              'history': '📚',
              'politics': '🏛️',
              'business': '💼',
              'entertainment': '🎭',
              'sports': '⚽',
              'jewish': '✡️',
              'judaism': '✡️',
              'educational': '🎓',
              'science': '🔬',
              'health': '🏥',
              'fitness': '💪',
              'arts': '🎨',
              'music': '🎵',
              'food': '🍽️',
              'travel': '✈️',
              'lifestyle': '🌟',
              'relationships': '❤️',
              'parenting': '👶',
              'spirituality': '🙏',
            };

            const categoryName = getLocalizedName(category, currentLang);
            const emoji = emojiMap[category.id.toLowerCase()] || emojiMap[categoryName?.toLowerCase()] || '🎙️';

            return (
              <GlassCategoryPill
                key={category.id}
                label={categoryName}
                emoji={emoji}
                isActive={selectedCategory === category.id}
                onPress={() => handleCategoryPress(category.id)}
              />
            );
          })}
        </View>
      )}

      {/* Podcasts grid */}
      <FlatList
        key={`grid-${numColumns}`} // Force re-render when columns change
        data={filteredPodcasts}
        renderItem={renderPodcast}
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
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {selectedCategory
                  ? t('podcasts.noPodcastsInCategory')
                  : t('podcasts.noPodcasts')}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Episodes bottom sheet */}
      <BottomSheet
        visible={episodesVisible}
        onClose={() => setEpisodesVisible(false)}
        height={600}
      >
        {selectedPodcast && (
          <View style={styles.episodesSheet}>
            <Text style={styles.sheetTitle}>
              {getLocalizedName(selectedPodcast, currentLang)}
            </Text>
            {selectedPodcast.author && (
              <Text style={styles.sheetAuthor}>{selectedPodcast.author}</Text>
            )}

            {loadingEpisodes ? (
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            ) : (
              <FlatList
                data={episodes}
                renderItem={renderEpisode}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.episodesList}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    {t('podcasts.noEpisodes')}
                  </Text>
                }
              />
            )}
          </View>
        )}
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  categoriesSection: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  podcastWrapper: {
    flex: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  podcastCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    aspectRatio: 1, // 1:1 square for podcast covers
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverText: {
    fontSize: 64,
  },
  episodeBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  episodeCount: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.xs,
  },
  info: {
    padding: spacing.md,
  },
  title: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  author: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    writingDirection: 'auto',
  },
  episodesSheet: {
    flex: 1,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sheetAuthor: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  episodesList: {
    gap: spacing.sm,
  },
  episodeCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  episodeContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  episodeTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  episodeDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  episodeMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  episodeMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  playIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 16,
    color: colors.text,
  },
});
