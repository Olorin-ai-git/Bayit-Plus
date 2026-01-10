/**
 * Admin API Service
 * Provides API endpoints for admin dashboard operations
 */

import axios from 'axios'
import { config, isDemo } from '../config/appConfig'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

// Create admin API instance
const adminApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
adminApi.interceptors.request.use((config) => {
  const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}')
  if (authData?.state?.token) {
    config.headers.Authorization = `Bearer ${authData.state.token}`
  }
  return config
})

// Handle response
adminApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bayit-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error)
  }
)

// Simulate network delay for demo mode
const delay = (ms = config.mock?.delay || 300) => new Promise(resolve => setTimeout(resolve, ms))

// ============================================
// Demo Data
// ============================================
const demoStats = {
  total_users: 15420,
  active_users: 12350,
  new_users_today: 87,
  new_users_this_week: 523,
  total_revenue: 245680,
  revenue_today: 3250,
  revenue_this_month: 45200,
  avg_revenue_per_user: 15.94,
  active_subscriptions: 8450,
  churn_rate: 3.2,
}

const demoActivity = [
  { id: '1', action: 'user.created', details: { email: 'user@example.com' }, created_at: new Date().toISOString() },
  { id: '2', action: 'subscription.created', details: { plan: 'Premium' }, created_at: new Date(Date.now() - 300000).toISOString() },
  { id: '3', action: 'payment.completed', details: { amount: '$14.99' }, created_at: new Date(Date.now() - 600000).toISOString() },
  { id: '4', action: 'user.login', details: { email: 'admin@bayit.tv' }, created_at: new Date(Date.now() - 900000).toISOString() },
  { id: '5', action: 'campaign.activated', details: { name: 'Holiday Sale' }, created_at: new Date(Date.now() - 1200000).toISOString() },
]

const demoUsers = [
  { id: '1', name: 'דני כהן', email: 'dani@example.com', role: 'user', status: 'active', subscription: { plan: 'Premium', status: 'active' }, created_at: '2024-01-15' },
  { id: '2', name: 'שרה לוי', email: 'sara@example.com', role: 'user', status: 'active', subscription: { plan: 'Basic', status: 'active' }, created_at: '2024-02-20' },
  { id: '3', name: 'יוסי מזרחי', email: 'yossi@example.com', role: 'admin', status: 'active', subscription: { plan: 'Family', status: 'active' }, created_at: '2024-03-10' },
  { id: '4', name: 'רחל אברהם', email: 'rachel@example.com', role: 'user', status: 'inactive', subscription: null, created_at: '2024-04-05' },
  { id: '5', name: 'משה ישראלי', email: 'moshe@example.com', role: 'user', status: 'active', subscription: { plan: 'Premium', status: 'active' }, created_at: '2024-05-12' },
]

const demoCampaigns = [
  { id: '1', name: 'Holiday Sale', code: 'HOLIDAY25', discount_percent: 25, status: 'active', usage_count: 150, max_uses: 500, valid_until: '2025-01-31' },
  { id: '2', name: 'New User Welcome', code: 'WELCOME10', discount_percent: 10, status: 'active', usage_count: 890, max_uses: null, valid_until: '2025-12-31' },
  { id: '3', name: 'Family Plan Special', code: 'FAMILY20', discount_percent: 20, status: 'inactive', usage_count: 230, max_uses: 300, valid_until: '2024-12-31' },
]

const demoTransactions = [
  { id: 't1', user: { name: 'דני כהן', email: 'dani@example.com' }, amount: 14.99, currency: 'USD', status: 'completed', type: 'subscription', created_at: new Date().toISOString() },
  { id: 't2', user: { name: 'שרה לוי', email: 'sara@example.com' }, amount: 9.99, currency: 'USD', status: 'completed', type: 'subscription', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 't3', user: { name: 'יוסי מזרחי', email: 'yossi@example.com' }, amount: 19.99, currency: 'USD', status: 'pending', type: 'subscription', created_at: new Date(Date.now() - 7200000).toISOString() },
]

const demoSubscriptions = [
  { id: 's1', user: { name: 'דני כהן', email: 'dani@example.com' }, plan: 'Premium', status: 'active', next_billing: '2025-02-15', amount: 14.99 },
  { id: 's2', user: { name: 'שרה לוי', email: 'sara@example.com' }, plan: 'Basic', status: 'active', next_billing: '2025-02-20', amount: 9.99 },
  { id: 's3', user: { name: 'יוסי מזרחי', email: 'yossi@example.com' }, plan: 'Family', status: 'active', next_billing: '2025-02-10', amount: 19.99 },
]

const demoPlans = [
  { id: 'basic', name: 'Basic', name_he: 'בסיסי', price: 9.99, interval: 'monthly', features: ['HD Streaming', '1 Device'], is_active: true, subscribers: 3200 },
  { id: 'premium', name: 'Premium', name_he: 'פרימיום', price: 14.99, interval: 'monthly', features: ['4K Streaming', '4 Devices', 'Downloads'], is_active: true, subscribers: 5100 },
  { id: 'family', name: 'Family', name_he: 'משפחתי', price: 19.99, interval: 'monthly', features: ['4K Streaming', '6 Devices', 'Downloads', '5 Profiles'], is_active: true, subscribers: 1450 },
]

// ============================================
// Content Demo Data
// ============================================

const demoCategories = [
  { id: 'cat1', name: 'סרטים', name_en: 'Movies', slug: 'movies', description: 'סרטים וקולנוע', order: 1, is_active: true, created_at: new Date().toISOString() },
  { id: 'cat2', name: 'סדרות', name_en: 'Series', slug: 'series', description: 'סדרות טלוויזיה', order: 2, is_active: true, created_at: new Date().toISOString() },
  { id: 'cat3', name: 'דוקומנטרים', name_en: 'Documentaries', slug: 'documentaries', description: 'סרטים דוקומנטריים', order: 3, is_active: true, created_at: new Date().toISOString() },
]

const demoContent = [
  { id: 'c1', title: 'Night of the Living Dead', description: 'Classic zombie horror film', thumbnail: 'https://via.placeholder.com/300x450?text=Night+of+Living+Dead', category_id: 'cat1', category_name: 'Movies', year: 1968, duration: '1:36:00', rating: 'Not Rated', genre: 'Horror', director: 'George A. Romero', stream_url: 'https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead_512kb.mp4', stream_type: 'hls', is_published: true, is_featured: false, is_drm_protected: false, is_series: false, requires_subscription: 'basic', is_kids_content: false, view_count: 1250, avg_rating: 4.2, created_at: new Date(Date.now() - 86400000 * 7).toISOString(), updated_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: 'c2', title: 'His Girl Friday', description: 'Classic screwball comedy', thumbnail: 'https://via.placeholder.com/300x450?text=His+Girl+Friday', category_id: 'cat1', category_name: 'Movies', year: 1940, duration: '1:32:00', rating: 'Not Rated', genre: 'Comedy', director: 'Howard Hawks', stream_url: 'https://archive.org/download/hgf_512kb.mp4/hgf_512kb.mp4', stream_type: 'hls', is_published: true, is_featured: true, is_drm_protected: false, is_series: false, requires_subscription: 'basic', is_kids_content: false, view_count: 890, avg_rating: 4.5, created_at: new Date(Date.now() - 86400000 * 14).toISOString(), updated_at: new Date(Date.now() - 86400000 * 14).toISOString() },
  { id: 'c3', title: 'Test Documentary Series', description: 'Educational documentary series', thumbnail: 'https://via.placeholder.com/300x450?text=Documentary', category_id: 'cat3', category_name: 'Documentaries', year: 2024, duration: '45:00', is_published: true, is_featured: false, is_drm_protected: false, is_series: true, season: 1, episode: 1, series_id: 'series1', requires_subscription: 'premium', is_kids_content: false, view_count: 420, avg_rating: 4.7, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

const demoLiveChannels = [
  { id: 'live1', name: 'Apple BipBop Basic', description: 'Apple test HLS stream', logo: 'https://via.placeholder.com/200x100?text=Apple', stream_url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8', stream_type: 'hls', is_active: true, order: 1, requires_subscription: 'basic', is_drm_protected: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'live2', name: 'Apple BipBop Advanced', description: 'Apple advanced TS stream', logo: 'https://via.placeholder.com/200x100?text=Apple', stream_url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8', stream_type: 'hls', is_active: true, order: 2, requires_subscription: 'premium', is_drm_protected: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

const demoRadioStations = [
  { id: 'radio1', name: 'Soma FM - Groove Salad', description: 'Eclectic lounge music', logo: 'https://via.placeholder.com/200x100?text=Soma+FM', genre: 'Electronic', stream_url: 'https://somafm.com/groovesalad.pls', stream_type: 'audio', is_active: true, order: 1, created_at: new Date().toISOString() },
  { id: 'radio2', name: 'BBC World Service', description: 'International news', logo: 'https://via.placeholder.com/200x100?text=BBC', genre: 'News', stream_url: 'http://bbcwssc.akamaized.net/live/manifest/audio/en_wwws_drm_p.m3u8', stream_type: 'audio', is_active: true, order: 2, created_at: new Date().toISOString() },
]

const demoPodcasts = [
  { id: 'pod1', title: 'The Daily', author: 'The New York Times', description: 'A daily show from The New York Times', cover: 'https://via.placeholder.com/300x300?text=The+Daily', category: 'News', rss_feed: 'https://feeds.simplecast.com/54nAGcIl', website: 'https://www.nytimes.com/podcasts/the-daily', episode_count: 450, latest_episode_date: new Date().toISOString(), is_active: true, order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'pod2', title: 'Up First', author: 'NPR', description: 'NPR newscast in podcast form', cover: 'https://via.placeholder.com/300x300?text=Up+First', category: 'News', rss_feed: 'https://feeds.npr.org/510318/rss.xml', website: 'https://www.npr.org/podcasts/510318/up-first', episode_count: 320, latest_episode_date: new Date().toISOString(), is_active: true, order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

const demoEpisodes = [
  { id: 'ep1', podcast_id: 'pod1', title: 'Breaking News Today', description: 'Latest news update', audio_url: 'https://example.com/episode1.mp3', duration: '12:45', episode_number: 1, season_number: 1, published_at: new Date().toISOString() },
  { id: 'ep2', podcast_id: 'pod1', title: 'News Review', description: 'Weekly news review', audio_url: 'https://example.com/episode2.mp3', duration: '15:30', episode_number: 2, season_number: 1, published_at: new Date(Date.now() - 86400000).toISOString() },
]

const demoWidgets = [
  {
    id: 'widget1',
    type: 'system',
    user_id: null,
    title: 'Channel 12 Live',
    description: 'ערוץ 12 שידור חי',
    icon: '📺',
    content: {
      content_type: 'live_channel',
      live_channel_id: 'live1',
      iframe_url: null,
      iframe_title: null,
    },
    position: { x: 20, y: 100, width: 350, height: 197, z_index: 100 },
    is_active: true,
    is_muted: true,
    is_visible: true,
    is_closable: true,
    is_draggable: true,
    visible_to_roles: ['user', 'admin'],
    visible_to_subscription_tiers: [],
    target_pages: [],
    order: 0,
    created_by: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'widget2',
    type: 'system',
    user_id: null,
    title: 'News Ticker',
    description: 'Live news feed',
    icon: '📰',
    content: {
      content_type: 'iframe',
      live_channel_id: null,
      iframe_url: 'https://example.com/news-widget',
      iframe_title: 'News Widget',
    },
    position: { x: 360, y: 100, width: 280, height: 200, z_index: 99 },
    is_active: false,
    is_muted: true,
    is_visible: true,
    is_closable: true,
    is_draggable: true,
    visible_to_roles: ['user', 'admin'],
    visible_to_subscription_tiers: ['premium'],
    target_pages: ['/'],
    order: 1,
    created_by: 'admin',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

const demoFreeSources = {
  live_tv: {
    apple_bipbop: {
      name: 'Apple BipBop Test Streams',
      description: 'Official Apple test HLS streams',
      items: [
        { id: 'bipbop_basic', name: 'Apple BipBop Basic', description: 'Apple basic test HLS stream' },
        { id: 'bipbop_advanced', name: 'Apple BipBop Advanced (TS)', description: 'Apple advanced test stream with Transport Stream' },
        { id: 'bipbop_fmp4', name: 'Apple BipBop (fMP4)', description: 'Apple fragmented MP4 test stream' },
      ],
    },
  },
  vod: {
    public_domain: {
      name: 'Public Domain Movies',
      description: 'Classic films from archive.org',
      items: [
        { id: 'notld_1968', title: 'Night of the Living Dead', year: 1968, director: 'George A. Romero' },
        { id: 'hgf_1940', title: 'His Girl Friday', year: 1940, director: 'Howard Hawks' },
        { id: 'charade_1963', title: 'Charade', year: 1963, director: 'Stanley Donen' },
      ],
    },
  },
  radio: {
    somafm: {
      name: 'Soma FM Streams',
      description: 'Quality internet radio from Soma FM',
      items: [
        { id: 'somafm_groovesalad', name: 'Groove Salad', genre: 'Electronic' },
        { id: 'somafm_dronezone', name: 'Drone Zone', genre: 'Ambient' },
        { id: 'somafm_liveshift', name: 'Live Shift', genre: 'Rock' },
      ],
    },
    bbc: {
      name: 'BBC World Service',
      description: "BBC's international news service",
      items: [{ id: 'bbcws', name: 'BBC World Service', genre: 'News' }],
    },
  },
  podcasts: {
    public_feeds: {
      name: 'Public Podcast Feeds',
      description: 'Popular public podcasts',
      items: [
        { id: 'nytimes_daily', title: 'The Daily', author: 'The New York Times' },
        { id: 'npr_up_first', title: 'Up First', author: 'NPR' },
        { id: 'science_vs', title: 'Science Vs', author: 'Gimlet Media' },
      ],
    },
  },
}

// ============================================
// Dashboard Service
// ============================================

const apiDashboardService = {
  getStats: () => adminApi.get('/admin/dashboard/stats'),
  getRevenueChart: (period = 'daily') => adminApi.get('/admin/dashboard/charts/revenue', { params: { period } }),
  getUserGrowthChart: (period = 'daily') => adminApi.get('/admin/dashboard/charts/users', { params: { period } }),
  getRecentActivity: (limit = 10) => adminApi.get('/admin/dashboard/activity', { params: { limit } }),
}

const demoDashboardService = {
  getStats: async () => {
    await delay()
    return demoStats
  },
  getRevenueChart: async (period = 'daily') => {
    await delay()
    const days = period === 'daily' ? 7 : period === 'weekly' ? 4 : 12
    return Array.from({ length: days }, (_, i) => ({
      label: period === 'monthly' ? `Month ${i + 1}` : `Day ${i + 1}`,
      value: Math.floor(Math.random() * 5000) + 2000,
    }))
  },
  getUserGrowthChart: async (period = 'daily') => {
    await delay()
    const days = period === 'daily' ? 7 : period === 'weekly' ? 4 : 12
    return Array.from({ length: days }, (_, i) => ({
      label: period === 'monthly' ? `Month ${i + 1}` : `Day ${i + 1}`,
      value: Math.floor(Math.random() * 100) + 50,
    }))
  },
  getRecentActivity: async (limit = 10) => {
    await delay()
    return demoActivity.slice(0, limit)
  },
}

// ============================================
// Users Service
// ============================================

const apiUsersService = {
  getUsers: (filters) => adminApi.get('/admin/users', { params: filters }),
  getUser: (userId) => adminApi.get(`/admin/users/${userId}`),
  createUser: (data) => adminApi.post('/admin/users', data),
  updateUser: (userId, data) => adminApi.put(`/admin/users/${userId}`, data),
  deleteUser: (userId) => adminApi.delete(`/admin/users/${userId}`),
  resetPassword: (userId) => adminApi.post(`/admin/users/${userId}/reset-password`),
  updateRole: (userId, role, permissions) => adminApi.put(`/admin/users/${userId}/role`, { role, permissions }),
  banUser: (userId, reason) => adminApi.post(`/admin/users/${userId}/ban`, { reason }),
  unbanUser: (userId) => adminApi.post(`/admin/users/${userId}/unban`),
  getUserActivity: (userId, limit = 10) => adminApi.get(`/admin/users/${userId}/activity`, { params: { limit } }),
  getUserBillingHistory: (userId) => adminApi.get(`/admin/users/${userId}/billing`),
}

const demoUsersService = {
  getUsers: async (filters = {}) => {
    await delay()
    let filtered = [...demoUsers]
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(u => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search))
    }
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(u => u.status === filters.status)
    }
    return { items: filtered, total: filtered.length, page: 1, page_size: 20 }
  },
  getUser: async (userId) => {
    await delay()
    return demoUsers.find(u => u.id === userId) || null
  },
  createUser: async (data) => {
    await delay()
    return { id: Date.now().toString(), ...data, created_at: new Date().toISOString() }
  },
  updateUser: async (userId, data) => {
    await delay()
    return { id: userId, ...data }
  },
  deleteUser: async (userId) => {
    await delay()
    return { message: 'User deleted' }
  },
  resetPassword: async (userId) => {
    await delay()
    return { message: 'Password reset email sent' }
  },
  updateRole: async (userId, role) => {
    await delay()
    return { id: userId, role }
  },
  banUser: async (userId, reason) => {
    await delay()
    return { id: userId, status: 'banned', ban_reason: reason }
  },
  unbanUser: async (userId) => {
    await delay()
    return { id: userId, status: 'active' }
  },
  getUserActivity: async (userId, limit = 10) => {
    await delay()
    return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `act-${i}`,
      action: ['user.login', 'content.viewed', 'subscription.created', 'settings.updated'][i % 4],
      details: { resource: `content-${i}` },
      created_at: new Date(Date.now() - i * 3600000).toISOString(),
    }))
  },
  getUserBillingHistory: async (userId) => {
    await delay()
    return demoTransactions.slice(0, 3)
  },
}

// ============================================
// Campaigns Service
// ============================================

const apiCampaignsService = {
  getCampaigns: (filters) => adminApi.get('/admin/campaigns', { params: filters }),
  getCampaign: (campaignId) => adminApi.get(`/admin/campaigns/${campaignId}`),
  createCampaign: (data) => adminApi.post('/admin/campaigns', data),
  updateCampaign: (campaignId, data) => adminApi.put(`/admin/campaigns/${campaignId}`, data),
  deleteCampaign: (campaignId) => adminApi.delete(`/admin/campaigns/${campaignId}`),
  activateCampaign: (campaignId) => adminApi.post(`/admin/campaigns/${campaignId}/activate`),
  deactivateCampaign: (campaignId) => adminApi.post(`/admin/campaigns/${campaignId}/deactivate`),
}

const demoCampaignsService = {
  getCampaigns: async (filters = {}) => {
    await delay()
    let filtered = [...demoCampaigns]
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(c => c.name.toLowerCase().includes(search) || c.code.toLowerCase().includes(search))
    }
    if (filters.status) {
      filtered = filtered.filter(c => c.status === filters.status)
    }
    return { items: filtered, total: filtered.length, page: 1, page_size: 20 }
  },
  getCampaign: async (campaignId) => {
    await delay()
    return demoCampaigns.find(c => c.id === campaignId) || null
  },
  createCampaign: async (data) => {
    await delay()
    return { id: Date.now().toString(), ...data, usage_count: 0, status: 'active' }
  },
  updateCampaign: async (campaignId, data) => {
    await delay()
    return { id: campaignId, ...data }
  },
  deleteCampaign: async (campaignId) => {
    await delay()
    return { message: 'Campaign deleted' }
  },
  activateCampaign: async (campaignId) => {
    await delay()
    return { id: campaignId, status: 'active' }
  },
  deactivateCampaign: async (campaignId) => {
    await delay()
    return { id: campaignId, status: 'inactive' }
  },
}

// ============================================
// Billing Service
// ============================================

const apiBillingService = {
  getOverview: () => adminApi.get('/admin/billing/overview'),
  getTransactions: (filters) => adminApi.get('/admin/billing/transactions', { params: filters }),
  getTransaction: (transactionId) => adminApi.get(`/admin/billing/transactions/${transactionId}`),
  getRefunds: (filters) => adminApi.get('/admin/billing/refunds', { params: filters }),
  processRefund: (transactionId, data) => adminApi.post('/admin/billing/refunds', { transaction_id: transactionId, ...data }),
  approveRefund: (refundId) => adminApi.post(`/admin/billing/refunds/${refundId}/approve`),
  rejectRefund: (refundId, reason) => adminApi.post(`/admin/billing/refunds/${refundId}/reject`, { reason }),
  exportTransactions: (filters) => adminApi.get('/admin/billing/export', { params: filters, responseType: 'blob' }),
  generateInvoice: (transactionId) => adminApi.get(`/admin/billing/transactions/${transactionId}/invoice`, { responseType: 'blob' }),
}

const demoRefunds = [
  { id: 'r1', transaction_id: 't1', user: { name: 'דני כהן', email: 'dani@example.com' }, amount: 14.99, reason: 'לא שבע רצון מהשירות', status: 'pending', created_at: new Date().toISOString() },
  { id: 'r2', transaction_id: 't2', user: { name: 'שרה לוי', email: 'sara@example.com' }, amount: 9.99, reason: 'חיוב כפול', status: 'approved', created_at: new Date(Date.now() - 86400000).toISOString(), processed_at: new Date().toISOString() },
  { id: 'r3', transaction_id: 't3', user: { name: 'יוסי מזרחי', email: 'yossi@example.com' }, amount: 19.99, reason: 'ביטול מנוי', status: 'rejected', created_at: new Date(Date.now() - 172800000).toISOString(), rejection_reason: 'מחוץ לתקופת ההחזר' },
]

const demoBillingService = {
  getOverview: async () => {
    await delay()
    return {
      today: 3250,
      this_week: 18500,
      this_month: 45200,
      this_year: 245680,
      pending_refunds: 3,
      total_transactions: 1250,
      avg_transaction: 12.50,
      refund_rate: 2.1,
    }
  },
  getTransactions: async (filters = {}) => {
    await delay()
    let filtered = [...demoTransactions]
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(t => t.status === filters.status)
    }
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(t => t.user.name.toLowerCase().includes(search) || t.user.email.toLowerCase().includes(search))
    }
    return { items: filtered, total: filtered.length, page: filters.page || 1, page_size: filters.page_size || 20 }
  },
  getTransaction: async (transactionId) => {
    await delay()
    return demoTransactions.find(t => t.id === transactionId) || null
  },
  getRefunds: async (filters = {}) => {
    await delay()
    let filtered = [...demoRefunds]
    if (filters.status && filters.status !== 'all' && filters.status !== '') {
      filtered = filtered.filter(r => r.status === filters.status)
    }
    return { items: filtered, total: filtered.length, page: filters.page || 1, page_size: filters.page_size || 20 }
  },
  processRefund: async (transactionId, data) => {
    await delay()
    return { id: Date.now().toString(), transaction_id: transactionId, ...data, status: 'pending', created_at: new Date().toISOString() }
  },
  approveRefund: async (refundId) => {
    await delay()
    return { id: refundId, status: 'approved', processed_at: new Date().toISOString() }
  },
  rejectRefund: async (refundId, reason) => {
    await delay()
    return { id: refundId, status: 'rejected', rejection_reason: reason, processed_at: new Date().toISOString() }
  },
  exportTransactions: async (filters) => {
    await delay()
    return new Blob(['Transaction data export'], { type: 'text/csv' })
  },
  generateInvoice: async (transactionId) => {
    await delay()
    return new Blob(['Invoice PDF content'], { type: 'application/pdf' })
  },
}

// ============================================
// Subscriptions Service
// ============================================

const apiSubscriptionsService = {
  getSubscriptions: (filters) => adminApi.get('/admin/subscriptions', { params: filters }),
  getSubscription: (subscriptionId) => adminApi.get(`/admin/subscriptions/${subscriptionId}`),
  cancelSubscription: (subscriptionId, reason) => adminApi.post(`/admin/subscriptions/${subscriptionId}/cancel`, { reason }),
  extendSubscription: (subscriptionId, days) => adminApi.post(`/admin/subscriptions/${subscriptionId}/extend`, { days }),
  pauseSubscription: (subscriptionId) => adminApi.post(`/admin/subscriptions/${subscriptionId}/pause`),
  resumeSubscription: (subscriptionId) => adminApi.post(`/admin/subscriptions/${subscriptionId}/resume`),
  applyDiscount: (subscriptionId, discountPercent, months) => adminApi.post(`/admin/subscriptions/${subscriptionId}/discount`, { discount_percent: discountPercent, months }),
  getChurnAnalytics: () => adminApi.get('/admin/subscriptions/analytics/churn'),
  getPlans: () => adminApi.get('/admin/plans'),
  getPlan: (planId) => adminApi.get(`/admin/plans/${planId}`),
  createPlan: (data) => adminApi.post('/admin/plans', data),
  updatePlan: (planId, data) => adminApi.put(`/admin/plans/${planId}`, data),
  deletePlan: (planId) => adminApi.delete(`/admin/plans/${planId}`),
}

const demoSubscriptionsService = {
  getSubscriptions: async (filters = {}) => {
    await delay()
    return { items: demoSubscriptions, total: demoSubscriptions.length, page: 1, page_size: 20 }
  },
  getSubscription: async (subscriptionId) => {
    await delay()
    return demoSubscriptions.find(s => s.id === subscriptionId) || null
  },
  cancelSubscription: async (subscriptionId, reason) => {
    await delay()
    return { id: subscriptionId, status: 'cancelled', cancel_reason: reason }
  },
  extendSubscription: async (subscriptionId, days) => {
    await delay()
    return { id: subscriptionId, extended_days: days }
  },
  pauseSubscription: async (subscriptionId) => {
    await delay()
    return { id: subscriptionId, status: 'paused' }
  },
  resumeSubscription: async (subscriptionId) => {
    await delay()
    return { id: subscriptionId, status: 'active' }
  },
  applyDiscount: async (subscriptionId, discountPercent, months) => {
    await delay()
    return { id: subscriptionId, discount_percent: discountPercent, discount_months: months }
  },
  getChurnAnalytics: async () => {
    await delay()
    return { churn_rate: 3.2, churned_users: 45, at_risk_users: 120, retention_rate: 96.8 }
  },
  getPlans: async () => {
    await delay()
    return demoPlans
  },
  getPlan: async (planId) => {
    await delay()
    return demoPlans.find(p => p.id === planId) || null
  },
  createPlan: async (data) => {
    await delay()
    return { id: Date.now().toString(), ...data }
  },
  updatePlan: async (planId, data) => {
    await delay()
    return { id: planId, ...data }
  },
  deletePlan: async (planId) => {
    await delay()
    return { message: 'Plan deleted' }
  },
}

// ============================================
// Marketing Service
// ============================================

const demoEmailCampaigns = [
  { id: 'e1', name: 'ברוכים הבאים למשתמשים חדשים', subject: 'ברוך הבא ל-Bayit+!', status: 'active', sent: 1250, opened: 890, clicked: 320, created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: 'e2', name: 'מבצע סוף שנה', subject: '🎉 הנחה מיוחדת לסוף שנה!', status: 'completed', sent: 5000, opened: 3200, clicked: 1100, created_at: new Date(Date.now() - 86400000 * 14).toISOString() },
  { id: 'e3', name: 'תזכורת חידוש מנוי', subject: 'המנוי שלך עומד להסתיים', status: 'scheduled', sent: 0, opened: 0, clicked: 0, scheduled_at: new Date(Date.now() + 86400000).toISOString(), created_at: new Date().toISOString() },
]

const demoPushNotifications = [
  { id: 'p1', title: 'תוכן חדש זמין!', body: 'סדרה חדשה התווספה לספריה', status: 'sent', sent: 8500, opened: 2100, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'p2', title: 'אל תפספסו!', body: 'שידור חי מתחיל בעוד שעה', status: 'scheduled', sent: 0, opened: 0, scheduled_at: new Date(Date.now() + 3600000).toISOString(), created_at: new Date().toISOString() },
  { id: 'p3', title: 'מבצע בלעדי', body: 'הנחה של 20% למנויים', status: 'draft', sent: 0, opened: 0, created_at: new Date().toISOString() },
]

const apiMarketingService = {
  getMetrics: () => adminApi.get('/admin/marketing/metrics'),
  getRecentCampaigns: (limit = 5) => adminApi.get('/admin/marketing/campaigns/recent', { params: { limit } }),
  getAudienceSegments: () => adminApi.get('/admin/marketing/segments/summary'),
  getEmailCampaigns: (filters) => adminApi.get('/admin/marketing/emails', { params: filters }),
  getEmailCampaign: (campaignId) => adminApi.get(`/admin/marketing/emails/${campaignId}`),
  createEmailCampaign: (data) => adminApi.post('/admin/marketing/emails', data),
  updateEmailCampaign: (campaignId, data) => adminApi.put(`/admin/marketing/emails/${campaignId}`, data),
  deleteEmailCampaign: (campaignId) => adminApi.delete(`/admin/marketing/emails/${campaignId}`),
  sendEmailCampaign: (campaignId) => adminApi.post(`/admin/marketing/emails/${campaignId}/send`),
  scheduleEmailCampaign: (campaignId, scheduledAt) => adminApi.post(`/admin/marketing/emails/${campaignId}/schedule`, { scheduled_at: scheduledAt }),
  sendTestEmail: (campaignId, email) => adminApi.post(`/admin/marketing/emails/${campaignId}/test`, { email }),
  getPushNotifications: (filters) => adminApi.get('/admin/marketing/push', { params: filters }),
  getPushNotification: (notificationId) => adminApi.get(`/admin/marketing/push/${notificationId}`),
  createPushNotification: (data) => adminApi.post('/admin/marketing/push', data),
  updatePushNotification: (notificationId, data) => adminApi.put(`/admin/marketing/push/${notificationId}`, data),
  deletePushNotification: (notificationId) => adminApi.delete(`/admin/marketing/push/${notificationId}`),
  sendPushNotification: (notificationId) => adminApi.post(`/admin/marketing/push/${notificationId}/send`),
  schedulePushNotification: (notificationId, scheduledAt) => adminApi.post(`/admin/marketing/push/${notificationId}/schedule`, { scheduled_at: scheduledAt }),
  getAudienceCount: (filter) => adminApi.post('/admin/marketing/audience/count', filter),
  getSegments: () => adminApi.get('/admin/marketing/segments'),
  createSegment: (data) => adminApi.post('/admin/marketing/segments', data),
  deleteSegment: (segmentId) => adminApi.delete(`/admin/marketing/segments/${segmentId}`),
}

const demoMarketingService = {
  getMetrics: async () => {
    await delay()
    return { emailsSent: 15200, emailOpenRate: 62.5, emailClickRate: 28.3, pushSent: 42000, pushOpenRate: 31.2, activeSegments: 8, conversionRate: 4.5, unsubscribeRate: 0.8 }
  },
  getRecentCampaigns: async (limit = 5) => {
    await delay()
    return [...demoEmailCampaigns, ...demoPushNotifications].slice(0, limit).map(c => ({
      id: c.id,
      name: c.name || c.title,
      type: c.subject ? 'email' : 'push',
      status: c.status,
      sent: c.sent,
      opened: c.opened,
      clicked: c.clicked || 0,
    }))
  },
  getAudienceSegments: async () => {
    await delay()
    return [
      { name: 'כל המשתמשים', count: 15420 },
      { name: 'מנויים פעילים', count: 8450 },
      { name: 'משתמשים חדשים (7 ימים)', count: 523 },
      { name: 'מנויים שפג תוקפם', count: 890 },
    ]
  },
  getEmailCampaigns: async (filters = {}) => {
    await delay()
    let filtered = [...demoEmailCampaigns]
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(e => e.status === filters.status)
    }
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(e => e.name.toLowerCase().includes(search) || e.subject.toLowerCase().includes(search))
    }
    return { items: filtered, total: filtered.length, page: filters.page || 1, page_size: filters.page_size || 20 }
  },
  getEmailCampaign: async (campaignId) => {
    await delay()
    return demoEmailCampaigns.find(e => e.id === campaignId) || null
  },
  createEmailCampaign: async (data) => {
    await delay()
    return { id: Date.now().toString(), ...data, status: 'draft', sent: 0, opened: 0, clicked: 0, created_at: new Date().toISOString() }
  },
  updateEmailCampaign: async (campaignId, data) => {
    await delay()
    return { id: campaignId, ...data }
  },
  deleteEmailCampaign: async (campaignId) => {
    await delay()
    return { message: 'Email campaign deleted' }
  },
  sendEmailCampaign: async (campaignId) => {
    await delay()
    return { id: campaignId, status: 'active', sent: 1000 }
  },
  scheduleEmailCampaign: async (campaignId, scheduledAt) => {
    await delay()
    return { id: campaignId, status: 'scheduled', scheduled_at: scheduledAt }
  },
  sendTestEmail: async (campaignId, email) => {
    await delay()
    return { success: true }
  },
  getPushNotifications: async (filters = {}) => {
    await delay()
    let filtered = [...demoPushNotifications]
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(p => p.status === filters.status)
    }
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(p => p.title.toLowerCase().includes(search) || p.body.toLowerCase().includes(search))
    }
    return { items: filtered, total: filtered.length, page: filters.page || 1, page_size: filters.page_size || 20 }
  },
  getPushNotification: async (notificationId) => {
    await delay()
    return demoPushNotifications.find(p => p.id === notificationId) || null
  },
  createPushNotification: async (data) => {
    await delay()
    return { id: Date.now().toString(), ...data, status: 'draft', sent: 0, opened: 0, created_at: new Date().toISOString() }
  },
  updatePushNotification: async (notificationId, data) => {
    await delay()
    return { id: notificationId, ...data }
  },
  deletePushNotification: async (notificationId) => {
    await delay()
    return { message: 'Push notification deleted' }
  },
  sendPushNotification: async (notificationId) => {
    await delay()
    return { id: notificationId, status: 'sent', sent: 8500 }
  },
  schedulePushNotification: async (notificationId, scheduledAt) => {
    await delay()
    return { id: notificationId, status: 'scheduled', scheduled_at: scheduledAt }
  },
  getAudienceCount: async (filter) => {
    await delay()
    return { count: Math.floor(Math.random() * 5000) + 1000 }
  },
  getSegments: async () => {
    await delay()
    return [
      { id: 's1', name: 'מנויים פעילים', filter: { subscription_status: 'active' }, count: 8450 },
      { id: 's2', name: 'משתמשים חדשים', filter: { created_after: new Date(Date.now() - 86400000 * 7).toISOString() }, count: 523 },
    ]
  },
  createSegment: async (data) => {
    await delay()
    return { id: Date.now().toString() }
  },
  deleteSegment: async (segmentId) => {
    await delay()
    return { message: 'Segment deleted' }
  },
}

// ============================================
// Settings Service
// ============================================

const apiSettingsService = {
  getSettings: () => adminApi.get('/admin/settings'),
  updateSettings: (data) => adminApi.patch('/admin/settings', data),
  getFeatureFlags: () => adminApi.get('/admin/settings/feature-flags'),
  updateFeatureFlag: (flag, enabled) => adminApi.patch(`/admin/settings/feature-flags/${flag}`, { enabled }),
  clearCache: () => adminApi.post('/admin/settings/cache/clear'),
  resetAnalytics: () => adminApi.post('/admin/settings/analytics/reset'),
}

const demoSettingsService = {
  getSettings: async () => {
    await delay()
    return {
      default_plan: 'basic',
      trial_days: 7,
      max_devices: 3,
      maintenance_mode: false,
      support_email: 'support@bayit.tv',
      terms_url: '/terms',
      privacy_url: '/privacy',
    }
  },
  updateSettings: async (data) => {
    await delay()
    return data
  },
  getFeatureFlags: async () => {
    await delay()
    return {
      new_player: true,
      live_chat: false,
      downloads: true,
      watch_party: true,
      voice_search: false,
      ai_recommendations: true,
    }
  },
  updateFeatureFlag: async (flag, enabled) => {
    await delay()
    return { [flag]: enabled }
  },
  clearCache: async () => {
    await delay()
    return { success: true }
  },
  resetAnalytics: async () => {
    await delay()
    return { success: true }
  },
}

// ============================================
// Audit Logs Service
// ============================================

const apiAuditLogsService = {
  getLogs: (filters) => adminApi.get('/admin/logs', { params: filters }),
  exportLogs: (filters) => adminApi.get('/admin/logs/export', { params: filters, responseType: 'blob' }),
}

const demoAuditLogsService = {
  getLogs: async (filters = {}) => {
    await delay()
    const actions = ['user.login', 'user.created', 'user.updated', 'subscription.created', 'subscription.cancelled', 'payment.completed', 'payment.refunded', 'settings.updated', 'campaign.created', 'content.published']
    const users = ['Admin', 'דני כהן', 'שרה לוי', 'יוסי מזרחי', 'רחל אברהם']
    const logs = Array.from({ length: 50 }, (_, i) => ({
      id: `log-${i}`,
      action: actions[i % actions.length],
      user_id: `user-${i % 5}`,
      user_name: users[i % users.length],
      ip_address: `192.168.1.${100 + (i % 50)}`,
      resource_type: actions[i % actions.length].split('.')[0],
      resource_id: `res-${i}`,
      details: { changed_fields: ['status', 'email'] },
      created_at: new Date(Date.now() - i * 1800000).toISOString(),
    }))
    let filtered = logs
    if (filters.action) {
      filtered = filtered.filter(l => l.action.includes(filters.action))
    }
    if (filters.user_id) {
      filtered = filtered.filter(l => l.user_id === filters.user_id)
    }
    const page = filters.page || 1
    const pageSize = filters.page_size || 20
    const start = (page - 1) * pageSize
    const paged = filtered.slice(start, start + pageSize)
    return { items: paged, total: filtered.length, page, page_size: pageSize }
  },
  exportLogs: async (filters) => {
    await delay()
    return new Blob(['Audit logs export'], { type: 'text/csv' })
  },
}

// ============================================
// Content Service
// ============================================

const apiContentService = {
  // VOD Content
  getContent: (filters) => adminApi.get('/admin/content', { params: filters }),
  getContentItem: (id) => adminApi.get(`/admin/content/${id}`),
  createContent: (data) => adminApi.post('/admin/content', data),
  updateContent: (id, data) => adminApi.patch(`/admin/content/${id}`, data),
  deleteContent: (id) => adminApi.delete(`/admin/content/${id}`),
  publishContent: (id) => adminApi.post(`/admin/content/${id}/publish`),
  featureContent: (id) => adminApi.post(`/admin/content/${id}/feature`),

  // Categories
  getCategories: (filters) => adminApi.get('/admin/categories', { params: filters }),
  getCategory: (id) => adminApi.get(`/admin/categories/${id}`),
  createCategory: (data) => adminApi.post('/admin/categories', data),
  updateCategory: (id, data) => adminApi.patch(`/admin/categories/${id}`, data),
  deleteCategory: (id) => adminApi.delete(`/admin/categories/${id}`),
  reorderCategories: (data) => adminApi.post('/admin/categories/reorder', data),

  // Live Channels
  getLiveChannels: (filters) => adminApi.get('/admin/live-channels', { params: filters }),
  getLiveChannel: (id) => adminApi.get(`/admin/live-channels/${id}`),
  createLiveChannel: (data) => adminApi.post('/admin/live-channels', data),
  updateLiveChannel: (id, data) => adminApi.patch(`/admin/live-channels/${id}`, data),
  deleteLiveChannel: (id) => adminApi.delete(`/admin/live-channels/${id}`),
  reorderLiveChannels: (data) => adminApi.post('/admin/live-channels/reorder', data),

  // Radio Stations
  getRadioStations: (filters) => adminApi.get('/admin/radio-stations', { params: filters }),
  getRadioStation: (id) => adminApi.get(`/admin/radio-stations/${id}`),
  createRadioStation: (data) => adminApi.post('/admin/radio-stations', data),
  updateRadioStation: (id, data) => adminApi.patch(`/admin/radio-stations/${id}`, data),
  deleteRadioStation: (id) => adminApi.delete(`/admin/radio-stations/${id}`),

  // Podcasts
  getPodcasts: (filters) => adminApi.get('/admin/podcasts', { params: filters }),
  getPodcast: (id) => adminApi.get(`/admin/podcasts/${id}`),
  createPodcast: (data) => adminApi.post('/admin/podcasts', data),
  updatePodcast: (id, data) => adminApi.patch(`/admin/podcasts/${id}`, data),
  deletePodcast: (id) => adminApi.delete(`/admin/podcasts/${id}`),

  // Podcast Episodes
  getEpisodes: (podcastId, filters) => adminApi.get(`/admin/podcasts/${podcastId}/episodes`, { params: filters }),
  getEpisode: (podcastId, episodeId) => adminApi.get(`/admin/podcasts/${podcastId}/episodes/${episodeId}`),
  createEpisode: (podcastId, data) => adminApi.post(`/admin/podcasts/${podcastId}/episodes`, data),
  updateEpisode: (podcastId, episodeId, data) => adminApi.patch(`/admin/podcasts/${podcastId}/episodes/${episodeId}`, data),
  deleteEpisode: (podcastId, episodeId) => adminApi.delete(`/admin/podcasts/${podcastId}/episodes/${episodeId}`),
}

const demoContentService = {
  // VOD Content
  getContent: async (filters = {}) => {
    await delay()
    let filtered = [...demoContent]
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(c => c.title.toLowerCase().includes(search))
    }
    if (filters.category_id) {
      filtered = filtered.filter(c => c.category_id === filters.category_id)
    }
    if (filters.is_published !== undefined) {
      filtered = filtered.filter(c => c.is_published === filters.is_published)
    }
    if (filters.is_featured !== undefined) {
      filtered = filtered.filter(c => c.is_featured === filters.is_featured)
    }
    const page = filters.page || 1
    const pageSize = filters.page_size || 20
    const start = (page - 1) * pageSize
    return { items: filtered.slice(start, start + pageSize), total: filtered.length, page, page_size: pageSize }
  },
  getContentItem: async (id) => {
    await delay()
    return demoContent.find(c => c.id === id) || null
  },
  createContent: async (data) => {
    await delay()
    return { id: Date.now().toString(), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  },
  updateContent: async (id, data) => {
    await delay()
    return { id, ...data, updated_at: new Date().toISOString() }
  },
  deleteContent: async (id) => {
    await delay()
    return { message: 'Content deleted' }
  },
  publishContent: async (id) => {
    await delay()
    return { id, is_published: true }
  },
  featureContent: async (id) => {
    await delay()
    return { id, is_featured: true }
  },

  // Categories
  getCategories: async (filters = {}) => {
    await delay()
    return { items: demoCategories, total: demoCategories.length, page: 1, page_size: 20 }
  },
  getCategory: async (id) => {
    await delay()
    return demoCategories.find(c => c.id === id) || null
  },
  createCategory: async (data) => {
    await delay()
    return { id: Date.now().toString(), ...data, created_at: new Date().toISOString() }
  },
  updateCategory: async (id, data) => {
    await delay()
    return { id, ...data }
  },
  deleteCategory: async (id) => {
    await delay()
    return { message: 'Category deleted' }
  },
  reorderCategories: async (data) => {
    await delay()
    return { message: 'Categories reordered' }
  },

  // Live Channels
  getLiveChannels: async (filters = {}) => {
    await delay()
    return { items: demoLiveChannels, total: demoLiveChannels.length, page: 1, page_size: 20 }
  },
  getLiveChannel: async (id) => {
    await delay()
    return demoLiveChannels.find(c => c.id === id) || null
  },
  createLiveChannel: async (data) => {
    await delay()
    return { id: Date.now().toString(), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  },
  updateLiveChannel: async (id, data) => {
    await delay()
    return { id, ...data, updated_at: new Date().toISOString() }
  },
  deleteLiveChannel: async (id) => {
    await delay()
    return { message: 'Live channel deleted' }
  },
  reorderLiveChannels: async (data) => {
    await delay()
    return { message: 'Live channels reordered' }
  },

  // Radio Stations
  getRadioStations: async (filters = {}) => {
    await delay()
    return { items: demoRadioStations, total: demoRadioStations.length, page: 1, page_size: 20 }
  },
  getRadioStation: async (id) => {
    await delay()
    return demoRadioStations.find(s => s.id === id) || null
  },
  createRadioStation: async (data) => {
    await delay()
    return { id: Date.now().toString(), ...data, created_at: new Date().toISOString() }
  },
  updateRadioStation: async (id, data) => {
    await delay()
    return { id, ...data }
  },
  deleteRadioStation: async (id) => {
    await delay()
    return { message: 'Radio station deleted' }
  },

  // Podcasts
  getPodcasts: async (filters = {}) => {
    await delay()
    return { items: demoPodcasts, total: demoPodcasts.length, page: 1, page_size: 20 }
  },
  getPodcast: async (id) => {
    await delay()
    return demoPodcasts.find(p => p.id === id) || null
  },
  createPodcast: async (data) => {
    await delay()
    return { id: Date.now().toString(), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  },
  updatePodcast: async (id, data) => {
    await delay()
    return { id, ...data, updated_at: new Date().toISOString() }
  },
  deletePodcast: async (id) => {
    await delay()
    return { message: 'Podcast deleted' }
  },

  // Podcast Episodes
  getEpisodes: async (podcastId, filters = {}) => {
    await delay()
    const episodes = demoEpisodes.filter(e => e.podcast_id === podcastId)
    const page = filters.page || 1
    const pageSize = filters.page_size || 20
    const start = (page - 1) * pageSize
    return { items: episodes.slice(start, start + pageSize), total: episodes.length, page, page_size: pageSize }
  },
  getEpisode: async (podcastId, episodeId) => {
    await delay()
    return demoEpisodes.find(e => e.id === episodeId && e.podcast_id === podcastId) || null
  },
  createEpisode: async (podcastId, data) => {
    await delay()
    return { id: Date.now().toString(), podcast_id: podcastId, ...data }
  },
  updateEpisode: async (podcastId, episodeId, data) => {
    await delay()
    return { id: episodeId, podcast_id: podcastId, ...data }
  },
  deleteEpisode: async (podcastId, episodeId) => {
    await delay()
    return { message: 'Episode deleted' }
  },
}

// ============================================
// Uploads Service
// ============================================

const apiUploadsService = {
  uploadImage: (file, type) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    return adminApi.post('/admin/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  validateUrl: (url) => adminApi.post('/admin/uploads/validate-url', { url }),
  getPresignedUrl: (filename, contentType) => adminApi.post('/admin/uploads/presigned-url', { filename, content_type: contentType }),
}

const demoUploadsService = {
  uploadImage: async (file, type) => {
    await delay(500)
    return {
      url: `https://via.placeholder.com/400x600?text=${file.name}`,
      filename: file.name,
      size: file.size,
    }
  },
  validateUrl: async (url) => {
    await delay()
    return { valid: true, message: 'URL is valid' }
  },
  getPresignedUrl: async (filename, contentType) => {
    await delay()
    return {
      upload_url: `https://s3.example.com/presigned/${filename}`,
      fields: { key: filename },
      key: filename,
    }
  },
}

// ============================================
// Import Service
// ============================================

const apiImportService = {
  getFreeSources: (sourceType) => adminApi.get(`/admin/content/import/sources/${sourceType}`),
  importFreeContent: (data) => adminApi.post('/admin/content/import/free-content', data),
}

const demoImportService = {
  getFreeSources: async (sourceType) => {
    await delay()
    return demoFreeSources[sourceType] || {}
  },
  importFreeContent: async (data) => {
    await delay(800)
    const type = data.source_type
    const itemCount = data.items?.length || (data.import_all ? 3 : 1)
    return {
      message: `Successfully imported ${itemCount} items`,
      source_type: type,
      source_name: data.source_name,
      imported_count: itemCount,
    }
  },
}

// ============================================
// Widgets Service
// ============================================

const apiWidgetsService = {
  // Admin endpoints
  getWidgets: (filters) => adminApi.get('/admin/widgets', { params: filters }),
  getWidget: (id) => adminApi.get(`/admin/widgets/${id}`),
  createWidget: (data) => adminApi.post('/admin/widgets', data),
  updateWidget: (id, data) => adminApi.patch(`/admin/widgets/${id}`, data),
  deleteWidget: (id) => adminApi.delete(`/admin/widgets/${id}`),
  publishWidget: (id) => adminApi.post(`/admin/widgets/${id}/publish`),
  unpublishWidget: (id) => adminApi.post(`/admin/widgets/${id}/unpublish`),
  reorderWidgets: (orderData) => adminApi.post('/admin/widgets/reorder', { order_data: orderData }),

  // User endpoints (for fetching applicable widgets)
  getMyWidgets: (pagePath) => adminApi.get('/widgets', { params: { page_path: pagePath } }),
  createPersonalWidget: (data) => adminApi.post('/widgets', data),
  updatePersonalWidget: (id, data) => adminApi.patch(`/widgets/${id}`, data),
  deletePersonalWidget: (id) => adminApi.delete(`/widgets/${id}`),
  updateWidgetPosition: (id, position) => adminApi.post(`/widgets/${id}/position`, position),
  closeWidget: (id) => adminApi.post(`/widgets/${id}/close`),
}

const demoWidgetsService = {
  getWidgets: async (filters = {}) => {
    await delay()
    let filtered = [...demoWidgets]
    if (filters.widget_type) {
      filtered = filtered.filter(w => w.type === filters.widget_type)
    }
    if (filters.is_active !== undefined) {
      filtered = filtered.filter(w => w.is_active === filters.is_active)
    }
    const page = filters.page || 1
    const pageSize = filters.page_size || 20
    const start = (page - 1) * pageSize
    return { items: filtered.slice(start, start + pageSize), total: filtered.length, page, page_size: pageSize, total_pages: Math.ceil(filtered.length / pageSize) }
  },
  getWidget: async (id) => {
    await delay()
    return demoWidgets.find(w => w.id === id) || null
  },
  createWidget: async (data) => {
    await delay()
    return { id: Date.now().toString(), title: data.title }
  },
  updateWidget: async (id, data) => {
    await delay()
    return { message: 'Widget updated', id }
  },
  deleteWidget: async (id) => {
    await delay()
    return { message: 'Widget deleted' }
  },
  publishWidget: async (id) => {
    await delay()
    return { message: 'Widget published', id }
  },
  unpublishWidget: async (id) => {
    await delay()
    return { message: 'Widget unpublished', id }
  },
  reorderWidgets: async (orderData) => {
    await delay()
    return { message: 'Widgets reordered' }
  },
  getMyWidgets: async (pagePath) => {
    await delay()
    let filtered = demoWidgets.filter(w => w.is_active)
    if (pagePath) {
      filtered = filtered.filter(w => w.target_pages.length === 0 || w.target_pages.some(p => pagePath.startsWith(p)))
    }
    return { items: filtered, total: filtered.length }
  },
  createPersonalWidget: async (data) => {
    await delay()
    return { id: Date.now().toString(), title: data.title }
  },
  updatePersonalWidget: async (id, data) => {
    await delay()
    return { message: 'Widget updated', id }
  },
  deletePersonalWidget: async (id) => {
    await delay()
    return { message: 'Widget deleted' }
  },
  updateWidgetPosition: async (id, position) => {
    await delay()
    return { message: 'Position updated' }
  },
  closeWidget: async (id) => {
    await delay()
    return { message: 'Widget closed' }
  },
}

// ============================================
// Podcasts Service (extracted from Content Service)
// ============================================

const apiPodcastsService = {
  getPodcasts: (filters) => apiContentService.getPodcasts(filters),
  getPodcast: (id) => apiContentService.getPodcast(id),
  createPodcast: (data) => apiContentService.createPodcast(data),
  updatePodcast: (id, data) => apiContentService.updatePodcast(id, data),
  deletePodcast: (id) => apiContentService.deletePodcast(id),
  getEpisodes: (podcastId, filters) => apiContentService.getEpisodes(podcastId, filters),
  getEpisode: (podcastId, episodeId) => apiContentService.getEpisode(podcastId, episodeId),
  createEpisode: (podcastId, data) => apiContentService.createEpisode(podcastId, data),
  updateEpisode: (podcastId, episodeId, data) => apiContentService.updateEpisode(podcastId, episodeId, data),
  deleteEpisode: (podcastId, episodeId) => apiContentService.deleteEpisode(podcastId, episodeId),
}

const demoPodcastsService = {
  getPodcasts: (filters) => demoContentService.getPodcasts(filters),
  getPodcast: (id) => demoContentService.getPodcast(id),
  createPodcast: (data) => demoContentService.createPodcast(data),
  updatePodcast: (id, data) => demoContentService.updatePodcast(id, data),
  deletePodcast: (id) => demoContentService.deletePodcast(id),
  getEpisodes: (podcastId, filters) => demoContentService.getEpisodes(podcastId, filters),
  getEpisode: (podcastId, episodeId) => demoContentService.getEpisode(podcastId, episodeId),
  createEpisode: (podcastId, data) => demoContentService.createEpisode(podcastId, data),
  updateEpisode: (podcastId, episodeId, data) => demoContentService.updateEpisode(podcastId, episodeId, data),
  deleteEpisode: (podcastId, episodeId) => demoContentService.deleteEpisode(podcastId, episodeId),
}

// ============================================
// Exports
// ============================================

// Export services
// Demo mode can be toggled via config for development
export const dashboardService = isDemo ? demoDashboardService : apiDashboardService
export const usersService = apiUsersService
export const campaignsService = isDemo ? demoCampaignsService : apiCampaignsService
export const billingService = isDemo ? demoBillingService : apiBillingService
export const subscriptionsService = isDemo ? demoSubscriptionsService : apiSubscriptionsService
export const marketingService = isDemo ? demoMarketingService : apiMarketingService
export const settingsService = isDemo ? demoSettingsService : apiSettingsService
export const auditLogsService = isDemo ? demoAuditLogsService : apiAuditLogsService

// Content management services
export const contentService = isDemo ? demoContentService : apiContentService
export const podcastsService = isDemo ? demoPodcastsService : apiPodcastsService
export const uploadsService = isDemo ? demoUploadsService : apiUploadsService
export const importService = isDemo ? demoImportService : apiImportService
export const widgetsService = isDemo ? demoWidgetsService : apiWidgetsService

export default {
  dashboard: dashboardService,
  users: usersService,
  campaigns: campaignsService,
  billing: billingService,
  subscriptions: subscriptionsService,
  marketing: marketingService,
  settings: settingsService,
  auditLogs: auditLogsService,
  content: contentService,
  podcasts: podcastsService,
  uploads: uploadsService,
  import: importService,
  widgets: widgetsService,
}
