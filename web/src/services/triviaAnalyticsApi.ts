/**
 * Trivia Analytics API Service
 * Client for admin trivia monitoring endpoints
 */

import { api as apiClient } from '@bayit/shared-services/api/client';

export const triviaAnalyticsService = {
  getStats: () =>
    apiClient.get('/admin/trivia/analytics/stats'),

  getRecentTopics: (limit = 20, offset = 0) =>
    apiClient.get('/admin/trivia/analytics/topics', {
      params: { limit, offset },
    }),

  getSessions: (status?: string, limit = 20) =>
    apiClient.get('/admin/trivia/analytics/sessions', {
      params: { status, limit },
    }),

  getContentCoverage: () =>
    apiClient.get('/admin/trivia/analytics/content-coverage'),
};
