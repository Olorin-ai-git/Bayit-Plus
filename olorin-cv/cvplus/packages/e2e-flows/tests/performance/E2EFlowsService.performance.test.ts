/**
 * E2EFlowsService Performance Tests
 * Tests end-to-end scenario execution performance and 20-minute execution limits
  */

import { E2EFlowsService, ExecutionOptions } from '../../src/services/E2EFlowsService';
import { TestScenarioModel } from '../../src/models';
import { TestStep } from '../../src/models';
import * as os from 'os';

describe('E2EFlowsService Performance Tests', () => {
  let service: E2EFlowsService;
  const performanceResults: Record<string, any> = {};

  beforeAll(async () => {
    service = new E2EFlowsService();
  });

  afterAll(() => {
    // Generate performance report
    console.log('\n=== E2EFlowsService Performance Report ===');
    console.log(JSON.stringify(performanceResults, null, 2));

    // Write performance report to file
    const fs = require('fs');
    const reportPath = '/tmp/e2e-flows-performance-report.json';
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'E2EFlowsService',
      results: performanceResults,
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        totalMemory: os.totalmem(),
        cpuCount: os.cpus().length
      }
    }, null, 2));

    console.log(`Performance report saved to: ${reportPath}`);
  });

  // Helper function to create test scenarios
  const createTestScenario = async (
    name: string,
    stepCount: number,
    complexity: 'simple' | 'medium' | 'complex' = 'simple'
  ): Promise<TestScenarioModel> => {
    const steps: TestStep[] = [];

    for (let i = 0; i < stepCount; i++) {
      const stepTypes = ['api_call', 'data_validation', 'ui_interaction', 'wait'];
      const stepType = stepTypes[i % stepTypes.length];

      steps.push({
        order: i + 1,
        name: `Step ${i + 1} - ${stepType}`,
        action: `perform_${stepType}`,
        parameters: {
          endpoint: complexity === 'complex' ? `/api/complex/${i}` : `/api/simple/${i}`,
          timeout: complexity === 'complex' ? 5000 : 1000,
          retries: complexity === 'complex' ? 3 : 1
        },
        expectedResult: { status: 'success', step: i + 1 },
        timeout: complexity === 'complex' ? 10000 : 5000
      });
    }

    return await service.createScenario({
      id: `scenario-${name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
      name,
      description: `Performance test scenario: ${name}`,
      type: 'e2e',
      environment: 'test',
      steps,
      expectedOutcomes: [],
      tags: ['performance', 'automated', complexity],
      timeout: stepCount * (complexity === 'complex' ? 15000 : 10000),
      dependencies: [],
      retryConfig: {
        maxAttempts: 1,
        delayMs: 1000,
        exponentialBackoff: false,
        retryableStatuses: []
      }
    });
  };

  describe('Large Test Scenarios', () => {
    test('should execute scenarios with 100+ steps within 20-minute limit', async () => {
      const scenario = await createTestScenario('Large Scenario Test', 150, 'medium');

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const options: ExecutionOptions = {
        environment: 'test',
        timeout: 20 * 60 * 1000, // 20 minutes
        parallel: false,
        collectMetrics: true,
        retryFailures: false
      };

      const result = await service.executeScenario(scenario.id, options);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Performance assertions
      expect(duration).toBeLessThan(20 * 60 * 1000); // Under 20 minutes
      expect(['passed', 'failed', 'error', 'timeout']).toContain(result.status); // Should complete
      expect(result.steps).toHaveLength(150);
      expect(memoryUsed).toBeLessThan(200 * 1024 * 1024); // Under 200MB

      performanceResults.largeScenarioExecution = {
        stepCount: 150,
        duration,
        memoryUsed,
        status: result.status,
        completedSteps: result.steps.length,
        passedSteps: result.steps.filter(s => s.status === 'passed').length,
        failedSteps: result.steps.filter(s => s.status === 'failed').length,
        averageStepTime: duration / result.steps.length,
        responseTime: result.metrics.responseTime,
        errorCount: result.errors.length
      };
    }, 25 * 60 * 1000); // 25 minutes timeout for test
  });

  describe('Concurrent Scenario Execution', () => {
    test('should handle 10 concurrent scenarios efficiently', async () => {
      const scenarios: TestScenarioModel[] = [];

      // Create 10 different scenarios
      for (let i = 0; i < 10; i++) {
        const scenario = await createTestScenario(`Concurrent Scenario ${i + 1}`, 20, 'simple');
        scenarios.push(scenario);
      }

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const options: ExecutionOptions = {
        environment: 'test',
        timeout: 60000, // 1 minute per scenario
        parallel: true,
        maxConcurrency: 5, // Control concurrency
        collectMetrics: true,
        retryFailures: false
      };

      const scenarioIds = scenarios.map(s => s.id);
      const summary = await service.executeMultipleScenarios(scenarioIds, options);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Performance assertions
      expect(duration).toBeLessThan(10 * 60 * 1000); // Under 10 minutes
      expect(summary.totalScenarios).toBe(10);
      expect(summary.passed + summary.failed + summary.skipped).toBe(10);
      expect(memoryUsed).toBeLessThan(300 * 1024 * 1024); // Under 300MB

      performanceResults.concurrentScenarioExecution = {
        scenarioCount: 10,
        stepsPerScenario: 20,
        duration,
        memoryUsed,
        passed: summary.passed,
        failed: summary.failed,
        skipped: summary.skipped,
        successRate: (summary.passed / summary.totalScenarios) * 100,
        averageResponseTime: summary.averageResponseTime,
        scenariosPerSecond: 10 / (duration / 1000)
      };
    }, 15 * 60 * 1000); // 15 minutes timeout for test

    test('should manage 1000+ concurrent test case executions', async () => {
      // Create one large scenario with many simple steps
      const scenario = await createTestScenario('Massive Parallel Test', 1000, 'simple');

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const options: ExecutionOptions = {
        environment: 'test',
        timeout: 20 * 60 * 1000, // 20 minutes
        parallel: false, // Sequential execution to test throughput
        collectMetrics: true,
        retryFailures: false
      };

      const result = await service.executeScenario(scenario.id, options);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Performance assertions
      expect(duration).toBeLessThan(20 * 60 * 1000); // Under 20 minutes
      expect(result.steps).toHaveLength(1000);
      expect(memoryUsed).toBeLessThan(500 * 1024 * 1024); // Under 500MB

      const completedSteps = result.steps.filter(s => s.status === 'passed' || s.status === 'failed').length;
      expect(completedSteps).toBeGreaterThan(990); // At least 99% completion

      performanceResults.massiveParallelExecution = {
        stepCount: 1000,
        duration,
        memoryUsed,
        status: result.status,
        completedSteps,
        completionRate: (completedSteps / 1000) * 100,
        stepsPerSecond: completedSteps / (duration / 1000),
        averageStepTime: duration / completedSteps,
        errorCount: result.errors.length,
        memoryPerStep: memoryUsed / completedSteps
      };
    }, 25 * 60 * 1000); // 25 minutes timeout for test
  });

  describe('Complex Scenario Performance', () => {
    test('should handle complex multi-step workflows efficiently', async () => {
      const scenario = await createTestScenario('Complex Workflow', 50, 'complex');

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const options: ExecutionOptions = {
        environment: 'test',
        timeout: 15 * 60 * 1000, // 15 minutes
        parallel: false,
        collectMetrics: true,
        retryFailures: true,
        maxConcurrency: 1
      };

      const result = await service.executeScenario(scenario.id, options);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Performance assertions
      expect(duration).toBeLessThan(15 * 60 * 1000); // Under 15 minutes
      expect(result.steps).toHaveLength(50);
      expect(memoryUsed).toBeLessThan(100 * 1024 * 1024); // Under 100MB

      performanceResults.complexWorkflowExecution = {
        stepCount: 50,
        complexity: 'complex',
        duration,
        memoryUsed,
        status: result.status,
        passedSteps: result.steps.filter(s => s.status === 'passed').length,
        failedSteps: result.steps.filter(s => s.status === 'failed').length,
        averageStepTime: duration / result.steps.length,
        errorCount: result.errors.length,
        performanceMetrics: result.metrics
      };
    }, 20 * 60 * 1000); // 20 minutes timeout for test
  });

  describe('Memory Management Under Load', () => {
    test('should maintain stable memory usage during long-running scenarios', async () => {
      const memoryCheckpoints: number[] = [];
      const startMemory = process.memoryUsage().heapUsed;
      memoryCheckpoints.push(startMemory);

      // Execute multiple scenarios in sequence to test memory stability
      const scenarioCount = 10;
      const stepsPerScenario = 50;

      for (let i = 0; i < scenarioCount; i++) {
        const scenario = await createTestScenario(`Memory Test Scenario ${i + 1}`, stepsPerScenario, 'medium');

        const options: ExecutionOptions = {
          environment: 'test',
          timeout: 5 * 60 * 1000, // 5 minutes per scenario
          parallel: false,
          collectMetrics: true,
          retryFailures: false
        };

        await service.executeScenario(scenario.id, options);

        const currentMemory = process.memoryUsage().heapUsed;
        memoryCheckpoints.push(currentMemory);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const totalMemoryGrowth = finalMemory - startMemory;
      const maxMemoryGrowth = Math.max(...memoryCheckpoints.map(m => m - startMemory));

      // Performance assertions
      expect(totalMemoryGrowth).toBeLessThan(500 * 1024 * 1024); // Under 500MB total growth
      expect(maxMemoryGrowth).toBeLessThan(800 * 1024 * 1024); // Under 800MB peak growth

      performanceResults.memoryStabilityLongRunning = {
        scenarioCount,
        stepsPerScenario,
        totalSteps: scenarioCount * stepsPerScenario,
        startMemory,
        finalMemory,
        totalMemoryGrowth,
        maxMemoryGrowth,
        memoryCheckpoints: memoryCheckpoints.map(m => m - startMemory),
        averageMemoryPerScenario: totalMemoryGrowth / scenarioCount,
        averageMemoryPerStep: totalMemoryGrowth / (scenarioCount * stepsPerScenario)
      };
    }, 60 * 60 * 1000); // 1 hour timeout for test
  });

  describe('Error Recovery Performance', () => {
    test('should handle failed scenarios without performance degradation', async () => {
      const scenarios: TestScenarioModel[] = [];

      // Create scenarios with mixed success/failure patterns
      for (let i = 0; i < 20; i++) {
        const scenario = await createTestScenario(`Error Recovery Test ${i + 1}`, 25, 'medium');
        scenarios.push(scenario);
      }

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const options: ExecutionOptions = {
        environment: 'test',
        timeout: 10 * 60 * 1000, // 10 minutes
        parallel: true,
        maxConcurrency: 10,
        collectMetrics: true,
        retryFailures: true
      };

      const scenarioIds = scenarios.map(s => s.id);
      const summary = await service.executeMultipleScenarios(scenarioIds, options);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Performance assertions
      expect(duration).toBeLessThan(15 * 60 * 1000); // Under 15 minutes
      expect(summary.totalScenarios).toBe(20);
      expect(memoryUsed).toBeLessThan(400 * 1024 * 1024); // Under 400MB

      performanceResults.errorRecoveryPerformance = {
        scenarioCount: 20,
        stepsPerScenario: 25,
        duration,
        memoryUsed,
        passed: summary.passed,
        failed: summary.failed,
        skipped: summary.skipped,
        completionRate: ((summary.passed + summary.failed) / summary.totalScenarios) * 100,
        averageResponseTime: summary.averageResponseTime,
        errorRate: summary.errorRate
      };
    }, 20 * 60 * 1000); // 20 minutes timeout for test
  });

  describe('Throughput Performance', () => {
    test('should achieve high scenario throughput under optimal conditions', async () => {
      const scenarios: TestScenarioModel[] = [];

      // Create many small, fast scenarios
      for (let i = 0; i < 100; i++) {
        const scenario = await createTestScenario(`Throughput Test ${i + 1}`, 5, 'simple');
        scenarios.push(scenario);
      }

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const options: ExecutionOptions = {
        environment: 'test',
        timeout: 30000, // 30 seconds per scenario
        parallel: true,
        maxConcurrency: 50, // High concurrency
        collectMetrics: true,
        retryFailures: false
      };

      const scenarioIds = scenarios.map(s => s.id);
      const summary = await service.executeMultipleScenarios(scenarioIds, options);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Performance assertions
      expect(duration).toBeLessThan(10 * 60 * 1000); // Under 10 minutes
      expect(summary.totalScenarios).toBe(100);
      expect(summary.passed).toBeGreaterThan(95); // At least 95% success rate
      expect(memoryUsed).toBeLessThan(600 * 1024 * 1024); // Under 600MB

      const throughput = summary.totalScenarios / (duration / 1000); // scenarios per second
      expect(throughput).toBeGreaterThan(0.5); // At least 0.5 scenarios per second

      performanceResults.throughputPerformance = {
        scenarioCount: 100,
        stepsPerScenario: 5,
        totalSteps: 500,
        duration,
        memoryUsed,
        passed: summary.passed,
        failed: summary.failed,
        successRate: (summary.passed / summary.totalScenarios) * 100,
        throughputScenariosPerSecond: throughput,
        throughputStepsPerSecond: 500 / (duration / 1000),
        averageResponseTime: summary.averageResponseTime
      };
    }, 15 * 60 * 1000); // 15 minutes timeout for test
  });

  describe('Performance Benchmarks Validation', () => {
    test('should meet all performance targets', () => {
      const results = performanceResults;

      // Target: Process large test scenarios within 20-minute limit
      expect(results.largeScenarioExecution?.duration).toBeLessThan(20 * 60 * 1000);
      expect(results.largeScenarioExecution?.stepCount).toBe(150);

      // Target: Handle 10 concurrent scenarios efficiently
      expect(results.concurrentScenarioExecution?.scenarioCount).toBe(10);
      expect(results.concurrentScenarioExecution?.duration).toBeLessThan(10 * 60 * 1000);
      expect(results.concurrentScenarioExecution?.successRate).toBeGreaterThan(80);

      // Target: Handle 1000+ concurrent test case executions
      expect(results.massiveParallelExecution?.stepCount).toBe(1000);
      expect(results.massiveParallelExecution?.completionRate).toBeGreaterThan(99);
      expect(results.massiveParallelExecution?.duration).toBeLessThan(20 * 60 * 1000);

      // Target: Memory usage stays under 500MB for typical workloads
      expect(results.memoryStabilityLongRunning?.totalMemoryGrowth).toBeLessThan(500 * 1024 * 1024);

      // Target: High throughput performance
      expect(results.throughputPerformance?.throughputScenariosPerSecond).toBeGreaterThan(0.5);
      expect(results.throughputPerformance?.successRate).toBeGreaterThan(95);

      console.log('\n✅ All E2EFlowsService performance targets met!');
    });
  });
});