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

// Cloud Run production API URL
const CLOUD_RUN_API_URL = 'https://bayit-plus-backend-534446777606.us-east1.run.app/api/v1';

// Get correct API URL based on platform
const getApiBaseUrl = () => {
  // Production builds always use the production API
  if (!__DEV__) {
    return 'https://api.bayit.tv/api/v1';
  }

  // In development:
  // Web can use localhost for local backend development
  if (Platform.OS === 'web') {
    return 'http://localhost:8000/api/v1';
  }

  // Mobile/TV platforms use Cloud Run API in development
  // since they can't easily reach localhost
  // For Android emulator: could use 'http://10.0.2.2:8000/api/v1' for local backend
  // For iOS/tvOS simulator: localhost works but requires local backend running
  // Using Cloud Run ensures consistent production data for testing
  return CLOUD_RUN_API_URL;
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,  // 15 second timeout for Cloud Run cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Separate API instance for content endpoints that involve web scraping
// These endpoints call backend services that scrape Israeli news sites
// and require longer timeouts to complete
const contentApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,  // 30 second timeout for content scraping endpoints
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

// Content API interceptors (same as main api)
contentApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

contentApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
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
  getChannels: (cultureId?: string, category?: string) =>
    api.get('/live/channels', { params: { culture_id: cultureId, category } }),
  getChannel: (channelId: string) => api.get(`/live/${channelId}`),
  getStreamUrl: (channelId: string) => api.get(`/live/${channelId}/stream`),
};

// Radio Service (API)
const apiRadioService = {
  getStations: (cultureId?: string, genre?: string) =>
    api.get('/radio/stations', { params: { culture_id: cultureId, genre } }),
  getStation: (stationId: string) => api.get(`/radio/${stationId}`),
  getStreamUrl: (stationId: string) => api.get(`/radio/${stationId}/stream`),
};

// Podcast Service (API)
const apiPodcastService = {
  getShows: (cultureId?: string, categoryId?: string) =>
    api.get('/podcasts', { params: { culture_id: cultureId, category: categoryId } }),
  getShow: (showId: string) => api.get(`/podcasts/${showId}`),
  getEpisodes: (showId: string) => api.get(`/podcasts/${showId}/episodes`),
  getCategories: (cultureId?: string) =>
    api.get('/podcasts/categories', { params: { culture_id: cultureId } }),
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

// Home Page Configuration Types
export interface HomeSectionConfigAPI {
  id: string;
  labelKey: string;
  visible: boolean;
  order: number;
  icon: string;
}

export interface HomePagePreferencesAPI {
  sections: HomeSectionConfigAPI[];
}

// Profiles Service (API)
const apiProfilesService = {
  getProfiles: () => api.get('/profiles'),
  getStats: () => api.get('/profile/stats'),
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
  // Home Page Preferences
  getHomePagePreferences: (): Promise<HomePagePreferencesAPI> =>
    api.get('/profiles/preferences/home_page'),
  updateHomePagePreferences: (prefs: HomePagePreferencesAPI): Promise<{ message: string; preferences: HomePagePreferencesAPI }> =>
    api.put('/profiles/preferences/home_page', prefs),
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

// Jerusalem Content Service (API) - uses contentApi for longer timeout
const apiJerusalemService = {
  getContent: (category?: string, page?: number, limit?: number) =>
    contentApi.get('/jerusalem/content', { params: { category, page, limit } }),
  getFeatured: () => contentApi.get('/jerusalem/featured'),
  getCategories: () => contentApi.get('/jerusalem/categories'),
  getKotelContent: (page?: number, limit?: number) =>
    contentApi.get('/jerusalem/kotel', { params: { page, limit } }),
  getKotelEvents: () => contentApi.get('/jerusalem/kotel/events'),
  getIDFCeremonies: (page?: number, limit?: number) =>
    contentApi.get('/jerusalem/idf-ceremonies', { params: { page, limit } }),
  getDiasporaConnection: (page?: number, limit?: number) =>
    contentApi.get('/jerusalem/diaspora', { params: { page, limit } }),
  getSources: () => contentApi.get('/jerusalem/sources'),
};

// Demo Jerusalem Content Service
const demoJerusalemService = {
  getContent: async (category?: string, _page?: number, _limit?: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const items = [
      {
        id: 'jrslm-1',
        source_name: 'ynet',
        title: 'טקס השבעה מרגש בכותל המערבי',
        title_he: 'טקס השבעה מרגש בכותל המערבי',
        title_en: 'Moving Swearing-In Ceremony at the Western Wall',
        url: 'https://www.ynet.co.il/example',
        published_at: new Date().toISOString(),
        summary: 'מאות חיילים הושבעו הלילה בטקס מרגש ברחבת הכותל המערבי',
        category: 'idf-ceremony',
        category_label: { he: 'טקסי צה"ל', en: 'IDF Ceremonies' },
        tags: ['כותל', 'צהל', 'השבעה'],
        relevance_score: 8.5,
      },
      {
        id: 'jrslm-2',
        source_name: 'walla',
        title: 'אלפי מבקרים בכותל לקראת החגים',
        title_he: 'אלפי מבקרים בכותל לקראת החגים',
        title_en: 'Thousands of Visitors at the Western Wall Before the Holidays',
        url: 'https://news.walla.co.il/example',
        published_at: new Date().toISOString(),
        summary: 'הכותל המערבי מלא במבקרים מכל העולם לקראת תקופת החגים',
        category: 'kotel',
        category_label: { he: 'הכותל המערבי', en: 'Western Wall' },
        tags: ['כותל', 'חגים', 'ירושלים'],
        relevance_score: 7.2,
      },
      {
        id: 'jrslm-3',
        source_name: 'mako',
        title: 'משלחת תגלית מגיעה לישראל',
        title_he: 'משלחת תגלית מגיעה לישראל',
        title_en: 'Birthright Delegation Arrives in Israel',
        url: 'https://www.mako.co.il/example',
        published_at: new Date().toISOString(),
        summary: 'צעירים יהודים מארה"ב הגיעו לביקור ראשון בארץ הקודש',
        category: 'diaspora-connection',
        category_label: { he: 'קשר לתפוצות', en: 'Diaspora Connection' },
        tags: ['תגלית', 'תפוצות', 'עלייה'],
        relevance_score: 6.8,
      },
    ];

    const filtered = category ? items.filter(item => item.category === category) : items;
    return {
      items: filtered,
      pagination: { page: 1, limit: 20, total: filtered.length, pages: 1 },
      sources_count: 3,
      last_updated: new Date().toISOString(),
      category,
    };
  },
  getFeatured: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const content = await demoJerusalemService.getContent();
    return {
      featured: content.items.slice(0, 6),
      kotel_live: {
        name: 'Western Wall Live',
        name_he: 'שידור חי מהכותל',
        url: 'https://www.kotel.org/en/kotel-live',
        icon: '🕎',
      },
      upcoming_ceremonies: [],
      last_updated: new Date().toISOString(),
    };
  },
  getCategories: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return [
      { id: 'kotel', name: 'Western Wall', name_he: 'הכותל המערבי', icon: '🕎' },
      { id: 'idf-ceremony', name: 'IDF Ceremonies', name_he: 'טקסי צה"ל', icon: '🎖️' },
      { id: 'diaspora-connection', name: 'Diaspora Connection', name_he: 'קשר לתפוצות', icon: '🌍' },
      { id: 'holy-sites', name: 'Holy Sites', name_he: 'מקומות קדושים', icon: '✡️' },
      { id: 'jerusalem-events', name: 'Jerusalem Events', name_he: 'אירועים בירושלים', icon: '🇮🇱' },
    ];
  },
  getKotelContent: async (page?: number, limit?: number) =>
    demoJerusalemService.getContent('kotel', page, limit),
  getKotelEvents: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      events: [],
      kotel_live: {
        name: 'Western Wall Live',
        name_he: 'שידור חי מהכותל',
        url: 'https://www.kotel.org/en/kotel-live',
        icon: '🕎',
      },
    };
  },
  getIDFCeremonies: async (page?: number, limit?: number) =>
    demoJerusalemService.getContent('idf-ceremony', page, limit),
  getDiasporaConnection: async (page?: number, limit?: number) =>
    demoJerusalemService.getContent('diaspora-connection', page, limit),
  getSources: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      sources: [
        { id: '1', name: 'Ynet Jerusalem', name_he: 'ynet ירושלים', website_url: 'https://www.ynet.co.il', is_active: true },
        { id: '2', name: 'Walla Jerusalem', name_he: 'וואלה ירושלים', website_url: 'https://news.walla.co.il', is_active: true },
        { id: '3', name: 'Mako Jerusalem', name_he: 'mako ירושלים', website_url: 'https://www.mako.co.il', is_active: true },
      ],
      total: 3,
    };
  },
};

// Tel Aviv Content Service (API) - uses contentApi for longer timeout
const apiTelAvivService = {
  getContent: (category?: string, page?: number, limit?: number) =>
    contentApi.get('/tel-aviv/content', { params: { category, page, limit } }),
  getFeatured: () => contentApi.get('/tel-aviv/featured'),
  getCategories: () => contentApi.get('/tel-aviv/categories'),
  getBeachesContent: (page?: number, limit?: number) =>
    contentApi.get('/tel-aviv/beaches', { params: { page, limit } }),
  getNightlifeContent: (page?: number, limit?: number) =>
    contentApi.get('/tel-aviv/nightlife', { params: { page, limit } }),
  getCultureContent: (page?: number, limit?: number) =>
    contentApi.get('/tel-aviv/culture', { params: { page, limit } }),
  getMusicContent: (page?: number, limit?: number) =>
    contentApi.get('/tel-aviv/music', { params: { page, limit } }),
  getSources: () => contentApi.get('/tel-aviv/sources'),
};

// Demo Tel Aviv Content Service
const demoTelAvivService = {
  getContent: async (category?: string, _page?: number, _limit?: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const items = [
      {
        id: 'tlv-1',
        source_name: 'ynet',
        title: 'פסטיבל חוף תל אביב - אלפי משתתפים',
        title_he: 'פסטיבל חוף תל אביב - אלפי משתתפים',
        title_en: 'Tel Aviv Beach Festival - Thousands of Participants',
        url: 'https://www.ynet.co.il/example',
        published_at: new Date().toISOString(),
        summary: 'אלפי אנשים השתתפו בפסטיבל המוזיקה השנתי על חוף גורדון',
        category: 'beaches',
        category_label: { he: 'חופים', en: 'Beaches' },
        tags: ['חוף', 'פסטיבל', 'תל אביב'],
        relevance_score: 8.5,
      },
      {
        id: 'tlv-2',
        source_name: 'walla',
        title: 'פתיחת מסעדה חדשה בשרונה מרקט',
        title_he: 'פתיחת מסעדה חדשה בשרונה מרקט',
        title_en: 'New Restaurant Opens at Sarona Market',
        url: 'https://news.walla.co.il/example',
        published_at: new Date().toISOString(),
        summary: 'שף ידוע פותח מסעדה ים תיכונית חדשה בלב שרונה',
        category: 'food',
        category_label: { he: 'אוכל ומסעדות', en: 'Food & Dining' },
        tags: ['מסעדה', 'שרונה', 'אוכל'],
        relevance_score: 7.2,
      },
      {
        id: 'tlv-3',
        source_name: 'mako',
        title: 'מופע חדש בברבי קלאב',
        title_he: 'מופע חדש בברבי קלאב',
        title_en: 'New Show at Barby Club',
        url: 'https://www.mako.co.il/example',
        published_at: new Date().toISOString(),
        summary: 'להקה מקומית חוגגת אלבום חדש במופע מיוחד',
        category: 'music',
        category_label: { he: 'מוזיקה', en: 'Music Scene' },
        tags: ['מוזיקה', 'הופעה', 'ברבי'],
        relevance_score: 6.8,
      },
      {
        id: 'tlv-4',
        source_name: 'geektime',
        title: 'סטארטאפ תל אביבי גייס 50 מיליון דולר',
        title_he: 'סטארטאפ תל אביבי גייס 50 מיליון דולר',
        title_en: 'Tel Aviv Startup Raises $50 Million',
        url: 'https://www.geektime.co.il/example',
        published_at: new Date().toISOString(),
        summary: 'חברת AI מתל אביב סגרה סבב גיוס משמעותי',
        category: 'tech',
        category_label: { he: 'סטארטאפים והייטק', en: 'Tech & Startups' },
        tags: ['סטארטאפ', 'הייטק', 'גיוס'],
        relevance_score: 7.5,
      },
    ];

    const filtered = category ? items.filter(item => item.category === category) : items;
    return {
      items: filtered,
      pagination: { page: 1, limit: 20, total: filtered.length, pages: 1 },
      sources_count: 4,
      last_updated: new Date().toISOString(),
      category,
    };
  },
  getFeatured: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const content = await demoTelAvivService.getContent();
    return {
      featured: content.items.slice(0, 6),
      beach_webcam: {
        name: 'Tel Aviv Beach Live',
        name_he: 'חוף תל אביב בשידור חי',
        url: 'https://www.skylinewebcams.com/en/webcam/israel/tel-aviv-district/tel-aviv/tel-aviv-beach.html',
        icon: '🏖️',
      },
      upcoming_events: [],
      last_updated: new Date().toISOString(),
    };
  },
  getCategories: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return [
      { id: 'beaches', name: 'Beaches', name_he: 'חופים', icon: '🏖️' },
      { id: 'nightlife', name: 'Nightlife', name_he: 'חיי לילה', icon: '🌃' },
      { id: 'culture', name: 'Culture & Art', name_he: 'תרבות ואמנות', icon: '🎭' },
      { id: 'music', name: 'Music Scene', name_he: 'מוזיקה', icon: '🎵' },
      { id: 'food', name: 'Food & Dining', name_he: 'אוכל ומסעדות', icon: '🍽️' },
      { id: 'tech', name: 'Tech & Startups', name_he: 'סטארטאפים והייטק', icon: '💻' },
      { id: 'events', name: 'Events', name_he: 'אירועים', icon: '🎉' },
    ];
  },
  getBeachesContent: async (page?: number, limit?: number) =>
    demoTelAvivService.getContent('beaches', page, limit),
  getNightlifeContent: async (page?: number, limit?: number) =>
    demoTelAvivService.getContent('nightlife', page, limit),
  getCultureContent: async (page?: number, limit?: number) =>
    demoTelAvivService.getContent('culture', page, limit),
  getMusicContent: async (page?: number, limit?: number) =>
    demoTelAvivService.getContent('music', page, limit),
  getSources: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      sources: [
        { id: '1', name: 'Ynet Tel Aviv', name_he: 'ynet תל אביב', website_url: 'https://www.ynet.co.il', is_active: true },
        { id: '2', name: 'Walla Tel Aviv', name_he: 'וואלה תל אביב', website_url: 'https://news.walla.co.il', is_active: true },
        { id: '3', name: 'Time Out Tel Aviv', name_he: 'טיים אאוט תל אביב', website_url: 'https://www.timeout.co.il', is_active: true },
        { id: '4', name: 'Geektime', name_he: 'גיקטיים', website_url: 'https://www.geektime.co.il', is_active: true },
      ],
      total: 4,
    };
  },
};

// Culture Service (API) - Generic multi-culture content
const apiCultureService = {
  // Culture list
  getCultures: () => contentApi.get('/cultures'),
  getCulture: (cultureId: string) => contentApi.get(`/cultures/${cultureId}`),
  getDefaultCulture: () => contentApi.get('/cultures/default'),

  // Cities
  getCultureCities: (cultureId: string, featuredOnly: boolean = true) =>
    contentApi.get(`/cultures/${cultureId}/cities`, { params: { featured_only: featuredOnly } }),
  getCity: (cultureId: string, cityId: string) =>
    contentApi.get(`/cultures/${cultureId}/cities/${cityId}`),

  // Content
  getCityContent: (cultureId: string, cityId: string, category?: string, page?: number, limit?: number) =>
    contentApi.get(`/cultures/${cultureId}/cities/${cityId}/content`, { params: { category, page, limit } }),
  getTrending: (cultureId: string, limit?: number) =>
    contentApi.get(`/cultures/${cultureId}/trending`, { params: { limit } }),
  getFeatured: (cultureId: string) =>
    contentApi.get(`/cultures/${cultureId}/featured`),

  // Metadata
  getCategories: (cultureId: string, cityId?: string) =>
    contentApi.get(`/cultures/${cultureId}/categories`, { params: { city_id: cityId } }),
  getSources: (cultureId: string, cityId?: string) =>
    contentApi.get(`/cultures/${cultureId}/sources`, { params: { city_id: cityId } }),

  // Time
  getCultureTime: (cultureId: string) =>
    contentApi.get(`/cultures/${cultureId}/time`),
};

// Demo Culture Service
const demoCultureService = {
  getCultures: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return [
      {
        id: '1',
        culture_id: 'israeli',
        name: 'Israeli',
        name_localized: { he: 'ישראלי', en: 'Israeli', es: 'Israelí' },
        flag_emoji: '🇮🇱',
        country_code: 'IL',
        primary_timezone: 'Asia/Jerusalem',
        primary_language: 'he',
        has_shabbat_mode: true,
        has_lunar_calendar: false,
        display_order: 0,
        is_active: true,
        is_default: true,
      },
      {
        id: '2',
        culture_id: 'chinese',
        name: 'Chinese',
        name_localized: { zh: '中国', he: 'סיני', en: 'Chinese', es: 'Chino' },
        flag_emoji: '🇨🇳',
        country_code: 'CN',
        primary_timezone: 'Asia/Shanghai',
        primary_language: 'zh',
        has_shabbat_mode: false,
        has_lunar_calendar: true,
        display_order: 1,
        is_active: true,
        is_default: false,
      },
    ];
  },
  getCulture: async (cultureId: string) => {
    const cultures = await demoCultureService.getCultures();
    return cultures.find(c => c.culture_id === cultureId) || cultures[0];
  },
  getDefaultCulture: async () => {
    const cultures = await demoCultureService.getCultures();
    return cultures.find(c => c.is_default) || cultures[0];
  },
  getCultureCities: async (cultureId: string, _featuredOnly: boolean = true) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    if (cultureId === 'israeli') {
      return [
        {
          id: '1',
          city_id: 'jerusalem',
          culture_id: 'israeli',
          name: 'Jerusalem',
          name_localized: { he: 'ירושלים', en: 'Jerusalem' },
          name_native: 'ירושלים',
          timezone: 'Asia/Jerusalem',
          display_order: 0,
          is_featured: true,
          accent_color: '#C5A03A',
        },
        {
          id: '2',
          city_id: 'tel-aviv',
          culture_id: 'israeli',
          name: 'Tel Aviv',
          name_localized: { he: 'תל אביב', en: 'Tel Aviv' },
          name_native: 'תל אביב',
          timezone: 'Asia/Jerusalem',
          display_order: 1,
          is_featured: true,
          accent_color: '#F97316',
        },
      ];
    }
    return [
      {
        id: '3',
        city_id: 'beijing',
        culture_id: 'chinese',
        name: 'Beijing',
        name_localized: { zh: '北京', en: 'Beijing' },
        name_native: '北京',
        timezone: 'Asia/Shanghai',
        display_order: 0,
        is_featured: true,
        accent_color: '#FFD700',
      },
      {
        id: '4',
        city_id: 'shanghai',
        culture_id: 'chinese',
        name: 'Shanghai',
        name_localized: { zh: '上海', en: 'Shanghai' },
        name_native: '上海',
        timezone: 'Asia/Shanghai',
        display_order: 1,
        is_featured: true,
        accent_color: '#00BFFF',
      },
    ];
  },
  getCity: async (cultureId: string, cityId: string) => {
    const cities = await demoCultureService.getCultureCities(cultureId);
    return cities.find(c => c.city_id === cityId) || cities[0];
  },
  getCityContent: async (cultureId: string, cityId: string, _category?: string, _page?: number, _limit?: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Return content from existing services based on culture/city
    if (cultureId === 'israeli' && cityId === 'jerusalem') {
      return demoJerusalemService.getContent(_category, _page, _limit);
    }
    if (cultureId === 'israeli' && cityId === 'tel-aviv') {
      return demoTelAvivService.getContent(_category, _page, _limit);
    }
    return { items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 }, sources_count: 0, last_updated: new Date().toISOString() };
  },
  getTrending: async (cultureId: string, _limit?: number) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const content = cultureId === 'israeli'
      ? await demoJerusalemService.getContent()
      : { items: [] };
    return content.items.slice(0, _limit || 10);
  },
  getFeatured: async (cultureId: string) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const content = cultureId === 'israeli'
      ? await demoJerusalemService.getContent()
      : { items: [] };
    return {
      featured: content.items.slice(0, 6),
      trending: content.items.slice(0, 10),
      last_updated: new Date().toISOString(),
      culture_id: cultureId,
    };
  },
  getCategories: async (cultureId: string, _cityId?: string) => {
    if (cultureId === 'israeli') {
      return demoJerusalemService.getCategories();
    }
    return [
      { id: 'general', name: 'General', name_localized: { en: 'General', zh: '综合' } },
    ];
  },
  getSources: async (cultureId: string, _cityId?: string) => {
    if (cultureId === 'israeli') {
      return demoJerusalemService.getSources();
    }
    return { sources: [], total: 0 };
  },
  getCultureTime: async (cultureId: string) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const now = new Date();
    const timezone = cultureId === 'israeli' ? 'Asia/Jerusalem' : 'Asia/Shanghai';
    return {
      culture_id: cultureId,
      timezone,
      current_time: now.toISOString(),
      display_time: now.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }),
      display_date: now.toLocaleDateString('en-US', { timeZone: timezone, month: 'long', day: 'numeric', year: 'numeric' }),
      day_of_week: now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long' }),
      is_weekend: cultureId === 'israeli' ? [5, 6].includes(now.getDay()) : [0, 6].includes(now.getDay()),
    };
  },
};

// Judaism Service (API)
const apiJudaismService = {
  // Content
  getContent: (category?: string, page?: number, limit?: number) =>
    api.get('/judaism/content', { params: { category, page, limit } }),
  getCategories: () => api.get('/judaism/categories'),
  getFeatured: () => api.get('/judaism/featured'),
  getLiveShiurim: () => api.get('/judaism/live'),
  getDailyShiur: () => api.get('/judaism/daily'),
  getShabbatFeatured: () => api.get('/judaism/shabbat/featured'),
  getShabbatStatus: (city?: string, state?: string) =>
    api.get('/judaism/shabbat/status', { params: { city, state } }),

  // News
  getNews: (category?: string, source?: string, page?: number, limit?: number) =>
    api.get('/judaism/news', { params: { category, source, page, limit } }),
  getNewsSources: () => api.get('/judaism/news/sources'),

  // Calendar
  getCalendarToday: () => api.get('/judaism/calendar/today'),
  getShabbatTimes: (city?: string, state?: string, geonameId?: number) =>
    api.get('/judaism/calendar/shabbat', { params: { city, state, geoname_id: geonameId } }),
  getDafYomi: () => api.get('/judaism/calendar/daf-yomi'),
  getUpcomingHolidays: (days?: number) =>
    api.get('/judaism/calendar/holidays', { params: { days } }),
  getAvailableCities: () => api.get('/judaism/calendar/cities'),

  // Community
  getRegions: () => api.get('/judaism/community/regions'),
  getSynagogues: (region?: string, denomination?: string, page?: number, limit?: number) =>
    api.get('/judaism/community/synagogues', { params: { region, denomination, page, limit } }),
  getKosherRestaurants: (region?: string, city?: string, state?: string, page?: number, limit?: number) =>
    api.get('/judaism/community/kosher', { params: { region, city, state, page, limit } }),
  getJCCs: (region?: string, page?: number, limit?: number) =>
    api.get('/judaism/community/jcc', { params: { region, page, limit } }),
  getMikvaot: (region?: string, page?: number, limit?: number) =>
    api.get('/judaism/community/mikvaot', { params: { region, page, limit } }),
  getCommunityEvents: (region?: string, days?: number) =>
    api.get('/judaism/community/events', { params: { region, days } }),

  // Torah Shiurim
  getShiurim: (category?: string, rabbi?: string, page?: number, limit?: number) =>
    api.get('/judaism/shiurim', { params: { category, rabbi, page, limit } }),
  getLiveTorahClasses: () => api.get('/judaism/shiurim/live'),
  getDailyShiurRecommendation: () => api.get('/judaism/shiurim/daily'),

  // Admin
  seedContent: () => api.post('/judaism/admin/content/seed'),
  clearContent: () => api.delete('/judaism/admin/content/clear'),
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
export const jerusalemService = isDemo ? demoJerusalemService : apiJerusalemService;
export const telAvivService = isDemo ? demoTelAvivService : apiTelAvivService;
export const cultureService = isDemo ? demoCultureService : apiCultureService;

export default api;
