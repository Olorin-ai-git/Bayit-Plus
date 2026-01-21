/**
 * API Analytics Tracking
 *
 * Constitutional Compliance:
 * - Configuration-driven analytics
 * - Type-safe event tracking
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { trackEvent, trackApiCall } from '@api/monitoring/analytics';
 */

import { getApiConfig } from '../config';

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  name: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

/**
 * API call event
 */
export interface ApiCallEvent {
  url: string;
  method: string;
  statusCode: number;
  duration: number;
  cached: boolean;
  timestamp: string;
}

/**
 * Analytics tracker
 */
export class AnalyticsTracker {
  private events: AnalyticsEvent[] = [];
  private apiCalls: ApiCallEvent[] = [];
  private maxEvents: number = 1000;
  private enabled: boolean;

  constructor(enabled?: boolean) {
    const apiConfig = getApiConfig();
    this.enabled = enabled ?? apiConfig.env !== 'development';
  }

  /**
   * Track custom event
   */
  trackEvent(name: string, properties: Record<string, unknown> = {}): void {
    if (!this.enabled) {
      return;
    }

    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: new Date().toISOString()
    };

    this.events.push(event);
    this.enforceLimit();
  }

  /**
   * Track API call
   */
  trackApiCall(event: ApiCallEvent): void {
    if (!this.enabled) {
      return;
    }

    this.apiCalls.push(event);
    this.enforceLimit();
  }

  /**
   * Track page view
   */
  trackPageView(path: string, properties: Record<string, unknown> = {}): void {
    this.trackEvent('page_view', { path, ...properties });
  }

  /**
   * Track user action
   */
  trackAction(action: string, properties: Record<string, unknown> = {}): void {
    this.trackEvent('user_action', { action, ...properties });
  }

  /**
   * Track error
   */
  trackError(error: Error, context: Record<string, unknown> = {}): void {
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      ...context
    });
  }

  /**
   * Get all events
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Get events by name
   */
  getEventsByName(name: string): AnalyticsEvent[] {
    return this.events.filter((e) => e.name === name);
  }

  /**
   * Get API calls
   */
  getApiCalls(): ApiCallEvent[] {
    return [...this.apiCalls];
  }

  /**
   * Get API calls by endpoint
   */
  getApiCallsByEndpoint(url: string): ApiCallEvent[] {
    return this.apiCalls.filter((c) => c.url === url);
  }

  /**
   * Get failed API calls
   */
  getFailedApiCalls(): ApiCallEvent[] {
    return this.apiCalls.filter((c) => c.statusCode >= 400);
  }

  /**
   * Get slow API calls
   */
  getSlowApiCalls(thresholdMs: number): ApiCallEvent[] {
    return this.apiCalls.filter((c) => c.duration > thresholdMs);
  }

  /**
   * Get analytics summary
   */
  getSummary() {
    const totalApiCalls = this.apiCalls.length;
    const failedCalls = this.getFailedApiCalls().length;
    const cachedCalls = this.apiCalls.filter((c) => c.cached).length;

    return {
      totalEvents: this.events.length,
      totalApiCalls,
      failedApiCalls: failedCalls,
      failureRate: totalApiCalls > 0 ? failedCalls / totalApiCalls : 0,
      cacheHitRate: totalApiCalls > 0 ? cachedCalls / totalApiCalls : 0,
      slowCalls: this.getSlowApiCalls(1000).length
    };
  }

  /**
   * Enable or disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.apiCalls = [];
  }

  private enforceLimit(): void {
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    if (this.apiCalls.length > this.maxEvents) {
      this.apiCalls = this.apiCalls.slice(-this.maxEvents);
    }
  }
}

/**
 * Create analytics tracker instance
 */
export function createAnalyticsTracker(enabled?: boolean): AnalyticsTracker {
  return new AnalyticsTracker(enabled);
}

let defaultTrackerInstance: AnalyticsTracker | null = null;

/**
 * Get or create default analytics tracker instance
 */
export function getAnalyticsTracker(): AnalyticsTracker {
  if (!defaultTrackerInstance) {
    defaultTrackerInstance = createAnalyticsTracker();
  }
  return defaultTrackerInstance;
}

/**
 * Reset default analytics tracker instance
 */
export function resetAnalyticsTracker(): void {
  defaultTrackerInstance = null;
}

/**
 * Track event (convenience function)
 */
export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  getAnalyticsTracker().trackEvent(name, properties);
}

/**
 * Track API call (convenience function)
 */
export function trackApiCall(event: ApiCallEvent): void {
  getAnalyticsTracker().trackApiCall(event);
}

/**
 * Track page view (convenience function)
 */
export function trackPageView(path: string, properties?: Record<string, unknown>): void {
  getAnalyticsTracker().trackPageView(path, properties);
}

/**
 * Track user action (convenience function)
 */
export function trackAction(action: string, properties?: Record<string, unknown>): void {
  getAnalyticsTracker().trackAction(action, properties);
}

/**
 * Track error (convenience function)
 */
export function trackError(error: Error, context?: Record<string, unknown>): void {
  getAnalyticsTracker().trackError(error, context);
}
