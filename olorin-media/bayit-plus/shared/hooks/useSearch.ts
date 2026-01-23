/**
 * useSearch Hook
 *
 * Unified search hook for all platforms (web, mobile, TV).
 * Provides debounced search, filters, suggestions, and analytics tracking.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SearchFilters {
  contentTypes: string[];
  genres?: string[];
  yearMin?: number;
  yearMax?: number;
  ratingMin?: number;
  subtitleLanguages?: string[];
  subscriptionTier?: string;
  isKidsContent?: boolean;
  searchInSubtitles?: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  thumbnail?: string;
  backdrop?: string;
  category_id: string;
  category_name?: string;
  duration?: string;
  year?: number;
  rating?: string | number;
  genres?: string[];
  cast?: string[];
  director?: string;
  content_type?: string;
  is_series: boolean;
  requires_subscription: string;
  is_kids_content: boolean;
  age_rating?: number;
  available_subtitle_languages: string[];
  has_subtitles: boolean;
  view_count: number;
  avg_rating: number;
  is_featured: boolean;
  subtitle_matches?: SubtitleMatch[];
}

export interface SubtitleMatch {
  cue_index: number;
  timestamp: number;
  text: string;
  highlighted_text: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
  execution_time_ms: number;
  cache_hit: boolean;
}

export interface UseSearchOptions {
  debounceMs?: number;
  enableLLM?: boolean;
  autoSearch?: boolean;
  onResultClick?: (contentId: string, position: number) => void;
}

const RECENT_SEARCHES_KEY = '@bayit_recent_searches';
const MAX_RECENT_SEARCHES = 5;

export function useSearch(options: UseSearchOptions = {}) {
  const {
    debounceMs = 300,
    enableLLM = false,
    autoSearch = true,
    onResultClick
  } = options;

  // State
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({ contentTypes: ['vod'] });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);

  // Refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Get API base URL based on environment
   * Consistent with adminApi.ts pattern
   */
  const getApiBaseUrl = useCallback(() => {
    if (__DEV__) {
      if (Platform.OS === 'web') {
        return 'http://localhost:8001/api/v1';
      } else if (Platform.OS === 'android') {
        return 'http://10.0.2.2:8001/api/v1'; // Android emulator
      } else {
        return 'http://localhost:8001/api/v1'; // iOS simulator
      }
    }
    // Production - use environment variable or default
    return process.env.NEXT_PUBLIC_API_URL || 'https://api.bayit.tv/api/v1';
  }, []);

  /**
   * Load recent searches from storage
   */
  const loadRecentSearches = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  }, []);

  /**
   * Save recent search to storage
   */
  const saveRecentSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    try {
      const updated = [
        searchQuery,
        ...recentSearches.filter(s => s !== searchQuery)
      ].slice(0, MAX_RECENT_SEARCHES);

      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  }, [recentSearches]);

  /**
   * Clear recent searches
   */
  const clearRecentSearches = useCallback(async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  }, []);

  /**
   * Execute search
   */
  const executeSearch = useCallback(async (searchQuery: string, searchPage: number = 1) => {
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!searchQuery.trim() && !filters.genres && !filters.yearMin) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    setSearchStartTime(Date.now());
    abortControllerRef.current = new AbortController();

    try {
      const baseUrl = getApiBaseUrl();

      // Build query parameters
      const params = new URLSearchParams();
      params.append('query', searchQuery);
      params.append('page', searchPage.toString());
      params.append('limit', '20');

      // Add filters
      filters.contentTypes.forEach(type => params.append('content_types', type));
      if (filters.genres) {
        filters.genres.forEach(genre => params.append('genres', genre));
      }
      if (filters.yearMin) params.append('year_min', filters.yearMin.toString());
      if (filters.yearMax) params.append('year_max', filters.yearMax.toString());
      if (filters.ratingMin) params.append('rating_min', filters.ratingMin.toString());
      if (filters.subtitleLanguages) {
        filters.subtitleLanguages.forEach(lang => params.append('subtitle_languages', lang));
      }
      if (filters.subscriptionTier) params.append('subscription_tier', filters.subscriptionTier);
      if (filters.isKidsContent !== undefined) {
        params.append('is_kids_content', filters.isKidsContent.toString());
      }
      if (filters.searchInSubtitles) {
        params.append('search_in_subtitles', 'true');
      }

      const response = await fetch(
        `${baseUrl}/search/unified?${params.toString()}`,
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();

      if (searchPage === 1) {
        setResults(data.results);
      } else {
        setResults(prev => [...prev, ...data.results]);
      }

      setHasMore(data.has_more);
      setPage(searchPage);

      // Save to recent searches
      if (searchQuery.trim()) {
        await saveRecentSearch(searchQuery);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Ignore aborted requests
      }
      console.error('Search error:', error);
      setError(error.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
      setSearchStartTime(null);
    }
  }, [filters, getApiBaseUrl, saveRecentSearch]);

  /**
   * Debounced search
   */
  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(searchQuery, 1);
    }, debounceMs);
  }, [executeSearch, debounceMs]);

  /**
   * Load autocomplete suggestions
   */
  const loadSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(
        `${baseUrl}/search/suggestions?query=${encodeURIComponent(searchQuery)}&limit=5`
      );

      if (!response.ok) throw new Error('Failed to load suggestions');

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Suggestions error:', error);
      setSuggestions([]);
    }
  }, [getApiBaseUrl]);

  /**
   * Debounced suggestions loader
   */
  const debouncedLoadSuggestions = useCallback((searchQuery: string) => {
    if (suggestionsTimerRef.current) {
      clearTimeout(suggestionsTimerRef.current);
    }

    suggestionsTimerRef.current = setTimeout(() => {
      loadSuggestions(searchQuery);
    }, 200);
  }, [loadSuggestions]);

  /**
   * Load more results (pagination)
   */
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      executeSearch(query, page + 1);
    }
  }, [loading, hasMore, query, page, executeSearch]);

  /**
   * Clear search
   */
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setError(null);
    setPage(1);
    setHasMore(false);
  }, []);

  /**
   * Handle result click (for analytics)
   */
  const handleResultClick = useCallback((contentId: string, position: number) => {
    if (onResultClick) {
      onResultClick(contentId, position);
    }

    // Track click analytics
    if (searchStartTime) {
      const timeToClick = Date.now() - searchStartTime;

      // Send analytics to backend
      const baseUrl = getApiBaseUrl();
      fetch(`${baseUrl}/search/analytics/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_id: contentId,
          position,
          time_to_click_ms: timeToClick
        })
      }).catch(error => {
        console.error('Failed to track click:', error);
      });
    }
  }, [onResultClick, searchStartTime, getApiBaseUrl]);

  /**
   * Auto-search on query change
   */
  useEffect(() => {
    if (autoSearch) {
      debouncedSearch(query);
    }
  }, [query, autoSearch, debouncedSearch]);

  /**
   * Load suggestions on query change
   */
  useEffect(() => {
    debouncedLoadSuggestions(query);
  }, [query, debouncedLoadSuggestions]);

  /**
   * Load recent searches on mount
   */
  useEffect(() => {
    loadRecentSearches();
  }, [loadRecentSearches]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (suggestionsTimerRef.current) {
        clearTimeout(suggestionsTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    query,
    setQuery,
    filters,
    setFilters,
    results,
    loading,
    error,
    suggestions,
    recentSearches,
    hasMore,
    page,

    // Actions
    search: () => executeSearch(query, 1),
    loadMore,
    clearSearch,
    clearRecentSearches,
    handleResultClick,

    // Derived state
    hasResults: results.length > 0,
    isSearching: loading,
  };
}
