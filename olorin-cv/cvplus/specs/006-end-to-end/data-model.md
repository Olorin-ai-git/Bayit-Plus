# Data Model: End-to-End Testing Flows Submodule

**Feature**: End-to-End Testing Flows Submodule
**Date**: 2025-09-13
**Status**: Phase 1 Design

## Core Entities

### TestScenario
Represents a complete test flow with steps, expected outcomes, and validation criteria.

**Fields**:
- `id`: string (unique identifier)
- `name`: string (descriptive test name)
- `description`: string (test purpose and scope)
- `type`: 'e2e' | 'integration' | 'api' | 'load' | 'regression'
- `environment`: string (dev, staging, prod)
- `steps`: TestStep[] (ordered test execution steps)
- `expectedOutcomes`: TestOutcome[] (validation criteria)
- `tags`: string[] (categorization and filtering)
- `timeout`: number (maximum execution time in milliseconds)
- `dependencies`: string[] (required services and resources)
- `retryConfig`: RetryConfig (failure recovery settings)
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Relationships**:
- Has many TestStep instances
- References MockDataSet for test data
- Produces FlowResult upon execution

**Validation Rules**:
- Name must be unique within environment
- Timeout must be between 1 second and 20 minutes
- At least one expected outcome required
- Steps must be in logical execution order

**State Transitions**:
- CREATED → PENDING → RUNNING → (PASSED | FAILED | TIMEOUT)
- Failed tests can transition to RETRYING → RUNNING

### MockDataSet
Contains realistic test data including CV documents, user profiles, and expected AI responses.

**Fields**:
- `id`: string (unique identifier)
- `name`: string (dataset name)
- `description`: string (dataset purpose and content)
- `type`: 'cv' | 'user-profile' | 'job-description' | 'ai-response' | 'multimedia'
- `category`: string (industry, role, region classification)
- `data`: Record<string, any> (actual test data)
- `schema`: JSONSchema (data structure validation)
- `size`: number (data size in bytes)
- `checksum`: string (data integrity verification)
- `expiresAt`: timestamp (data retention policy)
- `metadata`: MockDataMetadata (generation and usage info)
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Relationships**:
- Used by TestScenario instances
- References TestEnvironment for context-specific data

**Validation Rules**:
- Data must conform to defined schema
- Size must not exceed 100MB limit
- Checksum must match data content
- Expiration date must be set for temporary data

### FlowResult
Captures test execution outcomes including performance metrics, validation results, and error details.

**Fields**:
- `id`: string (unique identifier)
- `scenarioId`: string (reference to executed scenario)
- `runId`: string (test suite execution identifier)
- `status`: 'passed' | 'failed' | 'timeout' | 'error'
- `startTime`: timestamp
- `endTime`: timestamp
- `duration`: number (execution time in milliseconds)
- `steps`: StepResult[] (individual step outcomes)
- `metrics`: PerformanceMetrics (timing and resource usage)
- `errors`: TestError[] (failure details and stack traces)
- `artifacts`: ResultArtifact[] (logs, screenshots, recordings)
- `environment`: string (execution environment)
- `buildInfo`: BuildInfo (code version and deployment info)

**Relationships**:
- Belongs to TestScenario
- Contains multiple StepResult instances
- May reference RegressionBaseline for comparison

**Validation Rules**:
- End time must be after start time
- Duration must match calculated time difference
- Status must reflect actual execution outcome
- All errors must have descriptive messages

### TestEnvironment
Defines configuration and deployment context for test execution.

**Fields**:
- `id`: string (unique identifier)
- `name`: string (environment name)
- `type`: 'local' | 'dev' | 'staging' | 'prod' | 'ci'
- `baseUrl`: string (primary application URL)
- `services`: ServiceEndpoint[] (external service configurations)
- `credentials`: EnvironmentCredentials (authentication settings)
- `features`: FeatureFlag[] (enabled/disabled feature toggles)
- `limits`: ResourceLimits (performance and capacity constraints)
- `mockConfig`: MockConfiguration (service mocking settings)
- `isActive`: boolean (environment availability)
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Relationships**:
- Used by TestScenario for execution context
- References MockDataSet for environment-specific data

**Validation Rules**:
- Base URL must be valid and accessible
- Credentials must be properly encrypted
- Resource limits must be within acceptable ranges
- Mock configuration must be valid when enabled

### APITestCase
Represents individual backend API validation scenarios with curl commands and expected responses.

**Fields**:
- `id`: string (unique identifier)
- `name`: string (test case name)
- `endpoint`: string (API endpoint path)
- `method`: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
- `headers`: Record<string, string> (HTTP headers)
- `body`: any (request payload)
- `expectedStatus`: number (expected HTTP status code)
- `expectedResponse`: any (expected response structure)
- `curlCommand`: string (equivalent curl command)
- `timeout`: number (request timeout in milliseconds)
- `authentication`: AuthConfig (auth requirements)
- `assertions`: ResponseAssertion[] (validation rules)
- `tags`: string[] (categorization)

**Relationships**:
- Grouped by API endpoint or feature
- Uses MockDataSet for request/response data
- Produces APIResult upon execution

**Validation Rules**:
- Endpoint must be valid URL path
- Method must be supported HTTP verb
- Expected status must be valid HTTP code
- Assertions must be testable conditions

### SubmoduleFlow
Isolated test scenarios for individual CVPlus submodules with dependency mocking.

**Fields**:
- `id`: string (unique identifier)
- `moduleName`: string (submodule name)
- `moduleVersion`: string (submodule version)
- `dependencies`: ModuleDependency[] (required external modules)
- `mocks`: MockService[] (mocked service configurations)
- `testScenarios`: TestScenario[] (module-specific test cases)
- `isolationLevel`: 'full' | 'partial' | 'none'
- `setupCommands`: string[] (preparation scripts)
- `teardownCommands`: string[] (cleanup scripts)
- `coverage`: CoverageTarget (test coverage requirements)

**Relationships**:
- Contains multiple TestScenario instances
- References specific submodule codebase
- Uses MockDataSet for isolated testing

**Validation Rules**:
- Module name must match existing submodule
- Version must be valid semantic version
- Isolation level must be properly configured
- Coverage targets must be achievable

### RegressionBaseline
Historical test results used for comparative analysis and change detection.

**Fields**:
- `id`: string (unique identifier)
- `scenarioId`: string (reference to test scenario)
- `version`: string (application version at baseline)
- `metrics`: BaselineMetrics (performance benchmarks)
- `results`: BaselineResults (expected outcomes)
- `environment`: string (baseline execution environment)
- `createdAt`: timestamp (baseline establishment date)
- `isActive`: boolean (current baseline status)
- `tolerance`: ToleranceConfig (acceptable variance ranges)
- `comparisonRules`: ComparisonRule[] (change detection logic)

**Relationships**:
- References TestScenario for baseline context
- Used by FlowResult for regression detection

**Validation Rules**:
- Version must be valid semantic version
- Tolerance ranges must be positive values
- Comparison rules must be logically consistent
- Only one active baseline per scenario

## Supporting Types

### TestStep
Individual action within a test scenario.

**Fields**:
- `order`: number (execution sequence)
- `name`: string (step description)
- `action`: string (operation to perform)
- `parameters`: Record<string, any> (action parameters)
- `expectedResult`: any (expected step outcome)
- `timeout`: number (step timeout in milliseconds)

### PerformanceMetrics
Performance and resource usage measurements.

**Fields**:
- `responseTime`: number (milliseconds)
- `throughput`: number (requests per second)
- `errorRate`: number (percentage)
- `memoryUsage`: number (bytes)
- `cpuUsage`: number (percentage)
- `networkIO`: NetworkMetrics (bytes sent/received)

### ServiceEndpoint
External service configuration.

**Fields**:
- `name`: string (service identifier)
- `url`: string (service base URL)
- `version`: string (API version)
- `authentication`: AuthConfig (auth settings)
- `timeout`: number (request timeout)
- `rateLimit`: RateLimitConfig (throttling settings)

## Data Relationships Diagram

```
TestScenario (1) ──────── (*) TestStep
     │
     │ (1)
     │
     │ (*)
MockDataSet ──── (1) TestEnvironment
     │
     │ (*)
     │
     │ (1)
FlowResult ──── (1) RegressionBaseline
     │
     │ (*)
     │
SubmoduleFlow ──── (*) APITestCase
```

## Data Storage Strategy

- **Primary Storage**: JSON files for mock data and test configurations
- **Results Storage**: SQLite database for test execution history
- **Artifacts Storage**: File system for logs, screenshots, and recordings
- **Cache Storage**: Redis for temporary test state and session data
- **Archive Storage**: Compressed archives for long-term result retention