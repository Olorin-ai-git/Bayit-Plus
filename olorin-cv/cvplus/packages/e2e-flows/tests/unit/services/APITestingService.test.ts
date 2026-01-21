/**
 * Unit Tests for APITestingService
 * Comprehensive testing of API validation, test execution, and result management
  */

import { APITestingService, TestSuiteOptions } from '../../../src/services/APITestingService';
import { APITestCaseModel, APIResult, ResponseAssertion } from '../../../src/models';

// Mock HTTP module
jest.mock('http', () => ({
  request: jest.fn()
}));

jest.mock('https', () => ({
  request: jest.fn()
}));

import * as http from 'http';
import * as https from 'https';

describe('APITestingService', () => {
  let service: APITestingService;
  let mockHttpRequest: jest.MockedFunction<typeof http.request>;
  let mockHttpsRequest: jest.MockedFunction<typeof https.request>;

  beforeEach(() => {
    service = new APITestingService();
    mockHttpRequest = http.request as jest.MockedFunction<typeof http.request>;
    mockHttpsRequest = https.request as jest.MockedFunction<typeof https.request>;

    // Reset mocks
    jest.clearAllMocks();
  });

  // Helper function to create test case data
  const createTestCaseData = (overrides: any = {}) => ({
    id: 'default-test-id',
    name: 'Default Test',
    endpoint: '/api/default',
    method: 'GET' as const,
    headers: { 'Content-Type': 'application/json' },
    body: undefined,
    expectedStatus: 200,
    expectedResponse: {},
    timeout: 5000,
    authentication: { type: 'none' as const, credentials: {} },
    assertions: [],
    tags: [],
    ...overrides
  });

  // Helper function to create assertion
  const createAssertion = (overrides: any = {}): ResponseAssertion => ({
    type: 'status',
    operator: 'equals',
    expectedValue: 200,
    description: 'Default assertion',
    ...overrides
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with empty collections', () => {
      const newService = new APITestingService();
      expect(newService).toBeDefined();
    });

    it('should initialize default test cases', async () => {
      // Service should have some default test cases
      const testCases = await service.listTestCases();
      expect(Array.isArray(testCases)).toBe(true);
    });
  });

  describe('Test Case Management', () => {
    describe('createTestCase', () => {
      it('should create a new test case', async () => {
        const testCaseData = createTestCaseData({
          id: 'test-case-1',
          name: 'Test User API',
          endpoint: '/api/users',
          method: 'GET',
          tags: ['users', 'api']
        });

        const testCase = await service.createTestCase(testCaseData);

        expect(testCase).toBeInstanceOf(APITestCaseModel);
        expect(testCase.id).toBe('test-case-1');
        expect(testCase.name).toBe('Test User API');
        expect(testCase.endpoint).toBe('/api/users');
        expect(testCase.method).toBe('GET');
        expect(testCase.expectedStatus).toBe(200);
        expect(testCase.timeout).toBe(5000);
        expect(testCase.tags).toEqual(['users', 'api']);
        expect(testCase.curlCommand).toBeDefined();
      });

      it('should create test case with POST body', async () => {
        const testCaseData = createTestCaseData({
          id: 'test-create-user',
          name: 'Create User',
          endpoint: '/api/users',
          method: 'POST',
          body: { name: 'John Doe', email: 'john@example.com' },
          expectedStatus: 201,
          tags: ['users', 'create']
        });

        const testCase = await service.createTestCase(testCaseData);

        expect(testCase.body).toEqual({ name: 'John Doe', email: 'john@example.com' });
        expect(testCase.curlCommand).toContain('POST');
        expect(testCase.curlCommand).toContain('john@example.com');
      });

      it('should create test case with assertions', async () => {
        const assertions = [
          createAssertion({
            type: 'status',
            operator: 'equals',
            expectedValue: 200,
            description: 'Status should be 200'
          }),
          createAssertion({
            type: 'body',
            field: 'data.length',
            operator: 'gt',
            expectedValue: 0,
            description: 'Data array should have items'
          })
        ];

        const testCaseData = createTestCaseData({
          id: 'test-with-assertions',
          name: 'Test with Assertions',
          endpoint: '/api/data',
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          assertions,
          tags: ['data']
        });

        const testCase = await service.createTestCase(testCaseData);

        expect(testCase.assertions).toHaveLength(2);
        expect(testCase.assertions[0].type).toBe('status');
        expect(testCase.assertions[1].type).toBe('body');
        expect(testCase.assertions[1].field).toBe('data.length');
      });
    });

    describe('getTestCase', () => {
      it('should retrieve existing test case', async () => {
        const testCaseData = createTestCaseData({
          id: 'get-test-case',
          name: 'Get Test Case',
          endpoint: '/api/test',
          method: 'GET'
        });

        const created = await service.createTestCase(testCaseData);
        const retrieved = await service.getTestCase('get-test-case');

        expect(retrieved).toBeDefined();
        expect(retrieved!.id).toBe(created.id);
        expect(retrieved!.name).toBe(created.name);
      });

      it('should return null for non-existent test case', async () => {
        const result = await service.getTestCase('non-existent');
        expect(result).toBeNull();
      });
    });

    describe('listTestCases', () => {
      beforeEach(async () => {
        // Create test cases for filtering
        await service.createTestCase(createTestCaseData({
          id: 'get-users',
          name: 'Get Users',
          endpoint: '/api/users',
          method: 'GET',
          tags: ['users', 'get']
        }));

        await service.createTestCase(createTestCaseData({
          id: 'create-user',
          name: 'Create User',
          endpoint: '/api/users',
          method: 'POST',
          expectedStatus: 201,
          tags: ['users', 'create']
        }));

        await service.createTestCase(createTestCaseData({
          id: 'get-products',
          name: 'Get Products',
          endpoint: '/api/products',
          method: 'GET',
          tags: ['products']
        }));
      });

      it('should list all test cases', async () => {
        const testCases = await service.listTestCases();
        expect(testCases.length).toBeGreaterThanOrEqual(3);
      });

      it('should filter test cases by method', async () => {
        const getTestCases = await service.listTestCases({ method: 'GET' });
        expect(getTestCases.length).toBeGreaterThanOrEqual(2);
        getTestCases.forEach(tc => expect(tc.method).toBe('GET'));

        const postTestCases = await service.listTestCases({ method: 'POST' });
        expect(postTestCases.length).toBeGreaterThanOrEqual(1);
        postTestCases.forEach(tc => expect(tc.method).toBe('POST'));
      });

      it('should filter test cases by endpoint', async () => {
        const userTestCases = await service.listTestCases({ endpoint: 'users' });
        expect(userTestCases.length).toBeGreaterThanOrEqual(2);
        userTestCases.forEach(tc => expect(tc.endpoint).toContain('users'));
      });

      it('should filter test cases by tags', async () => {
        const userTaggedCases = await service.listTestCases({ tags: ['users'] });
        expect(userTaggedCases.length).toBeGreaterThanOrEqual(2);
        userTaggedCases.forEach(tc => expect(tc.tags).toContain('users'));
      });
    });

    describe('updateTestCase', () => {
      it('should update existing test case', async () => {
        await service.createTestCase(createTestCaseData({
          id: 'update-test',
          name: 'Original Name',
          endpoint: '/api/test',
          method: 'GET',
          tags: ['original']
        }));

        const updated = await service.updateTestCase('update-test', {
          name: 'Updated Name',
          expectedStatus: 201,
          tags: ['updated']
        });

        expect(updated).toBeDefined();
        expect(updated!.name).toBe('Updated Name');
        expect(updated!.expectedStatus).toBe(201);
        expect(updated!.tags).toEqual(['updated']);
        // Should regenerate curl command
        expect(updated!.curlCommand).toBeDefined();
      });

      it('should return null for non-existent test case', async () => {
        const result = await service.updateTestCase('non-existent', { name: 'New Name' });
        expect(result).toBeNull();
      });
    });

    describe('deleteTestCase', () => {
      it('should delete existing test case', async () => {
        await service.createTestCase(createTestCaseData({
          id: 'delete-test',
          name: 'Delete Test',
          endpoint: '/api/test',
          method: 'GET'
        }));

        const deleted = await service.deleteTestCase('delete-test');
        expect(deleted).toBe(true);

        const retrieved = await service.getTestCase('delete-test');
        expect(retrieved).toBeNull();
      });

      it('should return false for non-existent test case', async () => {
        const result = await service.deleteTestCase('non-existent');
        expect(result).toBe(false);
      });
    });
  });

  describe('Test Suite Management', () => {
    describe('createTestSuite', () => {
      it('should create empty test suite', () => {
        const suite = service.createTestSuite('empty-suite');

        expect(suite.name).toBe('empty-suite');
        expect(suite.tests).toEqual([]);
        expect(suite.commonHeaders).toEqual({});
      });

      it('should create test suite with options', () => {
        const testCase = new APITestCaseModel(createTestCaseData({
          id: 'suite-test',
          name: 'Suite Test',
          endpoint: '/api/test',
          method: 'GET'
        }));

        const suite = service.createTestSuite('configured-suite', {
          baseUrl: 'https://api.example.com',
          commonHeaders: { 'Authorization': 'Bearer token' },
          tests: [testCase]
        });

        expect(suite.name).toBe('configured-suite');
        expect(suite.baseUrl).toBe('https://api.example.com');
        expect(suite.commonHeaders).toEqual({ 'Authorization': 'Bearer token' });
        expect(suite.tests).toHaveLength(1);
        expect(suite.tests[0]).toBe(testCase);
      });
    });

    describe('addTestToSuite', () => {
      it('should add test case to existing suite', async () => {
        const suite = service.createTestSuite('add-test-suite');
        const testCase = await service.createTestCase(createTestCaseData({
          id: 'add-test',
          name: 'Add Test',
          endpoint: '/api/add',
          method: 'GET'
        }));

        const added = service.addTestToSuite('add-test-suite', testCase);

        expect(added).toBe(true);
        expect(suite.tests).toHaveLength(1);
        expect(suite.tests[0]).toBe(testCase);
      });

      it('should return false for non-existent suite', async () => {
        const testCase = await service.createTestCase(createTestCaseData({
          id: 'orphan-test',
          name: 'Orphan Test',
          endpoint: '/api/orphan',
          method: 'GET'
        }));

        const result = service.addTestToSuite('non-existent-suite', testCase);
        expect(result).toBe(false);
      });
    });

    describe('getTestSuite', () => {
      it('should retrieve existing test suite', () => {
        const created = service.createTestSuite('get-suite');
        const retrieved = service.getTestSuite('get-suite');

        expect(retrieved).toBe(created);
        expect(retrieved!.name).toBe('get-suite');
      });

      it('should return null for non-existent suite', () => {
        const result = service.getTestSuite('non-existent-suite');
        expect(result).toBeNull();
      });
    });

    describe('listTestSuites', () => {
      it('should list all test suites', () => {
        service.createTestSuite('suite-1');
        service.createTestSuite('suite-2');

        const suites = service.listTestSuites();
        expect(suites.length).toBeGreaterThanOrEqual(2);

        const suiteNames = suites.map(s => s.name);
        expect(suiteNames).toContain('suite-1');
        expect(suiteNames).toContain('suite-2');
      });
    });
  });

  describe('Test Execution', () => {
    beforeEach(() => {
      // Mock successful HTTP response
      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback('{"success": true, "data": [1, 2, 3]}');
          } else if (event === 'end') {
            callback();
          }
        })
      };

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn()
      };

      mockHttpRequest.mockImplementation((_options: any, callback?: any) => {
        setTimeout(() => callback?.(mockResponse), 10);
        return mockRequest as any;
      });

      mockHttpsRequest.mockImplementation((_options: any, callback?: any) => {
        setTimeout(() => callback?.(mockResponse), 10);
        return mockRequest as any;
      });
    });

    describe('executeTestCase', () => {
      it('should execute test case successfully', async () => {
        const testCase = await service.createTestCase(createTestCaseData({
          id: 'execute-test',
          name: 'Execute Test',
          endpoint: '/api/data',
          method: 'GET',
          assertions: [
            createAssertion({
              type: 'status',
              operator: 'equals',
              expectedValue: 200,
              description: 'Status should be 200'
            })
          ]
        }));

        const result = await service.executeTestCase(testCase, 'http://localhost:3000');

        expect(result.status).toBe('passed');
        expect(result.actualStatus).toBe(200);
        expect(result.actualResponse).toEqual({ success: true, data: [1, 2, 3] });
        expect(result.responseTime).toBeGreaterThan(0);
        expect(result.assertionResults).toHaveLength(1);
        expect(result.assertionResults[0].passed).toBe(true);
        expect(result.curlCommand).toContain('http://localhost:3000/api/data');
        expect(result.timestamp).toBeInstanceOf(Date);
      });

      it('should handle failed assertions', async () => {
        const testCase = await service.createTestCase(createTestCaseData({
          id: 'fail-test',
          name: 'Fail Test',
          endpoint: '/api/data',
          method: 'GET',
          expectedStatus: 201, // Different from mock response (200)
          assertions: [
            createAssertion({
              type: 'status',
              operator: 'equals',
              expectedValue: 201,
              description: 'Status should be 201'
            })
          ]
        }));

        const result = await service.executeTestCase(testCase);

        expect(result.status).toBe('failed');
        expect(result.actualStatus).toBe(200);
        expect(result.assertionResults[0].passed).toBe(false);
      });

      it('should handle body field assertions', async () => {
        const testCase = await service.createTestCase(createTestCaseData({
          id: 'body-assertion-test',
          name: 'Body Assertion Test',
          endpoint: '/api/data',
          method: 'GET',
          assertions: [
            createAssertion({
              type: 'body',
              field: 'data.length',
              operator: 'equals',
              expectedValue: 3,
              description: 'Data length should be 3'
            }),
            createAssertion({
              type: 'body',
              field: 'success',
              operator: 'equals',
              expectedValue: true,
              description: 'Success should be true'
            })
          ]
        }));

        const result = await service.executeTestCase(testCase);

        expect(result.status).toBe('passed');
        expect(result.assertionResults).toHaveLength(2);
        expect(result.assertionResults[0].passed).toBe(true);
        expect(result.assertionResults[0].actualValue).toBe(3);
        expect(result.assertionResults[1].passed).toBe(true);
        expect(result.assertionResults[1].actualValue).toBe(true);
      });

      it('should handle header assertions', async () => {
        const testCase = await service.createTestCase(createTestCaseData({
          id: 'header-test',
          name: 'Header Test',
          endpoint: '/api/data',
          method: 'GET',
          assertions: [
            createAssertion({
              type: 'header',
              field: 'content-type',
              operator: 'contains',
              expectedValue: 'application/json',
              description: 'Content type should contain application/json'
            })
          ]
        }));

        const result = await service.executeTestCase(testCase);

        expect(result.status).toBe('passed');
        expect(result.assertionResults[0].passed).toBe(true);
        expect(result.assertionResults[0].actualValue).toBe('application/json');
      });

      it('should handle POST requests with body', async () => {
        const testCase = await service.createTestCase(createTestCaseData({
          id: 'post-test',
          name: 'POST Test',
          endpoint: '/api/users',
          method: 'POST',
          body: { name: 'John Doe', email: 'john@example.com' }
        }));

        await service.executeTestCase(testCase);

        // Verify that write was called with the JSON body
        const mockRequest = mockHttpRequest.mock.results[0].value;
        expect(mockRequest.write).toHaveBeenCalledWith(
          JSON.stringify({ name: 'John Doe', email: 'john@example.com' })
        );
      });

      it('should handle request errors', async () => {
        // Mock request error
        const mockRequest = {
          on: jest.fn((event, callback) => {
            if (event === 'error') {
              setTimeout(() => callback(new Error('Network error')), 10);
            }
          }),
          write: jest.fn(),
          end: jest.fn(),
          destroy: jest.fn()
        };

        mockHttpRequest.mockImplementation(() => mockRequest as any);

        const testCase = await service.createTestCase(createTestCaseData({
          id: 'error-test',
          name: 'Error Test',
          endpoint: '/api/error',
          method: 'GET'
        }));

        const result = await service.executeTestCase(testCase);

        expect(result.status).toBe('error');
        expect(result.actualStatus).toBe(0);
        expect(result.errors).toContain('Network error');
      });

      it('should handle timeout', async () => {
        // Mock timeout
        const mockRequest = {
          on: jest.fn((event, callback) => {
            if (event === 'timeout') {
              setTimeout(() => callback(), 10);
            }
          }),
          write: jest.fn(),
          end: jest.fn(),
          destroy: jest.fn()
        };

        mockHttpRequest.mockImplementation(() => mockRequest as any);

        const testCase = await service.createTestCase(createTestCaseData({
          id: 'timeout-test',
          name: 'Timeout Test',
          endpoint: '/api/slow',
          method: 'GET',
          timeout: 100 // Very short timeout
        }));

        const result = await service.executeTestCase(testCase);

        expect(result.status).toBe('error');
        expect(result.errors).toContain('Request timeout');
      });
    });

    describe('executeTestSuite', () => {
      it('should execute test suite sequentially', async () => {
        const testCase1 = await service.createTestCase(createTestCaseData({
          id: 'suite-test-1',
          name: 'Suite Test 1',
          endpoint: '/api/test1',
          method: 'GET'
        }));

        const testCase2 = await service.createTestCase(createTestCaseData({
          id: 'suite-test-2',
          name: 'Suite Test 2',
          endpoint: '/api/test2',
          method: 'GET'
        }));

        service.createTestSuite('sequential-suite', {
          tests: [testCase1, testCase2]
        });

        const options: TestSuiteOptions = {
          baseUrl: 'http://localhost:3000',
          parallel: false
        };

        const result = await service.executeTestSuite('sequential-suite', options);

        expect(result.name).toBe('sequential-suite');
        expect(result.totalTests).toBe(2);
        expect(result.passed).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.errors).toBe(0);
        expect(result.results).toHaveLength(2);
        expect(result.duration).toBeGreaterThan(0);
        expect(result.summary.successRate).toBe(100);
      });

      it('should throw error for non-existent suite', async () => {
        const options: TestSuiteOptions = {
          baseUrl: 'http://localhost:3000'
        };

        await expect(
          service.executeTestSuite('non-existent-suite', options)
        ).rejects.toThrow('Test suite non-existent-suite not found');
      });
    });

    describe('executeMultipleTestCases', () => {
      it('should execute multiple test cases by ID', async () => {
        await service.createTestCase(createTestCaseData({
          id: 'multi-1',
          name: 'Multi Test 1',
          endpoint: '/api/multi1',
          method: 'GET'
        }));

        await service.createTestCase(createTestCaseData({
          id: 'multi-2',
          name: 'Multi Test 2',
          endpoint: '/api/multi2',
          method: 'GET'
        }));

        const options: TestSuiteOptions = {
          baseUrl: 'http://localhost:3000'
        };

        const result = await service.executeMultipleTestCases(['multi-1', 'multi-2'], options);

        expect(result.totalTests).toBe(2);
        expect(result.passed).toBe(2);
        expect(result.results).toHaveLength(2);
      });

      it('should throw error for missing test cases', async () => {
        const options: TestSuiteOptions = {
          baseUrl: 'http://localhost:3000'
        };

        await expect(
          service.executeMultipleTestCases(['missing-1', 'missing-2'], options)
        ).rejects.toThrow('Test cases not found: missing-1, missing-2');
      });
    });

    describe('executeCurlCommand', () => {
      it('should execute basic curl command', async () => {
        const curlCommand = 'curl -X GET http://localhost:3000/api/test';

        const result = await service.executeCurlCommand(curlCommand);

        expect(result.status).toBe('passed');
        expect(result.actualStatus).toBe(200);
        expect(result.curlCommand).toContain('curl -X GET');
        expect(result.curlCommand).toContain('http://localhost:3000/api/test');
      });

      it('should handle malformed curl command', async () => {
        const curlCommand = 'invalid curl command';

        const result = await service.executeCurlCommand(curlCommand);

        expect(result.status).toBe('error');
        expect(result.errors).toContain('Curl command parsing failed');
      });
    });
  });

  describe('Result Management', () => {
    describe('listTestResults', () => {
      it('should list test results in descending order', async () => {
        const testCase = await service.createTestCase(createTestCaseData({
          id: 'list-results-test',
          name: 'List Results Test',
          endpoint: '/api/list',
          method: 'GET'
        }));

        // Execute test multiple times
        await service.executeTestCase(testCase);
        await new Promise(resolve => setTimeout(resolve, 10));
        await service.executeTestCase(testCase);

        const results = await service.listTestResults();
        expect(results.length).toBeGreaterThanOrEqual(2);

        // Should be sorted by timestamp descending
        for (let i = 1; i < results.length; i++) {
          expect(results[i-1].timestamp.getTime()).toBeGreaterThanOrEqual(
            results[i].timestamp.getTime()
          );
        }
      });

      it('should respect limit parameter', async () => {
        const results = await service.listTestResults(5);
        expect(results.length).toBeLessThanOrEqual(5);
      });
    });

    describe('generateReport', () => {
      let sampleResults: APIResult[];

      beforeEach(() => {
        sampleResults = [
          {
            status: 'passed',
            actualStatus: 200,
            actualResponse: { success: true },
            actualHeaders: { 'content-type': 'application/json' },
            responseTime: 150,
            errors: [],
            assertionResults: [],
            curlCommand: 'curl -X GET http://localhost:3000/api/test1',
            timestamp: new Date()
          },
          {
            status: 'failed',
            actualStatus: 404,
            actualResponse: { error: 'Not found' },
            actualHeaders: { 'content-type': 'application/json' },
            responseTime: 100,
            errors: ['Expected status 200, got 404'],
            assertionResults: [],
            curlCommand: 'curl -X GET http://localhost:3000/api/test2',
            timestamp: new Date()
          }
        ];
      });

      it('should generate JSON report', () => {
        const report = service.generateReport(sampleResults, 'json');

        const parsed = JSON.parse(report);
        expect(parsed).toHaveLength(2);
        expect(parsed[0].status).toBe('passed');
        expect(parsed[1].status).toBe('failed');
      });

      it('should generate HTML report', () => {
        const report = service.generateReport(sampleResults, 'html');

        expect(report).toContain('<html>');
        expect(report).toContain('API Test Report');
        expect(report).toContain('passed');
        expect(report).toContain('failed');
      });

      it('should generate text report', () => {
        const report = service.generateReport(sampleResults, 'text');

        expect(report).toContain('API Test Report');
        expect(report).toContain('Total Tests: 2');
        expect(report).toContain('Status: PASSED');
        expect(report).toContain('Status: FAILED');
      });

      it('should throw error for unsupported format', () => {
        expect(() => {
          service.generateReport(sampleResults, 'pdf' as any);
        }).toThrow('Unsupported report format: pdf');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle HTTPS URLs', async () => {
      const testCase = await service.createTestCase(createTestCaseData({
        id: 'https-test',
        name: 'HTTPS Test',
        endpoint: '/api/secure',
        method: 'GET'
      }));

      const result = await service.executeTestCase(testCase, 'https://secure.example.com');

      expect(mockHttpsRequest).toHaveBeenCalled();
      expect(result.status).toBe('passed');
    });

    it('should handle non-JSON responses', async () => {
      // Mock plain text response
      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'text/plain' },
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback('Plain text response');
          } else if (event === 'end') {
            callback();
          }
        })
      };

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn()
      };

      mockHttpRequest.mockImplementation((_options: any, callback?: any) => {
        setTimeout(() => callback?.(mockResponse), 10);
        return mockRequest as any;
      });

      const testCase = await service.createTestCase(createTestCaseData({
        id: 'text-response-test',
        name: 'Text Response Test',
        endpoint: '/api/text',
        method: 'GET'
      }));

      const result = await service.executeTestCase(testCase);

      expect(result.actualResponse).toBe('Plain text response');
    });

    it('should handle malformed JSON responses', async () => {
      // Mock malformed JSON response
      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback('{"invalid": json}'); // Malformed JSON
          } else if (event === 'end') {
            callback();
          }
        })
      };

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn()
      };

      mockHttpRequest.mockImplementation((_options: any, callback?: any) => {
        setTimeout(() => callback?.(mockResponse), 10);
        return mockRequest as any;
      });

      const testCase = await service.createTestCase(createTestCaseData({
        id: 'malformed-json-test',
        name: 'Malformed JSON Test',
        endpoint: '/api/malformed',
        method: 'GET'
      }));

      const result = await service.executeTestCase(testCase);

      // Should keep as string when JSON parsing fails
      expect(result.actualResponse).toBe('{"invalid": json}');
    });

    it('should handle assertion evaluation errors', async () => {
      // Test that creating a test case with invalid assertion throws error
      await expect(
        service.createTestCase(createTestCaseData({
          id: 'assertion-error-test',
          name: 'Assertion Error Test',
          endpoint: '/api/data',
          method: 'GET',
          assertions: [
            createAssertion({
              type: 'unsupported' as any, // Invalid assertion type
              operator: 'equals',
              expectedValue: 'test',
              description: 'Invalid assertion type'
            })
          ]
        }))
      ).rejects.toThrow('Invalid assertion: Invalid assertion type');
    });

    it('should handle empty test suites', async () => {
      service.createTestSuite('empty-execution-suite', { tests: [] });

      const options: TestSuiteOptions = {
        baseUrl: 'http://localhost:3000'
      };

      const result = await service.executeTestSuite('empty-execution-suite', options);

      expect(result.totalTests).toBe(0);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(result.summary.successRate).toBe(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of test cases', async () => {
      const testCases = [];

      for (let i = 0; i < 20; i++) {
        const testCase = await service.createTestCase(createTestCaseData({
          id: `perf-test-${i}`,
          name: `Performance Test ${i}`,
          endpoint: `/api/perf${i}`,
          method: 'GET',
          tags: [`perf-${i}`]
        }));
        testCases.push(testCase);
      }

      const allTestCases = await service.listTestCases();
      expect(allTestCases.length).toBeGreaterThanOrEqual(20);

      // Test filtering performance
      const filteredCases = await service.listTestCases({ tags: ['perf-5'] });
      expect(filteredCases).toHaveLength(1);
      expect(filteredCases[0].id).toBe('perf-test-5');
    });

    it('should handle concurrent test execution', async () => {
      const testCases = [];

      for (let i = 0; i < 5; i++) {
        testCases.push(await service.createTestCase(createTestCaseData({
          id: `concurrent-exec-${i}`,
          name: `Concurrent Execution Test ${i}`,
          endpoint: `/api/concurrent${i}`,
          method: 'GET'
        })));
      }

      service.createTestSuite('performance-suite', { tests: testCases });

      const startTime = Date.now();

      const result = await service.executeTestSuite('performance-suite', {
        baseUrl: 'http://localhost:3000',
        parallel: true
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(result.totalTests).toBe(5);
      expect(result.passed).toBe(5);
      expect(executionTime).toBeLessThan(5000); // Should complete quickly with mocked responses
    });
  });
});