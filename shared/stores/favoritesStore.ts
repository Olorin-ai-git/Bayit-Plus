/**
 * Favorites Store - Manages user favorites/My List across platforms.
 *
 * Provides optimistic updates and server sync for content favorites.
 */

import { create } from 'zustand';
import { apiFavoritesService } from '../services/api/userServices';
import type { VODContentItem } from '../types/vod';
import logger from '../utils/logger';

const favoritesLogger = logger.scope('FavoritesStore');

interface FavoritesState {
  items: VODContentItem[];
  favoriteIds: Set<string>;
  isLoading: boolean;
  error: string | null;

  fetchFavorites: () => Promise<void>;
  toggleFavorite: (contentId: string, contentType?: string) => Promise<boolean>;
  isFavorite: (contentId: string) => boolean;
  clearError: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  items: [],
  favoriteIds: new Set(),
  isLoading: false,
  error: null,

  fetchFavorites: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFavoritesService.getFavorites();
      const items: VODContentItem[] = Array.isArray(data) ? data : data?.items || [];
      const favoriteIds = new Set(items.map((item: VODContentItem) => item.id));
      set({ items, favoriteIds, isLoading: false });
    } catch (err: any) {
      favoritesLogger.error('Failed to fetch favorites', { error: err });
      set({
        error: err?.detail || err?.message || 'Failed to load favorites',
        isLoading: false,
      });
    }
  },

  toggleFavorite: async (contentId: string, contentType = 'vod') => {
    const wasInFavorites = get().favoriteIds.has(contentId);

    // Optimistic update
    set((state) => {
      const newIds = new Set(state.favoriteIds);
      if (wasInFavorites) {
        newIds.delete(contentId);
      } else {
        newIds.add(contentId);
      }
      return {
        favoriteIds: newIds,
        items: wasInFavorites
          ? state.items.filter((item) => item.id !== contentId)
          : state.items,
      };
    });

    try {
      const result = await apiFavoritesService.toggleFavorite(contentId, contentType);
      const isNowFavorite = result?.is_favorite ?? !wasInFavorites;

      // If server state differs from optimistic, correct it
      if (isNowFavorite === wasInFavorites) {
        set((state) => {
          const correctedIds = new Set(state.favoriteIds);
          if (isNowFavorite) {
            correctedIds.add(contentId);
          } else {
            correctedIds.delete(contentId);
          }
          return { favoriteIds: correctedIds };
        });
      }

      return isNowFavorite;
    } catch (err: any) {
      favoritesLogger.error('Failed to toggle favorite', { error: err, contentId });

      // Revert optimistic update
      set((state) => {
        const revertedIds = new Set(state.favoriteIds);
        if (wasInFavorites) {
          revertedIds.add(contentId);
        } else {
          revertedIds.delete(contentId);
        }
        return { favoriteIds: revertedIds };
      });

      return wasInFavorites;
    }
  },

  isFavorite: (contentId: string) => {
    return get().favoriteIds.has(contentId);
  },

  clearError: () => set({ error: null }),
}));

export default useFavoritesStore;
