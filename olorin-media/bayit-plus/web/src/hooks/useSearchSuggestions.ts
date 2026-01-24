/**
 * useSearchSuggestions Hook
 *
 * Fetches trending searches and category suggestions from the API
 */

import { useState, useEffect } from 'react';
import logger from '@/utils/logger';
import type { Category } from '@/components/search';

const LOG_CONTEXT = 'useSearchSuggestions';

interface UseSearchSuggestionsReturn {
  trendingSearches: string[];
  categories: Category[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetch trending searches and categories from API
 */
export function useSearchSuggestions(): UseSearchSuggestionsReturn {
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get API URL from environment (no fallback - fail if not set)
        const apiUrl = import.meta.env.VITE_API_URL;
        if (!apiUrl) {
          throw new Error(
            'VITE_API_URL environment variable not configured. Cannot fetch search suggestions.'
          );
        }

        // Fetch trending searches
        const trendingResponse = await fetch(`${apiUrl}/search/trending`);
        if (!trendingResponse.ok) {
          throw new Error(`Failed to fetch trending searches: ${trendingResponse.status}`);
        }
        const trendingData = await trendingResponse.json();
        setTrendingSearches(trendingData.trending || []);

        // Fetch categories
        const categoriesResponse = await fetch(`${apiUrl}/search/categories`);
        if (!categoriesResponse.ok) {
          throw new Error(`Failed to fetch categories: ${categoriesResponse.status}`);
        }
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.categories || []);

        logger.info('Search suggestions loaded', LOG_CONTEXT, {
          trendingCount: trendingData.trending?.length || 0,
          categoriesCount: categoriesData.categories?.length || 0,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error('Failed to load search suggestions', LOG_CONTEXT, {
          error: errorMessage,
        });
        setError(errorMessage);

        // Set empty arrays on error (no fallback data)
        setTrendingSearches([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, []);

  return {
    trendingSearches,
    categories,
    loading,
    error,
  };
}
