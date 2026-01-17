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
  demoRecordingService,
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
    // Only logout on authentication failures, not all 401 errors
    if (error.response?.status === 401) {
      const errorDetail = error.response?.data?.detail || '';
      const requestUrl = error.config?.url || '';

      // Only logout if it's from critical auth endpoints
      const isCriticalAuthEndpoint = ['/auth/me', '/auth/login', '/auth/refresh'].some(path =>
        requestUrl.includes(path)
      );

      // Or if it's a token validation error (not just "not authenticated")
      const isTokenError = [
        'Could not validate credentials',
        'Invalid authentication credentials',
        'Token has expired',
        'Invalid token',
        'Signature has expired'
      ].some(msg => errorDetail.toLowerCase().includes(msg.toLowerCase()));

      if (isCriticalAuthEndpoint || isTokenError) {
        useAuthStore.getState().logout();
      }
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
  getGoogleAuthUrl: async () => {
    // Build redirect URI from current origin (supports localhost, bayit.tv, bayit-plus.web.app)
    const redirectUri = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/auth/google/callback`
      : undefined;
    const response: any = await api.get('/auth/google/url', { params: { redirect_uri: redirectUri } });

    // Store state in sessionStorage for CSRF validation
    if (Platform.OS === 'web' && typeof window !== 'undefined' && response.state) {
      sessionStorage.setItem('oauth_state', response.state);
    }

    return response;
  },
  googleCallback: (code: string, redirectUri?: string, state?: string) => {
    // Retrieve state from sessionStorage if not provided
    let finalState = state;
    if (!finalState && Platform.OS === 'web' && typeof window !== 'undefined') {
      finalState = sessionStorage.getItem('oauth_state') || undefined;
      // Clean up after use
      if (finalState) {
        sessionStorage.removeItem('oauth_state');
      }
    }

    return api.post('/auth/google/callback', {
      code,
      redirect_uri: redirectUri,
      state: finalState,
    });
  },
};

// Verification Service (API)
const apiVerificationService = {
  sendEmailVerification: () => api.post('/verification/email/send'),
  verifyEmail: (token: string) => api.post('/verification/email/verify', { token }),
  sendPhoneVerification: (phoneNumber: string) =>
    api.post('/verification/phone/send', { phone_number: phoneNumber }),
  verifyPhone: (code: string) =>
    api.post('/verification/phone/verify', { code }),
  getVerificationStatus: () => api.get('/verification/status'),
};

// Content Service (API)
const apiContentService = {
  getFeatured: () => api.get('/content/featured'),
  getCategories: () => api.get('/content/categories'),
  getByCategory: (categoryId: string) => api.get(`/content/category/${categoryId}`),
  getById: (contentId: string) => api.get(`/content/${contentId}`),
  getStreamUrl: (contentId: string) => api.get(`/content/${contentId}/stream`),

  // Series endpoints
  getSeriesDetails: (seriesId: string) => api.get(`/content/series/${seriesId}`),
  getSeriesSeasons: (seriesId: string) => api.get(`/content/series/${seriesId}/seasons`),
  getSeasonEpisodes: (seriesId: string, seasonNum: number) =>
    api.get(`/content/series/${seriesId}/season/${seasonNum}/episodes`),

  // Movie endpoints
  getMovieDetails: (movieId: string) => api.get(`/content/movie/${movieId}`),

  // Preview endpoint
  getContentPreview: (contentId: string) => api.get(`/content/${contentId}/preview`),
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
  syncPodcasts: () => api.post('/podcasts/sync'),
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
// Trending endpoints use longer timeout because they call Claude AI for analysis
const apiTrendingService = {
  getTopics: () => api.get('/trending/topics', { timeout: 20000 }),
  getHeadlines: (source?: string, limit: number = 20) =>
    api.get('/trending/headlines', { params: { source, limit }, timeout: 20000 }),
  getRecommendations: (limit: number = 10) =>
    api.get('/trending/recommendations', { params: { limit }, timeout: 20000 }),
  getSummary: () => api.get('/trending/summary', { timeout: 20000 }),
  getByCategory: (category: string) => api.get(`/trending/category/${category}`, { timeout: 20000 }),
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
  fetchExternal: (contentId: string, languages?: string[]) =>
    api.post(`/subtitles/${contentId}/fetch-external`, null, {
      params: languages ? { languages: languages.join(',') } : undefined
    }),
};

// Subtitle Preferences Service (API)
const apiSubtitlePreferencesService = {
  getPreference: (contentId: string) =>
    api.get(`/subtitles/preferences/${contentId}`),
  setPreference: (contentId: string, language: string) =>
    api.post(`/subtitles/preferences/${contentId}`, null, { params: { language } }),
  deletePreference: (contentId: string) =>
    api.delete(`/subtitles/preferences/${contentId}`),
  getAllPreferences: () =>
    api.get('/subtitles/preferences'),
};

// Chapters Service (API)
const apiChaptersService = {
  getChapters: (contentId: string) => api.get(`/chapters/${contentId}`),
  generateChapters: (contentId: string, force: boolean = false, transcript?: string) =>
    api.post(`/chapters/${contentId}/generate`, { transcript }, { params: { force } }),
  getLiveChapters: (channelId: string) => api.get(`/chapters/live/${channelId}`),
  getCategories: () => api.get('/chapters/categories/list'),
};

// Voice Preferences Types
export type VoiceLanguage = 'he' | 'en' | 'es';
export type TextSize = 'small' | 'medium' | 'large';
export type VADSensitivity = 'low' | 'medium' | 'high';

export interface VoicePreferences {
  voice_search_enabled: boolean;
  // Note: voice_language is now derived from i18n.language instead of stored
  auto_subtitle: boolean;
  high_contrast_mode: boolean;
  text_size: TextSize;
  hold_button_mode: boolean;
  silence_threshold_ms: number;
  vad_sensitivity: VADSensitivity;
  // Wake word activation (mutually exclusive with always-listening - we use wake word only)
  wake_word_enabled: boolean;
  wake_word: string;
  wake_word_sensitivity: number;
  wake_word_cooldown_ms: number;
  // Three-mode system (Voice Only, Hybrid, Classic)
  voice_mode: string;
  voice_feedback_enabled: boolean;
  // TTS settings
  tts_enabled: boolean;
  tts_voice_id: string;
  tts_speed: number;
  tts_volume: number;
}

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
  // Voice Preferences
  getVoicePreferences: (): Promise<VoicePreferences> => api.get('/profiles/preferences/voice'),
  updateVoicePreferences: (prefs: VoicePreferences): Promise<{ message: string; preferences: VoicePreferences }> =>
    api.put('/profiles/preferences/voice', prefs),
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

// Resolved content item from resolve-content API
export interface ResolvedContentItem {
  id: string;
  name: string;
  type: string;
  thumbnail?: string;
  stream_url?: string;
  matched_name: string;
  confidence: number;
}

export interface ResolveContentResponse {
  items: ResolvedContentItem[];
  unresolved: Array<{ name: string; type: string }>;
  total_requested: number;
  total_resolved: number;
}

// Chat Service (API)
const apiChatService = {
  sendMessage: (message: string, conversationId?: string, context?: any, language?: string) =>
    api.post('/chat/message', { message, conversation_id: conversationId, context, language }),
  clearConversation: (conversationId: string) =>
    api.delete(`/chat/conversation/${conversationId}`),
  getConversation: (conversationId: string) =>
    api.get(`/chat/conversation/${conversationId}`),
  transcribeAudio: (audioBlob: Blob, language: string = 'he') => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('language', language);
    return api.post('/chat/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // Resolve content by name for voice commands (show_multiple action)
  resolveContent: (items: Array<{ name: string; type: string }>, language: string = 'he'): Promise<ResolveContentResponse> =>
    api.post('/chat/resolve-content', { items, language }),
  // Search users by name for game invites
  searchUsers: (name: string): Promise<{ users: Array<{ id: string; name: string; avatar?: string }> }> =>
    api.get('/users/search', { params: { name } }),
};

// Demo Chat Service
const demoChatService = {
  sendMessage: async (message: string, _conversationId?: string, _context?: any, _language?: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      response: 'This is a demo response. In production, you would get AI-powered recommendations.',
      conversationId: 'demo-conversation',
    };
  },
  clearConversation: async (_conversationId: string) => {
    return { success: true };
  },
  getConversation: async (_conversationId: string) => {
    return { messages: [] };
  },
  transcribeAudio: async (_audioBlob: Blob, _language: string = 'he') => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { text: 'Demo transcription', language: _language };
  },
  // Demo resolve content for voice widgets
  resolveContent: async (items: Array<{ name: string; type: string }>, _language: string = 'he'): Promise<ResolveContentResponse> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      items: items.map((item, index) => ({
        id: `demo-${item.type}-${index}`,
        name: item.name,
        type: item.type || 'channel',
        thumbnail: 'https://via.placeholder.com/300x200',
        stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        matched_name: item.name,
        confidence: 0.9,
      })),
      unresolved: [],
      total_requested: items.length,
      total_resolved: items.length,
    };
  },
  // Demo search users for game invites
  searchUsers: async (name: string): Promise<{ users: Array<{ id: string; name: string; avatar?: string }> }> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      users: [{ id: 'demo-user-1', name: name }],
    };
  },
};

// Downloads Service (API)
export interface Download {
  id: string;
  content_id: string;
  content_type: string;
  title?: string;
  title_en?: string;
  title_es?: string;
  thumbnail?: string;
  quality: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  file_size?: number;
  downloaded_at: string;
}

export interface DownloadAdd {
  content_id: string;
  content_type: string;
  quality?: string;
}

const apiDownloadsService = {
  getDownloads: (): Promise<Download[]> => api.get('/downloads'),
  startDownload: (contentId: string, contentType: string, quality: string = 'hd') =>
    api.post('/downloads', { content_id: contentId, content_type: contentType, quality }),
  deleteDownload: (downloadId: string) => api.delete(`/downloads/${downloadId}`),
  checkDownload: (contentId: string): Promise<{ is_downloaded: boolean; download_id?: string }> =>
    api.get(`/downloads/check/${contentId}`),
};

// Demo Downloads Service
const demoDownloadsService = {
  getDownloads: async (): Promise<Download[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      {
        id: 'dl-1',
        content_id: 'fauda-s4e1',
        content_type: 'episode',
        title: 'פאודה - עונה 4 פרק 1',
        title_en: 'Fauda - Season 4 Episode 1',
        thumbnail: 'https://picsum.photos/seed/fauda-ep1/400/225',
        quality: 'hd',
        status: 'completed',
        progress: 100,
        file_size: 1288490188,
        downloaded_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'dl-2',
        content_id: 'shtisel-s3e5',
        content_type: 'episode',
        title: 'שטיסל - עונה 3 פרק 5',
        title_en: 'Shtisel - Season 3 Episode 5',
        thumbnail: 'https://picsum.photos/seed/shtisel-ep5/400/225',
        quality: 'hd',
        status: 'completed',
        progress: 100,
        file_size: 1027604480,
        downloaded_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'dl-3',
        content_id: 'waltz',
        content_type: 'movie',
        title: 'ואלס עם באשיר',
        title_en: 'Waltz with Bashir',
        thumbnail: 'https://picsum.photos/seed/waltz/400/225',
        quality: 'fhd',
        status: 'completed',
        progress: 100,
        file_size: 2576980377,
        downloaded_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'dl-4',
        content_id: 'history-42',
        content_type: 'podcast_episode',
        title: 'עושים היסטוריה - פרק 42',
        title_en: 'Making History - Episode 42',
        thumbnail: 'https://picsum.photos/seed/history-42/400/225',
        quality: 'audio',
        status: 'completed',
        progress: 100,
        file_size: 89128960,
        downloaded_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'dl-5',
        content_id: 'tehran-s2e3',
        content_type: 'episode',
        title: 'טהרן - עונה 2 פרק 3',
        title_en: 'Tehran - Season 2 Episode 3',
        thumbnail: 'https://picsum.photos/seed/tehran-ep3/400/225',
        quality: 'hd',
        status: 'downloading',
        progress: 65,
        file_size: 1181116006,
        downloaded_at: new Date().toISOString(),
      },
    ];
  },
  startDownload: async (contentId: string, contentType: string, quality: string = 'hd') => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { message: 'Download started', id: `dl-demo-${Date.now()}`, status: 'pending' };
  },
  deleteDownload: async (_downloadId: string) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { message: 'Download deleted' };
  },
  checkDownload: async (_contentId: string): Promise<{ is_downloaded: boolean; download_id?: string }> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { is_downloaded: false };
  },
};

// Recording Service (API)
const apiRecordingService = {
  getRecordings: () => api.get('/recordings'),
  getRecording: (recordingId: string) => api.get(`/recordings/${recordingId}`),
  deleteRecording: (recordingId: string) => api.delete(`/recordings/${recordingId}`),
  scheduleRecording: (data: {
    channel_id: string;
    start_time: string;
    end_time: string;
    title?: string;
  }) => api.post('/recordings/schedule', data),
  cancelScheduledRecording: (recordingId: string) =>
    api.delete(`/recordings/${recordingId}/schedule`),
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

// ===========================================
// CONDITIONAL SERVICE EXPORTS
// In demo mode: use mock services only, no API calls
// In production mode: use API services only, fail fast
// ===========================================

export const authService = apiAuthService; // Always use real auth - no demo mode
export const verificationService = apiVerificationService; // Always use real verification - no demo mode
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
export const subtitlePreferencesService = apiSubtitlePreferencesService; // No demo mode - requires auth
export const chaptersService = isDemo ? demoChaptersService : apiChaptersService;
export const partyService = isDemo ? demoPartyService : apiPartyService;
export const chatService = isDemo ? demoChatService : apiChatService;
export const recordingService = isDemo ? demoRecordingService : apiRecordingService;
export const downloadsService = isDemo ? demoDownloadsService : apiDownloadsService;
export const profilesService = apiProfilesService; // No demo mode for profiles - requires real auth
export const childrenService = apiChildrenService; // No demo mode for children
export const judaismService = apiJudaismService; // No demo mode for judaism
export const flowsService = apiFlowsService; // No demo mode for flows

export default api;
