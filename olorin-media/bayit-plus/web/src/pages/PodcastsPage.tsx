import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, ScrollView, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Podcast, Headphones, Clock, Search, X, RefreshCw } from 'lucide-react';
import { podcastService } from '@/services/api';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import {
  GlassView,
  GlassCard,
  GlassCategoryPill,
  GlassInput,
  GlassPageHeader,
  RowSkeleton,
  PodcastPlaceholder,
} from '@bayit/shared/ui';
import { SubtitleFlags } from '@bayit/shared/components/SubtitleFlags';
import { LoadingState, EmptyState } from '@bayit/shared/components/states';
import logger from '@/utils/logger';
import PageLoading from '@/components/common/PageLoading';

interface Category {
  id: string;
  name: string;
}

interface Show {
  id: string;
  title: string;
  cover?: string;
  author?: string;
  episodeCount?: number;
  latestEpisode?: string;
  availableLanguages?: string[];
}

function ShowCard({ show, episodesLabel, isRTL }: { show: Show; episodesLabel: string; isRTL: boolean }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link to={`/podcasts/${show.id}`} style={{ textDecoration: 'none', flex: 1 }}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
      >
        <View style={styles.showCard}>
          <GlassCard style={[styles.coverContainer, isHovered && styles.coverContainerHovered]}>
            {show.cover ? (
              <Image
                source={{ uri: show.cover }}
                style={[styles.cover, isHovered && styles.coverHovered]}
                resizeMode="cover"
              />
            ) : (
              <PodcastPlaceholder size="medium" />
            )}

            {/* Language flags */}
            {show.availableLanguages && show.availableLanguages.length > 0 && (
              <SubtitleFlags
                languages={show.availableLanguages}
                position="bottom-right"
                isRTL={isRTL}
                size="small"
              />
            )}
          </GlassCard>
          <Text style={[styles.showTitle, isHovered && styles.showTitleHovered]} numberOfLines={1}>
            {show.title}
          </Text>
          {show.author && (
            <Text style={styles.showAuthor} numberOfLines={1}>{show.author}</Text>
          )}
          <View style={styles.showMeta}>
            <View style={styles.metaItem}>
              <Headphones size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{show.episodeCount || 0} {episodesLabel}</Text>
            </View>
            {show.latestEpisode && (
              <View style={styles.metaItem}>
                <Clock size={12} color={colors.textMuted} />
                <Text style={styles.metaText}>{show.latestEpisode}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonCover} />
    </View>
  );
}

export default function PodcastsPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
  const [shows, setShows] = useState<Show[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { width } = useWindowDimensions();
  const episodesLabel = t('podcasts.episodes');

  const numColumns = width >= 1280 ? 5 : width >= 1024 ? 4 : width >= 768 ? 3 : 2;

  // Filter shows by search query and category
  const filteredShows = useMemo(() => {
    let filtered = shows;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (show) =>
          show.title.toLowerCase().includes(query) ||
          show.author?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [shows, searchQuery]);

  // Load categories and sync podcasts on mount
  useEffect(() => {
    loadCategories();
    syncPodcasts();
  }, []);

  // Load shows when category changes
  useEffect(() => {
    loadShows();
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const data = await podcastService.getCategories();
      const cats = data.categories || [];

      // Add "general" category for uncategorized podcasts
      const allCategories = [
        ...cats,
        { id: 'general', name: 'General' }
      ];

      setCategories(allCategories);
    } catch (error) {
      logger.error('Failed to load podcast categories', 'PodcastsPage', error);
      // Set default categories on error
      setCategories([{ id: 'general', name: 'General' }]);
    }
  };

  const loadShows = async () => {
    try {
      setLoading(true);

      // Fetch podcasts with high limit
      const params = {
        limit: 100,
        page: 1,
      };

      // Add category filter if not "all"
      if (selectedCategory !== 'all' && selectedCategory !== 'general') {
        params.category = selectedCategory;
      } else if (selectedCategory === 'general') {
        // For general/uncategorized, pass null or empty category
        params.category = null;
      }

      const data = await podcastService.getShows(params);
      let showsList = data.shows || [];

      // Filter for uncategorized podcasts if "general" is selected
      if (selectedCategory === 'general') {
        showsList = showsList.filter((show: Show) => !show.category || show.category === '' || show.category === 'general');
      }

      setShows(showsList);
    } catch (error) {
      logger.error('Failed to load podcasts', 'PodcastsPage', error);
      setShows([]);
    } finally {
      setLoading(false);
    }
  };

  const syncPodcasts = async () => {
    try {
      setSyncing(true);
      logger.info('Syncing content...', 'PodcastsPage');
      const result = await podcastService.syncPodcasts();
      logger.info(`Synced podcasts: ${result.podcasts_synced}/${result.total_podcasts}`, 'PodcastsPage');

      // Reload shows after syncing
      await loadShows();
    } catch (error) {
      logger.error('Failed to sync podcasts', 'PodcastsPage', error);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <PageLoading
        title={t('podcasts.title')}
        pageType="podcasts"
        message={t('podcasts.loadingShows', 'Loading podcast shows...')}
        isRTL={isRTL}
        icon={<Podcast size={24} color={colors.primary.DEFAULT} />}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <GlassPageHeader
          title={t('podcasts.title')}
          pageType="podcasts"
          badge={shows.length}
          isRTL={isRTL}
          style={styles.pageHeader}
        />
        <Pressable
          onPress={syncPodcasts}
          disabled={syncing}
          style={[styles.refreshButton, syncing && styles.refreshButtonDisabled]}
        >
          <RefreshCw size={20} color={colors.text} style={syncing ? styles.spinning : undefined} />
        </Pressable>
      </View>

      {/* Search Input */}
      <GlassInput
        leftIcon={<Search size={18} color={colors.textMuted} />}
        rightIcon={
          searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          ) : undefined
        }
        placeholder={t('common.search')}
        value={searchQuery}
        onChangeText={setSearchQuery}
        containerStyle={styles.searchContainer}
      />

      {/* Category Filter */}
      <View style={styles.categoriesContainer}>
        <GlassCategoryPill
          label={t('podcasts.categories.all')}
          emoji="🎧"
          isActive={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
        />
        {categories.map((category) => {
          // Map common categories to emojis with enhanced variety
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

          const emoji = emojiMap[category.id.toLowerCase()] || emojiMap[category.name?.toLowerCase()] || '🎙️';
          const label = t(`podcasts.categories.${category.id}`, category.name);

          return (
            <GlassCategoryPill
              key={category.id}
              label={label}
              emoji={emoji}
              isActive={selectedCategory === category.id}
              onPress={() => setSelectedCategory(category.id)}
            />
          );
        })}
      </View>

      {/* Shows Grid */}
      <FlatList
        data={filteredShows}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
            <ShowCard show={item} episodesLabel={episodesLabel} isRTL={isRTL} />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Podcast size={72} color={colors.textMuted} />}
            title={searchQuery ? t('common.noResults') : t('podcasts.noPodcasts')}
            description={searchQuery ? t('common.tryDifferentSearch') : t('podcasts.tryLater')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  pageHeader: {
    flex: 1,
    marginBottom: 0,
  },
  searchContainer: {
    marginBottom: spacing.lg,
  },
  skeletonInput: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridContent: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.md,
  },
  showCard: {
    margin: spacing.xs,
  },
  coverContainer: {
    aspectRatio: 1,
    marginBottom: spacing.sm,
    padding: 0,
    overflow: 'hidden',
  },
  coverContainerHovered: {
    // @ts-ignore
    boxShadow: `0 8px 32px rgba(16, 185, 129, 0.3)`,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverHovered: {
    transform: [{ scale: 1.05 }],
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  showTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  showTitleHovered: {
    color: colors.primary.DEFAULT,
  },
  showAuthor: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  showMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyCard: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  // Skeleton styles
  skeletonHeader: {
    width: 192,
    height: 32,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  skeletonCard: {
    flex: 1,
    margin: spacing.xs,
    minWidth: 150,
    maxWidth: '20%',
  },
  skeletonCover: {
    aspectRatio: 1,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
  },
  // Refresh button styles
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  refreshButtonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  spinning: {
    // Visual feedback for spinning state (animation removed for React Native Web compatibility)
  },
});
