/**
 * Web Vitals Observer
 * Monitors Core Web Vitals (FCP, LCP, FID, CLS)
 * Feature: Performance monitoring and optimization
 */

import type { WebVitalsMetrics } from '../types/performance-types';
import { roundMetric } from '../utils/metric-helpers';

/**
 * Observe First Contentful Paint (FCP)
 */
export function observeFCP(callback: (value: number) => void): PerformanceObserver | null {
  if (!window.PerformanceObserver) return null;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          callback(roundMetric(entry.startTime));
        }
      }
    });

    observer.observe({ entryTypes: ['paint'] });
    return observer;
  } catch {
    return null;
  }
}

/**
 * Observe Largest Contentful Paint (LCP)
 */
export function observeLCP(callback: (value: number) => void): PerformanceObserver | null {
  if (!window.PerformanceObserver) return null;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      callback(roundMetric(lastEntry.startTime));
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
    return observer;
  } catch {
    return null;
  }
}

/**
 * Observe First Input Delay (FID)
 */
export function observeFID(callback: (value: number) => void): PerformanceObserver | null {
  if (!window.PerformanceObserver) return null;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as any;
        if (fidEntry.processingStart && fidEntry.startTime) {
          const delay = fidEntry.processingStart - fidEntry.startTime;
          callback(roundMetric(delay));
        }
      }
    });

    observer.observe({ entryTypes: ['first-input'] });
    return observer;
  } catch {
    return null;
  }
}

/**
 * Observe Cumulative Layout Shift (CLS)
 */
export function observeCLS(callback: (value: number) => void): PerformanceObserver | null {
  if (!window.PerformanceObserver) return null;

  let clsScore = 0;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as any;
        if (!layoutShiftEntry.hadRecentInput) {
          clsScore += layoutShiftEntry.value || 0;
          callback(roundMetric(clsScore, 4));
        }
      }
    });

    observer.observe({ entryTypes: ['layout-shift'] });
    return observer;
  } catch {
    return null;
  }
}

/**
 * Observe all Web Vitals
 */
export function observeWebVitals(
  callback: (metrics: Partial<WebVitalsMetrics>) => void
): () => void {
  const metrics: Partial<WebVitalsMetrics> = {};
  const observers: PerformanceObserver[] = [];

  // FCP
  const fcpObserver = observeFCP((value) => {
    metrics.FCP = value;
    callback({ ...metrics });
  });
  if (fcpObserver) observers.push(fcpObserver);

  // LCP
  const lcpObserver = observeLCP((value) => {
    metrics.LCP = value;
    callback({ ...metrics });
  });
  if (lcpObserver) observers.push(lcpObserver);

  // FID
  const fidObserver = observeFID((value) => {
    metrics.FID = value;
    callback({ ...metrics });
  });
  if (fidObserver) observers.push(fidObserver);

  // CLS
  const clsObserver = observeCLS((value) => {
    metrics.CLS = value;
    callback({ ...metrics });
  });
  if (clsObserver) observers.push(clsObserver);

  // Return cleanup function
  return () => {
    observers.forEach((observer) => observer.disconnect());
  };
}

/**
 * Get TTFB (Time to First Byte) from Navigation Timing
 */
export function getTTFB(): number | null {
  if (!window.performance || !window.performance.timing) {
    return null;
  }

  const timing = window.performance.timing;
  const ttfb = timing.responseStart - timing.navigationStart;
  return roundMetric(ttfb);
}

/**
 * Check if Web Vitals monitoring is supported
 */
export function isWebVitalsSupported(): boolean {
  return !!window.PerformanceObserver;
}
