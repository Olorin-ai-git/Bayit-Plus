import { PerformanceMonitor, ServiceMetrics, UserInteractionMetric, ErrorMetric } from './PerformanceMonitor';

export interface ServiceStartupMetrics {
  service: string;
  moduleLoadStart: number;
  moduleLoadEnd: number;
  dependencyResolveTime: number;
  firstRenderTime: number;
  interactiveTime: number;
  totalStartupTime: number;
}

export interface ComponentPerformanceMetrics {
  componentName: string;
  service: string;
  mountTime: number;
  renderTime: number;
  updateCount: number;
  memoryLeak: boolean;
  timestamp: number;
}

export interface ServiceHealthMetrics {
  service: string;
  cpu: number;
  memory: number;
  responseTime: number;
  errorRate: number;
  availability: number;
  timestamp: number;
}

export class ServicePerformanceTracker {
  private performanceMonitor: PerformanceMonitor;
  private startupMetrics: ServiceStartupMetrics | null = null;
  private componentMetrics: Map<string, ComponentPerformanceMetrics> = new Map();
  private serviceHealth: ServiceHealthMetrics | null = null;
  private errorCount: number = 0;
  private requestCount: number = 0;
  private lastHealthCheck: number = 0;

  constructor(
    private serviceName: string,
    private options?: {
      enableDetailedLogging?: boolean;
      healthCheckInterval?: number;
      componentTracking?: boolean;
    }
  ) {
    this.performanceMonitor = new PerformanceMonitor(serviceName, {
      enableWebVitals: true,
      batchSize: 100,
      flushInterval: 15000
    });

    this.initializeTracking();
  }

  private initializeTracking(): void {
    console.log(`[ServicePerformanceTracker] Initializing tracking for ${this.serviceName}`);

    // Track service startup
    this.trackServiceStartup();

    // Track React component performance if enabled
    if (this.options?.componentTracking) {
      this.trackComponentPerformance();
    }

    // Start health monitoring
    this.startHealthMonitoring();

    // Track service-specific events
    this.trackServiceEvents();

    // Handle service errors
    this.trackServiceErrors();
  }

  private trackServiceStartup(): void {
    const startTime = performance.now();
    const moduleLoadStart = performance.timeOrigin || startTime;

    // Wait for DOM content loaded to measure startup
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.measureStartupComplete(moduleLoadStart, startTime);
      });
    } else {
      this.measureStartupComplete(moduleLoadStart, startTime);
    }

    // Track when service becomes interactive
    this.trackInteractiveTime(startTime);
  }

  private measureStartupComplete(moduleLoadStart: number, startTime: number): void {
    const now = performance.now();
    const loadTime = now - startTime;

    this.startupMetrics = {
      service: this.serviceName,
      moduleLoadStart,
      moduleLoadEnd: now,
      dependencyResolveTime: this.measureDependencyResolveTime(),
      firstRenderTime: this.measureFirstRenderTime(),
      interactiveTime: 0, // Will be updated by trackInteractiveTime
      totalStartupTime: loadTime
    };

    this.performanceMonitor.recordServiceMetric({
      service: this.serviceName,
      startupTime: loadTime,
      moduleLoadTime: this.startupMetrics.dependencyResolveTime,
      renderTime: this.startupMetrics.firstRenderTime,
      memoryUsage: this.getCurrentMemoryUsage(),
      bundleSize: this.estimateBundleSize(),
      timestamp: Date.now()
    });

    if (this.options?.enableDetailedLogging) {
      console.log(`[ServicePerformanceTracker] ${this.serviceName} startup completed:`, this.startupMetrics);
    }
  }

  private measureDependencyResolveTime(): number {
    // Estimate dependency resolve time from resource timing
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const dependencies = resources.filter(resource =>
      resource.name.includes('remoteEntry.js') ||
      resource.name.includes('chunk') ||
      resource.name.includes('vendor')
    );

    return dependencies.reduce((total, resource) => total + resource.duration, 0);
  }

  private measureFirstRenderTime(): number {
    // Try to get FCP (First Contentful Paint)
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');

    return fcp ? fcp.startTime : performance.now();
  }

  private trackInteractiveTime(startTime: number): void {
    // Use requestIdleCallback to detect when the main thread is free
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const interactiveTime = performance.now() - startTime;

        if (this.startupMetrics) {
          this.startupMetrics.interactiveTime = interactiveTime;
        }

        this.performanceMonitor.recordMetric({
          name: 'time_to_interactive',
          value: interactiveTime,
          unit: 'ms',
          service: this.serviceName,
          timestamp: Date.now()
        });
      });
    }
  }

  private trackComponentPerformance(): void {
    // React DevTools profiler integration
    if (typeof window !== 'undefined' && window.React) {
      // Hook into React's performance profiler
      this.setupReactProfiler();
    }

    // Track component mount/unmount times
    this.trackComponentLifecycle();
  }

  private setupReactProfiler(): void {
    // This would integrate with React DevTools Profiler API
    // For now, we'll track basic component metrics

    const originalCreateElement = window.React?.createElement;
    if (!originalCreateElement) return;

    const self = this;

    window.React.createElement = function(type: any, props: any, ...children: any[]) {
      const startTime = performance.now();
      const element = originalCreateElement.call(this, type, props, ...children);
      const renderTime = performance.now() - startTime;

      if (typeof type === 'function' && type.name) {
        self.recordComponentMetric({
          componentName: type.name,
          service: self.serviceName,
          mountTime: startTime,
          renderTime,
          updateCount: 0,
          memoryLeak: false,
          timestamp: Date.now()
        });
      }

      return element;
    };
  }

  private trackComponentLifecycle(): void {
    // Track component mount/unmount for memory leak detection
    const mountedComponents = new Set<string>();

    // Use MutationObserver to track DOM changes
    if (typeof window !== 'undefined' && window.MutationObserver) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                if (element.getAttribute && element.getAttribute('data-component')) {
                  const componentName = element.getAttribute('data-component');
                  mountedComponents.add(componentName);
                }
              }
            });

            mutation.removedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                if (element.getAttribute && element.getAttribute('data-component')) {
                  const componentName = element.getAttribute('data-component');
                  mountedComponents.delete(componentName);
                }
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  private startHealthMonitoring(): void {
    const interval = this.options?.healthCheckInterval || 30000; // 30 seconds

    setInterval(() => {
      this.collectHealthMetrics();
    }, interval);

    // Initial health check
    this.collectHealthMetrics();
  }

  private collectHealthMetrics(): void {
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastHealthCheck;

    // Calculate error rate
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    // Calculate availability (simplified)
    const availability = errorRate < 5 ? 99.9 : Math.max(95, 100 - errorRate);

    this.serviceHealth = {
      service: this.serviceName,
      cpu: this.estimateCPUUsage(),
      memory: this.getCurrentMemoryUsage(),
      responseTime: this.getAverageResponseTime(),
      errorRate,
      availability,
      timestamp: now
    };

    this.performanceMonitor.recordMetric({
      name: 'service_health_score',
      value: availability,
      unit: 'percentage',
      service: this.serviceName,
      timestamp: now,
      tags: {
        error_rate: errorRate.toString(),
        memory_mb: (this.serviceHealth.memory / 1024 / 1024).toFixed(2)
      }
    });

    this.lastHealthCheck = now;

    if (this.options?.enableDetailedLogging) {
      console.log(`[ServicePerformanceTracker] Health check for ${this.serviceName}:`, this.serviceHealth);
    }
  }

  private trackServiceEvents(): void {
    // Track service-specific events via the event bus
    if (window.olorin?.eventBus) {
      window.olorin.eventBus.on('service:request', (data: any) => {
        this.requestCount++;
        this.trackUserInteraction({
          action: 'service_request',
          service: this.serviceName,
          responseTime: data.responseTime || 0,
          success: data.success !== false,
          timestamp: Date.now()
        });
      });

      window.olorin.eventBus.on('service:error', (data: any) => {
        this.errorCount++;
        this.trackError({
          service: this.serviceName,
          error: data.error || 'Unknown error',
          stack: data.stack,
          severity: data.severity || 'medium',
          timestamp: Date.now()
        });
      });
    }
  }

  private trackServiceErrors(): void {
    // Track unhandled errors
    window.addEventListener('error', (event) => {
      this.trackError({
        service: this.serviceName,
        error: event.message,
        stack: event.error?.stack,
        severity: 'high',
        timestamp: Date.now()
      });
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        service: this.serviceName,
        error: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        severity: 'high',
        timestamp: Date.now()
      });
    });
  }

  private getCurrentMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private estimateCPUUsage(): number {
    // Simple CPU estimation based on task scheduling
    const start = performance.now();
    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
      // Simple computation
      Math.random();
    }

    const executionTime = performance.now() - start;

    // Normalize to percentage (very rough estimate)
    return Math.min(100, (executionTime / 10) * 100);
  }

  private estimateBundleSize(): number {
    // Estimate bundle size from loaded resources
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const scripts = resources.filter(resource =>
      resource.name.includes('.js') &&
      (resource.name.includes(this.serviceName) || resource.name.includes('remoteEntry'))
    );

    return scripts.reduce((total, resource) => {
      return total + (resource.transferSize || resource.encodedBodySize || 0);
    }, 0);
  }

  private getAverageResponseTime(): number {
    const summary = this.performanceMonitor.getSummary();
    return summary.avgResponseTime;
  }

  public recordComponentMetric(metric: ComponentPerformanceMetrics): void {
    this.componentMetrics.set(metric.componentName, metric);

    this.performanceMonitor.recordMetric({
      name: 'component_render_time',
      value: metric.renderTime,
      unit: 'ms',
      service: this.serviceName,
      timestamp: metric.timestamp,
      tags: {
        component: metric.componentName
      }
    });
  }

  public trackUserInteraction(interaction: UserInteractionMetric): void {
    this.performanceMonitor.recordUserInteraction(interaction);

    // Track interaction response time
    this.performanceMonitor.recordMetric({
      name: 'user_interaction_response_time',
      value: interaction.responseTime,
      unit: 'ms',
      service: this.serviceName,
      timestamp: interaction.timestamp,
      tags: {
        action: interaction.action,
        success: interaction.success.toString()
      }
    });
  }

  public trackError(error: ErrorMetric): void {
    this.performanceMonitor.recordError(error);

    this.performanceMonitor.recordMetric({
      name: 'error_count',
      value: 1,
      unit: 'count',
      service: this.serviceName,
      timestamp: error.timestamp,
      tags: {
        severity: error.severity,
        error_type: error.error.substring(0, 50)
      }
    });
  }

  public getStartupMetrics(): ServiceStartupMetrics | null {
    return this.startupMetrics;
  }

  public getComponentMetrics(): Map<string, ComponentPerformanceMetrics> {
    return new Map(this.componentMetrics);
  }

  public getServiceHealth(): ServiceHealthMetrics | null {
    return this.serviceHealth;
  }

  public getPerformanceSummary(): {
    startup: ServiceStartupMetrics | null;
    health: ServiceHealthMetrics | null;
    components: number;
    totalErrors: number;
    totalRequests: number;
  } {
    return {
      startup: this.startupMetrics,
      health: this.serviceHealth,
      components: this.componentMetrics.size,
      totalErrors: this.errorCount,
      totalRequests: this.requestCount
    };
  }

  public exportMetrics(): {
    service: string;
    timestamp: number;
    startup: ServiceStartupMetrics | null;
    health: ServiceHealthMetrics | null;
    components: ComponentPerformanceMetrics[];
    performance: ReturnType<PerformanceMonitor['getSummary']>;
  } {
    return {
      service: this.serviceName,
      timestamp: Date.now(),
      startup: this.startupMetrics,
      health: this.serviceHealth,
      components: Array.from(this.componentMetrics.values()),
      performance: this.performanceMonitor.getSummary()
    };
  }

  public destroy(): void {
    this.performanceMonitor.destroy();
    this.componentMetrics.clear();
  }
}