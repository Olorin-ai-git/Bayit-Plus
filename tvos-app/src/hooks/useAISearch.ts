/**
 * useAISearch - AI-powered content search hook for tvOS Beta 500
 *
 * Manages search state, debounced API calls via httpClient,
 * and credit tracking from API responses.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { httpClient } from '../services/httpClient';
import { logger } from '../utils/logger';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  content_type: 'movie' | 'series' | 'live_tv' | 'radio' | 'podcast';
  thumbnail_url: string;
  relevance_score: number;
}

interface AISearchResponse {
  results: SearchResult[];
  credits_used: number;
  credits_remaining: number;
  query_id: string;
}

interface AISearchState {
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  creditsRemaining: number | null;
  isOutOfCredits: boolean;
}

const DEBOUNCE_DELAY_MS = 500;
const MIN_QUERY_LENGTH = 2;

const INITIAL_STATE: AISearchState = {
  results: [],
  isLoading: false,
  error: null,
  creditsRemaining: null,
  isOutOfCredits: false,
};

export function useAISearch() {
  const [state, setState] = useState<AISearchState>(INITIAL_STATE);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const executeSearch = useCallback(
    async (query: string, filter: string) => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const payload: Record<string, string> = { query };
        if (filter && filter !== 'all') {
          payload.content_type = filter;
        }

        const response = await httpClient.post<AISearchResponse>(
          '/beta/ai/search',
          payload,
        );

        const data = response.data;

        setState({
          results: data.results,
          isLoading: false,
          error: null,
          creditsRemaining: data.credits_remaining,
          isOutOfCredits: data.credits_remaining <= 0,
        });

        logger.info('AI search completed', {
          queryId: data.query_id,
          resultCount: data.results.length,
          creditsUsed: data.credits_used,
          creditsRemaining: data.credits_remaining,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Search request failed';

        // Detect credit exhaustion from HTTP 402/403
        const isCreditsError = message.includes('402') || message.includes('403');

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: isCreditsError ? null : message,
          isOutOfCredits: isCreditsError ? true : prev.isOutOfCredits,
        }));

        logger.error('AI search failed', { error: message });
      }
    },
    [],
  );

  const search = useCallback(
    (query: string, filter: string = 'all') => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (query.length < MIN_QUERY_LENGTH) {
        setState(INITIAL_STATE);
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      debounceTimerRef.current = setTimeout(() => {
        executeSearch(query, filter);
      }, DEBOUNCE_DELAY_MS);
    },
    [executeSearch],
  );

  const clearResults = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(INITIAL_STATE);
  }, []);

  return {
    results: state.results,
    isLoading: state.isLoading,
    error: state.error,
    creditsRemaining: state.creditsRemaining,
    isOutOfCredits: state.isOutOfCredits,
    search,
    clearResults,
  };
}
