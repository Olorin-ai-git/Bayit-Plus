import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { isDemo } from '../config/appConfig';
import {
  demoAuthService,
  demoContentService,
  demoLiveService,
  demoRadioService,
  demoPodcastService,
  demoSubscriptionService,
  demoWatchlistService,
  demoHistoryService,
  demoSearchService,
  demoFavoritesService,
  demoZmanService,
  demoTrendingService,
  demoRitualService,
  demoSubtitlesService,
  demoChaptersService,
  demoPartyService,
  demoChatService,
} from './demoService';

// Get correct API URL based on platform
const getApiBaseUrl = () => {
  if (!__DEV__) {
    return 'https://api.bayit.tv/api/v1';
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

// Auth Service (API)
const apiAuthService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (userData: { email: string; name: string; password: string }) =>
    api.post('/auth/register', userData),
  me: () => api.get('/auth/me'),
  getGoogleAuthUrl: () => api.get('/auth/google/url'),
  googleCallback: (code: string) => api.post('/auth/google/callback', { code }),
};

// Content Service (API)
const apiContentService = {
  getFeatured: () => api.get('/content/featured'),
  getCategories: () => api.get('/content/categories'),
  getByCategory: (categoryId: string) => api.get(`/content/category/${categoryId}`),
  getById: (contentId: string) => api.get(`/content/${contentId}`),
  getStreamUrl: (contentId: string) => api.get(`/content/${contentId}/stream`),
};

// Live TV Service (API)
const apiLiveService = {
  getChannels: () => api.get('/live/channels'),
  getChannel: (channelId: string) => api.get(`/live/${channelId}`),
  getStreamUrl: (channelId: string) => api.get(`/live/${channelId}/stream`),
};

// Radio Service (API)
const apiRadioService = {
  getStations: () => api.get('/radio/stations'),
  getStation: (stationId: string) => api.get(`/radio/${stationId}`),
  getStreamUrl: (stationId: string) => api.get(`/radio/${stationId}/stream`),
};

// Podcast Service (API)
const apiPodcastService = {
  getShows: (categoryId?: string) => api.get('/podcasts', { params: categoryId ? { category: categoryId } : {} }),
  getShow: (showId: string) => api.get(`/podcasts/${showId}`),
  getEpisodes: (showId: string) => api.get(`/podcasts/${showId}/episodes`),
  getCategories: () => api.get('/podcasts/categories'),
};

// Subscription Service (API)
const apiSubscriptionService = {
  getPlans: () => api.get('/subscriptions/plans'),
  getCurrentPlan: () => api.get('/subscriptions/current'),
  createCheckout: (planId: string) => api.post('/subscriptions/checkout', { plan_id: planId }),
  cancelSubscription: () => api.post('/subscriptions/cancel'),
  getInvoices: () => api.get('/subscriptions/invoices'),
  getPaymentMethods: () => api.get('/subscriptions/payment-methods'),
  addPaymentMethod: (token: string) => api.post('/subscriptions/payment-methods', { token }),
  removePaymentMethod: (methodId: string) => api.delete(`/subscriptions/payment-methods/${methodId}`),
  setDefaultPaymentMethod: (methodId: string) => api.post(`/subscriptions/payment-methods/${methodId}/default`),
};

// Watchlist Service (API)
const apiWatchlistService = {
  getWatchlist: () => api.get('/watchlist'),
  addToWatchlist: (contentId: string, contentType: string) =>
    api.post('/watchlist', { content_id: contentId, content_type: contentType }),
  removeFromWatchlist: (contentId: string) => api.delete(`/watchlist/${contentId}`),
  isInWatchlist: (contentId: string) => api.get(`/watchlist/check/${contentId}`),
  toggleWatchlist: (contentId: string, contentType: string = 'vod') =>
    api.post(`/watchlist/toggle/${contentId}?content_type=${contentType}`),
};

// History Service (API)
const apiHistoryService = {
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

// Search Service (API)
const apiSearchService = {
  search: (query: string, filters?: SearchFilters): Promise<LLMSearchResponse> =>
    api.post('/search/llm', { query, ...filters }),
  quickSearch: (query: string, limit: number = 5) =>
    api.get('/search/quick', { params: { q: query, limit } }),
  getSuggestions: () => api.get('/search/suggestions'),
  voiceSearch: (transcript: string, language: string, filters?: SearchFilters): Promise<LLMSearchResponse> =>
    api.post('/search/voice', { transcript, language, ...filters }),
};

// Favorites Service (API)
const apiFavoritesService = {
  getFavorites: () => api.get('/favorites'),
  addToFavorites: (contentId: string, contentType: string) =>
    api.post('/favorites', { content_id: contentId, content_type: contentType }),
  addFavorite: (contentId: string, contentType: string) =>
    api.post('/favorites', { content_id: contentId, content_type: contentType }),
  removeFromFavorites: (contentId: string) => api.delete(`/favorites/${contentId}`),
  removeFavorite: (contentId: string) => api.delete(`/favorites/${contentId}`),
  isFavorite: (contentId: string) => api.get(`/favorites/check/${contentId}`),
  toggleFavorite: (contentId: string, contentType: string = 'vod') =>
    api.post(`/favorites/toggle/${contentId}?content_type=${contentType}`),
};

// Zman Yisrael Service (API)
const apiZmanService = {
  getTime: (timezone?: string) => api.get('/zman/time', { params: { timezone } }),
  getShabbatTimes: (latitude?: number, longitude?: number) =>
    api.get('/zman/shabbat', { params: { latitude, longitude } }),
  getShabbatContent: () => api.get('/zman/shabbat-content'),
  updatePreferences: (prefs: {
    show_israel_time?: boolean;
    shabbat_mode_enabled?: boolean;
    local_timezone?: string;
  }) => api.post('/zman/preferences', prefs),
  getTimezones: () => api.get('/zman/timezones'),
};

// Trending Service (API)
const apiTrendingService = {
  getTopics: () => api.get('/trending/topics'),
  getHeadlines: (source?: string, limit: number = 20) =>
    api.get('/trending/headlines', { params: { source, limit } }),
  getRecommendations: (limit: number = 10) =>
    api.get('/trending/recommendations', { params: { limit } }),
  getSummary: () => api.get('/trending/summary'),
  getByCategory: (category: string) => api.get(`/trending/category/${category}`),
};

// Morning Ritual Service (API)
const apiRitualService = {
  check: () => api.get('/ritual/check'),
  shouldShow: () => api.get('/ritual/should-show'),
  getContent: () => api.get('/ritual/content'),
  getAIBrief: () => api.get('/ritual/ai-brief'),
  getIsraelNow: () => api.get('/ritual/israel-now'),
  getPreferences: () => api.get('/ritual/preferences'),
  updatePreferences: (prefs: Record<string, any>) => api.post('/ritual/preferences', prefs),
  skipToday: () => api.post('/ritual/skip-today'),
};

// Subtitles Service (API)
const apiSubtitlesService = {
  getLanguages: () => api.get('/subtitles/languages'),
  getTracks: (contentId: string, language?: string) =>
    api.get(`/subtitles/${contentId}`, { params: { language } }),
  getCues: (contentId: string, language: string = 'he', withNikud: boolean = false, startTime?: number, endTime?: number) =>
    api.get(`/subtitles/${contentId}/cues`, {
      params: { language, with_nikud: withNikud, start_time: startTime, end_time: endTime }
    }),
  generateNikud: (contentId: string, language: string = 'he', force: boolean = false) =>
    api.post(`/subtitles/${contentId}/nikud`, null, { params: { language, force } }),
  translateWord: (word: string, sourceLang: string = 'he', targetLang: string = 'en') =>
    api.post('/subtitles/translate/word', null, {
      params: { word, source_lang: sourceLang, target_lang: targetLang }
    }),
  translatePhrase: (phrase: string, sourceLang: string = 'he', targetLang: string = 'en') =>
    api.post('/subtitles/translate/phrase', null, {
      params: { phrase, source_lang: sourceLang, target_lang: targetLang }
    }),
  addNikudToText: (text: string) =>
    api.post('/subtitles/nikud/text', null, { params: { text } }),
};

// Chapters Service (API)
const apiChaptersService = {
  getChapters: (contentId: string) => api.get(`/chapters/${contentId}`),
  generateChapters: (contentId: string, force: boolean = false, transcript?: string) =>
    api.post(`/chapters/${contentId}/generate`, { transcript }, { params: { force } }),
  getLiveChapters: (channelId: string) => api.get(`/chapters/live/${channelId}`),
  getCategories: () => api.get('/chapters/categories/list'),
};

// Profiles Service (API)
const apiProfilesService = {
  getProfiles: () => api.get('/profiles'),
  createProfile: (data: {
    name: string;
    avatar?: string;
    avatar_color?: string;
    is_kids_profile?: boolean;
    kids_age_limit?: number;
    pin?: string;
  }) => api.post('/profiles', data),
  getProfile: (profileId: string) => api.get(`/profiles/${profileId}`),
  updateProfile: (profileId: string, data: {
    name?: string;
    avatar?: string;
    avatar_color?: string;
    is_kids_profile?: boolean;
    kids_age_limit?: number;
    pin?: string;
    preferences?: Record<string, any>;
  }) => api.put(`/profiles/${profileId}`, data),
  deleteProfile: (profileId: string) => api.delete(`/profiles/${profileId}`),
  selectProfile: (profileId: string, pin?: string) =>
    api.post(`/profiles/${profileId}/select`, { pin }),
  verifyPin: (profileId: string, pin: string) =>
    api.post(`/profiles/${profileId}/verify-pin`, { pin }),
  getRecommendations: (profileId: string) =>
    api.get(`/profiles/${profileId}/recommendations`),
  setKidsPin: (pin: string) => api.post('/profiles/kids-pin/set', { pin }),
  verifyKidsPin: (pin: string) => api.post('/profiles/kids-pin/verify', { pin }),
};

// Children Service (API)
const apiChildrenService = {
  getContent: (category?: string, maxAge?: number, limit?: number) =>
    api.get('/children/content', { params: { category, max_age: maxAge, limit } }),
  getCategories: () => api.get('/children/categories'),
  toggleParentalControls: (enabled: boolean) =>
    api.post('/children/parental-controls', { enabled }),
  verifyPin: (pin: string) => api.post('/children/verify-pin', { pin }),
  setPin: (pin: string) => api.post('/children/set-pin', { pin }),
  getSettings: () => api.get('/children/settings'),
  updateSettings: (settings: {
    parental_controls_enabled?: boolean;
    max_age_limit?: number;
    allowed_categories?: string[];
    screen_time_limit?: number;
    bedtime_enabled?: boolean;
    bedtime_start?: string;
    bedtime_end?: string;
  }) => api.put('/children/settings', settings),
};

// Judaism Service (API)
const apiJudaismService = {
  getContent: (category?: string, limit?: number) =>
    api.get('/judaism/content', { params: { category, limit } }),
  getCategories: () => api.get('/judaism/categories'),
  getLiveShiurim: () => api.get('/judaism/live'),
  getDailyContent: () => api.get('/judaism/daily'),
};

// Flows Service (API)
const apiFlowsService = {
  getFlows: () => api.get('/flows'),
  getActiveFlow: () => api.get('/flows/active'),
  getFlow: (flowId: string) => api.get(`/flows/${flowId}`),
  createFlow: (data: {
    name: string;
    name_en?: string;
    name_es?: string;
    description?: string;
    icon?: string;
    items?: Array<{
      content_id: string;
      content_type: string;
      title: string;
      thumbnail?: string;
      duration_hint?: number;
      order: number;
    }>;
    triggers?: Array<{
      type: string;
      start_time?: string;
      end_time?: string;
      days?: number[];
      skip_shabbat?: boolean;
    }>;
    auto_play?: boolean;
    ai_enabled?: boolean;
    ai_brief_enabled?: boolean;
  }) => api.post('/flows', data),
  updateFlow: (flowId: string, data: {
    name?: string;
    name_en?: string;
    name_es?: string;
    description?: string;
    icon?: string;
    is_active?: boolean;
    items?: Array<any>;
    triggers?: Array<any>;
    auto_play?: boolean;
    ai_enabled?: boolean;
    ai_brief_enabled?: boolean;
  }) => api.put(`/flows/${flowId}`, data),
  deleteFlow: (flowId: string) => api.delete(`/flows/${flowId}`),
  addFlowItem: (flowId: string, item: {
    content_id: string;
    content_type: string;
    title: string;
    thumbnail?: string;
    duration_hint?: number;
  }) => api.post(`/flows/${flowId}/items`, item),
  removeFlowItem: (flowId: string, itemIndex: number) =>
    api.delete(`/flows/${flowId}/items/${itemIndex}`),
  skipFlowToday: (flowId: string) => api.post(`/flows/${flowId}/skip-today`),
  getFlowContent: (flowId: string) => api.get(`/flows/${flowId}/content`),
};

// Watch Party Service (API)
const apiPartyService = {
  create: (data: {
    content_id: string;
    content_type: string;
    content_title?: string;
    is_private?: boolean;
    audio_enabled?: boolean;
    chat_enabled?: boolean;
    sync_playback?: boolean;
  }) => api.post('/party/create', data),
  getMyParties: () => api.get('/party/my-parties'),
  joinByCode: (roomCode: string) => api.get(`/party/join/${roomCode}`),
  getParty: (partyId: string) => api.get(`/party/${partyId}`),
  joinParty: (partyId: string) => api.post(`/party/${partyId}/join`),
  leaveParty: (partyId: string) => api.post(`/party/${partyId}/leave`),
  endParty: (partyId: string) => api.post(`/party/${partyId}/end`),
  sendMessage: (partyId: string, message: string, messageType: string = 'text') =>
    api.post(`/party/${partyId}/chat`, { message, message_type: messageType }),
  getChatHistory: (partyId: string, limit: number = 50, before?: string) =>
    api.get(`/party/${partyId}/chat`, { params: { limit, before } }),
  syncPlayback: (partyId: string, position: number, isPlaying: boolean = true) =>
    api.post(`/party/${partyId}/sync`, null, { params: { position, is_playing: isPlaying } }),
};

// Chat / AI Assistant Service (API)
const apiChatService = {
  sendMessage: (message: string, conversationId?: string) =>
    api.post('/chat', { message, conversation_id: conversationId }),
  getConversation: (conversationId: string) => api.get(`/chat/${conversationId}`),
  clearConversation: (conversationId: string) => api.delete(`/chat/${conversationId}`),
  transcribeAudio: async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    return api.post('/chat/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ===========================================
// CONDITIONAL SERVICE EXPORTS
// In demo mode: use mock services only, no API calls
// In production mode: use API services only, fail fast
// ===========================================

export const authService = isDemo ? demoAuthService : apiAuthService;
export const contentService = isDemo ? demoContentService : apiContentService;
export const liveService = isDemo ? demoLiveService : apiLiveService;
export const radioService = isDemo ? demoRadioService : apiRadioService;
export const podcastService = isDemo ? demoPodcastService : apiPodcastService;
export const subscriptionService = isDemo ? demoSubscriptionService : apiSubscriptionService;
export const watchlistService = isDemo ? demoWatchlistService : apiWatchlistService;
export const historyService = isDemo ? demoHistoryService : apiHistoryService;
export const searchService = isDemo ? demoSearchService : apiSearchService;
export const favoritesService = isDemo ? demoFavoritesService : apiFavoritesService;
export const zmanService = isDemo ? demoZmanService : apiZmanService;
export const trendingService = isDemo ? demoTrendingService : apiTrendingService;
export const ritualService = isDemo ? demoRitualService : apiRitualService;
export const subtitlesService = isDemo ? demoSubtitlesService : apiSubtitlesService;
export const chaptersService = isDemo ? demoChaptersService : apiChaptersService;
export const partyService = isDemo ? demoPartyService : apiPartyService;
export const chatService = isDemo ? demoChatService : apiChatService;
export const profilesService = apiProfilesService; // No demo mode for profiles - requires real auth
export const childrenService = apiChildrenService; // No demo mode for children
export const judaismService = apiJudaismService; // No demo mode for judaism
export const flowsService = apiFlowsService; // No demo mode for flows

export default api;
