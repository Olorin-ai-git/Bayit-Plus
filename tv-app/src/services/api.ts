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

export default api;
