import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, useWindowDimensions, Pressable } from 'react-native';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Film, Tv, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import ContentCard from '@/components/content/ContentCard';
import { contentService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassCard, GlassCategoryPill, GlassInput, GlassButton } from '@bayit/shared/ui';
import { getLocalizedName } from '@bayit/shared-utils/contentLocalization';
import logger from '@/utils/logger';

interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
}

interface ContentItem {
  id: string;
  title: string;
  thumbnail?: string;
  type?: string;
  duration?: string;
  year?: string;
  category?: string;
  is_series?: boolean;
}

export default function VODPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();

  const [searchParams, setSearchParams] = useSearchParams();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const { width } = useWindowDimensions();

  const numColumns = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : width >= 640 ? 3 : 2;
  const itemsPerPage = 100;

  // Filter and separate movies and series
  const { movies, series, filteredTotal } = useMemo(() => {
    const movies: ContentItem[] = [];
    const series: ContentItem[] = [];

    // Filter by search query
    const filtered = searchQuery.trim()
      ? content.filter(item =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : content;

    filtered.forEach(item => {
      if (item.is_series || item.type === 'series') {
        series.push({ ...item, type: 'series' });
      } else {
        movies.push({ ...item, type: 'movie' });
      }
    });

    return { movies, series, filteredTotal: filtered.length };
  }, [content, searchQuery]);

  useEffect(() => {
    setPage(1);
    loadContent();
  }, [selectedCategory]);

  useEffect(() => {
    loadContent();
  }, [page]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const [categoriesData, contentData] = await Promise.all([
        contentService.getCategories(),
        selectedCategory === 'all'
          ? contentService.getAll({ page, limit: itemsPerPage })
          : contentService.getByCategory(selectedCategory, { page, limit: itemsPerPage }),
      ]);
      setCategories(categoriesData.categories);
      const items = contentData.items || contentData.categories?.flatMap((c: any) => c.items) || [];

      // Debug logging to check if thumbnails are present
      logger.info(`VODPage: Loaded ${items.length} items. Total: ${contentData.total}`, 'VODPage');

      // Find Avatar specifically
      const avatar = items.find((item: any) => item.title?.toLowerCase().includes('avatar'));
      if (avatar) {
        logger.info('Found Avatar:', 'VODPage', avatar);
        logger.info(`Avatar has thumbnail: ${!!avatar.thumbnail}, value: ${avatar.thumbnail}`, 'VODPage');
      } else {
        logger.warn('Avatar not found in loaded items', 'VODPage');
        logger.info('All titles:', 'VODPage', items.map((i: any) => i.title).slice(0, 10));
      }

      // Count how many items have thumbnails
      const itemsWithThumbnails = items.filter((item: any) => item.thumbnail).length;
      logger.info(`Items with thumbnails: ${itemsWithThumbnails} / ${items.length}`, 'VODPage');

      setContent(items);
      setTotalItems(contentData.total || 0);
    } catch (error) {
      logger.error('Failed to load content', 'VODPage', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchQuery(''); // Clear search when changing category
    if (categoryId === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', categoryId);
    }
    setSearchParams(searchParams);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const showingFrom = (page - 1) * itemsPerPage + 1;
  const showingTo = Math.min(page * itemsPerPage, totalItems);

  const renderContentGrid = (items: ContentItem[], emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>{emptyMessage}</Text>
        </View>
      );
    }

    return (
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.id} style={{ width: `${100 / numColumns}%`, padding: spacing.xs }}>
            <ContentCard content={item} />
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { flexDirection, justifyContent }]}>
          <Text style={[styles.title, { textAlign }]}>{t('vod.title')}</Text>
          <GlassView style={styles.headerIcon}>
            <Film size={24} color={colors.primary} />
          </GlassView>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <GlassInput
            placeholder={t('vod.searchPlaceholder', 'Search movies and series...')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon={<Search size={20} color={colors.textMuted} />}
            containerStyle={styles.searchInput}
          />
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          <GlassCategoryPill
            label={t('vod.allCategories')}
            isActive={selectedCategory === 'all'}
            onPress={() => handleCategoryChange('all')}
          />
          {categories.map((category) => (
            <GlassCategoryPill
              key={category.id}
              label={getLocalizedName(category, i18n.language)}
              isActive={selectedCategory === category.id}
              onPress={() => handleCategoryChange(category.id)}
            />
          ))}
        </ScrollView>

        {/* Loading State */}
        {loading ? (
          <View style={styles.grid}>
            {[...Array(12)].map((_, i) => (
              <View key={i} style={{ width: `${100 / numColumns}%`, padding: spacing.xs }}>
                <View style={styles.skeletonCard}>
                  <View style={styles.skeletonThumbnail} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <>
            {/* Movies Section */}
            <View style={styles.section}>
              <View style={[styles.sectionHeader, { flexDirection }]}>
                <Film size={24} color={colors.primary} />
                <Text style={[styles.sectionTitle, { textAlign }]}>
                  {t('vod.movies', 'Movies')}
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{movies.length}</Text>
                </View>
              </View>
              {renderContentGrid(movies, t('vod.noMovies', 'No movies found'))}
            </View>

            {/* Series Section */}
            <View style={styles.section}>
              <View style={[styles.sectionHeader, { flexDirection }]}>
                <Tv size={24} color={colors.secondary} />
                <Text style={[styles.sectionTitle, { textAlign }]}>
                  {t('vod.series', 'Series')}
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{series.length}</Text>
                </View>
              </View>
              {renderContentGrid(series, t('vod.noSeries', 'No series found'))}
            </View>

            {/* Empty State - when both are empty */}
            {movies.length === 0 && series.length === 0 && (
              <View style={styles.emptyState}>
                <GlassCard style={styles.emptyCard}>
                  <Film size={64} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('vod.emptyTitle')}</Text>
                  <Text style={styles.emptyDescription}>{t('vod.emptyDescription')}</Text>
                </GlassCard>
              </View>
            )}

            {/* Pagination Controls */}
            {!searchQuery && totalPages > 1 && (
              <GlassView style={styles.paginationContainer} intensity="medium">
                <Pressable
                  onPress={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                >
                  {isRTL ? (
                    <ChevronRight size={20} color={page === 1 ? colors.textMuted : colors.text} />
                  ) : (
                    <ChevronLeft size={20} color={page === 1 ? colors.textMuted : colors.text} />
                  )}
                </Pressable>

                <View style={styles.pageInfo}>
                  <Text style={styles.pageText}>
                    {t('vod.pagination.page', 'Page')} {page} {t('vod.pagination.of', 'of')} {totalPages}
                  </Text>
                  <Text style={styles.pageSubtext}>
                    {t('vod.pagination.showing', 'Showing')} {showingFrom}-{showingTo} {t('vod.pagination.outOf', 'of')} {totalItems}
                  </Text>
                </View>

                <Pressable
                  onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
                >
                  {isRTL ? (
                    <ChevronLeft size={20} color={page === totalPages ? colors.textMuted : colors.text} />
                  ) : (
                    <ChevronRight size={20} color={page === totalPages ? colors.textMuted : colors.text} />
                  )}
                </Pressable>
              </GlassView>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
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
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  searchContainer: {
    marginBottom: spacing.lg,
  },
  searchInput: {
    marginBottom: 0,
  },
  categoriesScroll: {
    marginBottom: spacing.lg,
  },
  categoriesContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.glass,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptySection: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 16,
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
  skeletonCard: {
    width: '100%',
  },
  skeletonThumbnail: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    padding: spacing.lg,
    marginTop: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  pageButton: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  pageButtonDisabled: {
    opacity: 0.3,
  },
  pageInfo: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  pageText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  pageSubtext: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
