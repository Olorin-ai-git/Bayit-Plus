/**
 * Performance Observer Setup
 * Setup and cleanup functions for performance observers
 * Feature: Performance monitoring and optimization
 */

import type { PerformanceMonitorConfig, PerformanceMetric } from '../types/performance-types';
import { observeNavigationTiming, isNavigationTimingSupported } from '../observers/navigation-observer';
import { observeResourceTiming, isResourceTimingSupported } from '../observers/resource-observer';
import { observeUserInteractions, isInteractionTrackingSupported } from '../observers/interaction-observer';
import { observeMemoryUsage, isMemoryMonitoringSupported } from '../observers/memory-observer';
import { observeWebVitals, isWebVitalsSupported } from '../observers/web-vitals-observer';
import { interceptFetch, interceptXHR, isNetworkMonitoringSupported } from '../observers/network-observer';

/**
 * Observer cleanup functions
 */
export interface ObserverCleanup {
  resourceObserver: PerformanceObserver | null;
  cleanupInteractions: (() => void) | null;
  cleanupWebVitals: (() => void) | null;
  cleanupMemory: (() => void) | null;
  cleanupNetwork: (() => void) | null;
  cleanupXHR: (() => void) | null;
}

/**
 * Setup navigation timing observer
 */
export function setupNavigationObserver(
  onMetric: (metric: Partial<PerformanceMetric>) => void,
  onNavigationTiming: (metrics: any) => void
): void {
  if (!isNavigationTimingSupported()) return;

  observeNavigationTiming((metrics) => {
    onNavigationTiming(metrics);
    onMetric({
      type: 'navigation',
      value: metrics.totalLoadTime,
      metadata: metrics,
    });
  });
}

/**
 * Setup resource timing observer
 */
export function setupResourceObserver(
  config: PerformanceMonitorConfig,
  onMetric: (metric: Partial<PerformanceMetric>) => void,
  onResourceTiming: (metrics: any) => void
): PerformanceObserver | null {
  if (!config.enableResourceTiming || !isResourceTimingSupported()) {
    return null;
  }

  return observeResourceTiming((metrics) => {
    onResourceTiming(metrics);
    onMetric({
      type: 'resource',
      value: metrics.duration,
      metadata: metrics,
    });
  });
}

/**
 * Setup user interaction observer
 */
export function setupInteractionObserver(
  onMetric: (metric: Partial<PerformanceMetric>) => void,
  onInteraction: (interaction: any) => void
): (() => void) | null {
  if (!isInteractionTrackingSupported()) return null;

  return observeUserInteractions((metric) => {
    onInteraction(metric);
    onMetric({
      type: 'interaction',
      value: metric.duration || 0,
      metadata: metric,
    });
  });
}

/**
 * Setup Web Vitals observer
 */
export function setupWebVitalsObserver(
  config: PerformanceMonitorConfig,
  onMetric: (metric: Partial<PerformanceMetric>) => void,
  onWebVitals: (metrics: any) => void
): (() => void) | null {
  if (!config.enableWebVitals || !isWebVitalsSupported()) {
    return null;
  }

  return observeWebVitals((metrics) => {
    onWebVitals(metrics);
    Object.entries(metrics).forEach(([key, value]) => {
      onMetric({
        type: 'web-vitals',
        value: value as number,
        metadata: { metric: key },
      });
    });
  });
}

/**
 * Setup memory observer
 */
export function setupMemoryObserver(
  config: PerformanceMonitorConfig,
  onMetric: (metric: Partial<PerformanceMetric>) => void,
  onMemory: (metric: any) => void
): (() => void) | null {
  if (!config.enableMemoryMonitoring || !isMemoryMonitoringSupported()) {
    return null;
  }

  const intervalMs = parseInt(
    process.env.REACT_APP_PERFORMANCE_MEMORY_INTERVAL_MS || '60000',
    10
  );

  return observeMemoryUsage((metric) => {
    onMemory(metric);
    onMetric({
      type: 'memory',
      value: metric.usedJSHeapSize,
      metadata: metric,
    });
  }, intervalMs);
}

/**
 * Setup network observer
 */
export function setupNetworkObserver(
  config: PerformanceMonitorConfig,
  onMetric: (metric: Partial<PerformanceMetric>) => void,
  onNetwork: (metric: any) => void
): { cleanupFetch: (() => void) | null; cleanupXHR: (() => void) | null } {
  if (!config.enableNetworkMonitoring || !isNetworkMonitoringSupported()) {
    return { cleanupFetch: null, cleanupXHR: null };
  }

  const cleanupFetch = interceptFetch((metric) => {
    onNetwork(metric);
    onMetric({
      type: 'network',
      value: metric.duration,
      metadata: metric,
    });
  });

  const cleanupXHR = interceptXHR((metric) => {
    onNetwork(metric);
    onMetric({
      type: 'network',
      value: metric.duration,
      metadata: metric,
    });
  });

  return { cleanupFetch, cleanupXHR };
}

/**
 * Cleanup all observers
 */
export function cleanupObservers(cleanup: ObserverCleanup): void {
  if (cleanup.resourceObserver) {
    cleanup.resourceObserver.disconnect();
  }

  if (cleanup.cleanupInteractions) {
    cleanup.cleanupInteractions();
  }

  if (cleanup.cleanupWebVitals) {
    cleanup.cleanupWebVitals();
  }

  if (cleanup.cleanupMemory) {
    cleanup.cleanupMemory();
  }

  if (cleanup.cleanupNetwork) {
    cleanup.cleanupNetwork();
  }

  if (cleanup.cleanupXHR) {
    cleanup.cleanupXHR();
  }
}
