/**
 * useAIRecommendations - AI-powered content recommendations hook
 *
 * Manages AI recommendation state, API calls, and credit tracking
 * for the tvOS Beta 500 program.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { httpClient } from '../services/httpClient';
import { logger } from '../utils/logger';

export interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  content_type: 'movie' | 'series' | 'live_tv' | 'radio' | 'podcast';
  thumbnail_url: string;
  relevance_score: number;
  reason: string;
}

interface AIRecommendationsResponse {
  recommendations: Record<string, RecommendationItem[]>;
  credits_used: number;
  credits_remaining: number;
}

export type RecommendationCategory =
  | 'all'
  | 'live_tv'
  | 'vod'
  | 'radio'
  | 'podcasts';

interface UseAIRecommendationsResult {
  recommendations: Record<string, RecommendationItem[]>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  activeCategory: RecommendationCategory;
  setActiveCategory: (category: RecommendationCategory) => void;
  creditsRemaining: number;
  isOutOfCredits: boolean;
}

const CATEGORIES: RecommendationCategory[] = [
  'all',
  'live_tv',
  'vod',
  'radio',
  'podcasts',
];

export { CATEGORIES as RECOMMENDATION_CATEGORIES };

export function useAIRecommendations(
  isEnrolled: boolean
): UseAIRecommendationsResult {
  const [recommendations, setRecommendations] = useState<
    Record<string, RecommendationItem[]>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] =
    useState<RecommendationCategory>('all');
  const [creditsRemaining, setCreditsRemaining] = useState(0);
  const [isOutOfCredits, setIsOutOfCredits] = useState(false);
  const mountedRef = useRef(true);

  const fetchRecommendations = useCallback(
    async (category: RecommendationCategory) => {
      if (!isEnrolled) {
        logger.debug('Skipping recommendations fetch: user not enrolled');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data } =
          await httpClient.post<AIRecommendationsResponse>(
            '/beta/ai/recommendations',
            { category }
          );

        if (!mountedRef.current) return;

        setRecommendations(data.recommendations);
        setCreditsRemaining(data.credits_remaining);
        setIsOutOfCredits(data.credits_remaining <= 0);

        logger.info('AI recommendations fetched', {
          category,
          creditsUsed: data.credits_used,
          creditsRemaining: data.credits_remaining,
          itemCount: Object.values(data.recommendations).reduce(
            (sum, items) => sum + items.length,
            0
          ),
        });
      } catch (err) {
        if (!mountedRef.current) return;

        const message =
          err instanceof Error ? err.message : 'Failed to fetch recommendations';
        setError(message);
        logger.error('Failed to fetch AI recommendations', {
          category,
          error: message,
        });
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [isEnrolled]
  );

  const refresh = useCallback(async () => {
    await fetchRecommendations(activeCategory);
  }, [fetchRecommendations, activeCategory]);

  const handleCategoryChange = useCallback(
    (category: RecommendationCategory) => {
      setActiveCategory(category);
    },
    []
  );

  // Fetch on mount and category change
  useEffect(() => {
    fetchRecommendations(activeCategory);
  }, [activeCategory, fetchRecommendations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    recommendations,
    isLoading,
    error,
    refresh,
    activeCategory,
    setActiveCategory: handleCategoryChange,
    creditsRemaining,
    isOutOfCredits,
  };
}
