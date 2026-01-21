/**
 * Performance Monitor and Logging
 * Comprehensive performance tracking and logging utilities
 */

// Performance metric types
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  category: 'render' | 'api' | 'memory' | 'user' | 'business';
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface RenderMetric extends PerformanceMetric {
  category: 'render';
  componentName: string;
  renderType: 'mount' | 'update' | 'unmount';
  props?: Record<string, unknown>;
}

export interface ApiMetric extends PerformanceMetric {
  category: 'api';
  endpoint: string;
  method: string;
  status: number;
  cached?: boolean;
  retryCount?: number;
}

export interface MemoryMetric extends PerformanceMetric {
  category: 'memory';
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss?: number;
}

export interface UserMetric extends PerformanceMetric {
  category: 'user';
  action: string;
  elementId?: string;
  path?: string;
  investigationId?: string;
}

export interface BusinessMetric extends PerformanceMetric {
  category: 'business';
  investigationId: string;
  phase?: string;
  evidenceCount?: number;
  domainCount?: number;
}

// Performance thresholds
export interface PerformanceThresholds {
  renderTime: {
    warning: number;
    critical: number;
  };
  apiResponse: {
    warning: number;
    critical: number;
  };
  memoryUsage: {
    warning: number;
    critical: number;
  };
  bundleSize: {
    warning: number;
    critical: number;
  };
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  renderTime: {
    warning: 100, // 100ms
    critical: 500, // 500ms
  },
  apiResponse: {
    warning: 2000, // 2 seconds
    critical: 10000, // 10 seconds
  },
  memoryUsage: {
    warning: 100 * 1024 * 1024, // 100MB
    critical: 500 * 1024 * 1024, // 500MB
  },
  bundleSize: {
    warning: 5 * 1024 * 1024, // 5MB
    critical: 10 * 1024 * 1024, // 10MB
  },
};

/**
 * Performance data collector and analyzer
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private timers = new Map<string, number>();
  private counters = new Map<string, number>();
  private thresholds: PerformanceThresholds;
  private maxMetrics = 1000;
  private reportingInterval: NodeJS.Timeout | null = null;

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.initializeObservers();
    this.startPeriodicReporting();
  }

  /**
   * Start timing a performance operation
   */
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * End timing and record metric
   */
  endTimer(
    name: string,
    category: PerformanceMetric['category'] = 'render',
    tags?: Record<string, string>
  ): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer ${name} was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    this.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      category,
      tags,
    });

    return duration;
  }

  /**
   * Record a custom metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep metrics within limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Check thresholds and log warnings
    this.checkThresholds(metric);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      this.logMetric(metric);
    }
  }

  /**
   * Record render performance
   */
  recordRender(
    componentName: string,
    renderType: RenderMetric['renderType'],
    duration: number,
    props?: Record<string, unknown>
  ): void {
    this.recordMetric({
      name: `render.${componentName}`,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      category: 'render',
      componentName,
      renderType,
      props,
    } as RenderMetric);
  }

  /**
   * Record API call performance
   */
  recordApiCall(
    endpoint: string,
    method: string,
    duration: number,
    status: number,
    options: {
      cached?: boolean;
      retryCount?: number;
      requestSize?: number;
      responseSize?: number;
    } = {}
  ): void {
    this.recordMetric({
      name: `api.${method}.${endpoint}`,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      category: 'api',
      endpoint,
      method,
      status,
      ...options,
    } as ApiMetric);
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(): void {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;

      this.recordMetric({
        name: 'memory.usage',
        value: memInfo.usedJSHeapSize,
        unit: 'bytes',
        timestamp: Date.now(),
        category: 'memory',
        heapUsed: memInfo.usedJSHeapSize,
        heapTotal: memInfo.totalJSHeapSize,
        external: memInfo.totalJSHeapSize - memInfo.usedJSHeapSize,
      } as MemoryMetric);
    }
  }

  /**
   * Record user action
   */
  recordUserAction(
    action: string,
    options: {
      elementId?: string;
      path?: string;
      investigationId?: string;
      duration?: number;
    } = {}
  ): void {
    this.recordMetric({
      name: `user.${action}`,
      value: options.duration || 1,
      unit: options.duration ? 'ms' : 'count',
      timestamp: Date.now(),
      category: 'user',
      action,
      ...options,
    } as UserMetric);
  }

  /**
   * Record business metric
   */
  recordBusinessMetric(
    name: string,
    value: number,
    investigationId: string,
    options: {
      phase?: string;
      evidenceCount?: number;
      domainCount?: number;
      unit?: PerformanceMetric['unit'];
    } = {}
  ): void {
    this.recordMetric({
      name: `business.${name}`,
      value,
      unit: options.unit || 'count',
      timestamp: Date.now(),
      category: 'business',
      investigationId,
      ...options,
    } as BusinessMetric);
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, increment = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + increment);
  }

  /**
   * Get counter value
   */
  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  /**
   * Get metrics by category
   */
  getMetrics(category?: PerformanceMetric['category']): PerformanceMetric[] {
    if (category) {
      return this.metrics.filter(m => m.category === category);
    }
    return [...this.metrics];
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalMetrics: number;
    categories: Record<string, number>;
    averages: Record<string, number>;
    thresholdViolations: number;
    memoryUsage?: {
      current: number;
      peak: number;
      average: number;
    };
  } {
    const categories: Record<string, number> = {};
    const metricSums: Record<string, { total: number; count: number }> = {};
    let thresholdViolations = 0;

    this.metrics.forEach(metric => {
      // Category counts
      categories[metric.category] = (categories[metric.category] || 0) + 1;

      // Metric averages
      const key = `${metric.category}.${metric.name}`;
      if (!metricSums[key]) {
        metricSums[key] = { total: 0, count: 0 };
      }
      metricSums[key].total += metric.value;
      metricSums[key].count += 1;

      // Threshold violations
      if (this.isThresholdViolation(metric)) {
        thresholdViolations++;
      }
    });

    const averages: Record<string, number> = {};
    Object.entries(metricSums).forEach(([key, { total, count }]) => {
      averages[key] = total / count;
    });

    // Memory usage summary
    const memoryMetrics = this.getMetrics('memory') as MemoryMetric[];
    let memoryUsage;
    if (memoryMetrics.length > 0) {
      const memoryValues = memoryMetrics.map(m => m.heapUsed);
      memoryUsage = {
        current: memoryValues[memoryValues.length - 1] || 0,
        peak: Math.max(...memoryValues),
        average: memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length,
      };
    }

    return {
      totalMetrics: this.metrics.length,
      categories,
      averages,
      thresholdViolations,
      memoryUsage,
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const summary = this.getSummary();
    const now = new Date().toISOString();

    const report = [
      `Performance Report - ${now}`,
      '='.repeat(50),
      `Total Metrics: ${summary.totalMetrics}`,
      `Threshold Violations: ${summary.thresholdViolations}`,
      '',
      'Categories:',
      ...Object.entries(summary.categories).map(([cat, count]) => `  ${cat}: ${count}`),
      '',
      'Average Performance:',
      ...Object.entries(summary.averages)
        .filter(([key]) => key.includes('render') || key.includes('api'))
        .map(([key, avg]) => `  ${key}: ${avg.toFixed(2)}ms`),
    ];

    if (summary.memoryUsage) {
      report.push(
        '',
        'Memory Usage:',
        `  Current: ${(summary.memoryUsage.current / 1024 / 1024).toFixed(2)}MB`,
        `  Peak: ${(summary.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB`,
        `  Average: ${(summary.memoryUsage.average / 1024 / 1024).toFixed(2)}MB`
      );
    }

    return report.join('\n');
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.counters.clear();
    this.timers.clear();
  }

  /**
   * Destroy monitor and cleanup
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }

    this.clear();
  }

  private initializeObservers(): void {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.recordMetric({
                name: 'navigation.load',
                value: navEntry.loadEventEnd - navEntry.loadEventStart,
                unit: 'ms',
                timestamp: Date.now(),
                category: 'render',
                tags: { type: 'page_load' },
              });
            }
          });
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (error) {
        console.warn('Navigation observer not supported:', error);
      }

      // Observe resource timing
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              const duration = resourceEntry.responseEnd - resourceEntry.requestStart;

              if (duration > 0) {
                this.recordMetric({
                  name: 'resource.load',
                  value: duration,
                  unit: 'ms',
                  timestamp: Date.now(),
                  category: 'api',
                  tags: {
                    resource: resourceEntry.name,
                    type: resourceEntry.initiatorType,
                  },
                });
              }
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource observer not supported:', error);
      }
    }
  }

  private startPeriodicReporting(): void {
    // Record memory usage every 30 seconds
    this.reportingInterval = setInterval(() => {
      this.recordMemoryUsage();

      // Clean up old metrics (keep last hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
    }, 30000);
  }

  private checkThresholds(metric: PerformanceMetric): void {
    const isViolation = this.isThresholdViolation(metric);

    if (isViolation) {
      const threshold = this.getThresholdForMetric(metric);
      console.warn(
        `Performance threshold violation: ${metric.name} (${metric.value}${metric.unit}) ` +
        `exceeds ${threshold?.warning || 'unknown'} threshold`
      );
    }
  }

  private isThresholdViolation(metric: PerformanceMetric): boolean {
    const threshold = this.getThresholdForMetric(metric);
    return threshold ? metric.value > threshold.warning : false;
  }

  private getThresholdForMetric(metric: PerformanceMetric): { warning: number; critical: number } | null {
    if (metric.category === 'render' && metric.unit === 'ms') {
      return this.thresholds.renderTime;
    }
    if (metric.category === 'api' && metric.unit === 'ms') {
      return this.thresholds.apiResponse;
    }
    if (metric.category === 'memory' && metric.unit === 'bytes') {
      return this.thresholds.memoryUsage;
    }
    return null;
  }

  private logMetric(metric: PerformanceMetric): void {
    const icon = this.getMetricIcon(metric);
    const threshold = this.getThresholdForMetric(metric);
    const isWarning = threshold && metric.value > threshold.warning;
    const isCritical = threshold && metric.value > threshold.critical;

    const style = isCritical
      ? 'color: red; font-weight: bold'
      : isWarning
      ? 'color: orange; font-weight: bold'
      : 'color: green';

    console.log(
      `%c${icon} ${metric.name}: ${metric.value}${metric.unit}`,
      style,
      metric.tags ? `Tags: ${JSON.stringify(metric.tags)}` : ''
    );
  }

  private getMetricIcon(metric: PerformanceMetric): string {
    switch (metric.category) {
      case 'render': return '⚡';
      case 'api': return '🌐';
      case 'memory': return '💾';
      case 'user': return '👤';
      case 'business': return '📊';
      default: return '📈';
    }
  }
}

/**
 * React component performance profiler
 */
export class ComponentProfiler {
  private static instance: ComponentProfiler;
  private monitor: PerformanceMonitor;

  constructor(monitor: PerformanceMonitor) {
    this.monitor = monitor;
  }

  static getInstance(monitor: PerformanceMonitor): ComponentProfiler {
    if (!ComponentProfiler.instance) {
      ComponentProfiler.instance = new ComponentProfiler(monitor);
    }
    return ComponentProfiler.instance;
  }

  /**
   * Profile a React component render
   */
  profileRender<T>(
    componentName: string,
    renderFn: () => T,
    props?: Record<string, unknown>
  ): T {
    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();

    this.monitor.recordRender(componentName, 'update', endTime - startTime, props);

    return result;
  }

  /**
   * Create a higher-order component profiler
   */
  createProfiledComponent<P>(
    Component: React.ComponentType<P>,
    componentName?: string
  ): React.ComponentType<P> {
    const name = componentName || Component.displayName || Component.name || 'UnknownComponent';

    return (props: P) => {
      React.useEffect(() => {
        const mountTime = performance.now();
        this.monitor.recordRender(name, 'mount', 0);

        return () => {
          const unmountTime = performance.now();
          this.monitor.recordRender(name, 'unmount', unmountTime - mountTime);
        };
      }, []);

      return this.profileRender(name, () => React.createElement(Component, props), props as any);
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export convenience functions
export function startTimer(name: string): void {
  performanceMonitor.startTimer(name);
}

export function endTimer(name: string, category?: PerformanceMetric['category']): number {
  return performanceMonitor.endTimer(name, category);
}

export function recordMetric(metric: PerformanceMetric): void {
  performanceMonitor.recordMetric(metric);
}

export function recordUserAction(action: string, options?: any): void {
  performanceMonitor.recordUserAction(action, options);
}

export function getPerformanceReport(): string {
  return performanceMonitor.generateReport();
}

// Development-only performance helpers
if (process.env.NODE_ENV === 'development') {
  (window as any).__PERFORMANCE_MONITOR__ = performanceMonitor;
  (window as any).__PERFORMANCE_REPORT__ = getPerformanceReport;
}