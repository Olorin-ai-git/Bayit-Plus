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
}

const demoBillingService = {
  getOverview: async () => {
    await delay()
    return {
      today: 3250,
      this_week: 18500,
      this_month: 45200,
      this_year: 245680,
      pending_refunds: 3,
    }
  },
  getTransactions: async (filters = {}) => {
    await delay()
    return { items: demoTransactions, total: demoTransactions.length, page: 1, page_size: 20 }
  },
  getTransaction: async (transactionId) => {
    await delay()
    return demoTransactions.find(t => t.id === transactionId) || null
  },
  getRefunds: async (filters = {}) => {
    await delay()
    return { items: [], total: 0, page: 1, page_size: 20 }
  },
  processRefund: async (transactionId, data) => {
    await delay()
    return { id: Date.now().toString(), transaction_id: transactionId, ...data, status: 'pending' }
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
// Audit Logs Service
// ============================================

const apiAuditLogsService = {
  getLogs: (filters) => adminApi.get('/admin/logs', { params: filters }),
}

const demoAuditLogsService = {
  getLogs: async (filters = {}) => {
    await delay()
    const logs = Array.from({ length: 20 }, (_, i) => ({
      id: `log-${i}`,
      action: ['user.login', 'user.created', 'subscription.created', 'payment.completed', 'settings.updated'][i % 5],
      user_id: `user-${i % 5}`,
      user_name: ['Admin', 'דני כהן', 'שרה לוי', 'יוסי מזרחי'][i % 4],
      ip_address: `192.168.1.${100 + i}`,
      details: {},
      created_at: new Date(Date.now() - i * 3600000).toISOString(),
    }))
    return { items: logs, total: logs.length, page: 1, page_size: 20 }
  },
}

// ============================================
// Exports
// ============================================

export const dashboardService = isDemo ? demoDashboardService : apiDashboardService
export const usersService = isDemo ? demoUsersService : apiUsersService
export const campaignsService = isDemo ? demoCampaignsService : apiCampaignsService
export const billingService = isDemo ? demoBillingService : apiBillingService
export const subscriptionsService = isDemo ? demoSubscriptionsService : apiSubscriptionsService
export const auditLogsService = isDemo ? demoAuditLogsService : apiAuditLogsService

export default {
  dashboard: dashboardService,
  users: usersService,
  campaigns: campaignsService,
  billing: billingService,
  subscriptions: subscriptionsService,
  auditLogs: auditLogsService,
}
