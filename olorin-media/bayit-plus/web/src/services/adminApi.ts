/**
 * Web-specific Admin API Service
 * Uses the factory pattern with the web app's auth store
 */

import { createAdminApi } from '@bayit/shared/services/adminApi';
import { useAuthStore } from '@/stores/authStore';

// Re-export all types from shared
export type {
  AuthStore,
  UsersFilter,
  CampaignsFilter,
  BillingFilter,
  SubscriptionsFilter,
  SubscriptionPlan,
  MarketingFilter,
  MarketingMetrics,
  RecentCampaign,
  AudienceSegment,
  AuditLogsFilter,
  ContentFilter,
  Content,
  CategoryFilter,
  Category,
  WidgetFilter,
  Widget,
  PodcastFilter,
  Podcast,
  PodcastEpisodeFilter,
  PodcastEpisode,
  TranslationStatusResponse,
  FailedTranslationItem,
  LiveQuotaData,
  LiveUsageSession,
  TopUser,
} from '@bayit/shared/services/adminApi';

// Re-export RBAC types
export type {
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
} from '@bayit/shared/types/rbac';

// Create admin API instance with web-specific auth store
const adminApiServices = createAdminApi(useAuthStore);

// Export all services
export const {
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
  liveChannels: adminLiveChannelsService,
  radioStations: adminRadioStationsService,
  uploads: uploadsService,
} = adminApiServices;

// Export default for convenience
export default adminApiServices;
