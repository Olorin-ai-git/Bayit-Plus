/**
 * Navigation Timing Observer
 * Monitors page navigation performance metrics
 * Feature: Performance monitoring and optimization
 */

import type { NavigationTimingMetrics } from '../types/performance-types';
import { roundMetric } from '../utils/metric-helpers';

/**
 * Get navigation timing metrics from Performance API
 */
export function getNavigationTiming(): NavigationTimingMetrics | null {
  if (!window.performance || !window.performance.timing) {
    return null;
  }

  const timing = window.performance.timing;
  const navigationStart = timing.navigationStart;

  return {
    dnsLookup: roundMetric(timing.domainLookupEnd - timing.domainLookupStart),
    tcpConnection: roundMetric(timing.connectEnd - timing.connectStart),
    serverResponse: roundMetric(timing.responseEnd - timing.requestStart),
    domContentLoaded: roundMetric(timing.domContentLoadedEventEnd - navigationStart),
    domComplete: roundMetric(timing.domComplete - navigationStart),
    loadComplete: roundMetric(timing.loadEventEnd - navigationStart),
    totalLoadTime: roundMetric(timing.loadEventEnd - timing.fetchStart),
  };
}

/**
 * Observe navigation timing with callback
 */
export function observeNavigationTiming(
  callback: (metrics: NavigationTimingMetrics) => void
): void {
  if (document.readyState === 'complete') {
    const metrics = getNavigationTiming();
    if (metrics) {
      callback(metrics);
    }
  } else {
    window.addEventListener('load', () => {
      // Wait for load event to complete
      setTimeout(() => {
        const metrics = getNavigationTiming();
        if (metrics) {
          callback(metrics);
        }
      }, 0);
    });
  }
}

/**
 * Check if navigation timing is supported
 */
export function isNavigationTimingSupported(): boolean {
  return !!(window.performance && window.performance.timing);
}
