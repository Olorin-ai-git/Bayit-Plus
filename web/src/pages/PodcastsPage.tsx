import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, ScrollView, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { Podcast, Headphones, Clock } from 'lucide-react';
import { podcastService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassCard } from '@bayit/shared/ui';
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

function ShowCard({ show }: { show: Show }) {
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
              <Text style={styles.metaText}>{show.episodeCount || 0} פרקים</Text>
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
  const [shows, setShows] = useState<Show[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { width } = useWindowDimensions();

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
      <View style={styles.header}>
        <GlassView style={styles.headerIcon}>
          <Podcast size={24} color={colors.success} />
        </GlassView>
        <Text style={styles.title}>פודקאסטים</Text>
      </View>

      {/* Category Filter */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          <Pressable
            onPress={() => setSelectedCategory('all')}
            style={[styles.categoryPill, selectedCategory === 'all' && styles.categoryPillActive]}
          >
            <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>
              הכל
            </Text>
          </Pressable>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => setSelectedCategory(category.id)}
              style={[styles.categoryPill, selectedCategory === category.id && styles.categoryPillActive]}
            >
              <Text style={[styles.categoryText, selectedCategory === category.id && styles.categoryTextActive]}>
                {category.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

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
            <ShowCard show={item} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <GlassCard style={styles.emptyCard}>
              <Podcast size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>אין פודקאסטים זמינים</Text>
              <Text style={styles.emptyDescription}>נסה שוב מאוחר יותר</Text>
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
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  categoryPillActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: colors.background,
    fontWeight: '600',
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
