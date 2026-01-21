# @cvplus/e2e-flows

[![Build Status](https://img.shields.io/github/workflow/status/gilco1973/cvplus-e2e-flows/CI)](https://github.com/gilco1973/cvplus-e2e-flows/actions)
[![Coverage](https://img.shields.io/codecov/c/github/gilco1973/cvplus-e2e-flows)](https://codecov.io/gh/gilco1973/cvplus-e2e-flows)
[![Version](https://img.shields.io/npm/v/@cvplus/e2e-flows)](https://www.npmjs.com/package/@cvplus/e2e-flows)
[![License](https://img.shields.io/github/license/gilco1973/cvplus-e2e-flows)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)

**End-to-end testing flows for CVPlus** - comprehensive user journey validation, submodule testing, and API validation with advanced performance and load testing capabilities.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Testing Framework](#testing-framework)
- [Performance Testing](#performance-testing)
- [Load Testing](#load-testing)
- [Configuration](#configuration)
- [CLI Commands](#cli-commands)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Features

- 🚀 **Comprehensive E2E Testing**: Complete user journey validation across CVPlus platform
- 🎯 **Submodule Testing**: Independent testing of 18+ CVPlus submodules with isolation
- 🔄 **API Contract Testing**: Curl-based API validation with contract verification
- 🧪 **Mock Data Generation**: Realistic test data using Faker.js with intelligent caching
- ⚡ **Performance Testing**: 20-minute execution limits with benchmarking and regression detection
- 📊 **Load Testing**: 10K concurrent user validation with stress testing scenarios
- 🔍 **Test Orchestration**: Advanced test scenario management with retry logic and failure handling
- 📈 **Metrics Collection**: Performance monitoring with detailed reporting and analysis
- 🐳 **Firebase Integration**: Native support for Firebase emulators and production testing
- 🛡️ **Type Safety**: Full TypeScript support with comprehensive type definitions
- 📱 **CI/CD Ready**: Optimized for continuous integration with parallel execution

## Installation

### Prerequisites

- Node.js 20.x or higher
- npm 9.x or higher (or yarn 1.22.x)
- Firebase CLI (for emulator testing)
- Git (for submodule management)

### Using npm

```bash
npm install @cvplus/e2e-flows
```

### Using yarn

```bash
yarn add @cvplus/e2e-flows
```

### Development Installation

```bash
git clone https://github.com/gilco1973/cvplus-e2e-flows.git
cd cvplus-e2e-flows
npm install
npm run build
```

### Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Configure your environment variables:
```bash
# Basic configuration
E2E_BASE_URL=http://localhost:3000
E2E_API_URL=http://localhost:5001
E2E_TIMEOUT=300000
E2E_PARALLEL_TESTS=4

# Firebase emulators
FIREBASE_PROJECT_ID=cvplus-dev
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIRESTORE_EMULATOR_HOST=localhost:8080
```

3. Start Firebase emulators (optional):
```bash
npm run firebase:emulators
```

## Quick Start

### Basic Usage

```typescript
import { E2EFlowsService, MockDataService, APITestingService } from '@cvplus/e2e-flows'

// Initialize services
const e2eService = new E2EFlowsService()
const mockDataService = new MockDataService()
const apiTestingService = new APITestingService()

// Generate test data
const userData = await mockDataService.generateUser({
  includeCV: true,
  includeProfile: true,
  subscriptionType: 'premium'
})

// Run a complete user journey test
const result = await e2eService.executeScenario({
  name: 'complete-cv-processing',
  type: 'user-journey',
  steps: [
    { action: 'upload-cv', data: userData.cv },
    { action: 'process-cv', timeout: 60000 },
    { action: 'generate-multimedia', options: { podcast: true, video: true } },
    { action: 'create-public-profile', data: userData.profile }
  ]
})

console.log('Test Results:', result.summary)
```

### Running Predefined Scenarios

```bash
# Run complete user journey
npm run scenario:complete-journey

# Test submodule integration
npm run scenario:submodule-integration

# Validate API contracts
npm run scenario:api-contracts

# Execute load testing
npm run scenario:load-test

# Check for regressions
npm run scenario:regression-check
```

### CLI Usage

```bash
# List available test scenarios
npm run e2e:list

# Run specific scenario
npm run e2e:run -- --scenario="cv-processing" --environment="staging"

# Generate mock data
npm run mock-data:generate -- --count=100 --type="user"

# Test specific API endpoint
npm run api-test:endpoint -- --url="/api/cv/upload" --method="POST"
```

## Core Concepts

### Test Scenarios

Test scenarios are the foundation of the e2e-flows system. Each scenario represents a complete user journey or system workflow.

```typescript
import { TestScenario, TestStep } from '@cvplus/e2e-flows'

const scenario: TestScenario = {
  id: 'cv-processing-flow',
  name: 'CV Processing Complete Flow',
  type: 'user-journey',
  description: 'End-to-end CV upload and processing with multimedia generation',
  timeout: 300000, // 5 minutes
  retryConfig: {
    maxRetries: 3,
    retryDelay: 5000,
    exponentialBackoff: true
  },
  steps: [
    {
      id: 'upload',
      name: 'Upload CV File',
      action: 'upload-cv',
      timeout: 30000,
      required: true,
      validation: {
        statusCode: 200,
        responseSchema: 'UploadResponse'
      }
    },
    {
      id: 'process',
      name: 'Process CV Content',
      action: 'process-cv',
      dependsOn: ['upload'],
      timeout: 120000,
      validation: {
        statusCode: 200,
        responseTime: 60000
      }
    }
  ],
  environment: 'test',
  tags: ['cv-processing', 'user-journey', 'critical']
}
```

### Mock Data Generation

The MockDataService provides realistic test data generation with intelligent caching and schema validation.

```typescript
import { MockDataService, DataGenerationOptions } from '@cvplus/e2e-flows'

const mockService = new MockDataService()

// Generate user with related data
const userData = await mockService.generateUser({
  includeCV: true,
  includeProfile: true,
  subscriptionType: 'premium',
  skillsCount: 15,
  experienceYears: 5
})

// Generate bulk data for load testing
const bulkData = await mockService.generateBulkData({
  users: 1000,
  cvJobs: 5000,
  profiles: 1000,
  cacheResults: true,
  exportPath: './test-data/bulk-users.json'
})

// Custom data generation with templates
const customData = await mockService.generateFromTemplate({
  template: 'enterprise-user',
  variables: {
    company: 'TechCorp',
    department: 'Engineering',
    level: 'Senior'
  }
})
```

### API Testing

Comprehensive API testing with curl-based validation and contract verification.

```typescript
import { APITestingService, APITestCase } from '@cvplus/e2e-flows'

const apiService = new APITestingService()

// Define API test case
const testCase: APITestCase = {
  id: 'upload-cv-api',
  name: 'CV Upload API Test',
  endpoint: '/api/cv/upload',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data',
    'Authorization': 'Bearer test-token'
  },
  body: {
    file: '@test-data/sample-cv.pdf',
    options: {
      generatePodcast: true,
      generateVideo: false
    }
  },
  assertions: [
    {
      type: 'status',
      operator: 'equals',
      expected: 200
    },
    {
      type: 'responseTime',
      operator: 'lessThan',
      expected: 5000
    },
    {
      type: 'jsonPath',
      path: '$.jobId',
      operator: 'exists'
    }
  ],
  timeout: 30000
}

// Execute test case
const result = await apiService.executeTestCase(testCase)
console.log('API Test Result:', result)
```

## API Reference

### E2EFlowsService

Main orchestration service for executing test scenarios and managing test flows.

#### Constructor

```typescript
new E2EFlowsService(options?: {
  timeout?: number
  parallelTests?: number
  retryConfig?: RetryConfig
  environment?: string
})
```

#### Methods

##### `executeScenario(scenario: TestScenario): Promise<FlowResult>`

Execute a single test scenario with all its steps.

**Parameters:**
- `scenario` (TestScenario): The test scenario to execute

**Returns:** Promise<FlowResult> - Execution result with metrics and outcomes

**Example:**
```typescript
const result = await e2eService.executeScenario({
  name: 'user-registration',
  type: 'api-flow',
  steps: [
    { action: 'create-user', data: userData },
    { action: 'verify-email', timeout: 30000 },
    { action: 'complete-profile', data: profileData }
  ]
})
```

##### `executeBatch(scenarios: TestScenario[], options?: ExecutionOptions): Promise<ExecutionSummary>`

Execute multiple scenarios in parallel or sequence.

**Parameters:**
- `scenarios` (TestScenario[]): Array of scenarios to execute
- `options` (ExecutionOptions, optional): Execution configuration

**Returns:** Promise<ExecutionSummary> - Summary of all executions

##### `listScenarios(filter?: ScenarioFilter): TestScenario[]`

List available test scenarios with optional filtering.

**Parameters:**
- `filter` (ScenarioFilter, optional): Filter criteria for scenarios

**Returns:** TestScenario[] - Array of matching scenarios

### MockDataService

Service for generating realistic test data with intelligent caching and validation.

#### Constructor

```typescript
new MockDataService(options?: {
  cacheDir?: string
  maxCacheSize?: number
  schemaValidation?: boolean
})
```

#### Methods

##### `generateUser(options?: DataGenerationOptions): Promise<MockUser>`

Generate a realistic user with optional related data.

**Parameters:**
- `options` (DataGenerationOptions, optional): Generation options

**Returns:** Promise<MockUser> - Generated user data

**Example:**
```typescript
const user = await mockService.generateUser({
  includeCV: true,
  includeProfile: true,
  subscriptionType: 'premium',
  skillsCount: 10,
  experienceYears: 3
})
```

##### `generateBulkData(options: BulkGenerationOptions): Promise<BulkDataResult>`

Generate large datasets for load testing and performance validation.

**Parameters:**
- `options` (BulkGenerationOptions): Bulk generation configuration

**Returns:** Promise<BulkDataResult> - Generated bulk data with metadata

##### `cacheData(key: string, data: any, ttl?: number): Promise<void>`

Cache generated data for reuse across test runs.

**Parameters:**
- `key` (string): Cache key identifier
- `data` (any): Data to cache
- `ttl` (number, optional): Time to live in seconds

##### `getCachedData<T>(key: string): Promise<T | null>`

Retrieve cached data by key.

**Parameters:**
- `key` (string): Cache key identifier

**Returns:** Promise<T | null> - Cached data or null if not found

### APITestingService

Service for comprehensive API testing with curl-based validation and contract verification.

#### Constructor

```typescript
new APITestingService(options?: {
  baseURL?: string
  timeout?: number
  retries?: number
  rateLimitDelay?: number
})
```

#### Methods

##### `executeTestCase(testCase: APITestCase): Promise<APIResult>`

Execute a single API test case with validation.

**Parameters:**
- `testCase` (APITestCase): The test case to execute

**Returns:** Promise<APIResult> - Test execution result

##### `executeTestSuite(suite: APITestCase[], options?: TestSuiteOptions): Promise<TestSuiteResult>`

Execute multiple API test cases as a suite.

**Parameters:**
- `suite` (APITestCase[]): Array of test cases
- `options` (TestSuiteOptions, optional): Suite execution options

**Returns:** Promise<TestSuiteResult> - Suite execution results

##### `validateContract(endpoint: string, schema: JSONSchema): Promise<ValidationResult>`

Validate API response against OpenAPI/JSON schema.

**Parameters:**
- `endpoint` (string): API endpoint to validate
- `schema` (JSONSchema): Schema for validation

**Returns:** Promise<ValidationResult> - Validation result

## Testing Framework

### Unit Tests

The package includes comprehensive unit tests for all services and models.

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm test tests/unit/MockDataService.test.ts

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Integration Tests

Integration tests validate interactions between services and external dependencies.

```bash
# Run integration tests
npm run test:integration

# Run with real APIs (requires API keys)
npm run test:e2e:real-apis
```

### Contract Tests

Contract tests ensure API compatibility and schema validation.

```bash
# Run contract tests
npm run test:contract

# Quick smoke tests
npm run test:smoke
```

## Performance Testing

The e2e-flows package includes comprehensive performance testing capabilities with 20-minute execution limits and detailed benchmarking.

### Performance Test Configuration

```typescript
// Performance test configuration
const performanceConfig = {
  timeout: 1200000, // 20 minutes
  concurrentUsers: 100,
  rampUpTime: 30000, // 30 seconds
  sustainTime: 300000, // 5 minutes
  rampDownTime: 30000, // 30 seconds
  thresholds: {
    responseTime: {
      p95: 3000, // 95th percentile under 3 seconds
      p99: 5000  // 99th percentile under 5 seconds
    },
    errorRate: 0.01, // Less than 1% error rate
    throughput: 100  // Minimum 100 requests per second
  }
}
```

### Running Performance Tests

```bash
# Run all performance tests
npm run test:performance

# Run specific performance test
npm test tests/performance/MockDataService.performance.test.ts

# Run with custom parameters
PERFORMANCE_USERS=50 PERFORMANCE_DURATION=600000 npm run test:performance
```

### Performance Test Types

#### 1. Service Performance Tests

```typescript
describe('MockDataService Performance', () => {
  test('should generate 10K users within time limits', async () => {
    const startTime = Date.now()

    const users = await mockService.generateBulkData({
      users: 10000,
      parallel: true,
      cacheResults: false
    })

    const duration = Date.now() - startTime
    expect(duration).toBeLessThan(300000) // 5 minutes max
    expect(users.length).toBe(10000)
  })

  test('should handle concurrent generation', async () => {
    const concurrentRequests = Array.from({ length: 100 }, () =>
      mockService.generateUser({ includeCV: true })
    )

    const results = await Promise.all(concurrentRequests)
    expect(results.length).toBe(100)
    expect(results.every(user => user.id)).toBe(true)
  })
})
```

#### 2. API Performance Tests

```typescript
describe('API Performance Testing', () => {
  test('should handle high-throughput API calls', async () => {
    const testCases = Array.from({ length: 1000 }, (_, i) => ({
      id: `perf-test-${i}`,
      endpoint: '/api/cv/upload',
      method: 'POST',
      timeout: 5000
    }))

    const results = await apiService.executeTestSuite(testCases, {
      parallel: 10,
      rateLimitDelay: 100
    })

    expect(results.successRate).toBeGreaterThan(0.95) // 95% success rate
    expect(results.averageResponseTime).toBeLessThan(2000) // 2s average
  })
})
```

### Performance Metrics Collection

The package automatically collects detailed performance metrics:

```typescript
interface PerformanceMetrics {
  responseTime: {
    min: number
    max: number
    avg: number
    p50: number
    p95: number
    p99: number
  }
  throughput: {
    requestsPerSecond: number
    totalRequests: number
    duration: number
  }
  resources: {
    memoryUsage: NodeJS.MemoryUsage
    cpuUsage: NodeJS.CpuUsage
  }
  network: {
    totalBytes: number
    averageBytes: number
    compressionRatio: number
  }
  errors: {
    total: number
    rate: number
    byType: Record<string, number>
  }
}
```

## Load Testing

Advanced load testing capabilities supporting up to 10K concurrent users with multiple testing scenarios.

### Load Test Scenarios

#### 1. Baseline Load Test

```bash
# Run baseline load test (10 concurrent users, 5 minutes)
npm run test:load:baseline
```

#### 2. Medium Load Test

```bash
# Run medium load test (100 concurrent users, 10 minutes)
npm run test:load:medium
```

#### 3. High Load Test

```bash
# Run high load test (1000 concurrent users, 15 minutes)
npm run test:load:high
```

#### 4. Stress Test

```bash
# Run stress test (5000 concurrent users, 20 minutes)
npm run test:load:stress

# Run 10K user stress test
npm run test:load:10k
```

#### 5. Breakpoint Test

```bash
# Find system breaking point
npm run test:load:breakpoint
```

### Load Test Configuration

```typescript
interface LoadTestConfig {
  scenarios: {
    baseline: {
      users: 10
      duration: 300000 // 5 minutes
      rampUp: 30000   // 30 seconds
    }
    medium: {
      users: 100
      duration: 600000 // 10 minutes
      rampUp: 60000   // 1 minute
    }
    high: {
      users: 1000
      duration: 900000 // 15 minutes
      rampUp: 120000  // 2 minutes
    }
    stress: {
      users: 5000
      duration: 1200000 // 20 minutes
      rampUp: 300000   // 5 minutes
    }
  }
  thresholds: {
    responseTime: { p95: 5000 }
    errorRate: 0.05 // 5% max error rate
    resourceUsage: {
      memory: '8GB'
      cpu: '80%'
    }
  }
}
```

### Custom Load Test

```typescript
import { LoadTestOrchestrator } from '@cvplus/e2e-flows'

const loadTest = new LoadTestOrchestrator({
  scenario: 'custom-cv-processing',
  users: 2000,
  duration: 600000, // 10 minutes
  rampUpTime: 120000, // 2 minutes
  userJourney: [
    { action: 'upload-cv', weight: 40 },
    { action: 'check-status', weight: 30 },
    { action: 'download-results', weight: 20 },
    { action: 'create-profile', weight: 10 }
  ]
})

const results = await loadTest.execute()
console.log('Load Test Results:', results.summary)
```

### Load Test Results Analysis

```typescript
interface LoadTestResults {
  scenario: string
  duration: number
  totalUsers: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  throughput: number
  errorRate: number
  percentiles: {
    p50: number
    p95: number
    p99: number
  }
  resourceUsage: {
    maxMemory: string
    avgCpuUsage: number
  }
  breakdown: {
    byAction: Record<string, ActionMetrics>
    byTimeInterval: TimeIntervalMetrics[]
  }
}
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `E2E_BASE_URL` | Application base URL | `http://localhost:3000` | No |
| `E2E_API_URL` | API base URL | `http://localhost:5001` | No |
| `E2E_TIMEOUT` | Global test timeout (ms) | `300000` | No |
| `E2E_PARALLEL_TESTS` | Parallel test execution | `4` | No |
| `E2E_MOCK_APIS` | Use mock APIs | `true` | No |
| `FIREBASE_PROJECT_ID` | Firebase project ID | - | Yes |
| `FIREBASE_AUTH_EMULATOR_HOST` | Auth emulator host | `localhost:9099` | No |
| `FIRESTORE_EMULATOR_HOST` | Firestore emulator host | `localhost:8080` | No |
| `LOAD_TEST_CONCURRENT_USERS` | Load test users | `10` | No |
| `PERFORMANCE_THRESHOLD_P95` | P95 response time threshold | `3000` | No |
| `LOG_LEVEL` | Logging level | `info` | No |

### Configuration File

Create a `e2e.config.json` file in your project root:

```json
{
  "baseURL": "https://staging-api.cvplus.com",
  "timeout": 300000,
  "parallelTests": 8,
  "retryConfig": {
    "maxRetries": 3,
    "retryDelay": 5000,
    "exponentialBackoff": true
  },
  "mockData": {
    "cacheDir": "./.cache/mock-data",
    "maxCacheSize": 104857600,
    "schemaValidation": true
  },
  "performance": {
    "thresholds": {
      "responseTime": { "p95": 2000, "p99": 5000 },
      "errorRate": 0.01,
      "throughput": 100
    }
  },
  "loadTesting": {
    "scenarios": {
      "baseline": { "users": 50, "duration": 300000 },
      "stress": { "users": 2000, "duration": 900000 }
    }
  }
}
```

## CLI Commands

The package provides comprehensive CLI commands for various testing operations.

### Test Execution Commands

```bash
# List all available scenarios
npm run e2e:list

# Run specific scenario
npm run e2e:run -- --scenario="complete-journey" --environment="staging"

# Run with custom timeout
npm run e2e:run -- --scenario="load-test" --timeout=1800000

# Run in parallel mode
npm run e2e:run -- --parallel=8 --scenarios="api-contracts,submodule-integration"
```

### Mock Data Commands

```bash
# Generate mock data
npm run mock-data:generate -- --type="user" --count=1000

# Generate with specific options
npm run mock-data:generate -- --type="bulk" --users=500 --cvJobs=2000

# Clean mock data cache
npm run mock-data:clean

# Clear all cached data
npm run mock-data:clear-cache
```

### API Testing Commands

```bash
# Test specific endpoint
npm run api-test:endpoint -- --url="/api/cv/upload" --method="POST" --file="test.pdf"

# Run API test suite
npm run api-test:suite -- --suite="cv-processing" --environment="production"

# Validate API contracts
npm run api-test:suite -- --contracts-only
```

### Performance Testing Commands

```bash
# Run performance test suite
npm run test:performance

# Run with custom parameters
npm run test:performance -- --users=200 --duration=600000

# Generate performance report
npm run test:report -- --format="html" --output="./reports"
```

### Load Testing Commands

```bash
# Run predefined load test scenarios
npm run test:load:baseline    # 10 users, 5 min
npm run test:load:medium      # 100 users, 10 min
npm run test:load:high        # 1000 users, 15 min
npm run test:load:stress      # 5000 users, 20 min

# Custom load test
npm run test:load -- --users=2000 --duration=900000 --rampup=120000

# Load test with specific scenario
npm run test:load -- --scenario="cv-processing-flow" --users=1000
```

## Examples

### Example 1: Complete CV Processing Flow

```typescript
import {
  E2EFlowsService,
  MockDataService,
  TestScenario
} from '@cvplus/e2e-flows'

async function testCVProcessingFlow() {
  const e2eService = new E2EFlowsService()
  const mockService = new MockDataService()

  // Generate test user with CV
  const userData = await mockService.generateUser({
    includeCV: true,
    cvFormat: 'pdf',
    skillsCount: 15,
    experienceYears: 5
  })

  // Define test scenario
  const scenario: TestScenario = {
    id: 'cv-processing-complete',
    name: 'Complete CV Processing Flow',
    type: 'user-journey',
    timeout: 600000, // 10 minutes
    steps: [
      {
        id: 'upload',
        action: 'upload-cv',
        data: { file: userData.cv, options: { generatePodcast: true } },
        timeout: 30000,
        validation: { statusCode: 200 }
      },
      {
        id: 'process',
        action: 'wait-for-processing',
        dependsOn: ['upload'],
        timeout: 300000, // 5 minutes
        validation: {
          statusCode: 200,
          jsonPath: '$.status',
          expected: 'completed'
        }
      },
      {
        id: 'download',
        action: 'download-results',
        dependsOn: ['process'],
        timeout: 30000,
        validation: {
          statusCode: 200,
          responseType: 'application/json'
        }
      }
    ]
  }

  // Execute scenario
  const result = await e2eService.executeScenario(scenario)

  if (result.success) {
    console.log('✅ CV Processing flow completed successfully')
    console.log(`Total time: ${result.totalTime}ms`)
    console.log(`Steps completed: ${result.completedSteps}/${result.totalSteps}`)
  } else {
    console.log('❌ CV Processing flow failed')
    console.log(`Error: ${result.error?.message}`)
  }

  return result
}

testCVProcessingFlow()
```

### Example 2: Submodule Integration Testing

```typescript
import {
  E2EFlowsService,
  SubmoduleFlow,
  TestEnvironment
} from '@cvplus/e2e-flows'

async function testSubmoduleIntegration() {
  const e2eService = new E2EFlowsService()

  // Define submodule test environment
  const testEnv: TestEnvironment = {
    id: 'submodule-integration',
    name: 'Submodule Integration Environment',
    type: 'isolated',
    serviceEndpoints: {
      'core': 'http://localhost:3001',
      'auth': 'http://localhost:3002',
      'cv-processing': 'http://localhost:3003'
    },
    mockConfiguration: {
      enabled: true,
      services: ['external-ai-apis', 'payment-gateway']
    }
  }

  // Define submodule flow
  const submoduleFlow: SubmoduleFlow = {
    id: 'core-auth-integration',
    name: 'Core and Auth Integration',
    targetModules: ['core', 'auth'],
    isolationLevel: 'service',
    mockServices: [
      {
        service: 'external-ai',
        endpoints: ['/analyze', '/generate'],
        responses: { '/analyze': { status: 'completed', confidence: 0.95 } }
      }
    ],
    coverageTargets: {
      'core': { lines: 85, branches: 80 },
      'auth': { lines: 90, branches: 85 }
    },
    dependencies: [
      {
        from: 'auth',
        to: 'core',
        type: 'service-call',
        endpoints: ['/user/validate']
      }
    ]
  }

  // Execute submodule integration test
  const result = await e2eService.executeSubmoduleFlow(submoduleFlow, testEnv)

  console.log('Submodule Integration Results:')
  console.log(`✅ Modules tested: ${result.modulesCount}`)
  console.log(`✅ Dependencies validated: ${result.dependenciesValidated}`)
  console.log(`✅ Coverage achieved: ${result.coverageResults}`)

  return result
}

testSubmoduleIntegration()
```

### Example 3: API Contract Validation

```typescript
import {
  APITestingService,
  APITestCase
} from '@cvplus/e2e-flows'

async function validateAPIContracts() {
  const apiService = new APITestingService({
    baseURL: 'https://api.cvplus.com',
    timeout: 30000
  })

  // Define API test cases
  const apiTests: APITestCase[] = [
    {
      id: 'cv-upload-api',
      name: 'CV Upload Endpoint',
      endpoint: '/api/cv/upload',
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token' },
      body: {
        file: '@test-data/sample-cv.pdf',
        options: { generatePodcast: true }
      },
      assertions: [
        { type: 'status', operator: 'equals', expected: 200 },
        { type: 'jsonPath', path: '$.jobId', operator: 'exists' },
        { type: 'responseTime', operator: 'lessThan', expected: 10000 }
      ]
    },
    {
      id: 'job-status-api',
      name: 'Job Status Endpoint',
      endpoint: '/api/cv/status/{jobId}',
      method: 'GET',
      pathParams: { jobId: '${previous.jobId}' },
      assertions: [
        { type: 'status', operator: 'equals', expected: 200 },
        { type: 'jsonPath', path: '$.status', operator: 'in', expected: ['processing', 'completed', 'failed'] }
      ]
    }
  ]

  // Execute API test suite
  const results = await apiService.executeTestSuite(apiTests, {
    parallel: false, // Sequential execution for dependent tests
    continueOnFailure: false
  })

  console.log('API Contract Validation Results:')
  console.log(`✅ Tests passed: ${results.passed}/${results.total}`)
  console.log(`⏱️  Average response time: ${results.averageResponseTime}ms`)

  if (results.failed.length > 0) {
    console.log('❌ Failed tests:')
    results.failed.forEach(failure => {
      console.log(`  - ${failure.testId}: ${failure.error}`)
    })
  }

  return results
}

validateAPIContracts()
```

### Example 4: Performance Testing

```typescript
import {
  E2EFlowsService,
  PerformanceCollector
} from '@cvplus/e2e-flows'

async function runPerformanceTest() {
  const e2eService = new E2EFlowsService()
  const perfCollector = new PerformanceCollector()

  // Configure performance test
  const perfConfig = {
    scenario: 'cv-processing-performance',
    concurrentUsers: 100,
    duration: 600000, // 10 minutes
    rampUpTime: 60000, // 1 minute
    thresholds: {
      responseTime: { p95: 3000 },
      errorRate: 0.02,
      throughput: 50
    }
  }

  // Start performance monitoring
  await perfCollector.startCollection()

  try {
    // Execute performance test
    const results = await e2eService.executePerformanceTest(perfConfig)

    // Stop monitoring and collect metrics
    const metrics = await perfCollector.stopCollection()

    console.log('Performance Test Results:')
    console.log(`🚀 Throughput: ${results.throughput} req/s`)
    console.log(`⏱️  P95 Response Time: ${results.percentiles.p95}ms`)
    console.log(`❌ Error Rate: ${(results.errorRate * 100).toFixed(2)}%`)
    console.log(`💾 Peak Memory: ${metrics.resources.memoryUsage.heapUsed / 1024 / 1024}MB`)

    // Check thresholds
    const thresholdsPassed = results.throughput >= perfConfig.thresholds.throughput &&
                           results.percentiles.p95 <= perfConfig.thresholds.responseTime.p95 &&
                           results.errorRate <= perfConfig.thresholds.errorRate

    if (thresholdsPassed) {
      console.log('✅ All performance thresholds met')
    } else {
      console.log('❌ Performance thresholds not met')
    }

    return { results, metrics, thresholdsPassed }
  } catch (error) {
    await perfCollector.stopCollection()
    throw error
  }
}

runPerformanceTest()
```

### Example 5: Load Testing

```typescript
import { LoadTestOrchestrator } from '@cvplus/e2e-flows'

async function runLoadTest() {
  const loadTest = new LoadTestOrchestrator({
    name: 'CVPlus High Load Test',
    scenario: 'complete-user-journey',
    users: 1000,
    duration: 900000, // 15 minutes
    rampUpTime: 180000, // 3 minutes
    rampDownTime: 60000, // 1 minute
    userJourney: [
      {
        action: 'register-user',
        weight: 5,
        data: { generateUser: true }
      },
      {
        action: 'upload-cv',
        weight: 20,
        data: { format: 'pdf', size: 'medium' }
      },
      {
        action: 'check-processing-status',
        weight: 30,
        interval: 10000 // Check every 10 seconds
      },
      {
        action: 'view-results',
        weight: 25
      },
      {
        action: 'download-multimedia',
        weight: 15
      },
      {
        action: 'create-public-profile',
        weight: 5
      }
    ],
    thresholds: {
      responseTime: { p95: 5000, p99: 8000 },
      errorRate: 0.03, // 3% max
      throughput: 80 // min requests per second
    }
  })

  // Execute load test
  const results = await loadTest.execute()

  console.log('Load Test Summary:')
  console.log(`👥 Total Users: ${results.totalUsers}`)
  console.log(`📊 Total Requests: ${results.totalRequests}`)
  console.log(`✅ Success Rate: ${((1 - results.errorRate) * 100).toFixed(1)}%`)
  console.log(`🚀 Peak Throughput: ${results.peakThroughput} req/s`)
  console.log(`⏱️  Response Times: P95=${results.percentiles.p95}ms, P99=${results.percentiles.p99}ms`)

  // Breakdown by action
  console.log('\nAction Breakdown:')
  Object.entries(results.actionBreakdown).forEach(([action, metrics]) => {
    console.log(`  ${action}: ${metrics.count} requests, ${metrics.avgResponseTime}ms avg`)
  })

  return results
}

runLoadTest()
```

## Troubleshooting

### Common Issues

#### 1. Test Timeouts

**Problem:** Tests are timing out frequently

**Solutions:**
1. Increase timeout values in your test configuration:
```typescript
const scenario: TestScenario = {
  timeout: 600000, // 10 minutes
  steps: [
    { action: 'upload-cv', timeout: 60000 } // 1 minute per step
  ]
}
```

2. Check system resources and reduce concurrent tests:
```bash
E2E_PARALLEL_TESTS=2 npm run test
```

3. Enable verbose logging to identify bottlenecks:
```bash
LOG_LEVEL=debug VERBOSE_LOGS=true npm run test
```

#### 2. Firebase Emulator Connection Issues

**Problem:** Cannot connect to Firebase emulators

**Solutions:**
1. Start emulators before running tests:
```bash
npm run firebase:emulators
```

2. Verify emulator configuration in `.env`:
```bash
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIRESTORE_EMULATOR_HOST=localhost:8080
```

3. Check port availability:
```bash
lsof -i :9099 -i :8080 -i :9199
```

#### 3. Mock Data Generation Failures

**Problem:** Mock data generation is failing or producing invalid data

**Solutions:**
1. Clear mock data cache:
```bash
npm run mock-data:clear-cache
```

2. Validate schema configuration:
```typescript
const mockService = new MockDataService({
  schemaValidation: true,
  cacheDir: './.cache/mock-data'
})
```

3. Check available disk space for cache:
```bash
df -h ./.cache
```

#### 4. API Testing Authentication Issues

**Problem:** API tests failing with 401 Unauthorized

**Solutions:**
1. Set correct API keys in environment:
```bash
export TEST_API_KEY=your-test-api-key
```

2. Use proper authentication in test cases:
```typescript
const testCase: APITestCase = {
  headers: {
    'Authorization': `Bearer ${process.env.TEST_API_KEY}`
  }
}
```

3. Enable mock APIs for testing:
```bash
E2E_MOCK_APIS=true npm run test
```

#### 5. Performance Test Memory Issues

**Problem:** Performance tests causing out-of-memory errors

**Solutions:**
1. Reduce concurrent users:
```bash
LOAD_TEST_CONCURRENT_USERS=50 npm run test:load
```

2. Increase Node.js memory limit:
```bash
node --max-old-space-size=8192 node_modules/.bin/jest
```

3. Enable garbage collection monitoring:
```bash
node --expose-gc --trace-gc npm run test:performance
```

#### 6. Load Test Network Issues

**Problem:** Load tests failing due to network limitations

**Solutions:**
1. Adjust rate limiting:
```bash
E2E_API_DELAY=2000 npm run test:load # 2 second delay between requests
```

2. Use connection pooling:
```typescript
const apiService = new APITestingService({
  keepAlive: true,
  maxConnections: 10
})
```

3. Monitor network usage:
```bash
netstat -i # Check network interface statistics
```

### Debug Mode

Enable comprehensive debugging for troubleshooting:

```bash
# Enable all debug logs
DEBUG=e2e:* npm run test

# Enable specific component debugging
DEBUG=e2e:api,e2e:mock-data npm run test

# Save debug logs to file
DEBUG=e2e:* npm run test 2>&1 | tee debug.log
```

### Health Check

Run the built-in health check to verify system status:

```bash
npm run health-check
```

The health check verifies:
- Firebase emulator connectivity
- API endpoint availability
- Mock data service functionality
- Cache directory permissions
- Required dependencies

### Performance Monitoring

Monitor system resources during testing:

```bash
# Monitor memory usage
watch -n 1 'ps aux | grep node | head -10'

# Monitor disk I/O
iostat -x 1

# Monitor network connections
watch -n 1 'netstat -an | grep ESTABLISHED | wc -l'
```

### Test Artifacts

Failed tests automatically generate artifacts for debugging:

```
test-results/
├── screenshots/     # UI test screenshots
├── logs/           # Detailed test logs
├── reports/        # Test result reports
├── metrics/        # Performance metrics
└── dumps/          # Memory dumps (if enabled)
```

Access artifacts:
```bash
# View recent test logs
tail -f logs/e2e-test.log

# Open HTML test report
open test-results/reports/index.html

# Analyze performance metrics
cat test-results/metrics/performance-summary.json
```

### Getting Help

- 📖 [Full Documentation](https://github.com/gilco1973/cvplus-e2e-flows/wiki)
- 🐛 [GitHub Issues](https://github.com/gilco1973/cvplus-e2e-flows/issues)
- 💬 [CVPlus Discord](https://discord.gg/cvplus)
- 📧 [Support Email](mailto:support@cvplus.com)

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### Development Setup

1. Fork the repository
2. Clone your fork:
```bash
git clone https://github.com/your-username/cvplus-e2e-flows.git
cd cvplus-e2e-flows
```

3. Install dependencies:
```bash
npm install
```

4. Set up development environment:
```bash
cp .env.example .env
npm run firebase:emulators
```

5. Run tests to verify setup:
```bash
npm run test:unit
npm run test:integration
```

### Development Workflow

1. Create a feature branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and add tests
3. Run the full test suite:
```bash
npm run test:ci
npm run lint
npm run format:check
```

4. Commit your changes:
```bash
git commit -m "feat: add new feature"
```

5. Push and create a pull request

### Code Style

- **TypeScript**: Full type safety with strict mode enabled
- **Formatting**: Prettier with project configuration
- **Linting**: ESLint with TypeScript rules
- **Testing**: Jest with 90%+ coverage requirement
- **Documentation**: JSDoc comments for all public APIs

### Running the Full Test Suite

```bash
# Run all tests with coverage
npm run test:ci

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:performance
npm run test:load

# Code quality checks
npm run lint:fix
npm run format
npm run type-check
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes and version history.

## Acknowledgments

- Built with ❤️ by the CVPlus Development Team
- Powered by [Jest](https://jestjs.io/) testing framework
- Mock data generation by [Faker.js](https://fakerjs.dev/)
- Firebase integration with [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- TypeScript support with strict type checking
- Performance monitoring with custom metrics collection

---

**CVPlus E2E Flows** - Comprehensive testing for the modern AI-powered CV platform.

Made with 🚀 by [CVPlus Team](https://cvplus.com)