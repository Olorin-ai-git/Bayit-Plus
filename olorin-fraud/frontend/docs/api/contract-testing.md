# Contract Testing Guide

**Status**: Active
**Author**: API Team
**Date**: 2025-11-01
**Target Audience**: Frontend developers, QA engineers, Backend developers

---

## Executive Summary

Contract testing ensures that frontend and backend teams can develop independently while maintaining API compatibility. This guide explains our contract testing approach, tools, and workflows.

**Benefits**:
- **Early Detection**: Catch API incompatibilities before production
- **Fast Feedback**: Run tests in seconds, not hours
- **Independent Development**: Frontend and backend teams work in parallel
- **Prevent Regressions**: Automated tests prevent breaking changes

**Quick Start**:
```bash
# Run all contract tests
npm run contract:test

# Run backward compatibility tests
npm run test:backward-compatibility

# Detect breaking changes
npm run api:detect-breaking-changes old-schema.json new-schema.json
```

---

## What is Contract Testing?

Contract testing verifies that the API provider (backend) and consumer (frontend) agree on:
- **Request format**: Field names, types, required vs optional
- **Response format**: Field names, types, null handling
- **HTTP status codes**: Success (2xx), client errors (4xx), server errors (5xx)
- **Content types**: JSON, form data, multipart
- **Error responses**: Consistent error structure

Unlike integration tests, contract tests don't test business logic. They only verify the "contract" (API schema).

---

## Our Contract Testing Stack

### 1. Dredd (API Contract Testing)

**Purpose**: Validate backend implements OpenAPI schema correctly.

**How It Works**:
1. Read OpenAPI schema (`openapi.json`)
2. Generate test cases from schema
3. Make real HTTP requests to backend
4. Verify responses match schema

**Example**:
```yaml
# dredd.yml
endpoint: http://localhost:8090
blueprint: ./src/api/generated/openapi.json
reporter:
  - html
  - markdown
output:
  - ./test/contract/reports/dredd-report.html
hookfiles: ./test/contract/hooks.ts
```

---

### 2. AJV (JSON Schema Validation)

**Purpose**: Validate request/response data against OpenAPI schemas.

**How It Works**:
1. Load OpenAPI schema
2. Extract component schemas (InvestigationRequest, InvestigationResponse, etc.)
3. Validate data structures against schemas
4. Report validation errors

**Example**:
```typescript
import { validateInvestigationRequest } from './validators/schema-validator';

const data = {
  entity_id: 'user@example.com',
  entity_type: 'email'
};

const result = validateInvestigationRequest(data);
if (!result.valid) {
  console.error(result.errors);
}
```

---

### 3. Jest (Backward Compatibility Testing)

**Purpose**: Ensure new API versions remain backward compatible.

**How It Works**:
1. Test that optional fields can be omitted
2. Test that old enum values still work
3. Test that field types haven't changed
4. Test that HTTP status codes are consistent

**Example**:
```typescript
test('should accept request without optional fields', async () => {
  const minimalRequest = {
    entity_id: 'test@example.com',
    entity_type: 'email'
    // time_range omitted (optional)
  };

  const response = await axios.post(
    `${BACKEND_URL}/api/v1/investigations/`,
    minimalRequest
  );

  expect(response.status).toBe(201);
});
```

---

## Contract Testing Workflow

### Step 1: Backend Updates Pydantic Models
```python
# olorin-server/app/models/investigation_api.py
from pydantic import BaseModel, Field

class InvestigationRequest(BaseModel):
    entity_id: str = Field(..., description="Entity identifier")
    entity_type: str = Field(..., description="Entity type")
    time_range: Optional[TimeRange] = None  # New optional field
```

---

### Step 2: Backend Regenerates OpenAPI Schema
```bash
cd olorin-server
poetry run python -m app.local_server &
curl http://localhost:8090/openapi.json > openapi-new.json
```

---

### Step 3: Frontend Detects Breaking Changes
```bash
cd olorin-front
npm run api:detect-breaking-changes \
  src/api/generated/openapi.json \
  ../olorin-server/openapi-new.json
```

**Output** (if breaking):
```
❌ 2 breaking change(s) detected:

🔴 FIELD_REMOVED
   Path: InvestigationRequest.legacy_field
   Field removed: InvestigationRequest.legacy_field (was required)
   Migration: Remove references to legacy_field in client code.

🔴 TYPE_CHANGED
   Path: InvestigationResponse.risk_score
   Type changed: from number to string
   Migration: Update client code to handle string instead of number.
```

---

### Step 4: Frontend Regenerates Types
```bash
npm run generate-api-types
```

**Result**: TypeScript types updated to match new schema.

---

### Step 5: Run Contract Tests
```bash
npm run contract:test
```

**Example Output**:
```
✔ POST /api/v1/investigations/ → 201 Created
✔ GET /api/v1/investigations/{id} → 200 OK
✔ GET /api/v1/investigations/{id} → 404 Not Found

Summary:
  Pass: 3
  Fail: 0
  Total: 3

Contract tests PASSED ✅
```

---

### Step 6: Run Backward Compatibility Tests
```bash
npm run test:backward-compatibility
```

**Example Output**:
```
PASS test/contract/backward-compatibility.test.ts
  ✓ should accept request without optional fields (142 ms)
  ✓ should return all required fields in response (89 ms)
  ✓ should maintain consistent field types (75 ms)
  ✓ should accept all valid entity types (234 ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

---

## Running Contract Tests Locally

### Prerequisites
```bash
# 1. Start backend server
cd olorin-server
poetry run python -m app.local_server

# 2. Verify backend health
curl http://localhost:8090/health
```

### Run Contract Tests
```bash
cd olorin-front

# Generate types (if not already done)
npm run generate-api-types

# Run Dredd contract tests
npm run contract:test

# Run backward compatibility tests
npm run test:backward-compatibility

# Open HTML report
npm run contract:report
```

---

## CI/CD Integration

### GitHub Actions
Our CI pipeline runs contract tests automatically on every pull request:

```yaml
# .github/workflows/contract-tests.yml
jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Start backend
      - name: Run contract tests
      - name: Run backward compatibility tests
      - name: Upload reports
```

**Triggered On**:
- Pull requests to `main` or `develop`
- Push to `main` or `develop`

---

### GitLab CI
```yaml
# .gitlab-ci.yml
contract-tests:
  stage: contract-tests
  script:
    - npm run contract:test
    - npm run test:backward-compatibility
  artifacts:
    paths:
      - olorin-front/test/contract/reports/
```

---

## Writing Contract Test Hooks

Hooks allow you to customize test behavior:

### Before All Tests
```typescript
import * as hooks from 'dredd-hooks';

hooks.beforeAll((transactions, done) => {
  // Verify backend is healthy
  fetch(`${BACKEND_URL}/health`)
    .then(response => {
      if (!response.ok) throw new Error('Backend not ready');
      done();
    })
    .catch(error => done(error));
});
```

### Before Specific Test
```typescript
hooks.before('Investigations > Create new investigation', (transaction, done) => {
  // Customize request body
  transaction.request.body = JSON.stringify({
    entity_id: 'test@example.com',
    entity_type: 'email'
  });
  done();
});
```

### After Specific Test
```typescript
hooks.after('Investigations > Create new investigation', (transaction, done) => {
  // Extract investigation ID from response
  const response = JSON.parse(transaction.real.body);
  investigationIds.push(response.investigation_id);
  done();
});
```

### After All Tests (Cleanup)
```typescript
hooks.afterAll((transactions, done) => {
  // Clean up created investigations
  Promise.all(
    investigationIds.map(id =>
      fetch(`${BACKEND_URL}/api/v1/investigations/${id}`, {
        method: 'DELETE'
      })
    )
  ).then(() => done());
});
```

---

## Writing Backward Compatibility Tests

### Test Pattern
```typescript
import { describe, test, expect, beforeAll } from '@jest/globals';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8090';

describe('Backward Compatibility - Investigations API', () => {
  beforeAll(async () => {
    // Verify backend is available
    const response = await axios.get(`${BACKEND_URL}/health`);
    expect(response.status).toBe(200);
  });

  test('should accept request without optional fields', async () => {
    const minimalRequest = {
      entity_id: 'test@example.com',
      entity_type: 'email'
      // time_range omitted (optional field)
    };

    const response = await axios.post(
      `${BACKEND_URL}/api/v1/investigations/`,
      minimalRequest
    );

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('investigation_id');
  });

  test('should maintain consistent field types', async () => {
    const response = await axios.post(
      `${BACKEND_URL}/api/v1/investigations/`,
      { entity_id: 'test@example.com', entity_type: 'email' }
    );

    // Verify types haven't changed
    expect(typeof response.data.investigation_id).toBe('string');
    expect(typeof response.data.status).toBe('string');
    expect(
      response.data.risk_score === null ||
      typeof response.data.risk_score === 'number'
    ).toBe(true);
  });

  test('should accept all valid entity types', async () => {
    const validTypes = ['email', 'phone', 'device_id', 'ip_address', 'user_id'];

    for (const entityType of validTypes) {
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/investigations/`,
        {
          entity_id: `test-${entityType}@example.com`,
          entity_type: entityType
        }
      );

      expect(response.status).toBe(201);
    }
  });
});
```

---

## Common Issues and Solutions

### Issue 1: Backend Not Available
**Symptoms**:
```
Error: connect ECONNREFUSED 127.0.0.1:8090
```

**Solution**:
```bash
# Start backend server
cd olorin-server
poetry run python -m app.local_server

# Verify health endpoint
curl http://localhost:8090/health
```

---

### Issue 2: Schema Mismatch
**Symptoms**:
```
Error: Response body does not match schema
  Expected property 'risk_score' to be number, got string
```

**Solution**:
1. Check if backend schema changed
2. Regenerate frontend types: `npm run generate-api-types`
3. Update test expectations if schema legitimately changed

---

### Issue 3: Test Timeout
**Symptoms**:
```
Error: Timeout of 30000ms exceeded
```

**Solution**:
```yaml
# dredd.yml
timeout: 60000  # Increase timeout to 60 seconds
```

---

### Issue 4: Hook Errors
**Symptoms**:
```
Error: beforeAll hook failed
```

**Solution**:
1. Check backend is running: `curl http://localhost:8090/health`
2. Verify environment variables are set correctly
3. Check hook logic for errors

---

## Best Practices

### 1. Test Real Endpoints, Not Mocks
❌ **Don't**:
```typescript
// Using mocked backend (anti-pattern)
const mockedBackend = createMockServer();
```

✅ **Do**:
```typescript
// Using real backend
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8090';
const response = await axios.get(`${BACKEND_URL}/api/v1/investigations/`);
```

---

### 2. Use Environment Variables
❌ **Don't**:
```typescript
const BACKEND_URL = 'http://localhost:8090';  // Hardcoded
```

✅ **Do**:
```typescript
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8090';
```

---

### 3. Clean Up After Tests
❌ **Don't**:
```typescript
// Leaving test data in database
```

✅ **Do**:
```typescript
hooks.afterAll((transactions, done) => {
  // Delete all created investigations
  Promise.all(
    investigationIds.map(id =>
      axios.delete(`${BACKEND_URL}/api/v1/investigations/${id}`)
    )
  ).then(() => done());
});
```

---

### 4. Test Error Cases
❌ **Don't**:
```typescript
// Only testing success cases
```

✅ **Do**:
```typescript
test('should return 400 for invalid request', async () => {
  const invalidRequest = {
    entity_id: '',  // Invalid: empty string
    entity_type: 'email'
  };

  try {
    await axios.post(`${BACKEND_URL}/api/v1/investigations/`, invalidRequest);
    fail('Should have thrown 400 error');
  } catch (error: any) {
    expect(error.response?.status).toBe(400);
    expect(error.response?.data).toHaveProperty('error');
  }
});
```

---

## Troubleshooting

### Debugging Dredd Tests
```bash
# Run Dredd with verbose output
dredd dredd.yml --loglevel=debug

# Run single test
dredd dredd.yml --names="POST /api/v1/investigations/ > 201"

# Dry run (validate without executing)
npm run contract:validate
```

### Debugging Backward Compatibility Tests
```bash
# Run single test file
npm test test/contract/backward-compatibility.test.ts

# Run single test case
npm test -- --testNamePattern="should accept request without optional fields"

# Watch mode
npm run test:backward-compatibility:watch
```

---

## Resources

- **Dredd Documentation**: https://dredd.org/en/latest/
- **AJV Documentation**: https://ajv.js.org/
- **OpenAPI 3.1 Specification**: https://spec.openapis.org/oas/v3.1.0
- **Contract Testing Best Practices**: https://martinfowler.com/articles/practical-test-pyramid.html#ContractTests
- **API Versioning Strategy**: `/docs/api/versioning-strategy.md`
- **Schema Evolution Guidelines**: `/docs/api/schema-evolution-guidelines.md`
- **Migration Guide Template**: `/docs/api/migration-guide-template.md`
- **Deprecation Strategy**: `/docs/api/deprecation-strategy.md`

---

## Summary

Contract testing provides fast feedback on API compatibility without requiring full end-to-end tests. Our approach:

1. **Schema-First Development**: Pydantic models → OpenAPI schema → TypeScript types
2. **Automated Testing**: Dredd + AJV + Jest for comprehensive validation
3. **CI Integration**: Every pull request runs contract tests
4. **Breaking Change Detection**: Prevent accidental breaking changes
5. **Backward Compatibility**: Ensure smooth API evolution

By following this guide, frontend and backend teams can develop independently while maintaining API compatibility.

---

**Last Updated**: 2025-11-01
**Document Version**: 1.0.0
**Maintained By**: API Team
