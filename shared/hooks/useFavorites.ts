/**
 * useFavorites Hook - Convenience hook for favorites/My List.
 *
 * Provides optimistic toggle with auto-fetch on mount.
 */

import { useEffect, useCallback } from 'react';
import { useFavoritesStore } from '../stores/favoritesStore';

interface UseFavoritesOptions {
  fetchOnMount?: boolean;
}

export function useFavorites(options: UseFavoritesOptions = {}) {
  const { fetchOnMount = true } = options;
  const store = useFavoritesStore();

  useEffect(() => {
    if (fetchOnMount && store.items.length === 0) {
      store.fetchFavorites();
    }
  }, [fetchOnMount]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(
    (contentId: string, contentType?: string) => {
      return store.toggleFavorite(contentId, contentType);
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return {
    favorites: store.items,
    isFavorite: store.isFavorite,
    toggleFavorite: toggle,
    isLoading: store.isLoading,
    error: store.error,
  };
}
