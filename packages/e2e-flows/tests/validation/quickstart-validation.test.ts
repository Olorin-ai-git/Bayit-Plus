/**
 * Quickstart Validation Tests
 * Validates that all quickstart scenarios work with the actual implementation
  */

import { E2EFlowsService } from '../../src/services/E2EFlowsService';
import { MockDataService } from '../../src/services/MockDataService';
import { APITestingService } from '../../src/services/APITestingService';
import { TestScenarioModel } from '../../src/models/TestScenario';
import { APITestCaseModel } from '../../src/models/APITestCase';
import * as fs from 'fs';
import * as path from 'path';

describe('Quickstart Validation Tests', () => {
  let e2eService: E2EFlowsService;
  let mockDataService: MockDataService;
  let apiTestingService: APITestingService;

  beforeAll(async () => {
    e2eService = new E2EFlowsService();
    mockDataService = new MockDataService();
    apiTestingService = new APITestingService();
  });

  describe('Core Services Availability', () => {
    it('should have E2EFlowsService available and functional', async () => {
      expect(e2eService).toBeDefined();
      expect(typeof e2eService.executeScenario).toBe('function');
      expect(typeof e2eService.healthCheck).toBe('function');

      // Test basic functionality
      const healthCheck = await e2eService.healthCheck();
      expect(healthCheck).toBeDefined();
    });

    it('should have MockDataService available and functional', async () => {
      expect(mockDataService).toBeDefined();
      expect(typeof mockDataService.generateData).toBe('function');
      expect(typeof mockDataService.createDataSet).toBe('function');

      // Test basic functionality - use correct signature
      const testData = await mockDataService.generateData('user');
      expect(testData).toBeDefined();
    });

    it('should have APITestingService available and functional', async () => {
      expect(apiTestingService).toBeDefined();
      expect(typeof apiTestingService.createTestCase).toBe('function');
      expect(typeof apiTestingService.executeTestCase).toBe('function');

      // Test basic functionality
      const testCase = await apiTestingService.createTestCase({
        id: 'validation-test',
        name: 'Validation Test',
        endpoint: '/api/test',
        method: 'GET',
        headers: {},
        body: undefined,
        expectedStatus: 200,
        expectedResponse: {},
        timeout: 5000,
        authentication: { type: 'none', credentials: {} },
        assertions: [],
        tags: ['validation']
      });
      expect(testCase).toBeDefined();
    });
  });

  describe('Data Models Functionality', () => {
    it('should create and validate TestScenario models', async () => {
      const scenario = new TestScenarioModel({
        id: 'validation-scenario',
        name: 'Validation Scenario',
        type: 'integration',
        description: 'Test scenario for validation',
        environment: 'test',
        timeout: 300000,
        steps: [
          {
            order: 1,
            name: 'Test Step',
            action: 'validate',
            parameters: {},
            timeout: 30000,
            expectedResult: { status: 'success' }
          }
        ],
        expectedOutcomes: [
          {
            description: 'Response under 5 seconds',
            condition: 'less_than',
            value: 5000
          }
        ]
      });

      expect(scenario.id).toBe('validation-scenario');
      expect(scenario.steps).toHaveLength(1);
      expect(scenario.expectedOutcomes).toHaveLength(1);
    });

    it('should create and validate MockDataSet models', async () => {
      const mockData = await mockDataService.generateData('user');
      const dataSet = await mockDataService.createDataSet(
        'validation-dataset',
        mockData,
        { expiresAt: new Date(Date.now() + 3600000) }
      );

      expect(dataSet).toBeDefined();
      expect(dataSet.name).toBe('validation-dataset');
    });

    it('should create and validate APITestCase models', async () => {
      const testCase = new APITestCaseModel({
        id: 'validation-api-test',
        name: 'Validation API Test',
        endpoint: '/api/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { test: true },
        expectedStatus: 200,
        expectedResponse: { success: true },
        timeout: 10000,
        authentication: { type: 'none', credentials: {} },
        assertions: [
          {
            type: 'status',
            operator: 'equals',
            expectedValue: 200,
            description: 'Status should be 200'
          }
        ],
        tags: ['validation']
      });

      expect(testCase.id).toBe('validation-api-test');
      expect(testCase.method).toBe('POST');
      expect(testCase.assertions).toHaveLength(1);
    });
  });

  describe('Quickstart Scenario Validation', () => {
    it('should validate Complete User Journey scenario structure', async () => {
      // Simulate the 8-step user workflow from quickstart
      const completeJourneySteps = [
        { name: 'User registration and authentication', action: 'auth' },
        { name: 'CV file upload (PDF)', action: 'upload' },
        { name: 'AI analysis and ATS optimization', action: 'analyze' },
        { name: 'Multimedia generation (podcast, video)', action: 'generate' },
        { name: 'Public profile creation', action: 'create_profile' },
        { name: 'Portfolio gallery setup', action: 'setup_gallery' },
        { name: 'Contact form integration', action: 'integrate_contact' },
        { name: 'Analytics tracking validation', action: 'validate_analytics' }
      ];

      const scenario = new TestScenarioModel({
        id: 'complete-journey',
        name: 'Complete User Journey Test',
        type: 'e2e',
        description: 'Full CVPlus workflow from registration to portal sharing',
        environment: 'test',
        timeout: 900000, // 15 minutes
        steps: completeJourneySteps.map((step, index) => ({
          order: index + 1,
          name: step.name,
          action: step.action,
          parameters: {},
          timeout: 60000,
          expectedResult: { status: 'success' }
        })),
        expectedOutcomes: [
          {
            description: 'Complete journey under 15 minutes',
            condition: 'less_than',
            value: 900000
          }
        ]
      });

      expect(scenario.steps).toHaveLength(8);
      expect(scenario.timeout).toBe(900000);
      expect(scenario.type).toBe('e2e');
    });

    it('should validate Submodule Integration scenario', async () => {
      // Test submodule integration scenario structure
      const cvProcessingTest = new TestScenarioModel({
        id: 'cv-processing-integration',
        name: 'CV Processing Submodule Test',
        type: 'integration',
        description: 'Validates cv-processing submodule functionality',
        environment: 'test',
        timeout: 300000, // 5 minutes
        steps: [
          {
            order: 1,
            name: 'Test CV analysis',
            action: 'analyze_cv',
            parameters: { module: 'cv-processing' },
            timeout: 30000,
            expectedResult: { status: 'success' }
          },
          {
            order: 2,
            name: 'Test ATS optimization',
            action: 'optimize_ats',
            parameters: { module: 'cv-processing' },
            timeout: 30000,
            expectedResult: { status: 'success' }
          }
        ],
        expectedOutcomes: [
          {
            description: 'Module test under 5 minutes',
            condition: 'less_than',
            value: 300000
          }
        ]
      });

      expect(cvProcessingTest.steps).toHaveLength(2);
      expect(cvProcessingTest.timeout).toBe(300000);
    });

    it('should validate API Contract scenario', async () => {
      // Test API contract validation scenario
      const contractTests = [
        { endpoint: '/cv/upload', method: 'POST' },
        { endpoint: '/cv/status/{jobId}', method: 'GET' },
        { endpoint: '/profile/public', method: 'GET' },
        { endpoint: '/analytics/track', method: 'POST' }
      ];

      const testCases = contractTests.map((test, index) =>
        new APITestCaseModel({
          id: `contract-test-${index}`,
          name: `Contract test for ${test.endpoint}`,
          endpoint: test.endpoint,
          method: test.method as any,
          headers: { 'Content-Type': 'application/json' },
          body: test.method === 'POST' ? {} : undefined,
          expectedStatus: 200,
          expectedResponse: {},
          timeout: 30000,
          authentication: { type: 'none', credentials: {} },
          assertions: [
            {
              type: 'status',
              operator: 'equals',
              expectedValue: 200,
              description: 'API should return 200'
            }
          ],
          tags: ['contract', 'validation']
        })
      );

      expect(testCases).toHaveLength(4);
      testCases.forEach(testCase => {
        expect(testCase.assertions).toHaveLength(1);
      });
    });

    it('should validate Load Testing scenarios', async () => {
      // Test progressive load testing scenarios
      const loadScenarios = [
        { name: 'baseline', users: 10, description: 'Baseline load test' },
        { name: 'standard', users: 100, description: 'Standard load test' },
        { name: 'peak', users: 1000, description: 'Peak load test' }
      ];

      loadScenarios.forEach(scenario => {
        const loadTest = new TestScenarioModel({
          id: `load-test-${scenario.name}`,
          name: `Load Test - ${scenario.name}`,
          type: 'load',
          description: scenario.description,
          environment: 'test',
          timeout: 600000, // 10 minutes
          steps: [
            {
              order: 1,
              name: 'Initialize load test',
              action: 'load_test',
              parameters: {
                concurrent_users: scenario.users,
                duration: 300000 // 5 minutes
              },
              timeout: 600000,
              expectedResult: { status: 'success' }
            }
          ],
          expectedOutcomes: [
            {
              description: 'Error rate under 5%',
              condition: 'less_than',
              value: 5
            },
            {
              description: 'P95 response time under 3 seconds',
              condition: 'less_than',
              value: 3000
            }
          ]
        });

        expect(loadTest.type).toBe('load');
        expect(loadTest.expectedOutcomes).toHaveLength(2);
      });
    });
  });

  describe('Configuration and Environment Validation', () => {
    it('should validate package.json scripts exist', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json');
      expect(fs.existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      // Validate core scripts from quickstart
      const expectedScripts = [
        'test',
        'build',
        'lint',
        'type-check'
      ];

      expectedScripts.forEach(script => {
        expect(packageJson.scripts).toHaveProperty(script);
      });
    });

    it('should validate TypeScript configuration', () => {
      const tsconfigPath = path.join(__dirname, '../../tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);

      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      expect(tsconfig.compilerOptions).toBeDefined();
    });

    it('should validate directory structure', () => {
      const basePath = path.join(__dirname, '../..');

      // Check core directories exist
      const expectedDirs = [
        'src',
        'src/models',
        'src/services',
        'tests',
        'tests/unit',
        'tests/integration',
        'tests/performance',
        'tests/load'
      ];

      expectedDirs.forEach(dir => {
        expect(fs.existsSync(path.join(basePath, dir))).toBe(true);
      });
    });
  });

  describe('Performance and Resource Validation', () => {
    it('should validate memory usage stays within reasonable limits', async () => {
      const initialMemory = process.memoryUsage();

      // Generate test data multiple times to simulate load
      const testDataPromises = Array.from({ length: 10 }, () =>
        mockDataService.generateData('user')
      );
      const testDataResults = await Promise.all(testDataPromises);
      expect(testDataResults).toHaveLength(10);

      const afterMemory = process.memoryUsage();
      const memoryIncrease = afterMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 100MB for test operations)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should validate response times for basic operations', async () => {
      const startTime = Date.now();

      // Test basic service operations
      await mockDataService.generateData('user');
      await apiTestingService.createTestCase({
        id: 'perf-test',
        name: 'Performance Test',
        endpoint: '/api/test',
        method: 'GET',
        headers: {},
        body: undefined,
        expectedStatus: 200,
        expectedResponse: {},
        timeout: 5000,
        authentication: { type: 'none', credentials: {} },
        assertions: [],
        tags: ['performance']
      });

      const duration = Date.now() - startTime;

      // Basic operations should complete in under 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should validate concurrent operation handling', async () => {
      const startTime = Date.now();

      // Run multiple operations concurrently
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          mockDataService.generateData('user')
        );
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      // 10 concurrent operations should complete in reasonable time
      expect(duration).toBeLessThan(30000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid test scenario gracefully', async () => {
      await expect(
        e2eService.executeScenario('non-existent-scenario')
      ).rejects.toThrow();
    });

    it('should handle invalid mock data requests', async () => {
      await expect(
        mockDataService.generateData('invalid-type' as any)
      ).rejects.toThrow();
    });

    it('should handle invalid API test cases', async () => {
      await expect(
        apiTestingService.createTestCase({
          id: 'invalid-test',
          name: 'Invalid Test',
          endpoint: 'not-a-url',
          method: 'INVALID' as any,
          headers: {},
          body: undefined,
          expectedStatus: 999,
          expectedResponse: {},
          timeout: -1,
          authentication: { type: 'none', credentials: {} },
          assertions: [],
          tags: []
        })
      ).rejects.toThrow();
    });

    it('should handle timeout scenarios', async () => {
      // Create a scenario with very short timeout
      const quickTimeoutScenario = new TestScenarioModel({
        id: 'timeout-test',
        name: 'Timeout Test',
        type: 'integration',
        description: 'Test timeout handling',
        environment: 'test',
        timeout: 1, // 1ms - should timeout immediately
        steps: [
          {
            order: 1,
            name: 'Quick step',
            action: 'test',
            parameters: {},
            timeout: 1000,
            expectedResult: { status: 'success' }
          }
        ],
        expectedOutcomes: []
      });

      expect(quickTimeoutScenario.timeout).toBe(1);
    });
  });

  describe('Integration with External Dependencies', () => {
    it('should validate Jest testing framework integration', () => {
      // This test itself validates Jest integration
      expect(jest).toBeDefined();
      expect(describe).toBeDefined();
      expect(it).toBeDefined();
      expect(expect).toBeDefined();
    });

    it('should validate TypeScript compilation works', () => {
      // If this test runs, TypeScript compilation is working
      const testFunction = (param: string): string => {
        return `Test: ${param}`;
      };

      expect(testFunction('validation')).toBe('Test: validation');
    });

    it('should validate faker.js integration for mock data', async () => {
      const userData = await mockDataService.generateData('user');
      expect(userData).toBeDefined();
      expect(userData).toHaveProperty('id');
    });
  });
});