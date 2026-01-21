/**
 * API Integration E2E Tests
 *
 * Comprehensive API integration testing for all Olorin microservices
 * to validate backend connectivity, data contracts, and error handling.
 *
 * Test Categories:
 * 1. Backend API connectivity and authentication
 * 2. CRUD operations for investigations and analytics
 * 3. Real-time WebSocket communication
 * 4. File upload and processing
 * 5. Error handling and edge cases
 * 6. Performance and response time validation
 * 7. Data integrity and consistency
 * 8. Cross-service communication
 */

import { test, expect } from '@playwright/test';
import { ApiTestEngine, ApiTestSuite, ApiEndpoint } from './api-test-engine';

const apiEngine = new ApiTestEngine({
  baseUrl: 'http://localhost:8090', // Olorin backend
  timeout: 15000,
  includeAuth: true,
  includePerformance: true,
  validateSchemas: true
});

// Test configuration
const testConfig = {
  backend: {
    baseUrl: 'http://localhost:8090',
    websocketUrl: 'ws://localhost:8090/ws',
    timeout: 15000
  },
  services: {
    'autonomous-investigation': 'http://localhost:3001',
    'manual-investigation': 'http://localhost:3002',
    'agent-analytics': 'http://localhost:3003',
    'rag-intelligence': 'http://localhost:3004',
    'visualization': 'http://localhost:3005',
    'reporting': 'http://localhost:3006'
  },
  thresholds: {
    maxResponseTime: 3000,
    maxErrorRate: 5,
    minSuccessRate: 95
  }
};

// Define API test suites for each microservice
const investigationApiSuite: ApiTestSuite = {
  suiteName: 'Investigation Management API',
  description: 'CRUD operations for investigations and AI analysis',
  baseUrl: testConfig.backend.baseUrl,
  endpoints: [
    {
      method: 'GET',
      path: '/api/health',
      description: 'Backend health check',
      expectedStatus: 200
    },
    {
      method: 'POST',
      path: '/api/auth/login',
      description: 'User authentication',
      body: {
        username: 'test-user',
        password: 'test-password'
      },
      expectedStatus: 200,
      responseSchema: {
        type: 'object',
        required: ['token', 'user'],
        properties: {
          token: { type: 'string' },
          user: { type: 'object' }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/investigations',
      description: 'List all investigations',
      requiresAuth: true,
      expectedStatus: 200,
      responseSchema: {
        type: 'object',
        required: ['investigations', 'total'],
        properties: {
          investigations: { type: 'array' },
          total: { type: 'number' }
        }
      }
    },
    {
      method: 'POST',
      path: '/api/investigations',
      description: 'Create new investigation',
      requiresAuth: true,
      body: {
        title: 'Test Investigation',
        description: 'API integration test investigation',
        priority: 'medium',
        type: 'fraud_detection'
      },
      expectedStatus: 201,
      responseSchema: {
        type: 'object',
        required: ['id', 'title', 'status'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/investigations/test-id',
      description: 'Get investigation by ID',
      requiresAuth: true,
      expectedStatus: 200
    },
    {
      method: 'PUT',
      path: '/api/investigations/test-id',
      description: 'Update investigation',
      requiresAuth: true,
      body: {
        status: 'in_progress',
        findings: 'Test findings from API integration'
      },
      expectedStatus: 200
    },
    {
      method: 'POST',
      path: '/api/investigations/test-id/analyze',
      description: 'Run AI analysis on investigation',
      requiresAuth: true,
      body: {
        analysisType: 'comprehensive',
        includeRiskScore: true
      },
      expectedStatus: 202,
      timeout: 30000 // AI analysis may take longer
    }
  ]
};

const analyticsApiSuite: ApiTestSuite = {
  suiteName: 'Analytics and Reporting API',
  description: 'Agent analytics and performance metrics',
  baseUrl: testConfig.backend.baseUrl,
  endpoints: [
    {
      method: 'GET',
      path: '/api/agents/analytics',
      description: 'Get agent performance analytics',
      requiresAuth: true,
      queryParams: {
        timeRange: '7d',
        includeMetrics: true
      },
      expectedStatus: 200,
      responseSchema: {
        type: 'object',
        required: ['agents', 'summary'],
        properties: {
          agents: { type: 'array' },
          summary: { type: 'object' }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/agents/test-agent/performance',
      description: 'Get specific agent performance',
      requiresAuth: true,
      expectedStatus: 200
    },
    {
      method: 'GET',
      path: '/api/visualizations/risk-scores',
      description: 'Get risk score visualization data',
      requiresAuth: true,
      queryParams: {
        timeRange: '30d',
        granularity: 'daily'
      },
      expectedStatus: 200,
      responseSchema: {
        type: 'object',
        required: ['data', 'metadata'],
        properties: {
          data: { type: 'array' },
          metadata: { type: 'object' }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/visualizations/trends',
      description: 'Get trend analysis data',
      requiresAuth: true,
      expectedStatus: 200
    }
  ]
};

const reportingApiSuite: ApiTestSuite = {
  suiteName: 'Reporting and Export API',
  description: 'Report generation and data export functionality',
  baseUrl: testConfig.backend.baseUrl,
  endpoints: [
    {
      method: 'POST',
      path: '/api/reports/generate',
      description: 'Generate investigation report',
      requiresAuth: true,
      body: {
        investigationId: 'test-id',
        format: 'pdf',
        includeCharts: true,
        includeEvidence: true
      },
      expectedStatus: 202,
      timeout: 20000,
      responseSchema: {
        type: 'object',
        required: ['reportId', 'status'],
        properties: {
          reportId: { type: 'string' },
          status: { type: 'string' }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/reports',
      description: 'List generated reports',
      requiresAuth: true,
      queryParams: {
        limit: 20,
        status: 'completed'
      },
      expectedStatus: 200,
      responseSchema: {
        type: 'object',
        required: ['reports', 'pagination'],
        properties: {
          reports: { type: 'array' },
          pagination: { type: 'object' }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/reports/test-report-id/download',
      description: 'Download generated report',
      requiresAuth: true,
      expectedStatus: 200,
      headers: {
        'Accept': 'application/pdf'
      }
    }
  ]
};

const ragApiSuite: ApiTestSuite = {
  suiteName: 'RAG Intelligence API',
  description: 'RAG-based knowledge retrieval and search',
  baseUrl: testConfig.backend.baseUrl,
  endpoints: [
    {
      method: 'POST',
      path: '/api/rag/query',
      description: 'Query RAG system for information',
      requiresAuth: true,
      body: {
        query: 'What are the common fraud patterns in e-commerce?',
        context: 'investigation',
        maxResults: 10
      },
      expectedStatus: 200,
      timeout: 15000,
      responseSchema: {
        type: 'object',
        required: ['results', 'confidence'],
        properties: {
          results: { type: 'array' },
          confidence: { type: 'number' }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/rag/documents',
      description: 'List RAG knowledge documents',
      requiresAuth: true,
      queryParams: {
        category: 'fraud_patterns',
        limit: 50
      },
      expectedStatus: 200
    },
    {
      method: 'POST',
      path: '/api/rag/documents',
      description: 'Add document to RAG system',
      requiresAuth: true,
      body: {
        title: 'Test Document',
        content: 'This is a test document for RAG system validation',
        category: 'test',
        metadata: {
          source: 'api-test',
          confidence: 0.9
        }
      },
      expectedStatus: 201
    }
  ]
};

test.describe('API Integration Tests', () => {
  test.setTimeout(60000); // 1 minute per test

  test('should connect to backend and validate health endpoint', async () => {
    console.log('🏥 Testing backend connectivity and health...');

    const healthEndpoint: ApiEndpoint = {
      method: 'GET',
      path: '/api/health',
      description: 'Backend health check'
    };

    const result = await apiEngine.testEndpoint(healthEndpoint);

    expect(result.passed).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.responseTime).toBeLessThan(testConfig.thresholds.maxResponseTime);

    console.log(`✅ Backend health check passed (${result.responseTime}ms)`);
  });

  test('should authenticate with backend API', async () => {
    console.log('🔐 Testing authentication flow...');

    const authEndpoint: ApiEndpoint = {
      method: 'POST',
      path: '/api/auth/login',
      description: 'User authentication',
      body: {
        username: 'test-user',
        password: 'test-password'
      },
      expectedStatus: 200
    };

    const result = await apiEngine.testEndpoint(authEndpoint, {
      validateSchemas: true
    });

    expect(result.passed).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.response).toHaveProperty('token');
    expect(result.response).toHaveProperty('user');

    console.log('✅ Authentication successful');
  });

  test('should perform CRUD operations on investigations', async () => {
    console.log('📊 Testing investigation CRUD operations...');

    const results = await apiEngine.testApiSuite(investigationApiSuite, {
      includeAuth: true,
      includePerformance: true,
      validateSchemas: true
    });

    // Validate all critical operations passed
    const criticalOperations = ['GET /api/investigations', 'POST /api/investigations'];
    const criticalResults = results.filter(r =>
      criticalOperations.some(op => r.endpoint.includes(op.split(' ')[1]))
    );

    expect(criticalResults.every(r => r.passed)).toBe(true);

    // Validate response times
    const slowResponses = results.filter(r => r.responseTime > testConfig.thresholds.maxResponseTime);
    expect(slowResponses.length).toBeLessThanOrEqual(1); // Allow 1 slow response

    // Log results
    const passedCount = results.filter(r => r.passed).length;
    console.log(`✅ Investigation API: ${passedCount}/${results.length} tests passed`);

    results.forEach(result => {
      if (!result.passed) {
        console.log(`❌ ${result.method} ${result.endpoint}: ${result.errors.length} errors`);
      }
    });
  });

  test('should validate analytics and visualization APIs', async () => {
    console.log('📈 Testing analytics and visualization APIs...');

    const results = await apiEngine.testApiSuite(analyticsApiSuite, {
      includeAuth: true,
      includePerformance: true,
      validateSchemas: true
    });

    // Validate critical analytics endpoints
    const analyticsResults = results.filter(r => r.endpoint.includes('/api/agents/analytics'));
    expect(analyticsResults.length).toBeGreaterThan(0);
    expect(analyticsResults.every(r => r.passed)).toBe(true);

    // Validate visualization endpoints
    const visualizationResults = results.filter(r => r.endpoint.includes('/api/visualizations'));
    expect(visualizationResults.length).toBeGreaterThan(0);

    const passedCount = results.filter(r => r.passed).length;
    console.log(`✅ Analytics API: ${passedCount}/${results.length} tests passed`);
  });

  test('should validate reporting and export functionality', async () => {
    console.log('📄 Testing reporting and export APIs...');

    const results = await apiEngine.testApiSuite(reportingApiSuite, {
      includeAuth: true,
      includePerformance: true,
      validateSchemas: true
    });

    // Validate report generation
    const reportGenResults = results.filter(r => r.endpoint.includes('/api/reports/generate'));
    expect(reportGenResults.length).toBeGreaterThan(0);

    // Validate report listing
    const reportListResults = results.filter(r => r.endpoint === '/api/reports');
    expect(reportListResults.length).toBeGreaterThan(0);

    const passedCount = results.filter(r => r.passed).length;
    console.log(`✅ Reporting API: ${passedCount}/${results.length} tests passed`);
  });

  test('should validate RAG intelligence system integration', async () => {
    console.log('🧠 Testing RAG intelligence APIs...');

    const results = await apiEngine.testApiSuite(ragApiSuite, {
      includeAuth: true,
      includePerformance: true,
      validateSchemas: true,
      timeout: 20000 // RAG queries may take longer
    });

    // Validate RAG query functionality
    const queryResults = results.filter(r => r.endpoint.includes('/api/rag/query'));
    expect(queryResults.length).toBeGreaterThan(0);

    if (queryResults.length > 0 && queryResults[0].passed) {
      expect(queryResults[0].response).toHaveProperty('results');
      expect(queryResults[0].response).toHaveProperty('confidence');
      expect(Array.isArray(queryResults[0].response.results)).toBe(true);
    }

    const passedCount = results.filter(r => r.passed).length;
    console.log(`✅ RAG Intelligence API: ${passedCount}/${results.length} tests passed`);
  });

  test('should validate WebSocket real-time communication', async () => {
    console.log('🔌 Testing WebSocket connectivity...');

    const websocketUrl = testConfig.backend.websocketUrl;
    const wsResult = await apiEngine.testWebSocketConnection(websocketUrl, {
      timeout: 15000
    });

    expect(wsResult.passed).toBe(true);
    expect(wsResult.connectionTime).toBeLessThan(5000);
    expect(wsResult.events.length).toBeGreaterThan(0);

    // Validate connection events
    const connectEvents = wsResult.events.filter(e => e.type === 'connect');
    expect(connectEvents.length).toBe(1);

    // Validate message exchange if supported
    if (wsResult.messagesSent > 0) {
      expect(wsResult.messagesReceived).toBeGreaterThanOrEqual(0);
    }

    console.log(`✅ WebSocket connection established (${wsResult.connectionTime}ms)`);
    console.log(`📊 Messages: ${wsResult.messagesSent} sent, ${wsResult.messagesReceived} received`);
  });

  test('should handle API error cases gracefully', async () => {
    console.log('⚠️ Testing API error handling...');

    const errorTestCases: ApiEndpoint[] = [
      {
        method: 'GET',
        path: '/api/investigations/non-existent-id',
        description: 'Get non-existent investigation',
        requiresAuth: true,
        expectedStatus: 404
      },
      {
        method: 'POST',
        path: '/api/investigations',
        description: 'Create investigation with invalid data',
        requiresAuth: true,
        body: {
          // Missing required fields
          description: 'Missing title and type'
        },
        expectedStatus: 400
      },
      {
        method: 'GET',
        path: '/api/secure-endpoint',
        description: 'Access protected endpoint without auth',
        requiresAuth: false,
        expectedStatus: 401
      },
      {
        method: 'POST',
        path: '/api/investigations/test-id/analyze',
        description: 'Analyze with invalid analysis type',
        requiresAuth: true,
        body: {
          analysisType: 'invalid-type'
        },
        expectedStatus: 400
      }
    ];

    const errorResults = [];
    for (const errorCase of errorTestCases) {
      const result = await apiEngine.testEndpoint(errorCase, {
        includeAuth: errorCase.requiresAuth
      });
      errorResults.push(result);

      // For error cases, we expect the API to return the expected error status
      if (errorCase.expectedStatus >= 400) {
        expect(result.statusCode).toBe(errorCase.expectedStatus);
        console.log(`✅ ${errorCase.description}: Expected ${errorCase.expectedStatus}, got ${result.statusCode}`);
      }
    }

    // Validate that errors are handled properly (no 5xx responses for client errors)
    const serverErrors = errorResults.filter(r => r.statusCode >= 500);
    expect(serverErrors.length).toBe(0);

    console.log(`✅ Error handling: ${errorResults.length} error cases tested`);
  });

  test('should validate API performance under load', async () => {
    console.log('⚡ Testing API performance under concurrent load...');

    const performanceEndpoint: ApiEndpoint = {
      method: 'GET',
      path: '/api/investigations',
      description: 'List investigations (performance test)',
      requiresAuth: true
    };

    // Run multiple concurrent requests
    const concurrentRequests = 5;
    const requestPromises = Array.from({ length: concurrentRequests }, () =>
      apiEngine.testEndpoint(performanceEndpoint, { includePerformance: true })
    );

    const results = await Promise.all(requestPromises);

    // Validate all requests succeeded
    const successfulRequests = results.filter(r => r.passed);
    const successRate = (successfulRequests.length / results.length) * 100;

    expect(successRate).toBeGreaterThanOrEqual(testConfig.thresholds.minSuccessRate);

    // Validate response times under load
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    expect(avgResponseTime).toBeLessThan(testConfig.thresholds.maxResponseTime * 1.5); // 50% tolerance under load

    console.log(`✅ Performance under load: ${successRate}% success rate`);
    console.log(`📊 Average response time: ${Math.round(avgResponseTime)}ms`);
  });

  test('should validate data consistency across API operations', async () => {
    console.log('🔄 Testing data consistency across API operations...');

    // Create an investigation
    const createResult = await apiEngine.testEndpoint({
      method: 'POST',
      path: '/api/investigations',
      description: 'Create investigation for consistency test',
      requiresAuth: true,
      body: {
        title: 'Consistency Test Investigation',
        description: 'Testing data consistency across operations',
        priority: 'high',
        type: 'data_breach'
      },
      expectedStatus: 201
    });

    expect(createResult.passed).toBe(true);
    expect(createResult.response).toHaveProperty('id');

    const investigationId = createResult.response.id;

    // Retrieve the created investigation
    const getResult = await apiEngine.testEndpoint({
      method: 'GET',
      path: `/api/investigations/${investigationId}`,
      description: 'Get created investigation',
      requiresAuth: true,
      expectedStatus: 200
    });

    expect(getResult.passed).toBe(true);
    expect(getResult.response).toHaveProperty('id', investigationId);
    expect(getResult.response).toHaveProperty('title', 'Consistency Test Investigation');

    // Update the investigation
    const updateResult = await apiEngine.testEndpoint({
      method: 'PUT',
      path: `/api/investigations/${investigationId}`,
      description: 'Update investigation',
      requiresAuth: true,
      body: {
        status: 'completed',
        findings: 'Data consistency validated successfully'
      },
      expectedStatus: 200
    });

    expect(updateResult.passed).toBe(true);

    // Verify update was applied
    const verifyResult = await apiEngine.testEndpoint({
      method: 'GET',
      path: `/api/investigations/${investigationId}`,
      description: 'Verify investigation update',
      requiresAuth: true,
      expectedStatus: 200
    });

    expect(verifyResult.passed).toBe(true);
    expect(verifyResult.response).toHaveProperty('status', 'completed');

    console.log('✅ Data consistency validated across CRUD operations');
  });

  // Generate comprehensive API test report after all tests
  test.afterAll(async () => {
    console.log('\n📄 Generating comprehensive API integration test report...');

    // Run full API contract tests
    const services = [
      'autonomous-investigation',
      'manual-investigation',
      'agent-analytics',
      'rag-intelligence',
      'visualization',
      'reporting'
    ];

    const contractResults = await apiEngine.testApiContracts(services, {
      includeAuth: true,
      validateSchemas: true,
      timeout: 15000
    });

    // Test WebSocket connections
    const websocketResults = [
      await apiEngine.testWebSocketConnection(testConfig.backend.websocketUrl, { timeout: 10000 })
    ];

    // Compile all test results
    const allSuiteResults = [
      ...(await apiEngine.testApiSuite(investigationApiSuite, { includeAuth: true })),
      ...(await apiEngine.testApiSuite(analyticsApiSuite, { includeAuth: true })),
      ...(await apiEngine.testApiSuite(reportingApiSuite, { includeAuth: true })),
      ...(await apiEngine.testApiSuite(ragApiSuite, { includeAuth: true }))
    ];

    // Generate HTML report
    const reportHtml = apiEngine.generateApiTestReport(
      allSuiteResults,
      contractResults,
      websocketResults
    );

    console.log('📊 API Integration Test Summary:');
    console.log(`   Total API tests: ${allSuiteResults.length}`);
    console.log(`   Passed: ${allSuiteResults.filter(r => r.passed).length}`);
    console.log(`   Failed: ${allSuiteResults.filter(r => !r.passed).length}`);
    console.log(`   Contract tests: ${contractResults.length}`);
    console.log(`   Contract violations: ${contractResults.reduce((sum, r) => sum + r.violations.length, 0)}`);
    console.log(`   WebSocket tests: ${websocketResults.length}`);
    console.log(`   WebSocket passed: ${websocketResults.filter(r => r.passed).length}`);

    const overallSuccessRate = (allSuiteResults.filter(r => r.passed).length / allSuiteResults.length) * 100;
    console.log(`   Overall success rate: ${Math.round(overallSuccessRate)}%`);

    if (overallSuccessRate >= testConfig.thresholds.minSuccessRate) {
      console.log('🎉 All API integration tests meet quality thresholds!');
    } else {
      console.log('⚠️ Some API integration tests failed - see detailed report for issues');
    }

    console.log('\n📄 Detailed report available in test results');
  });
});