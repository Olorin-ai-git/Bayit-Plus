/**
 * Performance Metric Helpers
 * Utility functions for metric processing and formatting
 * Feature: Performance monitoring and optimization
 */

import type {
  PerformanceMetric,
  WebVitalsRating,
  WebVitalsThresholds,
} from '../types/performance-types';

/**
 * Generate unique metric ID
 */
export function generateMetricId(): string {
  return `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Round metric value to specified decimals
 */
export function roundMetric(value: number, decimals: number = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Calculate Web Vitals rating based on thresholds
 */
export function getWebVitalsRating(
  metric: 'FCP' | 'LCP' | 'FID' | 'CLS',
  value: number,
  thresholds: WebVitalsThresholds
): WebVitalsRating {
  const threshold = thresholds[metric];
  if (value <= threshold.good) {
    return 'good';
  } else if (value <= threshold.poor) {
    return 'needs-improvement';
  } else {
    return 'poor';
  }
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format milliseconds to human-readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${roundMetric(ms)}ms`;
  } else if (ms < 60000) {
    return `${roundMetric(ms / 1000)}s`;
  } else {
    return `${roundMetric(ms / 60000)}m`;
  }
}

/**
 * Calculate percentile from array of values
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

/**
 * Calculate average from array of values
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculate median from array of values
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Batch metrics into groups of specified size
 */
export function batchMetrics(
  metrics: PerformanceMetric[],
  batchSize: number
): PerformanceMetric[][] {
  const batches: PerformanceMetric[][] = [];
  for (let i = 0; i < metrics.length; i += batchSize) {
    batches.push(metrics.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Filter metrics by type
 */
export function filterMetricsByType(
  metrics: PerformanceMetric[],
  type: PerformanceMetric['type']
): PerformanceMetric[] {
  return metrics.filter((m) => m.type === type);
}

/**
 * Filter metrics by time range
 */
export function filterMetricsByTimeRange(
  metrics: PerformanceMetric[],
  startTime: number,
  endTime: number
): PerformanceMetric[] {
  return metrics.filter((m) => m.timestamp >= startTime && m.timestamp <= endTime);
}

/**
 * Aggregate metrics by type
 */
export function aggregateMetricsByType(
  metrics: PerformanceMetric[]
): Record<string, PerformanceMetric[]> {
  return metrics.reduce((acc, metric) => {
    if (!acc[metric.type]) {
      acc[metric.type] = [];
    }
    acc[metric.type].push(metric);
    return acc;
  }, {} as Record<string, PerformanceMetric[]>);
}

/**
 * Check if metric exceeds threshold
 */
export function isMetricAboveThreshold(
  value: number,
  threshold: number
): boolean {
  return value > threshold;
}

/**
 * Sanitize metric metadata for safe transmission
 */
export function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(metadata)) {
    // Remove circular references and functions
    if (typeof value !== 'function' && value !== undefined) {
      try {
        sanitized[key] = JSON.parse(JSON.stringify(value));
      } catch {
        sanitized[key] = String(value);
      }
    }
  }
  return sanitized;
}
