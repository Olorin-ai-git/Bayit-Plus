import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';

// Get correct API URL based on platform
const getApiBaseUrl = () => {
  if (!__DEV__) {
    return 'https://api.bayit.network/api/v1';
  }
  // In development:
  if (Platform.OS === 'web') {
    return 'http://localhost:8000/api/v1';
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api/v1';  // Android emulator localhost
  }
  return 'http://localhost:8000/api/v1';  // iOS simulator
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,  // 5 second timeout for faster fallback to demo data
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error.response?.data || error);
  }
);

// Auth Service
export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (userData: { email: string; name: string; password: string }) =>
    api.post('/auth/register', userData),
  me: () => api.get('/auth/me'),
  getGoogleAuthUrl: () => api.get('/auth/google/url'),
  googleCallback: (code: string) => api.post('/auth/google/callback', { code }),
};

// Content Service
export const contentService = {
  getFeatured: () => api.get('/content/featured'),
  getCategories: () => api.get('/content/categories'),
  getByCategory: (categoryId: string) => api.get(`/content/category/${categoryId}`),
  getById: (contentId: string) => api.get(`/content/${contentId}`),
  getStreamUrl: (contentId: string) => api.get(`/content/${contentId}/stream`),
};

// Live TV Service
export const liveService = {
  getChannels: () => api.get('/live/channels'),
  getChannel: (channelId: string) => api.get(`/live/${channelId}`),
  getStreamUrl: (channelId: string) => api.get(`/live/${channelId}/stream`),
};

// Radio Service
export const radioService = {
  getStations: () => api.get('/radio/stations'),
  getStation: (stationId: string) => api.get(`/radio/${stationId}`),
  getStreamUrl: (stationId: string) => api.get(`/radio/${stationId}/stream`),
};

// Podcast Service
export const podcastService = {
  getShows: () => api.get('/podcasts'),
  getShow: (showId: string) => api.get(`/podcasts/${showId}`),
  getEpisodes: (showId: string) => api.get(`/podcasts/${showId}/episodes`),
};

// Watchlist Service
export const watchlistService = {
  getWatchlist: () => api.get('/watchlist'),
  addToWatchlist: (contentId: string, contentType: string) =>
    api.post('/watchlist', { content_id: contentId, content_type: contentType }),
  removeFromWatchlist: (contentId: string) => api.delete(`/watchlist/${contentId}`),
};

// History Service
export const historyService = {
  getContinueWatching: () => api.get('/history/continue'),
  updateProgress: (contentId: string, contentType: string, position: number, duration: number) =>
    api.post('/history/progress', { content_id: contentId, content_type: contentType, position, duration }),
};

// Search Filters
export interface SearchFilters {
  type?: 'all' | 'movies' | 'series' | 'channels' | 'radio' | 'podcasts';
  language?: string;
  limit?: number;
}

// Search Result Types
export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'movie' | 'series' | 'channel' | 'radio' | 'podcast';
  thumbnail?: string;
  relevanceScore?: number;
  metadata?: Record<string, any>;
}

export interface LLMSearchResponse {
  results: SearchResult[];
  query: string;
  interpretation?: string;  // LLM's interpretation of the query
  suggestions?: string[];   // Related search suggestions
  total: number;
}

// Search Service - LLM-powered natural language search
export const searchService = {
  // LLM-powered semantic search
  search: (query: string, filters?: SearchFilters): Promise<LLMSearchResponse> =>
    api.post('/search/llm', { query, ...filters }),

  // Quick search (autocomplete suggestions)
  quickSearch: (query: string, limit: number = 5) =>
    api.get('/search/quick', { params: { q: query, limit } }),

  // Get search suggestions based on user history
  getSuggestions: () => api.get('/search/suggestions'),

  // Voice search - sends audio transcription for search
  voiceSearch: (transcript: string, language: string, filters?: SearchFilters): Promise<LLMSearchResponse> =>
    api.post('/search/voice', { transcript, language, ...filters }),
};

// Favorites Service
export const favoritesService = {
  getFavorites: () => api.get('/favorites'),
  addToFavorites: (contentId: string, contentType: string) =>
    api.post('/favorites', { content_id: contentId, content_type: contentType }),
  removeFromFavorites: (contentId: string) => api.delete(`/favorites/${contentId}`),
  isFavorite: (contentId: string) => api.get(`/favorites/check/${contentId}`),
};

export default api;
