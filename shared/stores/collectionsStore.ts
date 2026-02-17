/**
 * Collections Store - Manages movie collections state across platforms.
 *
 * Handles collection listing, detail views, and AI-rotating collection recommendations.
 */

import { create } from 'zustand';
import { apiCollectionsService } from '../services/api/vodServices';
import logger from '../utils/logger';

const collectionsLogger = logger.scope('CollectionsStore');

interface CollectionSummary {
  id: string;
  title: string;
  title_en?: string;
  thumbnail?: string;
  backdrop?: string;
  promo_text?: string;
  promo_text_en?: string;
  available_movies: number;
  total_movies: number;
  tmdb_collection_id?: number;
}

interface MovieInCollection {
  id: string;
  title: string;
  title_en?: string;
  year?: number;
  thumbnail?: string;
  duration?: string;
  collection_order: number;
  rating?: number;
  stream_url: string;
}

interface CollectionDetail extends CollectionSummary {
  description?: string;
  description_en?: string;
  movies: MovieInCollection[];
}

interface CollectionsState {
  collections: CollectionSummary[];
  recommendations: CollectionSummary[];
  currentCollection: CollectionDetail | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  error: string | null;

  fetchCollections: (skip?: number, limit?: number) => Promise<void>;
  fetchRecommendations: () => Promise<void>;
  fetchCollectionDetail: (collectionId: string) => Promise<void>;
  clearDetail: () => void;
  clearError: () => void;
}

export const useCollectionsStore = create<CollectionsState>((set) => ({
  collections: [],
  recommendations: [],
  currentCollection: null,
  isLoading: false,
  isDetailLoading: false,
  error: null,

  fetchCollections: async (skip = 0, limit = 50) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiCollectionsService.getAll(skip, limit);
      set({ collections: Array.isArray(data) ? data : [], isLoading: false });
    } catch (err: any) {
      collectionsLogger.error('Failed to fetch collections', { error: err });
      set({
        error: err?.detail || err?.message || 'Failed to load collections',
        isLoading: false,
      });
    }
  },

  fetchRecommendations: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiCollectionsService.getRecommendations();
      set({ recommendations: Array.isArray(data) ? data : [], isLoading: false });
    } catch (err: any) {
      collectionsLogger.error('Failed to fetch collection recommendations', { error: err });
      set({
        error: err?.detail || err?.message || 'Failed to load collection recommendations',
        isLoading: false,
      });
    }
  },

  fetchCollectionDetail: async (collectionId: string) => {
    set({ isDetailLoading: true, error: null });
    try {
      const data = await apiCollectionsService.getDetail(collectionId);
      set({ currentCollection: data, isDetailLoading: false });
    } catch (err: any) {
      collectionsLogger.error('Failed to fetch collection detail', { error: err, collectionId });
      set({
        error: err?.detail || err?.message || 'Collection not found',
        isDetailLoading: false,
      });
    }
  },

  clearDetail: () => set({ currentCollection: null }),

  clearError: () => set({ error: null }),
}));

export default useCollectionsStore;
