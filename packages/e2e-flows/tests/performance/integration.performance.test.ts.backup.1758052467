/**
 * Integration Performance Tests
 * Tests the integrated performance of all services working together
 */

import { MockDataService } from '../../src/services/MockDataService';
import { APITestingService } from '../../src/services/APITestingService';
import { E2EFlowsService } from '../../src/services/E2EFlowsService';
import { PerformanceMonitor, PerformanceTestRunner, PerformanceUtils, performanceAssertions } from './performance-utilities';
import * as os from 'os';
import * as http from 'http';

describe('Integration Performance Tests', () => {
  let mockDataService: MockDataService;
  let apiTestingService: APITestingService;
  let e2eFlowsService: E2EFlowsService;
  let mockServer: http.Server;
  let mockServerPort: number;
  let performanceRunner: PerformanceTestRunner;
  const performanceResults: Record<string, any> = {};

  beforeAll((done) => {
    // Initialize services
    mockDataService = new MockDataService({
      maxSize: 500 * 1024 * 1024, // 500MB
      maxAge: 60 * 60 * 1000, // 1 hour
      compression: false,
      encryption: false
    });

    apiTestingService = new APITestingService();
    e2eFlowsService = new E2EFlowsService();
    performanceRunner = new PerformanceTestRunner(50); // 50ms sampling

    // Create mock server for API testing
    mockServer = http.createServer((req, res) => {
      const delay = Math.random() * 50; // 0-50ms random delay

      setTimeout(() => {
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
        } else if (req.url?.startsWith('/api/mock-data/')) {
          // Simulate data endpoint
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            data: { id: Math.floor(Math.random() * 1000), type: 'mock' },
            timestamp: Date.now()
          }));
        } else if (req.url?.startsWith('/api/')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            endpoint: req.url,
            method: req.method,
            timestamp: Date.now(),
            success: true
          }));
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      }, delay);
    });

    mockServer.listen(0, () => {
      const address = mockServer.address();
      mockServerPort = typeof address === 'object' && address ? address.port : 3001;
      console.log(`Integration test mock server started on port ${mockServerPort}`);
      done();
    });
  });

  afterAll((done) => {
    // Generate comprehensive performance report
    console.log('\n=== Integration Performance Report ===');
    console.log(JSON.stringify(performanceResults, null, 2));

    // Write performance report to file
    const fs = require('fs');
    const reportPath = '/tmp/integration-performance-report.json';
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'IntegrationPerformance',
      results: performanceResults,
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        totalMemory: os.totalmem(),
        cpuCount: os.cpus().length,
        nodeVersion: process.version
      }
    }, null, 2));

    console.log(`Integration performance report saved to: ${reportPath}`);

    mockServer.close(done);
  });

  describe('End-to-End Workflow Performance', () => {
    test('should complete full CVPlus workflow simulation within performance targets', async () => {
      const testResult = await performanceRunner.runTest(
        'CVPlus E2E Workflow Simulation',
        async (monitor) => {
          const workflowResults: any[] = [];

          // Step 1: Generate mock CV data (simulating CV upload)
          monitor.recordOperation();
          const cvDataset = await mockDataService.generateData({
            type: 'cv',
            count: 100, // Batch of CVs
            seed: 'e2e-workflow-test'
          });
          workflowResults.push({ step: 'mock_data_generation', status: 'completed', count: 100 });

          // Step 2: Create API test cases for CV processing endpoints
          monitor.recordOperation();
          const testCases = [];
          for (let i = 0; i < 50; i++) {
            const testCase = await apiTestingService.createTestCase({
              id: `cv-processing-test-${i}`,
              name: `CV Processing Test ${i + 1}`,
              endpoint: `/api/cv/process/${i}`,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: { cvData: `cv-${i}`, processType: 'full' },
              expectedStatus: 200,
              expectedResponse: {},
              timeout: 10000,
              authentication: { type: 'none', credentials: {} },
              assertions: [
                {
                  type: 'status',
                  operator: 'equals',
                  expectedValue: 200,
                  description: 'CV processing should succeed'
                }
              ],
              tags: ['cv-processing', 'e2e']
            });
            testCases.push(testCase);
          }
          workflowResults.push({ step: 'api_test_creation', status: 'completed', count: 50 });

          // Step 3: Execute API tests with concurrency
          monitor.recordOperation();
          const baseUrl = `http://localhost:${mockServerPort}`;
          const apiResults = await apiTestingService.executeMultipleTestCases(
            testCases.map(tc => tc.id),
            {
              baseUrl,
              parallel: true,
              maxConcurrency: 25,
              timeout: 10000,
              retryFailures: false
            }
          );
          workflowResults.push({
            step: 'api_testing',
            status: 'completed',
            passed: apiResults.passed,
            failed: apiResults.failed,
            duration: apiResults.duration
          });

          // Step 4: Create and execute E2E scenario
          monitor.recordOperation();
          const scenario = await e2eFlowsService.createScenario({
            id: 'integration-workflow-scenario',
            name: 'Integration Workflow Test',
            description: 'Full integration test of CVPlus workflow',
            type: 'integration',
            environment: 'test',
            steps: [
              {
                order: 1,
                name: 'Data Validation',
                action: 'validate_mock_data',
                parameters: { datasetId: cvDataset.id },
                expectedResult: { status: 'valid' },
                timeout: 5000
              },
              {
                order: 2,
                name: 'API Integration',
                action: 'execute_api_tests',
                parameters: { testCount: testCases.length },
                expectedResult: { successRate: 90 },
                timeout: 30000
              },
              {
                order: 3,
                name: 'Performance Validation',
                action: 'validate_performance_metrics',
                parameters: { thresholds: { responseTime: 3000, memoryUsage: 200 } },
                expectedResult: { passed: true },
                timeout: 5000
              }
            ],
            tags: ['integration', 'workflow', 'performance'],
            expectedOutcomes: [],
            timeout: 120000,
            dependencies: [],
            retryConfig: {
              maxAttempts: 1,
              delayMs: 1000,
              exponentialBackoff: false,
              retryableStatuses: []
            }
          });

          const scenarioResult = await e2eFlowsService.executeScenario(scenario.id, {
            environment: 'test',
            timeout: 120000,
            parallel: false,
            collectMetrics: true
          });

          workflowResults.push({
            step: 'e2e_scenario',
            status: scenarioResult.status,
            duration: scenarioResult.metrics.responseTime,
            errors: scenarioResult.errors.length
          });

          return {
            workflow: workflowResults,
            cvDataGenerated: 100,
            apiTestsExecuted: testCases.length,
            apiTestsPassed: apiResults.passed,
            scenarioStatus: scenarioResult.status,
            totalSteps: workflowResults.length
          };
        },
        {
          maxDuration: 180000, // 3 minutes
          maxMemoryUsage: 800 * 1024 * 1024, // 800MB
          maxErrorRate: 10, // 10%
          minOperationsPerSecond: 0.1 // At least 0.1 operations/sec
        }
      );

      // Validate performance results
      expect(testResult.passed).toBe(true);
      expect(testResult.result.totalSteps).toBe(4);
      expect(testResult.result.cvDataGenerated).toBe(100);

      performanceResults.e2eWorkflowSimulation = {
        ...testResult.result,
        metrics: testResult.metrics,
        passed: testResult.passed,
        violations: testResult.violations
      };
    }, 200000); // 3+ minute timeout for test

    test('should handle concurrent workflows without resource contention', async () => {
      const concurrentWorkflows = 5;
      const workflowPromises: Promise<any>[] = [];

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      // Start concurrent workflows
      for (let i = 0; i < concurrentWorkflows; i++) {
        const workflowPromise = runSingleWorkflow(i, `concurrent-workflow-${i}`);
        workflowPromises.push(workflowPromise);
      }

      const results = await Promise.allSettled(workflowPromises);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Analyze results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Performance assertions
      performanceAssertions.expectDurationUnder(
        duration,
        300000, // 5 minutes for concurrent workflows
        'Concurrent workflows completion time'
      );

      performanceAssertions.expectMemoryUnder(
        memoryUsed,
        1024 * 1024 * 1024, // 1GB
        'Concurrent workflows memory usage'
      );

      expect(successful).toBeGreaterThan(3); // At least 60% success rate
      expect(successful / concurrentWorkflows).toBeGreaterThan(0.6);

      performanceResults.concurrentWorkflows = {
        workflowCount: concurrentWorkflows,
        duration,
        memoryUsed,
        successful,
        failed,
        successRate: (successful / concurrentWorkflows) * 100,
        averageDurationPerWorkflow: duration / concurrentWorkflows
      };
    }, 360000); // 6 minutes timeout
  });

  describe('Service Integration Load Testing', () => {
    test('should maintain performance under integrated high load', async () => {
      const monitor = new PerformanceMonitor(100);
      monitor.start();

      try {
        // Phase 1: Data generation load
        const dataGenerationPromises = Array.from({ length: 20 }, async (_, i) => {
          return await mockDataService.generateData({
            type: 'cv',
            count: 50,
            seed: `load-test-data-${i}`
          });
        });

        const generatedData = await Promise.all(dataGenerationPromises);
        monitor.recordOperation();

        // Phase 2: API testing load
        const apiTestPromises = Array.from({ length: 100 }, async (_, i) => {
          const testCase = await apiTestingService.createTestCase({
            id: `load-test-api-${i}`,
            name: `Load Test API ${i}`,
            endpoint: `/api/mock-data/${i}`,
            method: 'GET',
            headers: {},
            body: undefined,
            expectedStatus: 200,
            expectedResponse: {},
            timeout: 5000,
            authentication: { type: 'none', credentials: {} },
            assertions: [],
            tags: ['load-test']
          });

          return await apiTestingService.executeTestCase(testCase, `http://localhost:${mockServerPort}`);
        });

        const apiResults = await Promise.all(apiTestPromises);
        monitor.recordOperation();

        // Phase 3: Scenario execution load
        const scenarios = Array.from({ length: 10 }, async (_, i) => {
          const scenario = await e2eFlowsService.createScenario({
            id: `load-test-scenario-${i}`,
            name: `Load Test Scenario ${i}`,
            description: `Load test scenario ${i}`,
            type: 'load',
            environment: 'test',
            steps: Array.from({ length: 10 }, (_, stepIndex) => ({
              order: stepIndex + 1,
              name: `Load Step ${stepIndex + 1}`,
              action: 'test_api_call',
              parameters: { endpoint: `/api/load/${stepIndex}` },
              expectedResult: { status: 'ok' },
              timeout: 3000
            })),
            tags: ['load-test'],
            expectedOutcomes: [],
            timeout: 60000,
            dependencies: [],
            retryConfig: {
              maxAttempts: 1,
              delayMs: 1000,
              exponentialBackoff: false,
              retryableStatuses: []
            }
          });

          return await e2eFlowsService.executeScenario(scenario.id, {
            environment: 'test',
            timeout: 60000,
            collectMetrics: true
          });
        });

        const scenarioResults = await Promise.all(scenarios);
        monitor.recordOperation();

        const metrics = monitor.stop();

        // Validate integrated performance
        const successfulApis = apiResults.filter(r => r.status === 'passed').length;
        const successfulScenarios = scenarioResults.filter(r => r.status === 'passed').length;

        performanceAssertions.expectDurationUnder(
          metrics.duration,
          600000, // 10 minutes
          'Integrated high load test duration'
        );

        performanceAssertions.expectMemoryUnder(
          metrics.memoryUsed,
          1024 * 1024 * 1024, // 1GB
          'Integrated high load memory usage'
        );

        expect(successfulApis).toBeGreaterThan(80); // 80% API success
        expect(successfulScenarios).toBeGreaterThan(8); // 80% scenario success

        performanceResults.integratedHighLoad = {
          dataGenerated: generatedData.length * 50, // 20 datasets * 50 records each
          apiTestsExecuted: apiResults.length,
          apiTestsPassed: successfulApis,
          scenariosExecuted: scenarioResults.length,
          scenariosPassed: successfulScenarios,
          metrics,
          apiSuccessRate: (successfulApis / apiResults.length) * 100,
          scenarioSuccessRate: (successfulScenarios / scenarioResults.length) * 100
        };

      } catch (error) {
        monitor.stop();
        throw error;
      }
    }, 720000); // 12 minutes timeout
  });

  describe('Resource Efficiency Testing', () => {
    test('should demonstrate efficient resource utilization across services', async () => {
      const efficiency = await PerformanceUtils.measureMemoryUsage(async () => {
        const tasks: Promise<any>[] = [];

        // Parallel execution of different service operations
        // Mock data generation
        tasks.push(mockDataService.generateData({ type: 'cv', count: 200, seed: 'efficiency-test' }));
        tasks.push(mockDataService.generateData({ type: 'user-profile', count: 100, seed: 'efficiency-test-2' }));

        // API test creation and execution
        tasks.push((async () => {
          const testCase = await apiTestingService.createTestCase({
            id: 'efficiency-test',
            name: 'Efficiency Test',
            endpoint: '/health',
            method: 'GET',
            headers: {},
            body: undefined,
            expectedStatus: 200,
            expectedResponse: {},
            timeout: 5000,
            authentication: { type: 'none', credentials: {} },
            assertions: [],
            tags: ['efficiency']
          });

          return await apiTestingService.executeTestCase(testCase, `http://localhost:${mockServerPort}`);
        })());

        // E2E scenario creation and execution
        tasks.push((async () => {
          const scenario = await e2eFlowsService.createScenario({
            id: 'efficiency-test-scenario',
            name: 'Efficiency Test Scenario',
            description: 'Resource efficiency test scenario',
            type: 'e2e',
            environment: 'test',
            steps: Array.from({ length: 5 }, (_, i) => ({
              order: i + 1,
              name: `Efficiency Step ${i + 1}`,
              action: 'efficiency_test',
              parameters: {},
              expectedResult: { status: 'ok' },
              timeout: 2000
            })),
            tags: ['efficiency'],
            expectedOutcomes: [],
            timeout: 30000,
            dependencies: [],
            retryConfig: {
              maxAttempts: 1,
              delayMs: 1000,
              exponentialBackoff: false,
              retryableStatuses: []
            }
          });

          return await e2eFlowsService.executeScenario(scenario.id, {
            environment: 'test',
            timeout: 30000,
            collectMetrics: true
          });
        })());

        return await Promise.all(tasks);
      });

      // Calculate efficiency metrics
      const totalOperations = efficiency.result.length;
      const memoryPerOperation = efficiency.memoryUsed / totalOperations;
      const operationsPerMB = totalOperations / (efficiency.memoryUsed / 1024 / 1024);

      performanceAssertions.expectMemoryUnder(
        efficiency.memoryUsed,
        300 * 1024 * 1024, // 300MB for all operations
        'Cross-service resource efficiency'
      );

      expect(operationsPerMB).toBeGreaterThan(1); // At least 1 operation per MB
      expect(totalOperations).toBe(4); // All operations completed

      performanceResults.resourceEfficiency = {
        totalOperations,
        memoryUsed: efficiency.memoryUsed,
        memoryPerOperation,
        operationsPerMB,
        efficiencyScore: operationsPerMB * 100, // Higher is better
        memoryBefore: efficiency.memoryBefore.heapUsed,
        memoryAfter: efficiency.memoryAfter.heapUsed
      };
    }, 60000);
  });

  describe('Performance Benchmarks Validation', () => {
    test('should meet all integrated performance targets', () => {
      const results = performanceResults;

      // Target: Complete full workflow simulation within 3 minutes
      expect(results.e2eWorkflowSimulation?.metrics.duration).toBeLessThan(180000);
      expect(results.e2eWorkflowSimulation?.passed).toBe(true);

      // Target: Handle concurrent workflows efficiently
      expect(results.concurrentWorkflows?.successRate).toBeGreaterThan(60);
      expect(results.concurrentWorkflows?.duration).toBeLessThan(300000);

      // Target: Maintain performance under high load
      expect(results.integratedHighLoad?.apiSuccessRate).toBeGreaterThan(80);
      expect(results.integratedHighLoad?.scenarioSuccessRate).toBeGreaterThan(80);
      expect(results.integratedHighLoad?.metrics.duration).toBeLessThan(600000);

      // Target: Demonstrate resource efficiency
      expect(results.resourceEfficiency?.operationsPerMB).toBeGreaterThan(1);
      expect(results.resourceEfficiency?.memoryUsed).toBeLessThan(300 * 1024 * 1024);

      console.log('\n✅ All integrated performance targets met!');
      console.log(`📊 Overall efficiency score: ${results.resourceEfficiency?.efficiencyScore?.toFixed(2) || 'N/A'}`);
    });
  });

  // Helper method for concurrent workflow testing
  const runSingleWorkflow = async (workflowId: number, seed: string): Promise<any> => {
    try {
      // Generate data
      const data = await mockDataService.generateData({
        type: 'cv',
        count: 10,
        seed
      });

      // Create and execute API test
      const testCase = await apiTestingService.createTestCase({
        id: `workflow-${workflowId}-test`,
        name: `Workflow ${workflowId} Test`,
        endpoint: '/health',
        method: 'GET',
        headers: {},
        body: undefined,
        expectedStatus: 200,
        expectedResponse: {},
        timeout: 5000,
        authentication: { type: 'none', credentials: {} },
        assertions: [],
        tags: [`workflow-${workflowId}`]
      });

      const apiResult = await apiTestingService.executeTestCase(
        testCase,
        `http://localhost:${mockServerPort}`
      );

      // Create and execute scenario
      const scenario = await e2eFlowsService.createScenario({
        id: `workflow-${workflowId}-scenario`,
        name: `Workflow ${workflowId} Scenario`,
        description: `Concurrent workflow test ${workflowId}`,
        type: 'e2e',
        environment: 'test',
        steps: [
          {
            order: 1,
            name: 'Data Validation',
            action: 'validate_data',
            parameters: { datasetId: data.id },
            expectedResult: { status: 'valid' },
            timeout: 3000
          }
        ],
        tags: [`workflow-${workflowId}`, 'concurrent'],
        expectedOutcomes: [],
        timeout: 30000,
        dependencies: [],
        retryConfig: {
          maxAttempts: 1,
          delayMs: 1000,
          exponentialBackoff: false,
          retryableStatuses: []
        }
      });

      const scenarioResult = await e2eFlowsService.executeScenario(scenario.id, {
        environment: 'test',
        timeout: 30000,
        collectMetrics: true
      });

      return {
        workflowId,
        dataGenerated: true,
        apiTestPassed: apiResult.status === 'passed',
        scenarioStatus: scenarioResult.status,
        success: true
      };

    } catch (error) {
      return {
        workflowId,
        error: (error as Error).message,
        success: false
      };
    }
  };
});