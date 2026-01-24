/**
 * SearchPage Component (Refactored)
 *
 * Comprehensive search page composed from modular components:
 * - SearchControls: Text, voice, and filter inputs
 * - SearchSemanticToggle: Keyword vs semantic search mode
 * - SearchViewModeToggle: Grid/list/cards view switching
 * - SearchSuggestionsPanel: Trending and category suggestions
 * - SearchResults[Grid|List|Cards]: Display components
 * - SearchEmptyState: Empty/error states
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@bayit/shared-stores';
import logger from '@/utils/logger';

// Search hooks and components
import { useSearch } from '@bayit/shared-hooks';
import { useSceneSearch } from '@/components/player/hooks/useSceneSearch';
import { useSearchViewMode } from '@/hooks/useSearchViewMode';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';

// New modular search components
import { SearchControls, type ContentType } from '@/components/search/SearchControls';
import { SearchSemanticToggle } from '@/components/search/SearchSemanticToggle';
import { SearchViewModeToggle } from '@/components/search/SearchViewModeToggle';
import { SearchSuggestionsPanel } from '@/components/search/SearchSuggestionsPanel';
import { SearchResultsGrid } from '@/components/search/SearchResultsGrid';
import { SearchResultsList } from '@/components/search/SearchResultsList';
import { SearchResultsCards } from '@/components/search/SearchResultsCards';
import { SearchEmptyState } from '@/components/search/SearchEmptyState';

const LOG_CONTEXT = 'SearchPage';

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Premium user status
  const isPremium = useAuthStore((state) => state.isPremium());

  // Semantic search mode state
  const [semanticMode, setSemanticMode] = useState(
    searchParams.get('semantic') === 'true'
  );

  // View mode persistence hook
  const { viewMode, setViewMode } = useSearchViewMode();

  // Search suggestions (trending, categories)
  const { trendingSearches, categories } = useSearchSuggestions();

  // Keyword search hook (default)
  const {
    query,
    setQuery,
    filters,
    setFilters,
    results: keywordResults,
    loading: keywordLoading,
    error: keywordError,
    recentSearches,
    clearRecentSearches,
    handleResultClick: trackResultClick,
  } = useSearch({
    debounceMs: 300,
    enableLLM: isPremium,
    autoSearch: !semanticMode,
    onResultClick: (contentId, position) => {
      logger.info('Search result clicked', LOG_CONTEXT, { contentId, position });
      navigate(`/watch/${contentId}`);
    },
  });

  // Semantic search hook
  const {
    results: semanticResults,
    loading: semanticLoading,
    error: semanticError,
    performSearch: performSemanticSearch,
  } = useSceneSearch();

  // Sync query with URL params
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [searchParams, query, setQuery]);

  // Update URL when query changes
  useEffect(() => {
    if (query.trim()) {
      searchParams.set('q', query);
    } else {
      searchParams.delete('q');
    }
    setSearchParams(searchParams, { replace: true });
  }, [query, searchParams, setSearchParams]);

  // Handle semantic mode toggle
  const handleSemanticToggle = useCallback(
    (enabled: boolean) => {
      setSemanticMode(enabled);

      if (enabled) {
        searchParams.set('semantic', 'true');
        if (query.trim()) {
          performSemanticSearch(query);
        }
      } else {
        searchParams.delete('semantic');
      }

      setSearchParams(searchParams, { replace: true });
      logger.info('Semantic mode toggled', LOG_CONTEXT, { enabled });
    },
    [query, searchParams, setSearchParams, performSemanticSearch]
  );

  // Handle content type filter change
  const handleContentTypeChange = useCallback(
    (type: ContentType) => {
      const contentTypes =
        type === 'all' ? ['vod', 'live', 'radio', 'podcast'] : [type];
      setFilters({ ...filters, contentTypes });
      logger.info('Content type filter changed', LOG_CONTEXT, { type });
    },
    [filters, setFilters]
  );

  // Determine which results/loading/error to use
  const displayResults = semanticMode ? semanticResults : keywordResults;
  const loading = semanticMode ? semanticLoading : keywordLoading;
  const error = semanticMode ? semanticError : keywordError;

  // Handle result click
  const handleResultClick = useCallback(
    (result: any, position: number) => {
      trackResultClick(result.id, position);
      navigate(`/watch/${result.id}`);
    },
    [trackResultClick, navigate]
  );

  return (
    <View style={styles.container}>
      {/* Search Controls */}
      <SearchControls
        query={query}
        onQueryChange={setQuery}
        onContentTypeChange={handleContentTypeChange}
        showLLMSearch={isPremium}
        showFiltersButton={true}
      />

      {/* Toolbar: View Mode + Semantic Toggle */}
      <View style={styles.toolbar}>
        <SearchViewModeToggle value={viewMode} onChange={setViewMode} />
        <SearchSemanticToggle enabled={semanticMode} onToggle={handleSemanticToggle} />
      </View>

      {/* Content Area */}
      {!query.trim() ? (
        // No query - show suggestions
        <SearchSuggestionsPanel
          recentSearches={recentSearches}
          trendingSearches={trendingSearches}
          categories={categories}
          onSearchSelect={setQuery}
          onClearRecent={clearRecentSearches}
        />
      ) : loading ? (
        // Loading state
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="rgba(168,85,247,1)" />
        </View>
      ) : error || displayResults.length === 0 ? (
        // Empty/error state
        <SearchEmptyState
          query={query}
          error={error}
          onRetry={() => setQuery(query)}
          onClear={() => setQuery('')}
        />
      ) : (
        // Results based on view mode
        <>
          {viewMode === 'grid' && (
            <SearchResultsGrid results={displayResults} onResultClick={handleResultClick} />
          )}
          {viewMode === 'list' && (
            <SearchResultsList results={displayResults} onResultClick={handleResultClick} />
          )}
          {viewMode === 'cards' && (
            <SearchResultsCards results={displayResults} onResultClick={handleResultClick} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
