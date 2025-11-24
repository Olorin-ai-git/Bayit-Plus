# API Testing Framework

This directory contains a comprehensive API testing framework for the Olorin frontend microservices integration with the backend API. The framework provides automated contract testing, response validation, authentication testing, and performance monitoring to ensure reliable frontend-backend communication.

## Overview

The API testing framework includes:

- **Automated API contract testing** with JSON schema validation
- **Authentication and authorization testing** with JWT token management
- **Response schema validation** for data integrity
- **Error handling and edge case testing** for robustness
- **Performance testing and monitoring** for API endpoints
- **WebSocket connection testing** for real-time features
- **Rate limiting and throttling validation** for API protection
- **Cross-service integration testing** for microservices communication

## File Structure

```
api/
├── README.md                          # This documentation
├── api-test-engine.ts                 # Core API testing engine
├── api-integration.e2e.test.ts        # Playwright API integration tests
└── /reports/                          # Generated API test reports
```

## Quick Start

### 1. Run API Tests

```bash
# Check backend health
npm run api:health

# Run all API integration tests
npm run api:all

# Run individual test types
npm run api:test        # Playwright API integration tests
npm run api:contracts   # Contract validation tests
npm run api:auth        # Test authentication endpoint

# Test specific service API
npm run api:test -- --grep "investigation"
```

### 2. View Results

API test results are saved to `test-results/api/`:

- **Integration Report**: `test-results/api/api-integration-report.html`
- **Contract Report**: `test-results/api-contracts/contract-validation-report.html`
- **JSON Results**: `test-results/api-contracts/contract-validation-results.json`

## API Test Engine

### Core Features (`api-test-engine.ts`)

Comprehensive API testing with automated validation:

```typescript
import { ApiTestEngine, ApiTestSuite } from './api-test-engine';

const apiEngine = new ApiTestEngine({
  baseUrl: 'http://localhost:8090',
  timeout: 15000,
  includeAuth: true,
  includePerformance: true,
  validateSchemas: true
});

// Test single API endpoint
const result = await apiEngine.testEndpoint({
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
});

// Test API suite
const results = await apiEngine.testApiSuite(investigationApiSuite, {
  includeAuth: true,
  includePerformance: true
});

// Test WebSocket connection
const wsResult = await apiEngine.testWebSocketConnection(
  'ws://localhost:8090/ws',
  { timeout: 10000 }
);
```

### API Test Suites

The framework includes predefined test suites for each microservice:

#### Investigation Management API
- **Authentication**: Login and token management
- **CRUD Operations**: Create, read, update investigations
- **AI Analysis**: Trigger and monitor AI-powered analysis
- **Error Handling**: Invalid data and unauthorized access

#### Analytics and Reporting API
- **Agent Analytics**: Performance metrics and statistics
- **Visualization Data**: Risk scores and trend analysis
- **Report Generation**: PDF and data export functionality
- **Data Integrity**: Consistent data across endpoints

#### RAG Intelligence API
- **Knowledge Queries**: RAG-based information retrieval
- **Document Management**: Add and manage knowledge documents
- **Confidence Scoring**: Validate AI confidence levels
- **Context Handling**: Different query contexts and filters

## Contract Testing

### Automated Schema Validation

The framework validates API contracts using JSON schemas:

```typescript
// Example contract definition
const investigationContract = {
  endpoints: [
    {
      path: '/api/investigations',
      method: 'GET',
      description: 'List all investigations',
      requiresAuth: true,
      responseSchema: {
        type: 'object',
        required: ['investigations', 'total', 'pagination'],
        properties: {
          investigations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'title', 'status', 'createdAt'],
              properties: {
                id: { type: 'string', pattern: '^[a-zA-Z0-9-_]+$' },
                title: { type: 'string', minLength: 1, maxLength: 200 },
                status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
                createdAt: { type: 'string', format: 'date-time' }
              }
            }
          },
          total: { type: 'number', minimum: 0 },
          pagination: {
            type: 'object',
            required: ['page', 'limit', 'totalPages']
          }
        }
      }
    }
  ]
};
```

### Contract Validation Features

- **Schema Compliance**: Validates response structure and data types
- **Required Fields**: Ensures all mandatory fields are present
- **Data Constraints**: Validates field lengths, patterns, and enums
- **Format Validation**: Checks date-time, URI, and custom formats
- **Backward Compatibility**: Detects breaking changes in API responses

## Authentication Testing

### JWT Token Management

```typescript
// Automated authentication flow
const authEndpoint = {
  method: 'POST',
  path: '/api/auth/login',
  description: 'User authentication',
  body: {
    username: 'test-user',
    password: 'test-password'
  },
  responseSchema: {
    type: 'object',
    required: ['token', 'user'],
    properties: {
      token: { type: 'string' },
      user: { type: 'object' }
    }
  }
};

// Automatic token management for protected endpoints
const protectedEndpoint = {
  method: 'GET',
  path: '/api/investigations',
  requiresAuth: true // Automatically adds Bearer token
};
```

### Authentication Test Scenarios

1. **Valid Credentials**: Successful login with correct credentials
2. **Invalid Credentials**: Proper error handling for wrong credentials
3. **Token Validation**: Protected endpoints require valid tokens
4. **Token Expiration**: Handling of expired authentication tokens
5. **Authorization Levels**: Different access levels for different users

## Performance Testing

### Response Time Monitoring

```typescript
// Performance thresholds
const performanceThresholds = {
  fast: 500,      // ≤500ms - Excellent
  acceptable: 2000, // ≤2s - Good
  slow: 5000      // ≤5s - Acceptable
};

// Performance validation
const performanceTest = await apiEngine.testEndpoint(endpoint, {
  includePerformance: true
});

// Validate response times
expect(performanceTest.responseTime).toBeLessThan(2000);
```

### Performance Metrics

- **Response Time**: Total request/response cycle time
- **Time to First Byte**: Server processing time
- **Network Latency**: Communication overhead
- **Throughput**: Requests per second under load
- **Concurrent Performance**: Response times under concurrent load

## Error Handling Testing

### Comprehensive Error Scenarios

```typescript
const errorTestCases = [
  {
    method: 'GET',
    path: '/api/investigations/non-existent-id',
    description: 'Get non-existent investigation',
    expectedStatus: 404
  },
  {
    method: 'POST',
    path: '/api/investigations',
    description: 'Create investigation with invalid data',
    body: { /* missing required fields */ },
    expectedStatus: 400
  },
  {
    method: 'GET',
    path: '/api/secure-endpoint',
    description: 'Access protected endpoint without auth',
    requiresAuth: false,
    expectedStatus: 401
  }
];
```

### Error Validation

- **HTTP Status Codes**: Correct status codes for different error types
- **Error Response Format**: Consistent error message structure
- **Error Details**: Helpful error descriptions and troubleshooting info
- **Graceful Degradation**: Proper handling of service unavailability
- **Security Errors**: Appropriate responses for security violations

## WebSocket Testing

### Real-time Communication Validation

```typescript
// WebSocket connection testing
const wsResult = await apiEngine.testWebSocketConnection(
  'ws://localhost:8090/ws',
  {
    timeout: 15000,
    testMessages: true,
    validateHeartbeat: true
  }
);

// Validate WebSocket functionality
expect(wsResult.passed).toBe(true);
expect(wsResult.connectionTime).toBeLessThan(5000);
expect(wsResult.messagesSent).toBeGreaterThan(0);
expect(wsResult.messagesReceived).toBeGreaterThan(0);
```

### WebSocket Test Coverage

- **Connection Establishment**: Successful WebSocket handshake
- **Message Exchange**: Bidirectional message communication
- **Connection Stability**: Sustained connection over time
- **Error Handling**: Graceful handling of connection failures
- **Reconnection Logic**: Automatic reconnection on disconnect

## Data Consistency Testing

### Cross-Operation Validation

```typescript
// Test data consistency across operations
test('should maintain data consistency across CRUD operations', async () => {
  // Create investigation
  const createResult = await apiEngine.testEndpoint(createEndpoint);
  const investigationId = createResult.response.id;

  // Retrieve created investigation
  const getResult = await apiEngine.testEndpoint({
    ...getEndpoint,
    path: `/api/investigations/${investigationId}`
  });

  // Validate data consistency
  expect(getResult.response.id).toBe(investigationId);
  expect(getResult.response.title).toBe(createResult.response.title);

  // Update investigation
  const updateResult = await apiEngine.testEndpoint({
    ...updateEndpoint,
    path: `/api/investigations/${investigationId}`,
    body: { status: 'completed' }
  });

  // Verify update was applied
  const verifyResult = await apiEngine.testEndpoint({
    ...getEndpoint,
    path: `/api/investigations/${investigationId}`
  });

  expect(verifyResult.response.status).toBe('completed');
});
```

## E2E API Integration Testing

### Comprehensive Test Suite (`api-integration.e2e.test.ts`)

```typescript
test.describe('API Integration Tests', () => {
  test('should connect to backend and validate health endpoint', async () => {
    const result = await apiEngine.testEndpoint(healthEndpoint);

    expect(result.passed).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.responseTime).toBeLessThan(3000);
  });

  test('should perform CRUD operations on investigations', async () => {
    const results = await apiEngine.testApiSuite(investigationApiSuite, {
      includeAuth: true,
      includePerformance: true,
      validateSchemas: true
    });

    const criticalResults = results.filter(r =>
      r.endpoint.includes('/api/investigations')
    );

    expect(criticalResults.every(r => r.passed)).toBe(true);
  });

  test('should validate API performance under load', async () => {
    const concurrentRequests = 5;
    const requestPromises = Array.from({ length: concurrentRequests }, () =>
      apiEngine.testEndpoint(performanceEndpoint)
    );

    const results = await Promise.all(requestPromises);
    const successRate = (results.filter(r => r.passed).length / results.length) * 100;

    expect(successRate).toBeGreaterThanOrEqual(95);
  });
});
```

### Test Categories

1. **Backend Connectivity**: Health checks and basic connectivity
2. **Authentication Flow**: Login and token management
3. **CRUD Operations**: Create, read, update, delete investigations
4. **Analytics Integration**: Agent and visualization APIs
5. **Reporting Functionality**: Report generation and export
6. **RAG Intelligence**: Knowledge queries and document management
7. **WebSocket Communication**: Real-time features and events
8. **Error Handling**: Graceful error responses and edge cases
9. **Performance Validation**: Response times and concurrent load
10. **Data Consistency**: Cross-operation data integrity

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: API Integration Tests

on: [push, pull_request]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    services:
      backend:
        image: olorin-backend:latest
        ports:
          - 8090:8090
        options: --health-cmd="curl -f http://localhost:8090/api/health" --health-interval=10s --health-timeout=5s --health-retries=5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Wait for backend
        run: |
          timeout 60s bash -c 'until curl -f http://localhost:8090/api/health; do sleep 2; done'

      - name: Run API health check
        run: npm run api:health

      - name: Run API integration tests
        run: npm run api:test

      - name: Run API contract validation
        run: npm run api:contracts

      - name: Upload API test reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: api-test-reports
          path: test-results/api/
```

## Configuration

### Backend Configuration

```typescript
// API test engine configuration
const apiConfig = {
  backend: {
    baseUrl: 'http://localhost:8090',    // Backend API base URL
    websocketUrl: 'ws://localhost:8090/ws', // WebSocket endpoint
    timeout: 15000,                      // Request timeout in ms
    retries: 3                          // Retry attempts for failed requests
  },

  authentication: {
    loginEndpoint: '/api/auth/login',
    testCredentials: {
      username: 'test-user',
      password: 'test-password'
    }
  },

  thresholds: {
    maxResponseTime: 3000,              // Maximum acceptable response time
    maxErrorRate: 5,                    // Maximum error rate percentage
    minSuccessRate: 95                  // Minimum success rate percentage
  }
};
```

### Environment Variables

```bash
# Backend configuration
BACKEND_URL=http://localhost:8090
BACKEND_WS_URL=ws://localhost:8090/ws

# Test configuration
API_TEST_TIMEOUT=15000
API_TEST_RETRIES=3

# Authentication
TEST_USERNAME=test-user
TEST_PASSWORD=test-password

# Performance thresholds
MAX_RESPONSE_TIME=3000
MIN_SUCCESS_RATE=95
```

## Troubleshooting

### Common Issues

1. **Backend not available**:
   ```bash
   # Check backend status
   npm run api:health

   # Start backend manually
   cd ../olorin-server
   poetry run python -m app.local_server
   ```

2. **Authentication failures**:
   ```bash
   # Test authentication endpoint
   npm run api:auth

   # Check test credentials in backend
   ```

3. **Schema validation errors**:
   - Update contract definitions in `contract-validator.js`
   - Verify backend API response format
   - Check for breaking changes in API responses

4. **Performance issues**:
   ```bash
   # Run performance-specific tests
   npm run api:test -- --grep "performance"

   # Monitor backend resource usage
   ```

### Debug Mode

```bash
# Run with detailed debugging
DEBUG=api-test npm run api:test

# Test specific endpoint
npm run api:test -- --grep "investigations"

# Validate specific contract
<<<<<<< HEAD
npm run api:contracts -- --service autonomous-investigation
=======
npm run api:contracts -- --service structured-investigation
>>>>>>> 001-modify-analyzer-method

# Generate verbose reports
npm run api:contracts -- --verbose
```

## Best Practices

### 1. API Testing Strategy

- **Test early and often** throughout development cycle
- **Mock external dependencies** when testing API logic
- **Use realistic test data** that matches production patterns
- **Validate both success and error scenarios** for comprehensive coverage

### 2. Contract Management

- **Version your API contracts** and track breaking changes
- **Automate contract validation** in CI/CD pipelines
- **Document API changes** and their impact on frontend
- **Maintain backward compatibility** when possible

### 3. Performance Monitoring

- **Set realistic performance budgets** based on user expectations
- **Monitor trends over time** rather than isolated measurements
- **Test under realistic load conditions** including concurrent users
- **Profile slow endpoints** and optimize bottlenecks

### 4. Error Handling

- **Test all error scenarios** including network failures
- **Validate error message quality** for debugging assistance
- **Ensure graceful degradation** when services are unavailable
- **Document error codes** and their meanings

## Contributing

When adding new API tests:

1. **Follow naming conventions**: `*.api.e2e.test.ts`
2. **Update contract definitions** for new endpoints
3. **Include proper error handling** for all test scenarios
4. **Document new test patterns** and their purpose
5. **Update performance thresholds** for new endpoints

## Related Documentation

- [Cross-Browser Testing](../cross-browser/README.md)
- [Performance Testing](../performance/README.md)
- [E2E Testing Setup](../e2e/README.md)
- [Backend API Documentation](../../../../docs/api/README.md)
- [Authentication Guide](../../../../docs/auth/README.md)
- [WebSocket Integration](../../../../docs/websockets/README.md)