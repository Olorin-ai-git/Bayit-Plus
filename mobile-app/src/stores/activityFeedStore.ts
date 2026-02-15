import { create } from 'zustand';
import api from '@bayit/shared-services/api';
import { log } from '@bayit/shared-services/logger.native';

interface MovieResponse {
  _id: string;
  title: string;
  thumbnail?: string;
  duration?: number;
}

interface ContentResponse {
  _id?: string;
  id?: string;
  title: string;
  thumbnail?: string;
  type?: string;
  duration?: number;
}

export interface FeedItem {
  id: string;
  title: string;
  thumbnail?: string;
  type: string;
  progress?: number;
  position?: number;
  duration?: number;
}

export interface Friend {
  user_id: string;
  displayName?: string;
  avatar?: string;
  email?: string;
}

interface ActivityFeedState {
  continueWatching: FeedItem[];
  recentlyAdded: FeedItem[];
  trending: FeedItem[];
  friends: Friend[];
  loading: boolean;
  error: string | null;

  fetchContinueWatching: () => Promise<void>;
  fetchRecentlyAdded: () => Promise<void>;
  fetchTrending: () => Promise<void>;
  fetchFriends: () => Promise<void>;
  fetchAllFeeds: () => Promise<void>;
}

export const useActivityFeedStore = create<ActivityFeedState>((set, get) => ({
  continueWatching: [],
  recentlyAdded: [],
  trending: [],
  friends: [],
  loading: false,
  error: null,

  fetchContinueWatching: async () => {
    try {
      const response = await api.get('/history/continue');
      set({ continueWatching: response.items || [] });
      log.info('Fetched continue watching', { count: response.items?.length || 0 });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch continue watching';
      log.error('Failed to fetch continue watching', { error });
      set({ error });
    }
  },

  fetchRecentlyAdded: async () => {
    try {
      const response = await api.get('/content/movies?limit=10&sort=newest');
      const items = response.movies?.map((movie: MovieResponse) => ({
        id: movie._id,
        title: movie.title,
        thumbnail: movie.thumbnail,
        type: 'movie',
        duration: movie.duration,
      })) || [];
      set({ recentlyAdded: items });
      log.info('Fetched recently added', { count: items.length });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch recently added';
      log.error('Failed to fetch recently added', { error });
    }
  },

  fetchTrending: async () => {
    try {
      const response = await api.get('/content/featured');
      const items = response.items?.slice(0, 10).map((item: ContentResponse) => ({
        id: item._id || item.id || '',
        title: item.title,
        thumbnail: item.thumbnail,
        type: item.type || 'movie',
        duration: item.duration,
      })) || [];
      set({ trending: items });
      log.info('Fetched trending', { count: items.length });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch trending';
      log.error('Failed to fetch trending', { error });
    }
  },

  fetchFriends: async () => {
    try {
      const response = await api.get('/friends/list');
      set({ friends: response.friends || [] });
      log.info('Fetched friends for activity feed', { count: response.friends?.length || 0 });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch friends';
      log.error('Failed to fetch friends', { error });
    }
  },

  fetchAllFeeds: async () => {
    set({ loading: true, error: null });
    try {
      await Promise.all([
        get().fetchContinueWatching(),
        get().fetchRecentlyAdded(),
        get().fetchTrending(),
        get().fetchFriends(),
      ]);
      set({ loading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch activity feeds';
      log.error('Failed to fetch activity feeds', { error });
      set({ error, loading: false });
    }
  },
}));
