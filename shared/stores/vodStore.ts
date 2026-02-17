/**
 * VOD Content Store - Manages VOD browsing state across platforms.
 *
 * Handles featured content, categories, movies, trending, and collections.
 * Used by web, tvOS, and tv-app platforms.
 */

import { create } from 'zustand';
import { apiContentService } from '../services/api/contentServices';
import { apiCollectionsService, apiVodBrowseService } from '../services/api/vodServices';
import { apiTrendingService } from '../services/api/specialtyServices';
import type { VODContentItem, VODCategory, VODFilters } from '../types/vod';
import logger from '../utils/logger';

const vodLogger = logger.scope('VODStore');

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
}

interface VODState {
  // Featured & home
  featured: VODContentItem[];
  categories: VODCategory[];
  trending: VODContentItem[];
  collections: CollectionSummary[];

  // Category browsing
  categoryContent: VODContentItem[];
  categoryTotal: number;

  // Search
  searchResults: VODContentItem[];
  searchQuery: string;

  // Detail
  currentContent: VODContentItem | null;
  relatedContent: VODContentItem[];

  // UI state
  isLoading: boolean;
  isCategoryLoading: boolean;
  isSearching: boolean;
  error: string | null;
  filters: VODFilters;

  // Actions
  fetchFeatured: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchTrending: (limit?: number) => Promise<void>;
  fetchCollections: () => Promise<void>;
  fetchCategoryContent: (categoryId: string) => Promise<void>;
  fetchMovies: (filters?: VODFilters) => Promise<void>;
  fetchContentDetail: (contentId: string) => Promise<void>;
  fetchRelated: (contentId: string, limit?: number) => Promise<void>;
  searchContent: (query: string, filters?: VODFilters) => Promise<void>;
  setFilters: (filters: Partial<VODFilters>) => void;
  clearSearch: () => void;
  clearError: () => void;
}

export const useVodStore = create<VODState>((set, get) => ({
  featured: [],
  categories: [],
  trending: [],
  collections: [],
  categoryContent: [],
  categoryTotal: 0,
  searchResults: [],
  searchQuery: '',
  currentContent: null,
  relatedContent: [],
  isLoading: false,
  isCategoryLoading: false,
  isSearching: false,
  error: null,
  filters: {},

  fetchFeatured: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiContentService.getFeatured();
      set({ featured: data?.items || data || [], isLoading: false });
    } catch (err: any) {
      vodLogger.error('Failed to fetch featured content', { error: err });
      set({ error: err?.detail || err?.message || 'Failed to load featured content', isLoading: false });
    }
  },

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiContentService.getCategories();
      set({ categories: data?.categories || data || [], isLoading: false });
    } catch (err: any) {
      vodLogger.error('Failed to fetch categories', { error: err });
      set({ error: err?.detail || err?.message || 'Failed to load categories', isLoading: false });
    }
  },

  fetchTrending: async (limit = 10) => {
    try {
      const data = await apiTrendingService.getRecommendations(limit);
      set({ trending: data?.items || data || [] });
    } catch (err: any) {
      vodLogger.error('Failed to fetch trending content', { error: err });
    }
  },

  fetchCollections: async () => {
    try {
      const data = await apiCollectionsService.getRecommendations();
      set({ collections: Array.isArray(data) ? data : data?.collections || [] });
    } catch (err: any) {
      vodLogger.error('Failed to fetch collections', { error: err });
    }
  },

  fetchCategoryContent: async (categoryId: string) => {
    set({ isCategoryLoading: true, error: null });
    try {
      const data = await apiContentService.getByCategory(categoryId);
      const items = data?.items || data || [];
      set({
        categoryContent: items,
        categoryTotal: data?.total || items.length,
        isCategoryLoading: false,
      });
    } catch (err: any) {
      vodLogger.error('Failed to fetch category content', { error: err, categoryId });
      set({ error: err?.detail || err?.message || 'Failed to load category', isCategoryLoading: false });
    }
  },

  fetchMovies: async (filters?: VODFilters) => {
    set({ isCategoryLoading: true, error: null });
    try {
      const params = filters || get().filters;
      const data = await apiVodBrowseService.getMovies({
        skip: ((params.page || 1) - 1) * (params.page_size || 20),
        limit: params.page_size || 20,
        genre: params.genre,
        sort_by: params.sort_by,
      });
      const items = data?.items || data || [];
      set({
        categoryContent: items,
        categoryTotal: data?.total || items.length,
        isCategoryLoading: false,
      });
    } catch (err: any) {
      vodLogger.error('Failed to fetch movies', { error: err });
      set({ error: err?.detail || err?.message || 'Failed to load movies', isCategoryLoading: false });
    }
  },

  fetchContentDetail: async (contentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiContentService.getById(contentId);
      set({ currentContent: data, isLoading: false });
    } catch (err: any) {
      vodLogger.error('Failed to fetch content detail', { error: err, contentId });
      set({ error: err?.detail || err?.message || 'Content not found', isLoading: false });
    }
  },

  fetchRelated: async (contentId: string, limit = 10) => {
    try {
      const data = await apiVodBrowseService.getRelated(contentId, limit);
      set({ relatedContent: data?.items || data || [] });
    } catch (err: any) {
      vodLogger.error('Failed to fetch related content', { error: err, contentId });
    }
  },

  searchContent: async (query: string, filters?: VODFilters) => {
    if (!query.trim()) {
      set({ searchResults: [], searchQuery: '' });
      return;
    }
    set({ isSearching: true, searchQuery: query, error: null });
    try {
      const data = await apiVodBrowseService.search(query, {
        genre: filters?.genre,
        page: filters?.page,
        limit: filters?.page_size,
      });
      set({ searchResults: data?.items || data || [], isSearching: false });
    } catch (err: any) {
      vodLogger.error('Failed to search content', { error: err, query });
      set({ error: err?.detail || err?.message || 'Search failed', isSearching: false });
    }
  },

  setFilters: (newFilters: Partial<VODFilters>) => {
    set((state) => ({ filters: { ...state.filters, ...newFilters } }));
  },

  clearSearch: () => set({ searchResults: [], searchQuery: '', isSearching: false }),

  clearError: () => set({ error: null }),
}));

export default useVodStore;
