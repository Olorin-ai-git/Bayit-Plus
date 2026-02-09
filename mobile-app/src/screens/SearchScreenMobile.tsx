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
 * - Glass design system with TailwindCSS
 * - Responsive grid layout
 * - Pull-to-refresh
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { chatService } from '@bayit/shared-services';
import { useAuthStore } from '@bayit/shared-stores';
import { getLocalizedName } from '@bayit/shared-utils';
import { GlassModal } from '@olorin/glass-ui/native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useResponsive } from '../hooks/useResponsive';
import { useSafeAreaPadding } from '../hooks/useSafeAreaPadding';
import { getGridColumns } from '../utils/responsive';
import { colors } from '@olorin/design-tokens';
import { Colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

// Shared search components
import { useSearch } from '../../../shared/hooks/useSearch';
import { SearchBar } from '../../../shared/components/search/SearchBar';
import { SearchFilters } from '../../../shared/components/search/SearchFilters';
import { SearchResults } from '../../../shared/components/search/SearchResults';
import { LLMSearchModal } from '../../../shared/components/search/LLMSearchModal';

import logger from '@/utils/logger';


const moduleLogger = logger.scope('SearchScreenMobile');

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
  const safeAreaPadding = useSafeAreaPadding();

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
      moduleLogger.error('Voice search failed:', err);
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
    <View className="flex-1" style={[{ backgroundColor: colors.background }, safeAreaPadding]}>
      {/* Search Header */}
      <View className="px-6 pb-4 bg-black/40 border-b border-white/10">
        <View className="flex-row items-center gap-4 mb-4">
          {/* Back Button */}
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center bg-white/10 rounded-full"
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <NativeIcon name={isRTL ? 'arrowRight' : 'arrowLeft'} size="sm" color={colors.text} />
          </Pressable>

          {/* Search Bar */}
          <View className="flex-1">
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
          <Pressable
            onPress={() => setShowLLMSearch(true)}
            className="w-12 h-12 items-center justify-center bg-purple-500/30 rounded-full border border-purple-500/50"
            accessibilityRole="button"
            accessibilityLabel={t('search.aiSearch', { defaultValue: 'AI Search' })}
          >
            <NativeIcon name="ai" size="md" color={colors.primary} />
            {!isPremium && (
              <View className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full items-center justify-center">
                <Text className="text-[10px] font-bold" style={{ color: colors.text }}>P</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Content Type Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {CONTENT_TYPE_FILTERS.map((filter) => {
            const isActive = activeContentType === filter.id;
            return (
              <Pressable
                key={filter.id}
                onPress={() => handleContentTypeChange(filter.id)}
                className={`px-6 py-2 rounded-full border ${
                  isActive
                    ? 'bg-purple-500 border-purple-500/80'
                    : 'bg-white/5 border-white/10'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  className={`text-sm font-medium ${
                    isActive ? 'text-white' : ''
                  }`}
                  style={{ color: isActive ? colors.text : colors.textSecondary }}
                >
                  {t(filter.label, { defaultValue: filter.id.toUpperCase() })}
                </Text>
              </Pressable>
            );
          })}

          {/* Advanced Filters Button */}
          <Pressable
            onPress={() => setShowFilters(true)}
            className="px-6 py-2 rounded-full border border-white/20 bg-white/5"
            accessibilityRole="button"
            accessibilityLabel={t('search.moreFilters', { defaultValue: 'More Filters' })}
          >
            <View className="flex-row items-center gap-1">
              <NativeIcon name="settings" size="xs" color={colors.textSecondary} />
              <Text className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                {t('search.moreFilters', { defaultValue: 'More' })}
              </Text>
              {hasActiveFilters && (
                <View className="w-2 h-2 bg-blue-500 rounded-full ml-1" />
              )}
            </View>
          </Pressable>
        </ScrollView>

        {/* Active Filters Summary (compact for mobile) */}
        {hasActiveFilters && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, marginTop: 8 }}
          >
            {filters.genres?.slice(0, 3).map((genre: string) => (
              <View key={genre} className="px-4 py-1 bg-blue-500/30 rounded-full">
                <Text className="text-xs text-blue-300">{genre}</Text>
              </View>
            ))}
            {filters.genres && filters.genres.length > 3 && (
              <View className="px-4 py-1 bg-blue-500/30 rounded-full">
                <Text className="text-xs text-blue-300">+{filters.genres.length - 3}</Text>
              </View>
            )}
            {filters.yearMin && (
              <View className="px-4 py-1 bg-green-500/30 rounded-full">
                <Text className="text-xs text-green-300">
                  {filters.yearMin}{filters.yearMax ? `-${filters.yearMax}` : '+'}
                </Text>
              </View>
            )}
            {filters.ratingMin && (
              <View className="px-4 py-1 bg-yellow-500/30 rounded-full">
                <Text className="text-xs text-yellow-300">{filters.ratingMin}+</Text>
              </View>
            )}
            <Pressable
              onPress={() => setFilters({ contentTypes: filters.contentTypes })}
              className="px-4 py-1 bg-red-500/30 rounded-full"
              accessibilityRole="button"
              accessibilityLabel={t('search.clearFilters', { defaultValue: 'Clear filters' })}
            >
              <NativeIcon name="close" size="xs" color={Colors.Error.e400} />
            </Pressable>
          </ScrollView>
        )}
      </View>

      {/* Search Results or Initial State */}
      {showInitialState ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center gap-2 mb-4">
                <NativeIcon name="clock" size="sm" color={colors.textSecondary} />
                <Text className="font-semibold text-base" style={{ color: colors.text }}>
                  {t('search.recentSearches', { defaultValue: 'Recent Searches' })}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {recentSearches.map((recentQuery: string, idx: number) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleRecentSearchClick(recentQuery)}
                    className="px-6 py-2 rounded-full bg-white/5 border border-white/10"
                    accessibilityRole="button"
                  >
                    <Text className="text-sm" style={{ color: colors.textSecondary }}>
                      {recentQuery}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Suggestions (when typing) */}
          {suggestions.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center gap-2 mb-4">
                <NativeIcon name="sparkles" size="sm" color={colors.primary} />
                <Text className="font-semibold text-base" style={{ color: colors.text }}>
                  {t('search.suggestions', { defaultValue: 'Suggestions' })}
                </Text>
              </View>
              {suggestions.map((suggestion: string, idx: number) => (
                <Pressable
                  key={idx}
                  onPress={() => handleSuggestionClick(suggestion)}
                  className="mb-2 px-6 py-4 rounded-xl bg-white/5 border border-white/10"
                  accessibilityRole="button"
                >
                  <View className="flex-row items-center gap-4">
                    <NativeIcon name="search" size="sm" color={colors.textSecondary} />
                    <Text className="flex-1 text-base" style={{ color: colors.text }}>
                      {suggestion}
                    </Text>
                    <NativeIcon name="arrowUp" size="xs" color={colors.textSecondary} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Initial Prompt */}
          <View className="items-center justify-center py-16">
            <View className="mb-6">
              <NativeIcon name="search" size="xxl" color={colors.textSecondary} />
            </View>
            <Text className="text-xl font-bold text-center mb-2" style={{ color: colors.text }}>
              {t('search.promptTitle', { defaultValue: 'Search for Content' })}
            </Text>
            <Text className="text-sm text-center max-w-[320px] px-6" style={{ color: colors.textSecondary }}>
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
      <GlassModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        size="lg"
        dismissable
      >
        <SearchFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      </GlassModal>

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

export default SearchScreenMobile;
