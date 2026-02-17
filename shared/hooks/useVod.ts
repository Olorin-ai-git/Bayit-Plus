/**
 * useVod Hook - Convenience hook for VOD content browsing.
 *
 * Composes vodStore actions with automatic data fetching on mount.
 * Used by all platforms for home screen, category browsing, and content detail.
 */

import { useEffect, useCallback } from 'react';
import { useVodStore } from '../stores/vodStore';
import type { VODFilters } from '../types/vod';

interface UseVodOptions {
  fetchFeaturedOnMount?: boolean;
  fetchCategoriesOnMount?: boolean;
  fetchTrendingOnMount?: boolean;
  fetchCollectionsOnMount?: boolean;
}

export function useVod(options: UseVodOptions = {}) {
  const {
    fetchFeaturedOnMount = false,
    fetchCategoriesOnMount = false,
    fetchTrendingOnMount = false,
    fetchCollectionsOnMount = false,
  } = options;

  const store = useVodStore();

  useEffect(() => {
    if (fetchFeaturedOnMount && store.featured.length === 0) {
      store.fetchFeatured();
    }
  }, [fetchFeaturedOnMount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (fetchCategoriesOnMount && store.categories.length === 0) {
      store.fetchCategories();
    }
  }, [fetchCategoriesOnMount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (fetchTrendingOnMount && store.trending.length === 0) {
      store.fetchTrending();
    }
  }, [fetchTrendingOnMount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (fetchCollectionsOnMount && store.collections.length === 0) {
      store.fetchCollections();
    }
  }, [fetchCollectionsOnMount]); // eslint-disable-line react-hooks/exhaustive-deps

  return store;
}

/**
 * useVodDetail - Hook for content detail screen.
 *
 * Fetches content detail and related content when contentId changes.
 */
export function useVodDetail(contentId: string | undefined) {
  const store = useVodStore();

  useEffect(() => {
    if (contentId) {
      store.fetchContentDetail(contentId);
      store.fetchRelated(contentId);
    }
  }, [contentId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    content: store.currentContent,
    relatedContent: store.relatedContent,
    isLoading: store.isLoading,
    error: store.error,
  };
}

/**
 * useVodCategory - Hook for category browsing screen.
 *
 * Fetches category content with filter support.
 */
export function useVodCategory(categoryId: string | undefined) {
  const store = useVodStore();

  useEffect(() => {
    if (categoryId) {
      store.fetchCategoryContent(categoryId);
    }
  }, [categoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = useCallback((filters: VODFilters) => {
    store.setFilters(filters);
    store.fetchMovies(filters);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    items: store.categoryContent,
    total: store.categoryTotal,
    isLoading: store.isCategoryLoading,
    error: store.error,
    filters: store.filters,
    applyFilters,
  };
}
