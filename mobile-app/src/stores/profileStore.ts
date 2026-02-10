import { create } from 'zustand';
import api from '@bayit/shared-services/api';
import { log } from '@bayit/shared-services/logger';

export interface WatchHistoryItem {
  id: string;
  episode_id?: string;
  title: string;
  thumbnail: string;
  duration?: number;
  type: string;
  progress: number;
  position: number;
  completed: boolean;
  lastWatched: string;
}

export interface FavoriteItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
}

export interface WatchlistItem {
  id: string;
  title: string;
  thumbnail?: string;
  type: string;
  addedAt: string;
  duration?: number;
}

export interface ProfileStats {
  playlist_count: number;
  favorites_count: number;
  downloads_count: number;
  watch_time_minutes: number;
}

interface ProfileState {
  watchHistory: WatchHistoryItem[];
  favorites: FavoriteItem[];
  watchlist: WatchlistItem[];
  stats: ProfileStats | null;
  loading: boolean;
  error: string | null;

  fetchWatchHistory: (page?: number) => Promise<void>;
  fetchFavorites: () => Promise<void>;
  fetchWatchlist: () => Promise<void>;
  fetchStats: () => Promise<void>;
  removeFromHistory: (contentId: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  toggleFavorite: (contentId: string, contentType: string) => Promise<boolean>;
  toggleWatchlist: (contentId: string, contentType: string) => Promise<boolean>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  watchHistory: [],
  favorites: [],
  watchlist: [],
  stats: null,
  loading: false,
  error: null,

  fetchWatchHistory: async (page = 1) => {
    try {
      set({ loading: true, error: null });
      const response = await api.get(`/history?page=${page}&limit=20`);
      set({ watchHistory: response.items, loading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch watch history';
      log.error('Failed to fetch watch history', { error });
      set({ error, loading: false });
    }
  },

  fetchFavorites: async () => {
    try {
      set({ loading: true, error: null });
      const response = await api.get('/favorites');
      set({ favorites: response.items, loading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch favorites';
      log.error('Failed to fetch favorites', { error });
      set({ error, loading: false });
    }
  },

  fetchWatchlist: async () => {
    try {
      set({ loading: true, error: null });
      const response = await api.get('/watchlist');
      set({ watchlist: response.items, loading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch watchlist';
      log.error('Failed to fetch watchlist', { error });
      set({ error, loading: false });
    }
  },

  fetchStats: async () => {
    try {
      set({ loading: true, error: null });
      const response = await api.get('/profile/stats');
      set({ stats: response, loading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch profile stats';
      log.error('Failed to fetch profile stats', { error });
      set({ error, loading: false });
    }
  },

  removeFromHistory: async (contentId: string) => {
    try {
      await api.delete(`/history/${contentId}`);
      const { watchHistory } = get();
      set({ watchHistory: watchHistory.filter((item) => item.id !== contentId) });
      log.info('Removed from watch history', { contentId });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to remove from history';
      log.error('Failed to remove from history', { error });
      throw err;
    }
  },

  clearHistory: async () => {
    try {
      await api.delete('/history');
      set({ watchHistory: [] });
      log.info('Cleared watch history');
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to clear history';
      log.error('Failed to clear history', { error });
      throw err;
    }
  },

  toggleFavorite: async (contentId: string, contentType: string) => {
    try {
      const response = await api.post(`/favorites/toggle/${contentId}?content_type=${contentType}`);
      await get().fetchFavorites();
      log.info('Toggled favorite', { contentId, isFavorite: response.is_favorite });
      return response.is_favorite;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to toggle favorite';
      log.error('Failed to toggle favorite', { error });
      throw err;
    }
  },

  toggleWatchlist: async (contentId: string, contentType: string) => {
    try {
      const response = await api.post(`/watchlist/toggle/${contentId}?content_type=${contentType}`);
      await get().fetchWatchlist();
      log.info('Toggled watchlist', { contentId, inWatchlist: response.in_watchlist });
      return response.in_watchlist;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to toggle watchlist';
      log.error('Failed to toggle watchlist', { error });
      throw err;
    }
  },
}));
