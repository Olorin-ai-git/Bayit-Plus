/**
 * Performance Monitoring for Notifications
 * Tracks render performance and alerts on budget violations
 */

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  timestamp: number;
}

class NotificationPerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly MAX_RENDER_TIME = 16; // 60fps budget
  private readonly MAX_METRICS = 100;

  startMeasure(componentName: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      this.recordMetric({
        componentName,
        renderTime,
        timestamp: Date.now(),
      });

      if (renderTime > this.MAX_RENDER_TIME) {
        console.warn(
          `[Performance] ${componentName} render exceeded budget: ${renderTime.toFixed(2)}ms (budget: ${this.MAX_RENDER_TIME}ms)`
        );
      }
    };
  }

  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Keep only last MAX_METRICS entries
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  getMetrics(componentName?: string): PerformanceMetrics[] {
    if (componentName) {
      return this.metrics.filter((m) => m.componentName === componentName);
    }
    return this.metrics;
  }

  getAverageRenderTime(componentName: string): number {
    const componentMetrics = this.getMetrics(componentName);
    if (componentMetrics.length === 0) return 0;

    const total = componentMetrics.reduce((sum, m) => sum + m.renderTime, 0);
    return total / componentMetrics.length;
  }

  getMaxRenderTime(componentName: string): number {
    const componentMetrics = this.getMetrics(componentName);
    if (componentMetrics.length === 0) return 0;

    return Math.max(...componentMetrics.map((m) => m.renderTime));
  }

  clear(): void {
    this.metrics = [];
  }
}

// Global singleton
export const performanceMonitor = new NotificationPerformanceMonitor();

/**
 * Performance decorator for React components
 */
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.FC<P> => {
  return (props: P) => {
    const endMeasure = performanceMonitor.startMeasure(componentName);

    React.useEffect(() => {
      return endMeasure;
    }, []);

    return <Component {...props} />;
  };
};
