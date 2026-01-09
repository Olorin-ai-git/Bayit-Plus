import axios from 'axios'
import { config, isDemo } from '../config/appConfig'
import {
  demoAuthService,
  demoContentService,
  demoLiveService,
  demoRadioService,
  demoPodcastService,
  demoHistoryService,
  demoWatchlistService,
  demoSubscriptionService,
  demoChatService,
  demoZmanService,
  demoTrendingService,
  demoChaptersService,
  demoSubtitlesService,
  demoRitualService,
  demoPartyService,
  demoFavoritesService,
  demoDownloadsService,
  demoJudaismService,
  demoChildrenService,
  demoFlowsService,
} from './demoService'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}')
  if (authData?.state?.token) {
    config.headers.Authorization = `Bearer ${authData.state.token}`
  }
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bayit-auth')
      window.location.href = '/login'
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
  resetPassword: (email) => api.post('/auth/reset-password', { email }),
  getGoogleAuthUrl: () => api.get('/auth/google/url'),
  googleCallback: (code) => api.post('/auth/google/callback', { code }),
}

// Content Service (API)
const apiContentService = {
  getFeatured: () => api.get('/content/featured'),
  getCategories: () => api.get('/content/categories'),
  getByCategory: (categoryId, params) => api.get(`/content/category/${categoryId}`, { params }),
  getById: (contentId) => api.get(`/content/${contentId}`),
  getStreamUrl: (contentId) => api.get(`/content/${contentId}/stream`),
  search: (query, params) => api.post('/search', { query, ...params }),
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
  getShows: (params) => api.get('/podcasts', { params }),
  getShow: (showId) => api.get(`/podcasts/${showId}`),
  getEpisodes: (showId, params) => api.get(`/podcasts/${showId}/episodes`, { params }),
  getEpisode: (showId, episodeId) => api.get(`/podcasts/${showId}/episodes/${episodeId}`),
}

// Subscription Service (API)
const apiSubscriptionService = {
  getPlans: () => api.get('/subscriptions/plans'),
  getCurrentPlan: () => api.get('/subscriptions/current'),
  createCheckout: (planId) => api.post('/subscriptions/checkout', { plan_id: planId }),
  cancelSubscription: () => api.post('/subscriptions/cancel'),
  getInvoices: () => api.get('/subscriptions/invoices'),
}

// Watchlist Service (API)
const apiWatchlistService = {
  getWatchlist: () => api.get('/watchlist'),
  addToWatchlist: (contentId, contentType) => api.post('/watchlist', { content_id: contentId, content_type: contentType }),
  removeFromWatchlist: (contentId) => api.delete(`/watchlist/${contentId}`),
}

// Watch History Service (API)
const apiHistoryService = {
  getHistory: (params) => api.get('/history', { params }),
  updateProgress: (contentId, contentType, position, duration) =>
    api.post('/history/progress', { content_id: contentId, content_type: contentType, position, duration }),
  getContinueWatching: () => api.get('/history/continue'),
}

// Chat Service (API)
const apiChatService = {
  sendMessage: (message, conversationId, context = null, language = null) =>
    api.post('/chat', { message, conversation_id: conversationId, context, language }),
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
const apiTrendingService = {
  getTopics: () => api.get('/trending/topics'),
  getHeadlines: (source, limit = 20) =>
    api.get('/trending/headlines', { params: { source, limit } }),
  getRecommendations: (limit = 10) =>
    api.get('/trending/recommendations', { params: { limit } }),
  getSummary: () => api.get('/trending/summary'),
  getByCategory: (category) => api.get(`/trending/category/${category}`),
}

// Chapters Service (API)
const apiChaptersService = {
  getChapters: (contentId) => api.get(`/chapters/${contentId}`),
  generateChapters: (contentId, force = false, transcript = null) =>
    api.post(`/chapters/${contentId}/generate`, { transcript }, { params: { force } }),
  getLiveChapters: (channelId) => api.get(`/chapters/live/${channelId}`),
  getCategories: () => api.get('/chapters/categories/list'),
}

// Subtitles Service (API)
const apiSubtitlesService = {
  getLanguages: () => api.get('/subtitles/languages'),
  getTracks: (contentId, language) =>
    api.get(`/subtitles/${contentId}`, { params: { language } }),
  getCues: (contentId, language = 'he', withNikud = false, startTime, endTime) =>
    api.get(`/subtitles/${contentId}/cues`, {
      params: { language, with_nikud: withNikud, start_time: startTime, end_time: endTime }
    }),
  generateNikud: (contentId, language = 'he', force = false) =>
    api.post(`/subtitles/${contentId}/nikud`, null, { params: { language, force } }),
  importSubtitles: (contentId, sourceUrl, language = 'he', languageName = 'עברית', isDefault = false) =>
    api.post(`/subtitles/${contentId}/import`, {
      source_url: sourceUrl, language, language_name: languageName, is_default: isDefault
    }),
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
}

// Children Service (API)
const apiChildrenService = {
  getContent: (category, maxAge, limit) =>
    api.get('/children/content', { params: { category, max_age: maxAge, limit } }),
  getCategories: () => api.get('/children/categories'),
  toggleParentalControls: (enabled) =>
    api.post('/children/parental-controls', { enabled }),
  verifyPin: (pin) => api.post('/children/verify-pin', { pin }),
  setPin: (pin) => api.post('/children/set-pin', { pin }),
  getSettings: () => api.get('/children/settings'),
  updateSettings: (settings) => api.put('/children/settings', settings),
}

// Judaism Service (API)
const apiJudaismService = {
  getContent: (category, limit) =>
    api.get('/judaism/content', { params: { category, limit } }),
  getCategories: () => api.get('/judaism/categories'),
  getLiveShiurim: () => api.get('/judaism/live'),
  getDailyContent: () => api.get('/judaism/daily'),
}

// Flows Service (API)
const apiFlowsService = {
  getFlows: () => api.get('/flows'),
  getActiveFlow: () => api.get('/flows/active'),
  getFlow: (flowId) => api.get(`/flows/${flowId}`),
  createFlow: (data) => api.post('/flows', data),
  updateFlow: (flowId, data) => api.put(`/flows/${flowId}`, data),
  deleteFlow: (flowId) => api.delete(`/flows/${flowId}`),
  addFlowItem: (flowId, item) => api.post(`/flows/${flowId}/items`, item),
  removeFlowItem: (flowId, itemIndex) => api.delete(`/flows/${flowId}/items/${itemIndex}`),
  skipFlowToday: (flowId) => api.post(`/flows/${flowId}/skip-today`),
  getFlowContent: (flowId) => api.get(`/flows/${flowId}/content`),
}

// Favorites Service (API)
const apiFavoritesService = {
  getFavorites: () => api.get('/favorites'),
  addFavorite: (contentId, contentType) =>
    api.post('/favorites', { content_id: contentId, content_type: contentType }),
  removeFavorite: (contentId) => api.delete(`/favorites/${contentId}`),
  isFavorite: (contentId) => api.get(`/favorites/${contentId}/check`),
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

// ===========================================
// CONDITIONAL SERVICE EXPORTS
// In demo mode: use mock services only, no API calls
// In production mode: use API services only, fail fast
// ===========================================

export const authService = apiAuthService // Always use real auth - no demo mode
export const contentService = isDemo ? demoContentService : apiContentService
export const liveService = isDemo ? demoLiveService : apiLiveService
export const radioService = isDemo ? demoRadioService : apiRadioService
export const podcastService = isDemo ? demoPodcastService : apiPodcastService
export const subscriptionService = isDemo ? demoSubscriptionService : apiSubscriptionService
export const watchlistService = isDemo ? demoWatchlistService : apiWatchlistService
export const historyService = isDemo ? demoHistoryService : apiHistoryService
export const chatService = isDemo ? demoChatService : apiChatService
export const zmanService = isDemo ? demoZmanService : apiZmanService
export const trendingService = isDemo ? demoTrendingService : apiTrendingService
export const chaptersService = isDemo ? demoChaptersService : apiChaptersService
export const subtitlesService = isDemo ? demoSubtitlesService : apiSubtitlesService
export const ritualService = isDemo ? demoRitualService : apiRitualService
export const partyService = isDemo ? demoPartyService : apiPartyService
export const favoritesService = isDemo ? demoFavoritesService : apiFavoritesService
export const downloadsService = isDemo ? demoDownloadsService : apiDownloadsService
export const profilesService = apiProfilesService // No demo mode for profiles - requires real auth
export const childrenService = isDemo ? demoChildrenService : apiChildrenService
export const judaismService = isDemo ? demoJudaismService : apiJudaismService
export const flowsService = isDemo ? demoFlowsService : apiFlowsService

export default api
