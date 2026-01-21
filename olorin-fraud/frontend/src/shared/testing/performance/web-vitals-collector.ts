/**
 * Web Vitals Collector
 * Real-time collection of Core Web Vitals metrics
 * Integrates with the performance testing framework
 */

export interface WebVitalsMetric {
  name: 'FCP' | 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'INP';
  value: number;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'prerender';
}

export interface WebVitalsReport {
  url: string;
  timestamp: string;
  userAgent: string;
  connection: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
  metrics: WebVitalsMetric[];
  performanceEntries: PerformanceEntry[];
  resourceTiming: PerformanceResourceTiming[];
  navigation: PerformanceNavigationTiming;
}

export class WebVitalsCollector {
  private metrics: Map<string, WebVitalsMetric> = new Map();
  private observers: PerformanceObserver[] = [];
  private isCollecting = false;

  constructor() {
    this.setupObservers();
  }

  private setupObservers(): void {
    // First Contentful Paint (FCP)
    this.observePerformanceEntry('paint', (entries) => {
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.recordMetric({
          name: 'FCP',
          value: fcpEntry.startTime,
          delta: fcpEntry.startTime,
          rating: this.rateFCP(fcpEntry.startTime),
          timestamp: Date.now(),
          navigationType: this.getNavigationType()
        });
      }
    });

    // Largest Contentful Paint (LCP)
    this.observePerformanceEntry('largest-contentful-paint', (entries) => {
      const lcpEntry = entries[entries.length - 1];
      if (lcpEntry) {
        this.recordMetric({
          name: 'LCP',
          value: lcpEntry.startTime,
          delta: lcpEntry.startTime,
          rating: this.rateLCP(lcpEntry.startTime),
          timestamp: Date.now(),
          navigationType: this.getNavigationType()
        });
      }
    });

    // First Input Delay (FID)
    this.observePerformanceEntry('first-input', (entries) => {
      const fidEntry = entries[0] as PerformanceEventTiming;
      if (fidEntry) {
        const value = fidEntry.processingStart - fidEntry.startTime;
        this.recordMetric({
          name: 'FID',
          value,
          delta: value,
          rating: this.rateFID(value),
          timestamp: Date.now(),
          navigationType: this.getNavigationType()
        });
      }
    });

    // Cumulative Layout Shift (CLS)
    this.observePerformanceEntry('layout-shift', (entries) => {
      let clsValue = 0;
      let sessionValue = 0;
      let sessionEntries: PerformanceEntry[] = [];

      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          if (!firstSessionEntry ||
              entry.startTime - lastSessionEntry.startTime < 1000 &&
              entry.startTime - firstSessionEntry.startTime < 5000) {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          } else {
            clsValue = Math.max(clsValue, sessionValue);
            sessionValue = entry.value;
            sessionEntries = [entry];
          }
        }
      });

      clsValue = Math.max(clsValue, sessionValue);

      this.recordMetric({
        name: 'CLS',
        value: clsValue,
        delta: clsValue,
        rating: this.rateCLS(clsValue),
        timestamp: Date.now(),
        navigationType: this.getNavigationType()
      });
    });

    // Time to First Byte (TTFB)
    this.observePerformanceEntry('navigation', (entries) => {
      const navEntry = entries[0] as PerformanceNavigationTiming;
      if (navEntry) {
        const ttfb = navEntry.responseStart - navEntry.requestStart;
        this.recordMetric({
          name: 'TTFB',
          value: ttfb,
          delta: ttfb,
          rating: this.rateTTFB(ttfb),
          timestamp: Date.now(),
          navigationType: this.getNavigationType()
        });
      }
    });

    // Interaction to Next Paint (INP) - experimental
    if ('PerformanceEventTiming' in window) {
      this.observePerformanceEntry('event', (entries) => {
        const interactionEntries = entries.filter((entry: any) =>
          entry.interactionId && entry.duration > 0
        );

        if (interactionEntries.length > 0) {
          const maxDuration = Math.max(...interactionEntries.map((e: any) => e.duration));
          this.recordMetric({
            name: 'INP',
            value: maxDuration,
            delta: maxDuration,
            rating: this.rateINP(maxDuration),
            timestamp: Date.now(),
            navigationType: this.getNavigationType()
          });
        }
      });
    }
  }

  private observePerformanceEntry(
    entryType: string,
    callback: (entries: PerformanceEntry[]) => void
  ): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });

      observer.observe({
        type: entryType,
        buffered: true
      });

      this.observers.push(observer);
    } catch (error) {
      console.warn(`Failed to observe ${entryType}:`, error);
    }
  }

  private recordMetric(metric: WebVitalsMetric): void {
    this.metrics.set(metric.name, metric);

    // Dispatch custom event for real-time monitoring
    window.dispatchEvent(new CustomEvent('web-vital', {
      detail: metric
    }));
  }

  private getNavigationType(): 'navigate' | 'reload' | 'back-forward' | 'prerender' {
    if (typeof performance !== 'undefined' && performance.getEntriesByType) {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navEntry) {
        switch (navEntry.type) {
          case 'navigate': return 'navigate';
          case 'reload': return 'reload';
          case 'back_forward': return 'back-forward';
          case 'prerender': return 'prerender';
          default: return 'navigate';
        }
      }
    }
    return 'navigate';
  }

  // Rating functions based on Web Vitals thresholds
  private rateFCP(value: number): 'good' | 'needs-improvement' | 'poor' {
    return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
  }

  private rateLCP(value: number): 'good' | 'needs-improvement' | 'poor' {
    return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
  }

  private rateFID(value: number): 'good' | 'needs-improvement' | 'poor' {
    return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
  }

  private rateCLS(value: number): 'good' | 'needs-improvement' | 'poor' {
    return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
  }

  private rateTTFB(value: number): 'good' | 'needs-improvement' | 'poor' {
    return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
  }

  private rateINP(value: number): 'good' | 'needs-improvement' | 'poor' {
    return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
  }

  startCollection(): void {
    this.isCollecting = true;
    this.metrics.clear();

    // Trigger immediate collection for already available metrics
    if (typeof performance !== 'undefined') {
      // Collect existing paint entries
      const paintEntries = performance.getEntriesByType('paint');
      if (paintEntries.length > 0) {
        this.observePerformanceEntry('paint', () => {});
      }

      // Collect existing navigation entry
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        this.observePerformanceEntry('navigation', () => {});
      }
    }
  }

  stopCollection(): WebVitalsReport {
    this.isCollecting = false;

    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    // Collect final metrics
    const report: WebVitalsReport = {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connection: this.getConnectionInfo(),
      metrics: Array.from(this.metrics.values()),
      performanceEntries: this.getAllPerformanceEntries(),
      resourceTiming: this.getResourceTiming(),
      navigation: this.getNavigationTiming()
    };

    return report;
  }

  private getConnectionInfo(): { effectiveType: string; downlink: number; rtt: number } {
    const nav = navigator as any;
    if (nav.connection) {
      return {
        effectiveType: nav.connection.effectiveType || 'unknown',
        downlink: nav.connection.downlink || 0,
        rtt: nav.connection.rtt || 0
      };
    }
    return {
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0
    };
  }

  private getAllPerformanceEntries(): PerformanceEntry[] {
    if (typeof performance === 'undefined') return [];

    return [
      ...performance.getEntriesByType('navigation'),
      ...performance.getEntriesByType('paint'),
      ...performance.getEntriesByType('largest-contentful-paint'),
      ...performance.getEntriesByType('first-input'),
      ...performance.getEntriesByType('layout-shift'),
      ...performance.getEntriesByType('measure'),
      ...performance.getEntriesByType('mark')
    ];
  }

  private getResourceTiming(): PerformanceResourceTiming[] {
    if (typeof performance === 'undefined') return [];
    return performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  }

  private getNavigationTiming(): PerformanceNavigationTiming {
    if (typeof performance === 'undefined') {
      return {} as PerformanceNavigationTiming;
    }

    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return navEntries[0] || {} as PerformanceNavigationTiming;
  }

  getMetric(name: WebVitalsMetric['name']): WebVitalsMetric | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): WebVitalsMetric[] {
    return Array.from(this.metrics.values());
  }

  getMetricsSummary(): {
    total: number;
    good: number;
    needsImprovement: number;
    poor: number;
    score: number;
  } {
    const metrics = this.getAllMetrics();
    const total = metrics.length;
    const good = metrics.filter(m => m.rating === 'good').length;
    const needsImprovement = metrics.filter(m => m.rating === 'needs-improvement').length;
    const poor = metrics.filter(m => m.rating === 'poor').length;

    // Calculate score (0-100)
    const score = total > 0 ? Math.round((good / total) * 100) : 0;

    return {
      total,
      good,
      needsImprovement,
      poor,
      score
    };
  }

  // Real-time monitoring
  onMetricUpdate(callback: (metric: WebVitalsMetric) => void): () => void {
    const handler = (event: CustomEvent) => {
      callback(event.detail);
    };

    window.addEventListener('web-vital', handler as EventListener);

    // Return cleanup function
    return () => {
      window.removeEventListener('web-vital', handler as EventListener);
    };
  }

  // Performance budget validation
  checkPerformanceBudget(budget: {
    fcp?: number;
    lcp?: number;
    fid?: number;
    cls?: number;
    ttfb?: number;
    inp?: number;
  }): {
    passed: boolean;
    violations: Array<{ metric: string; value: number; budget: number }>;
  } {
    const violations: Array<{ metric: string; value: number; budget: number }> = [];

    Object.entries(budget).forEach(([metricName, budgetValue]) => {
      const metric = this.getMetric(metricName.toUpperCase() as WebVitalsMetric['name']);
      if (metric && metric.value > budgetValue) {
        violations.push({
          metric: metricName.toUpperCase(),
          value: metric.value,
          budget: budgetValue
        });
      }
    });

    return {
      passed: violations.length === 0,
      violations
    };
  }

  // Integration with Google Analytics (GA4)
  sendToAnalytics(config: {
    measurementId?: string;
    customDimensions?: Record<string, string>;
  } = {}): void {
    if (typeof gtag === 'undefined') {
      console.warn('Google Analytics not available');
      return;
    }

    this.getAllMetrics().forEach(metric => {
      (window as any).gtag('event', metric.name, {
        event_category: 'Web Vitals',
        event_label: window.location.pathname,
        value: Math.round(metric.value),
        custom_map: {
          metric_rating: metric.rating,
          navigation_type: metric.navigationType,
          ...config.customDimensions
        }
      });
    });
  }

  // Export data for external analysis
  exportData(format: 'json' | 'csv' = 'json'): string {
    const report = this.stopCollection();

    if (format === 'csv') {
      const headers = ['Metric', 'Value', 'Rating', 'Timestamp', 'Navigation Type'];
      const rows = report.metrics.map(metric => [
        metric.name,
        metric.value.toString(),
        metric.rating,
        new Date(metric.timestamp).toISOString(),
        metric.navigationType
      ]);

      return [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');
    }

    return JSON.stringify(report, null, 2);
  }
}

// Global instance for easy access
export const webVitalsCollector = new WebVitalsCollector();

// Auto-start collection when page loads
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      webVitalsCollector.startCollection();
    });
  } else {
    webVitalsCollector.startCollection();
  }
}