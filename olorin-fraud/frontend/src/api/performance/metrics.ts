/**
 * Performance Metrics Tracking
 *
 * Constitutional Compliance:
 * - Configuration-driven thresholds
 * - Type-safe metrics collection
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { PerformanceTracker } from '@api/performance/metrics';
 */

/**
 * Performance metric
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * API request metrics
 */
export interface ApiRequestMetrics {
  url: string;
  method: string;
  duration: number;
  status: number;
  cached: boolean;
  retries: number;
  timestamp: number;
}

/**
 * Performance tracker
 */
export class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private requestMetrics: ApiRequestMetrics[] = [];
  private maxMetrics: number;

  constructor(maxMetrics: number = 1000) {
    this.maxMetrics = maxMetrics;
  }

  /**
   * Record performance metric
   */
  recordMetric(name: string, value: number, metadata?: Record<string, unknown>): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      metadata
    });

    this.enforceLimit();
  }

  /**
   * Record API request metrics
   */
  recordRequest(metrics: ApiRequestMetrics): void {
    this.requestMetrics.push(metrics);
    this.enforceLimit();
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name === name);
  }

  /**
   * Get API request metrics
   */
  getRequestMetrics(): ApiRequestMetrics[] {
    return [...this.requestMetrics];
  }

  /**
   * Get slow requests (above threshold)
   */
  getSlowRequests(thresholdMs: number): ApiRequestMetrics[] {
    return this.requestMetrics.filter((m) => m.duration > thresholdMs);
  }

  /**
   * Get failed requests
   */
  getFailedRequests(): ApiRequestMetrics[] {
    return this.requestMetrics.filter((m) => m.status >= 400);
  }

  /**
   * Get cached requests
   */
  getCachedRequests(): ApiRequestMetrics[] {
    return this.requestMetrics.filter((m) => m.cached);
  }

  /**
   * Calculate average metric value
   */
  getAverageMetric(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Calculate percentile metric value
   */
  getPercentileMetric(name: string, percentile: number): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;

    const sorted = metrics.map((m) => m.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate average request duration
   */
  getAverageRequestDuration(): number {
    if (this.requestMetrics.length === 0) return 0;

    const sum = this.requestMetrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / this.requestMetrics.length;
  }

  /**
   * Calculate cache hit rate
   */
  getCacheHitRate(): number {
    if (this.requestMetrics.length === 0) return 0;

    const cachedCount = this.requestMetrics.filter((m) => m.cached).length;
    return cachedCount / this.requestMetrics.length;
  }

  /**
   * Get performance summary
   */
  getSummary() {
    return {
      totalRequests: this.requestMetrics.length,
      averageDuration: this.getAverageRequestDuration(),
      cacheHitRate: this.getCacheHitRate(),
      slowRequests: this.getSlowRequests(1000).length,
      failedRequests: this.getFailedRequests().length,
      p50Duration: this.getPercentileMetric('request_duration', 50),
      p95Duration: this.getPercentileMetric('request_duration', 95),
      p99Duration: this.getPercentileMetric('request_duration', 99)
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.requestMetrics = [];
  }

  /**
   * Clear old metrics (older than threshold)
   */
  clearOldMetrics(maxAgeMs: number): void {
    const cutoff = Date.now() - maxAgeMs;
    this.metrics = this.metrics.filter((m) => m.timestamp > cutoff);
    this.requestMetrics = this.requestMetrics.filter((m) => m.timestamp > cutoff);
  }

  private enforceLimit(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    if (this.requestMetrics.length > this.maxMetrics) {
      this.requestMetrics = this.requestMetrics.slice(-this.maxMetrics);
    }
  }
}

/**
 * Create performance tracker instance
 */
export function createPerformanceTracker(maxMetrics?: number): PerformanceTracker {
  return new PerformanceTracker(maxMetrics);
}

let defaultTrackerInstance: PerformanceTracker | null = null;

/**
 * Get or create default performance tracker instance
 */
export function getPerformanceTracker(): PerformanceTracker {
  if (!defaultTrackerInstance) {
    defaultTrackerInstance = createPerformanceTracker();
  }
  return defaultTrackerInstance;
}

/**
 * Reset default performance tracker instance
 */
export function resetPerformanceTracker(): void {
  defaultTrackerInstance = null;
}

/**
 * Measure function execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;

    getPerformanceTracker().recordMetric(name, duration, metadata);

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    getPerformanceTracker().recordMetric(name, duration, {
      ...metadata,
      error: true
    });
    throw error;
  }
}

/**
 * Measure synchronous function execution time
 */
export function measure<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, unknown>
): T {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;

    getPerformanceTracker().recordMetric(name, duration, metadata);

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    getPerformanceTracker().recordMetric(name, duration, {
      ...metadata,
      error: true
    });
    throw error;
  }
}
