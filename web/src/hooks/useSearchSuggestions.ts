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

        // Map API response format (label) to frontend format (name)
        const mappedCategories = (categoriesData.categories || []).map((cat: any) => ({
          name: cat.label || cat.name,
          emoji: cat.emoji,
          filters: cat.filters,
        }));

        setCategories(mappedCategories);

        logger.info('Search suggestions loaded', LOG_CONTEXT, {
          trendingCount: trendingData.trending?.length || 0,
          categoriesCount: mappedCategories.length,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error('Failed to load search suggestions', LOG_CONTEXT, {
          error: errorMessage,
        });
        setError(errorMessage);

        // Fallback categories when API fails
        const fallbackCategories: Category[] = [
          { name: 'Movies', emoji: 'Film', filters: { content_types: ['vod'] } },
          { name: 'Series', emoji: 'Tv', filters: { content_types: ['vod'] } },
          { name: 'Kids', emoji: 'Users', filters: { is_kids_content: true } },
          { name: 'Comedy', emoji: 'Smile', filters: { genres: ['Comedy'] } },
          { name: 'Drama', emoji: 'Theater', filters: { genres: ['Drama'] } },
          { name: 'Documentaries', emoji: 'Binoculars', filters: { genres: ['Documentary'] } },
        ];

        // Fallback trending searches
        const fallbackTrending: string[] = [
          'Fauda',
          'Shtisel',
          'Tehran',
          'Valley of Tears',
        ];

        setTrendingSearches(fallbackTrending);
        setCategories(fallbackCategories);

        logger.info('Using fallback suggestions data', LOG_CONTEXT, {
          categoriesCount: fallbackCategories.length,
          trendingCount: fallbackTrending.length,
        });
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
