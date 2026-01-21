/**
 * Performance Testing Utilities
 * Helper functions and classes for measuring and monitoring performance during tests
 */

export interface PerformanceMetrics {
  duration: number;
  memoryUsed: number;
  cpuUsage?: number;
  peakMemory: number;
  averageMemory: number;
  operationsPerSecond: number;
  errorRate: number;
  timestamp: Date;
}

export interface MemorySnapshot {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  timestamp: number;
}

export interface PerformanceThresholds {
  maxDuration: number;
  maxMemoryUsage: number;
  maxErrorRate: number;
  minOperationsPerSecond: number;
  maxPeakMemory?: number;
}

export class PerformanceMonitor {
  private startTime: number = 0;
  private endTime: number = 0;
  private startMemory: MemorySnapshot;
  private memorySnapshots: MemorySnapshot[] = [];
  private operations: number = 0;
  private errors: number = 0;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(private sampleInterval: number = 100) {
    this.startMemory = this.takeMemorySnapshot();
  }

  /**
   * Start performance monitoring
   */
  public start(): void {
    this.startTime = Date.now();
    this.startMemory = this.takeMemorySnapshot();
    this.memorySnapshots = [this.startMemory];
    this.operations = 0;
    this.errors = 0;
    this.isMonitoring = true;

    // Start memory monitoring
    this.monitoringInterval = setInterval(() => {
      if (this.isMonitoring) {
        this.memorySnapshots.push(this.takeMemorySnapshot());
      }
    }, this.sampleInterval);
  }

  /**
   * Stop performance monitoring and return metrics
   */
  public stop(): PerformanceMetrics {
    this.endTime = Date.now();
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    const finalMemorySnapshot = this.takeMemorySnapshot();
    this.memorySnapshots.push(finalMemorySnapshot);

    return this.calculateMetrics();
  }

  /**
   * Record a successful operation
   */
  public recordOperation(): void {
    this.operations++;
  }

  /**
   * Record an error
   */
  public recordError(): void {
    this.errors++;
  }

  /**
   * Get current performance snapshot
   */
  public getCurrentSnapshot(): Partial<PerformanceMetrics> {
    const currentTime = Date.now();
    const currentMemory = this.takeMemorySnapshot();
    const duration = currentTime - this.startTime;

    return {
      duration,
      memoryUsed: currentMemory.heapUsed - this.startMemory.heapUsed,
      operationsPerSecond: this.operations / (duration / 1000),
      errorRate: this.operations > 0 ? (this.errors / (this.operations + this.errors)) * 100 : 0,
      timestamp: new Date(currentTime)
    };
  }

  /**
   * Check if performance meets specified thresholds
   */
  public meetsThresholds(thresholds: PerformanceThresholds): {
    passed: boolean;
    violations: string[];
  } {
    const metrics = this.isMonitoring ? this.getCurrentSnapshot() : this.calculateMetrics();
    const violations: string[] = [];

    if (metrics.duration! > thresholds.maxDuration) {
      violations.push(`Duration ${metrics.duration}ms exceeds threshold ${thresholds.maxDuration}ms`);
    }

    if (metrics.memoryUsed! > thresholds.maxMemoryUsage) {
      violations.push(`Memory usage ${metrics.memoryUsed} bytes exceeds threshold ${thresholds.maxMemoryUsage} bytes`);
    }

    if (metrics.errorRate! > thresholds.maxErrorRate) {
      violations.push(`Error rate ${metrics.errorRate}% exceeds threshold ${thresholds.maxErrorRate}%`);
    }

    if (metrics.operationsPerSecond! < thresholds.minOperationsPerSecond) {
      violations.push(`Operations per second ${metrics.operationsPerSecond} below threshold ${thresholds.minOperationsPerSecond}`);
    }

    if (thresholds.maxPeakMemory && metrics.peakMemory! > thresholds.maxPeakMemory) {
      violations.push(`Peak memory ${metrics.peakMemory} bytes exceeds threshold ${thresholds.maxPeakMemory} bytes`);
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }

  private takeMemorySnapshot(): MemorySnapshot {
    const memoryUsage = process.memoryUsage();
    return {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      timestamp: Date.now()
    };
  }

  private calculateMetrics(): PerformanceMetrics {
    const duration = this.endTime - this.startTime;
    const finalMemory = this.memorySnapshots[this.memorySnapshots.length - 1];
    const memoryUsed = finalMemory.heapUsed - this.startMemory.heapUsed;

    // Calculate memory statistics
    const memoryValues = this.memorySnapshots.map(s => s.heapUsed);
    const peakMemory = Math.max(...memoryValues);
    const averageMemory = memoryValues.reduce((sum, mem) => sum + mem, 0) / memoryValues.length;

    // Calculate rates
    const totalOperations = this.operations + this.errors;
    const operationsPerSecond = totalOperations > 0 ? totalOperations / (duration / 1000) : 0;
    const errorRate = totalOperations > 0 ? (this.errors / totalOperations) * 100 : 0;

    return {
      duration,
      memoryUsed,
      peakMemory: peakMemory - this.startMemory.heapUsed,
      averageMemory: averageMemory - this.startMemory.heapUsed,
      operationsPerSecond,
      errorRate,
      timestamp: new Date(this.endTime)
    };
  }
}

/**
 * Performance test runner with automatic threshold checking
 */
export class PerformanceTestRunner {
  private monitor: PerformanceMonitor;

  constructor(sampleInterval: number = 100) {
    this.monitor = new PerformanceMonitor(sampleInterval);
  }

  /**
   * Run a performance test with automatic monitoring
   */
  public async runTest<T>(
    testName: string,
    testFunction: (monitor: PerformanceMonitor) => Promise<T>,
    thresholds: PerformanceThresholds
  ): Promise<{
    result: T;
    metrics: PerformanceMetrics;
    passed: boolean;
    violations: string[];
  }> {
    console.log(`Starting performance test: ${testName}`);

    this.monitor.start();

    try {
      const result = await testFunction(this.monitor);
      const metrics = this.monitor.stop();
      const thresholdCheck = this.monitor.meetsThresholds(thresholds);

      console.log(`Performance test completed: ${testName}`);
      console.log(`  Duration: ${metrics.duration}ms`);
      console.log(`  Memory Used: ${(metrics.memoryUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Operations/sec: ${metrics.operationsPerSecond.toFixed(2)}`);
      console.log(`  Error Rate: ${metrics.errorRate.toFixed(2)}%`);
      console.log(`  Passed: ${thresholdCheck.passed ? '✅' : '❌'}`);

      if (!thresholdCheck.passed) {
        console.log(`  Violations:`);
        thresholdCheck.violations.forEach(v => console.log(`    - ${v}`));
      }

      return {
        result,
        metrics,
        passed: thresholdCheck.passed,
        violations: thresholdCheck.violations
      };

    } catch (error) {
      this.monitor.stop();
      throw error;
    }
  }
}

/**
 * Utility functions for performance testing
 */
export class PerformanceUtils {
  /**
   * Create a load test with specified concurrency and duration
   */
  public static async createLoadTest<T>(
    operationFunction: () => Promise<T>,
    concurrency: number,
    duration: number,
    monitor?: PerformanceMonitor
  ): Promise<{
    results: (T | Error)[];
    completedOperations: number;
    errors: number;
    operationsPerSecond: number;
  }> {
    const startTime = Date.now();
    const endTime = startTime + duration;
    const results: (T | Error)[] = [];
    let completedOperations = 0;
    let errors = 0;

    const workers = Array.from({ length: concurrency }, async () => {
      while (Date.now() < endTime) {
        try {
          const result = await operationFunction();
          results.push(result);
          completedOperations++;
          if (monitor) monitor.recordOperation();
        } catch (error) {
          results.push(error as Error);
          errors++;
          if (monitor) monitor.recordError();
        }
      }
    });

    await Promise.all(workers);

    const actualDuration = Date.now() - startTime;
    const operationsPerSecond = completedOperations / (actualDuration / 1000);

    return {
      results,
      completedOperations,
      errors,
      operationsPerSecond
    };
  }

  /**
   * Measure memory usage of a function
   */
  public static async measureMemoryUsage<T>(
    operation: () => Promise<T>
  ): Promise<{
    result: T;
    memoryBefore: MemorySnapshot;
    memoryAfter: MemorySnapshot;
    memoryUsed: number;
  }> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const memoryBefore = {
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal,
      external: process.memoryUsage().external,
      rss: process.memoryUsage().rss,
      timestamp: Date.now()
    };

    const result = await operation();

    const memoryAfter = {
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal,
      external: process.memoryUsage().external,
      rss: process.memoryUsage().rss,
      timestamp: Date.now()
    };

    const memoryUsed = memoryAfter.heapUsed - memoryBefore.heapUsed;

    return {
      result,
      memoryBefore,
      memoryAfter,
      memoryUsed
    };
  }

  /**
   * Create a stress test that gradually increases load
   */
  public static async createStressTest<T>(
    operationFunction: () => Promise<T>,
    initialConcurrency: number,
    maxConcurrency: number,
    stepDuration: number,
    stepSize: number,
    monitor?: PerformanceMonitor
  ): Promise<{
    results: Array<{
      concurrency: number;
      completedOperations: number;
      errors: number;
      operationsPerSecond: number;
      duration: number;
    }>;
  }> {
    const results: Array<{
      concurrency: number;
      completedOperations: number;
      errors: number;
      operationsPerSecond: number;
      duration: number;
    }> = [];

    for (let concurrency = initialConcurrency; concurrency <= maxConcurrency; concurrency += stepSize) {
      console.log(`Testing with concurrency: ${concurrency}`);

      const stepResult = await this.createLoadTest(
        operationFunction,
        concurrency,
        stepDuration,
        monitor
      );

      results.push({
        concurrency,
        completedOperations: stepResult.completedOperations,
        errors: stepResult.errors,
        operationsPerSecond: stepResult.operationsPerSecond,
        duration: stepDuration
      });

      // Brief pause between steps
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return { results };
  }

  /**
   * Benchmark function execution time
   */
  public static async benchmark<T>(
    name: string,
    operation: () => Promise<T>,
    iterations: number = 1
  ): Promise<{
    name: string;
    iterations: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    results: T[];
  }> {
    const times: number[] = [];
    const results: T[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = process.hrtime.bigint();
      const result = await operation();
      const endTime = process.hrtime.bigint();

      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
      times.push(duration);
      results.push(result);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`Benchmark: ${name}`);
    console.log(`  Iterations: ${iterations}`);
    console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`  Average Time: ${averageTime.toFixed(2)}ms`);
    console.log(`  Min Time: ${minTime.toFixed(2)}ms`);
    console.log(`  Max Time: ${maxTime.toFixed(2)}ms`);

    return {
      name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      results
    };
  }

  /**
   * Generate performance report
   */
  public static generateReport(
    testName: string,
    metrics: PerformanceMetrics,
    thresholds: PerformanceThresholds,
    additionalData?: Record<string, any>
  ): string {
    const report = `
# Performance Test Report: ${testName}

## Test Results
- **Duration**: ${metrics.duration}ms
- **Memory Used**: ${(metrics.memoryUsed / 1024 / 1024).toFixed(2)} MB
- **Peak Memory**: ${(metrics.peakMemory / 1024 / 1024).toFixed(2)} MB
- **Average Memory**: ${(metrics.averageMemory / 1024 / 1024).toFixed(2)} MB
- **Operations/Second**: ${metrics.operationsPerSecond.toFixed(2)}
- **Error Rate**: ${metrics.errorRate.toFixed(2)}%
- **Timestamp**: ${metrics.timestamp.toISOString()}

## Performance Thresholds
- **Max Duration**: ${thresholds.maxDuration}ms ${metrics.duration <= thresholds.maxDuration ? '✅' : '❌'}
- **Max Memory**: ${(thresholds.maxMemoryUsage / 1024 / 1024).toFixed(2)} MB ${metrics.memoryUsed <= thresholds.maxMemoryUsage ? '✅' : '❌'}
- **Max Error Rate**: ${thresholds.maxErrorRate}% ${metrics.errorRate <= thresholds.maxErrorRate ? '✅' : '❌'}
- **Min Operations/Second**: ${thresholds.minOperationsPerSecond} ${metrics.operationsPerSecond >= thresholds.minOperationsPerSecond ? '✅' : '❌'}

${additionalData ? `## Additional Data\n${JSON.stringify(additionalData, null, 2)}` : ''}

## System Information
- **Platform**: ${process.platform}
- **Architecture**: ${process.arch}
- **Node.js Version**: ${process.version}
- **Memory Usage**: ${JSON.stringify(process.memoryUsage(), null, 2)}
`;

    return report.trim();
  }
}

/**
 * Performance assertion helpers for Jest tests
 */
export const performanceAssertions = {
  /**
   * Assert that execution time is under threshold
   */
  expectDurationUnder: (actual: number, threshold: number, message?: string) => {
    expect(actual).toBeLessThan(threshold);
    if (message) {
      console.log(`✅ ${message}: ${actual}ms < ${threshold}ms`);
    }
  },

  /**
   * Assert that memory usage is under threshold
   */
  expectMemoryUnder: (actual: number, threshold: number, message?: string) => {
    expect(actual).toBeLessThan(threshold);
    if (message) {
      console.log(`✅ ${message}: ${(actual / 1024 / 1024).toFixed(2)}MB < ${(threshold / 1024 / 1024).toFixed(2)}MB`);
    }
  },

  /**
   * Assert that operations per second meets minimum threshold
   */
  expectThroughputAbove: (actual: number, threshold: number, message?: string) => {
    expect(actual).toBeGreaterThan(threshold);
    if (message) {
      console.log(`✅ ${message}: ${actual.toFixed(2)} ops/sec > ${threshold} ops/sec`);
    }
  },

  /**
   * Assert that error rate is under threshold
   */
  expectErrorRateUnder: (actual: number, threshold: number, message?: string) => {
    expect(actual).toBeLessThan(threshold);
    if (message) {
      console.log(`✅ ${message}: ${actual.toFixed(2)}% < ${threshold}%`);
    }
  }
};