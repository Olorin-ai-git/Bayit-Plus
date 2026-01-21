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
export declare class PerformanceMonitor {
    private sampleInterval;
    private startTime;
    private endTime;
    private startMemory;
    private memorySnapshots;
    private operations;
    private errors;
    private isMonitoring;
    private monitoringInterval;
    constructor(sampleInterval?: number);
    /**
     * Start performance monitoring
     */
    start(): void;
    /**
     * Stop performance monitoring and return metrics
     */
    stop(): PerformanceMetrics;
    /**
     * Record a successful operation
     */
    recordOperation(): void;
    /**
     * Record an error
     */
    recordError(): void;
    /**
     * Get current performance snapshot
     */
    getCurrentSnapshot(): Partial<PerformanceMetrics>;
    /**
     * Check if performance meets specified thresholds
     */
    meetsThresholds(thresholds: PerformanceThresholds): {
        passed: boolean;
        violations: string[];
    };
    private takeMemorySnapshot;
    private calculateMetrics;
}
/**
 * Performance test runner with automatic threshold checking
 */
export declare class PerformanceTestRunner {
    private monitor;
    constructor(sampleInterval?: number);
    /**
     * Run a performance test with automatic monitoring
     */
    runTest<T>(testName: string, testFunction: (monitor: PerformanceMonitor) => Promise<T>, thresholds: PerformanceThresholds): Promise<{
        result: T;
        metrics: PerformanceMetrics;
        passed: boolean;
        violations: string[];
    }>;
}
/**
 * Utility functions for performance testing
 */
export declare class PerformanceUtils {
    /**
     * Create a load test with specified concurrency and duration
     */
    static createLoadTest<T>(operationFunction: () => Promise<T>, concurrency: number, duration: number, monitor?: PerformanceMonitor): Promise<{
        results: (T | Error)[];
        completedOperations: number;
        errors: number;
        operationsPerSecond: number;
    }>;
    /**
     * Measure memory usage of a function
     */
    static measureMemoryUsage<T>(operation: () => Promise<T>): Promise<{
        result: T;
        memoryBefore: MemorySnapshot;
        memoryAfter: MemorySnapshot;
        memoryUsed: number;
    }>;
    /**
     * Create a stress test that gradually increases load
     */
    static createStressTest<T>(operationFunction: () => Promise<T>, initialConcurrency: number, maxConcurrency: number, stepDuration: number, stepSize: number, monitor?: PerformanceMonitor): Promise<{
        results: Array<{
            concurrency: number;
            completedOperations: number;
            errors: number;
            operationsPerSecond: number;
            duration: number;
        }>;
    }>;
    /**
     * Benchmark function execution time
     */
    static benchmark<T>(name: string, operation: () => Promise<T>, iterations?: number): Promise<{
        name: string;
        iterations: number;
        totalTime: number;
        averageTime: number;
        minTime: number;
        maxTime: number;
        results: T[];
    }>;
    /**
     * Generate performance report
     */
    static generateReport(testName: string, metrics: PerformanceMetrics, thresholds: PerformanceThresholds, additionalData?: Record<string, any>): string;
}
/**
 * Performance assertion helpers for Jest tests
 */
export declare const performanceAssertions: {
    /**
     * Assert that execution time is under threshold
     */
    expectDurationUnder: (actual: number, threshold: number, message?: string) => void;
    /**
     * Assert that memory usage is under threshold
     */
    expectMemoryUnder: (actual: number, threshold: number, message?: string) => void;
    /**
     * Assert that operations per second meets minimum threshold
     */
    expectThroughputAbove: (actual: number, threshold: number, message?: string) => void;
    /**
     * Assert that error rate is under threshold
     */
    expectErrorRateUnder: (actual: number, threshold: number, message?: string) => void;
};
//# sourceMappingURL=performance-utilities.d.ts.map