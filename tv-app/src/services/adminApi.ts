/**
 * Admin API Service
 * Provides API endpoints for admin dashboard operations
 */

import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import {
  User,
  Campaign,
  Transaction,
  Refund,
  EmailCampaign,
  PushNotification,
  AuditLog,
  DashboardStats,
  ChartDataPoint,
  SystemSettings,
  Subscription,
  PaginatedResponse,
  AudienceFilter,
} from '../types/rbac';

// API Base URL configuration
const getBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'web') {
      return 'http://localhost:8000/api/v1';
    } else if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000/api/v1';
    } else {
      return 'http://localhost:8000/api/v1';
    }
  }
  return 'https://api.bayit.network/api/v1';
};

// Create admin API instance
const adminApi = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
adminApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
adminApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error.response?.data || error);
  }
);

// ============================================
// Dashboard Service
// ============================================

export const dashboardService = {
  getStats: (): Promise<DashboardStats> =>
    adminApi.get('/admin/dashboard/stats'),

  getRevenueChart: (period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<ChartDataPoint[]> =>
    adminApi.get('/admin/dashboard/charts/revenue', { params: { period } }),

  getUserGrowthChart: (period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<ChartDataPoint[]> =>
    adminApi.get('/admin/dashboard/charts/users', { params: { period } }),

  getRecentActivity: (limit: number = 10): Promise<AuditLog[]> =>
    adminApi.get('/admin/dashboard/activity', { params: { limit } }),
};

// ============================================
// Users Service
// ============================================

export interface UsersFilter {
  search?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'all';
  subscription?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export const usersService = {
  getUsers: (filters?: UsersFilter): Promise<PaginatedResponse<User>> =>
    adminApi.get('/admin/users', { params: filters }),

  getUser: (userId: string): Promise<User> =>
    adminApi.get(`/admin/users/${userId}`),

  createUser: (data: Partial<User> & { password: string }): Promise<User> =>
    adminApi.post('/admin/users', data),

  updateUser: (userId: string, data: Partial<User>): Promise<User> =>
    adminApi.put(`/admin/users/${userId}`, data),

  deleteUser: (userId: string): Promise<void> =>
    adminApi.delete(`/admin/users/${userId}`),

  resetPassword: (userId: string): Promise<{ message: string }> =>
    adminApi.post(`/admin/users/${userId}/reset-password`),

  updateRole: (userId: string, role: string, permissions?: string[]): Promise<User> =>
    adminApi.put(`/admin/users/${userId}/role`, { role, permissions }),

  banUser: (userId: string, reason: string): Promise<User> =>
    adminApi.post(`/admin/users/${userId}/ban`, { reason }),

  unbanUser: (userId: string): Promise<User> =>
    adminApi.post(`/admin/users/${userId}/unban`),

  getUserActivity: (userId: string, limit?: number): Promise<AuditLog[]> =>
    adminApi.get(`/admin/users/${userId}/activity`, { params: { limit } }),

  getUserBillingHistory: (userId: string): Promise<Transaction[]> =>
    adminApi.get(`/admin/users/${userId}/billing`),
};

// ============================================
// Campaigns Service
// ============================================

export interface CampaignsFilter {
  search?: string;
  type?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export const campaignsService = {
  getCampaigns: (filters?: CampaignsFilter): Promise<PaginatedResponse<Campaign>> =>
    adminApi.get('/admin/campaigns', { params: filters }),

  getCampaign: (campaignId: string): Promise<Campaign> =>
    adminApi.get(`/admin/campaigns/${campaignId}`),

  createCampaign: (data: Partial<Campaign>): Promise<Campaign> =>
    adminApi.post('/admin/campaigns', data),

  updateCampaign: (campaignId: string, data: Partial<Campaign>): Promise<Campaign> =>
    adminApi.put(`/admin/campaigns/${campaignId}`, data),

  deleteCampaign: (campaignId: string): Promise<void> =>
    adminApi.delete(`/admin/campaigns/${campaignId}`),

  activateCampaign: (campaignId: string): Promise<Campaign> =>
    adminApi.post(`/admin/campaigns/${campaignId}/activate`),

  deactivateCampaign: (campaignId: string): Promise<Campaign> =>
    adminApi.post(`/admin/campaigns/${campaignId}/deactivate`),

  getCampaignStats: (campaignId: string): Promise<{
    redemptions: number;
    revenue_impact: number;
    conversion_rate: number;
  }> =>
    adminApi.get(`/admin/campaigns/${campaignId}/stats`),

  validatePromoCode: (code: string): Promise<Campaign | null> =>
    adminApi.get('/admin/campaigns/validate', { params: { code } }),
};

// ============================================
// Billing Service
// ============================================

export interface BillingFilter {
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  page?: number;
  page_size?: number;
}

export const billingService = {
  getOverview: (): Promise<{
    today: number;
    this_week: number;
    this_month: number;
    this_year: number;
    pending_refunds: number;
  }> =>
    adminApi.get('/admin/billing/overview'),

  getTransactions: (filters?: BillingFilter): Promise<PaginatedResponse<Transaction>> =>
    adminApi.get('/admin/billing/transactions', { params: filters }),

  getTransaction: (transactionId: string): Promise<Transaction> =>
    adminApi.get(`/admin/billing/transactions/${transactionId}`),

  getRefunds: (filters?: BillingFilter): Promise<PaginatedResponse<Refund>> =>
    adminApi.get('/admin/billing/refunds', { params: filters }),

  processRefund: (transactionId: string, data: {
    amount: number;
    reason: string;
  }): Promise<Refund> =>
    adminApi.post('/admin/billing/refunds', { transaction_id: transactionId, ...data }),

  approveRefund: (refundId: string): Promise<Refund> =>
    adminApi.post(`/admin/billing/refunds/${refundId}/approve`),

  rejectRefund: (refundId: string, reason: string): Promise<Refund> =>
    adminApi.post(`/admin/billing/refunds/${refundId}/reject`, { reason }),

  exportTransactions: (filters?: BillingFilter): Promise<Blob> =>
    adminApi.get('/admin/billing/export', {
      params: filters,
      responseType: 'blob',
    }),

  generateInvoice: (transactionId: string): Promise<Blob> =>
    adminApi.get(`/admin/billing/transactions/${transactionId}/invoice`, {
      responseType: 'blob',
    }),
};

// ============================================
// Subscriptions Service
// ============================================

export interface SubscriptionsFilter {
  search?: string;
  plan?: string;
  status?: string;
  renews_before?: string;
  renews_after?: string;
  page?: number;
  page_size?: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  is_active: boolean;
  trial_days: number;
  created_at: string;
}

export const subscriptionsService = {
  getSubscriptions: (filters?: SubscriptionsFilter): Promise<PaginatedResponse<Subscription & { user: User }>> =>
    adminApi.get('/admin/subscriptions', { params: filters }),

  getSubscription: (subscriptionId: string): Promise<Subscription & { user: User }> =>
    adminApi.get(`/admin/subscriptions/${subscriptionId}`),

  updateSubscription: (subscriptionId: string, data: Partial<Subscription>): Promise<Subscription> =>
    adminApi.put(`/admin/subscriptions/${subscriptionId}`, data),

  extendSubscription: (subscriptionId: string, days: number): Promise<Subscription> =>
    adminApi.post(`/admin/subscriptions/${subscriptionId}/extend`, { days }),

  cancelSubscription: (subscriptionId: string, reason?: string): Promise<Subscription> =>
    adminApi.post(`/admin/subscriptions/${subscriptionId}/cancel`, { reason }),

  pauseSubscription: (subscriptionId: string): Promise<Subscription> =>
    adminApi.post(`/admin/subscriptions/${subscriptionId}/pause`),

  resumeSubscription: (subscriptionId: string): Promise<Subscription> =>
    adminApi.post(`/admin/subscriptions/${subscriptionId}/resume`),

  applyDiscount: (subscriptionId: string, discountPercent: number, months: number): Promise<Subscription> =>
    adminApi.post(`/admin/subscriptions/${subscriptionId}/discount`, {
      discount_percent: discountPercent,
      months,
    }),

  // Plans Management
  getPlans: (): Promise<SubscriptionPlan[]> =>
    adminApi.get('/admin/plans'),

  getPlan: (planId: string): Promise<SubscriptionPlan> =>
    adminApi.get(`/admin/plans/${planId}`),

  createPlan: (data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> =>
    adminApi.post('/admin/plans', data),

  updatePlan: (planId: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> =>
    adminApi.put(`/admin/plans/${planId}`, data),

  deletePlan: (planId: string): Promise<void> =>
    adminApi.delete(`/admin/plans/${planId}`),

  // Analytics
  getChurnAnalytics: (): Promise<{
    churn_rate: number;
    churned_users: number;
    at_risk_users: number;
    retention_rate: number;
  }> =>
    adminApi.get('/admin/subscriptions/analytics/churn'),
};

// ============================================
// Marketing Service
// ============================================

export interface MarketingFilter {
  search?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export const marketingService = {
  // Email Campaigns
  getEmailCampaigns: (filters?: MarketingFilter): Promise<PaginatedResponse<EmailCampaign>> =>
    adminApi.get('/admin/marketing/emails', { params: filters }),

  getEmailCampaign: (campaignId: string): Promise<EmailCampaign> =>
    adminApi.get(`/admin/marketing/emails/${campaignId}`),

  createEmailCampaign: (data: Partial<EmailCampaign>): Promise<EmailCampaign> =>
    adminApi.post('/admin/marketing/emails', data),

  updateEmailCampaign: (campaignId: string, data: Partial<EmailCampaign>): Promise<EmailCampaign> =>
    adminApi.put(`/admin/marketing/emails/${campaignId}`, data),

  deleteEmailCampaign: (campaignId: string): Promise<void> =>
    adminApi.delete(`/admin/marketing/emails/${campaignId}`),

  sendEmailCampaign: (campaignId: string): Promise<EmailCampaign> =>
    adminApi.post(`/admin/marketing/emails/${campaignId}/send`),

  scheduleEmailCampaign: (campaignId: string, scheduledAt: string): Promise<EmailCampaign> =>
    adminApi.post(`/admin/marketing/emails/${campaignId}/schedule`, { scheduled_at: scheduledAt }),

  sendTestEmail: (campaignId: string, email: string): Promise<{ success: boolean }> =>
    adminApi.post(`/admin/marketing/emails/${campaignId}/test`, { email }),

  // Push Notifications
  getPushNotifications: (filters?: MarketingFilter): Promise<PaginatedResponse<PushNotification>> =>
    adminApi.get('/admin/marketing/push', { params: filters }),

  getPushNotification: (notificationId: string): Promise<PushNotification> =>
    adminApi.get(`/admin/marketing/push/${notificationId}`),

  createPushNotification: (data: Partial<PushNotification>): Promise<PushNotification> =>
    adminApi.post('/admin/marketing/push', data),

  updatePushNotification: (notificationId: string, data: Partial<PushNotification>): Promise<PushNotification> =>
    adminApi.put(`/admin/marketing/push/${notificationId}`, data),

  deletePushNotification: (notificationId: string): Promise<void> =>
    adminApi.delete(`/admin/marketing/push/${notificationId}`),

  sendPushNotification: (notificationId: string): Promise<PushNotification> =>
    adminApi.post(`/admin/marketing/push/${notificationId}/send`),

  schedulePushNotification: (notificationId: string, scheduledAt: string): Promise<PushNotification> =>
    adminApi.post(`/admin/marketing/push/${notificationId}/schedule`, { scheduled_at: scheduledAt }),

  // Audience Segments
  getAudienceCount: (filter: AudienceFilter): Promise<{ count: number }> =>
    adminApi.post('/admin/marketing/audience/count', filter),

  getSegments: (): Promise<{ id: string; name: string; filter: AudienceFilter; count: number }[]> =>
    adminApi.get('/admin/marketing/segments'),

  createSegment: (data: { name: string; filter: AudienceFilter }): Promise<{ id: string }> =>
    adminApi.post('/admin/marketing/segments', data),

  deleteSegment: (segmentId: string): Promise<void> =>
    adminApi.delete(`/admin/marketing/segments/${segmentId}`),
};

// ============================================
// Settings Service
// ============================================

export const settingsService = {
  getSettings: (): Promise<SystemSettings> =>
    adminApi.get('/admin/settings'),

  updateSettings: (data: Partial<SystemSettings>): Promise<SystemSettings> =>
    adminApi.put('/admin/settings', data),

  getFeatureFlags: (): Promise<Record<string, boolean>> =>
    adminApi.get('/admin/settings/features'),

  updateFeatureFlag: (flag: string, enabled: boolean): Promise<void> =>
    adminApi.put(`/admin/settings/features/${flag}`, { enabled }),
};

// ============================================
// Audit Logs Service
// ============================================

export interface AuditLogsFilter {
  user_id?: string;
  action?: string;
  resource_type?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export const auditLogsService = {
  getLogs: (filters?: AuditLogsFilter): Promise<PaginatedResponse<AuditLog>> =>
    adminApi.get('/admin/logs', { params: filters }),

  exportLogs: (filters?: AuditLogsFilter): Promise<Blob> =>
    adminApi.get('/admin/logs/export', {
      params: filters,
      responseType: 'blob',
    }),
};

// Export all services
export default {
  dashboard: dashboardService,
  users: usersService,
  campaigns: campaignsService,
  billing: billingService,
  subscriptions: subscriptionsService,
  marketing: marketingService,
  settings: settingsService,
  auditLogs: auditLogsService,
};
