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
  return 'https://api.bayit.tv/api/v1';
};

// Create admin API instance
const adminApi = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000, // Reduced from 15s to 10s
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
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      const authStore = useAuthStore.getState();

      // Logout to clear state
      authStore.logout();

      // Redirect to login page (web-specific)
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Store the current URL to redirect back after login
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login')) {
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
    }

    // Reject with a proper error object
    const errorResponse = error.response?.data || {
      message: error.message || 'Request failed',
      status: error.response?.status
    };

    return Promise.reject(errorResponse);
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
    adminApi.patch(`/admin/users/${userId}`, data),

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

export interface MarketingMetrics {
  emailsSent: number;
  emailOpenRate: number;
  emailClickRate: number;
  pushSent: number;
  pushOpenRate: number;
  activeSegments: number;
  conversionRate: number;
  unsubscribeRate: number;
}

export interface RecentCampaign {
  id: string;
  name: string;
  type: 'email' | 'push';
  status: 'active' | 'completed' | 'scheduled' | 'draft';
  sent: number;
  opened: number;
  clicked: number;
}

export interface AudienceSegment {
  name: string;
  count: number;
}

export const marketingService = {
  // Dashboard metrics
  getMetrics: (): Promise<MarketingMetrics> =>
    adminApi.get('/admin/marketing/metrics'),

  getRecentCampaigns: (limit: number = 5): Promise<RecentCampaign[]> =>
    adminApi.get('/admin/marketing/campaigns/recent', { params: { limit } }),

  getAudienceSegments: (): Promise<AudienceSegment[]> =>
    adminApi.get('/admin/marketing/segments/summary'),

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

  clearCache: (): Promise<{ success: boolean }> =>
    adminApi.post('/admin/settings/cache/clear'),

  resetAnalytics: (): Promise<{ success: boolean }> =>
    adminApi.post('/admin/settings/analytics/reset'),
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

// ============================================
// Content Service
// ============================================

export interface ContentFilter {
  search?: string;
  category_id?: string;
  is_featured?: boolean;
  is_published?: boolean;
  is_kids_content?: boolean;
  page?: number;
  page_size?: number;
}

export interface Content {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  backdrop?: string;
  category_id?: string;
  category_name?: string;
  duration?: number;
  year?: number;
  rating?: string;
  genre?: string[];
  cast?: string[];
  director?: string;
  stream_url?: string;
  stream_type?: string;
  is_published?: boolean;
  is_featured?: boolean;
  featured_order?: number;
  requires_subscription?: boolean;
  is_kids_content?: boolean;
  age_rating?: string;
  view_count?: number;
  avg_rating?: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryFilter {
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface Category {
  id: string;
  name: string;
  name_en?: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  order: number;
  is_active: boolean;
  created_at: string;
}

export const adminContentService = {
  // Category management
  getCategories: (filters?: CategoryFilter): Promise<PaginatedResponse<Category>> =>
    adminApi.get('/admin/categories', { params: filters }),

  createCategory: (data: Partial<Category>): Promise<{ id: string; name: string; slug: string }> =>
    adminApi.post('/admin/categories', data),

  updateCategory: (categoryId: string, data: Partial<Category>): Promise<{ message: string; id: string }> =>
    adminApi.patch(`/admin/categories/${categoryId}`, data),

  deleteCategory: (categoryId: string): Promise<{ message: string }> =>
    adminApi.delete(`/admin/categories/${categoryId}`),

  getContent: (filters?: ContentFilter): Promise<PaginatedResponse<Content>> =>
    adminApi.get('/admin/content', { params: filters }),

  getContentHierarchical: (filters?: ContentFilter): Promise<PaginatedResponse<Content>> =>
    adminApi.get('/admin/content/hierarchical', { params: filters }),

  getContentById: (contentId: string): Promise<Content> =>
    adminApi.get(`/admin/content/${contentId}`),

  createContent: (data: Partial<Content>): Promise<Content> =>
    adminApi.post('/admin/content', data),

  updateContent: (contentId: string, data: Partial<Content>): Promise<Content> =>
    adminApi.patch(`/admin/content/${contentId}`, data),

  deleteContent: (contentId: string): Promise<void> =>
    adminApi.delete(`/admin/content/${contentId}`),

  publishContent: (contentId: string): Promise<Content> =>
    adminApi.post(`/admin/content/${contentId}/publish`),

  featureContent: (contentId: string): Promise<Content> =>
    adminApi.post(`/admin/content/${contentId}/feature`),

  getSeriesEpisodes: (seriesId: string): Promise<{
    series_id: string;
    series_title: string;
    total_episodes: number;
    episodes: Array<{
      id: string;
      title: string;
      thumbnail?: string;
      duration?: string;
      season?: number;
      episode?: number;
      is_published: boolean;
      is_featured: boolean;
    }>;
  }> =>
    adminApi.get(`/admin/content/${seriesId}/episodes`),

  // Batch operations
  batchDeleteContent: (contentIds: string[]): Promise<{ deleted_count: number }> =>
    adminApi.post('/admin/content/batch/delete', { content_ids: contentIds }),

  batchFeatureContent: (contentIds: string[], featured: boolean): Promise<{ updated_count: number }> =>
    adminApi.post('/admin/content/batch/feature', { content_ids: contentIds, featured }),

  batchPublishContent: (contentIds: string[], published: boolean): Promise<{ updated_count: number }> =>
    adminApi.post('/admin/content/batch/publish', { content_ids: contentIds, published }),
};

// ============================================
// Widgets Service
// ============================================

export interface WidgetFilter {
  widget_type?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface Widget {
  id: string;
  type: string;
  user_id?: string;
  title: string;
  description?: string;
  icon?: string;
  content: {
    content_type: string;
    live_channel_id?: string;
    podcast_id?: string;
    content_id?: string;
    station_id?: string;
    iframe_url?: string;
    iframe_title?: string;
  };
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    z_index?: number;
  };
  is_active: boolean;
  is_muted?: boolean;
  is_visible?: boolean;
  is_closable?: boolean;
  is_draggable?: boolean;
  visible_to_roles?: string[];
  visible_to_subscription_tiers?: string[];
  target_pages?: string[];
  order?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const adminWidgetsService = {
  getWidgets: (filters?: WidgetFilter): Promise<PaginatedResponse<Widget>> =>
    adminApi.get('/admin/widgets', { params: filters }),

  getMyWidgets: (targetPage?: string): Promise<PaginatedResponse<Widget>> =>
    adminApi.get('/widgets', { params: { page_path: targetPage } }),

  getWidget: (widgetId: string): Promise<Widget> =>
    adminApi.get(`/admin/widgets/${widgetId}`),

  createWidget: (data: Partial<Widget>): Promise<Widget> =>
    adminApi.post('/admin/widgets', data),

  updateWidget: (widgetId: string, data: Partial<Widget>): Promise<Widget> =>
    adminApi.patch(`/admin/widgets/${widgetId}`, data),

  deleteWidget: (widgetId: string): Promise<void> =>
    adminApi.delete(`/admin/widgets/${widgetId}`),

  reorderWidgets: (widgets: { id: string; order: number }[]): Promise<void> =>
    adminApi.post('/admin/widgets/reorder', { widgets }),

  publishWidget: (widgetId: string): Promise<Widget> =>
    adminApi.post(`/admin/widgets/${widgetId}/publish`),

  unpublishWidget: (widgetId: string): Promise<Widget> =>
    adminApi.post(`/admin/widgets/${widgetId}/unpublish`),
};

// ============================================
// Podcasts Service
// ============================================

export interface PodcastFilter {
  search?: string;
  category?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface Podcast {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  author?: string;
  author_en?: string;
  author_es?: string;
  cover?: string;
  category?: string;
  category_en?: string;
  category_es?: string;
  rss_feed?: string;
  website?: string;
  episode_count?: number;
  latest_episode_date?: string;
  is_active: boolean;
  order?: number;
  created_at: string;
  updated_at: string;
}

export const adminPodcastsService = {
  getPodcasts: (filters?: PodcastFilter): Promise<PaginatedResponse<Podcast>> =>
    adminApi.get('/admin/podcasts', { params: filters }),

  getPodcast: (podcastId: string): Promise<Podcast> =>
    adminApi.get(`/admin/podcasts/${podcastId}`),

  createPodcast: (data: Partial<Podcast>): Promise<Podcast> =>
    adminApi.post('/admin/podcasts', data),

  updatePodcast: (podcastId: string, data: Partial<Podcast>): Promise<Podcast> =>
    adminApi.patch(`/admin/podcasts/${podcastId}`, data),

  deletePodcast: (podcastId: string): Promise<void> =>
    adminApi.delete(`/admin/podcasts/${podcastId}`),

  // Bulk translation for all podcast episodes
  triggerBulkTranslation: (podcastId: string): Promise<{
    status: string;
    podcast_id: string;
    episodes_queued: number;
    total_eligible: number;
    message: string;
  }> =>
    adminApi.post(`/admin/podcasts/${podcastId}/translate-all`),
};

// ============================================
// Podcast Episodes Service
// ============================================

export interface PodcastEpisodeFilter {
  translation_status?: 'pending' | 'processing' | 'completed' | 'failed';
  page?: number;
  page_size?: number;
}

export interface PodcastEpisode {
  id: string;
  podcast_id: string;
  title: string;
  description?: string;
  audio_url?: string;
  duration?: string;
  episode_number?: number;
  season_number?: number;
  published_at: string;
  thumbnail?: string;
  translation_status?: 'pending' | 'processing' | 'completed' | 'failed';
  available_languages?: string[];
  original_language?: string;
  retry_count?: number;
}

export interface TranslationStatusResponse {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export interface FailedTranslationItem {
  id: string;
  podcast_id: string;
  podcast_title: string;
  title: string;
  retry_count: number;
  max_retries: number;
  updated_at: string;
}

export const adminPodcastEpisodesService = {
  getEpisodes: (
    podcastId: string,
    filters?: PodcastEpisodeFilter
  ): Promise<PaginatedResponse<PodcastEpisode>> =>
    adminApi.get(`/admin/podcasts/${podcastId}/episodes`, { params: filters }),

  getEpisode: (podcastId: string, episodeId: string): Promise<PodcastEpisode> =>
    adminApi.get(`/admin/podcasts/${podcastId}/episodes/${episodeId}`),

  createEpisode: (
    podcastId: string,
    data: Partial<PodcastEpisode>
  ): Promise<{ id: string; title: string; podcast_id: string }> =>
    adminApi.post(`/admin/podcasts/${podcastId}/episodes`, data),

  updateEpisode: (
    podcastId: string,
    episodeId: string,
    data: Partial<PodcastEpisode>
  ): Promise<{ message: string; id: string }> =>
    adminApi.patch(`/admin/podcasts/${podcastId}/episodes/${episodeId}`, data),

  deleteEpisode: (podcastId: string, episodeId: string): Promise<{ message: string }> =>
    adminApi.delete(`/admin/podcasts/${podcastId}/episodes/${episodeId}`),

  // Translation operations
  triggerTranslation: (
    podcastId: string,
    episodeId: string
  ): Promise<{ status: string; episode_id: string; message: string }> =>
    adminApi.post(`/admin/podcasts/${podcastId}/episodes/${episodeId}/translate`),

  getTranslationStatus: (): Promise<TranslationStatusResponse> =>
    adminApi.get('/admin/translation/status'),

  getFailedTranslations: (params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<FailedTranslationItem>> =>
    adminApi.get('/admin/translation/failed', { params }),
};

// ============================================
// Live Quotas Service
// ============================================

export interface LiveQuotaData {
  user_id: string;
  subtitle_minutes_per_hour: number;
  subtitle_minutes_per_day: number;
  subtitle_minutes_per_month: number;
  dubbing_minutes_per_hour: number;
  dubbing_minutes_per_day: number;
  dubbing_minutes_per_month: number;
  subtitle_usage_current_hour: number;
  subtitle_usage_current_day: number;
  subtitle_usage_current_month: number;
  dubbing_usage_current_hour: number;
  dubbing_usage_current_day: number;
  dubbing_usage_current_month: number;
  accumulated_subtitle_minutes: number;
  accumulated_dubbing_minutes: number;
  estimated_cost_current_month: number;
  warning_threshold_percentage: number;
  notes?: string;
  limit_extended_by?: string;
  limit_extended_at?: string;
}

export interface LiveUsageSession {
  session_id: string;
  user_id: string;
  channel_id: string;
  feature_type: 'subtitle' | 'dubbing';
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  audio_seconds_processed: number;
  estimated_total_cost: number;
  status: string;
}

export interface TopUser {
  user_id: string;
  user_name: string;
  user_email: string;
  subtitle_minutes: number;
  dubbing_minutes: number;
  total_cost: number;
}

export const liveQuotasService = {
  getUserQuota: (userId: string): Promise<{ quota: LiveQuotaData; usage: LiveQuotaData }> =>
    adminApi.get(`/admin/live-quotas/users/${userId}`),

  updateUserLimits: (
    userId: string,
    limits: Partial<LiveQuotaData>,
    notes?: string
  ): Promise<{ success: boolean }> =>
    adminApi.patch(`/admin/live-quotas/users/${userId}`, { limits, notes }),

  resetUserQuota: (userId: string): Promise<{ success: boolean }> =>
    adminApi.post(`/admin/live-quotas/users/${userId}/reset`),

  getUsageReport: (params: {
    start_date: string;
    end_date: string;
    feature_type?: 'subtitle' | 'dubbing';
  }): Promise<{
    total_sessions: number;
    total_minutes: number;
    total_cost: number;
    sessions: LiveUsageSession[];
  }> =>
    adminApi.get('/admin/live-quotas/usage-report', { params }),

  getTopUsers: (params: {
    start_date: string;
    end_date: string;
    limit?: number;
  }): Promise<TopUser[]> =>
    adminApi.get('/admin/live-quotas/top-users', { params }),

  getSystemStats: (): Promise<{
    total_users_with_quotas: number;
    active_sessions: number;
    total_subtitle_minutes_today: number;
    total_dubbing_minutes_today: number;
    total_cost_today: number;
    total_cost_month: number;
  }> =>
    adminApi.get('/admin/live-quotas/system-stats'),
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
  content: adminContentService,
  widgets: adminWidgetsService,
  podcasts: adminPodcastsService,
  podcastEpisodes: adminPodcastEpisodesService,
  liveQuotas: liveQuotasService,
};
