/**
 * Voice Management API Service
 * Client for all voice management endpoints
 */

import { api as apiClient } from '@bayit/shared-services/api/client';

export const voiceManagementService = {
  // ============ CONFIGURATION ============

  getVoiceConfig: () =>
    apiClient.get('/admin/voice-management/config'),

  updateVoiceConfig: (update: {
    config_key: string;
    config_value: string;
    config_type: string;
    language?: string;
    platform?: string;
    description?: string;
  }) =>
    apiClient.patch('/admin/voice-management/config', update),

  testVoice: (voiceId: string, text: string, language: string) =>
    apiClient.post('/admin/voice-management/config/test', {
      voice_id: voiceId,
      text,
      language,
    }),

  // ============ VOICE LIBRARY ============

  getAvailableVoices: (language?: string, forceRefresh = false) =>
    apiClient.get('/admin/voice-management/voices/available', {
      params: { language, force_refresh: forceRefresh },
    }),

  previewVoice: (voiceId: string, text?: string, language = 'en') =>
    apiClient.get(`/admin/voice-management/voices/${voiceId}/preview`, {
      params: { text, language },
    }),

  assignVoiceToRole: (voiceId: string, role: string, language?: string) =>
    apiClient.post('/admin/voice-management/voices/assign', {
      voice_id: voiceId,
      role,
      language,
    }),

  // ============ ANALYTICS ============

  getRealtimeSessions: (limit = 50, status?: string) =>
    apiClient.get('/admin/voice-management/analytics/realtime-sessions', {
      params: { limit, status },
    }),

  getUsageCharts: (period: string, featureType?: string) =>
    apiClient.get('/admin/voice-management/analytics/usage-charts', {
      params: { period, feature_type: featureType },
    }),

  getCostBreakdown: (startDate?: string, endDate?: string) =>
    apiClient.get('/admin/voice-management/analytics/cost-breakdown', {
      params: { start_date: startDate, end_date: endDate },
    }),

  getLatencyMetrics: (period: string) =>
    apiClient.get('/admin/voice-management/analytics/latency-metrics', {
      params: { period },
    }),

  // ============ QUOTAS ============

  getQuotaDefaults: () =>
    apiClient.get('/admin/voice-management/quotas/defaults'),

  updateQuotaDefaults: (update: {
    tier: string;
    subtitle_minutes_per_hour?: number;
    subtitle_minutes_per_day?: number;
    subtitle_minutes_per_month?: number;
    dubbing_minutes_per_hour?: number;
    dubbing_minutes_per_day?: number;
    dubbing_minutes_per_month?: number;
  }) =>
    apiClient.patch('/admin/voice-management/quotas/defaults', update),

  getUserQuota: (userId: string) =>
    apiClient.get(`/admin/voice-management/quotas/user/${userId}`),

  updateUserQuota: (
    userId: string,
    update: {
      subtitle_minutes_per_hour?: number;
      subtitle_minutes_per_day?: number;
      subtitle_minutes_per_month?: number;
      dubbing_minutes_per_hour?: number;
      dubbing_minutes_per_day?: number;
      dubbing_minutes_per_month?: number;
      notes?: string;
    }
  ) =>
    apiClient.patch(`/admin/voice-management/quotas/user/${userId}`, update),

  resetUserQuota: (userId: string) =>
    apiClient.post(`/admin/voice-management/quotas/user/${userId}/reset`),

  // ============ SETTINGS ============

  getAPIKeysStatus: () =>
    apiClient.get('/admin/voice-management/settings/api-keys'),

  runHealthCheck: (provider?: string) =>
    apiClient.post('/admin/voice-management/settings/health-check', null, {
      params: { provider },
    }),

  getProviderHealthHistory: (provider?: string, limit = 10) =>
    apiClient.get('/admin/voice-management/settings/provider-health', {
      params: { provider, limit },
    }),

  getWebhookConfiguration: () =>
    apiClient.get('/admin/voice-management/settings/webhooks'),

  getCurrentProviders: () =>
    apiClient.get('/admin/voice-management/settings/current-providers'),
};
