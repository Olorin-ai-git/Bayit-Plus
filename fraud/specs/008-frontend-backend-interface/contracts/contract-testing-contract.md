# Contract: Contract Testing

**Branch**: `001-frontend-backend-interface` | **Date**: 2025-11-01 | **Spec**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md)

## Contract Overview

This contract defines the rules and guarantees for automated contract testing between frontend and backend. Contract tests validate that both sides honor the OpenAPI schema contract.

**Contract Purpose**: Ensure frontend and backend remain compatible across all environments and versions through automated testing.

**Parties**:
- **Provider**: Backend API (tested with schemathesis)
- **Consumer**: Frontend application (tested with dredd or jest-openapi)
- **Validator**: OpenAPI schema (single source of truth)

## Contract Testing Strategy

### Two-Sided Testing Approach

**Backend Contract Tests** (Property-Based):
- Tool: `schemathesis`
- Purpose: Verify backend responses match OpenAPI schema
- Strategy: Generate thousands of test cases from schema

**Frontend Contract Tests** (Example-Based):
- Tool: `dredd` or `jest-openapi`
- Purpose: Verify frontend requests match OpenAPI schema
- Strategy: Test specific user scenarios against schema

**Contract Guarantee**: Both sides validated independently against same schema.

## Backend Contract Testing

### 1. Schemathesis Integration

**Rule**: Backend MUST use schemathesis for property-based contract testing.

**Test Setup**:
```python
# olorin-server/test/contract/test_investigations_contract.py
import schemathesis
from app.main import app

# Load schema from FastAPI app
schema = schemathesis.from_asgi("/openapi.json", app)

@schema.parametrize()
def test_api_contract(case):
    """
    Property-based test: Generate random valid requests and verify responses.
    Schemathesis generates thousands of test cases from the OpenAPI schema.
    """
    # Make request to API
    response = case.call_asgi()

    # Validate response matches schema
    case.validate_response(response)
```

**Contract Guarantee**: All endpoints tested with 100+ generated test cases each.

### 2. Endpoint Coverage

**Rule**: Contract tests MUST cover 95%+ of API endpoints.

**Coverage Measurement**:
```python
# test/contract/test_coverage.py
import pytest
import schemathesis

schema = schemathesis.from_asgi("/openapi.json", app)

def test_contract_coverage():
    """Verify contract tests cover all endpoints"""
    all_endpoints = set(schema.endpoints)
    tested_endpoints = set()  # Populated by parametrize fixtures

    coverage = len(tested_endpoints) / len(all_endpoints) * 100
    assert coverage >= 95, f"Contract test coverage is {coverage}%, expected >= 95%"
```

**Contract Guarantee**: < 5% of endpoints excluded from contract testing.

### 3. Response Validation

**Rule**: All response fields MUST match schema types, required fields, and constraints.

**Validation Checks**:
- **Type Validation**: Field types match schema (string, integer, boolean, etc.)
- **Required Fields**: All required fields present in response
- **Field Constraints**: Values respect min/max, length, pattern constraints
- **Enum Values**: Enum fields only contain valid enum values
- **Nested Objects**: Nested structures match schema recursively

**Example Validation**:
```python
@schema.parametrize()
def test_investigation_response_contract(case):
    response = case.call_asgi()

    # Schemathesis automatically validates:
    # 1. Status code is one of the documented codes (200, 201, 400, 404, etc.)
    # 2. Response body matches schema (types, required fields, constraints)
    # 3. Response headers match schema (if defined)
    case.validate_response(response)
```

**Contract Guarantee**: Zero false negatives - all schema violations detected.

### 4. Error Response Testing

**Rule**: Contract tests MUST validate error responses (4xx, 5xx) match schema.

**Error Response Testing**:
```python
import pytest
from fastapi import status

def test_validation_error_contract():
    """Test 422 validation error response matches schema"""
    invalid_request = {
        "entity_type": "email"
        # Missing required field: entity_id
    }

    response = client.post("/api/v1/investigations/", json=invalid_request)

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Validate error response matches ErrorResponse schema
    error_data = response.json()
    assert "error" in error_data
    assert "message" in error_data
    assert isinstance(error_data["error"], str)
    assert isinstance(error_data["message"], str)

def test_not_found_error_contract():
    """Test 404 not found error response matches schema"""
    response = client.get("/api/v1/investigations/nonexistent-id")

    assert response.status_code == status.HTTP_404_NOT_FOUND

    error_data = response.json()
    assert "error" in error_data
    assert "message" in error_data
```

**Contract Guarantee**: Error responses validated with same rigor as success responses.

### 5. Authentication Testing

**Rule**: Contract tests MUST validate authentication requirements match schema.

**Authentication Testing**:
```python
def test_authentication_required_contract():
    """Test endpoints require authentication as per schema"""
    # Request without authentication header
    response = client.post("/api/v1/investigations/", json=valid_request)

    # Should return 401 Unauthorized (as defined in schema)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_valid_authentication_contract():
    """Test endpoints accept valid JWT tokens"""
    headers = {"Authorization": f"Bearer {get_test_jwt_token()}"}
    response = client.post("/api/v1/investigations/", json=valid_request, headers=headers)

    # Should return 201 Created (as defined in schema)
    assert response.status_code == status.HTTP_201_CREATED
```

**Contract Guarantee**: Authentication contract enforced across all protected endpoints.

### 6. Request Body Validation

**Rule**: Backend MUST reject requests that violate schema constraints.

**Constraint Validation Testing**:
```python
def test_request_validation_contract():
    """Test backend validates request bodies against schema"""

    # Test 1: Required field missing
    invalid_request_1 = {"entity_type": "email"}  # Missing entity_id
    response_1 = client.post("/api/v1/investigations/", json=invalid_request_1)
    assert response_1.status_code == 422

    # Test 2: Invalid enum value
    invalid_request_2 = {"entity_id": "test", "entity_type": "invalid_type"}
    response_2 = client.post("/api/v1/investigations/", json=invalid_request_2)
    assert response_2.status_code == 422

    # Test 3: Violate field constraint (e.g., min_length)
    invalid_request_3 = {"entity_id": "", "entity_type": "email"}  # Empty string
    response_3 = client.post("/api/v1/investigations/", json=invalid_request_3)
    assert response_3.status_code == 422

    # Test 4: Invalid nested object
    invalid_request_4 = {
        "entity_id": "test",
        "entity_type": "email",
        "time_range": {"start_time": "invalid-date"}  # Invalid datetime format
    }
    response_4 = client.post("/api/v1/investigations/", json=invalid_request_4)
    assert response_4.status_code == 422
```

**Contract Guarantee**: Backend enforces 100% of schema validation rules.

### 7. Performance Requirements

**Rule**: Contract tests MUST complete within CI/CD time budget.

**Performance Targets**:
- Total contract test suite: < 60 seconds
- Per-endpoint tests: < 5 seconds average
- Schemathesis generation: < 30 seconds for all endpoints

**Performance Optimization**:
```python
# Use pytest-xdist for parallel execution
# pytest test/contract/ -n auto

# Limit schemathesis test cases for faster execution
@schema.parametrize(max_examples=50)  # Default: 100
def test_api_contract_fast(case):
    response = case.call_asgi()
    case.validate_response(response)
```

**Contract Guarantee**: Contract tests execute within CI pipeline timeout (< 60s).

## Frontend Contract Testing

### 1. Request Validation

**Rule**: Frontend MUST validate requests against schema before sending to backend.

**Client-Side Validation**:
```typescript
// olorin-front/src/api/validators.ts
import { validateInvestigationRequest } from './schema-validator';
import type { InvestigationRequest } from './generated/types';

export async function createInvestigation(request: InvestigationRequest) {
  // Validate request against OpenAPI schema
  const validation = validateInvestigationRequest(request);

  if (!validation.valid) {
    throw new ValidationError('Invalid request', validation.errors);
  }

  // Send validated request to backend
  return await InvestigationsService.createInvestigation(request);
}
```

**Contract Guarantee**: Invalid requests detected before API call (fail-fast).

### 2. Response Validation

**Rule**: Frontend MUST validate API responses match expected schema.

**Response Validation**:
```typescript
// olorin-front/src/api/client.ts
import Ajv from 'ajv';
import openApiSchema from './generated/openapi.json';

const ajv = new Ajv();
const validateResponse = ajv.compile(openApiSchema.components.schemas.InvestigationResponse);

export async function createInvestigation(request: InvestigationRequest): Promise<InvestigationResponse> {
  const response = await fetch('/api/v1/investigations/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(request)
  });

  const data = await response.json();

  // Validate response matches schema
  if (!validateResponse(data)) {
    console.error('Response validation failed:', validateResponse.errors);
    throw new SchemaViolationError('Backend response does not match schema');
  }

  return data;
}
```

**Contract Guarantee**: Schema violations detected immediately in development.

### 3. Integration Testing with Dredd

**Rule**: Frontend integration tests MUST use dredd to validate API interactions.

**Dredd Configuration**:
```yaml
# olorin-front/dredd.yml
language: nodejs
server: npm start
server-wait: 5
blueprint: http://localhost:8090/openapi.json
endpoint: 'http://localhost:8090'
only:
  - "POST /api/v1/investigations/"
  - "GET /api/v1/investigations/{investigation_id}"
hooks: ./test/contract/hooks.ts
```

**Dredd Hooks for Authentication**:
```typescript
// olorin-front/test/contract/hooks.ts
import hooks from 'dredd-hooks';

// Add authentication to all requests
hooks.beforeEach((transaction, done) => {
  transaction.request.headers['Authorization'] = `Bearer ${getTestToken()}`;
  done();
});

// Validate response structure
hooks.afterEach((transaction, done) => {
  if (transaction.fail) {
    console.error('Contract test failed:', transaction.results);
  }
  done();
});
```

**Contract Guarantee**: Frontend requests validated against live OpenAPI schema.

### 4. Mock Server for Development

**Rule**: Frontend development MUST use mock server based on OpenAPI schema.

**Mock Server Setup**:
```typescript
// olorin-front/src/mocks/server.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import type { InvestigationResponse } from '@/api/generated/types';

// Generate mock responses from OpenAPI schema examples
export const handlers = [
  rest.post('/api/v1/investigations/', (req, res, ctx) => {
    const mockResponse: InvestigationResponse = {
      investigation_id: "550e8400-e29b-41d4-a716-446655440000",
      entity_id: req.body.entity_id,
      entity_type: req.body.entity_type,
      status: "pending",
      risk_score: 0,
      created_at: new Date().toISOString(),
      completed_at: null
    };

    return res(ctx.status(201), ctx.json(mockResponse));
  })
];

export const server = setupServer(...handlers);
```

**Contract Guarantee**: Mock responses match OpenAPI schema structure.

### 5. Scenario-Based Testing

**Rule**: Frontend contract tests MUST cover critical user scenarios.

**Scenario Tests**:
```typescript
// olorin-front/test/contract/investigation-scenarios.test.ts
import { InvestigationsService } from '@/api/generated';

describe('Investigation Contract Scenarios', () => {
  test('Scenario 1: Create investigation with time range', async () => {
    const request = {
      entity_id: "user@example.com",
      entity_type: "email" as const,
      time_range: {
        start_time: "2025-10-15T00:00:00Z",
        end_time: "2025-10-16T23:59:59Z"
      }
    };

    const response = await InvestigationsService.createInvestigation(request);

    // Validate response structure
    expect(response).toHaveProperty('investigation_id');
    expect(response.entity_id).toBe(request.entity_id);
    expect(response.status).toMatch(/pending|in_progress/);
  });

  test('Scenario 2: Create investigation without time range', async () => {
    const request = {
      entity_id: "user@example.com",
      entity_type: "email" as const
    };

    const response = await InvestigationsService.createInvestigation(request);

    expect(response).toHaveProperty('investigation_id');
    expect(response.time_range).toBeUndefined();
  });

  test('Scenario 3: Invalid entity type should fail', async () => {
    const request = {
      entity_id: "test",
      entity_type: "invalid_type" as any  // Invalid enum value
    };

    await expect(
      InvestigationsService.createInvestigation(request)
    ).rejects.toThrow();
  });
});
```

**Contract Guarantee**: Critical user flows validated against contract.

## CI/CD Integration

### 1. Backend Contract Tests in CI

**Rule**: Backend contract tests MUST run on every PR and block merge on failure.

**GitHub Actions Workflow**:
```yaml
# .github/workflows/backend-contract-tests.yml
name: Backend Contract Tests

on: [pull_request]

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd olorin-server
          poetry install

      - name: Run backend contract tests
        run: |
          cd olorin-server
          poetry run pytest test/contract/ -v --tb=short

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./olorin-server/coverage.xml
```

**Contract Guarantee**: PRs with contract test failures cannot be merged.

### 2. Frontend Contract Tests in CI

**Rule**: Frontend contract tests MUST run against live backend in CI.

**GitHub Actions Workflow**:
```yaml
# .github/workflows/frontend-contract-tests.yml
name: Frontend Contract Tests

on: [pull_request]

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    services:
      backend:
        image: olorin-backend:latest
        ports:
          - 8090:8090
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: |
          cd olorin-front
          npm ci

      - name: Run Dredd contract tests
        run: |
          cd olorin-front
          npm run test:contract -- --server-wait=10

      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: contract-test-results
          path: olorin-front/test-results/
```

**Contract Guarantee**: Frontend validated against real backend in CI.

### 3. Contract Test Reports

**Rule**: Contract test results MUST be reported with clear pass/fail status.

**Test Report Format**:
```
Contract Test Results:
======================

Backend Tests (Schemathesis):
✅ POST /api/v1/investigations/ - 50 tests passed
✅ GET /api/v1/investigations/{id} - 50 tests passed
✅ GET /api/v1/investigations/ - 50 tests passed

Frontend Tests (Dredd):
✅ Create investigation scenario - passed
✅ Get investigation scenario - passed
❌ Invalid request scenario - FAILED
   Expected: 422 validation error
   Actual: 400 bad request

Overall: 153/155 tests passed (98.7%)
❌ FAILED - Fix failing tests before merge
```

**Contract Guarantee**: Clear, actionable test failure reports.

## Breaking Change Detection

### 1. Schema Comparison

**Rule**: Contract test failures caused by schema changes MUST be analyzed for breaking changes.

**Breaking Change Detection**:
```bash
# .github/workflows/breaking-change-detection.yml
- name: Detect breaking changes
  run: |
    # Compare current schema with main branch schema
    oasdiff breaking \
      origin/main:olorin-server/openapi.json \
      HEAD:olorin-server/openapi.json

    # If breaking changes detected, fail CI
    if [ $? -eq 1 ]; then
      echo "❌ Breaking API changes detected!"
      exit 1
    fi
```

**Contract Guarantee**: Breaking changes detected before merge.

### 2. Test Failure Analysis

**Rule**: Contract test failures MUST be categorized as breaking or non-breaking.

**Failure Categories**:
- **Breaking**: Backend removes required field, changes type, removes endpoint
- **Non-Breaking**: Backend adds optional field, adds new endpoint
- **Bug**: Backend implementation doesn't match its own schema

**Contract Guarantee**: Test failures include breaking change analysis.

## Version Compatibility Testing

### 1. Multi-Version Contract Tests

**Rule**: Contract tests MUST validate compatibility between frontend and backend versions.

**Version Compatibility Matrix**:
```typescript
// test/contract/version-compatibility.test.ts
const versionMatrix = [
  { frontend: 'v1', backend: 'v1', expected: 'compatible' },
  { frontend: 'v1', backend: 'v2', expected: 'compatible' },  // v2 is backward-compatible
  { frontend: 'v2', backend: 'v1', expected: 'incompatible' }
];

versionMatrix.forEach(({ frontend, backend, expected }) => {
  test(`Frontend ${frontend} + Backend ${backend} = ${expected}`, async () => {
    // Test compatibility
  });
});
```

**Contract Guarantee**: All supported version combinations tested.

### 2. Backward Compatibility Validation

**Rule**: New API versions MUST maintain contract compatibility with previous versions.

**Backward Compatibility Tests**:
```python
def test_v2_backward_compatible_with_v1():
    """Verify v2 API accepts v1 requests"""
    v1_request = {"entity_id": "test", "entity_type": "email"}

    # v2 endpoint should accept v1 request format
    response = client.post("/api/v2/investigations/", json=v1_request)

    assert response.status_code in [200, 201], "v2 should accept v1 requests"
```

**Contract Guarantee**: Backward compatibility violations detected in CI.

## Performance Requirements

| Metric | Target | Measured By |
|--------|--------|-------------|
| Backend contract tests | < 60s | Pytest duration |
| Frontend contract tests | < 30s | Dredd duration |
| Test execution frequency | Every PR | GitHub Actions |
| Test failure resolution | < 2 hours | SLA for blocked PRs |

**Contract Guarantee**: All performance targets met in CI pipeline.

## Success Criteria

1. ✅ 95%+ endpoint coverage in contract tests
2. ✅ All request/response validations match schema
3. ✅ Error responses validated with same rigor as success responses
4. ✅ Authentication requirements validated
5. ✅ Contract tests run on every PR in CI
6. ✅ Contract test failures block merge
7. ✅ Breaking changes detected before merge
8. ✅ Test reports provide clear, actionable feedback
9. ✅ < 60 second test execution time
10. ✅ Version compatibility validated automatically

## References

- **Schemathesis Documentation**: https://schemathesis.readthedocs.io/
- **Dredd API Testing**: https://dredd.org/
- **Contract Testing Best Practices**: https://martinfowler.com/bliki/ContractTest.html
- **Feature Spec**: [../spec.md](../spec.md)
- **Implementation Plan**: [../plan.md](../plan.md)
- **Data Model**: [../data-model.md](../data-model.md)
