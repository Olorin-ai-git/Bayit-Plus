# Quick Start: End-to-End Testing Flows

**Feature**: End-to-End Testing Flows Submodule
**Date**: 2025-09-13
**Estimated Setup Time**: 15 minutes

## Prerequisites

- Node.js 20+ installed
- Firebase CLI configured
- CVPlus development environment set up
- Git submodule access permissions

## Quick Installation

### 1. Install E2E Testing Submodule

```bash
# Navigate to CVPlus root
cd /path/to/cvplus

# Add e2e-flows submodule
git submodule add git@github.com:gilco1973/cvplus-e2e-flows.git packages/e2e-flows
git submodule update --init --recursive

# Install dependencies
cd packages/e2e-flows
npm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Configure test environments
cat > .env.local << EOF
# Test Environment Configuration
E2E_BASE_URL=http://localhost:3000
E2E_API_URL=http://localhost:5001
E2E_TIMEOUT=300000
E2E_PARALLEL_TESTS=4

# Firebase Configuration
FIREBASE_PROJECT_ID=cvplus-dev
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIRESTORE_EMULATOR_HOST=localhost:8080

# External Service Configuration (for real API testing)
OPENAI_API_KEY=your-test-api-key
ANTHROPIC_API_KEY=your-test-api-key
ELEVENLABS_API_KEY=your-test-api-key
EOF
```

### 3. Verify Installation

```bash
# Run health check
npm run health-check

# Expected output:
# ✅ E2E Test Framework: Ready
# ✅ Mock Data Generator: Ready
# ✅ API Test Suite: Ready
# ✅ Firebase Emulators: Available
# ✅ Test Data Directory: Configured
```

## Basic Usage

### Run Complete E2E Test Suite

```bash
# Full end-to-end test with mock AI services
npm run test:e2e

# E2E test with real AI services (requires API keys)
npm run test:e2e:real-apis

# Quick smoke tests (30 seconds)
npm run test:smoke
```

### Generate Mock Data

```bash
# Generate sample CV data
npm run mock-data:generate cv --count 10 --category tech

# Generate user profiles
npm run mock-data:generate user-profile --count 5 --category enterprise

# Clean up test data
npm run mock-data:clean
```

### Test Individual Submodules

```bash
# Test cv-processing submodule in isolation
npm run test:submodule cv-processing

# Test with full service mocking
npm run test:submodule cv-processing --isolation full

# Test specific functionality
npm run test:submodule cv-processing --tag ats-optimization
```

### API Testing with curl

```bash
# Run all API tests
npm run test:api

# Test specific endpoint
npm run test:api --endpoint /cv/upload

# Test with custom environment
npm run test:api --environment staging
```

## Test Scenarios Overview

### 1. Complete User Journey Test

**Duration**: ~15 minutes
**Description**: Full CVPlus workflow from registration to portal sharing

```bash
npm run scenario:complete-journey
```

**Test Steps**:
1. User registration and authentication
2. CV file upload (PDF)
3. AI analysis and ATS optimization
4. Multimedia generation (podcast, video)
5. Public profile creation
6. Portfolio gallery setup
7. Contact form integration
8. Analytics tracking validation

### 2. Submodule Integration Test

**Duration**: ~5 minutes per module
**Description**: Validates individual submodule functionality

```bash
# Test all submodules
npm run scenario:submodule-integration

# Test specific module
npm run scenario:submodule-integration --module cv-processing
```

### 3. API Contract Validation

**Duration**: ~3 minutes
**Description**: Validates all API endpoints against OpenAPI contracts

```bash
npm run scenario:api-contracts
```

### 4. Load Testing Scenario

**Duration**: ~10 minutes
**Description**: Progressive load testing with AI API quota management

```bash
# Baseline load test (10 concurrent users)
npm run scenario:load-test --level baseline

# Standard load test (100 concurrent users)
npm run scenario:load-test --level standard

# Peak load test (1000 concurrent users)
npm run scenario:load-test --level peak
```

### 5. Regression Detection

**Duration**: ~8 minutes
**Description**: Compares current performance against established baselines

```bash
npm run scenario:regression-check
```

## CI/CD Integration

### GitHub Actions Integration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: recursive

      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd packages/e2e-flows
          npm ci

      - name: Run E2E Tests
        run: |
          cd packages/e2e-flows
          npm run test:ci
        env:
          FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          E2E_TIMEOUT: 1200000
```

### Local Development Workflow

```bash
# Start development environment
npm run dev:start

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Generate test report
npm run test:report
```

## Troubleshooting

### Common Issues

**Issue**: Tests timeout frequently
```bash
# Increase timeout in package.json
npm config set test-timeout 600000

# Or run with extended timeout
npm run test:e2e --timeout 600000
```

**Issue**: Mock data generation fails
```bash
# Clear cache and regenerate
npm run mock-data:clear-cache
npm run mock-data:generate --force
```

**Issue**: Firebase emulator connection errors
```bash
# Start emulators manually
firebase emulators:start --only firestore,auth,storage

# Verify emulator status
curl http://localhost:8080
```

**Issue**: External API rate limits
```bash
# Use mock mode for development
npm run test:e2e --mock-apis

# Configure rate limit delays
export E2E_API_DELAY=2000
npm run test:e2e
```

### Debug Mode

```bash
# Run with debug output
DEBUG=e2e:* npm run test:e2e

# Generate detailed logs
npm run test:e2e --verbose --log-level debug

# Save artifacts for inspection
npm run test:e2e --save-artifacts --output-dir ./test-results
```

## Advanced Configuration

### Custom Test Scenarios

Create custom test scenarios in `scenarios/custom/`:

```typescript
// scenarios/custom/my-test.ts
import { TestScenario } from '../types';

export const myCustomTest: TestScenario = {
  name: 'Custom CV Processing Test',
  type: 'e2e',
  environment: 'dev',
  timeout: 300000,
  steps: [
    {
      order: 1,
      name: 'Upload CV',
      action: 'upload_file',
      parameters: { file: 'mock-data/cvs/tech-senior.pdf' },
      expectedResult: { status: 'success' }
    },
    // ... more steps
  ],
  expectedOutcomes: [
    {
      metric: 'response_time',
      condition: 'less_than',
      value: 60000,
      description: 'CV processing under 60 seconds'
    }
  ]
};
```

### Environment-Specific Configuration

```javascript
// config/environments.js
module.exports = {
  development: {
    baseUrl: 'http://localhost:3000',
    timeout: 300000,
    mockServices: ['openai', 'elevenlabs']
  },
  staging: {
    baseUrl: 'https://staging.cvplus.io',
    timeout: 180000,
    mockServices: []
  },
  production: {
    baseUrl: 'https://cvplus.io',
    timeout: 120000,
    mockServices: [],
    readOnly: true
  }
};
```

## Next Steps

1. **Set up continuous testing**: Configure CI/CD pipeline integration
2. **Create custom scenarios**: Add application-specific test cases
3. **Monitor performance**: Set up regression detection and alerting
4. **Scale testing**: Configure load testing for production scenarios

For detailed API documentation, see [contracts/e2e-testing-api.yaml](./contracts/e2e-testing-api.yaml).
For implementation details, see [tasks.md](./tasks.md) (generated by `/tasks` command).