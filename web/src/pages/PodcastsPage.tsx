import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, ScrollView } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { useResponsive } from '@/hooks/useResponsive';
import { Podcast, Headphones, Clock, Search, X, RefreshCw, Plus } from 'lucide-react';
import { podcastService } from '@/services/api';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { NativeIcon } from '@olorin/shared-icons/native';
import {
  GlassView,
  GlassCard,
  GlassCategoryPill,
  GlassInput,
  GlassPageHeader,
  RowSkeleton,
  PodcastPlaceholder,
  GlassEmptyState,
} from '@bayit/shared/ui';
import { SubtitleFlags } from '@bayit/shared/components/SubtitleFlags';
import WidgetToggleButton from '@/components/content/WidgetToggleButton';
import { WidgetToggleProvider } from '@/contexts/WidgetToggleContext';
import logger from '@/utils/logger';
import PageLoading from '@/components/common/PageLoading';
import AddPodcastModal from '@/components/podcasts/AddPodcastModal';

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
  category?: string;
  [key: string]: any;
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

            {/* Widget Toggle - Show on hover */}
            {isHovered && (
              <View style={styles.widgetButtonContainer}>
                <WidgetToggleButton
                  contentType="podcast"
                  contentId={show.id}
                  title={show.title}
                  coverUrl={show.cover}
                />
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
  const responsive = useResponsive();
  const [shows, setShows] = useState<Show[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const episodesLabel = t('podcasts.episodes');

  const numColumns = responsive.getColumns();

  // Collect items for widget toggle batch-check
  const widgetItems = useMemo(() => {
    return shows.map((show) => ({
      content_type: 'podcast',
      content_id: show.id,
    }));
  }, [shows]);

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
        { id: 'general', name: t('podcasts.categories.general') }
      ];

      setCategories(allCategories);
    } catch (error) {
      logger.error('Failed to load podcast categories', 'PodcastsPage', error);
      // Set default categories on error
      setCategories([{ id: 'general', name: t('podcasts.categories.general') }]);
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
        (params as any).category = selectedCategory;
      } else if (selectedCategory === 'general') {
        // For general/uncategorized, pass null or empty category
        (params as any).category = null;
      }

      const data = await podcastService.getShows(params as any);
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
    <WidgetToggleProvider items={widgetItems}>
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
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setShowAddModal(true)}
            style={styles.addButton}
          >
            <Plus size={20} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={syncPodcasts}
            disabled={syncing}
            style={[styles.refreshButton, syncing && styles.refreshButtonDisabled]}
          >
            <RefreshCw size={20} color={colors.text} style={syncing ? styles.spinning : undefined} />
          </Pressable>
        </View>
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
          icon={<NativeIcon name="podcasts" size="sm" color={selectedCategory === 'all' ? colors.primary.DEFAULT : colors.textMuted} />}
          isActive={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
        />
        {categories.map((category) => {
          // Map common categories to icon names
          const iconNameMap: Record<string, string> = {
            'קומי': 'discover',
            'comedy': 'discover',
            'פסיכולוגיה': 'info',
            'psychology': 'info',
            'כללה': 'podcasts',
            'general': 'podcasts',
            'טכנולוגיה': 'discover',
            'technology': 'discover',
            'tech': 'discover',
            'חדשות ואקטואליה': 'info',
            'news': 'info',
            'היסטוריה': 'info',
            'history': 'info',
            'politics': 'discover',
            'business': 'discover',
            'entertainment': 'discover',
            'sports': 'discover',
            'jewish': 'judaism',
            'judaism': 'judaism',
            'educational': 'info',
            'science': 'info',
            'health': 'info',
            'fitness': 'discover',
            'arts': 'discover',
            'music': 'podcasts',
            'food': 'discover',
            'travel': 'discover',
            'lifestyle': 'discover',
            'relationships': 'discover',
            'parenting': 'info',
            'spirituality': 'judaism',
          };

          const iconName = iconNameMap[category.id.toLowerCase()] || iconNameMap[category.name?.toLowerCase()] || 'podcasts';
          const label = t(`podcasts.categories.${category.id}`, category.name);

          return (
            <GlassCategoryPill
              key={category.id}
              label={label}
              icon={<NativeIcon name={iconName} size="sm" color={selectedCategory === category.id ? colors.primary.DEFAULT : colors.textMuted} />}
              isActive={selectedCategory === category.id}
              onPress={() => setSelectedCategory(category.id)}
            />
          );
        })}
      </View>

      {/* Shows Grid */}
      <FlatList
        data={filteredShows}
        keyExtractor={(item: any) => item.id}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
        renderItem={({ item }: { item: any }) => (
          <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
            <ShowCard show={item} episodesLabel={episodesLabel} isRTL={isRTL} />
          </View>
        )}
        ListEmptyComponent={
          <GlassEmptyState
            variant={searchQuery ? 'no-results' : 'no-content'}
            icon={<Podcast size={72} color={colors.textMuted} />}
            title={searchQuery ? t('common.noResults') : t('podcasts.noPodcasts')}
            description={searchQuery ? t('common.tryDifferentSearch') : t('podcasts.tryLater')}
          />
        }
      />
      <AddPodcastModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { setShowAddModal(false); loadShows(); }}
      />
    </View>
    </WidgetToggleProvider>
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
  widgetButtonContainer: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 10,
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
  // Header action buttons
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
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
