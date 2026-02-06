/**
 * SearchPage - Complete Rebuild
 *
 * Clean, functional search interface with proper localization,
 * loading states, and Glass design system
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, X, TrendingUp, Sparkles } from 'lucide-react';
import { NativeIcon } from '@olorin/shared-icons/native';
import {
  GlassInput,
  GlassButton,
  GlassCategoryPill,
  GlassCard,
  GlassPageHeader,
  GlassLoadingSpinner,
  GlassToggle,
} from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { useAuthStore } from '@bayit/shared-stores';
import { contentService } from '@/services/api';
import ContentCard from '@/components/content/ContentCard';
import PageLoading from '@/components/common/PageLoading';
import logger from '@/utils/logger';

interface SearchResult {
  id: string;
  title: string;
  thumbnail?: string;
  type: 'movie' | 'series' | 'live' | 'radio' | 'podcast';
  year?: string;
  duration?: string;
  description?: string;
}

type ContentTypeFilter = 'all' | 'vod' | 'live' | 'radio' | 'podcasts';

const TRENDING_SEARCHES = [
  'Fauda',
  'Shtisel',
  'Tehran',
  'Valley of Tears',
  'The Beauty Queen of Jerusalem',
];

export default function SearchPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigate = useNavigate();
  const { width } = useWindowDimensions();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPremium = useAuthStore((state) => state.isPremium());

  // Mobile detection
  const isMobile = width < 768;

  // State
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [contentType, setContentType] = useState<ContentTypeFilter>('all');
  const [semanticMode, setSemanticMode] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Responsive grid
  const numColumns = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : 3;


  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentSearches');
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      }
    } catch (error) {
      logger.error('Failed to load recent searches', 'SearchPage', error);
    }
    setIsInitialLoad(false);
  }, []);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      // Build filters based on content type
      const filters: any = {};
      if (contentType === 'all') {
        // Include all content types when "All" is selected
        filters.content_types = ['vod', 'live', 'radio', 'podcast'];
      } else if (contentType === 'vod') {
        filters.content_types = ['vod'];
        // Don't filter by is_series - include both movies and series
      } else if (contentType === 'live') {
        filters.content_types = ['live'];
      } else if (contentType === 'radio') {
        filters.content_types = ['radio'];
      } else if (contentType === 'podcasts') {
        filters.content_types = ['podcast'];
      }

      // Call appropriate search API based on semantic mode
      let response;
      if (semanticMode && isPremium) {
        // Use LLM semantic search for premium users
        response = await contentService.searchLLM({
          query: searchQuery,
          filters,
          limit: 50,
        });
      } else {
        // Use standard search
        response = await contentService.search({
          query: searchQuery,
          ...filters,
          page: 1,
          limit: 50,
        });
      }

      setResults(response.results || []);

      // Save to recent searches using functional update to avoid dependency
      setRecentSearches(prevRecent => {
        const updatedRecent = [
          searchQuery,
          ...prevRecent.filter(s => s !== searchQuery)
        ].slice(0, 5);
        localStorage.setItem('recentSearches', JSON.stringify(updatedRecent));
        return updatedRecent;
      });

      logger.info('Search completed', 'SearchPage', {
        query: searchQuery,
        resultsCount: response.results?.length || 0,
      });
    } catch (error) {
      logger.error('Search failed', 'SearchPage', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [contentType, semanticMode, isPremium]);

  // Debounced search - triggers on query, semantic mode, or content type change
  useEffect(() => {
    if (isInitialLoad) return;

    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
        // Update URL
        searchParams.set('q', query);
        setSearchParams(searchParams, { replace: true });
      } else {
        setResults([]);
        searchParams.delete('q');
        setSearchParams(searchParams, { replace: true });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, semanticMode, contentType, performSearch, isInitialLoad]);

  // Handle search selection (trending/recent)
  const handleSearchSelect = (searchQuery: string) => {
    setQuery(searchQuery);
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    const route = result.type === 'live'
      ? `/live/${result.id}`
      : result.type === 'radio'
      ? `/radio/${result.id}`
      : result.type === 'podcast'
      ? `/podcasts/${result.id}`
      : `/vod/${result.id}`;

    navigate(route);
  };

  // Show initial loading
  if (isInitialLoad) {
    return (
      <PageLoading
        title={t('search.title', 'Search')}
        message={t('common.loading', 'Loading...')}
        isRTL={isRTL}
        icon={<Search size={24} color={colors.primary.DEFAULT} />}
      />
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.container, isMobile && styles.containerMobile]}>
        {/* Header - Smaller on mobile */}
        {!isMobile && (
          <GlassPageHeader
            title={t('search.title', 'Search')}
            pageType="search"
            isRTL={isRTL}
            icon={<Search size={24} color={colors.primary.DEFAULT} />}
          />
        )}

        {/* AI Search Toggle (Premium) - Hidden on mobile */}
        {!isMobile && isPremium && (
          <View style={styles.aiToggleContainer}>
            <View style={styles.aiToggleRow}>
              <Sparkles size={18} color={colors.primary.DEFAULT} />
              <Text style={styles.aiToggleLabel}>
                {t('search.aiSearch', 'AI Search')}
              </Text>
              <GlassToggle
                value={semanticMode}
                onValueChange={setSemanticMode}
              />
            </View>
            <Text style={styles.aiExplanation}>
              {semanticMode
                ? t('search.aiSearchActive', 'AI-powered semantic search is active - finding results based on meaning and context')
                : t('search.aiSearchInactive', 'Enable AI search for smarter results based on meaning, not just keywords')
              }
            </Text>
          </View>
        )}

        {/* Search Input */}
        <View style={[styles.searchContainer, isMobile && styles.searchContainerMobile]}>
          <GlassInput
            value={query}
            onChangeText={setQuery}
            placeholder={isMobile ? t('search.placeholderShort', 'Search...') : t('search.placeholder', 'Search for content...')}
            placeholderTextColor={colors.textMuted}
            containerStyle={styles.searchInputContainer}
            inputStyle={[styles.searchInput, isMobile && styles.searchInputMobile]}
            rightIcon={query.length > 0 ? <X size={isMobile ? 18 : 20} color={colors.textSecondary} /> : undefined}
            onRightIconPress={() => setQuery('')}
            disableFocusBorder={true}
            noBorder={true}
            autoFocus={!isMobile}
          />

          {/* Search Button */}
          <Pressable
            onPress={() => query.trim() && performSearch(query)}
            style={[styles.searchButton, isMobile && styles.searchButtonMobile]}
          >
            <Search size={isMobile ? 20 : 24} color={colors.primary.DEFAULT} />
          </Pressable>
        </View>

        {/* Content Type Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.filtersScroll, isMobile && styles.filtersScrollMobile]}
          contentContainerStyle={[styles.filtersContent, isMobile && styles.filtersContentMobile]}
        >
          <GlassCategoryPill
            label={t('search.filters.all', 'All')}
            isActive={contentType === 'all'}
            onPress={() => setContentType('all')}
          />
          <GlassCategoryPill
            label={isMobile ? t('search.filters.vodShort', 'Movies') : t('search.filters.vod', 'Movies & Series')}
            isActive={contentType === 'vod'}
            onPress={() => setContentType('vod')}
          />
          <GlassCategoryPill
            label={t('search.filters.live', 'Channels')}
            isActive={contentType === 'live'}
            onPress={() => setContentType('live')}
          />
          {/* Radio filter - hidden on mobile */}
          {!isMobile && (
            <GlassCategoryPill
              label={t('search.filters.radio', 'Radio')}
              isActive={contentType === 'radio'}
              onPress={() => setContentType('radio')}
            />
          )}
          <GlassCategoryPill
            label={t('search.filters.podcast', 'Podcasts')}
            isActive={contentType === 'podcasts'}
            onPress={() => setContentType('podcasts')}
          />
        </ScrollView>

        {/* Trending Searches - Hidden on mobile */}
        {!isMobile && query.trim().length === 0 && (
          <View style={styles.trendingSection}>
            <View style={styles.trendingHeader}>
              <TrendingUp size={16} color={colors.primary.DEFAULT} />
              <Text style={styles.trendingTitle}>
                {t('search.trending', 'Trending')}
              </Text>
            </View>
            <View style={styles.trendingPills}>
              {TRENDING_SEARCHES.map((search, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleSearchSelect(search)}
                  style={styles.trendingPill}
                >
                  <Text style={styles.trendingText}>{search}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Search Results Section - Always visible when query exists */}
        {query.trim().length > 0 && (
          <View style={styles.resultsSection}>
            {/* Results Header */}
            <View style={styles.resultsHeader}>
              <Search size={20} color={colors.primary.DEFAULT} />
              <Text style={styles.resultsTitle}>
                {t('search.resultsTitle', 'Search Results')}
              </Text>
            </View>

            {loading ? (
              // Loading
              <View style={styles.loadingContainer}>
                <GlassLoadingSpinner size={64} />
                <Text style={styles.loadingText}>
                  {t('search.searching', 'Searching...')}
                </Text>
              </View>
            ) : results.length === 0 ? (
              // No Results
              <GlassCard style={styles.emptyCard}>
                <NativeIcon name="search" size="xl" color={colors.textMuted} />
                <Text style={styles.emptyTitle}>
                  {t('search.noResults', 'No results found')}
                </Text>
                <Text style={styles.emptyText}>
                  {t('search.tryDifferent', 'Try different search terms')}
                </Text>
              </GlassCard>
            ) : (
              // Results Grid
              <>
                <Text style={styles.resultsCount}>
                  {t('search.resultsFound', '{{count}} results found for "{{query}}"', {
                    count: results.length,
                    query: query,
                  })}
                </Text>

                <View style={styles.resultsGrid}>
                  {results.map((result, index) => (
                    <View
                      key={result.id}
                      style={{ width: `${100 / numColumns}%`, padding: spacing.xs }}
                    >
                      <Pressable onPress={() => handleResultClick(result)}>
                        <ContentCard content={result} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  containerMobile: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: 80, // Space for bottom nav
  },
  searchContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchContainerMobile: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    borderWidth: 0,
    outlineWidth: 0,
    marginBottom: 0,
  },
  searchInput: {
    fontSize: fontSize.lg,
    color: colors.text,
    outlineWidth: 0,
    borderWidth: 0,
  },
  searchInputMobile: {
    fontSize: fontSize.base,
    paddingHorizontal: spacing.sm,
  },
  searchButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    backdropFilter: 'blur(12px)',
  },
  searchButtonMobile: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
  },
  filtersScroll: {
    flexDirection: 'row-reverse',
    marginBottom: spacing.sm,
    flex: 0,
    height: 'auto' as any,
    maxHeight: 'max-content' as any,
  },
  filtersScrollMobile: {
    marginBottom: spacing.xs,
    marginHorizontal: -spacing.sm, // Extend to edges
  },
  filtersContent: {
    gap: spacing.sm,
    paddingVertical: 0,
    maxHeight: 'max-content' as any,
  },
  filtersContentMobile: {
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  aiToggleContainer: {
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    padding: spacing.md,
    marginBottom: spacing.md,
    backdropFilter: 'blur(12px)',
  },
  aiToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  aiToggleLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
    flex: 1,
  },
  aiExplanation: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
  errorMessage: {
    fontSize: fontSize.sm,
    color: colors.error.DEFAULT,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    minHeight: 500,
    flex: 1,
  },
  loadingText: {
    fontSize: fontSize.lg,
    color: colors.text,
    marginTop: spacing.xl,
  },
  trendingSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  trendingTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendingPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  trendingPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  trendingText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.primary.DEFAULT,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing['4xl'],
    minHeight: 400,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  resultsSection: {
    marginTop: spacing.sm,
    minHeight: 500,
    flex: 1,
  },
  resultsContainer: {
    gap: spacing.lg,
    flex: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  resultsTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
  },
  resultsCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
