/**
 * SearchPage Component (Web)
 *
 * Comprehensive search page with:
 * - Text and subtitle search via unified search API
 * - Advanced filtering (genre, year, rating, language)
 * - LLM-powered natural language search (premium)
 * - Recent searches with localStorage persistence
 * - Voice search integration
 * - Glass design system with Tailwind CSS
 */

import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { VoiceSearchButton } from '@bayit/shared';
import { chatService } from '@/services/api';
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

  // Premium user status (TODO: get from auth context)
  const [isPremium, setIsPremium] = useState(false);

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
    <View className="flex-1 bg-black">
      {/* Main Content Container */}
      <ScrollView
        className="flex-1"
        contentContainerClassName={`
          px-6 py-6 max-w-7xl mx-auto w-full
          ${IS_TV_BUILD ? 'px-12 py-12' : ''}
        `}
      >
        {/* Search Bar Section */}
        <View className={`mb-6 ${IS_TV_BUILD ? 'mb-12' : ''}`}>
          <View className="flex-row items-center gap-4 mb-4">
            {/* Main Search Bar */}
            <View className="flex-1">
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
              className={`
                px-6 py-4 rounded-full
                bg-white/5 backdrop-blur-xl border border-white/10
                ${IS_TV_BUILD ? 'px-8 py-5' : ''}
              `}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-2">
                <Text className={`text-xl ${IS_TV_BUILD ? 'text-3xl' : ''}`}>⚙️</Text>
                <Text className={`
                  text-white font-semibold
                  ${IS_TV_BUILD ? 'text-xl' : 'text-base'}
                `}>
                  {t('search.advancedFilters', { defaultValue: 'Filters' })}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Content Type Filter Pills */}
          <View className={`flex-row gap-3 flex-wrap ${IS_TV_BUILD ? 'gap-4' : ''}`}>
            {CONTENT_TYPE_FILTERS.map((filter) => {
              const isActive = activeContentType === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  onPress={() => handleContentTypeChange(filter.id)}
                  className={`
                    px-5 py-3 rounded-full border-2
                    ${isActive
                      ? 'bg-purple-500 border-purple-400'
                      : 'bg-white/5 border-white/10'}
                    ${IS_TV_BUILD ? 'px-7 py-4' : ''}
                  `}
                  activeOpacity={0.7}
                >
                  <Text className={`
                    font-medium
                    ${isActive ? 'text-white' : 'text-white/70'}
                    ${IS_TV_BUILD ? 'text-lg' : 'text-sm'}
                  `}>
                    {t(filter.label, { defaultValue: filter.id.toUpperCase() })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Active Filters Summary */}
          {(filters.genres?.length || filters.yearMin || filters.ratingMin || filters.subtitleLanguages?.length) && (
            <View className="mt-4 flex-row items-center gap-2 flex-wrap">
              <Text className="text-white/60 text-sm">
                {t('search.activeFilters', { defaultValue: 'Active filters:' })}
              </Text>
              {filters.genres?.map((genre) => (
                <View key={genre} className="px-3 py-1 bg-blue-500/30 rounded-full">
                  <Text className="text-blue-300 text-xs">{genre}</Text>
                </View>
              ))}
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
              {filters.subtitleLanguages?.map((lang) => (
                <View key={lang} className="px-3 py-1 bg-purple-500/30 rounded-full">
                  <Text className="text-purple-300 text-xs">{lang.toUpperCase()}</Text>
                </View>
              ))}
              <TouchableOpacity
                onPress={() => setFilters({ contentTypes: filters.contentTypes })}
                className="px-3 py-1 bg-red-500/30 rounded-full"
                activeOpacity={0.7}
              >
                <Text className="text-red-300 text-xs">✕ Clear All</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Search Results or Initial State */}
        {showInitialState ? (
          <View className="flex-1">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View className={`mb-8 ${IS_TV_BUILD ? 'mb-12' : ''}`}>
                <View className="flex-row items-center gap-2 mb-4">
                  <Text className={`text-2xl ${IS_TV_BUILD ? 'text-3xl' : ''}`}>🕐</Text>
                  <Text className={`
                    text-white font-semibold
                    ${IS_TV_BUILD ? 'text-2xl' : 'text-lg'}
                  `}>
                    {t('search.recentSearches', { defaultValue: 'Recent Searches' })}
                  </Text>
                </View>
                <View className={`flex-row flex-wrap gap-3 ${IS_TV_BUILD ? 'gap-4' : ''}`}>
                  {recentSearches.map((recentQuery, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleRecentSearchClick(recentQuery)}
                      className={`
                        px-5 py-3 rounded-full
                        bg-white/5 border border-white/10
                        ${IS_TV_BUILD ? 'px-7 py-4' : ''}
                      `}
                      activeOpacity={0.7}
                    >
                      <Text className={`
                        text-white/80
                        ${IS_TV_BUILD ? 'text-lg' : 'text-sm'}
                      `}>
                        {recentQuery}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Initial Prompt */}
            <View className={`
              items-center justify-center py-20
              ${IS_TV_BUILD ? 'py-32' : ''}
            `}>
              <Text className={`text-8xl mb-6 ${IS_TV_BUILD ? 'text-9xl mb-8' : ''}`}>🔍</Text>
              <Text className={`
                text-white text-center font-bold mb-3
                ${IS_TV_BUILD ? 'text-4xl mb-4' : 'text-2xl'}
              `}>
                {t('search.promptTitle', { defaultValue: 'Search for Content' })}
              </Text>
              <Text className={`
                text-white/60 text-center max-w-md
                ${IS_TV_BUILD ? 'text-xl max-w-2xl' : 'text-base'}
              `}>
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
        <View className="flex-1 bg-black/80">
          <View className={`
            flex-1 mt-20 rounded-t-3xl overflow-hidden
            ${IS_TV_BUILD ? 'mt-24' : ''}
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
}
