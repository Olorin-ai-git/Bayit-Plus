import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Pressable } from 'react-native';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Film, Tv, Search, ChevronLeft, ChevronRight, SlidersHorizontal, Mic, X } from 'lucide-react';
import ContentCard from '@/components/content/ContentCard';
import AnimatedCard from '@/components/common/AnimatedCard';
import api from '@/services/api';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import {
  GlassCard,
  GlassCategoryPill,
  GlassInput,
  GlassCheckbox,
  GlassPageHeader,
} from '@bayit/shared/ui';
import { getLocalizedName } from '@bayit/shared-utils/contentLocalization';
import logger from '@/utils/logger';
import PageLoading from '@/components/common/PageLoading';

interface Subcategory {
  id: string;
  slug: string;
  name: string;
  name_en?: string;
  name_es?: string;
}

interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  slug: string;
  supports_subcategories?: boolean;
  subcategories?: Subcategory[];
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
  const { isRTL, textAlign, flexDirection } = useDirection();

  const [searchParams, setSearchParams] = useSearchParams();
  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'all'
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'movies' | 'series'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showOnlyWithSubtitles, setShowOnlyWithSubtitles] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { width } = useWindowDimensions();

  const numColumns = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : width >= 640 ? 3 : 2;
  const itemsPerPage = 24;

  // Debounced search query for API calls
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Filter content by subtitle filter
  const filteredContent = useMemo(() => {
    if (!showOnlyWithSubtitles) return allContent;
    return allContent.filter(item =>
      item.available_subtitle_languages && item.available_subtitle_languages.length > 0
    );
  }, [allContent, showOnlyWithSubtitles]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubcategory, contentTypeFilter, debouncedSearch]);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load content when filters change
  useEffect(() => {
    loadContent();
  }, [selectedCategory, selectedSubcategory, contentTypeFilter, currentPage, debouncedSearch]);

  const loadCategories = async () => {
    try {
      const data = await api.get('/content/categories', { params: { content_type: 'vod' } });
      setCategories(data.categories || []);
      logger.info(`VODPage: Loaded ${data.categories?.length || 0} VOD categories`, 'VODPage');
    } catch (error) {
      logger.error('Failed to load categories', 'VODPage', error);
    }
  };

  const loadContent = async () => {
    setLoading(true);

    // Clear content immediately to prevent stale data display
    setAllContent([]);
    setTotalItems(0);

    try {
      const categoryParam = selectedCategory === 'all' ? undefined : selectedCategory;
      const searchParam = debouncedSearch || undefined;

      let items: ContentItem[] = [];
      let total = 0;

      // Determine which content types to fetch based on filter
      const fetchMovies = contentTypeFilter === 'all' || contentTypeFilter === 'movies';
      const fetchSeries = contentTypeFilter === 'all' || contentTypeFilter === 'series';

      if (selectedSubcategory) {
        // Fetch content by subcategory
        const selectedCat = categories.find(c => c.id === selectedCategory);
        if (selectedCat) {
          const subcat = selectedCat.subcategories?.find(s => s.id === selectedSubcategory);
          if (subcat) {
            const data = await api.get(`/content/section/${selectedCat.slug}/subcategory/${subcat.slug}`, {
              params: { page: currentPage, limit: itemsPerPage, search: searchParam }
            });

            // Filter by content type if specified
            const allItems = data.items || [];
            if (contentTypeFilter === 'movies') {
              items = allItems.filter((item: ContentItem) => !item.is_series);
            } else if (contentTypeFilter === 'series') {
              items = allItems.filter((item: ContentItem) => item.is_series);
            } else {
              items = allItems;
            }

            total = items.length; // Note: This is approximate; ideally backend should support content_type filter
          }
        }
      } else {
        // Fetch movies and/or series based on content type filter
        const requests = [];

        if (fetchMovies) {
          requests.push(
            api.get('/content/movies', {
              params: { page: currentPage, limit: itemsPerPage, category_id: categoryParam, search: searchParam }
            })
          );
        }

        if (fetchSeries) {
          requests.push(
            api.get('/content/series', {
              params: { page: currentPage, limit: itemsPerPage, category_id: categoryParam, search: searchParam }
            })
          );
        }

        const results = await Promise.all(requests);

        if (contentTypeFilter === 'all') {
          // Both movies and series
          const movies = results[0]?.items || [];
          const series = results[1]?.items || [];
          items = interleaveArrays(movies, series);
          total = (results[0]?.total || 0) + (results[1]?.total || 0);
        } else if (contentTypeFilter === 'movies') {
          // Movies only
          items = results[0]?.items || [];
          total = results[0]?.total || 0;
        } else {
          // Series only
          items = results[0]?.items || [];
          total = results[0]?.total || 0;
        }
      }

      setAllContent(items);
      setTotalItems(total);

      logger.info(`VODPage: Loaded ${items.length} items (total: ${total})`, 'VODPage');
    } catch (error) {
      logger.error('Failed to load content', 'VODPage', error);
    } finally {
      setLoading(false);
    }
  };

  // Interleave two arrays for better visual distribution
  const interleaveArrays = (arr1: ContentItem[], arr2: ContentItem[]): ContentItem[] => {
    const result: ContentItem[] = [];
    const maxLength = Math.max(arr1.length, arr2.length);
    for (let i = 0; i < maxLength; i++) {
      if (i < arr1.length) result.push(arr1[i]);
      if (i < arr2.length) result.push(arr2[i]);
    }
    return result;
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null); // Clear subcategory when changing category
    setSearchQuery(''); // Clear search when changing category
    setCurrentPage(1); // Reset to first page
    if (categoryId === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', categoryId);
    }
    setSearchParams(searchParams);
  };

  const handleSubcategoryChange = (subcategoryId: string | null) => {
    setSelectedSubcategory(subcategoryId);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Get selected category's subcategories
  const selectedCategoryData = categories.find(c => c.id === selectedCategory);
  const subcategories = selectedCategoryData?.subcategories || [];

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
  if (loading && allContent.length === 0) {
    return (
      <PageLoading
        title={t('vod.title')}
        pageType="vod"
        message={t('vod.loadingContent', 'Loading movies and series...')}
        isRTL={isRTL}
      />
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Header */}
        <GlassPageHeader
          title={t('vod.title')}
          pageType="vod"
          badge={totalItems}
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

        {/* Content Type Filter (Movies/Series/All) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.contentTypeScroll}
          contentContainerStyle={styles.contentTypeContent}
        >
          <GlassCategoryPill
            label={t('vod.allContent', 'All Content')}
            isActive={contentTypeFilter === 'all'}
            onPress={() => setContentTypeFilter('all')}
          />
          <GlassCategoryPill
            label={t('vod.moviesOnly', 'Movies')}
            isActive={contentTypeFilter === 'movies'}
            onPress={() => setContentTypeFilter('movies')}
          />
          <GlassCategoryPill
            label={t('vod.seriesOnly', 'Series')}
            isActive={contentTypeFilter === 'series'}
            onPress={() => setContentTypeFilter('series')}
          />
        </ScrollView>

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

        {/* Subcategory Filter (if category supports subcategories) */}
        {selectedCategory !== 'all' && selectedCategoryData?.supports_subcategories && subcategories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.subcategoriesScroll}
            contentContainerStyle={styles.subcategoriesContent}
          >
            <GlassCategoryPill
              label={t('vod.allSubcategories', 'All')}
              isActive={selectedSubcategory === null}
              onPress={() => handleSubcategoryChange(null)}
            />
            {subcategories.map((subcategory) => (
              <GlassCategoryPill
                key={subcategory.id}
                label={getLocalizedName(subcategory, i18n.language)}
                isActive={selectedSubcategory === subcategory.id}
                onPress={() => handleSubcategoryChange(subcategory.id)}
              />
            ))}
          </ScrollView>
        )}

        {/* Content Grid */}
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
            {renderContentGrid(filteredContent, t('vod.noContent', 'No content found'))}

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <Pressable
                  onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                >
                  {isRTL ? <ChevronRight size={20} color={colors.text} /> : <ChevronLeft size={20} color={colors.text} />}
                </Pressable>
                <View style={styles.pageInfo}>
                  <Text style={styles.pageText}>{currentPage} / {totalPages}</Text>
                  <Text style={styles.pageSubtext}>{totalItems} {t('vod.items', 'items')}</Text>
                </View>
                <Pressable
                  onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
                >
                  {isRTL ? <ChevronLeft size={20} color={colors.text} /> : <ChevronRight size={20} color={colors.text} />}
                </Pressable>
              </View>
            )}

            {/* Empty State */}
            {filteredContent.length === 0 && (
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
  contentTypeScroll: {
    marginBottom: spacing.md,
  },
  contentTypeContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  categoriesScroll: {
    marginBottom: spacing.lg,
  },
  categoriesContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  subcategoriesScroll: {
    marginBottom: spacing.lg,
  },
  subcategoriesContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
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
});
