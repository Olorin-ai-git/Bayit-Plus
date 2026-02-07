/**
 * Analytics Proxy Service - Backend proxy methods for event tracking
 * Extracted from backendProxyService.ts for file size compliance
 */

import { API_BASE_URL } from '../../config/appConfig';
import { useAuthStore } from '@olorin/shared-stores';
import { logger } from '../../utils/logger';
import type { AnalyticsEvent, AnalyticsResponse, BatchTrackingResponse, HealthCheckResponse } from '../../types/backendProxy';

async function getHeaders(): Promise<HeadersInit> {
  const { token } = useAuthStore.getState();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export async function trackEvent(event: AnalyticsEvent): Promise<AnalyticsResponse> {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/analytics/track`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event_name: event.event_name,
        event_category: event.event_category,
        properties: event.properties || {},
        timestamp: event.timestamp || new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analytics tracking failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Analytics tracking error', { module: 'backendProxyService', error });
    throw error;
  }
}

export async function trackBatchEvents(events: AnalyticsEvent[]): Promise<BatchTrackingResponse> {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/analytics/batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify(
        events.map((event) => ({
          event_name: event.event_name,
          event_category: event.event_category,
          properties: event.properties || {},
          timestamp: event.timestamp || new Date().toISOString(),
        }))
      ),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Batch analytics tracking failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Batch analytics tracking error', { module: 'backendProxyService', error });
    throw error;
  }
}

export async function checkAnalyticsHealth(): Promise<HealthCheckResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics/health`, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Analytics health check failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Analytics health check error', { module: 'backendProxyService', error });
    throw error;
  }
}
