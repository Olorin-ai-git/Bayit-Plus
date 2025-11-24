<<<<<<< HEAD
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  service: string;
  tags?: Record<string, string>;
}

export interface ServiceMetrics {
  service: string;
  startupTime: number;
  moduleLoadTime: number;
  renderTime: number;
  memoryUsage: number;
  bundleSize: number;
  timestamp: number;
}

export interface UserInteractionMetric {
  action: string;
  service: string;
  responseTime: number;
  success: boolean;
  timestamp: number;
}

export interface NetworkMetric {
  service: string;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  size: number;
  timestamp: number;
}

export interface ErrorMetric {
  service: string;
  error: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private serviceMetrics: Map<string, ServiceMetrics> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();
  private isEnabled: boolean = true;
  private maxMetrics: number = 1000;
  private batchSize: number = 50;
  private flushInterval: number = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor(
    private serviceName: string,
    private options?: {
      endpoint?: string;
      apiKey?: string;
      batchSize?: number;
      flushInterval?: number;
      maxMetrics?: number;
      enableWebVitals?: boolean;
    }
  ) {
    this.batchSize = options?.batchSize || this.batchSize;
    this.flushInterval = options?.flushInterval || this.flushInterval;
    this.maxMetrics = options?.maxMetrics || this.maxMetrics;

    if (typeof window !== 'undefined') {
      this.initializeMonitoring();
    }
  }

  private initializeMonitoring(): void {
    console.log(`[PerformanceMonitor] Initializing for service: ${this.serviceName}`);

    // Start periodic flushing
    this.startPeriodicFlush();

    // Monitor navigation timing
    this.monitorNavigationTiming();

    // Monitor resource loading
    this.monitorResourceTiming();

    // Monitor user interactions
    this.monitorUserInteractions();

    // Monitor memory usage
    this.monitorMemoryUsage();

    // Monitor Web Vitals if enabled
    if (this.options?.enableWebVitals) {
      this.monitorWebVitals();
    }

    // Monitor Module Federation loading
    this.monitorModuleFederation();

    // Monitor network requests
    this.monitorNetworkRequests();

    // Handle page visibility changes
    this.handleVisibilityChange();
  }

  private monitorNavigationTiming(): void {
    if (!window.performance || !window.performance.timing) return;

    const timing = window.performance.timing;
    const navigationStart = timing.navigationStart;

    const metrics = [
      {
        name: 'dom_content_loaded',
        value: timing.domContentLoadedEventEnd - navigationStart,
        unit: 'ms'
      },
      {
        name: 'load_complete',
        value: timing.loadEventEnd - navigationStart,
        unit: 'ms'
      },
      {
        name: 'first_byte',
        value: timing.responseStart - navigationStart,
        unit: 'ms'
      },
      {
        name: 'dom_interactive',
        value: timing.domInteractive - navigationStart,
        unit: 'ms'
      }
    ];

    metrics.forEach(metric => {
      if (metric.value > 0) {
        this.recordMetric({
          ...metric,
          service: this.serviceName,
          timestamp: Date.now()
        });
      }
    });
  }

  private monitorResourceTiming(): void {
    if (!window.performance || !window.performance.getEntriesByType) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;

          this.recordMetric({
            name: 'resource_load_time',
            value: resourceEntry.duration,
            unit: 'ms',
            service: this.serviceName,
            timestamp: Date.now(),
            tags: {
              resource_type: this.getResourceType(resourceEntry.name),
              resource_name: resourceEntry.name.split('/').pop() || 'unknown'
            }
          });

          // Track transfer size if available
          if (resourceEntry.transferSize) {
            this.recordMetric({
              name: 'resource_transfer_size',
              value: resourceEntry.transferSize,
              unit: 'bytes',
              service: this.serviceName,
              timestamp: Date.now(),
              tags: {
                resource_type: this.getResourceType(resourceEntry.name),
                resource_name: resourceEntry.name.split('/').pop() || 'unknown'
              }
            });
          }
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
    this.observers.set('resource', observer);
  }

  private monitorUserInteractions(): void {
    if (!window.performance || !window.performance.getEntriesByType) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'event') {
          const eventEntry = entry as PerformanceEventTiming;

          this.recordMetric({
            name: 'user_interaction_delay',
            value: eventEntry.processingStart - eventEntry.startTime,
            unit: 'ms',
            service: this.serviceName,
            timestamp: Date.now(),
            tags: {
              event_type: eventEntry.name,
              target: eventEntry.target?.tagName?.toLowerCase() || 'unknown'
            }
          });
        }
      });
    });

    observer.observe({ entryTypes: ['event'] });
    this.observers.set('event', observer);
  }

  private monitorMemoryUsage(): void {
    if (!('memory' in performance)) return;

    const collectMemoryMetrics = () => {
      const memory = (performance as any).memory;

      this.recordMetric({
        name: 'heap_used',
        value: memory.usedJSHeapSize,
        unit: 'bytes',
        service: this.serviceName,
        timestamp: Date.now()
      });

      this.recordMetric({
        name: 'heap_total',
        value: memory.totalJSHeapSize,
        unit: 'bytes',
        service: this.serviceName,
        timestamp: Date.now()
      });

      this.recordMetric({
        name: 'heap_limit',
        value: memory.jsHeapSizeLimit,
        unit: 'bytes',
        service: this.serviceName,
        timestamp: Date.now()
      });
    };

    // Collect immediately and then every 30 seconds
    collectMemoryMetrics();
    setInterval(collectMemoryMetrics, 30000);
  }

  private monitorWebVitals(): void {
    // First Contentful Paint
    this.observePerformanceEntry('paint', (entry) => {
      if (entry.name === 'first-contentful-paint') {
        this.recordMetric({
          name: 'first_contentful_paint',
          value: entry.startTime,
          unit: 'ms',
          service: this.serviceName,
          timestamp: Date.now()
        });
      }
    });

    // Largest Contentful Paint
    this.observePerformanceEntry('largest-contentful-paint', (entry) => {
      this.recordMetric({
        name: 'largest_contentful_paint',
        value: entry.startTime,
        unit: 'ms',
        service: this.serviceName,
        timestamp: Date.now()
      });
    });

    // Cumulative Layout Shift
    this.observePerformanceEntry('layout-shift', (entry) => {
      if (!(entry as any).hadRecentInput) {
        this.recordMetric({
          name: 'cumulative_layout_shift',
          value: (entry as any).value,
          unit: 'score',
          service: this.serviceName,
          timestamp: Date.now()
        });
      }
    });

    // First Input Delay
    this.observePerformanceEntry('first-input', (entry) => {
      this.recordMetric({
        name: 'first_input_delay',
        value: (entry as any).processingStart - entry.startTime,
        unit: 'ms',
        service: this.serviceName,
        timestamp: Date.now()
      });
    });
  }

  private monitorModuleFederation(): void {
    // Module Federation monitoring temporarily disabled to prevent webpack_require access errors
    // TODO: Re-implement with proper webpack runtime detection
    return;
  }

  private monitorNetworkRequests(): void {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    const self = this;

    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const startTime = performance.now();
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';

      return originalFetch.call(this, input, init).then(
        (response) => {
          const responseTime = performance.now() - startTime;

          self.recordNetworkMetric({
            service: self.serviceName,
            endpoint: url,
            method,
            responseTime,
            statusCode: response.status,
            size: parseInt(response.headers.get('content-length') || '0'),
            timestamp: Date.now()
          });

          return response;
        },
        (error) => {
          const responseTime = performance.now() - startTime;

          self.recordNetworkMetric({
            service: self.serviceName,
            endpoint: url,
            method,
            responseTime,
            statusCode: 0,
            size: 0,
            timestamp: Date.now()
          });

          throw error;
        }
      );
    };
  }

  private observePerformanceEntry(entryType: string, callback: (entry: PerformanceEntry) => void): void {
    if (!window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(callback);
      });

      observer.observe({ entryTypes: [entryType] });
      this.observers.set(entryType, observer);
    } catch (error) {
      console.warn(`[PerformanceMonitor] Failed to observe ${entryType}:`, error);
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.includes('remoteEntry.js')) return 'module-federation';
    return 'other';
  }

  private handleVisibilityChange(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush(); // Flush metrics when page becomes hidden
      }
    });

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  public recordMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) return;

    this.metrics.push(metric);

    // Prevent memory leaks by limiting stored metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Emit event for real-time monitoring
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('performance:metric', metric, this.serviceName);
    }
  }

  public recordServiceMetric(serviceMetric: ServiceMetrics): void {
    this.serviceMetrics.set(serviceMetric.service, serviceMetric);

    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('performance:service', serviceMetric, this.serviceName);
    }
  }

  public recordUserInteraction(interaction: UserInteractionMetric): void {
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('performance:interaction', interaction, this.serviceName);
    }
  }

  public recordNetworkMetric(networkMetric: NetworkMetric): void {
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('performance:network', networkMetric, this.serviceName);
    }
  }

  public recordError(error: ErrorMetric): void {
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.emit('performance:error', error, this.serviceName);
    }
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getServiceMetrics(): Map<string, ServiceMetrics> {
    return new Map(this.serviceMetrics);
  }

  public getSummary(): {
    totalMetrics: number;
    avgResponseTime: number;
    errorRate: number;
    memoryUsage: number;
  } {
    const networkMetrics = this.metrics.filter(m => m.name.includes('response_time'));
    const errorMetrics = this.metrics.filter(m => m.name.includes('error'));
    const memoryMetrics = this.metrics.filter(m => m.name === 'heap_used');

    return {
      totalMetrics: this.metrics.length,
      avgResponseTime: networkMetrics.length > 0
        ? networkMetrics.reduce((sum, m) => sum + m.value, 0) / networkMetrics.length
        : 0,
      errorRate: this.metrics.length > 0
        ? (errorMetrics.length / this.metrics.length) * 100
        : 0,
      memoryUsage: memoryMetrics.length > 0
        ? memoryMetrics[memoryMetrics.length - 1].value
        : 0
    };
  }

  public flush(): void {
    if (this.metrics.length === 0) return;

    const metricsToSend = this.metrics.splice(0, this.batchSize);

    if (this.options?.endpoint) {
      this.sendMetrics(metricsToSend);
    }

    console.log(`[PerformanceMonitor] Flushed ${metricsToSend.length} metrics`);
  }

  private async sendMetrics(metrics: PerformanceMetric[]): Promise<void> {
    if (!this.options?.endpoint) return;

    try {
      const payload = {
        service: this.serviceName,
        timestamp: Date.now(),
        metrics: metrics
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.options.apiKey) {
        headers['Authorization'] = `Bearer ${this.options.apiKey}`;
      }

      const response = await fetch(this.options.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error('[PerformanceMonitor] Failed to send metrics:', response.statusText);
      }
    } catch (error) {
      console.error('[PerformanceMonitor] Error sending metrics:', error);
    }
  }

  public enable(): void {
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
  }

  public destroy(): void {
    this.isEnabled = false;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    this.flush(); // Final flush
  }
}
=======
/**
 * LEGACY PerformanceMonitor.ts
 * This file has been SUPERSEDED by the new modular monitoring architecture
 * Feature: Performance monitoring and optimization
 *
 * REFACTORED FROM: 534 lines (267% over 200-line limit!)
 * NEW ARCHITECTURE: 12 focused modules under monitoring/ directory
 *
 * NEW MODULES (all < 200 lines):
 * ✅ types/performance-types.ts (180 lines) - Type definitions
 * ✅ config/monitoring-config.ts (113 lines) - Configuration from process.env
 * ✅ utils/metric-helpers.ts (170 lines) - Utility functions
 * ✅ observers/navigation-observer.ts (55 lines) - Navigation timing
 * ✅ observers/resource-observer.ts (99 lines) - Resource timing
 * ✅ observers/interaction-observer.ts (123 lines) - User interactions
 * ✅ observers/memory-observer.ts (98 lines) - Memory usage
 * ✅ observers/web-vitals-observer.ts (161 lines) - Web Vitals (FCP, LCP, FID, CLS)
 * ✅ observers/network-observer.ts (156 lines) - Network request interception
 * ✅ core/observer-setup.ts (178 lines) - Observer setup helpers
 * ✅ core/metric-manager.ts (79 lines) - Metric batching and sending
 * ✅ core/PerformanceMonitor.ts (196 lines) - Main orchestrator class
 * ✅ index.ts (131 lines) - Public API with re-exports
 *
 * Backward compatibility: All exports maintained via re-exports below
 */

// Re-export all types, classes, and functions from the modular architecture
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

export {
  loadMonitoringConfig,
  loadWebVitalsThresholds,
  validateMonitoringConfig,
  getMonitoringConfig,
  getWebVitalsThresholds,
} from './config/monitoring-config';

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

export { PerformanceMonitor } from './core/PerformanceMonitor';
>>>>>>> 001-modify-analyzer-method
