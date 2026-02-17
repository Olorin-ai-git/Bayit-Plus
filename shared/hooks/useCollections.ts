/**
 * useCollections Hook - Movie collections browsing.
 *
 * Provides collection listing, AI recommendations, and detail fetching.
 */

import { useEffect } from 'react';
import { useCollectionsStore } from '../stores/collectionsStore';

interface UseCollectionsOptions {
  fetchOnMount?: boolean;
  fetchRecommendationsOnMount?: boolean;
}

export function useCollections(options: UseCollectionsOptions = {}) {
  const { fetchOnMount = true, fetchRecommendationsOnMount = false } = options;
  const store = useCollectionsStore();

  useEffect(() => {
    if (fetchOnMount && store.collections.length === 0) {
      store.fetchCollections();
    }
  }, [fetchOnMount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (fetchRecommendationsOnMount && store.recommendations.length === 0) {
      store.fetchRecommendations();
    }
  }, [fetchRecommendationsOnMount]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    collections: store.collections,
    recommendations: store.recommendations,
    isLoading: store.isLoading,
    error: store.error,
    refresh: store.fetchCollections,
    refreshRecommendations: store.fetchRecommendations,
  };
}

/**
 * useCollectionDetail - Hook for collection detail screen.
 */
export function useCollectionDetail(collectionId: string | undefined) {
  const store = useCollectionsStore();

  useEffect(() => {
    if (collectionId) {
      store.fetchCollectionDetail(collectionId);
    }
    return () => {
      store.clearDetail();
    };
  }, [collectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    collection: store.currentCollection,
    isLoading: store.isDetailLoading,
    error: store.error,
  };
}
