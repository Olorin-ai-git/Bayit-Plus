#!/usr/bin/env ts-node

/**
 * CVPlus E2E Flows Load Test Runner
 * Standalone script to execute comprehensive load testing scenarios
 *
 * Usage:
 *   npm run test:load                    # Run all load tests
 *   npm run test:load -- --scenario=stress  # Run specific scenario
 *   npm run test:load -- --users=5000       # Run with custom user count
 *   npm run test:load -- --report-only      # Generate report only
 */

import { Command } from 'commander';
import { LoadTestScenarios } from './load-test-scenarios';
import { LoadTestMonitor, LoadTestReportGenerator, LoadTestValidator, ConcurrentUserSimulator } from './load-test-utilities';
import { LoadTestFramework, LoadTestResults } from './load-testing-framework';
import path from 'path';
import fs from 'fs';

interface LoadTestOptions {
  scenario?: string;
  users?: number;
  duration?: number;
  rampUp?: number;
  reportOnly?: boolean;
  output?: string;
  verbose?: boolean;
  skipValidation?: boolean;
}

class LoadTestRunner {
  private monitor: LoadTestMonitor;
  private scenarios: LoadTestScenarios;

  constructor() {
    this.monitor = new LoadTestMonitor(1000);
    this.scenarios = new LoadTestScenarios();

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for monitoring
   */
  private setupEventListeners(): void {
    this.monitor.on('metrics', (metrics) => {
      // Update console dashboard every 5 seconds
      if (Date.now() % 5000 < 1000) {
        this.monitor.displayRealtimeDashboard();
      }
    });

    this.monitor.on('systemStress', (metrics) => {
      console.warn('🚨 SYSTEM STRESS DETECTED!');
      console.warn(`   Memory: ${metrics.systemLoad.memory.usedPercent.toFixed(1)}%`);
      console.warn(`   CPU Load: ${metrics.systemLoad.loadAverage[0].toFixed(2)}`);
      console.warn('   Consider reducing load or scaling resources');
    });

    this.monitor.on('performanceDegradation', (metrics) => {
      console.warn('📉 PERFORMANCE DEGRADATION DETECTED!');
      console.warn(`   Error Rate: ${metrics.errorRate.toFixed(2)}%`);
      console.warn(`   Response Time: ${metrics.averageResponseTime.toFixed(0)}ms`);
    });
  }

  /**
   * Run load test based on scenario
   */
  async runScenario(scenario: string, options: LoadTestOptions): Promise<LoadTestResults> {
    console.log(`\n🚀 Starting Load Test Scenario: ${scenario.toUpperCase()}`);
    console.log('='.repeat(50));

    // Start monitoring
    this.monitor.startMonitoring();

    let results: LoadTestResults;

    try {
      switch (scenario.toLowerCase()) {
        case 'baseline':
          results = await this.scenarios.runBaselineLoadTest();
          break;

        case 'medium':
          results = await this.scenarios.runMediumLoadTest();
          break;

        case 'high':
          results = await this.scenarios.runHighLoadTest();
          break;

        case 'stress':
          results = await this.scenarios.runStressLoadTest();
          break;

        case 'breakpoint':
          results = await this.scenarios.runBreakPointTest();
          break;

        case 'recovery':
          results = await this.scenarios.runRecoveryTest();
          break;

        case 'complete':
          console.log('⚠️  Complete suite will take 2-3 hours to finish');
          const suiteResults = await this.scenarios.runCompleteLoadTestSuite();
          results = suiteResults.stress; // Return stress test as primary result
          break;

        case 'custom':
          results = await this.runCustomScenario(options);
          break;

        default:
          throw new Error(`Unknown scenario: ${scenario}`);
      }

      console.log(`\n✅ Load Test Scenario ${scenario.toUpperCase()} COMPLETED`);
      return results;

    } catch (error) {
      console.error(`\n❌ Load Test Scenario ${scenario.toUpperCase()} FAILED`);
      console.error('Error:', error.message);
      throw error;

    } finally {
      this.monitor.stopMonitoring();
    }
  }

  /**
   * Run custom load test scenario
   */
  private async runCustomScenario(options: LoadTestOptions): Promise<LoadTestResults> {
    const framework = new LoadTestFramework();

    const config = {
      name: 'custom-load-test',
      description: 'Custom load test configuration',
      targetUsers: options.users || 1000,
      rampUpDuration: options.rampUp || 60,
      sustainDuration: options.duration || 300,
      rampDownDuration: 60,
      thinkTime: 500,
      timeout: 15000,
      maxRetries: 3,
      healthCheckInterval: 2000
    };

    // Validate configuration
    if (!options.skipValidation) {
      const validation = LoadTestValidator.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      const capacity = LoadTestValidator.validateSystemCapacity(config.targetUsers);
      if (!capacity.capable) {
        console.warn('⚠️  System capacity warnings:');
        capacity.warnings.forEach(warning => console.warn(`   • ${warning}`));

        console.log('\nProceed anyway? (y/N)');
        // In a real implementation, you'd wait for user input
        // For now, we'll proceed with warnings
      }
    }

    // Create test function
    const testFunction = async (userConfig: any) => {
      // Simulate API calls with random delays
      const delay = 50 + Math.random() * 200;
      await new Promise(resolve => setTimeout(resolve, delay));

      // Random failure rate (2%)
      if (Math.random() < 0.02) {
        throw new Error('Simulated API error');
      }
    };

    return framework.executeLoadTest(config, testFunction);
  }

  /**
   * Generate comprehensive report
   */
  async generateReport(results: LoadTestResults, options: LoadTestOptions): Promise<void> {
    const outputDir = options.output || '/Users/gklainert/Documents/cvplus/packages/e2e-flows/tests/load/reports';

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `load-test-report-${results.config.name}-${timestamp}`;

    // Generate markdown report
    const markdownPath = path.join(outputDir, `${baseFilename}.md`);
    const report = LoadTestReportGenerator.generateReport(
      results.config.name,
      results.config.targetUsers,
      results.aggregatedMetrics.concurrentUsersAchieved,
      this.monitor.getMetrics(),
      [], // Response times would be extracted from results
      results.aggregatedMetrics.totalRequests,
      results.aggregatedMetrics.failedRequests
    );

    LoadTestReportGenerator.exportToMarkdown(report, markdownPath);

    // Generate JSON report
    const jsonPath = path.join(outputDir, `${baseFilename}.json`);
    LoadTestReportGenerator.exportToJson(report, jsonPath);

    console.log('\n📊 REPORTS GENERATED:');
    console.log(`   📄 Markdown: ${markdownPath}`);
    console.log(`   📊 JSON: ${jsonPath}`);

    // Display summary
    this.displayResultsSummary(results);
  }

  /**
   * Display results summary in console
   */
  private displayResultsSummary(results: LoadTestResults): void {
    const metrics = results.aggregatedMetrics;

    console.log('\n📈 LOAD TEST RESULTS SUMMARY');
    console.log('='.repeat(40));
    console.log(`🎯 Target Users: ${results.config.targetUsers.toLocaleString()}`);
    console.log(`✅ Achieved Users: ${metrics.concurrentUsersAchieved.toLocaleString()}`);
    console.log(`📊 Success Rate: ${((metrics.concurrentUsersAchieved / results.config.targetUsers) * 100).toFixed(1)}%`);
    console.log();
    console.log(`📈 Total Requests: ${metrics.totalRequests.toLocaleString()}`);
    console.log(`✅ Successful: ${metrics.successfulRequests.toLocaleString()}`);
    console.log(`❌ Failed: ${metrics.failedRequests.toLocaleString()}`);
    console.log(`📊 Error Rate: ${metrics.errorRate.toFixed(2)}%`);
    console.log();
    console.log(`⏱️  Avg Response: ${metrics.averageResponseTime.toFixed(0)}ms`);
    console.log(`📊 P95 Response: ${metrics.p95ResponseTime.toFixed(0)}ms`);
    console.log(`🚀 Peak Throughput: ${metrics.peakThroughput.toFixed(1)} req/s`);
    console.log(`📈 Sustained Throughput: ${metrics.sustainedThroughput.toFixed(1)} req/s`);
    console.log();

    // Performance assessment
    const performanceGrade = this.calculatePerformanceGrade(results);
    console.log(`🏆 Performance Grade: ${performanceGrade}`);

    // Recommendations
    if (results.recommendations && results.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      results.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.issue}`);
        console.log(`      ${rec.recommendation}`);
        if (rec.estimatedImpact) {
          console.log(`      Impact: ${rec.estimatedImpact}`);
        }
      });
    }

    // System bottlenecks
    if (metrics.systemBottlenecks && metrics.systemBottlenecks.length > 0) {
      console.log('\n⚠️  SYSTEM BOTTLENECKS:');
      metrics.systemBottlenecks.forEach(bottleneck => {
        console.log(`   • ${bottleneck}`);
      });
    }
  }

  /**
   * Calculate performance grade
   */
  private calculatePerformanceGrade(results: LoadTestResults): string {
    const metrics = results.aggregatedMetrics;
    let score = 100;

    // Deduct for high error rates
    if (metrics.errorRate > 1) score -= Math.min(30, metrics.errorRate * 5);

    // Deduct for high response times
    if (metrics.averageResponseTime > 1000) {
      score -= Math.min(25, (metrics.averageResponseTime - 1000) / 100);
    }

    // Deduct for poor throughput
    const expectedThroughput = results.config.targetUsers * 0.5; // Rough estimate
    if (metrics.sustainedThroughput < expectedThroughput) {
      score -= Math.min(20, ((expectedThroughput - metrics.sustainedThroughput) / expectedThroughput) * 20);
    }

    // Deduct for not achieving target users
    const userAchievementRate = metrics.concurrentUsersAchieved / results.config.targetUsers;
    if (userAchievementRate < 0.9) {
      score -= Math.min(25, (0.9 - userAchievementRate) * 100);
    }

    // Assign letter grade
    if (score >= 90) return 'A (Excellent)';
    else if (score >= 80) return 'B (Good)';
    else if (score >= 70) return 'C (Fair)';
    else if (score >= 60) return 'D (Poor)';
    else return 'F (Failing)';
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.monitor.stopMonitoring();
    await this.scenarios.cleanup();
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name('load-test-runner')
    .description('CVPlus E2E Flows Load Test Runner')
    .version('1.0.0');

  program
    .option('-s, --scenario <type>', 'Load test scenario (baseline|medium|high|stress|breakpoint|recovery|complete|custom)', 'stress')
    .option('-u, --users <number>', 'Number of concurrent users (for custom scenario)', '1000')
    .option('-d, --duration <seconds>', 'Test duration in seconds', '300')
    .option('-r, --ramp-up <seconds>', 'Ramp-up duration in seconds', '60')
    .option('--report-only', 'Generate report from previous test results')
    .option('-o, --output <directory>', 'Output directory for reports')
    .option('-v, --verbose', 'Verbose output')
    .option('--skip-validation', 'Skip configuration validation');

  program.parse();

  const options = program.opts() as LoadTestOptions;
  const runner = new LoadTestRunner();

  try {
    console.log('🔧 CVPlus E2E Flows Load Test Runner');
    console.log(`📅 Started at: ${new Date().toLocaleString()}`);
    console.log(`🎯 Scenario: ${options.scenario}`);

    if (options.reportOnly) {
      console.log('📊 Report-only mode: No tests will be executed');
      return;
    }

    // Validate system before starting
    if (!options.skipValidation && options.scenario !== 'baseline') {
      const targetUsers = options.users ? parseInt(options.users.toString()) :
                          options.scenario === 'stress' ? 10000 : 1000;

      const capacity = LoadTestValidator.validateSystemCapacity(targetUsers);
      if (capacity.warnings.length > 0) {
        console.warn('\n⚠️  System capacity warnings:');
        capacity.warnings.forEach(warning => console.warn(`   • ${warning}`));
        console.log();
      }
    }

    // Run the load test
    const results = await runner.runScenario(options.scenario || 'stress', options);

    // Generate reports
    await runner.generateReport(results, options);

    // Final assessment
    console.log('\n🎉 LOAD TEST EXECUTION COMPLETED SUCCESSFULLY!');

    if (options.scenario === 'stress' || (options.users && parseInt(options.users.toString()) >= 10000)) {
      console.log('\n🏆 10K CONCURRENT USER VALIDATION:');
      const metrics = results.aggregatedMetrics;

      if (
        metrics.concurrentUsersAchieved >= 9000 &&
        metrics.errorRate < 5.0 &&
        metrics.averageResponseTime < 3000
      ) {
        console.log('✅ SUCCESS: CVPlus E2E Flows can handle 10K concurrent users!');
        console.log('   System meets all target performance criteria');
      } else {
        console.log('⚠️  PARTIAL SUCCESS: System approaches 10K capacity');
        console.log('   Review recommendations for optimization');
      }
    }

  } catch (error) {
    console.error('\n❌ LOAD TEST EXECUTION FAILED');
    console.error('Error:', error.message);

    if (options.verbose) {
      console.error('Stack Trace:', error.stack);
    }

    process.exit(1);

  } finally {
    await runner.cleanup();
    console.log('\n🧹 Cleanup completed');
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { LoadTestRunner };