/**
 * SearchScreen Component (Shared/Cross-Platform)
 *
 * Shared comprehensive search screen with:
 * - Text and subtitle search via unified search API
 * - Advanced filtering (genre, year, rating, language)
 * - LLM-powered natural language search (premium)
 * - Platform detection (mobile/tablet/TV)
 * - Adaptive layout and column counts
 * - Glass design system with Tailwind CSS
 * - Voice search integration
 * - Recent searches persistence
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { chatService } from '../services/api';
import { getLocalizedName } from '../utils/i18n';
import { useAuthStore } from '../stores/authStore';

// Shared search components
import { useSearch } from '../hooks/useSearch';
import { SearchBar } from '../components/search/SearchBar';
import { SearchFilters } from '../components/search/SearchFilters';
import { SearchResults } from '../components/search/SearchResults';
import { LLMSearchButton } from '../components/search/LLMSearchButton';
import { LLMSearchModal } from '../components/search/LLMSearchModal';

interface SearchRoute {
  params?: {
    query?: string;
  };
}

// Platform detection
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;
const isTV = Platform.isTV || IS_TV_BUILD;
const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

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

  // Focus management for TV
  const [focusedElement, setFocusedElement] = useState<string>('search-input');
  const searchInputRef = useRef<TextInput>(null);

  // Responsive column count based on platform
  const numColumns = isTV ? 6 : isMobile ? 2 : 4;

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
      // Navigate to appropriate screen based on content type
      const screenMap: Record<string, string> = {
        vod: 'Player',
        live: 'Player',
        radio: 'Player',
        podcast: 'Player',
      };

      navigation.navigate(screenMap[result.type || 'vod'] || 'Player', {
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

  // Auto-focus search input on mount (TV-specific)
  useEffect(() => {
    if (isTV) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

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

  // Responsive sizing classes
  const headerSizeClass = isTV ? 'text-5xl' : isMobile ? 'text-3xl' : 'text-4xl';
  const subtitleSizeClass = isTV ? 'text-xl' : isMobile ? 'text-base' : 'text-lg';
  const paddingClass = isTV ? 'px-12 py-10' : isMobile ? 'px-4 py-4' : 'px-6 py-6';
  const gapClass = isTV ? 'gap-4' : isMobile ? 'gap-3' : 'gap-4';
  const iconSizeClass = isTV ? 'text-4xl' : isMobile ? 'text-2xl' : 'text-3xl';
  const buttonPaddingClass = isTV ? 'px-8 py-5' : isMobile ? 'px-4 py-3' : 'px-6 py-4';

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className={`${paddingClass} flex-row items-center ${gapClass}`}>
        {isMobile && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center bg-white/10 rounded-full"
            activeOpacity={0.7}
          >
            <Text className="text-white text-xl">{isRTL ? '→' : '←'}</Text>
          </TouchableOpacity>
        )}
        <View className={`${isTV ? 'w-16 h-16' : 'w-12 h-12'} rounded-full bg-purple-500/30 items-center justify-center`}>
          <Text className={iconSizeClass}>🔍</Text>
        </View>
        <View className="flex-1">
          <Text className={`text-white ${headerSizeClass} font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('search.title', { defaultValue: 'Search' })}
          </Text>
          <Text className={`text-white/60 ${subtitleSizeClass} mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('search.subtitle', { defaultValue: 'Find your favorite content' })}
          </Text>
        </View>
      </View>

      {/* Search Bar Section */}
      <View className={paddingClass}>
        <View className={`flex-row items-center ${gapClass} ${isMobile ? 'flex-wrap' : ''}`}>
          {/* Main Search Input */}
          <View className={isMobile ? 'w-full' : 'flex-1'}>
            <SearchBar
              value={query}
              onChange={setQuery}
              suggestions={suggestions}
              showVoiceButton={true}
              onVoicePress={handleVoiceResult}
              placeholder={t('search.placeholder')}
              isRTL={isRTL}
              autoFocus={isTV}
            />
          </View>

          {/* LLM Search Button */}
          {!isMobile && (
            <LLMSearchButton
              onPress={() => setShowLLMSearch(true)}
              isPremium={isPremium}
              disabled={false}
            />
          )}

          {/* Advanced Filters Button */}
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            onFocus={() => isTV && setFocusedElement('filters-btn')}
            className={`
              ${buttonPaddingClass} rounded-2xl flex-row items-center gap-2
              bg-white/5 border-2
              ${isTV && focusedElement === 'filters-btn' ? 'border-white/40 scale-105' : 'border-white/10'}
              ${isMobile ? 'flex-1' : ''}
            `}
            activeOpacity={0.7}
          >
            <Text className={`${isMobile ? 'text-xl' : iconSizeClass}`}>⚙️</Text>
            <Text className={`text-white font-semibold ${isTV ? 'text-xl' : isMobile ? 'text-sm' : 'text-base'}`}>
              {t('search.filters', { defaultValue: 'Filters' })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Type Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName={`${gapClass} ${isTV ? 'mt-6' : 'mt-4'}`}
        >
          {CONTENT_TYPE_FILTERS.map((filter, idx) => {
            const isActive = activeContentType === filter.id;
            const isFocused = isTV && focusedElement === `filter-${filter.id}`;
            return (
              <TouchableOpacity
                key={filter.id}
                onPress={() => handleContentTypeChange(filter.id)}
                onFocus={() => isTV && setFocusedElement(`filter-${filter.id}`)}
                // @ts-ignore - TV-specific prop
                hasTVPreferredFocus={idx === 0 && isTV}
                className={`
                  ${isTV ? 'px-7 py-4' : isMobile ? 'px-4 py-2' : 'px-5 py-3'}
                  rounded-full border-2
                  ${isActive ? 'bg-purple-500 border-purple-400' : 'bg-white/5 border-white/10'}
                  ${isFocused ? 'scale-105' : ''}
                `}
                activeOpacity={0.7}
              >
                <Text className={`
                  ${isTV ? 'text-lg' : 'text-sm'} font-medium
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
          <View className={`${isTV ? 'mt-4' : 'mt-3'} flex-row items-center gap-2 flex-wrap`}>
            <Text className={`text-white/60 ${isTV ? 'text-lg' : 'text-sm'}`}>
              {t('search.activeFilters', { defaultValue: 'Active:' })}
            </Text>
            {filters.genres?.slice(0, isMobile ? 2 : 4).map((genre) => (
              <View key={genre} className={`${isMobile ? 'px-2 py-1' : 'px-3 py-1'} bg-blue-500/30 rounded-full`}>
                <Text className={`text-blue-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>{genre}</Text>
              </View>
            ))}
            {filters.genres && filters.genres.length > (isMobile ? 2 : 4) && (
              <View className={`${isMobile ? 'px-2 py-1' : 'px-3 py-1'} bg-blue-500/30 rounded-full`}>
                <Text className={`text-blue-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  +{filters.genres.length - (isMobile ? 2 : 4)}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setFilters({ contentTypes: filters.contentTypes })}
              className={`${isMobile ? 'px-2 py-1' : 'px-3 py-1'} bg-red-500/30 rounded-full`}
              activeOpacity={0.7}
            >
              <Text className={`text-red-300 ${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Search Results or Initial State */}
      {showInitialState ? (
        <ScrollView className="flex-1" contentContainerClassName={paddingClass}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View className={isTV ? 'mb-10' : 'mb-6'}>
              <View className={`flex-row items-center gap-2 ${isTV ? 'mb-4' : 'mb-3'}`}>
                <Text className={isTV ? 'text-4xl' : isMobile ? 'text-xl' : 'text-2xl'}>🕐</Text>
                <Text className={`text-white font-semibold ${isTV ? 'text-2xl' : isMobile ? 'text-base' : 'text-lg'}`}>
                  {t('search.recentSearches', { defaultValue: 'Recent Searches' })}
                </Text>
              </View>
              <View className={`flex-row flex-wrap ${gapClass}`}>
                {recentSearches.map((recentQuery, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleRecentSearchClick(recentQuery)}
                    onFocus={() => isTV && setFocusedElement(`recent-${idx}`)}
                    className={`
                      ${isTV ? 'px-6 py-4' : isMobile ? 'px-4 py-2' : 'px-5 py-3'}
                      rounded-full border-2
                      ${isTV && focusedElement === `recent-${idx}` ? 'bg-white/20 border-white/40 scale-105' : 'bg-white/5 border-white/10'}
                    `}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-white/80 ${isTV ? 'text-lg' : 'text-sm'}`}>{recentQuery}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Initial Prompt */}
          <View className={`items-center justify-center ${isTV ? 'py-24' : isMobile ? 'py-12' : 'py-20'}`}>
            <Text className={`${isTV ? 'text-9xl mb-8' : isMobile ? 'text-7xl mb-4' : 'text-8xl mb-6'}`}>🔍</Text>
            <Text className={`
              text-white text-center font-bold
              ${isTV ? 'text-4xl mb-4' : isMobile ? 'text-xl mb-2' : 'text-2xl mb-3'}
            `}>
              {t('search.promptTitle', { defaultValue: 'Search for Content' })}
            </Text>
            <Text className={`
              text-white/60 text-center
              ${isTV ? 'max-w-3xl text-2xl' : isMobile ? 'max-w-sm text-sm px-4' : 'max-w-md text-base'}
            `}>
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

      {/* Advanced Filters Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType={isMobile ? 'slide' : 'fade'}
        onRequestClose={() => setShowFilters(false)}
      >
        <View className="flex-1 bg-black/80">
          {isMobile ? (
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setShowFilters(false)}
              className="flex-1"
            />
          ) : null}
          <View className={`
            ${isMobile ? 'h-4/5 rounded-t-3xl' : isTV ? 'flex-1 m-20 rounded-3xl' : 'flex-1 mt-20 rounded-t-3xl'}
            overflow-hidden
          `}>
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
