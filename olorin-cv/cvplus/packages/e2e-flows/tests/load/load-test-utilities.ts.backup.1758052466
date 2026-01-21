/**
 * Load Testing Utilities for CVPlus E2E Flows
 * Helper functions, monitoring tools, and analysis utilities for load testing
 */

import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import { performance } from 'perf_hooks';
import { cpus, loadavg, freemem, totalmem } from 'os';
import fs from 'fs';

export interface LoadTestMetrics {
  timestamp: number;
  concurrentUsers: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  systemLoad: {
    cpu: number[];
    memory: {
      used: number;
      free: number;
      total: number;
      usedPercent: number;
    };
    loadAverage: number[];
  };
}

export interface LoadTestReport {
  testName: string;
  startTime: number;
  endTime: number;
  duration: number;
  targetUsers: number;
  achievedUsers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  metrics: LoadTestMetrics[];
  summary: {
    averageResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    peakThroughput: number;
    sustainedThroughput: number;
  };
  recommendations: string[];
}

/**
 * Real-time Load Test Monitor
 */
export class LoadTestMonitor extends EventEmitter {
  private metrics: LoadTestMetrics[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private activeUsers: number = 0;
  private currentRPS: number = 0;
  private currentResponseTime: number = 0;
  private currentErrorRate: number = 0;

  constructor(private sampleInterval: number = 1000) {
    super();
  }

  /**
   * Start monitoring load test metrics
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.metrics = [];

    this.monitoringInterval = setInterval(() => {
      const metric: LoadTestMetrics = {
        timestamp: Date.now(),
        concurrentUsers: this.activeUsers,
        requestsPerSecond: this.currentRPS,
        averageResponseTime: this.currentResponseTime,
        errorRate: this.currentErrorRate,
        systemLoad: {
          cpu: loadavg(),
          memory: {
            used: totalmem() - freemem(),
            free: freemem(),
            total: totalmem(),
            usedPercent: ((totalmem() - freemem()) / totalmem()) * 100
          },
          loadAverage: loadavg()
        }
      };

      this.metrics.push(metric);
      this.emit('metrics', metric);

      // Check for system stress
      if (metric.systemLoad.memory.usedPercent > 85 || metric.systemLoad.loadAverage[0] > cpus().length * 0.8) {
        this.emit('systemStress', metric);
      }

      // Check for performance degradation
      if (metric.errorRate > 5 || metric.averageResponseTime > 5000) {
        this.emit('performanceDegradation', metric);
      }

    }, this.sampleInterval);

    console.log('🔍 Load test monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    console.log('⏹️  Load test monitoring stopped');
  }

  /**
   * Update current metrics
   */
  updateMetrics(users: number, rps: number, responseTime: number, errorRate: number): void {
    this.activeUsers = users;
    this.currentRPS = rps;
    this.currentResponseTime = responseTime;
    this.currentErrorRate = errorRate;
  }

  /**
   * Get collected metrics
   */
  getMetrics(): LoadTestMetrics[] {
    return [...this.metrics];
  }

  /**
   * Generate real-time dashboard display
   */
  displayRealtimeDashboard(): void {
    const latest = this.metrics[this.metrics.length - 1];
    if (!latest) return;

    console.clear();
    console.log('📊 LOAD TEST REAL-TIME DASHBOARD');
    console.log('================================');
    console.log(`⚡ Concurrent Users: ${latest.concurrentUsers}`);
    console.log(`🔄 Requests/sec: ${latest.requestsPerSecond.toFixed(1)}`);
    console.log(`⏱️  Avg Response: ${latest.averageResponseTime.toFixed(0)}ms`);
    console.log(`❌ Error Rate: ${latest.errorRate.toFixed(2)}%`);
    console.log(`💾 Memory Usage: ${latest.systemLoad.memory.usedPercent.toFixed(1)}%`);
    console.log(`🖥️  CPU Load: ${latest.systemLoad.loadAverage[0].toFixed(2)}`);
    console.log(`⏰ Time: ${new Date(latest.timestamp).toLocaleTimeString()}`);
    console.log('================================');

    // Display trend indicators
    if (this.metrics.length > 1) {
      const previous = this.metrics[this.metrics.length - 2];
      const rpsChange = latest.requestsPerSecond - previous.requestsPerSecond;
      const responseChange = latest.averageResponseTime - previous.averageResponseTime;

      console.log('📈 TRENDS:');
      console.log(`   RPS: ${rpsChange >= 0 ? '↗️' : '↘️'} ${rpsChange.toFixed(1)}`);
      console.log(`   Response: ${responseChange <= 0 ? '↗️' : '↘️'} ${responseChange.toFixed(0)}ms`);
    }
  }
}

/**
 * Concurrent User Simulator using Worker Threads
 */
export class ConcurrentUserSimulator {
  private workers: Worker[] = [];

  constructor(public readonly maxWorkers: number = cpus().length * 2) {
    console.log(`User simulator initialized with max ${maxWorkers} workers`);
  }

  /**
   * Simulate concurrent users with realistic behavior patterns
   */
  async simulateUsers(
    userCount: number,
    duration: number,
    testFunction: (userId: string) => Promise<void>
  ): Promise<{ totalRequests: number; errors: number; responseTimes: number[] }> {

    console.log(`🚀 Starting ${userCount} concurrent users for ${duration} seconds`);

    const results = {
      totalRequests: 0,
      errors: 0,
      responseTimes: [] as number[]
    };

    const userPromises: Promise<void>[] = [];

    // Create user simulation promises
    for (let i = 0; i < userCount; i++) {
      const userPromise = this.simulateIndividualUser(
        `user-${i}`,
        duration,
        testFunction,
        results
      );
      userPromises.push(userPromise);

      // Add slight delay to simulate realistic user arrival
      if (i % 100 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Wait for all users to complete
    await Promise.all(userPromises);

    return results;
  }

  /**
   * Simulate individual user behavior
   */
  private async simulateIndividualUser(
    userId: string,
    duration: number,
    testFunction: (userId: string) => Promise<void>,
    results: { totalRequests: number; errors: number; responseTimes: number[] }
  ): Promise<void> {

    const endTime = Date.now() + (duration * 1000);
    const thinkTimes = [500, 1000, 1500, 2000, 3000]; // Realistic user think times

    while (Date.now() < endTime) {
      const startTime = performance.now();

      try {
        await testFunction(userId);

        const responseTime = performance.now() - startTime;
        results.responseTimes.push(responseTime);
        results.totalRequests++;

      } catch (error) {
        results.errors++;
        const errorObj = error as Error;
        console.error(`User ${userId} error:`, errorObj.message);
      }

      // Random think time to simulate real user behavior
      const thinkTime = thinkTimes[Math.floor(Math.random() * thinkTimes.length)];
      await new Promise(resolve => setTimeout(resolve, thinkTime));
    }
  }

  /**
   * Cleanup worker threads
   */
  async cleanup(): Promise<void> {
    const terminationPromises = this.workers.map(worker => worker.terminate());
    await Promise.all(terminationPromises);
    this.workers = [];
  }
}

/**
 * Load Test Report Generator
 */
export class LoadTestReportGenerator {

  /**
   * Generate comprehensive load test report
   */
  static generateReport(
    testName: string,
    targetUsers: number,
    achievedUsers: number,
    metrics: LoadTestMetrics[],
    responseTimes: number[],
    totalRequests: number,
    errors: number
  ): LoadTestReport {

    if (metrics.length === 0) {
      throw new Error('No metrics available for report generation');
    }

    const startTime = metrics[0].timestamp;
    const endTime = metrics[metrics.length - 1].timestamp;
    const duration = endTime - startTime;

    // Calculate response time percentiles
    const sortedResponseTimes = [...responseTimes].sort((a, b) => a - b);
    const p50Index = Math.floor(sortedResponseTimes.length * 0.5);
    const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
    const p99Index = Math.floor(sortedResponseTimes.length * 0.99);

    const summary = {
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0,
      p50ResponseTime: sortedResponseTimes[p50Index] || 0,
      p95ResponseTime: sortedResponseTimes[p95Index] || 0,
      p99ResponseTime: sortedResponseTimes[p99Index] || 0,
      errorRate: totalRequests > 0 ? (errors / totalRequests) * 100 : 0,
      peakThroughput: Math.max(...metrics.map(m => m.requestsPerSecond)),
      sustainedThroughput: metrics.reduce((sum, m) => sum + m.requestsPerSecond, 0) / metrics.length
    };

    const recommendations = this.generateRecommendations(summary, metrics);

    return {
      testName,
      startTime,
      endTime,
      duration,
      targetUsers,
      achievedUsers,
      totalRequests,
      successfulRequests: totalRequests - errors,
      failedRequests: errors,
      metrics,
      summary,
      recommendations
    };
  }

  /**
   * Generate performance recommendations
   */
  private static generateRecommendations(
    summary: any,
    metrics: LoadTestMetrics[]
  ): string[] {
    const recommendations: string[] = [];

    // Response time recommendations
    if (summary.averageResponseTime > 2000) {
      recommendations.push('🐌 High average response time detected. Consider optimizing database queries and adding caching.');
    }

    if (summary.p95ResponseTime > 5000) {
      recommendations.push('📊 High P95 response time indicates tail latency issues. Investigate slow operations and implement timeouts.');
    }

    // Error rate recommendations
    if (summary.errorRate > 5) {
      recommendations.push('❌ High error rate detected. Implement circuit breakers and improve error handling.');
    }

    // Throughput recommendations
    if (summary.sustainedThroughput < summary.peakThroughput * 0.7) {
      recommendations.push('📉 Significant throughput degradation under load. Consider horizontal scaling.');
    }

    // System resource recommendations
    const avgMemoryUsage = metrics.reduce((sum, m) => sum + m.systemLoad.memory.usedPercent, 0) / metrics.length;
    const avgCpuLoad = metrics.reduce((sum, m) => sum + m.systemLoad.loadAverage[0], 0) / metrics.length;

    if (avgMemoryUsage > 80) {
      recommendations.push('💾 High memory usage detected. Consider increasing memory allocation or optimizing memory usage.');
    }

    if (avgCpuLoad > cpus().length * 0.8) {
      recommendations.push('🖥️  High CPU load detected. Consider vertical scaling or optimizing CPU-intensive operations.');
    }

    // Performance grade recommendations
    const performanceScore = this.calculatePerformanceScore(summary);
    if (performanceScore < 70) {
      recommendations.push('⚠️  Overall performance score is below acceptable levels. Comprehensive optimization required.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ System performance within acceptable parameters. Monitor for any degradation trends.');
    }

    return recommendations;
  }

  /**
   * Calculate overall performance score (0-100)
   */
  private static calculatePerformanceScore(summary: any): number {
    let score = 100;

    // Deduct for high response times
    if (summary.averageResponseTime > 1000) {
      score -= Math.min(30, (summary.averageResponseTime - 1000) / 100);
    }

    // Deduct for high error rates
    if (summary.errorRate > 1) {
      score -= Math.min(40, summary.errorRate * 8);
    }

    // Deduct for poor P95 performance
    if (summary.p95ResponseTime > 3000) {
      score -= Math.min(20, (summary.p95ResponseTime - 3000) / 200);
    }

    // Deduct for low throughput
    if (summary.sustainedThroughput < 100) {
      score -= Math.min(10, (100 - summary.sustainedThroughput) / 10);
    }

    return Math.max(0, score);
  }

  /**
   * Export report to markdown file
   */
  static exportToMarkdown(report: LoadTestReport, outputPath: string): void {
    const performanceScore = this.calculatePerformanceScore(report.summary);
    const grade = performanceScore >= 90 ? 'A' : performanceScore >= 80 ? 'B' :
                  performanceScore >= 70 ? 'C' : performanceScore >= 60 ? 'D' : 'F';

    const markdownContent = `
# Load Test Report: ${report.testName}

## Test Summary
- **Start Time**: ${new Date(report.startTime).toLocaleString()}
- **End Time**: ${new Date(report.endTime).toLocaleString()}
- **Duration**: ${(report.duration / 1000).toFixed(2)} seconds
- **Target Users**: ${report.targetUsers.toLocaleString()}
- **Achieved Users**: ${report.achievedUsers.toLocaleString()}
- **Success Rate**: ${((report.achievedUsers / report.targetUsers) * 100).toFixed(1)}%

## Request Statistics
- **Total Requests**: ${report.totalRequests.toLocaleString()}
- **Successful Requests**: ${report.successfulRequests.toLocaleString()}
- **Failed Requests**: ${report.failedRequests.toLocaleString()}
- **Error Rate**: ${report.summary.errorRate.toFixed(2)}%

## Performance Metrics
- **Average Response Time**: ${report.summary.averageResponseTime.toFixed(2)}ms
- **P50 Response Time**: ${report.summary.p50ResponseTime.toFixed(2)}ms
- **P95 Response Time**: ${report.summary.p95ResponseTime.toFixed(2)}ms
- **P99 Response Time**: ${report.summary.p99ResponseTime.toFixed(2)}ms

## Throughput Analysis
- **Peak Throughput**: ${report.summary.peakThroughput.toFixed(2)} req/s
- **Sustained Throughput**: ${report.summary.sustainedThroughput.toFixed(2)} req/s
- **Throughput Stability**: ${((report.summary.sustainedThroughput / report.summary.peakThroughput) * 100).toFixed(1)}%

## Performance Grade
**${grade}** (Score: ${performanceScore.toFixed(1)}/100)

## Recommendations
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## System Resource Usage
### Memory Usage Over Time
${this.generateResourceChart(report.metrics.map(m => m.systemLoad.memory.usedPercent), 'Memory (%)')}

### CPU Load Over Time
${this.generateResourceChart(report.metrics.map(m => m.systemLoad.loadAverage[0]), 'CPU Load')}

## Detailed Metrics
${this.generateMetricsTable(report.metrics.slice(0, 10))} <!-- First 10 metrics -->

---
*Report generated on ${new Date().toLocaleString()}*
`;

    fs.writeFileSync(outputPath, markdownContent.trim());
    console.log(`📄 Report exported to: ${outputPath}`);
  }

  /**
   * Generate simple ASCII chart for resource usage
   */
  private static generateResourceChart(values: number[], label: string): string {
    if (values.length === 0) return 'No data available';

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    const chart = values.slice(0, 20).map(value => {
      const normalized = Math.round(((value - min) / range) * 20);
      return '█'.repeat(Math.max(1, normalized));
    });

    return `
\`\`\`
${label} (${min.toFixed(1)} - ${max.toFixed(1)})
${chart.join('\n')}
\`\`\`
`;
  }

  /**
   * Generate metrics table
   */
  private static generateMetricsTable(metrics: LoadTestMetrics[]): string {
    if (metrics.length === 0) return 'No metrics available';

    let table = '| Time | Users | RPS | Avg Response | Error Rate | Memory % | CPU Load |\n';
    table += '|------|-------|-----|--------------|------------|----------|----------|\n';

    metrics.forEach(metric => {
      const time = new Date(metric.timestamp).toLocaleTimeString();
      table += `| ${time} | ${metric.concurrentUsers} | ${metric.requestsPerSecond.toFixed(1)} | ${metric.averageResponseTime.toFixed(0)}ms | ${metric.errorRate.toFixed(2)}% | ${metric.systemLoad.memory.usedPercent.toFixed(1)}% | ${metric.systemLoad.loadAverage[0].toFixed(2)} |\n`;
    });

    return table;
  }

  /**
   * Export report to JSON file
   */
  static exportToJson(report: LoadTestReport, outputPath: string): void {
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`📊 JSON report exported to: ${outputPath}`);
  }
}

/**
 * Load Test Configuration Validator
 */
export class LoadTestValidator {

  /**
   * Validate load test configuration
   */
  static validateConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.targetUsers || config.targetUsers < 1) {
      errors.push('targetUsers must be a positive number');
    }

    if (!config.duration || config.duration < 1) {
      errors.push('duration must be a positive number');
    }

    if (config.targetUsers > 50000) {
      errors.push('targetUsers exceeds recommended maximum of 50,000');
    }

    if (config.rampUpDuration && config.rampUpDuration < 0) {
      errors.push('rampUpDuration cannot be negative');
    }

    if (config.thinkTime && config.thinkTime < 0) {
      errors.push('thinkTime cannot be negative');
    }

    if (config.timeout && config.timeout < 1000) {
      errors.push('timeout should be at least 1000ms');
    }

    // Check system resources
    const availableMemory = freemem() / (1024 * 1024 * 1024); // GB
    const estimatedMemoryUsage = config.targetUsers * 0.001; // Rough estimate: 1MB per user

    if (estimatedMemoryUsage > availableMemory * 0.8) {
      errors.push(`Estimated memory usage (${estimatedMemoryUsage.toFixed(1)}GB) exceeds 80% of available memory (${availableMemory.toFixed(1)}GB)`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate system capacity for load test
   */
  static validateSystemCapacity(targetUsers: number): { capable: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const cpuCount = cpus().length;
    const totalMemoryGB = totalmem() / (1024 * 1024 * 1024);
    const freeMemoryGB = freemem() / (1024 * 1024 * 1024);

    console.log(`System capacity check: ${totalMemoryGB.toFixed(1)}GB total, ${freeMemoryGB.toFixed(1)}GB free`);

    // Check CPU capacity
    const recommendedCpuRatio = targetUsers / cpuCount;
    if (recommendedCpuRatio > 500) {
      warnings.push(`High CPU load expected: ${recommendedCpuRatio.toFixed(0)} users per CPU core`);
    }

    // Check memory capacity
    const estimatedMemoryUsage = (targetUsers * 2) / 1024; // 2MB per user estimate
    if (estimatedMemoryUsage > freeMemoryGB * 0.8) {
      warnings.push(`Memory usage may exceed capacity: ${estimatedMemoryUsage.toFixed(1)}GB estimated, ${freeMemoryGB.toFixed(1)}GB free`);
    }

    // Check file descriptor limits (approximate)
    if (targetUsers > 10000) {
      warnings.push('High user count may hit file descriptor limits. Ensure ulimit is properly configured.');
    }

    return {
      capable: warnings.length === 0,
      warnings
    };
  }
}

/**
 * Load Test Scenario Builder
 */
export class LoadTestScenarioBuilder {
  private config: any = {};

  /**
   * Set target users
   */
  withTargetUsers(users: number): LoadTestScenarioBuilder {
    this.config.targetUsers = users;
    return this;
  }

  /**
   * Set test duration
   */
  withDuration(seconds: number): LoadTestScenarioBuilder {
    this.config.duration = seconds;
    return this;
  }

  /**
   * Set ramp-up duration
   */
  withRampUp(seconds: number): LoadTestScenarioBuilder {
    this.config.rampUpDuration = seconds;
    return this;
  }

  /**
   * Set think time between requests
   */
  withThinkTime(milliseconds: number): LoadTestScenarioBuilder {
    this.config.thinkTime = milliseconds;
    return this;
  }

  /**
   * Set request timeout
   */
  withTimeout(milliseconds: number): LoadTestScenarioBuilder {
    this.config.timeout = milliseconds;
    return this;
  }

  /**
   * Build the scenario configuration
   */
  build(): any {
    const validation = LoadTestValidator.validateConfig(this.config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    return { ...this.config };
  }

  /**
   * Build predefined scenario
   */
  static buildScenario(type: 'baseline' | 'medium' | 'high' | 'stress'): any {
    const builder = new LoadTestScenarioBuilder();

    switch (type) {
      case 'baseline':
        return builder
          .withTargetUsers(100)
          .withDuration(300)
          .withRampUp(30)
          .withThinkTime(1000)
          .withTimeout(10000)
          .build();

      case 'medium':
        return builder
          .withTargetUsers(1000)
          .withDuration(600)
          .withRampUp(60)
          .withThinkTime(500)
          .withTimeout(15000)
          .build();

      case 'high':
        return builder
          .withTargetUsers(5000)
          .withDuration(600)
          .withRampUp(120)
          .withThinkTime(250)
          .withTimeout(20000)
          .build();

      case 'stress':
        return builder
          .withTargetUsers(10000)
          .withDuration(600)
          .withRampUp(180)
          .withThinkTime(100)
          .withTimeout(30000)
          .build();

      default:
        throw new Error(`Unknown scenario type: ${type}`);
    }
  }
}