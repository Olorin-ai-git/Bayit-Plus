import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, useWindowDimensions, Pressable, ActivityIndicator } from 'react-native';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Film, Tv, Search, ChevronLeft, ChevronRight, SlidersHorizontal, Mic, X } from 'lucide-react';
import ContentCard from '@/components/content/ContentCard';
import AnimatedCard from '@/components/common/AnimatedCard';
import { contentService } from '@/services/api';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import {
  GlassView,
  GlassCard,
  GlassCategoryPill,
  GlassInput,
  GlassButton,
  GlassCheckbox,
  GlassPageHeader,
  GridSkeleton,
} from '@bayit/shared/ui';
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
  category_name_en?: string;
  category_name_es?: string;
  is_series?: boolean;
  available_subtitle_languages?: string[];
  has_subtitles?: boolean;
}

export default function VODPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();

  const [searchParams, setSearchParams] = useSearchParams();
  const [movies, setMovies] = useState<ContentItem[]>([]);
  const [series, setSeries] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [moviesPage, setMoviesPage] = useState(1);
  const [seriesPage, setSeriesPage] = useState(1);
  const [totalMovies, setTotalMovies] = useState(0);
  const [totalSeries, setTotalSeries] = useState(0);
  const [showOnlyWithSubtitles, setShowOnlyWithSubtitles] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { width } = useWindowDimensions();

  // Track previous category to detect changes and prevent duplicate API calls
  const prevCategoryRef = useRef(selectedCategory);

  const numColumns = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : width >= 640 ? 3 : 2;
  const itemsPerPage = 24; // Reduced from 100 for better UX and smaller batches

  // Filter movies and series by search query and subtitle filter
  const filteredMovies = useMemo(() => {
    let filtered = movies;
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (showOnlyWithSubtitles) {
      filtered = filtered.filter(item =>
        item.available_subtitle_languages && item.available_subtitle_languages.length > 0
      );
    }
    return filtered;
  }, [movies, searchQuery, showOnlyWithSubtitles]);

  const filteredSeries = useMemo(() => {
    let filtered = series;
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (showOnlyWithSubtitles) {
      filtered = filtered.filter(item =>
        item.available_subtitle_languages && item.available_subtitle_languages.length > 0
      );
    }
    return filtered;
  }, [series, searchQuery, showOnlyWithSubtitles]);

  // Combined useEffect to prevent duplicate API calls
  useEffect(() => {
    const categoryChanged = prevCategoryRef.current !== selectedCategory;

    if (categoryChanged) {
      prevCategoryRef.current = selectedCategory;
      setMoviesPage(1);
      setSeriesPage(1);
    }

    loadContent();
  }, [selectedCategory, moviesPage, seriesPage]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const categoryParam = selectedCategory === 'all' ? undefined : selectedCategory;

      const [categoriesData, moviesData, seriesData] = await Promise.all([
        contentService.getCategories(),
        contentService.getAllMovies({ page: moviesPage, limit: itemsPerPage, category_id: categoryParam }),
        contentService.getAllSeries({ page: seriesPage, limit: itemsPerPage, category_id: categoryParam }),
      ]);

      setCategories(categoriesData.categories || []);
      setMovies(moviesData.items || []);
      setSeries(seriesData.items || []);
      setTotalMovies(moviesData.total || 0);
      setTotalSeries(seriesData.total || 0);

      logger.info(`VODPage: Loaded ${moviesData.items?.length || 0} movies and ${seriesData.items?.length || 0} series`, 'VODPage');
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

  const moviesTotalPages = Math.ceil(totalMovies / itemsPerPage);
  const seriesTotalPages = Math.ceil(totalSeries / itemsPerPage);

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
        {items.map((item, index) => (
          <AnimatedCard
            key={item.id}
            index={index}
            variant="grid"
            style={{ width: `${100 / numColumns}%`, padding: spacing.xs } as any}
          >
            <ContentCard content={item} />
          </AnimatedCard>
        ))}
      </View>
    );
  };

  // Show full page loader on initial load
  if (loading && movies.length === 0 && series.length === 0) {
    return (
      <View style={styles.container}>
        <GlassPageHeader
          title={t('vod.title')}
          pageType="vod"
          isRTL={isRTL}
        />
        <View style={styles.searchSkeleton} />
        <View style={styles.categoriesSkeleton} />
        <GridSkeleton numColumns={numColumns} numRows={2} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Header */}
        <GlassPageHeader
          title={t('vod.title')}
          pageType="vod"
          badge={totalMovies + totalSeries}
          isRTL={isRTL}
        />

        {/* Search Input with Filter and Voice Buttons */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchRow, { flexDirection }]}>
            {/* Search Input */}
            <View style={styles.searchInputWrapper}>
              <GlassInput
                placeholder={t('vod.searchPlaceholder')}
                value={searchQuery}
                onChangeText={setSearchQuery}
                icon={<Search size={20} color={colors.textMuted} />}
                containerStyle={styles.searchInput}
              />
            </View>

            {/* Voice Search Button */}
            <Pressable
              onPress={() => {
                if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                  const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
                  const recognition = new SpeechRecognition();
                  recognition.lang = i18n.language === 'he' ? 'he-IL' : i18n.language === 'es' ? 'es-ES' : 'en-US';
                  recognition.continuous = false;
                  recognition.interimResults = false;

                  recognition.onstart = () => setIsListening(true);
                  recognition.onend = () => setIsListening(false);
                  recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setSearchQuery(transcript);
                  };
                  recognition.onerror = () => setIsListening(false);

                  recognition.start();
                }
              }}
              style={[styles.iconButton, isListening && styles.iconButtonActive]}
            >
              <Mic size={20} color={isListening ? colors.primary : colors.textMuted} />
            </Pressable>

            {/* Filter Button */}
            <Pressable
              onPress={() => setShowFilterPanel(!showFilterPanel)}
              style={[styles.iconButton, showFilterPanel && styles.iconButtonActive, showOnlyWithSubtitles && styles.iconButtonWithBadge]}
            >
              <SlidersHorizontal size={20} color={showFilterPanel ? colors.primary : colors.textMuted} />
              {showOnlyWithSubtitles && <View style={styles.filterActiveBadge} />}
            </Pressable>
          </View>

          {/* Filter Panel Overlay */}
          {showFilterPanel && (
            <GlassCard style={styles.filterPanel}>
              <View style={[styles.filterPanelHeader, { flexDirection }]}>
                <Text style={[styles.filterPanelTitle, { textAlign }]}>{t('vod.filters', 'Filters')}</Text>
                <Pressable onPress={() => setShowFilterPanel(false)} style={styles.filterCloseButton}>
                  <X size={16} color={colors.textMuted} />
                </Pressable>
              </View>
              <View style={styles.filterPanelContent}>
                <GlassCheckbox
                  label={t('vod.showOnlyWithSubtitles', 'Show only with subtitles')}
                  checked={showOnlyWithSubtitles}
                  onChange={setShowOnlyWithSubtitles}
                />
              </View>
            </GlassCard>
          )}
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

        {/* Loading State for Pagination */}
        {loading && (movies.length > 0 || series.length > 0) ? (
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
                  {t('vod.movies')}
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{totalMovies}</Text>
                </View>
              </View>
              {renderContentGrid(filteredMovies, t('vod.noMovies'))}
              {/* Movies Pagination */}
              {!searchQuery && moviesTotalPages > 1 && (
                <View style={styles.sectionPagination}>
                  <Pressable
                    onPress={() => setMoviesPage(p => Math.max(1, p - 1))}
                    disabled={moviesPage === 1}
                    style={[styles.smallPageButton, moviesPage === 1 && styles.pageButtonDisabled]}
                  >
                    {isRTL ? <ChevronRight size={16} color={colors.text} /> : <ChevronLeft size={16} color={colors.text} />}
                  </Pressable>
                  <Text style={styles.pageText}>{moviesPage} / {moviesTotalPages}</Text>
                  <Pressable
                    onPress={() => setMoviesPage(p => Math.min(moviesTotalPages, p + 1))}
                    disabled={moviesPage === moviesTotalPages}
                    style={[styles.smallPageButton, moviesPage === moviesTotalPages && styles.pageButtonDisabled]}
                  >
                    {isRTL ? <ChevronLeft size={16} color={colors.text} /> : <ChevronRight size={16} color={colors.text} />}
                  </Pressable>
                </View>
              )}
            </View>

            {/* Series Section */}
            <View style={styles.section}>
              <View style={[styles.sectionHeader, { flexDirection }]}>
                <Tv size={24} color={colors.secondary} />
                <Text style={[styles.sectionTitle, { textAlign }]}>
                  {t('vod.series')}
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{totalSeries}</Text>
                </View>
              </View>
              {renderContentGrid(filteredSeries, t('vod.noSeries'))}
              {/* Series Pagination */}
              {!searchQuery && seriesTotalPages > 1 && (
                <View style={styles.sectionPagination}>
                  <Pressable
                    onPress={() => setSeriesPage(p => Math.max(1, p - 1))}
                    disabled={seriesPage === 1}
                    style={[styles.smallPageButton, seriesPage === 1 && styles.pageButtonDisabled]}
                  >
                    {isRTL ? <ChevronRight size={16} color={colors.text} /> : <ChevronLeft size={16} color={colors.text} />}
                  </Pressable>
                  <Text style={styles.pageText}>{seriesPage} / {seriesTotalPages}</Text>
                  <Pressable
                    onPress={() => setSeriesPage(p => Math.min(seriesTotalPages, p + 1))}
                    disabled={seriesPage === seriesTotalPages}
                    style={[styles.smallPageButton, seriesPage === seriesTotalPages && styles.pageButtonDisabled]}
                  >
                    {isRTL ? <ChevronLeft size={16} color={colors.text} /> : <ChevronRight size={16} color={colors.text} />}
                  </Pressable>
                </View>
              )}
            </View>

            {/* Empty State - when both are empty */}
            {filteredMovies.length === 0 && filteredSeries.length === 0 && (
              <View style={styles.emptyState}>
                <GlassCard style={styles.emptyCard}>
                  <Film size={64} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('vod.emptyTitle')}</Text>
                  <Text style={styles.emptyDescription}>{t('vod.emptyDescription')}</Text>
                </GlassCard>
              </View>
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
  searchSkeleton: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  categoriesSkeleton: {
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  searchContainer: {
    marginBottom: spacing.lg,
    position: 'relative',
    zIndex: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchInput: {
    marginBottom: 0,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderColor: colors.primary.DEFAULT,
  },
  iconButtonWithBadge: {
    position: 'relative',
  },
  filterActiveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.DEFAULT,
  },
  filterPanel: {
    position: 'absolute',
    top: 60,
    right: 0,
    left: 0,
    padding: spacing.md,
    zIndex: 20,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  filterPanelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  filterCloseButton: {
    padding: spacing.xs,
  },
  filterPanelContent: {
    gap: spacing.md,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  pageSubtext: {
    fontSize: 13,
    color: colors.textMuted,
  },
  sectionPagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  smallPageButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
