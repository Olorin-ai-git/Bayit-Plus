/**
 * useSceneSearch - Manages scene search state with debounced queries
 *
 * Provides query management, debounced search execution (300ms),
 * loading state, and result handling via the scene search service.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { sceneSearchService } from '@bayit/shared-services/api';
import logger from '@/utils/logger';

const log = logger.scope('useSceneSearch');

const DEBOUNCE_DELAY_MS = 300;

export interface SceneSearchResult {
  timestamp: number;
  thumbnailUrl: string;
  description: string;
  confidence: number;
}

interface UseSceneSearchState {
  query: string;
  results: SceneSearchResult[];
  isLoading: boolean;
  error: string | null;
}

interface UseSceneSearchReturn extends UseSceneSearchState {
  setQuery: (query: string) => void;
  clearSearch: () => void;
}

export const useSceneSearch = (contentId: string): UseSceneSearchReturn => {
  const [state, setState] = useState<UseSceneSearchState>({
    query: '',
    results: [],
    isLoading: false,
    error: null,
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setState((prev) => ({ ...prev, results: [], isLoading: false, error: null }));
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      log.info('Executing scene search', { contentId, query: searchQuery });
      const response = await sceneSearchService.search(contentId, searchQuery, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setState((prev) => ({
          ...prev,
          results: response.results,
          isLoading: false,
        }));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      log.error('Scene search failed', { contentId, query: searchQuery, error: err });
      if (!controller.signal.aborted) {
        setState((prev) => ({
          ...prev,
          results: [],
          isLoading: false,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    }
  }, [contentId]);

  const setQuery = useCallback((newQuery: string) => {
    setState((prev) => ({ ...prev, query: newQuery }));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(newQuery);
    }, DEBOUNCE_DELAY_MS);
  }, [executeSearch]);

  const clearSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    abortControllerRef.current?.abort();
    setState({
      query: '',
      results: [],
      isLoading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    ...state,
    setQuery,
    clearSearch,
  };
};
