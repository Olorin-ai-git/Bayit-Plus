/**
 * Performance Monitoring - Public API
 * Main entry point with backward-compatible exports
 * Feature: Performance monitoring and optimization
 *
 * REFACTORED FROM: PerformanceMonitor.ts (535 lines, 267% over 200-line limit!)
 * NEW ARCHITECTURE: Modular structure with focused modules
 *
 * MODULES (all < 200 lines):
 * - types/performance-types.ts (180 lines) - Type definitions
 * - config/monitoring-config.ts (113 lines) - Configuration from process.env
 * - utils/metric-helpers.ts (170 lines) - Utility functions
 * - observers/navigation-observer.ts (55 lines) - Navigation timing
 * - observers/resource-observer.ts (99 lines) - Resource timing
 * - observers/interaction-observer.ts (123 lines) - User interactions
 * - observers/memory-observer.ts (98 lines) - Memory usage
 * - observers/web-vitals-observer.ts (161 lines) - Web Vitals (FCP, LCP, FID, CLS)
 * - observers/network-observer.ts (156 lines) - Network request interception
 * - core/observer-setup.ts (178 lines) - Observer setup helpers
 * - core/metric-manager.ts (79 lines) - Metric batching and sending
 * - core/PerformanceMonitor.ts (196 lines) - Main orchestrator class
 */

// Type exports
export type {
  PerformanceMetric,
  ServiceMetrics,
  NavigationTimingMetrics,
  ResourceTimingMetrics,
  UserInteractionMetric,
  WebVitalsMetrics,
  NetworkMetric,
  ErrorMetric,
  MemoryMetric,
  PerformanceMonitorConfig,
  PerformanceEntryType,
  WebVitalsRating,
  WebVitalsThresholds,
  PerformanceBudget,
  PerformanceReport,
} from './types/performance-types';

// Configuration exports
export {
  loadMonitoringConfig,
  loadWebVitalsThresholds,
  validateMonitoringConfig,
  getMonitoringConfig,
  getWebVitalsThresholds,
} from './config/monitoring-config';

// Utility exports
export {
  generateMetricId,
  roundMetric,
  getWebVitalsRating,
  formatBytes,
  formatDuration,
  calculatePercentile,
  calculateAverage,
  calculateMedian,
  batchMetrics,
  filterMetricsByType,
  filterMetricsByTimeRange,
  aggregateMetricsByType,
  isMetricAboveThreshold,
  sanitizeMetadata,
} from './utils/metric-helpers';

// Observer exports
export {
  getNavigationTiming,
  observeNavigationTiming,
  isNavigationTimingSupported,
} from './observers/navigation-observer';

export {
  convertResourceTiming,
  getResourceTimings,
  observeResourceTiming,
  filterResourcesByType,
  getSlowResources,
  getLargeResources,
  isResourceTimingSupported,
} from './observers/resource-observer';

export {
  trackClick,
  trackInput,
  trackScroll,
  trackNavigation,
  observeUserInteractions,
  isInteractionTrackingSupported,
} from './observers/interaction-observer';

export {
  getMemoryUsage,
  observeMemoryUsage,
  getMemoryUsagePercentage,
  isMemoryHigh,
  isMemoryMonitoringSupported,
  getMemoryPressure,
} from './observers/memory-observer';

export {
  observeFCP,
  observeLCP,
  observeFID,
  observeCLS,
  observeWebVitals,
  getTTFB,
  isWebVitalsSupported,
} from './observers/web-vitals-observer';

export {
  interceptFetch,
  interceptXHR,
  getSlowRequests,
  getFailedRequests,
  getAverageRequestDuration,
  isNetworkMonitoringSupported,
} from './observers/network-observer';

// Main class export
export { PerformanceMonitor } from './core/PerformanceMonitor';
