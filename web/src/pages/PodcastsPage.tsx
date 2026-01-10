import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, ScrollView, useWindowDimensions, TextInput } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Podcast, Headphones, Clock, Search, X, RefreshCw } from 'lucide-react';
import { podcastService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassCard, GlassCategoryPill } from '@bayit/shared/ui';
import logger from '@/utils/logger';

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
}

function ShowCard({ show, episodesLabel }: { show: Show; episodesLabel: string }) {
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
              <View style={styles.coverPlaceholder}>
                <Podcast size={32} color={colors.success} />
              </View>
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
      <View style={styles.container}>
        <View style={styles.skeletonHeader} />
        <View style={styles.grid}>
          {[...Array(10)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerLeft, { flexDirection }]}>
          <GlassView style={styles.headerIcon}>
            <Podcast size={24} color={colors.success} />
          </GlassView>
          <Text style={[styles.title, { textAlign }]}>{t('podcasts.title')}</Text>
        </View>
        <Pressable
          onPress={syncPodcasts}
          disabled={syncing}
          style={[styles.refreshButton, syncing && styles.refreshButtonDisabled]}
        >
          <RefreshCw size={20} color={colors.text} style={syncing ? styles.spinning : undefined} />
        </Pressable>
      </View>

      {/* Search Input */}
      <GlassCard style={[styles.searchContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Search size={18} color={colors.textMuted} style={{ marginHorizontal: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('common.search')}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')} style={{ padding: spacing.sm }}>
            <X size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </GlassCard>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        <GlassCategoryPill
          label={t('podcasts.categories.all')}
          emoji="🎧"
          isActive={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
        />
        {categories.map((category) => {
          // Map common categories to emojis
          const emojiMap: Record<string, string> = {
            'news': '📰',
            'politics': '🏛️',
            'tech': '💻',
            'business': '💼',
            'entertainment': '🎭',
            'sports': '⚽',
            'jewish': '✡️',
            'history': '📚',
            'educational': '🎓',
            'general': '📌',
          };

          const emoji = emojiMap[category.id] || '🎙️';
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
      </ScrollView>

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
            <ShowCard show={item} episodesLabel={episodesLabel} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <GlassCard style={styles.emptyCard}>
              <Podcast size={64} color={colors.textMuted} />
              {searchQuery ? (
                <>
                  <Text style={styles.emptyTitle}>{t('common.noResults')}</Text>
                  <Text style={styles.emptyDescription}>{t('common.tryDifferentSearch')}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>{t('podcasts.noPodcasts')}</Text>
                  <Text style={styles.emptyDescription}>{t('podcasts.tryLater')}</Text>
                </>
              )}
            </GlassCard>
          </View>
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
    marginBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
    color: colors.text,
    // @ts-ignore
    outlineStyle: 'none',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  categoriesScroll: {
    marginBottom: spacing.lg,
  },
  categoriesContent: {
    gap: spacing.sm,
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
    color: colors.primary,
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
    // @ts-ignore
    animation: 'spin 1s linear infinite',
  },
});
