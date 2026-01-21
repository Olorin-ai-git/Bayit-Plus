/**
 * Metric Manager
 * Functions for metric batching and sending
 * Feature: Performance monitoring and optimization
 */

import type { PerformanceMetric, PerformanceMonitorConfig } from '../types/performance-types';
import { batchMetrics } from '../utils/metric-helpers';

/**
 * Send metrics to endpoint
 */
export async function sendMetricsToEndpoint(
  config: PerformanceMonitorConfig,
  metrics: PerformanceMetric[]
): Promise<void> {
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
    },
    body: JSON.stringify({
      serviceName: config.serviceName,
      metrics,
      timestamp: Date.now(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send metrics: ${response.status}`);
  }
}

/**
 * Flush metrics in batches
 */
export async function flushMetricBatches(
  config: PerformanceMonitorConfig,
  metrics: PerformanceMetric[]
): Promise<void> {
  if (metrics.length === 0) return;

  const batches = batchMetrics([...metrics], config.batchSize);

  for (const batch of batches) {
    try {
      await sendMetricsToEndpoint(config, batch);
    } catch (error) {
      console.error('Failed to send metrics batch:', error);
    }
  }
}

/**
 * Enforce max metrics limit
 */
export function enforceMetricsLimit(
  metrics: PerformanceMetric[],
  maxMetrics: number
): PerformanceMetric[] {
  if (metrics.length > maxMetrics) {
    return metrics.slice(-maxMetrics);
  }
  return metrics;
}

/**
 * Setup periodic flush interval
 */
export function setupPeriodicFlush(
  flushCallback: () => void,
  intervalMs: number
): ReturnType<typeof setInterval> {
  return setInterval(flushCallback, intervalMs);
}

/**
 * Setup visibility change handler for flushing on page hide
 */
export function setupVisibilityChangeFlush(flushCallback: () => void): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushCallback();
    }
  });
}
