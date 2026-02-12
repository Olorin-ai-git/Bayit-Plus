import axios from 'axios'
import i18n from 'i18next'
import { config } from '../config/appConfig'
import { useAuthStore } from '@bayit/shared-stores/authStore'
import logger, {
  getCorrelationId,
  generateCorrelationId,
  setCorrelationId,
} from '@bayit/shared-utils/logger'
import { storageHelpers, STORAGE_KEYS } from '../utils/storage'

// Correlation ID header name (matches backend)
const CORRELATION_ID_HEADER = 'X-Correlation-ID'

// Use environment variable set by webpack at build time
// In production, this will be the Cloud Run URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

// Create scoped logger for API
const apiLogger = logger.scope('API')

apiLogger.debug('Base URL configured', { baseUrl: API_BASE_URL })

// Retry configuration (from environment variables)
const MAX_RETRIES = parseInt(import.meta.env.VITE_API_RETRY_COUNT || '3', 10)
const RETRY_DELAY_MS = parseInt(import.meta.env.VITE_API_RETRY_DELAY || '1000', 10)
const TIMEOUT_MS = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10)

// Network errors that should trigger retry
const RETRYABLE_ERROR_CODES = ['ECONNABORTED', 'ENOTFOUND', 'ENETUNREACH', 'ETIMEDOUT']
const RETRYABLE_STATUS_CODES = (import.meta.env.VITE_API_RETRY_STATUS_CODES || '408,429,500,502,503,504')
  .split(',')
  .map(Number)

/**
 * Check if error is retryable
 */
const isRetryableError = (error) => {
  // Network errors
  if (error.code && RETRYABLE_ERROR_CODES.includes(error.code)) {
    return true
  }

  // HTTP status codes
  if (error.response && RETRYABLE_STATUS_CODES.includes(error.response.status)) {
    return true
  }

  return false
}

/**
 * Calculate retry delay with exponential backoff
 */
const getRetryDelay = (retryCount) => {
  return RETRY_DELAY_MS * Math.pow(2, retryCount)
}

/**
 * Wait for specified milliseconds
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token and correlation ID
api.interceptors.request.use((config) => {
  // Add auth token - consistent with admin API and shared API client
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else {
    // DEBUG: Log when token is missing for session endpoints
    if (config.url?.includes('playback/session')) {
      apiLogger.warn('No auth token found for playback session request', {
        url: config.url,
        tokenExists: !!token,
      })
    }
  }

  // Add Accept-Language header based on app's i18n language (not browser default)
  config.headers['Accept-Language'] = i18n.language || 'he'

  // Prevent browser from caching GET responses (stale search results, etc.)
  if (config.method === 'get') {
    config.headers['Cache-Control'] = 'no-cache'
  }

  // Add correlation ID - use existing or generate new one
  let correlationId = getCorrelationId()
  if (!correlationId) {
    correlationId = generateCorrelationId()
    setCorrelationId(correlationId)
  }
  config.headers[CORRELATION_ID_HEADER] = correlationId

  // Add user location headers if available (for location-based content)
  // NOTE: Using localStorage directly here (web-only) since request interceptors are synchronous
  // For async storage needs (cross-platform), use storageHelpers from utils/storage.ts
  try {
    const cachedLocation = localStorage.getItem(STORAGE_KEYS.USER_LOCATION)
    if (cachedLocation) {
      const location = JSON.parse(cachedLocation)
      if (location.city) {
        config.headers['X-User-City'] = location.city
      }
      if (location.state) {
        config.headers['X-User-State'] = location.state
      }
    }
  } catch (err) {
    // Silently ignore location header errors
  }

  apiLogger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`, {
    correlationId,
    hasAuthHeader: !!config.headers.Authorization,
    hasLocationHeader: !!config.headers['X-User-City'],
  })

  return config
})

// Response interceptor for error handling and retry logic
api.interceptors.response.use(
  (response) => {
    // Log successful response with timing
    const correlationId = response.headers[CORRELATION_ID_HEADER.toLowerCase()]
    const durationMs = response.headers['x-request-duration-ms']

    // Check for rate limit headers
    const rateLimitRemaining = response.headers['x-ratelimit-remaining']
    const rateLimitReset = response.headers['x-ratelimit-reset']

    if (rateLimitRemaining && parseInt(rateLimitRemaining, 10) < 10) {
      apiLogger.warn('API rate limit approaching', {
        remaining: rateLimitRemaining,
        reset: rateLimitReset,
      })
    }

    apiLogger.debug(`Response: ${response.status} ${response.config.url}`, {
      status: response.status,
      correlationId,
      durationMs: durationMs ? parseInt(durationMs, 10) : undefined,
    })

    return response.data
  },
  async (error) => {
    const config = error.config

    // Initialize retry count if not exists
    if (!config.__retryCount) {
      config.__retryCount = 0
    }

    // Log error
    const correlationId = getCorrelationId()
    apiLogger.error(`Request failed: ${config?.url}`, {
      correlationId,
      status: error.response?.status,
      error: error.response?.data || error.message,
      retryCount: config.__retryCount,
    })

    // Check if error is retryable and we haven't exceeded max retries
    if (isRetryableError(error) && config.__retryCount < MAX_RETRIES) {
      config.__retryCount++

      // Handle 429 (rate limit) specially
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after']
        const retryDelay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : getRetryDelay(config.__retryCount)

        apiLogger.warn(`Rate limited - retry after ${retryDelay}ms`, {
          correlationId,
          retryCount: config.__retryCount,
          retryAfter,
        })

        await delay(retryDelay)
      } else {
        const retryDelay = getRetryDelay(config.__retryCount)
        apiLogger.info(`Retrying request (${config.__retryCount}/${MAX_RETRIES})`, {
          correlationId,
          url: config.url,
          delay: retryDelay,
        })

        await delay(retryDelay)
      }

      // Retry the request
      return api(config)
    }

    // Only logout on authentication failures, not all 401 errors
    if (error.response?.status === 401) {
      const errorDetail = error.response?.data?.detail || ''
      const requestUrl = config?.url || ''

      // Only logout if it's from critical auth endpoints
      const isCriticalAuthEndpoint = ['/auth/me', '/auth/login', '/auth/refresh'].some(path =>
        requestUrl.includes(path)
      )

      // Or if it's a token validation error (not just "not authenticated")
      const isTokenError = [
        'Could not validate credentials',
        'Invalid authentication credentials',
        'Token has expired',
        'Invalid token',
        'Signature has expired'
      ].some(msg => errorDetail.toLowerCase().includes(msg.toLowerCase()))

      if (isCriticalAuthEndpoint || isTokenError) {
        // Use auth store logout - consistent with admin API and shared API client
        useAuthStore.getState().logout()

        // Redirect to login page with return URL
        const currentPath = window.location.pathname
        if (!currentPath.includes('/login')) {
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
        }
      }
    }

    return Promise.reject(error.response?.data || error)
  }
)

// Auth Service (API)
const apiAuthService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (updates) => api.patch('/auth/profile', updates),
  requestPasswordReset: (email) => api.post('/auth/password-reset/request', { email }),
  confirmPasswordReset: (token, newPassword) =>
    api.post('/auth/password-reset/confirm', { token, new_password: newPassword }),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  getGoogleAuthUrl: async (redirectUri) => {
    const response = await api.get('/auth/google/url', { params: { redirect_uri: redirectUri } });
    // Store state in sessionStorage for CSRF validation
    if (response.state) {
      sessionStorage.setItem('oauth_state', response.state);
    }
    return response;
  },
  googleCallback: async (code, redirectUri, state) => {
    // Retrieve state from sessionStorage if not provided
    let finalState = state;
    if (!finalState) {
      finalState = sessionStorage.getItem('oauth_state') || undefined;
      // Clean up after use
      if (finalState) {
        sessionStorage.removeItem('oauth_state');
      }
    }
    apiLogger.info('googleCallback request', {
      redirectUri,
      hasState: !!finalState,
      statePreview: finalState?.substring(0, 10)
    });
    const response = await api.post('/auth/google/callback', { code, redirect_uri: redirectUri, state: finalState });
    apiLogger.info('googleCallback response', {
      hasUser: !!response?.user,
      hasToken: !!response?.access_token
    });
    return response;
  },
}

// Content Service (API)
const apiContentService = {
  getFeatured: () => api.get('/content/featured'),
  getAll: (params) => api.get('/content/all', { params }),
  getCategories: () => api.get('/content/categories'),
  getByCategory: (categoryId, params) => api.get(`/content/category/${categoryId}`, { params }),
  getById: (contentId) => api.get(`/content/${contentId}`),
  getStreamUrl: (contentId) => api.get(`/content/${contentId}/stream`),
  search: (params) => api.get('/search/unified', { params }),
  searchLLM: (data) => api.post('/search/llm', data),
  syncContent: () => api.post('/podcasts/refresh'),

  // Series endpoints
  getAllSeries: (params) => api.get('/content/series', { params }),
  getSeriesDetails: (seriesId) => api.get(`/content/series/${seriesId}`),
  getSeriesSeasons: (seriesId) => api.get(`/content/series/${seriesId}/seasons`),
  getSeasonEpisodes: (seriesId, seasonNum) => api.get(`/content/series/${seriesId}/season/${seasonNum}/episodes`),

  // Movie endpoints
  getAllMovies: (params) => api.get('/content/movies', { params }),
  getMovieDetails: (movieId) => api.get(`/content/movie/${movieId}`),

  // Preview endpoint
  getContentPreview: (contentId) => api.get(`/content/${contentId}/preview`),

  // Location-based content endpoints
  getIsraelisInCity: (city, state, params = {}) =>
    api.get('/content/israelis-in-city', { params: { city, state, ...params } }),
  getIsraeliBusinessesInCity: (city, state, params = {}) =>
    api.get('/content/israeli-businesses-in-city', { params: { city, state, ...params } }),
}

// Live TV Service (API)
const apiLiveService = {
  getChannels: () => api.get('/live/channels'),
  getChannel: (channelId) => api.get(`/live/${channelId}`),
  getEPG: (channelId, date) => api.get(`/live/${channelId}/epg`, { params: { date } }),
  getStreamUrl: (channelId) => api.get(`/live/${channelId}/stream`),
}

// Radio Service (API)
const apiRadioService = {
  getStations: () => api.get('/radio/stations'),
  getStation: (stationId) => api.get(`/radio/${stationId}`),
  getStreamUrl: (stationId) => api.get(`/radio/${stationId}/stream`),
}

// Podcast Service (API)
const apiPodcastService = {
  getShows: (params) => {
    // Handle both old API (categoryId string) and new API (params object)
    if (typeof params === 'string') {
      return api.get('/podcasts', { params: { category: params } });
    }
    return api.get('/podcasts', { params });
  },
  getShow: (showId) => api.get(`/podcasts/${showId}`),
  getEpisodes: (showId, params) => api.get(`/podcasts/${showId}/episodes`, { params }),
  getEpisode: (showId, episodeId) => api.get(`/podcasts/${showId}/episodes/${episodeId}`),
  getCategories: () => api.get('/podcasts/categories'),
  getFeatured: () => api.get('/podcasts', { params: { is_featured: true, page_size: 20 } }),
  syncPodcasts: () => api.post('/podcasts/sync'),
  resolveUrl: (url, provider) => api.post('/podcasts/resolve-url', { url, provider }),
  addFromUrl: (rssUrl, overrides = {}) => api.post('/podcasts/add-from-url', { rss_url: rssUrl, ...overrides }),
}

// Audiobook Service (API)
const apiAudiobookService = {
  getAudiobooks: (params) => api.get('/audiobooks', { params }),
  getAudiobook: (audiobookId) => api.get(`/audiobooks/${audiobookId}`),
  getAudiobookWithChapters: (audiobookId) => api.get(`/audiobooks/${audiobookId}/chapters`),
  getFeatured: () => api.get('/audiobooks', { params: { is_featured: true, page_size: 20 } }),
  getStream: (audiobookId) => api.post(`/audiobooks/${audiobookId}/stream`),
}

// Subscription Service (API)
const apiSubscriptionService = {
  getPlans: () => api.get('/subscriptions/plans'),
  getCurrentPlan: () => api.get('/subscriptions/current'),
  createCheckout: (planId) => api.post('/subscriptions/checkout', { plan_id: planId }),
  cancelSubscription: () => api.post('/subscriptions/cancel'),
  getInvoices: () => api.get('/subscriptions/invoices'),
}

// Playlist Service (API)
const apiPlaylistService = {
  getPlaylist: () => api.get('/playlist'),
  addItem: (contentId, contentType) =>
    api.post('/playlist/items', { content_id: contentId, content_type: contentType }),
  removeItem: (contentId) => api.delete(`/playlist/items/${contentId}`),
  clearPlaylist: () => api.delete('/playlist'),
  reorderItem: (contentId, newPosition) =>
    api.put('/playlist/items/reorder', { content_id: contentId, new_position: newPosition }),
  toggleItem: (contentId, contentType = 'vod') =>
    api.post(`/playlist/toggle/${contentId}`, { content_type: contentType }),
  checkItem: (contentId) => api.get(`/playlist/check/${contentId}`),
}

// Watch History Service (API)
const apiHistoryService = {
  getHistory: (params) => api.get('/history', { params }),
  updateProgress: (contentId, contentType, position, duration) =>
    api.post('/history/progress', { content_id: contentId, content_type: contentType, position, duration }),
  restartVideo: (contentId) => api.patch(`/history/${contentId}/restart`),
  getContinueWatching: () => api.get('/history/continue'),
}

// Chat Service (API)
const apiChatService = {
  sendMessage: (message, conversationId, context = null, language = null) =>
    api.post('/chat/', { message, conversation_id: conversationId, context, language }),
  getConversation: (conversationId) => api.get(`/chat/${conversationId}`),
  clearConversation: (conversationId) => api.delete(`/chat/${conversationId}`),
  // Transcribe audio blob to text with language hint for better accuracy
  // language: ISO 639-1 code ('he' for Hebrew, 'en' for English, etc.)
  // Defaults to 'he' (Hebrew) but should be overridden by the caller with current UI language
  transcribeAudio: (audioBlob, language = 'he') => {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    formData.append('language', language)
    return api.post('/chat/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  // Resolve multiple content items by name for voice commands
  // Used by show_multiple action to get stream URLs for widgets
  resolveContent: async (items, language = 'he') => {
    const response = await api.post('/chat/resolve-content', { items, language })
    return response.data
  },
  // Search for users by name for game invites
  searchUsers: async (name) => {
    const response = await api.get('/users/search', { params: { name } })
    return response.data
  },
}

// Zman Yisrael Service (API)
const apiZmanService = {
  getTime: (timezone) => api.get('/zman/time', { params: { timezone } }),
  getShabbatTimes: (latitude, longitude) =>
    api.get('/zman/shabbat', { params: { latitude, longitude } }),
  getShabbatContent: () => api.get('/zman/shabbat-content'),
  updatePreferences: (prefs) => api.post('/zman/preferences', prefs),
  getTimezones: () => api.get('/zman/timezones'),
}

// Trending Service (API)
// Trending endpoints use longer timeout because they call Claude AI for analysis
const apiTrendingService = {
  getTopics: () => api.get('/trending/topics', { timeout: 20000 }),
  getHeadlines: (source, limit = 20) =>
    api.get('/trending/headlines', { params: { source, limit }, timeout: 20000 }),
  getRecommendations: (limit = 10) =>
    api.get('/trending/recommendations', { params: { limit }, timeout: 20000 }),
  getSummary: () => api.get('/trending/summary', { timeout: 20000 }),
  getByCategory: (category) => api.get(`/trending/category/${category}`, { timeout: 20000 }),
}

// Chapters Service (API)
const apiChaptersService = {
  getChapters: (contentId) => api.get(`/chapters/${contentId}`),
  generateChapters: (contentId, force = false, transcript = null) =>
    api.post(`/chapters/${contentId}/generate`, { transcript }, { params: { force } }),
  getLiveChapters: (channelId) => api.get(`/chapters/live/${channelId}`),
  getCategories: () => api.get('/chapters/categories/list'),
}

// Scene Search Service (API)
const apiSceneSearchService = {
  search: (query, contentId, seriesId, language = 'he', limit = 20, minScore = 0.5) =>
    api.post('/search/scene', {
      query,
      content_id: contentId,
      series_id: seriesId,
      language,
      limit,
      min_score: minScore,
    }),
}

// Subtitles Service (API)
const apiSubtitlesService = {
  getLanguages: () => api.get('/subtitles/languages'),
  getTracks: (contentId, language) =>
    api.get(`/subtitles/${contentId}`, { params: { language } }),
  getCues: (contentId, language = 'he', hebrewMode = 'regular', englishMode = 'regular', startTime, endTime) =>
    api.get(`/subtitles/${contentId}/cues`, {
      params: {
        language,
        hebrew_mode: hebrewMode,
        english_mode: englishMode,
        start_time: startTime,
        end_time: endTime
      }
    }),
  generateNikud: (contentId, language = 'he', force = false) =>
    api.post(`/subtitles/${contentId}/nikud`, null, { params: { language, force } }),
  generateShoresh: (contentId, language = 'he', force = false) =>
    api.post(`/subtitles/${contentId}/shoresh`, null, { params: { language, force } }),
  generateHeblish: (contentId, language = 'en', force = false) =>
    api.post(`/subtitles/${contentId}/heblish`, null, { params: { language, force } }),
  generateGrammarFlip: (contentId, language = 'en', force = false) =>
    api.post(`/subtitles/${contentId}/grammar-flip`, null, { params: { language, force } }),
  generateSlangSynthesis: (contentId, language = 'en', force = false) =>
    api.post(`/subtitles/${contentId}/slang-synthesis`, null, { params: { language, force } }),
  // Job status polling
  getJobStatus: (jobId) => api.get(`/subtitles/job/${jobId}`),
  getActiveJobs: (contentId) => api.get(`/subtitles/${contentId}/job/active`),
  importSubtitles: (contentId, sourceUrl, language = 'he', languageName = 'עברית', isDefault = false) =>
    api.post(`/subtitles/${contentId}/import`, {
      source_url: sourceUrl, language, language_name: languageName, is_default: isDefault
    }),
  setDefault: (contentId, language) =>
    api.patch(`/subtitles/${contentId}/${language}/set-default`),
  translateWord: (word, sourceLang = 'he', targetLang = 'en') =>
    api.post('/subtitles/translate/word', null, {
      params: { word, source_lang: sourceLang, target_lang: targetLang }
    }),
  translatePhrase: (phrase, sourceLang = 'he', targetLang = 'en') =>
    api.post('/subtitles/translate/phrase', null, {
      params: { phrase, source_lang: sourceLang, target_lang: targetLang }
    }),
  addNikudToText: (text) =>
    api.post('/subtitles/nikud/text', null, { params: { text } }),
  getCacheStats: () => api.get('/subtitles/cache/stats'),
  fetchExternal: (contentId, languages) =>
    api.post(`/subtitles/${contentId}/fetch-external`, null, {
      params: languages ? { languages: languages.join(',') } : undefined
    }),
}

// Subtitle Preferences Service (API)
const apiSubtitlePreferencesService = {
  getPreference: (contentId) =>
    api.get(`/subtitles/preferences/${contentId}`),
  setPreference: (contentId, language, hebrewMode = 'regular', englishMode = 'regular') =>
    api.post(`/subtitles/preferences/${contentId}`, null, { params: { language, hebrew_mode: hebrewMode, english_mode: englishMode } }),
  setHebrewMode: (contentId, mode) =>
    api.patch(`/subtitles/preferences/${contentId}/hebrew-mode`, null, { params: { hebrew_mode: mode } }),
  setEnglishMode: (contentId, mode) =>
    api.patch(`/subtitles/preferences/${contentId}/english-mode`, null, { params: { english_mode: mode } }),
  deletePreference: (contentId) =>
    api.delete(`/subtitles/preferences/${contentId}`),
  getAllPreferences: () =>
    api.get('/subtitles/preferences'),
}

// Morning Ritual Service (API)
const apiRitualService = {
  check: () => api.get('/ritual/check'),
  shouldShow: () => api.get('/ritual/should-show'),
  getContent: () => api.get('/ritual/content'),
  getAIBrief: () => api.get('/ritual/ai-brief'),
  getIsraelNow: () => api.get('/ritual/israel-now'),
  getPreferences: () => api.get('/ritual/preferences'),
  updatePreferences: (prefs) => api.post('/ritual/preferences', prefs),
  skipToday: () => api.post('/ritual/skip-today'),
}

// Profiles Service (API)
const apiProfilesService = {
  getProfiles: () => api.get('/profiles'),
  createProfile: (data) => api.post('/profiles', data),
  getProfile: (profileId) => api.get(`/profiles/${profileId}`),
  updateProfile: (profileId, data) => api.put(`/profiles/${profileId}`, data),
  deleteProfile: (profileId) => api.delete(`/profiles/${profileId}`),
  selectProfile: (profileId, pin) => api.post(`/profiles/${profileId}/select`, { pin }),
  verifyPin: (profileId, pin) => api.post(`/profiles/${profileId}/verify-pin`, { pin }),
  getRecommendations: (profileId) => api.get(`/profiles/${profileId}/recommendations`),
  setKidsPin: (pin) => api.post('/profiles/kids-pin/set', { pin }),
  verifyKidsPin: (pin) => api.post('/profiles/kids-pin/verify', { pin }),
  // AI preferences
  getAIPreferences: () => api.get('/profiles/preferences/ai'),
  updateAIPreferences: (prefs) => api.put('/profiles/preferences/ai', prefs),
  // Voice & accessibility preferences
  getVoicePreferences: () => api.get('/profiles/preferences/voice'),
  updateVoicePreferences: (prefs) => api.put('/profiles/preferences/voice', prefs),
  // Avatar upload
  uploadAvatar: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/profiles/avatar/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// Children Service (API)
const apiChildrenService = {
  getContent: (category, maxAge, limit) =>
    api.get('/children/content', { params: { category, max_age: maxAge, limit } }),
  getCategories: () => api.get('/children/categories'),
  getSubcategories: () => api.get('/children/subcategories'),
  getContentBySubcategory: (slug, maxAge, limit) =>
    api.get(`/children/subcategory/${slug}`, { params: { age_max: maxAge, limit } }),
  getAgeGroups: () => api.get('/children/age-groups'),
  getContentByAgeGroup: (group, limit) =>
    api.get(`/children/age-group/${group}`, { params: { limit } }),
  toggleParentalControls: (enabled) =>
    api.post('/children/parental-controls', { enabled }),
  verifyPin: (pin) => api.post('/children/verify-pin', { pin }),
  setPin: (pin) => api.post('/children/set-pin', { pin }),
  getSettings: () => api.get('/children/settings'),
  updateSettings: (settings) => api.put('/children/settings', settings),
}

// Youngsters Service (API)
const apiYoungstersService = {
  getContent: (category, maxAge, limit) =>
    api.get('/youngsters/content', { params: { category, age_max: maxAge, limit } }),
  getCategories: () => api.get('/youngsters/categories'),
  getSubcategories: () => api.get('/youngsters/subcategories'),
  getContentBySubcategory: (slug, maxAge, limit) =>
    api.get(`/youngsters/subcategory/${slug}`, { params: { age_max: maxAge, limit } }),
  getAgeGroups: () => api.get('/youngsters/age-groups'),
  getContentByAgeGroup: (group, limit) =>
    api.get(`/youngsters/age-group/${group}`, { params: { limit } }),
  getTrending: (ageGroup, limit) =>
    api.get('/youngsters/trending', { params: { age_group: ageGroup, limit } }),
  getNews: (limit, ageGroup) =>
    api.get('/youngsters/news', { params: { limit, age_group: ageGroup } }),
  verifyPin: (pin) => api.post('/family/controls/verify-pin', { pin }),
}

// Judaism Service (API)
const apiJudaismService = {
  // Content endpoints
  getContent: (category, limit) =>
    api.get('/judaism/content', { params: { category, limit } }),
  getCategories: () => api.get('/judaism/categories'),
  getLiveShiurim: () => api.get('/judaism/live'),
  getDailyContent: () => api.get('/judaism/daily-shiur'),
  getFeatured: () => api.get('/judaism/featured'),

  // News endpoints
  getNews: (category, source, page = 1, limit = 20) =>
    api.get('/judaism/news', { params: { category, source, page, limit } }),
  getNewsSources: () => api.get('/judaism/news/sources'),

  // Calendar endpoints
  getCalendarToday: () => api.get('/judaism/calendar/today'),
  getShabbatTimes: (city, state, geonameId) =>
    api.get('/judaism/calendar/shabbat', { params: { city, state, geoname_id: geonameId } }),
  getDafYomi: () => api.get('/judaism/calendar/daf-yomi'),
  getUpcomingHolidays: (days = 30) =>
    api.get('/judaism/calendar/holidays', { params: { days } }),
  getAvailableCities: () => api.get('/judaism/calendar/cities'),

  // Community directory endpoints
  getRegions: () => api.get('/judaism/community/regions'),
  getSynagogues: (region, denomination, page = 1, limit = 20) =>
    api.get('/judaism/community/synagogues', { params: { region, denomination, page, limit } }),
  getKosherRestaurants: (region, city, state, certification, page = 1, limit = 20) =>
    api.get('/judaism/community/kosher', { params: { region, city, state, certification, page, limit } }),
  getJCCs: (region, page = 1, limit = 20) =>
    api.get('/judaism/community/jcc', { params: { region, page, limit } }),
  getMikvaot: (region, page = 1, limit = 20) =>
    api.get('/judaism/community/mikvaot', { params: { region, page, limit } }),
  getCommunityEvents: (region, eventType, days = 14, page = 1, limit = 20) =>
    api.get('/judaism/community/events', { params: { region, event_type: eventType, days, page, limit } }),
  getOrganization: (orgId) =>
    api.get(`/judaism/community/organization/${orgId}`),
  searchCommunity: (params) =>
    api.get('/judaism/community/search', { params }),

  // Torah shiurim endpoints
  getShiurim: (category, rabbi, source, page = 1, limit = 20) =>
    api.get('/judaism/shiurim', { params: { category, rabbi, source, page, limit } }),
  getLiveTorah: () => api.get('/judaism/shiurim/live'),
  getDailyShiur: () => api.get('/judaism/shiurim/daily'),

  // Shabbat endpoints
  getShabbatFeatured: () => api.get('/judaism/shabbat/featured'),
  getShabbatStatus: (city = 'New York', state = 'NY') =>
    api.get('/judaism/shabbat/status', { params: { city, state } }),
}

// Favorites Service (API)
const apiFavoritesService = {
  getFavorites: () => api.get('/favorites'),
  addFavorite: (contentId, contentType) =>
    api.post('/favorites', { content_id: contentId, content_type: contentType }),
  removeFavorite: (contentId) => api.delete(`/favorites/${contentId}`),
  isFavorite: (contentId) => api.get(`/favorites/check/${contentId}`),
  toggleFavorite: (contentId, contentType = 'vod') =>
    api.post(`/favorites/toggle/${contentId}?content_type=${contentType}`),
}

// Downloads Service (API)
const apiDownloadsService = {
  getDownloads: () => api.get('/downloads'),
  startDownload: (contentId, contentType, quality = 'hd') =>
    api.post('/downloads', { content_id: contentId, content_type: contentType, quality }),
  deleteDownload: (downloadId) => api.delete(`/downloads/${downloadId}`),
  pauseDownload: (downloadId) => api.post(`/downloads/${downloadId}/pause`),
  resumeDownload: (downloadId) => api.post(`/downloads/${downloadId}/resume`),
  getDownloadProgress: (downloadId) => api.get(`/downloads/${downloadId}/progress`),
}

// Quiz Service (API) - Kids quiz feature
const apiQuizService = {
  getQuiz: (contentId, profileId) =>
    api.get(`/quiz/${contentId}`, { params: { profile_id: profileId } }),
  submitQuiz: (quizId, answers, profileId, timings) =>
    api.post(`/quiz/${quizId}/submit`, { answers, profile_id: profileId, timings }),
  getHistory: (profileId, limit = 20, skip = 0) =>
    api.get('/quiz/history/me', { params: { profile_id: profileId, limit, skip } }),
}

// Rewards Service (API) - Kids quiz rewards
const apiRewardsService = {
  getMyRewards: (profileId) =>
    api.get('/rewards/me', { params: { profile_id: profileId } }),
  getRewardStats: (profileId) =>
    api.get('/rewards/stats', { params: { profile_id: profileId } }),
  getAllBadges: () => api.get('/rewards/badges'),
  getBadge: (badgeId) => api.get(`/rewards/badges/${badgeId}`),
}

// Widget Toggle Service (API)
const apiWidgetService = {
  toggle: (data) => api.post('/widgets/toggle', data),
  checkBatch: (items) => api.post('/widgets/check-batch', { items }),
  getPersonalWidgets: () => api.get('/widgets/personal'),
  bulkSoftDelete: (widgetIds) => api.post('/widgets/bulk-delete', { widget_ids: widgetIds }),
}

// Watch Party Service (API)
const apiPartyService = {
  create: (data) => api.post('/party/create', data),
  getMyParties: () => api.get('/party/my-parties'),
  joinByCode: (roomCode) => api.get(`/party/join/${roomCode}`),
  getParty: (partyId) => api.get(`/party/${partyId}`),
  joinParty: (partyId) => api.post(`/party/${partyId}/join`),
  leaveParty: (partyId) => api.post(`/party/${partyId}/leave`),
  endParty: (partyId) => api.post(`/party/${partyId}/end`),
  sendMessage: (partyId, message, messageType = 'text') =>
    api.post(`/party/${partyId}/chat`, { message, message_type: messageType }),
  getChatHistory: (partyId, limit = 50, before) =>
    api.get(`/party/${partyId}/chat`, { params: { limit, before } }),
  addReaction: (partyId, messageId, emoji) =>
    api.post(`/party/${partyId}/chat/${messageId}/react`, null, { params: { emoji } }),
  removeReaction: (partyId, messageId, emoji) =>
    api.delete(`/party/${partyId}/chat/${messageId}/react`, { params: { emoji } }),
  syncPlayback: (partyId, position, isPlaying = true) =>
    api.post(`/party/${partyId}/sync`, null, { params: { position, is_playing: isPlaying } }),
}

// Star Story Service (API)
const apiStarStoryService = {
  grantConsent: (profileId, childFirstName, pinHash) =>
    api.post('/star-story/consent', { profile_id: profileId, child_first_name: childFirstName, pin_hash: pinHash }),
  getAvatars: (profileId) =>
    api.get('/star-story/avatars', { params: { profile_id: profileId } }),
  generateEpisode: (profileId, avatarId, theme, targetVocabulary) =>
    api.post('/star-story/episodes/generate', {
      profile_id: profileId, avatar_id: avatarId, theme, target_vocabulary: targetVocabulary,
    }),
  getEpisodeProgress: (episodeId) =>
    api.get(`/star-story/episodes/${episodeId}/progress`),
  getEpisodes: (profileId) =>
    api.get('/star-story/episodes', { params: { profile_id: profileId } }),
  revokeConsent: (profileId) =>
    api.delete(`/star-story/consent/${profileId}`),
}

// ===========================================
// SERVICE EXPORTS
// Service exports
// ===========================================

export const authService = apiAuthService
export const contentService = apiContentService
export const liveService = apiLiveService
export const radioService = apiRadioService
export const podcastService = apiPodcastService
export const audiobookService = apiAudiobookService
export const subscriptionService = apiSubscriptionService
export const playlistService = apiPlaylistService
export const historyService = apiHistoryService
export const chatService = apiChatService
export const zmanService = apiZmanService
export const trendingService = apiTrendingService
export const chaptersService = apiChaptersService
export const sceneSearchService = apiSceneSearchService
export const subtitlesService = apiSubtitlesService
export const subtitlePreferencesService = apiSubtitlePreferencesService
export const ritualService = apiRitualService
export const partyService = apiPartyService
export const favoritesService = apiFavoritesService
export const downloadsService = apiDownloadsService
export const profilesService = apiProfilesService
export const childrenService = apiChildrenService
export const youngstersService = apiYoungstersService
export const judaismService = apiJudaismService
export const quizService = apiQuizService
export const rewardsService = apiRewardsService
export const widgetService = apiWidgetService
export const starStoryService = apiStarStoryService

export default api
