import axios from 'axios'

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

// Auth Service
export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (updates) => api.patch('/auth/profile', updates),
  resetPassword: (email) => api.post('/auth/reset-password', { email }),
  getGoogleAuthUrl: () => api.get('/auth/google/url'),
  googleCallback: (code) => api.post('/auth/google/callback', { code }),
}

// Content Service
export const contentService = {
  getFeatured: () => api.get('/content/featured'),
  getCategories: () => api.get('/content/categories'),
  getByCategory: (categoryId, params) => api.get(`/content/category/${categoryId}`, { params }),
  getById: (contentId) => api.get(`/content/${contentId}`),
  getStreamUrl: (contentId) => api.get(`/content/${contentId}/stream`),
  search: (query, params) => api.post('/search', { query, ...params }),
}

// Live TV Service
export const liveService = {
  getChannels: () => api.get('/live/channels'),
  getChannel: (channelId) => api.get(`/live/${channelId}`),
  getEPG: (channelId, date) => api.get(`/live/${channelId}/epg`, { params: { date } }),
  getStreamUrl: (channelId) => api.get(`/live/${channelId}/stream`),
}

// Radio Service
export const radioService = {
  getStations: () => api.get('/radio/stations'),
  getStation: (stationId) => api.get(`/radio/${stationId}`),
  getStreamUrl: (stationId) => api.get(`/radio/${stationId}/stream`),
}

// Podcast Service
export const podcastService = {
  getShows: (params) => api.get('/podcasts', { params }),
  getShow: (showId) => api.get(`/podcasts/${showId}`),
  getEpisodes: (showId, params) => api.get(`/podcasts/${showId}/episodes`, { params }),
  getEpisode: (showId, episodeId) => api.get(`/podcasts/${showId}/episodes/${episodeId}`),
}

// Subscription Service
export const subscriptionService = {
  getPlans: () => api.get('/subscriptions/plans'),
  getCurrentPlan: () => api.get('/subscriptions/current'),
  createCheckout: (planId) => api.post('/subscriptions/checkout', { plan_id: planId }),
  cancelSubscription: () => api.post('/subscriptions/cancel'),
  getInvoices: () => api.get('/subscriptions/invoices'),
}

// Watchlist Service
export const watchlistService = {
  getWatchlist: () => api.get('/watchlist'),
  addToWatchlist: (contentId, contentType) => api.post('/watchlist', { content_id: contentId, content_type: contentType }),
  removeFromWatchlist: (contentId) => api.delete(`/watchlist/${contentId}`),
}

// Watch History Service
export const historyService = {
  getHistory: (params) => api.get('/history', { params }),
  updateProgress: (contentId, contentType, position, duration) =>
    api.post('/history/progress', { content_id: contentId, content_type: contentType, position, duration }),
  getContinueWatching: () => api.get('/history/continue'),
}

// Chat Service (Claude AI)
export const chatService = {
  sendMessage: (message, conversationId) =>
    api.post('/chat', { message, conversation_id: conversationId }),
  getConversation: (conversationId) => api.get(`/chat/${conversationId}`),
  clearConversation: (conversationId) => api.delete(`/chat/${conversationId}`),
  transcribeAudio: (audioBlob) => {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    return api.post('/chat/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export default api
