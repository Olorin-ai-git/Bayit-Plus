/**
 * Network Request Observer
 * Intercepts and monitors network requests (fetch API)
 * Feature: Performance monitoring and optimization
 */

import type { NetworkMetric } from '../types/performance-types';
import { roundMetric } from '../utils/metric-helpers';

// Store original fetch for restoration
let originalFetch: typeof fetch;

/**
 * Intercept fetch requests and track metrics
 */
export function interceptFetch(
  callback: (metric: NetworkMetric) => void
): () => void {
  // Store original fetch if not already stored
  if (!originalFetch) {
    originalFetch = window.fetch;
  }

  // Override fetch
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || 'GET';
    const startTime = performance.now();

    try {
      const response = await originalFetch(input, init);
      const endTime = performance.now();
      const duration = roundMetric(endTime - startTime);

      // Get response size from headers
      const contentLength = response.headers.get('content-length');
      const size = contentLength ? parseInt(contentLength, 10) : undefined;

      // Check if cached
      const cached = response.headers.get('x-cache') === 'HIT' ||
                     response.headers.get('cf-cache-status') === 'HIT';

      const metric: NetworkMetric = {
        url,
        method,
        status: response.status,
        duration,
        size,
        timestamp: Date.now(),
        cached,
      };

      callback(metric);
      return response;
    } catch (error) {
      const endTime = performance.now();
      const duration = roundMetric(endTime - startTime);

      // Suppress browser extension errors that are harmless
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isBrowserExtensionError = 
        errorMessage.includes('message channel closed') ||
        errorMessage.includes('asynchronous response') ||
        errorMessage.includes('Extension context invalidated');

      const metric: NetworkMetric = {
        url,
        method,
        duration,
        timestamp: Date.now(),
        cached: false,
        error: isBrowserExtensionError ? 'Browser extension interference' : (error instanceof Error ? error.message : 'Unknown error'),
      };

      callback(metric);
      
      // Don't throw browser extension errors - they're harmless
      // The request may still succeed despite the extension error
      if (isBrowserExtensionError) {
        // Try to continue with the original fetch as a fallback
        // This handles cases where the extension error doesn't actually block the request
        try {
          return await originalFetch(input, init);
        } catch (fallbackError) {
          // If fallback also fails, throw the original error
          throw error;
        }
      }
      
      throw error;
    }
  };

  // Return cleanup function to restore original fetch
  return () => {
    if (originalFetch) {
      window.fetch = originalFetch;
    }
  };
}

/**
 * Track XMLHttpRequest (legacy API)
 */
export function interceptXHR(
  callback: (metric: NetworkMetric) => void
): () => void {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    ...args: any[]
  ) {
    (this as any)._monitorUrl = typeof url === 'string' ? url : url.href;
    (this as any)._monitorMethod = method;
    (this as any)._monitorStartTime = performance.now();
    return originalOpen.apply(this, [method, url, ...args] as any);
  };

  XMLHttpRequest.prototype.send = function (...args: any[]) {
    const xhr = this;

    xhr.addEventListener('loadend', () => {
      const endTime = performance.now();
      const startTime = (xhr as any)._monitorStartTime || endTime;
      const duration = roundMetric(endTime - startTime);

      const metric: NetworkMetric = {
        url: (xhr as any)._monitorUrl || '',
        method: (xhr as any)._monitorMethod || 'GET',
        status: xhr.status,
        duration,
        timestamp: Date.now(),
        cached: false,
      };

      callback(metric);
    });

    return originalSend.apply(this, args);
  };

  // Return cleanup function
  return () => {
    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.send = originalSend;
  };
}

/**
 * Get slow network requests (duration above threshold)
 */
export function getSlowRequests(
  requests: NetworkMetric[],
  thresholdMs: number
): NetworkMetric[] {
  return requests.filter((r) => r.duration > thresholdMs);
}

/**
 * Get failed network requests
 */
export function getFailedRequests(requests: NetworkMetric[]): NetworkMetric[] {
  return requests.filter((r) => r.error || (r.status && r.status >= 400));
}

/**
 * Calculate average request duration
 */
export function getAverageRequestDuration(requests: NetworkMetric[]): number {
  if (requests.length === 0) return 0;
  const total = requests.reduce((sum, r) => sum + r.duration, 0);
  return roundMetric(total / requests.length);
}

/**
 * Check if network monitoring is supported
 */
export function isNetworkMonitoringSupported(): boolean {
  return typeof window.fetch === 'function';
}
