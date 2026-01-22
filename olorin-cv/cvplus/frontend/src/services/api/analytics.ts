/**
 * Analytics API Methods
 * Endpoints for tracking events and retrieving analytics data
 */

import { apiClient } from './client';
import { AnalyticsSummary } from './types';

export const analyticsAPI = {
  track: async (eventType: string, metadata?: object) => {
    const { data } = await apiClient.post('/analytics/track', {
      event_type: eventType,
      metadata,
    });
    return data;
  },

  getSummary: async (days = 30): Promise<AnalyticsSummary> => {
    const { data } = await apiClient.get<AnalyticsSummary>(`/analytics/summary?days=${days}`);
    return data;
  },

  getProfileAnalytics: async (profileId: string) => {
    const { data } = await apiClient.get(`/analytics/profile/${profileId}`);
    return data;
  },

  getCVMetrics: async (cvId: string) => {
    const { data } = await apiClient.get(`/analytics/cv/${cvId}/metrics`);
    return data;
  },
};
