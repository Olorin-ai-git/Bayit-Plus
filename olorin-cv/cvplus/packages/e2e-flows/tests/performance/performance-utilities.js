"use strict";
/**
 * Performance Testing Utilities
 * Helper functions and classes for measuring and monitoring performance during tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceAssertions = exports.PerformanceUtils = exports.PerformanceTestRunner = exports.PerformanceMonitor = void 0;
class PerformanceMonitor {
    sampleInterval;
    startTime = 0;
    endTime = 0;
    startMemory;
    memorySnapshots = [];
    operations = 0;
    errors = 0;
    isMonitoring = false;
    monitoringInterval = null;
    constructor(sampleInterval = 100) {
        this.sampleInterval = sampleInterval;
        this.startMemory = this.takeMemorySnapshot();
    }
    /**
     * Start performance monitoring
     */
    start() {
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
    stop() {
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
    recordOperation() {
        this.operations++;
    }
    /**
     * Record an error
     */
    recordError() {
        this.errors++;
    }
    /**
     * Get current performance snapshot
     */
    getCurrentSnapshot() {
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
    meetsThresholds(thresholds) {
        const metrics = this.isMonitoring ? this.getCurrentSnapshot() : this.calculateMetrics();
        const violations = [];
        if (metrics.duration > thresholds.maxDuration) {
            violations.push(`Duration ${metrics.duration}ms exceeds threshold ${thresholds.maxDuration}ms`);
        }
        if (metrics.memoryUsed > thresholds.maxMemoryUsage) {
            violations.push(`Memory usage ${metrics.memoryUsed} bytes exceeds threshold ${thresholds.maxMemoryUsage} bytes`);
        }
        if (metrics.errorRate > thresholds.maxErrorRate) {
            violations.push(`Error rate ${metrics.errorRate}% exceeds threshold ${thresholds.maxErrorRate}%`);
        }
        if (metrics.operationsPerSecond < thresholds.minOperationsPerSecond) {
            violations.push(`Operations per second ${metrics.operationsPerSecond} below threshold ${thresholds.minOperationsPerSecond}`);
        }
        if (thresholds.maxPeakMemory && metrics.peakMemory > thresholds.maxPeakMemory) {
            violations.push(`Peak memory ${metrics.peakMemory} bytes exceeds threshold ${thresholds.maxPeakMemory} bytes`);
        }
        return {
            passed: violations.length === 0,
            violations
        };
    }
    takeMemorySnapshot() {
        const memoryUsage = process.memoryUsage();
        return {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            external: memoryUsage.external,
            rss: memoryUsage.rss,
            timestamp: Date.now()
        };
    }
    calculateMetrics() {
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
exports.PerformanceMonitor = PerformanceMonitor;
/**
 * Performance test runner with automatic threshold checking
 */
class PerformanceTestRunner {
    monitor;
    constructor(sampleInterval = 100) {
        this.monitor = new PerformanceMonitor(sampleInterval);
    }
    /**
     * Run a performance test with automatic monitoring
     */
    async runTest(testName, testFunction, thresholds) {
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
        }
        catch (error) {
            this.monitor.stop();
            throw error;
        }
    }
}
exports.PerformanceTestRunner = PerformanceTestRunner;
/**
 * Utility functions for performance testing
 */
class PerformanceUtils {
    /**
     * Create a load test with specified concurrency and duration
     */
    static async createLoadTest(operationFunction, concurrency, duration, monitor) {
        const startTime = Date.now();
        const endTime = startTime + duration;
        const results = [];
        let completedOperations = 0;
        let errors = 0;
        const workers = Array.from({ length: concurrency }, async () => {
            while (Date.now() < endTime) {
                try {
                    const result = await operationFunction();
                    results.push(result);
                    completedOperations++;
                    if (monitor)
                        monitor.recordOperation();
                }
                catch (error) {
                    results.push(error);
                    errors++;
                    if (monitor)
                        monitor.recordError();
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
    static async measureMemoryUsage(operation) {
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
    static async createStressTest(operationFunction, initialConcurrency, maxConcurrency, stepDuration, stepSize, monitor) {
        const results = [];
        for (let concurrency = initialConcurrency; concurrency <= maxConcurrency; concurrency += stepSize) {
            console.log(`Testing with concurrency: ${concurrency}`);
            const stepResult = await this.createLoadTest(operationFunction, concurrency, stepDuration, monitor);
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
    static async benchmark(name, operation, iterations = 1) {
        const times = [];
        const results = [];
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
    static generateReport(testName, metrics, thresholds, additionalData) {
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
exports.PerformanceUtils = PerformanceUtils;
/**
 * Performance assertion helpers for Jest tests
 */
exports.performanceAssertions = {
    /**
     * Assert that execution time is under threshold
     */
    expectDurationUnder: (actual, threshold, message) => {
        expect(actual).toBeLessThan(threshold);
        if (message) {
            console.log(`✅ ${message}: ${actual}ms < ${threshold}ms`);
        }
    },
    /**
     * Assert that memory usage is under threshold
     */
    expectMemoryUnder: (actual, threshold, message) => {
        expect(actual).toBeLessThan(threshold);
        if (message) {
            console.log(`✅ ${message}: ${(actual / 1024 / 1024).toFixed(2)}MB < ${(threshold / 1024 / 1024).toFixed(2)}MB`);
        }
    },
    /**
     * Assert that operations per second meets minimum threshold
     */
    expectThroughputAbove: (actual, threshold, message) => {
        expect(actual).toBeGreaterThan(threshold);
        if (message) {
            console.log(`✅ ${message}: ${actual.toFixed(2)} ops/sec > ${threshold} ops/sec`);
        }
    },
    /**
     * Assert that error rate is under threshold
     */
    expectErrorRateUnder: (actual, threshold, message) => {
        expect(actual).toBeLessThan(threshold);
        if (message) {
            console.log(`✅ ${message}: ${actual.toFixed(2)}% < ${threshold}%`);
        }
    }
};
//# sourceMappingURL=performance-utilities.js.map