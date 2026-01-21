// @ts-ignore - Export conflicts/**
 * Performance Tracker Utility
 * 
 * Tracks and analyzes performance metrics for multimedia operations
 * including processing times, memory usage, and error rates.
 */

export interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryBefore: number;
  memoryAfter?: number;
  memoryDelta?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;
  averageDuration: number;
  medianDuration: number;
  p95Duration: number;
  totalMemoryDelta: number;
  averageMemoryDelta: number;
  operationTypes: Record<string, number>;
  recentErrors: string[];
}

/**
 * Performance tracking and metrics collection
 */
export class PerformanceTracker {
  private readonly metrics: PerformanceMetric[] = [];
  private readonly activeOperations: Map<string, PerformanceMetric> = new Map();
  private readonly maxMetricsCount: number = 10000;

  constructor() {
    // Initialize with empty metrics
  }

  /**
   * Start tracking an operation
   */
  public startOperation(
    operation: string,
    metadata?: Record<string, any>
  ): string {
    const operationId = this.generateOperationId();
    
    const metric: PerformanceMetric = {
      operation,
      startTime: performance.now(),
      memoryBefore: this.getMemoryUsage(),
      success: false,
      metadata
    };

    this.activeOperations.set(operationId, metric);
    return operationId;
  }

  /**
   * End tracking an operation (successful)
   */
  public endOperation(
    operationId: string,
    additionalMetadata?: Record<string, any>
  ): void {
    const metric = this.activeOperations.get(operationId);
    if (!metric) {
      return;
    }

    const endTime = performance.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.memoryAfter = this.getMemoryUsage();
    metric.memoryDelta = metric.memoryAfter - metric.memoryBefore;
    metric.success = true;

    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }

    this.activeOperations.delete(operationId);
    this.addMetric(metric);
  }

  /**
   * Record an operation error
   */
  public recordError(operation: string, error: Error): void {
    // Check if this is from an active operation
    for (const [id, metric] of this.activeOperations) {
      if (metric.operation === operation) {
        metric.endTime = performance.now();
        metric.duration = metric.endTime - metric.startTime;
        metric.memoryAfter = this.getMemoryUsage();
        metric.memoryDelta = metric.memoryAfter - metric.memoryBefore;
        metric.success = false;
        metric.error = error.message;

        this.activeOperations.delete(id);
        this.addMetric(metric);
        return;
      }
    }

    // Create a standalone error metric
    const metric: PerformanceMetric = {
      operation,
      startTime: performance.now(),
      endTime: performance.now(),
      duration: 0,
      memoryBefore: this.getMemoryUsage(),
      memoryAfter: this.getMemoryUsage(),
      memoryDelta: 0,
      success: false,
      error: error.message
    };

    this.addMetric(metric);
  }

  /**
   * Record a quick metric (when start/end tracking isn't used)
   */
  public recordMetric(
    operation: string,
    duration: number,
    success: boolean,
    error?: string,
    metadata?: Record<string, any>
  ): void {
    const now = performance.now();
    const memory = this.getMemoryUsage();

    const metric: PerformanceMetric = {
      operation,
      startTime: now - duration,
      endTime: now,
      duration,
      memoryBefore: memory,
      memoryAfter: memory,
      memoryDelta: 0,
      success,
      error,
      metadata
    };

    this.addMetric(metric);
  }

  /**
   * Get performance statistics
   */
  public getStats(operationType?: string): PerformanceStats {
    let relevantMetrics = this.metrics;
    
    if (operationType) {
      relevantMetrics = this.metrics.filter(m => m.operation === operationType);
    }

    if (relevantMetrics.length === 0) {
      return {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        successRate: 0,
        averageDuration: 0,
        medianDuration: 0,
        p95Duration: 0,
        totalMemoryDelta: 0,
        averageMemoryDelta: 0,
        operationTypes: {},
        recentErrors: []
      };
    }

    const successful = relevantMetrics.filter(m => m.success);
    const failed = relevantMetrics.filter(m => !m.success);
    const durations = relevantMetrics
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!)
      .sort((a, b) => a - b);

    const operationTypes: Record<string, number> = {};
    relevantMetrics.forEach(m => {
      operationTypes[m.operation] = (operationTypes[m.operation] || 0) + 1;
    });

    const recentErrors = failed
      .slice(-10)
      .map(m => m.error || 'Unknown error')
      .filter(Boolean);

    return {
      totalOperations: relevantMetrics.length,
      successfulOperations: successful.length,
      failedOperations: failed.length,
      successRate: relevantMetrics.length > 0 ? successful.length / relevantMetrics.length : 0,
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      medianDuration: durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0,
      p95Duration: durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0,
      totalMemoryDelta: relevantMetrics.reduce((sum, m) => sum + (m.memoryDelta || 0), 0),
      averageMemoryDelta: relevantMetrics.length > 0 ? 
        relevantMetrics.reduce((sum, m) => sum + (m.memoryDelta || 0), 0) / relevantMetrics.length : 0,
      operationTypes,
      recentErrors
    };
  }

  /**
   * Get recent metrics
   */
  public getRecentMetrics(count: number = 50): PerformanceMetric[] {
    return this.metrics.slice(-count);
  }

  /**
   * Get metrics for specific operation
   */
  public getMetricsForOperation(operation: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.operation === operation);
  }

  /**
   * Get slowest operations
   */
  public getSlowestOperations(count: number = 10): PerformanceMetric[] {
    return [...this.metrics]
      .filter(m => m.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, count);
  }

  /**
   * Get operations with highest memory usage
   */
  public getHighestMemoryOperations(count: number = 10): PerformanceMetric[] {
    return [...this.metrics]
      .filter(m => m.memoryDelta !== undefined)
      .sort((a, b) => (b.memoryDelta || 0) - (a.memoryDelta || 0))
      .slice(0, count);
  }

  /**
   * Clear all metrics
   */
  public clear(): void {
    this.metrics.length = 0;
    this.activeOperations.clear();
  }

  /**
   * Export metrics as JSON
   */
  public exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Get currently active operations
   */
  public getActiveOperations(): Array<{ id: string; operation: string; duration: number }> {
    const now = performance.now();
    return Array.from(this.activeOperations.entries()).map(([id, metric]) => ({
      id,
      operation: metric.operation,
      duration: now - metric.startTime
    }));
  }

  /**
   * Add metric to collection
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Trim old metrics if we exceed the limit
    if (this.metrics.length > this.maxMetricsCount) {
      this.metrics.splice(0, Math.floor(this.maxMetricsCount * 0.1)); // Remove oldest 10%
    }
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    
    // Fallback for browser environments
    if (typeof (performance as any).memory !== 'undefined') {
      return (performance as any).memory.usedJSHeapSize;
    }
    
    return 0;
  }

  /**
   * Get metrics summary for dashboard
   */
  public getDashboardSummary(): Record<string, any> {
    const stats = this.getStats();
    const activeOps = this.getActiveOperations();

    return {
      overview: {
        totalOperations: stats.totalOperations,
        successRate: Math.round(stats.successRate * 100),
        averageProcessingTime: Math.round(stats.averageDuration),
        activeOperations: activeOps.length
      },
      performance: {
        p95ProcessingTime: Math.round(stats.p95Duration),
        averageMemoryUsage: Math.round(stats.averageMemoryDelta / 1024 / 1024), // MB
        slowestOperations: this.getSlowestOperations(5).map(m => ({
          operation: m.operation,
          duration: Math.round(m.duration || 0),
          timestamp: m.startTime
        }))
      },
      errors: {
        failureRate: Math.round((1 - stats.successRate) * 100),
        recentErrors: stats.recentErrors.slice(0, 5)
      },
      activeOperations: activeOps
    };
  }
}