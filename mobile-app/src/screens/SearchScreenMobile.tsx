/**
 * SearchScreenMobile Component
 *
 * Mobile-optimized comprehensive search screen with:
 * - Text and subtitle search via unified search API
 * - Advanced filtering (genre, year, rating, language)
 * - LLM-powered natural language search (premium)
 * - Recent searches with AsyncStorage persistence
 * - Voice search integration
 * - Bottom sheet for advanced filters
 * - Glass design system with StyleSheet
 * - Responsive grid layout
 * - Pull-to-refresh
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { chatService } from '@bayit/shared-services';
import { useAuthStore } from '@bayit/shared-stores';
import { getLocalizedName } from '@bayit/shared-utils';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

// Shared search components
import { useSearch } from '../../../shared/hooks/useSearch';
import { SearchBar } from '../../../shared/components/search/SearchBar';
import { SearchFilters } from '../../../shared/components/search/SearchFilters';
import { SearchResults } from '../../../shared/components/search/SearchResults';
import { LLMSearchModal } from '../../../shared/components/search/LLMSearchModal';

type SearchRoute = RouteProp<RootStackParamList, 'Search'>;

interface SearchResult {
  id: string;
  type?: string;
  title?: string;
  [key: string]: unknown;
}

// Content type filter options
const CONTENT_TYPE_FILTERS = [
  { id: 'all', label: 'search.filters.all' },
  { id: 'vod', label: 'search.filters.vod' },
  { id: 'live', label: 'search.filters.live' },
  { id: 'radio', label: 'search.filters.radio' },
  { id: 'podcast', label: 'search.filters.podcast' },
];

export const SearchScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<SearchRoute>();
  const routeParams = route.params;
  const { isRTL } = useDirection();
  const { orientation } = useResponsive();

  // Advanced filters bottom sheet state
  const [showFilters, setShowFilters] = useState(false);

  // LLM search modal state
  const [showLLMSearch, setShowLLMSearch] = useState(false);

  // Premium user status from auth store
  const isPremium = useAuthStore((state: { isPremium: () => boolean }) => state.isPremium());

  // Refresh control
  const [refreshing, setRefreshing] = useState(false);

  // Active content type filter
  const [activeContentType, setActiveContentType] = useState('all');

  // Responsive column count
  const numColumns = getGridColumns({
    phone: 2,
    tablet: orientation === 'landscape' ? 5 : 3,
  });

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
    onResultClick: (result: SearchResult, index: number) => {
      // Haptic feedback on iOS
      if (Platform.OS === 'ios') {
        ReactNativeHapticFeedback.trigger('impactLight');
      }

      // Navigate to player
      navigation.navigate('Player', {
        id: result.id,
        title: getLocalizedName(result, i18n.language),
        type: (result.type as 'vod' | 'live' | 'radio' | 'podcast') || 'vod',
      });
    },
  });

  // Initialize with route query parameter
  useEffect(() => {
    if (routeParams?.query) {
      setQuery(routeParams.query);
    }
  }, [routeParams?.query]);

  // Handle content type filter change
  const handleContentTypeChange = useCallback((typeId: string) => {
    setActiveContentType(typeId);

    const contentTypes = typeId === 'all'
      ? ['vod', 'live', 'radio', 'podcast']
      : [typeId];

    setFilters({ ...filters, contentTypes });
  }, [filters, setFilters]);

  // Handle voice search result
  const handleVoiceResult = useCallback(async (audioBlob: Blob) => {
    try {
      if (Platform.OS === 'ios') {
        ReactNativeHapticFeedback.trigger('notificationSuccess');
      }

      const text = await chatService.transcribeAudio(audioBlob);
      if (text.trim()) {
        setQuery(text);
      }
    } catch (err) {
      console.error('Voice search failed:', err);
      if (Platform.OS === 'ios') {
        ReactNativeHapticFeedback.trigger('notificationError');
      }
    }
  }, [setQuery]);

  // Handle recent search click
  const handleRecentSearchClick = useCallback((recentQuery: string) => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('selection');
    }
    setQuery(recentQuery);
  }, [setQuery]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('selection');
    }
    setQuery(suggestion);
  }, [setQuery]);

  // Handle LLM search
  const handleLLMSearch = useCallback((llmQuery: string, llmResults: any) => {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('notificationSuccess');
    }
    setShowLLMSearch(false);
    // Results are already updated via the search hook
  }, []);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await search();
    } finally {
      setRefreshing(false);
    }
  }, [search]);

  const hasQuery = !!query.trim();
  const showInitialState = !hasQuery && !loading && results.length === 0;
  const hasActiveFilters = !!(filters.genres?.length || filters.yearMin || filters.ratingMin || filters.subtitleLanguages?.length);

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>{isRTL ? '\u2192' : '\u2190'}</Text>
          </TouchableOpacity>

          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <SearchBar
              value={query}
              onChange={setQuery}
              suggestions={suggestions}
              showVoiceButton={true}
              onVoicePress={handleVoiceResult}
              placeholder={t('search.placeholder')}
              isRTL={isRTL}
              autoFocus={!routeParams?.query}
            />
          </View>

          {/* LLM Search Button (compact for mobile) */}
          <TouchableOpacity
            onPress={() => setShowLLMSearch(true)}
            style={styles.llmButton}
            activeOpacity={0.7}
          >
            <Text style={styles.llmButtonIcon}>&#129302;</Text>
            {!isPremium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>P</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Content Type Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {CONTENT_TYPE_FILTERS.map((filter) => {
            const isActive = activeContentType === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                onPress={() => handleContentTypeChange(filter.id)}
                style={[
                  styles.filterPill,
                  isActive ? styles.filterPillActive : styles.filterPillInactive,
                ]}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.filterPillText,
                  isActive ? styles.filterPillTextActive : styles.filterPillTextInactive,
                ]}>
                  {t(filter.label, { defaultValue: filter.id.toUpperCase() })}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Advanced Filters Button */}
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={styles.moreFiltersButton}
            activeOpacity={0.7}
          >
            <View style={styles.moreFiltersContent}>
              <Text style={styles.moreFiltersIcon}>&#9881;&#65039;</Text>
              <Text style={styles.moreFiltersText}>
                {t('search.moreFilters', { defaultValue: 'More' })}
              </Text>
              {hasActiveFilters && (
                <View style={styles.activeFilterIndicator} />
              )}
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Active Filters Summary (compact for mobile) */}
        {hasActiveFilters && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersContainer}
          >
            {filters.genres?.slice(0, 3).map((genre: string) => (
              <View key={genre} style={styles.genreTag}>
                <Text style={styles.genreTagText}>{genre}</Text>
              </View>
            ))}
            {filters.genres && filters.genres.length > 3 && (
              <View style={styles.genreTag}>
                <Text style={styles.genreTagText}>+{filters.genres.length - 3}</Text>
              </View>
            )}
            {filters.yearMin && (
              <View style={styles.yearTag}>
                <Text style={styles.yearTagText}>
                  {filters.yearMin}{filters.yearMax ? `-${filters.yearMax}` : '+'}
                </Text>
              </View>
            )}
            {filters.ratingMin && (
              <View style={styles.ratingTag}>
                <Text style={styles.ratingTagText}>{filters.ratingMin}+ &#11088;</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setFilters({ contentTypes: filters.contentTypes })}
              style={styles.clearFiltersButton}
              activeOpacity={0.7}
            >
              <Text style={styles.clearFiltersText}>&#10005;</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Search Results or Initial State */}
      {showInitialState ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.initialStateContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>&#128336;</Text>
                <Text style={styles.sectionTitle}>
                  {t('search.recentSearches', { defaultValue: 'Recent Searches' })}
                </Text>
              </View>
              <View style={styles.recentSearchesContainer}>
                {recentSearches.map((recentQuery: string, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleRecentSearchClick(recentQuery)}
                    style={styles.recentSearchItem}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.recentSearchText}>{recentQuery}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Suggestions (when typing) */}
          {suggestions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>&#128161;</Text>
                <Text style={styles.sectionTitle}>
                  {t('search.suggestions', { defaultValue: 'Suggestions' })}
                </Text>
              </View>
              {suggestions.map((suggestion: string, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSuggestionClick(suggestion)}
                  style={styles.suggestionItem}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionIcon}>&#128269;</Text>
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                    <Text style={styles.suggestionArrow}>&#8598;</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Initial Prompt */}
          <View style={styles.initialPrompt}>
            <Text style={styles.initialPromptIcon}>&#128269;</Text>
            <Text style={styles.initialPromptTitle}>
              {t('search.promptTitle', { defaultValue: 'Search for Content' })}
            </Text>
            <Text style={styles.initialPromptDescription}>
              {t('search.promptDescription', {
                defaultValue: 'Search for movies, series, live channels, podcasts, and more. Use advanced filters or smart search for best results.'
              })}
            </Text>
          </View>
        </ScrollView>
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
          numColumns={numColumns}
        />
      )}

      {/* Advanced Filters Bottom Sheet Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowFilters(false)}
            style={styles.modalDismissArea}
          />
          <View style={styles.filtersSheet}>
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  backButtonText: {
    color: colors.text,
    fontSize: 20,
  },
  searchBarContainer: {
    flex: 1,
  },
  llmButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.5)',
  },
  llmButtonIcon: {
    fontSize: 24,
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    backgroundColor: '#eab308',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadgeText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
  filtersContainer: {
    gap: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 9999,
    borderWidth: 1,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: 'rgba(168, 85, 247, 0.8)',
  },
  filterPillInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: colors.text,
  },
  filterPillTextInactive: {
    color: colors.textSecondary,
  },
  moreFiltersButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  moreFiltersContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  moreFiltersIcon: {
    fontSize: 16,
  },
  moreFiltersText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterIndicator: {
    width: 8,
    height: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 4,
    marginLeft: spacing.xs,
  },
  activeFiltersContainer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  genreTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 9999,
  },
  genreTagText: {
    color: '#93c5fd',
    fontSize: 12,
  },
  yearTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 9999,
  },
  yearTagText: {
    color: '#86efac',
    fontSize: 12,
  },
  ratingTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(234, 179, 8, 0.3)',
    borderRadius: 9999,
  },
  ratingTagText: {
    color: '#fde047',
    fontSize: 12,
  },
  clearFiltersButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 9999,
  },
  clearFiltersText: {
    color: '#fca5a5',
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  initialStateContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  recentSearchesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recentSearchItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recentSearchText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  suggestionItem: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  suggestionIcon: {
    fontSize: 18,
  },
  suggestionText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  suggestionArrow: {
    color: colors.textTertiary,
    fontSize: 18,
  },
  initialPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  initialPromptIcon: {
    fontSize: 72,
    marginBottom: spacing.lg,
  },
  initialPromptTitle: {
    color: colors.text,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 20,
    marginBottom: spacing.sm,
  },
  initialPromptDescription: {
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    fontSize: 14,
    paddingHorizontal: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalDismissArea: {
    flex: 1,
  },
  filtersSheet: {
    height: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
});

export default SearchScreenMobile;
