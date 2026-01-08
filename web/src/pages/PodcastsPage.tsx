import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, ScrollView, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Podcast, Headphones, Clock } from 'lucide-react';
import { podcastService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassCard, GlassCategoryPill } from '@bayit/shared/ui';
import { getLocalizedName } from '@bayit/shared-utils/contentLocalization';
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { width } = useWindowDimensions();
  const episodesLabel = t('podcasts.episodes');

  const numColumns = width >= 1280 ? 5 : width >= 1024 ? 4 : width >= 768 ? 3 : 2;

  useEffect(() => {
    loadShows();
  }, [selectedCategory]);

  const loadShows = async () => {
    try {
      const data = await podcastService.getShows({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
      });
      setShows(data.shows);
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      logger.error('Failed to load podcasts', 'PodcastsPage', error);
    } finally {
      setLoading(false);
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
      <View style={[styles.header, { flexDirection, justifyContent }]}>
        <GlassView style={styles.headerIcon}>
          <Podcast size={24} color={colors.success} />
        </GlassView>
        <Text style={[styles.title, { textAlign }]}>{t('podcasts.title')}</Text>
      </View>

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
        <GlassCategoryPill
          label={t('podcasts.categories.news')}
          emoji="📰"
          isActive={selectedCategory === 'news'}
          onPress={() => setSelectedCategory('news')}
        />
        <GlassCategoryPill
          label={t('podcasts.categories.tech')}
          emoji="💻"
          isActive={selectedCategory === 'tech'}
          onPress={() => setSelectedCategory('tech')}
        />
        <GlassCategoryPill
          label={t('podcasts.categories.jewish')}
          emoji="✡️"
          isActive={selectedCategory === 'jewish'}
          onPress={() => setSelectedCategory('jewish')}
        />
        <GlassCategoryPill
          label={t('podcasts.categories.entertainment')}
          emoji="🎭"
          isActive={selectedCategory === 'entertainment'}
          onPress={() => setSelectedCategory('entertainment')}
        />
        <GlassCategoryPill
          label={t('podcasts.categories.sports')}
          emoji="⚽"
          isActive={selectedCategory === 'sports'}
          onPress={() => setSelectedCategory('sports')}
        />
        {categories.map((category) => (
          <GlassCategoryPill
            key={category.id}
            label={getLocalizedName(category, i18n.language)}
            isActive={selectedCategory === category.id}
            onPress={() => setSelectedCategory(category.id)}
          />
        ))}
      </ScrollView>

      {/* Shows Grid */}
      <FlatList
        data={shows}
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
              <Text style={styles.emptyTitle}>{t('podcasts.noPodcasts')}</Text>
              <Text style={styles.emptyDescription}>{t('podcasts.tryLater')}</Text>
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
});
