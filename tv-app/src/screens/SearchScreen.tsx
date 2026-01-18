/**
 * SearchScreen Component (TV)
 *
 * TV-optimized comprehensive search screen with:
 * - Text and subtitle search via unified search API
 * - Advanced filtering (genre, year, rating, language)
 * - LLM-powered natural language search (premium)
 * - TV-specific focus management and navigation
 * - Remote control optimized UI with large touch targets
 * - Spatial navigation (up/down/left/right)
 * - Glass design system with Tailwind CSS
 * - 6-column responsive grid
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared/hooks';
import { chatService } from '../services/api';
import { useAuthStore } from '../../../shared/stores/authStore';

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

export const SearchScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<SearchRoute>();
  const { isRTL } = useDirection();

  // Advanced filters modal state
  const [showFilters, setShowFilters] = useState(false);

  // LLM search modal state
  const [showLLMSearch, setShowLLMSearch] = useState(false);

  // Premium user status from auth store
  const isPremium = useAuthStore((state) => state.isPremium());

  // Active content type filter
  const [activeContentType, setActiveContentType] = useState('all');

  // Focus management
  const [focusedElement, setFocusedElement] = useState<string>('search-input');
  const searchInputRef = useRef<TextInput>(null);

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
      // Navigate to player
      navigation.navigate('Player', {
        id: result.id,
        title: result.title,
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

  // Auto-focus search input on mount (TV-specific)
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle content type filter change
  const handleContentTypeChange = useCallback((typeId: string) => {
    setActiveContentType(typeId);

    const contentTypes = typeId === 'all'
      ? ['vod', 'live', 'radio', 'podcast']
      : [typeId];

    setFilters({ ...filters, contentTypes });
  }, [filters, setFilters]);

  // Handle voice search result (TODO: Integrate TV voice remote)
  const handleVoiceResult = useCallback(async (audioBlob: Blob) => {
    try {
      const text = await chatService.transcribeAudio(audioBlob);
      if (text.trim()) {
        setQuery(text);
      }
    } catch (err) {
      console.error('Voice search failed:', err);
    }
  }, [setQuery]);

  // Handle recent search click
  const handleRecentSearchClick = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
  }, [setQuery]);

  // Handle LLM search
  const handleLLMSearch = useCallback((llmQuery: string, llmResults: any) => {
    setShowLLMSearch(false);
    // Results are already updated via the search hook
  }, []);

  const hasQuery = !!query.trim();
  const showInitialState = !hasQuery && !loading && results.length === 0;

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="px-12 pt-10 pb-4 flex-row items-center gap-6">
        <View className="w-16 h-16 rounded-full bg-purple-500/30 items-center justify-center">
          <Text className="text-4xl">🔍</Text>
        </View>
        <View className="flex-1">
          <Text className={`text-white text-5xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('search.title', { defaultValue: 'Search' })}
          </Text>
          <Text className={`text-white/60 text-xl mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('search.subtitle', { defaultValue: 'Find your favorite content' })}
          </Text>
        </View>
      </View>

      {/* Search Bar Section */}
      <View className="px-12 pb-6">
        <View className="flex-row items-center gap-4">
          {/* Main Search Input */}
          <View className="flex-1">
            <View className="flex-row items-center gap-3 px-6 py-4 bg-white/5 backdrop-blur-xl rounded-2xl border-2 border-white/10">
              <Text className="text-3xl">🔍</Text>
              <TextInput
                ref={searchInputRef}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => search()}
                onFocus={() => setFocusedElement('search-input')}
                placeholder={t('search.placeholder')}
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                className="flex-1 text-white text-2xl"
                style={{ textAlign: isRTL ? 'right' : 'left' }}
                autoFocus={true}
                returnKeyType="search"
              />
              {query && (
                <TouchableOpacity
                  onPress={() => {
                    setQuery('');
                    searchInputRef.current?.focus();
                  }}
                  onFocus={() => setFocusedElement('clear-btn')}
                  className={`
                    w-12 h-12 items-center justify-center rounded-full
                    ${focusedElement === 'clear-btn' ? 'bg-white/20 border-2 border-purple-400' : 'bg-white/5'}
                  `}
                  activeOpacity={0.7}
                >
                  <Text className="text-white text-2xl">✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* LLM Search Button */}
          <TouchableOpacity
            onPress={() => setShowLLMSearch(true)}
            onFocus={() => setFocusedElement('llm-search-btn')}
            className={`
              px-8 py-5 rounded-2xl flex-row items-center gap-3
              bg-purple-500/30 border-2
              ${focusedElement === 'llm-search-btn' ? 'border-purple-400 scale-105' : 'border-purple-400/50'}
            `}
            activeOpacity={0.7}
          >
            <Text className="text-4xl">🤖</Text>
            <Text className="text-white font-semibold text-xl">
              {t('search.smartSearch', { defaultValue: 'Smart Search' })}
            </Text>
            {!isPremium && (
              <View className="px-3 py-1 bg-yellow-500/30 rounded-full">
                <Text className="text-yellow-300 text-sm font-bold">PREMIUM</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Advanced Filters Button */}
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            onFocus={() => setFocusedElement('filters-btn')}
            className={`
              px-8 py-5 rounded-2xl flex-row items-center gap-3
              bg-white/5 border-2
              ${focusedElement === 'filters-btn' ? 'border-white/40 scale-105' : 'border-white/10'}
            `}
            activeOpacity={0.7}
          >
            <Text className="text-3xl">⚙️</Text>
            <Text className="text-white font-semibold text-xl">
              {t('search.filters', { defaultValue: 'Filters' })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Type Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 mt-6"
        >
          {CONTENT_TYPE_FILTERS.map((filter, idx) => {
            const isActive = activeContentType === filter.id;
            const isFocused = focusedElement === `filter-${filter.id}`;
            return (
              <TouchableOpacity
                key={filter.id}
                onPress={() => handleContentTypeChange(filter.id)}
                onFocus={() => setFocusedElement(`filter-${filter.id}`)}
                // @ts-ignore - TV-specific prop
                hasTVPreferredFocus={idx === 0}
                className={`
                  px-7 py-4 rounded-2xl border-2
                  ${isActive ? 'bg-purple-500 border-purple-400' : 'bg-white/5 border-white/10'}
                  ${isFocused ? 'scale-105' : ''}
                `}
                activeOpacity={0.7}
              >
                <Text className={`
                  text-lg font-medium
                  ${isActive ? 'text-white' : 'text-white/70'}
                `}>
                  {t(filter.label, { defaultValue: filter.id.toUpperCase() })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Active Filters Summary */}
        {(filters.genres?.length || filters.yearMin || filters.ratingMin || filters.subtitleLanguages?.length) && (
          <View className="mt-4 flex-row items-center gap-3 flex-wrap">
            <Text className="text-white/60 text-lg">
              {t('search.activeFilters', { defaultValue: 'Active filters:' })}
            </Text>
            {filters.genres?.slice(0, 4).map((genre) => (
              <View key={genre} className="px-4 py-2 bg-blue-500/30 rounded-full">
                <Text className="text-blue-300 text-base">{genre}</Text>
              </View>
            ))}
            {filters.genres && filters.genres.length > 4 && (
              <View className="px-4 py-2 bg-blue-500/30 rounded-full">
                <Text className="text-blue-300 text-base">+{filters.genres.length - 4} more</Text>
              </View>
            )}
            {filters.yearMin && (
              <View className="px-4 py-2 bg-green-500/30 rounded-full">
                <Text className="text-green-300 text-base">
                  {filters.yearMin}{filters.yearMax ? `-${filters.yearMax}` : '+'}
                </Text>
              </View>
            )}
            {filters.ratingMin && (
              <View className="px-4 py-2 bg-yellow-500/30 rounded-full">
                <Text className="text-yellow-300 text-base">{filters.ratingMin}+ ⭐</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setFilters({ contentTypes: filters.contentTypes })}
              onFocus={() => setFocusedElement('clear-filters')}
              className={`
                px-4 py-2 rounded-full
                ${focusedElement === 'clear-filters' ? 'bg-red-500/50 border-2 border-red-400' : 'bg-red-500/30'}
              `}
              activeOpacity={0.7}
            >
              <Text className="text-red-300 text-base font-medium">✕ Clear All</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Search Results or Initial State */}
      {showInitialState ? (
        <ScrollView className="flex-1" contentContainerClassName="px-12 pt-8">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View className="mb-10">
              <View className="flex-row items-center gap-3 mb-4">
                <Text className="text-4xl">🕐</Text>
                <Text className="text-white font-semibold text-2xl">
                  {t('search.recentSearches', { defaultValue: 'Recent Searches' })}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-3">
                {recentSearches.map((recentQuery, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleRecentSearchClick(recentQuery)}
                    onFocus={() => setFocusedElement(`recent-${idx}`)}
                    className={`
                      px-6 py-4 rounded-2xl border-2
                      ${focusedElement === `recent-${idx}`
                        ? 'bg-white/20 border-white/40 scale-105'
                        : 'bg-white/5 border-white/10'}
                    `}
                    activeOpacity={0.7}
                  >
                    <Text className="text-white/80 text-lg">{recentQuery}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Initial Prompt */}
          <View className="items-center justify-center py-24">
            <Text className="text-9xl mb-8">🔍</Text>
            <Text className="text-white text-center font-bold text-4xl mb-4">
              {t('search.promptTitle', { defaultValue: 'Search for Content' })}
            </Text>
            <Text className="text-white/60 text-center max-w-3xl text-2xl">
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
          numColumns={6}
        />
      )}

      {/* Advanced Filters Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilters(false)}
      >
        <View className="flex-1 bg-black/90">
          <View className="flex-1 m-20 rounded-3xl overflow-hidden">
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

export default SearchScreen;
