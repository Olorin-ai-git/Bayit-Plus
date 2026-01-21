/**
 * APITestingService Performance Tests
 * Tests concurrent API testing with multiple endpoints and high load scenarios
 */

import { APITestingService, TestSuiteOptions } from '../../src/services/APITestingService';
import { APITestCaseModel } from '../../src/models';
import * as os from 'os';
import * as http from 'http';

describe('APITestingService Performance Tests', () => {
  let service: APITestingService;
  let mockServer: http.Server;
  let mockServerPort: number;
  const performanceResults: Record<string, any> = {};

  beforeAll((done) => {
    service = new APITestingService();

    // Create mock server for testing
    mockServer = http.createServer((req, res) => {
      // Simulate different response times
      const delay = Math.random() * 100; // 0-100ms random delay

      setTimeout(() => {
        // Route different endpoints
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
        } else if (req.url === '/slow') {
          setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'slow response', delay: 500 }));
          }, 500);
        } else if (req.url === '/error') {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        } else if (req.url?.startsWith('/api/')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            endpoint: req.url,
            method: req.method,
            timestamp: Date.now(),
            data: { message: 'success' }
          }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      }, delay);
    });

    mockServer.listen(0, () => {
      const address = mockServer.address();
      mockServerPort = typeof address === 'object' && address ? address.port : 3000;
      console.log(`Mock server started on port ${mockServerPort}`);
      done();
    });
  });

  afterAll((done) => {
    // Generate performance report
    console.log('\n=== APITestingService Performance Report ===');
    console.log(JSON.stringify(performanceResults, null, 2));

    // Write performance report to file
    const fs = require('fs');
    const reportPath = '/tmp/api-testing-performance-report.json';
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'APITestingService',
      results: performanceResults,
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        totalMemory: os.totalmem(),
        cpuCount: os.cpus().length
      }
    }, null, 2));

    console.log(`Performance report saved to: ${reportPath}`);

    mockServer.close(done);
  });

  // Helper function to create test cases
  const createTestCase = (endpoint: string, name: string): Promise<APITestCaseModel> => {
    return service.createTestCase({
      id: `test-${endpoint.replace(/[^a-zA-Z0-9]/g, '-')}`,
      name,
      endpoint,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: undefined,
      expectedStatus: 200,
      expectedResponse: {},
      timeout: 5000,
      authentication: { type: 'none', credentials: {} },
      assertions: [
        {
          type: 'status',
          operator: 'equals',
          expectedValue: 200,
          description: 'Status should be 200'
        }
      ],
      tags: ['performance-test']
    });
  };

  describe('Concurrent API Testing', () => {
    test('should execute 100 concurrent API tests in under 10 seconds', async () => {
      const testCases: APITestCaseModel[] = [];

      // Create test cases for different endpoints
      const endpoints = ['/health', '/api/users', '/api/products', '/api/orders'];
      for (let i = 0; i < 100; i++) {
        const endpoint = endpoints[i % endpoints.length];
        const testCase = await createTestCase(endpoint, `Concurrent Test ${i + 1}`);
        testCases.push(testCase);
      }

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const baseUrl = `http://localhost:${mockServerPort}`;
      const options: TestSuiteOptions = {
        baseUrl,
        parallel: true,
        maxConcurrency: 20,
        timeout: 5000,
        retryFailures: false
      };

      // Create temporary test suite
      const suiteName = 'concurrent-performance-test';
      service.createTestSuite(suiteName, { tests: testCases });

      const result = await service.executeTestSuite(suiteName, options);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Performance assertions
      expect(duration).toBeLessThan(10000); // Under 10 seconds
      expect(result.totalTests).toBe(100);
      expect(result.passed).toBeGreaterThan(90); // At least 90% success rate
      expect(memoryUsed).toBeLessThan(100 * 1024 * 1024); // Under 100MB

      performanceResults.concurrentApiTesting = {
        testCount: 100,
        duration,
        memoryUsed,
        passed: result.passed,
        failed: result.failed,
        successRate: (result.passed / result.totalTests) * 100,
        testsPerSecond: 100 / (duration / 1000),
        averageResponseTime: result.summary.averageResponseTime
      };
    }, 15000);

    test('should handle 1000 API test cases with controlled concurrency', async () => {
      const testCases: APITestCaseModel[] = [];

      // Create 1000 test cases
      const endpoints = ['/health', '/api/users', '/api/products', '/api/orders', '/api/analytics'];
      for (let i = 0; i < 1000; i++) {
        const endpoint = endpoints[i % endpoints.length];
        const testCase = await createTestCase(endpoint, `Bulk Test ${i + 1}`);
        testCases.push(testCase);
      }

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const baseUrl = `http://localhost:${mockServerPort}`;
      const options: TestSuiteOptions = {
        baseUrl,
        parallel: true,
        maxConcurrency: 50, // Controlled concurrency
        timeout: 5000,
        retryFailures: false
      };

      // Execute in batches to manage memory
      const batchSize = 200;
      const batches = [];
      for (let i = 0; i < testCases.length; i += batchSize) {
        batches.push(testCases.slice(i, i + batchSize));
      }

      let totalPassed = 0;
      let totalFailed = 0;
      let totalDuration = 0;

      for (const [index, batch] of batches.entries()) {
        const batchSuiteName = `bulk-performance-test-batch-${index}`;
        service.createTestSuite(batchSuiteName, { tests: batch });

        const batchResult = await service.executeTestSuite(batchSuiteName, options);
        totalPassed += batchResult.passed;
        totalFailed += batchResult.failed;
        totalDuration += batchResult.duration;
      }

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const totalTime = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Performance assertions
      expect(totalTime).toBeLessThan(120000); // Under 2 minutes
      expect(totalPassed).toBeGreaterThan(900); // At least 90% success rate
      expect(memoryUsed).toBeLessThan(500 * 1024 * 1024); // Under 500MB

      performanceResults.bulkApiTesting = {
        testCount: 1000,
        batchCount: batches.length,
        totalTime,
        memoryUsed,
        passed: totalPassed,
        failed: totalFailed,
        successRate: (totalPassed / 1000) * 100,
        testsPerSecond: 1000 / (totalTime / 1000),
        averageBatchDuration: totalDuration / batches.length
      };
    }, 150000);
  });

  describe('Response Time Performance', () => {
    test('should maintain <3s response times under load', async () => {
      const testCases: APITestCaseModel[] = [];

      // Create test cases with different expected response times
      for (let i = 0; i < 50; i++) {
        const testCase = await createTestCase('/health', `Response Time Test ${i + 1}`);
        testCases.push(testCase);
      }

      const baseUrl = `http://localhost:${mockServerPort}`;
      const options: TestSuiteOptions = {
        baseUrl,
        parallel: true,
        maxConcurrency: 25,
        timeout: 5000,
        retryFailures: false
      };

      const suiteName = 'response-time-test';
      service.createTestSuite(suiteName, { tests: testCases });

      const result = await service.executeTestSuite(suiteName, options);

      // Performance assertions
      expect(result.summary.averageResponseTime).toBeLessThan(3000); // Under 3 seconds average
      expect(result.summary.maxResponseTime).toBeLessThan(5000); // Max under 5 seconds
      expect(result.passed).toBeGreaterThan(45); // At least 90% success rate

      performanceResults.responseTimePerformance = {
        testCount: 50,
        averageResponseTime: result.summary.averageResponseTime,
        maxResponseTime: result.summary.maxResponseTime,
        minResponseTime: result.summary.minResponseTime,
        successRate: result.summary.successRate,
        passed: result.passed,
        failed: result.failed
      };
    }, 30000);

    test('should handle slow endpoints gracefully', async () => {
      const testCases: APITestCaseModel[] = [];

      // Create test cases for slow endpoint
      for (let i = 0; i < 20; i++) {
        const testCase = await service.createTestCase({
          id: `slow-test-${i}`,
          name: `Slow Endpoint Test ${i + 1}`,
          endpoint: '/slow',
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: undefined,
          expectedStatus: 200,
          expectedResponse: {},
          timeout: 10000, // Higher timeout for slow endpoint
          authentication: { type: 'none', credentials: {} },
          assertions: [
            {
              type: 'status',
              operator: 'equals',
              expectedValue: 200,
              description: 'Status should be 200'
            }
          ],
          tags: ['slow', 'performance-test']
        });
        testCases.push(testCase);
      }

      const startTime = Date.now();
      const baseUrl = `http://localhost:${mockServerPort}`;
      const options: TestSuiteOptions = {
        baseUrl,
        parallel: true,
        maxConcurrency: 10,
        timeout: 10000,
        retryFailures: false
      };

      const suiteName = 'slow-endpoint-test';
      service.createTestSuite(suiteName, { tests: testCases });

      const result = await service.executeTestSuite(suiteName, options);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Performance assertions - slower but should still complete
      expect(result.passed).toBeGreaterThan(18); // At least 90% success rate
      expect(result.summary.averageResponseTime).toBeGreaterThan(500); // Should be slow
      expect(result.summary.averageResponseTime).toBeLessThan(8000); // But not too slow
      expect(duration).toBeLessThan(60000); // Complete within 1 minute

      performanceResults.slowEndpointHandling = {
        testCount: 20,
        duration,
        averageResponseTime: result.summary.averageResponseTime,
        maxResponseTime: result.summary.maxResponseTime,
        successRate: result.summary.successRate,
        passed: result.passed,
        timeoutCount: result.summary.timeoutCount
      };
    }, 70000);
  });

  describe('Error Handling Performance', () => {
    test('should handle error responses efficiently', async () => {
      const testCases: APITestCaseModel[] = [];

      // Mix of successful and error endpoints
      const endpoints = [
        { path: '/health', expectedStatus: 200 },
        { path: '/error', expectedStatus: 500 },
        { path: '/notfound', expectedStatus: 404 }
      ];

      for (let i = 0; i < 90; i++) {
        const endpoint = endpoints[i % endpoints.length];
        const testCase = await service.createTestCase({
          id: `error-test-${i}`,
          name: `Error Handling Test ${i + 1}`,
          endpoint: endpoint.path,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: undefined,
          expectedStatus: endpoint.expectedStatus,
          expectedResponse: {},
          timeout: 5000,
          authentication: { type: 'none', credentials: {} },
          assertions: [
            {
              type: 'status',
              operator: 'equals',
              expectedValue: endpoint.expectedStatus,
              description: `Status should be ${endpoint.expectedStatus}`
            }
          ],
          tags: ['error-handling', 'performance-test']
        });
        testCases.push(testCase);
      }

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const baseUrl = `http://localhost:${mockServerPort}`;
      const options: TestSuiteOptions = {
        baseUrl,
        parallel: true,
        maxConcurrency: 30,
        timeout: 5000,
        retryFailures: false
      };

      const suiteName = 'error-handling-test';
      service.createTestSuite(suiteName, { tests: testCases });

      const result = await service.executeTestSuite(suiteName, options);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Performance assertions
      expect(duration).toBeLessThan(15000); // Under 15 seconds
      expect(result.totalTests).toBe(90);
      expect(result.passed).toBeGreaterThan(80); // At least ~90% should pass (including expected errors)
      expect(memoryUsed).toBeLessThan(50 * 1024 * 1024); // Under 50MB

      performanceResults.errorHandlingPerformance = {
        testCount: 90,
        duration,
        memoryUsed,
        passed: result.passed,
        failed: result.failed,
        errors: result.errors,
        successRate: (result.passed / result.totalTests) * 100,
        testsPerSecond: 90 / (duration / 1000),
        averageResponseTime: result.summary.averageResponseTime
      };
    }, 20000);
  });

  describe('Memory Usage Under Load', () => {
    test('should maintain stable memory usage during extended testing', async () => {
      const memoryCheckpoints: number[] = [];
      const startMemory = process.memoryUsage().heapUsed;
      memoryCheckpoints.push(startMemory);

      // Perform multiple rounds of testing
      const rounds = 5;
      const testsPerRound = 100;

      for (let round = 0; round < rounds; round++) {
        const testCases: APITestCaseModel[] = [];

        for (let i = 0; i < testsPerRound; i++) {
          const testCase = await createTestCase('/health', `Round ${round + 1} Test ${i + 1}`);
          testCases.push(testCase);
        }

        const baseUrl = `http://localhost:${mockServerPort}`;
        const options: TestSuiteOptions = {
          baseUrl,
          parallel: true,
          maxConcurrency: 20,
          timeout: 5000,
          retryFailures: false
        };

        const suiteName = `memory-test-round-${round}`;
        service.createTestSuite(suiteName, { tests: testCases });

        await service.executeTestSuite(suiteName, options);

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
      expect(totalMemoryGrowth).toBeLessThan(200 * 1024 * 1024); // Under 200MB total growth
      expect(maxMemoryGrowth).toBeLessThan(300 * 1024 * 1024); // Under 300MB peak growth

      performanceResults.memoryStability = {
        rounds,
        testsPerRound,
        totalTests: rounds * testsPerRound,
        startMemory,
        finalMemory,
        totalMemoryGrowth,
        maxMemoryGrowth,
        memoryCheckpoints: memoryCheckpoints.map(m => m - startMemory),
        averageMemoryPerTest: totalMemoryGrowth / (rounds * testsPerRound)
      };
    }, 60000);
  });

  describe('Stress Testing', () => {
    test('should handle maximum concurrent load without failures', async () => {
      const maxConcurrency = 100;
      const totalTests = 1000;

      const testCases: APITestCaseModel[] = [];
      const endpoints = ['/health', '/api/users', '/api/products'];

      for (let i = 0; i < totalTests; i++) {
        const endpoint = endpoints[i % endpoints.length];
        const testCase = await createTestCase(endpoint, `Stress Test ${i + 1}`);
        testCases.push(testCase);
      }

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      const baseUrl = `http://localhost:${mockServerPort}`;
      const options: TestSuiteOptions = {
        baseUrl,
        parallel: true,
        maxConcurrency,
        timeout: 10000,
        retryFailures: false
      };

      // Execute in manageable batches
      const batchSize = 200;
      const batches = [];
      for (let i = 0; i < testCases.length; i += batchSize) {
        batches.push(testCases.slice(i, i + batchSize));
      }

      let totalPassed = 0;
      let totalFailed = 0;
      let totalErrors = 0;
      let totalResponseTime = 0;

      for (const [index, batch] of batches.entries()) {
        const batchSuiteName = `stress-test-batch-${index}`;
        service.createTestSuite(batchSuiteName, { tests: batch });

        const batchResult = await service.executeTestSuite(batchSuiteName, options);
        totalPassed += batchResult.passed;
        totalFailed += batchResult.failed;
        totalErrors += batchResult.errors;
        totalResponseTime += batchResult.summary.averageResponseTime;
      }

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      const totalTime = endTime - startTime;
      const memoryUsed = endMemory - startMemory;

      // Performance assertions
      expect(totalPassed).toBeGreaterThan(950); // At least 95% success rate
      expect(totalTime).toBeLessThan(300000); // Under 5 minutes
      expect(memoryUsed).toBeLessThan(1024 * 1024 * 1024); // Under 1GB

      const averageResponseTime = totalResponseTime / batches.length;
      expect(averageResponseTime).toBeLessThan(5000); // Under 5 seconds average

      performanceResults.stressTest = {
        totalTests,
        maxConcurrency,
        batchCount: batches.length,
        totalTime,
        memoryUsed,
        passed: totalPassed,
        failed: totalFailed,
        errors: totalErrors,
        successRate: (totalPassed / totalTests) * 100,
        testsPerSecond: totalTests / (totalTime / 1000),
        averageResponseTime,
        memoryEfficiency: totalTests / (memoryUsed / 1024 / 1024) // Tests per MB
      };
    }, 350000);
  });

  describe('Performance Benchmarks Validation', () => {
    test('should meet all performance targets', () => {
      const results = performanceResults;

      // Target: Execute 100 concurrent API tests in <10 seconds
      expect(results.concurrentApiTesting?.duration).toBeLessThan(10000);
      expect(results.concurrentApiTesting?.testCount).toBe(100);
      expect(results.concurrentApiTesting?.successRate).toBeGreaterThan(90);

      // Target: Handle 1000+ API test cases efficiently
      expect(results.bulkApiTesting?.testCount).toBe(1000);
      expect(results.bulkApiTesting?.successRate).toBeGreaterThan(90);
      expect(results.bulkApiTesting?.totalTime).toBeLessThan(120000);

      // Target: <3s response times under load
      expect(results.responseTimePerformance?.averageResponseTime).toBeLessThan(3000);

      // Target: Error rates under load
      expect(results.errorHandlingPerformance?.successRate).toBeGreaterThan(80);

      // Target: Memory stability
      expect(results.memoryStability?.totalMemoryGrowth).toBeLessThan(200 * 1024 * 1024);

      // Target: Stress test resilience
      expect(results.stressTest?.successRate).toBeGreaterThan(95);
      expect(results.stressTest?.totalTime).toBeLessThan(300000);

      console.log('\n✅ All APITestingService performance targets met!');
    });
  });
});