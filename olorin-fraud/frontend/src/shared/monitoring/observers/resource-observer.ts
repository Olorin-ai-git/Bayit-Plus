/**
 * Resource Timing Observer
 * Monitors resource loading performance (scripts, styles, images, etc.)
 * Feature: Performance monitoring and optimization
 */

import type { ResourceTimingMetrics } from '../types/performance-types';
import { roundMetric } from '../utils/metric-helpers';

/**
 * Convert PerformanceResourceTiming to ResourceTimingMetrics
 */
export function convertResourceTiming(
  entry: PerformanceResourceTiming
): ResourceTimingMetrics {
  return {
    name: entry.name,
    type: entry.initiatorType,
    duration: roundMetric(entry.duration),
    size: entry.transferSize || undefined,
    cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
    startTime: roundMetric(entry.startTime),
    endTime: roundMetric(entry.startTime + entry.duration),
  };
}

/**
 * Get all resource timing entries
 */
export function getResourceTimings(): ResourceTimingMetrics[] {
  if (!window.performance || !window.performance.getEntriesByType) {
    return [];
  }

  const entries = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  return entries.map(convertResourceTiming);
}

/**
 * Observe resource timing entries with PerformanceObserver
 */
export function observeResourceTiming(
  callback: (metrics: ResourceTimingMetrics) => void
): PerformanceObserver | null {
  if (!window.PerformanceObserver) {
    return null;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const metrics = convertResourceTiming(entry as PerformanceResourceTiming);
          callback(metrics);
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
    return observer;
  } catch (error) {
    console.error('Failed to observe resource timing:', error);
    return null;
  }
}

/**
 * Filter resource timings by type
 */
export function filterResourcesByType(
  resources: ResourceTimingMetrics[],
  type: string
): ResourceTimingMetrics[] {
  return resources.filter((r) => r.type === type);
}

/**
 * Get slow resources (duration above threshold)
 */
export function getSlowResources(
  resources: ResourceTimingMetrics[],
  thresholdMs: number
): ResourceTimingMetrics[] {
  return resources.filter((r) => r.duration > thresholdMs);
}

/**
 * Get large resources (size above threshold)
 */
export function getLargeResources(
  resources: ResourceTimingMetrics[],
  thresholdBytes: number
): ResourceTimingMetrics[] {
  return resources.filter((r) => r.size && r.size > thresholdBytes);
}

/**
 * Check if resource timing is supported
 */
export function isResourceTimingSupported(): boolean {
  return !!(
    window.performance &&
    window.performance.getEntriesByType &&
    window.PerformanceObserver
  );
}
