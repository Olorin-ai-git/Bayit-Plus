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
 * - Glass design system with Tailwind CSS
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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { chatService } from '@bayit/shared-services';
import { getLocalizedName } from '@bayit/shared-utils';
import { useResponsive } from '../hooks/useResponsive';
import { getGridColumns } from '../utils/responsive';

// Shared search components
import { useSearch } from '../../../shared/hooks/useSearch';
import { SearchBar } from '../../../shared/components/search/SearchBar';
import { SearchFilters } from '../../../shared/components/search/SearchFilters';
import { SearchResults } from '../../../shared/components/search/SearchResults';
import { LLMSearchButton } from '../../../shared/components/search/LLMSearchButton';
import { LLMSearchModal } from '../../../shared/components/search/LLMSearchModal';

interface SearchRoute {
  params?: {
    query?: string;
  };
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
  const { isRTL } = useDirection();
  const { orientation } = useResponsive();

  // Advanced filters bottom sheet state
  const [showFilters, setShowFilters] = useState(false);

  // LLM search modal state
  const [showLLMSearch, setShowLLMSearch] = useState(false);

  // Premium user status (TODO: get from auth context)
  const [isPremium, setIsPremium] = useState(false);

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
    onResultClick: (result, index) => {
      // Haptic feedback on iOS
      if (Platform.OS === 'ios') {
        ReactNativeHapticFeedback.trigger('impactLight');
      }

      // Navigate to player
      navigation.navigate('Player', {
        id: result.id,
        title: getLocalizedName(result, i18n.language),
        type: result.type || 'vod',
      });
    },
  });

  // Initialize with route query parameter
  useEffect(() => {
    if (route.params?.query) {
      setQuery(route.params.query);
    }
  }, [route.params?.query]);

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

  return (
    <View className="flex-1 bg-black">
      {/* Search Header */}
      <View className="px-4 pt-4 pb-3 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <View className="flex-row items-center gap-3 mb-3">
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center bg-white/10 rounded-full"
            activeOpacity={0.7}
          >
            <Text className="text-white text-xl">{isRTL ? '→' : '←'}</Text>
          </TouchableOpacity>

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
              autoFocus={!route.params?.query}
            />
          </View>

          {/* LLM Search Button (compact for mobile) */}
          <TouchableOpacity
            onPress={() => setShowLLMSearch(true)}
            className="w-12 h-12 items-center justify-center bg-purple-500/30 rounded-full border border-purple-400/50"
            activeOpacity={0.7}
          >
            <Text className="text-2xl">🤖</Text>
            {!isPremium && (
              <View className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full items-center justify-center">
                <Text className="text-white text-xs font-bold">P</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Content Type Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
        >
          {CONTENT_TYPE_FILTERS.map((filter) => {
            const isActive = activeContentType === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                onPress={() => handleContentTypeChange(filter.id)}
                className={`
                  px-4 py-2 rounded-full border
                  ${isActive
                    ? 'bg-purple-500 border-purple-400'
                    : 'bg-white/5 border-white/10'}
                `}
                activeOpacity={0.7}
              >
                <Text className={`
                  text-sm font-medium
                  ${isActive ? 'text-white' : 'text-white/70'}
                `}>
                  {t(filter.label, { defaultValue: filter.id.toUpperCase() })}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Advanced Filters Button */}
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            className="px-4 py-2 rounded-full border border-white/20 bg-white/5"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-1">
              <Text className="text-base">⚙️</Text>
              <Text className="text-white/70 text-sm font-medium">
                {t('search.moreFilters', { defaultValue: 'More' })}
              </Text>
              {(filters.genres?.length || filters.yearMin || filters.ratingMin) && (
                <View className="w-2 h-2 bg-blue-500 rounded-full ml-1" />
              )}
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Active Filters Summary (compact for mobile) */}
        {(filters.genres?.length || filters.yearMin || filters.ratingMin || filters.subtitleLanguages?.length) && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 mt-2"
          >
            {filters.genres?.slice(0, 3).map((genre) => (
              <View key={genre} className="px-3 py-1 bg-blue-500/30 rounded-full">
                <Text className="text-blue-300 text-xs">{genre}</Text>
              </View>
            ))}
            {filters.genres && filters.genres.length > 3 && (
              <View className="px-3 py-1 bg-blue-500/30 rounded-full">
                <Text className="text-blue-300 text-xs">+{filters.genres.length - 3}</Text>
              </View>
            )}
            {filters.yearMin && (
              <View className="px-3 py-1 bg-green-500/30 rounded-full">
                <Text className="text-green-300 text-xs">
                  {filters.yearMin}{filters.yearMax ? `-${filters.yearMax}` : '+'}
                </Text>
              </View>
            )}
            {filters.ratingMin && (
              <View className="px-3 py-1 bg-yellow-500/30 rounded-full">
                <Text className="text-yellow-300 text-xs">{filters.ratingMin}+ ⭐</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setFilters({ contentTypes: filters.contentTypes })}
              className="px-3 py-1 bg-red-500/30 rounded-full"
              activeOpacity={0.7}
            >
              <Text className="text-red-300 text-xs">✕</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Search Results or Initial State */}
      {showInitialState ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pt-6"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <Text className="text-xl">🕐</Text>
                <Text className="text-white font-semibold text-base">
                  {t('search.recentSearches', { defaultValue: 'Recent Searches' })}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {recentSearches.map((recentQuery, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleRecentSearchClick(recentQuery)}
                    className="px-4 py-2 rounded-full bg-white/5 border border-white/10"
                    activeOpacity={0.7}
                  >
                    <Text className="text-white/80 text-sm">{recentQuery}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Suggestions (when typing) */}
          {suggestions.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <Text className="text-xl">💡</Text>
                <Text className="text-white font-semibold text-base">
                  {t('search.suggestions', { defaultValue: 'Suggestions' })}
                </Text>
              </View>
              {suggestions.map((suggestion, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSuggestionClick(suggestion)}
                  className="mb-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="text-lg">🔍</Text>
                    <Text className="flex-1 text-white text-base">{suggestion}</Text>
                    <Text className="text-white/40 text-lg">↖</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Initial Prompt */}
          <View className="items-center justify-center py-12">
            <Text className="text-7xl mb-4">🔍</Text>
            <Text className="text-white text-center font-bold text-xl mb-2">
              {t('search.promptTitle', { defaultValue: 'Search for Content' })}
            </Text>
            <Text className="text-white/60 text-center max-w-sm text-sm px-4">
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
        <View className="flex-1 bg-black/80">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowFilters(false)}
            className="flex-1"
          />
          <View className="h-4/5 rounded-t-3xl overflow-hidden">
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

export default SearchScreenMobile;
