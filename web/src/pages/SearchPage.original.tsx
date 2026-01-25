/**
 * SearchPage Component (Web)
 *
 * Comprehensive search page with:
 * - Text and subtitle search via unified search API
 * - Advanced filtering (genre, year, rating, language)
 * - LLM-powered natural language search (premium)
 * - Recent searches with localStorage persistence
 * - Voice search integration
 * - Glass design system with StyleSheet
 */

import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { VoiceSearchButton } from '@bayit/shared';
import { chatService } from '@/services/api';
import { useAuthStore } from '@bayit/shared-stores';
import logger from '@/utils/logger';

// Shared search components
import { useSearch } from '@bayit/shared-hooks';
import {
  SearchBar,
  SearchFilters,
  SearchResults,
  LLMSearchButton,
  LLMSearchModal,
} from '@bayit/shared/search';

// Theme
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

// Content type filter options
const CONTENT_TYPE_FILTERS = [
  { id: 'all', label: 'search.filters.all' },
  { id: 'vod', label: 'search.filters.vod' },
  { id: 'live', label: 'search.filters.live' },
  { id: 'radio', label: 'search.filters.radio' },
  { id: 'podcast', label: 'search.filters.podcast' },
];

export default function SearchPage() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Advanced filters panel state
  const [showFilters, setShowFilters] = useState(false);

  // LLM search modal state
  const [showLLMSearch, setShowLLMSearch] = useState(false);

  // Premium user status from auth store
  const isPremium = useAuthStore((state) => state.isPremium());

  // Active content type filter
  const [activeContentType, setActiveContentType] = useState(
    searchParams.get('type') || 'all'
  );

  // Initialize search hook with configuration
  const {
    query,
    setQuery,
    filters,
    setFilters,
    results,
    loading,
    error,
    suggestions,
    recentSearches,
    search,
    clearSearch,
    handleResultClick: trackResultClick,
  } = useSearch({
    debounceMs: 300,
    enableLLM: isPremium,
    autoSearch: true,
    onResultClick: (result, index) => {
      // Track click and navigate
      logger.info('Search result clicked', 'SearchPage', {
        resultId: result.id,
        position: index,
        query
      });
      navigate(`/watch/${result.id}`);
    },
  });

  // Sync query with URL params
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [searchParams]);

  // Update URL when query changes
  useEffect(() => {
    if (query.trim()) {
      searchParams.set('q', query);
    } else {
      searchParams.delete('q');
    }
    setSearchParams(searchParams);
  }, [query]);

  // Handle content type filter change
  const handleContentTypeChange = useCallback((typeId: string) => {
    setActiveContentType(typeId);

    const contentTypes = typeId === 'all' ? ['vod', 'live', 'radio', 'podcast'] : [typeId];
    setFilters({ ...filters, contentTypes });

    // Update URL
    if (typeId === 'all') {
      searchParams.delete('type');
    } else {
      searchParams.set('type', typeId);
    }
    setSearchParams(searchParams);
  }, [filters, setFilters, searchParams, setSearchParams]);

  // Handle voice search result
  const handleVoiceResult = useCallback((text: string) => {
    if (text.trim()) {
      setQuery(text);
      logger.info('Voice search performed', 'SearchPage', { query: text });
    }
  }, [setQuery]);

  // Handle recent search click
  const handleRecentSearchClick = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
    logger.info('Recent search clicked', 'SearchPage', { query: recentQuery });
  }, [setQuery]);

  // Handle LLM search
  const handleLLMSearch = useCallback((llmQuery: string, llmResults: any) => {
    logger.info('LLM search completed', 'SearchPage', {
      query: llmQuery,
      resultCount: llmResults.results?.length,
      interpretation: llmResults.interpretation
    });
    setShowLLMSearch(false);
    // Results are already updated via the search hook
  }, []);

  // Handle advanced filters apply
  const handleFiltersApply = useCallback(() => {
    setShowFilters(false);
    logger.info('Advanced filters applied', 'SearchPage', { filters });
  }, [filters]);

  const hasQuery = !!searchParams.get('q');
  const showInitialState = !hasQuery && !loading && results.length === 0;

  return (
    <View style={styles.container}>
      {/* Main Content Container */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          IS_TV_BUILD && styles.scrollContentTV
        ]}
      >
        {/* Search Bar Section */}
        <View style={[styles.searchSection, IS_TV_BUILD && styles.searchSectionTV]}>
          <View style={styles.searchBarRow}>
            {/* Main Search Bar */}
            <View style={styles.searchBarContainer}>
              <SearchBar
                value={query}
                onChange={setQuery}
                suggestions={suggestions}
                showVoiceButton={true}
                onVoicePress={async (audioBlob) => {
                  try {
                    const text = await chatService.transcribeAudio(audioBlob);
                    handleVoiceResult(text);
                  } catch (err) {
                    logger.error('Voice search failed', 'SearchPage', err);
                  }
                }}
                placeholder={t('search.placeholder')}
                isRTL={isRTL}
                autoFocus={!IS_TV_BUILD}
              />
            </View>

            {/* LLM Search Button */}
            <LLMSearchButton
              onPress={() => setShowLLMSearch(true)}
              isPremium={isPremium}
              disabled={false}
            />

            {/* Advanced Filters Button */}
            <TouchableOpacity
              onPress={() => setShowFilters(true)}
              style={[
                styles.filtersButton,
                IS_TV_BUILD && styles.filtersButtonTV
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.filtersButtonContent}>
                <Text style={[styles.filtersEmoji, IS_TV_BUILD && styles.filtersEmojiTV]}>⚙️</Text>
                <Text style={[
                  styles.filtersText,
                  IS_TV_BUILD && styles.filtersTextTV
                ]}>
                  {t('search.advancedFilters', { defaultValue: 'Filters' })}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Content Type Filter Pills */}
          <View style={[styles.filterPillsRow, IS_TV_BUILD && styles.filterPillsRowTV]}>
            {CONTENT_TYPE_FILTERS.map((filter) => {
              const isActive = activeContentType === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  onPress={() => handleContentTypeChange(filter.id)}
                  style={[
                    styles.filterPill,
                    isActive ? styles.filterPillActive : styles.filterPillInactive,
                    IS_TV_BUILD && styles.filterPillTV
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.filterPillText,
                    isActive ? styles.filterPillTextActive : styles.filterPillTextInactive,
                    IS_TV_BUILD && styles.filterPillTextTV
                  ]}>
                    {t(filter.label, { defaultValue: filter.id.toUpperCase() })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Active Filters Summary */}
          {(filters.genres?.length || filters.yearMin || filters.ratingMin || filters.subtitleLanguages?.length) && (
            <View style={styles.activeFiltersContainer}>
              <Text style={styles.activeFiltersLabel}>
                {t('search.activeFilters', { defaultValue: 'Active filters:' })}
              </Text>
              {filters.genres?.map((genre) => (
                <View key={genre} style={[styles.filterBadge, styles.filterBadgeGenre]}>
                  <Text style={[styles.filterBadgeText, styles.filterBadgeTextGenre]}>{genre}</Text>
                </View>
              ))}
              {filters.yearMin && (
                <View style={[styles.filterBadge, styles.filterBadgeYear]}>
                  <Text style={[styles.filterBadgeText, styles.filterBadgeTextYear]}>
                    {filters.yearMin}{filters.yearMax ? `-${filters.yearMax}` : '+'}
                  </Text>
                </View>
              )}
              {filters.ratingMin && (
                <View style={[styles.filterBadge, styles.filterBadgeRating]}>
                  <Text style={[styles.filterBadgeText, styles.filterBadgeTextRating]}>{filters.ratingMin}+ ⭐</Text>
                </View>
              )}
              {filters.subtitleLanguages?.map((lang) => (
                <View key={lang} style={[styles.filterBadge, styles.filterBadgeSubtitle]}>
                  <Text style={[styles.filterBadgeText, styles.filterBadgeTextSubtitle]}>{lang.toUpperCase()}</Text>
                </View>
              ))}
              <TouchableOpacity
                onPress={() => setFilters({ contentTypes: filters.contentTypes })}
                style={[styles.filterBadge, styles.filterBadgeClear]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterBadgeText, styles.filterBadgeTextClear]}>✕ Clear All</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Search Results or Initial State */}
        {showInitialState ? (
          <View style={styles.initialStateContainer}>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={[styles.recentSearchesSection, IS_TV_BUILD && styles.recentSearchesSectionTV]}>
                <View style={styles.recentSearchesHeader}>
                  <Text style={[styles.recentSearchesEmoji, IS_TV_BUILD && styles.recentSearchesEmojiTV]}>🕐</Text>
                  <Text style={[
                    styles.recentSearchesTitle,
                    IS_TV_BUILD && styles.recentSearchesTitleTV
                  ]}>
                    {t('search.recentSearches', { defaultValue: 'Recent Searches' })}
                  </Text>
                </View>
                <View style={[styles.recentSearchesGrid, IS_TV_BUILD && styles.recentSearchesGridTV]}>
                  {recentSearches.map((recentQuery, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleRecentSearchClick(recentQuery)}
                      style={[
                        styles.recentSearchChip,
                        IS_TV_BUILD && styles.recentSearchChipTV
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.recentSearchChipText,
                        IS_TV_BUILD && styles.recentSearchChipTextTV
                      ]}>
                        {recentQuery}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Initial Prompt */}
            <View style={[
              styles.promptContainer,
              IS_TV_BUILD && styles.promptContainerTV
            ]}>
              <Text style={[styles.promptEmoji, IS_TV_BUILD && styles.promptEmojiTV]}>🔍</Text>
              <Text style={[
                styles.promptTitle,
                IS_TV_BUILD && styles.promptTitleTV
              ]}>
                {t('search.promptTitle', { defaultValue: 'Search for Content' })}
              </Text>
              <Text style={[
                styles.promptDescription,
                IS_TV_BUILD && styles.promptDescriptionTV
              ]}>
                {t('search.promptDescription', {
                  defaultValue: 'Search for movies, series, live channels, podcasts, and more. Use advanced filters or smart search for best results.'
                })}
              </Text>
            </View>
          </View>
        ) : (
          <SearchResults
            results={results}
            loading={loading}
            onResultPress={(result, index) => trackResultClick(result, index)}
            emptyMessage={
              error
                ? t('search.error', { defaultValue: 'Search failed. Please try again.' })
                : t('search.noResults', { defaultValue: 'No results found. Try different keywords.' })
            }
            numColumns={IS_TV_BUILD ? 6 : 4}
          />
        )}
      </ScrollView>

      {/* Advanced Filters Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalBackground}>
          <View style={[
            styles.modalContent,
            IS_TV_BUILD && styles.modalContentTV
          ]}>
            <SearchFilters
              filters={filters}
              onFiltersChange={setFilters}
              onClose={() => setShowFilters(false)}
            />
          </View>
        </View>
      </Modal>

      {/* LLM Search Modal */}
      <LLMSearchModal
        visible={showLLMSearch}
        onClose={() => setShowLLMSearch(false)}
        onSearch={handleLLMSearch}
        isPremium={isPremium}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    maxWidth: 1280,
    marginHorizontal: 'auto',
    width: '100%',
  },
  scrollContentTV: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
  },

  // Search Bar Section
  searchSection: {
    marginBottom: spacing.lg,
  },
  searchSectionTV: {
    marginBottom: spacing.xxl,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  searchBarContainer: {
    flex: 1,
  },

  // Advanced Filters Button
  filtersButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filtersButtonTV: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 20,
  },
  filtersButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filtersEmoji: {
    fontSize: fontSize.xl,
  },
  filtersEmojiTV: {
    fontSize: fontSize['3xl'],
  },
  filtersText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: fontSize.base,
  },
  filtersTextTV: {
    fontSize: fontSize.xl,
  },

  // Content Type Filter Pills
  filterPillsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  filterPillsRowTV: {
    gap: spacing.md,
  },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    borderWidth: 2,
  },
  filterPillTV: {
    paddingHorizontal: 28,
    paddingVertical: spacing.md,
  },
  filterPillActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primaryLight,
  },
  filterPillInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterPillText: {
    fontWeight: '500',
  },
  filterPillTextTV: {
    fontSize: fontSize.lg,
  },
  filterPillTextActive: {
    color: colors.text,
  },
  filterPillTextInactive: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: fontSize.sm,
  },

  // Active Filters Summary
  activeFiltersContainer: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  activeFiltersLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: fontSize.sm,
  },
  filterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  filterBadgeGenre: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  filterBadgeYear: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  filterBadgeRating: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
  },
  filterBadgeSubtitle: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
  },
  filterBadgeClear: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  filterBadgeText: {
    fontSize: fontSize.xs,
  },
  filterBadgeTextGenre: {
    color: '#93c5fd',
  },
  filterBadgeTextYear: {
    color: '#6ee7b7',
  },
  filterBadgeTextRating: {
    color: '#fcd34d',
  },
  filterBadgeTextSubtitle: {
    color: '#d8b4fe',
  },
  filterBadgeTextClear: {
    color: '#fca5a5',
  },

  // Initial State
  initialStateContainer: {
    flex: 1,
  },

  // Recent Searches
  recentSearchesSection: {
    marginBottom: spacing.xl,
  },
  recentSearchesSectionTV: {
    marginBottom: spacing.xxl,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  recentSearchesEmoji: {
    fontSize: fontSize['2xl'],
  },
  recentSearchesEmojiTV: {
    fontSize: fontSize['3xl'],
  },
  recentSearchesTitle: {
    color: colors.text,
    fontWeight: '600',
    fontSize: fontSize.lg,
  },
  recentSearchesTitleTV: {
    fontSize: fontSize['2xl'],
  },
  recentSearchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  recentSearchesGridTV: {
    gap: spacing.md,
  },
  recentSearchChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recentSearchChipTV: {
    paddingHorizontal: 28,
    paddingVertical: spacing.md,
  },
  recentSearchChipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: fontSize.sm,
  },
  recentSearchChipTextTV: {
    fontSize: fontSize.lg,
  },

  // Initial Prompt
  promptContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  promptContainerTV: {
    paddingVertical: 128,
  },
  promptEmoji: {
    fontSize: 96,
    marginBottom: spacing.lg,
  },
  promptEmojiTV: {
    fontSize: 112,
    marginBottom: spacing.xl,
  },
  promptTitle: {
    color: colors.text,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 12,
    fontSize: fontSize['2xl'],
  },
  promptTitleTV: {
    fontSize: fontSize['4xl'],
    marginBottom: spacing.md,
  },
  promptDescription: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    maxWidth: 448,
    fontSize: fontSize.base,
  },
  promptDescriptionTV: {
    fontSize: fontSize.xl,
    maxWidth: 672,
  },

  // Modal
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    flex: 1,
    marginTop: 80,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  modalContentTV: {
    marginTop: 96,
  },
});
