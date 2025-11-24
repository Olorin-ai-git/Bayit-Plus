/**
 * Performance Monitoring Types
 * Type definitions for performance metrics and monitoring
 * Feature: Performance monitoring and optimization
 */

/**
 * Base performance metric
 */
export interface PerformanceMetric {
  id: string;
  timestamp: number;
  type: 'navigation' | 'resource' | 'interaction' | 'web-vitals' | 'network' | 'error' | 'memory';
  value: number;
  metadata?: Record<string, any>;
}

/**
 * Service-specific performance metrics
 */
export interface ServiceMetrics {
  serviceName: string;
  navigationTiming?: NavigationTimingMetrics;
  resourceTimings: ResourceTimingMetrics[];
  interactions: UserInteractionMetric[];
  webVitals?: WebVitalsMetrics;
  networkMetrics: NetworkMetric[];
  errors: ErrorMetric[];
  memoryUsage?: MemoryMetric;
}

/**
 * Navigation timing metrics
 */
export interface NavigationTimingMetrics {
  dnsLookup: number;
  tcpConnection: number;
  serverResponse: number;
  domContentLoaded: number;
  domComplete: number;
  loadComplete: number;
  totalLoadTime: number;
}

/**
 * Resource timing metrics
 */
export interface ResourceTimingMetrics {
  name: string;
  type: string;
  duration: number;
  size?: number;
  cached: boolean;
  startTime: number;
  endTime: number;
}

/**
 * User interaction metrics
 */
export interface UserInteractionMetric {
  type: 'click' | 'input' | 'scroll' | 'navigation';
  target: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Web Vitals metrics (Core Web Vitals)
 */
export interface WebVitalsMetrics {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
}

/**
 * Network request metrics
 */
export interface NetworkMetric {
  url: string;
  method: string;
  status?: number;
  duration: number;
  size?: number;
  timestamp: number;
  cached: boolean;
  error?: string;
}

/**
 * Error metrics
 */
export interface ErrorMetric {
  message: string;
  stack?: string;
  timestamp: number;
  source?: string;
  line?: number;
  column?: number;
}

/**
 * Memory usage metrics
 */
export interface MemoryMetric {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitorConfig {
  endpoint: string;
  apiKey: string;
  batchSize: number;
  flushInterval: number;
  maxMetrics: number;
  enableWebVitals: boolean;
  enableResourceTiming: boolean;
  enableUserTiming: boolean;
  enableMemoryMonitoring: boolean;
  enableNetworkMonitoring: boolean;
  serviceName?: string;
}

/**
 * Performance observer entry types
 */
export type PerformanceEntryType =
  | 'navigation'
  | 'resource'
  | 'mark'
  | 'measure'
  | 'paint'
  | 'largest-contentful-paint'
  | 'first-input'
  | 'layout-shift';

/**
 * Web Vitals rating (good, needs-improvement, poor)
 */
export type WebVitalsRating = 'good' | 'needs-improvement' | 'poor';

/**
 * Web Vitals thresholds
 */
export interface WebVitalsThresholds {
  FCP: { good: number; poor: number };
  LCP: { good: number; poor: number };
  FID: { good: number; poor: number };
  CLS: { good: number; poor: number };
}

/**
 * Performance budget
 */
export interface PerformanceBudget {
  FCP?: number;
  LCP?: number;
  FID?: number;
  CLS?: number;
  totalLoadTime?: number;
  resourceSize?: number;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  timestamp: number;
  serviceName: string;
  metrics: ServiceMetrics;
  budget?: PerformanceBudget;
  violations: string[];
}
