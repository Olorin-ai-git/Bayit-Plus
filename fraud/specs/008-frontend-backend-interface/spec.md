# Feature Specification: Frontend-Backend Interface Compatibility Plan

**Feature Branch**: `001-frontend-backend-interface`
**Created**: 2025-11-01
**Status**: Draft
**Author**: Gil Klainert
**Input**: User description: "match frontend to backend. Goal: Produce a practical, engineering-ready plan that guarantees interface compatibility between the frontend and backend across environments and versions, with clear contracts, tests, tooling, rollout, and governance."

---

## Executive Summary

This specification establishes a comprehensive plan to guarantee interface compatibility between the Olorin frontend (React TypeScript) and backend (Python FastAPI) across all environments and versions. The plan defines:

- **Single source of truth** for API contracts using OpenAPI 3.1 with TypeScript and Python code generation
- **Breaking-change prevention** through automated schema validation, contract testing, and rollback procedures
- **Testing strategy** with contract tests, integration tests, and canary deployments
- **Tooling and automation** for API documentation, code generation, and CI/CD integration
- **Observability** with comprehensive monitoring, tracing, and alerting for interface health
- **Governance** with clear RACI matrix, approval workflows, and calendar-driven releases

The plan ensures that frontend and backend teams can develop independently while maintaining guaranteed compatibility through automated validation, testing, and deployment safeguards.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Schema-First Development with Auto-Generated Types (Priority: P1)

As a **frontend developer**, I want to **consume auto-generated TypeScript types from the backend OpenAPI schema** so that **I have type-safe API calls with compile-time validation** without manually maintaining interface definitions.

**Why this priority**: This is the foundation of interface compatibility. Without auto-generated types, developers manually sync interfaces which leads to drift, runtime errors, and production incidents. This delivers immediate value by eliminating an entire class of integration bugs.

**Independent Test**: Can be fully tested by generating OpenAPI schema from backend, running code generator to produce TypeScript types, importing types in frontend code, and verifying compilation succeeds with correct types. Delivers value immediately by providing type safety for any single API endpoint.

**Acceptance Scenarios**:

1. **Given** backend OpenAPI 3.1 schema is available at `/openapi.json`, **When** frontend developer runs `npm run generate-api-types`, **Then** TypeScript interfaces are generated in `src/api/generated/` with correct types for all models, request bodies, and responses
2. **Given** backend adds new field `time_range` to `StructuredInvestigationRequest`, **When** schema is regenerated and types updated, **Then** TypeScript compiler shows errors in frontend code that doesn't provide the new field (if required) or ignores it (if optional)
3. **Given** backend changes field type from `string` to `TimeRange` object, **When** types are regenerated, **Then** frontend code using old `string` type fails to compile, forcing developer to update code before deployment

---

### User Story 2 - Contract Testing for API Compatibility (Priority: P1)

As a **backend developer**, I want to **run contract tests that validate my API against the published schema** so that **I can detect breaking changes before deployment** and prevent frontend integration failures.

**Why this priority**: Contract testing catches breaking changes at build time rather than runtime. This is critical because it prevents deploying incompatible changes that would break the frontend in production. Equal priority to P1 because it's the other half of the compatibility guarantee.

**Independent Test**: Can be fully tested by defining contract tests for a single endpoint (e.g., POST /investigations), making a breaking change (e.g., removing required field), running contract tests, and verifying they fail. Delivers value immediately by protecting any single endpoint from breaking changes.

**Acceptance Scenarios**:

1. **Given** OpenAPI schema defines `entity_id` as required field, **When** backend developer removes `entity_id` validation, **Then** contract tests fail with clear error: "Required field 'entity_id' missing from request validation"
2. **Given** frontend contract test expects 200 status with investigation object, **When** backend changes to return 201 status, **Then** contract test fails: "Expected status 200, got 201"
3. **Given** schema defines response field `investigation_id` as `string`, **When** backend returns `integer`, **Then** contract test fails: "Field 'investigation_id' type mismatch: expected string, got integer"

---

### User Story 3 - Automated Rollback for Breaking Changes (Priority: P2)

As a **DevOps engineer**, I want to **automatically detect and rollback deployments that break API contracts** so that **frontend never experiences downtime from incompatible backend changes** without manual intervention.

**Why this priority**: While P1 prevents breaking changes from being deployed, P2 provides a safety net if breaking changes slip through. This is critical for production stability but secondary because it's a fallback mechanism.

**Independent Test**: Can be fully tested by deploying backend with breaking change, running post-deployment contract validation, detecting failure, triggering automatic rollback to previous version, and verifying frontend continues working. Delivers value by protecting production from any deployment failure.

**Acceptance Scenarios**:

1. **Given** backend v2.1.0 deploys successfully, **When** post-deployment contract tests detect breaking change (missing required field), **Then** deployment system automatically rolls back to v2.0.9 within 60 seconds and alerts team
2. **Given** canary deployment of backend is running with 10% traffic, **When** error rate for API calls exceeds 5% threshold, **Then** canary is automatically abandoned and all traffic routes to stable version
3. **Given** schema validation detects breaking change in deployment pipeline, **When** pipeline attempts to proceed to production, **Then** deployment is blocked and ticket is created for manual review

---

### User Story 4 - Version Negotiation for Gradual Migration (Priority: P3)

As a **platform architect**, I want to **support multiple API versions simultaneously with version negotiation** so that **frontend and backend can be deployed independently** without forcing synchronized releases.

**Why this priority**: This enables true independent deployment but requires more infrastructure. P3 because it's valuable for reducing coordination overhead but not critical for basic compatibility.

**Independent Test**: Can be fully tested by deploying backend with v1 and v2 endpoints, having old frontend call v1, having new frontend call v2, and verifying both work correctly. Delivers value by enabling zero-downtime migrations for any single API change.

**Acceptance Scenarios**:

1. **Given** frontend sends `Accept: application/vnd.olorin.v1+json` header, **When** backend has v1 and v2 implementations, **Then** backend routes request to v1 handler and returns v1 schema response
2. **Given** backend deprecates v1 API with 90-day sunset period, **When** frontend continues using v1, **Then** backend returns deprecation warning in response headers: `Sunset: Wed, 01 Feb 2026 00:00:00 GMT`
3. **Given** new frontend uses v2 API with `time_range` object, **When** old backend only supports v1 with `date_range_days`, **Then** API gateway transforms v2 request to v1 format and transforms v1 response back to v2 format

---

### User Story 5 - Real-Time Contract Monitoring (Priority: P3)

As a **SRE**, I want to **monitor API contract compliance in production** so that **I can detect schema drift, unexpected usage patterns, and compatibility issues** before they cause incidents.

**Why this priority**: Provides observability and early warning but isn't critical for preventing breaking changes (P1/P2 handle that). Valuable for detecting subtle issues and unusual patterns.

**Independent Test**: Can be fully tested by setting up monitoring for a single endpoint, sending valid and invalid requests, and verifying alerts fire for schema violations. Delivers value by providing visibility into any single endpoint's health.

**Acceptance Scenarios**:

1. **Given** production API receives request with unknown field `extra_field`, **When** monitoring detects schema violation, **Then** alert fires: "Schema violation on POST /investigations: unexpected field 'extra_field'" with details of caller
2. **Given** response validation detects backend returning null for required field `investigation_id`, **When** violation threshold exceeds 10 occurrences per minute, **Then** PagerDuty alert fires for on-call engineer
3. **Given** API usage monitoring tracks endpoint call patterns, **When** deprecated v1 endpoint usage increases unexpectedly, **Then** dashboard shows spike and alerts team about potential migration issue

---

### User Story 6 - Interactive API Documentation with Live Testing (Priority: P3)

As a **frontend developer**, I want to **access interactive API documentation with live testing capability** so that **I can explore endpoints, test requests, and understand response formats** without reading static documentation or running backend locally.

**Why this priority**: Improves developer experience and reduces onboarding time but isn't critical for compatibility (P1/P2 handle that). Valuable for productivity and reducing support burden.

**Independent Test**: Can be fully tested by accessing Swagger UI, selecting an endpoint, filling in request parameters, executing live request against development backend, and verifying response matches schema. Delivers value immediately by providing self-service exploration of any single endpoint.

**Acceptance Scenarios**:

1. **Given** developer accesses `/docs` on development backend, **When** they select POST /investigations endpoint, **Then** Swagger UI displays request schema, example values, and "Try it out" button
2. **Given** developer fills in investigation request form in Swagger UI, **When** they click "Execute", **Then** live request is sent to backend and response is displayed with formatted JSON and HTTP status
3. **Given** backend OpenAPI schema includes field descriptions and validation rules, **When** developer views endpoint documentation, **Then** Swagger UI displays field constraints (required, min/max length, format) and helpful descriptions

---

### User Story 7 - Continuous Integration Contract Validation (Priority: P2)

As a **development team lead**, I want to **automatically validate contracts in CI pipeline for every pull request** so that **breaking changes are caught in code review** before merging to main branch.

**Why this priority**: Shifts breaking change detection left in the development cycle, catching issues in PR rather than deployment. P2 because it's part of the prevention strategy but P1 handles immediate detection.

**Independent Test**: Can be fully tested by creating PR with breaking change, running CI pipeline, verifying contract tests fail, and seeing PR blocked from merge. Delivers value by protecting any single endpoint from breaking changes in development.

**Acceptance Scenarios**:

1. **Given** developer creates PR removing required field from API, **When** CI runs contract tests, **Then** PR check fails with error: "Contract test failure: Required field 'entity_id' removed" and PR is blocked from merge
2. **Given** frontend developer creates PR using new backend field not yet in schema, **When** CI runs type generation, **Then** build fails: "Type error: Property 'new_field' does not exist on type 'InvestigationRequest'"
3. **Given** both frontend and backend PRs are created for coordinated change, **When** dependency graph validation runs, **Then** CI ensures backend PR merges first, then frontend PR can merge safely

---

### Edge Cases

- **What happens when backend returns field not in schema?** Frontend TypeScript types won't include the field, so it's ignored at runtime. Monitoring alerts on schema violation but doesn't break functionality.
- **How does system handle schema evolution (adding optional fields)?** New optional fields are backward compatible - old frontend ignores them, new frontend can use them. Contract tests pass because optional fields don't break existing functionality.
- **What happens when frontend sends deprecated field?** Backend continues accepting it during deprecation period, issues warning in response headers, and monitoring tracks usage to inform sunset date.
- **How does system handle network failures during schema fetch?** Frontend uses locally cached schema from last successful fetch, falls back to last known good types. Backend continues serving with existing schema.
- **What happens when OpenAPI generation fails?** CI pipeline fails build, blocks merge, and alerts team. No code can be deployed without valid schema.
- **How does system handle breaking changes that are intentional?** Developer explicitly bumps major version (v1 → v2), updates contract tests to reflect new expectations, and both versions run simultaneously during migration period.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate OpenAPI 3.1 schema automatically from FastAPI backend with all endpoints, models, request bodies, and responses documented
- **FR-002**: System MUST generate TypeScript interfaces automatically from OpenAPI schema with exact type mappings (string → string, integer → number, object → interface)
- **FR-003**: System MUST run contract tests validating backend responses match OpenAPI schema for all endpoints before deployment
- **FR-004**: System MUST run contract tests validating frontend requests match OpenAPI schema for all API calls in test suite
- **FR-005**: System MUST block deployments that fail contract validation tests with clear error messages indicating which contracts failed
- **FR-006**: System MUST support API versioning with URL-based versioning (e.g., /api/v1/, /api/v2/) and version negotiation via Accept headers
- **FR-007**: System MUST maintain backward compatibility for all API changes during a defined deprecation period (90 days minimum)
- **FR-008**: System MUST validate all request bodies against OpenAPI schema at runtime in backend with detailed validation error responses (400 status)
- **FR-009**: System MUST validate all response bodies against OpenAPI schema at runtime in backend (development only) to catch serialization errors
- **FR-010**: System MUST generate API client code for frontend with type-safe functions for all endpoints (e.g., `createInvestigation(request: InvestigationRequest): Promise<Investigation>`)
- **FR-011**: System MUST provide Swagger UI documentation at `/docs` endpoint with live testing capability against development backend
- **FR-012**: System MUST automatically detect breaking changes in schema diffs and require explicit acknowledgment before deployment
- **FR-013**: System MUST support canary deployments with automated rollback if error rates exceed threshold (5% of requests)
- **FR-014**: System MUST log all schema validation failures in production with request details (sanitized sensitive data) for analysis
- **FR-015**: System MUST provide schema versioning with semantic versioning (major.minor.patch) and changelog tracking
- **FR-016**: System MUST generate example requests and responses in OpenAPI schema with realistic test data
- **FR-017**: System MUST validate environment-specific configurations (development, staging, production) for API base URLs and authentication
- **FR-018**: System MUST provide API deprecation warnings in response headers when frontend uses deprecated endpoints
- **FR-019**: System MUST maintain schema registry with all historical versions and ability to compare any two versions
- **FR-020**: System MUST integrate contract testing into CI pipeline for both frontend and backend with pull request status checks

### Non-Functional Requirements

- **NFR-001**: Schema generation MUST complete within 5 seconds as part of backend startup
- **NFR-002**: TypeScript type generation MUST complete within 10 seconds as part of frontend build
- **NFR-003**: Contract tests MUST complete within 60 seconds to avoid blocking deployments
- **NFR-004**: API versioning overhead MUST add less than 10ms latency per request
- **NFR-005**: Schema validation in production MUST add less than 5ms overhead per request
- **NFR-006**: System MUST support 100% code coverage for generated API client functions
- **NFR-007**: Breaking change detection MUST have zero false negatives (all breaking changes caught)
- **NFR-008**: Breaking change detection SHOULD minimize false positives (< 5% of changes flagged incorrectly)
- **NFR-009**: Automated rollback MUST complete within 120 seconds from detection to stable state
- **NFR-010**: Documentation MUST regenerate automatically on every schema change and deploy to accessible URL

### Key Entities *(include if feature involves data)*

- **OpenAPI Schema**: Complete API specification including paths, operations, parameters, request bodies, responses, and schemas. Stored as openapi.json in backend. Versioned semantically.
- **Contract Test**: Automated test validating request/response against schema. Includes endpoint, method, example request, expected response, and validation rules.
- **API Version**: Major version of API (v1, v2, etc.). Each version has its own schema, routes, and implementation. Multiple versions run simultaneously.
- **Deprecation Notice**: Metadata tracking deprecated endpoints with sunset date, replacement endpoint, and usage metrics.
- **Schema Diff**: Comparison between two schema versions highlighting additions, modifications, deletions, and breaking changes.
- **Generated Type**: TypeScript interface or type generated from OpenAPI schema component. One-to-one mapping with schema definitions.
- **API Client Function**: Generated TypeScript function wrapping API endpoint call with type-safe parameters and return type.
- **Validation Error**: Runtime error when request/response doesn't match schema. Includes path to invalid field, expected type, actual value, and validation rule violated.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero production incidents caused by frontend-backend interface incompatibility within 90 days of implementation
- **SC-002**: 100% of API endpoints have OpenAPI schema documentation with request/response examples
- **SC-003**: 100% of frontend API calls use auto-generated TypeScript types (no manual interface definitions)
- **SC-004**: Contract tests achieve 95% code coverage of API endpoints within first deployment cycle
- **SC-005**: Breaking changes are detected in CI pipeline with 100% accuracy (zero false negatives)
- **SC-006**: Pull requests with breaking changes are blocked from merge with clear error messages within 5 minutes of CI run
- **SC-007**: Automated rollback completes within 120 seconds for 95% of failed deployments
- **SC-008**: API documentation is accessible and updated within 60 seconds of schema changes
- **SC-009**: Frontend developers report 80% reduction in time spent debugging API integration issues
- **SC-010**: Backend developers report 70% reduction in time spent answering frontend integration questions
- **SC-011**: Schema validation in production catches 99% of malformed requests with actionable error messages
- **SC-012**: Deprecated endpoint usage decreases by 90% within 30 days of deprecation notice
- **SC-013**: Canary deployments catch 95% of interface-related issues before full rollout
- **SC-014**: Contract test execution time remains under 60 seconds despite API growth
- **SC-015**: Zero manual schema synchronization tasks required by development teams

---

## Compatibility Goals & Non-Goals

### Goals

1. **Guaranteed Type Safety**: Frontend code uses exact types from backend schema with compile-time validation
2. **Zero-Trust Validation**: Every request and response is validated against schema at runtime (development) and contract-tested (CI/CD)
3. **Independent Deployment**: Frontend and backend can be deployed independently without coordination
4. **Automated Detection**: Breaking changes are automatically detected in CI before merge, never reaching production
5. **Fast Rollback**: Deployments causing interface issues are automatically rolled back within 2 minutes
6. **Clear Communication**: Schema changes are communicated via deprecation headers, changelogs, and monitoring alerts
7. **Version Migration**: Multiple API versions coexist allowing gradual migration without downtime
8. **Developer Experience**: Single command generates types, single command runs contract tests, single dashboard shows compatibility status

### Non-Goals

1. **Backward Compatibility Forever**: We will not maintain old API versions indefinitely (90-day deprecation period)
2. **Zero-Downtime Schema Changes**: We will not guarantee zero-downtime for all schema changes (major version bumps may require brief maintenance window)
3. **Perfect Schema Coverage**: We will not achieve 100% OpenAPI coverage immediately (95% coverage acceptable for v1, 100% for v2)
4. **GraphQL Support**: This plan covers REST APIs only, GraphQL is out of scope for initial implementation
5. **External API Integrations**: This plan covers internal frontend-backend communication only, not third-party API integrations
6. **Mobile App Support**: This plan covers web frontend only, mobile apps are out of scope for initial implementation

---

## Single Source of Truth for Contracts

### Architecture

The **Single Source of Truth (SSOT)** for all API contracts is the **OpenAPI 3.1 schema** generated automatically from the FastAPI backend using FastAPI's built-in OpenAPI generation.

### Schema Generation

**Backend** (Python FastAPI):
- FastAPI automatically generates OpenAPI schema from route definitions, Pydantic models, and docstrings
- Schema is available at `/openapi.json` endpoint
- Custom schema modifications use FastAPI schema customization hooks
- Schema includes all endpoints, models, request bodies, responses, and validation rules

**Schema Structure**:
```yaml
openapi: 3.1.0
info:
  title: Olorin Investigation API
  version: 2.1.0
paths:
  /api/v1/investigations/:
    post:
      summary: Start structured investigation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/StructuredInvestigationRequest'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StructuredInvestigationResponse'
components:
  schemas:
    StructuredInvestigationRequest:
      type: object
      required: [entity_id, entity_type]
      properties:
        entity_id: {type: string}
        entity_type: {type: string, enum: [ip, email, device_id, user_id]}
        time_range: {$ref: '#/components/schemas/TimeRange'}
```

### Code Generation

**Frontend** (TypeScript):
- Use `openapi-typescript` to generate TypeScript types from schema
- Use `openapi-typescript-codegen` to generate API client functions
- Generated code lives in `src/api/generated/` directory (git-ignored, regenerated on build)
- Developers import types and functions: `import { Investigation, investigationApi } from '@/api/generated'`

**Generation Command**:
```bash
npm run generate-api-types
# Internally runs:
# 1. Fetch openapi.json from backend
# 2. Run openapi-typescript to generate types
# 3. Run openapi-typescript-codegen to generate client functions
```

**Generated Output**:
```typescript
// src/api/generated/types.ts
export interface StructuredInvestigationRequest {
  entity_id: string;
  entity_type: "ip" | "email" | "device_id" | "user_id";
  time_range?: TimeRange;
}

// src/api/generated/api.ts
export const investigationApi = {
  createInvestigation: async (
    request: StructuredInvestigationRequest
  ): Promise<StructuredInvestigationResponse> => {
    // Generated fetch logic with type safety
  }
};
```

### Schema Validation

**Backend Runtime Validation**:
- FastAPI/Pydantic validates all requests automatically
- Invalid requests return 422 with detailed validation errors
- Development mode enables response validation (logs warnings for invalid responses)

**Contract Testing**:
- Use `schemathesis` for property-based contract testing (Python)
- Use `dredd` for contract testing (Node.js)
- Tests run in CI and pre-deployment validation

---

## Interface Contract Details

### Request/Response Formats

All API communication uses JSON with UTF-8 encoding.

**Request Format**:
```json
POST /api/v1/investigations/
Content-Type: application/json
Accept: application/json
Authorization: Bearer <jwt_token>

{
  "entity_id": "192.168.1.1",
  "entity_type": "ip",
  "time_range": {
    "start_time": "2025-01-15T00:00:00Z",
    "end_time": "2025-01-16T23:59:59Z"
  }
}
```

**Response Format**:
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "investigation_id": "inv_123abc",
  "status": "IN_PROGRESS",
  "created_at": "2025-01-16T10:30:00Z"
}
```

**Error Response Format**:
```json
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "detail": [
    {
      "loc": ["body", "time_range", "start_time"],
      "msg": "Invalid ISO 8601 timestamp format",
      "type": "value_error"
    }
  ]
}
```

### Field Naming Conventions

- **Backend**: Use `snake_case` for all field names (Python convention)
- **Frontend**: Use `camelCase` for TypeScript (JavaScript convention)
- **Transformation**: Code generator automatically converts between conventions
- **Example**: Backend `time_range` → Frontend `timeRange`

### Type Mapping

| OpenAPI Type | Python Type | TypeScript Type |
|--------------|-------------|-----------------|
| string | str | string |
| integer | int | number |
| number | float | number |
| boolean | bool | boolean |
| array | List[T] | T[] |
| object | Dict[str, Any] | Record<string, any> |
| enum | Literal["a", "b"] | "a" \| "b" |
| null | None | null |

### Versioning Strategy

**URL-Based Versioning**:
- Major versions in URL: `/api/v1/`, `/api/v2/`
- Minor/patch versions do NOT appear in URL (backward compatible)
- Version bump rules:
  - **Major (v1 → v2)**: Breaking changes (field removal, type changes, required field addition)
  - **Minor (v1.1 → v1.2)**: New features (optional field addition, new endpoints)
  - **Patch (v1.1.1 → v1.1.2)**: Bug fixes (no schema changes)

**Version Negotiation**:
```http
GET /api/investigations/
Accept: application/vnd.olorin.v1+json

# Backend responds with:
Content-Type: application/vnd.olorin.v1+json
Sunset: Wed, 01 Feb 2026 00:00:00 GMT  # Deprecation warning
```

### Authentication

- **Method**: JWT Bearer tokens
- **Header**: `Authorization: Bearer <token>`
- **Token Format**: JWT with claims: `user_id`, `realm_id`, `exp`
- **Error Response**: 401 Unauthorized if token invalid/expired

---

## Change Management & Breaking-Change Prevention

### Breaking Change Definition

A change is **breaking** if it:
1. Removes or renames an endpoint
2. Removes or renames a required field
3. Changes field type (e.g., string → object)
4. Adds a new required field
5. Changes response status code for success case
6. Changes error response format
7. Restricts validation rules (e.g., max length 100 → 50)

A change is **non-breaking** if it:
1. Adds optional field to request
2. Adds new field to response
3. Adds new endpoint
4. Relaxes validation rules (e.g., max length 50 → 100)
5. Adds new error case (new error status code)

### Change Detection Process

**Automated Detection** (CI Pipeline):
1. Generate OpenAPI schema from current branch
2. Fetch schema from target branch (e.g., main)
3. Run `oasdiff` to detect breaking changes
4. If breaking changes detected:
   - Block PR from merge
   - Comment on PR with list of breaking changes
   - Require explicit override by tech lead

**Detection Tool**:
```bash
# CI Pipeline Step
oasdiff breaking openapi-main.json openapi-pr.json
# Output:
# BREAKING CHANGES DETECTED:
# - POST /api/v1/investigations: removed required property 'entity_id'
# - GET /api/v1/investigations/{id}: changed response type from 200 to 201
```

### Change Approval Workflow

**Non-Breaking Changes**:
1. Developer creates PR
2. CI validates schema changes (auto-approval)
3. Code review required (1 approval)
4. Merge to main

**Breaking Changes**:
1. Developer creates PR
2. CI detects breaking change, blocks merge
3. Developer acknowledges breaking change (adds label: `breaking-change`)
4. Developer bumps major version in schema (v1 → v2)
5. Developer updates migration guide in PR description
6. Tech lead reviews migration plan (1 approval)
7. Backend maintains v1 and v2 simultaneously
8. Merge to main

### Deprecation Process

**Timeline**:
- **T+0 days**: Endpoint marked deprecated in schema, warning added to response headers
- **T+30 days**: Monitoring dashboard shows usage metrics, team reviews adoption of replacement
- **T+60 days**: Warning escalates to error in development environment, alerts sent to high-volume consumers
- **T+90 days**: Endpoint removed from codebase, returns 410 Gone in production

**Deprecation Headers**:
```http
HTTP/1.1 200 OK
Sunset: Wed, 01 May 2026 00:00:00 GMT
Deprecation: true
Link: </api/v2/investigations>; rel="alternate"
```

**Schema Marking**:
```yaml
paths:
  /api/v1/investigations/:
    post:
      deprecated: true
      description: "DEPRECATED: Use /api/v2/investigations instead. This endpoint will be removed on 2026-05-01."
```

---

## Testing Strategy

### Test Pyramid

```
        /\
       /  \    E2E Tests (5%)
      /____\   - Full user workflows
     /      \
    /        \ Integration Tests (25%)
   /__________\ - API contract tests
  /            \ - Cross-service integration
 /              \
/________________\ Unit Tests (70%)
                   - Business logic
                   - Component tests
```

### Contract Testing

**Backend Contract Tests** (Python + schemathesis):
```python
# test/contract/test_investigations_contract.py
import schemathesis

schema = schemathesis.from_uri("http://localhost:8090/openapi.json")

@schema.parametrize()
def test_api_contract(case):
    """Test all endpoints match OpenAPI schema"""
    response = case.call()
    case.validate_response(response)
```

**Frontend Contract Tests** (TypeScript + Dredd):
```yaml
# dredd.yml
language: nodejs
server: npm run start:backend
reporter: [markdown]
endpoint: http://localhost:8090/openapi.json
hooks:
  - ./test/dredd-hooks.ts
```

**Contract Test Coverage**:
- Every endpoint MUST have contract test
- Every request parameter MUST be tested with valid/invalid values
- Every response field MUST be validated against schema
- Every error case MUST have test with expected status code

### Integration Testing

**API Integration Tests** (TypeScript + Jest):
```typescript
// test/integration/investigation-api.test.ts
describe('Investigation API Integration', () => {
  it('creates investigation with time_range', async () => {
    const request: StructuredInvestigationRequest = {
      entity_id: '192.168.1.1',
      entity_type: 'ip',
      time_range: {
        start_time: '2025-01-15T00:00:00Z',
        end_time: '2025-01-16T23:59:59Z'
      }
    };

    const response = await investigationApi.createInvestigation(request);

    expect(response.investigation_id).toMatch(/^inv_[a-z0-9]+$/);
    expect(response.status).toBe('IN_PROGRESS');
  });

  it('validates required fields', async () => {
    const invalidRequest = { entity_type: 'ip' }; // missing entity_id

    await expect(
      investigationApi.createInvestigation(invalidRequest as any)
    ).rejects.toThrow('entity_id is required');
  });
});
```

### E2E Testing

**End-to-End Tests** (Playwright):
```typescript
// e2e/investigation-flow.spec.ts
test('complete investigation workflow', async ({ page }) => {
  await page.goto('/investigations/new');
  await page.fill('[data-testid="entity-id"]', '192.168.1.1');
  await page.selectOption('[data-testid="entity-type"]', 'ip');
  await page.click('[data-testid="submit"]');

  await expect(page.locator('[data-testid="investigation-status"]')).toContainText('IN_PROGRESS');
});
```

### Test Execution

**CI Pipeline Tests**:
1. **PR Creation**: Run contract tests (60s), block if failed
2. **Pre-Merge**: Run integration tests (120s), require pass
3. **Pre-Deploy**: Run full test suite including E2E (300s)
4. **Post-Deploy**: Run smoke tests (30s), rollback if failed

**Local Development**:
```bash
# Frontend
npm run test:contract     # Contract tests only
npm run test:integration  # Integration tests
npm run test:e2e          # E2E tests
npm run test              # All tests

# Backend
poetry run pytest test/contract/      # Contract tests
poetry run pytest test/integration/   # Integration tests
poetry run pytest                     # All tests
```

---

## Tooling & Automation

### Schema Generation Tools

**Backend** (FastAPI):
- Built-in OpenAPI generation: `/openapi.json` endpoint
- Custom schema hooks for additional metadata
- Versioning via `app.version = "2.1.0"`

**Frontend** (TypeScript):
- `openapi-typescript`: Generate TypeScript types from schema
- `openapi-typescript-codegen`: Generate API client functions
- Scripts: `npm run generate-api-types`

### Contract Testing Tools

**Backend**:
- `schemathesis`: Property-based contract testing
- `pytest-openapi`: Validate OpenAPI schema in tests
- `fastapi.testclient`: Test client with automatic schema validation

**Frontend**:
- `dredd`: API contract testing against OpenAPI spec
- `jest`: Unit and integration testing
- `@anatine/zod-openapi`: Runtime schema validation (optional)

### Schema Diff Tools

**Breaking Change Detection**:
- `oasdiff`: Detect breaking changes between schemas
- Integrated into CI pipeline as PR check
- Output: Human-readable changelog with severity levels

**Schema Comparison**:
```bash
oasdiff breaking openapi-v1.json openapi-v2.json
oasdiff changelog openapi-v1.json openapi-v2.json
```

### CI/CD Integration

**GitHub Actions Workflow**:
```yaml
name: API Contract Validation

on: [pull_request]

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Backend: Generate schema
      - name: Generate OpenAPI Schema
        run: |
          cd olorin-server
          poetry install
          poetry run python -c "from app.main import app; import json; print(json.dumps(app.openapi()))" > openapi-pr.json

      # Fetch main branch schema
      - name: Fetch Main Schema
        run: curl -o openapi-main.json https://api.olorin.com/openapi.json

      # Detect breaking changes
      - name: Check Breaking Changes
        run: |
          oasdiff breaking openapi-main.json openapi-pr.json
          if [ $? -ne 0 ]; then
            echo "::error::Breaking changes detected. See diff above."
            exit 1
          fi

      # Frontend: Generate types
      - name: Generate Frontend Types
        run: |
          cd olorin-front
          npm ci
          npm run generate-api-types -- --input ../olorin-server/openapi-pr.json

      # Run contract tests
      - name: Run Contract Tests
        run: |
          cd olorin-server
          poetry run pytest test/contract/ -v
```

### Deployment Tools

**Canary Deployment**:
- AWS/GCP load balancer with traffic splitting
- 10% traffic to new version, 90% to stable
- Monitor error rates, latency, schema validation failures
- Auto-rollback if thresholds exceeded

**Rollback Mechanism**:
- Blue-green deployment with instant traffic switch
- Kubernetes rollout with `kubectl rollout undo`
- CloudFormation stack rollback
- Maximum rollback time: 120 seconds

---

## Rollout, Canary, & Rollback

### Deployment Pipeline

**Stages**:
1. **Build**: Compile code, generate schema, run contract tests
2. **Staging Deploy**: Deploy to staging environment, run smoke tests
3. **Canary Deploy**: Deploy to 10% production traffic
4. **Monitor**: Watch metrics for 15 minutes
5. **Full Deploy**: Roll out to 100% if canary successful
6. **Rollback**: Automatic rollback if canary fails

### Canary Strategy

**Configuration**:
```yaml
# k8s/canary-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: olorin-backend-canary
spec:
  selector:
    app: olorin-backend
    version: canary
  ports:
    - port: 8090
---
# Traffic split: 10% canary, 90% stable
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: olorin-backend
spec:
  hosts:
    - olorin-backend
  http:
    - match:
        - headers:
            canary:
              exact: "true"
      route:
        - destination:
            host: olorin-backend-canary
    - route:
        - destination:
            host: olorin-backend-stable
          weight: 90
        - destination:
            host: olorin-backend-canary
          weight: 10
```

**Monitoring Metrics**:
- Error rate: < 5% (rollback if exceeded)
- Latency p95: < 500ms (alert if exceeded)
- Schema validation failures: < 1% (alert if exceeded)
- HTTP 5xx rate: < 0.1% (rollback if exceeded)

**Success Criteria**:
- All metrics within thresholds for 15 minutes
- Zero critical alerts fired
- No manual intervention required

### Rollback Procedures

**Automatic Rollback Triggers**:
1. Error rate > 5% for 5 minutes
2. HTTP 5xx rate > 0.1% for 3 minutes
3. Schema validation failures > 1% for 5 minutes
4. Manual rollback request from on-call engineer

**Rollback Execution**:
```bash
# Kubernetes
kubectl rollout undo deployment/olorin-backend

# AWS ECS
aws ecs update-service --service olorin-backend --force-new-deployment --task-definition olorin-backend:previous

# Verify rollback
curl https://api.olorin.com/health
# Expected: {"status": "healthy", "version": "2.0.9"}
```

**Rollback Time**:
- Detection: < 30 seconds (automated monitoring)
- Decision: < 10 seconds (automated threshold check)
- Execution: < 60 seconds (traffic switch)
- Verification: < 20 seconds (health check)
- **Total: < 120 seconds**

### Version Migration

**Scenario**: Deploying v2 API while maintaining v1

**Steps**:
1. **Deploy v2 alongside v1**: Both versions running simultaneously
2. **Update schema registry**: Register v2 schema, mark v1 as deprecated
3. **Frontend migration**: Gradual rollout of v2 client code
4. **Monitor v1 usage**: Track requests to v1 endpoints
5. **Sunset v1**: After 90 days, remove v1 endpoints

**Traffic Management**:
```typescript
// Frontend client with version fallback
const apiClient = createApiClient({
  preferredVersion: 'v2',
  fallbackVersion: 'v1',
  onVersionMismatch: (error) => {
    console.warn('API version mismatch, falling back to v1', error);
  }
});
```

---

## Observability & Compliance

### Monitoring

**Key Metrics**:
1. **Schema Validation Failures**:
   - Metric: `api.schema_validation.failures`
   - Alert: > 10 per minute
   - Action: Page on-call engineer

2. **Contract Test Pass Rate**:
   - Metric: `ci.contract_tests.pass_rate`
   - Target: 100%
   - Alert: < 95%

3. **API Error Rate**:
   - Metric: `api.requests.error_rate`
   - Target: < 1%
   - Alert: > 5%

4. **Deprecated Endpoint Usage**:
   - Metric: `api.deprecated.requests`
   - Dashboard: Show trend over time
   - Alert: Usage spike (> 20% increase)

5. **Type Generation Failures**:
   - Metric: `frontend.type_generation.failures`
   - Alert: Any failure
   - Action: Block deployment

### Logging

**Schema Validation Logs**:
```json
{
  "timestamp": "2025-01-16T10:30:00Z",
  "level": "ERROR",
  "message": "Schema validation failure",
  "request_id": "req_abc123",
  "endpoint": "/api/v1/investigations",
  "method": "POST",
  "validation_error": {
    "loc": ["body", "time_range", "start_time"],
    "msg": "Invalid ISO 8601 timestamp format",
    "type": "value_error"
  },
  "user_id": "user_123",
  "ip_address": "203.0.113.42"
}
```

**Contract Test Logs**:
```json
{
  "timestamp": "2025-01-16T10:25:00Z",
  "level": "INFO",
  "message": "Contract test passed",
  "test_id": "test_create_investigation",
  "endpoint": "/api/v1/investigations",
  "duration_ms": 245,
  "schema_version": "2.1.0"
}
```

### Alerting

**PagerDuty Integration**:
- Critical: Schema validation failures > 10/min → Page on-call
- High: Contract tests failing in CI → Slack notification
- Medium: Deprecated endpoint usage spike → Email to team
- Low: Schema generation warnings → Log only

**Alert Runbook**:
```markdown
# Schema Validation Failure Alert

## Symptoms
- High rate of 422 errors from backend
- Schema validation failures in logs

## Investigation
1. Check logs for specific validation errors
2. Identify affected endpoint and field
3. Review recent schema changes

## Resolution
1. If frontend bug: Rollback frontend deployment
2. If backend bug: Rollback backend deployment
3. If intentional change: Update documentation and communicate to team
```

### Tracing

**Distributed Tracing** (OpenTelemetry):
```python
# Backend: Add trace context to requests
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("validate_request_schema"):
    validate_schema(request_body)
```

**Trace Visualization**:
- Request received
  - Schema validation (5ms)
  - Authentication (10ms)
  - Business logic (200ms)
  - Response serialization (5ms)
  - Response validation (3ms)
- Total: 223ms

### Compliance

**Audit Trail**:
- All schema changes logged with timestamp, author, and version
- All breaking changes require approval with recorded justification
- All rollbacks logged with trigger reason and timestamp

**Data Privacy**:
- Validation error logs sanitize sensitive fields (passwords, tokens)
- Request/response bodies not logged in production
- PII fields masked in monitoring dashboards

---

## Documentation & DevEx

### API Documentation

**Swagger UI** (`/docs`):
- Interactive API explorer
- Live request testing against development backend
- Example requests with realistic data
- Response schema visualization
- Authentication testing

**ReDoc** (`/redoc`):
- Clean, readable API documentation
- Printable/exportable format
- Code samples in multiple languages
- Search functionality

### Developer Guides

**Getting Started Guide** (`docs/api/getting-started.md`):
```markdown
# Getting Started with Olorin API

## Prerequisites
- Node.js 18+
- Access to Olorin backend (development: http://localhost:8090)

## Setup
1. Generate API types:
   ```bash
   npm run generate-api-types
   ```

2. Import and use:
   ```typescript
   import { investigationApi } from '@/api/generated';

   const investigation = await investigationApi.createInvestigation({
     entity_id: '192.168.1.1',
     entity_type: 'ip'
   });
   ```

## Authentication
- Obtain JWT token from `/auth/login`
- Include in requests: `Authorization: Bearer <token>`

## Error Handling
- 400: Bad request (client error)
- 401: Unauthorized (invalid/expired token)
- 422: Validation error (schema mismatch)
- 500: Server error (backend issue)
```

**Migration Guide** (`docs/api/migration-v1-to-v2.md`):
```markdown
# Migrating from API v1 to v2

## Breaking Changes

### Time Range Parameter
**v1**: Single `date_range_days` integer
```typescript
{ entity_id: '192.168.1.1', date_range_days: 7 }
```

**v2**: Explicit `time_range` object
```typescript
{
  entity_id: '192.168.1.1',
  time_range: {
    start_time: '2025-01-15T00:00:00Z',
    end_time: '2025-01-16T23:59:59Z'
  }
}
```

## Migration Steps
1. Update type imports to use v2 types
2. Replace `date_range_days` with `time_range` object
3. Test with v2 development backend
4. Deploy frontend, backend will handle both v1 and v2
```

### Code Examples

**Example Repository** (`examples/api-usage/`):
```typescript
// examples/api-usage/create-investigation.ts
import { investigationApi, StructuredInvestigationRequest } from '@/api/generated';

async function createInvestigation() {
  const request: StructuredInvestigationRequest = {
    entity_id: '192.168.1.1',
    entity_type: 'ip',
    time_range: {
      start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date().toISOString()
    }
  };

  try {
    const response = await investigationApi.createInvestigation(request);
    console.log('Investigation created:', response.investigation_id);
  } catch (error) {
    if (error.status === 422) {
      console.error('Validation error:', error.detail);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}
```

### Developer Experience Tools

**VS Code Extension** (Future):
- Auto-complete for API endpoints
- Inline schema documentation
- Error highlighting for schema mismatches

**CLI Tool** (`olorin-cli`):
```bash
# Validate request against schema
olorin validate-request --endpoint POST /api/v1/investigations --body request.json

# Compare schemas
olorin diff-schemas v2.0.0 v2.1.0

# Test endpoint
olorin test-endpoint POST /api/v1/investigations --auth-token <token>
```

---

## RACI, Ownership, & Calendar

### RACI Matrix

| Activity | Backend Team | Frontend Team | DevOps | Tech Lead | Product |
|----------|-------------|---------------|--------|-----------|---------|
| Schema Definition | R/A | C | I | A | C |
| Type Generation | I | R/A | C | I | I |
| Contract Tests (Backend) | R/A | C | I | A | I |
| Contract Tests (Frontend) | C | R/A | I | A | I |
| Breaking Change Approval | C | C | I | R/A | C |
| Deployment Pipeline | I | I | R/A | A | I |
| Monitoring Setup | C | C | R/A | A | I |
| Documentation | R | R | I | A | C |
| Version Migration Plan | C | C | I | R/A | A |
| Incident Response | C | C | R/A | A | I |

**Legend**:
- R = Responsible (does the work)
- A = Accountable (final approval)
- C = Consulted (provides input)
- I = Informed (kept up to date)

### Team Ownership

**Backend Team**:
- Owns OpenAPI schema generation
- Responsible for backend contract tests
- Maintains backend documentation
- Approves breaking changes impacting schema

**Frontend Team**:
- Owns type generation setup
- Responsible for frontend contract tests
- Maintains frontend API client
- Approves breaking changes impacting frontend usage

**DevOps Team**:
- Owns CI/CD pipeline integration
- Responsible for deployment automation
- Maintains monitoring and alerting
- Executes rollback procedures

**Tech Lead**:
- Final approval for breaking changes
- Defines version migration strategy
- Resolves cross-team conflicts
- Reviews architecture decisions

### Release Calendar

**Sprint Cadence**: 2-week sprints

**Week 1**:
- Day 1-2: Development
- Day 3-4: PR reviews, contract tests
- Day 5: Staging deployment

**Week 2**:
- Day 1: Canary deployment (Monday morning)
- Day 2-3: Monitor canary, address issues
- Day 4: Full production rollout (Thursday morning)
- Day 5: Retrospective, plan next sprint

**Version Release Schedule**:
- **Minor versions**: Every 2 weeks (sprint cadence)
- **Major versions**: Quarterly (Q1, Q2, Q3, Q4)
- **Patch versions**: As needed (bug fixes, hotfixes)

**Deprecation Timeline**:
- **T+0**: Deprecation announced in sprint planning
- **T+30 days**: Warning headers added
- **T+60 days**: Documentation updated, communication sent
- **T+90 days**: Endpoint removed

### Communication Channels

**Schema Changes**:
- Announce in #api-changes Slack channel
- Include in sprint review demo
- Document in changelog (CHANGELOG.md)

**Breaking Changes**:
- RFC (Request for Comments) document
- Team meeting discussion
- Approval recorded in RACI tracker

**Incidents**:
- PagerDuty alert to on-call engineer
- Post-mortem document within 48 hours
- Lessons learned shared with all teams

---

## Acceptance Criteria

### Implementation Checklist

**Phase 1: Foundation (Sprint 1-2)**
- [ ] OpenAPI 3.1 schema generation from FastAPI backend
- [ ] TypeScript type generation from OpenAPI schema
- [ ] Basic contract tests for top 10 endpoints
- [ ] CI pipeline integration (PR checks)
- [ ] Swagger UI documentation accessible

**Phase 2: Automation (Sprint 3-4)**
- [ ] Automated breaking change detection (oasdiff)
- [ ] Contract test coverage for all endpoints
- [ ] API client function generation
- [ ] Deployment pipeline with canary strategy
- [ ] Monitoring dashboards for key metrics

**Phase 3: Resilience (Sprint 5-6)**
- [ ] Automated rollback on failure
- [ ] Version negotiation support
- [ ] Deprecation warning system
- [ ] Schema diff visualization
- [ ] Alert runbooks for common issues

**Phase 4: Optimization (Sprint 7-8)**
- [ ] Performance optimization (< 10ms overhead)
- [ ] Enhanced developer documentation
- [ ] CLI tool for schema operations
- [ ] Advanced monitoring (distributed tracing)
- [ ] Team training and onboarding materials

### Validation Gates

**Gate 1: Schema Generation**
- Backend generates valid OpenAPI 3.1 schema
- Schema includes all endpoints, models, and validation rules
- Frontend successfully generates TypeScript types
- Types compile without errors

**Gate 2: Contract Testing**
- All endpoints have passing contract tests
- Contract tests run in < 60 seconds
- CI blocks PRs with failing contract tests
- Coverage metric shows 95%+ endpoint coverage

**Gate 3: Deployment Safety**
- Canary deployment catches breaking changes
- Automated rollback completes < 120 seconds
- Monitoring alerts fire correctly on failures
- Zero production incidents from interface issues

**Gate 4: Developer Experience**
- Documentation is accessible and up-to-date
- Type generation takes < 10 seconds
- Developers report improved productivity
- Support tickets for API issues reduced 70%+

### Success Metrics (90-day review)

**Reliability**:
- [ ] Zero production incidents from interface incompatibility
- [ ] 100% of breaking changes detected in CI before merge
- [ ] 95%+ successful canary deployments

**Quality**:
- [ ] 100% contract test coverage for all endpoints
- [ ] < 1% schema validation failures in production
- [ ] Zero false negatives in breaking change detection

**Developer Experience**:
- [ ] 80% reduction in time spent on API integration debugging
- [ ] 70% reduction in support tickets for API questions
- [ ] 90% developer satisfaction score (survey)

**Operational**:
- [ ] Contract tests execute in < 60 seconds
- [ ] Rollback time < 120 seconds (95th percentile)
- [ ] API documentation updated within 60 seconds of changes

---

## Appendices

### Appendix A: OpenAPI Schema Example

```yaml
openapi: 3.1.0
info:
  title: Olorin Investigation API
  version: 2.1.0
  description: Enterprise fraud detection and investigation platform
paths:
  /api/v1/investigations/:
    post:
      summary: Start structured investigation
      operationId: createInvestigation
      tags: [Investigations]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/StructuredInvestigationRequest'
            examples:
              ip_investigation:
                summary: IP investigation with time range
                value:
                  entity_id: "192.168.1.1"
                  entity_type: "ip"
                  time_range:
                    start_time: "2025-01-15T00:00:00Z"
                    end_time: "2025-01-16T23:59:59Z"
      responses:
        '200':
          description: Investigation started successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StructuredInvestigationResponse'
        '422':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ValidationError'
components:
  schemas:
    StructuredInvestigationRequest:
      type: object
      required: [entity_id, entity_type]
      properties:
        entity_id:
          type: string
          description: Entity identifier to investigate
          example: "192.168.1.1"
        entity_type:
          type: string
          enum: [ip, email, device_id, user_id]
          description: Type of entity
        time_range:
          $ref: '#/components/schemas/TimeRange'
    TimeRange:
      type: object
      required: [start_time, end_time]
      properties:
        start_time:
          type: string
          format: date-time
          description: Start of time range (ISO 8601)
          example: "2025-01-15T00:00:00Z"
        end_time:
          type: string
          format: date-time
          description: End of time range (ISO 8601)
          example: "2025-01-16T23:59:59Z"
```

### Appendix B: CI Pipeline Configuration

```yaml
# .github/workflows/api-contract-validation.yml
name: API Contract Validation

on:
  pull_request:
    paths:
      - 'olorin-server/**'
      - 'olorin-front/**'

jobs:
  validate-contracts:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install backend dependencies
        run: |
          cd olorin-server
          pip install poetry
          poetry install

      - name: Generate current schema
        run: |
          cd olorin-server
          poetry run python -c "from app.main import app; import json; print(json.dumps(app.openapi()))" > openapi-pr.json

      - name: Fetch main branch schema
        run: |
          git fetch origin main
          git show origin/main:olorin-server/openapi.json > openapi-main.json || echo "{}" > openapi-main.json

      - name: Install oasdiff
        run: |
          wget https://github.com/Tufin/oasdiff/releases/download/v1.8.0/oasdiff_1.8.0_linux_amd64.tar.gz
          tar -xzf oasdiff_1.8.0_linux_amd64.tar.gz
          chmod +x oasdiff

      - name: Check for breaking changes
        id: breaking-changes
        run: |
          ./oasdiff breaking openapi-main.json openapi-pr.json --format json > breaking-changes.json
          if [ -s breaking-changes.json ]; then
            echo "breaking=true" >> $GITHUB_OUTPUT
            echo "::error::Breaking changes detected"
            cat breaking-changes.json
            exit 1
          else
            echo "breaking=false" >> $GITHUB_OUTPUT
          fi

      - name: Generate TypeScript types
        run: |
          cd olorin-front
          npm ci
          npx openapi-typescript ../olorin-server/openapi-pr.json -o src/api/generated/types.ts

      - name: Run backend contract tests
        run: |
          cd olorin-server
          poetry run pytest test/contract/ -v --junitxml=contract-test-results.xml

      - name: Publish test results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: olorin-server/contract-test-results.xml
```

### Appendix C: Contract Test Examples

**Backend Contract Test**:
```python
# olorin-server/test/contract/test_investigations_api.py
import pytest
import schemathesis
from app.main import app

schema = schemathesis.from_asgi("/openapi.json", app)

@schema.parametrize()
@pytest.mark.contract
def test_api_matches_schema(case):
    """
    Property-based test: All API endpoints match OpenAPI schema
    Schemathesis generates test cases from schema and validates responses
    """
    response = case.call_asgi()
    case.validate_response(response)

@pytest.mark.contract
def test_create_investigation_valid_request():
    """Test creating investigation with valid time_range"""
    from fastapi.testclient import TestClient
    client = TestClient(app)

    response = client.post("/api/v1/investigations/", json={
        "entity_id": "192.168.1.1",
        "entity_type": "ip",
        "time_range": {
            "start_time": "2025-01-15T00:00:00Z",
            "end_time": "2025-01-16T23:59:59Z"
        }
    })

    assert response.status_code == 200
    assert "investigation_id" in response.json()

@pytest.mark.contract
def test_create_investigation_invalid_time_range():
    """Test validation error for invalid time range"""
    from fastapi.testclient import TestClient
    client = TestClient(app)

    response = client.post("/api/v1/investigations/", json={
        "entity_id": "192.168.1.1",
        "entity_type": "ip",
        "time_range": {
            "start_time": "2025-01-16T00:00:00Z",
            "end_time": "2025-01-15T00:00:00Z"  # End before start
        }
    })

    assert response.status_code == 422
    error = response.json()["detail"][0]
    assert "end_time must be after start_time" in error["msg"]
```

**Frontend Contract Test**:
```typescript
// olorin-front/test/contract/investigation-api.contract.test.ts
import { investigationApi } from '@/api/generated';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Investigation API Contract', () => {
  it('creates investigation matching response schema', async () => {
    server.use(
      rest.post('http://localhost:8090/api/v1/investigations/', (req, res, ctx) => {
        return res(ctx.json({
          investigation_id: 'inv_123abc',
          status: 'IN_PROGRESS',
          created_at: '2025-01-16T10:30:00Z'
        }));
      })
    );

    const response = await investigationApi.createInvestigation({
      entity_id: '192.168.1.1',
      entity_type: 'ip'
    });

    expect(response.investigation_id).toMatch(/^inv_[a-z0-9]+$/);
    expect(response.status).toBe('IN_PROGRESS');
    expect(response.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('handles validation errors matching error schema', async () => {
    server.use(
      rest.post('http://localhost:8090/api/v1/investigations/', (req, res, ctx) => {
        return res(
          ctx.status(422),
          ctx.json({
            detail: [{
              loc: ['body', 'entity_id'],
              msg: 'field required',
              type: 'value_error.missing'
            }]
          })
        );
      })
    );

    await expect(
      investigationApi.createInvestigation({ entity_type: 'ip' } as any)
    ).rejects.toThrow('field required');
  });
});
```

### Appendix D: Monitoring Dashboard

**Grafana Dashboard Configuration**:
```json
{
  "dashboard": {
    "title": "API Contract Health",
    "panels": [
      {
        "title": "Schema Validation Failures (Last Hour)",
        "type": "graph",
        "targets": [{
          "expr": "rate(api_schema_validation_failures_total[1h])",
          "legendFormat": "{{endpoint}}"
        }],
        "alert": {
          "conditions": [{
            "evaluator": { "type": "gt", "params": [10] },
            "operator": { "type": "and" },
            "query": { "params": ["A", "1m", "now"] }
          }],
          "notifications": [{"uid": "pagerduty"}]
        }
      },
      {
        "title": "Contract Test Pass Rate",
        "type": "stat",
        "targets": [{
          "expr": "(sum(ci_contract_tests_passed) / sum(ci_contract_tests_total)) * 100"
        }],
        "thresholds": [
          { "value": 95, "color": "red" },
          { "value": 99, "color": "yellow" },
          { "value": 100, "color": "green" }
        ]
      },
      {
        "title": "Deprecated Endpoint Usage",
        "type": "graph",
        "targets": [{
          "expr": "sum by (endpoint) (rate(api_deprecated_requests_total[24h]))",
          "legendFormat": "{{endpoint}}"
        }]
      },
      {
        "title": "Type Generation Success Rate",
        "type": "stat",
        "targets": [{
          "expr": "(sum(frontend_type_generation_success) / sum(frontend_type_generation_total)) * 100"
        }]
      }
    ]
  }
}
```

### Appendix E: Rollback Checklist

**Pre-Rollback Checklist**:
- [ ] Identify failing version (e.g., v2.1.0)
- [ ] Identify last known good version (e.g., v2.0.9)
- [ ] Verify rollback target is available in registry
- [ ] Notify team in #incidents Slack channel
- [ ] Create incident ticket in JIRA

**Rollback Execution**:
- [ ] Execute rollback command (kubectl/aws cli/etc.)
- [ ] Verify health check returns 200 OK
- [ ] Verify version endpoint returns correct version
- [ ] Check monitoring dashboards for error rate drop
- [ ] Verify frontend continues functioning

**Post-Rollback Actions**:
- [ ] Update incident ticket with rollback details
- [ ] Schedule post-mortem within 48 hours
- [ ] Create bug ticket for root cause analysis
- [ ] Block PR that caused issue from re-merging
- [ ] Document lessons learned

**Post-Mortem Template**:
```markdown
# Incident Post-Mortem: API Contract Failure

## Incident Summary
- **Date**: 2025-01-16
- **Duration**: 10:30 - 10:45 (15 minutes)
- **Impact**: 5% error rate on POST /investigations
- **Root Cause**: Breaking change in time_range validation

## Timeline
- 10:30: Deployment started (v2.1.0)
- 10:32: Canary deployment detected errors
- 10:33: Automated rollback initiated
- 10:35: Rollback completed (v2.0.9)
- 10:45: All systems normal

## Root Cause
Backend added stricter validation for time_range field but schema was not updated. Frontend sent requests matching old schema, backend rejected with 422.

## Action Items
1. [ ] Add pre-deployment schema validation to pipeline
2. [ ] Update contract tests to cover validation edge cases
3. [ ] Improve error messages to indicate schema mismatch
4. [ ] Review approval process for validation changes

## Lessons Learned
- Schema must be updated BEFORE validation logic changes
- Contract tests should include edge cases for validation rules
- Canary deployment caught issue before full rollout
```

---

## Risk Register

| Risk ID | Risk Description | Likelihood | Impact | Mitigation | Owner |
|---------|-----------------|------------|--------|------------|-------|
| R-001 | Schema generation fails during deployment | Low | High | Fail-fast validation in CI, pre-deployment checks | DevOps |
| R-002 | Type generation produces incorrect types | Medium | High | Contract tests validate generated types, manual review for major changes | Frontend |
| R-003 | Breaking change slips through detection | Low | Critical | Multiple validation layers (oasdiff, contract tests, canary), manual approval for suspected changes | Tech Lead |
| R-004 | Rollback fails or takes too long | Low | Critical | Regular rollback drills, automated testing of rollback procedures, multiple rollback mechanisms | DevOps |
| R-005 | Deprecated endpoint still heavily used after sunset | Medium | Medium | Progressive warning system, usage monitoring, direct communication with high-volume consumers | Product |
| R-006 | Contract tests become too slow | Medium | Medium | Parallelize test execution, optimize test data, selective test runs | Backend |
| R-007 | Schema drift between environments | Low | High | Environment-specific schema validation, deployment pipeline ensures consistency | DevOps |
| R-008 | Frontend and backend versions out of sync | Medium | Medium | Version negotiation support, backward compatibility enforcement | Tech Lead |
| R-009 | Monitoring fails to detect issues | Low | High | Monitoring of monitoring (meta-monitoring), backup alerting systems | DevOps |
| R-010 | Documentation becomes outdated | High | Medium | Automated documentation generation, CI checks for documentation updates | All Teams |

---

## Roadmap

### Quarter 1: Foundation (Weeks 1-12)
**Sprint 1-2: Schema Generation & Type Generation**
- Week 1-2: Implement OpenAPI schema generation from FastAPI
- Week 3-4: Setup TypeScript type generation from schema
- Week 5-6: Integrate into CI pipeline
- **Milestone**: Generated types used in production

**Sprint 3-4: Contract Testing**
- Week 7-8: Implement backend contract tests with schemathesis
- Week 9-10: Implement frontend contract tests with dredd
- Week 11-12: Achieve 95% endpoint coverage
- **Milestone**: Contract tests blocking bad deployments

### Quarter 2: Automation (Weeks 13-24)
**Sprint 5-6: Breaking Change Detection**
- Week 13-14: Integrate oasdiff for breaking change detection
- Week 15-16: Setup PR blocking for breaking changes
- Week 17-18: Implement approval workflow for breaking changes
- **Milestone**: Zero unintentional breaking changes

**Sprint 7-8: Deployment Safety**
- Week 19-20: Implement canary deployment strategy
- Week 21-22: Setup automated rollback on failure
- Week 23-24: Monitoring and alerting for canary health
- **Milestone**: Automated rollback working in production

### Quarter 3: Resilience (Weeks 25-36)
**Sprint 9-10: API Versioning**
- Week 25-26: Implement URL-based versioning (/api/v1/, /api/v2/)
- Week 27-28: Setup version negotiation via Accept headers
- Week 29-30: Deploy v1 and v2 simultaneously
- **Milestone**: Multiple API versions running in production

**Sprint 11-12: Deprecation System**
- Week 31-32: Implement deprecation warning headers
- Week 33-34: Setup usage monitoring for deprecated endpoints
- Week 35-36: Complete first deprecation cycle (v1 → v2)
- **Milestone**: Successful v1 sunset with zero incidents

### Quarter 4: Optimization (Weeks 37-48)
**Sprint 13-14: Performance & Observability**
- Week 37-38: Optimize schema validation performance (< 5ms)
- Week 39-40: Implement distributed tracing
- Week 41-42: Enhanced monitoring dashboards
- **Milestone**: < 10ms overhead for all contract enforcement

**Sprint 15-16: Developer Experience**
- Week 43-44: Create CLI tool for schema operations
- Week 45-46: Build VS Code extension (auto-complete, validation)
- Week 47-48: Comprehensive documentation and training
- **Milestone**: 90% developer satisfaction score

---

## Conclusion

This Frontend-Backend Interface Compatibility Plan establishes a comprehensive, automated system for guaranteeing interface compatibility between the Olorin frontend and backend. By implementing schema-first development with auto-generated types, contract testing, automated breaking change detection, and canary deployments with automatic rollback, we eliminate an entire class of production incidents while enabling independent team deployment.

The plan prioritizes developer experience with interactive documentation, type-safe API clients, and clear error messages, while maintaining production reliability through multiple validation layers and robust rollback procedures. Success will be measured by zero compatibility-related incidents, 100% contract test coverage, and significant reductions in integration debugging time.

Implementation follows a phased approach over 4 quarters, with each phase delivering immediate value and building upon the previous foundation. The roadmap ensures that by the end of Q4, teams can develop independently with confidence that interface compatibility is guaranteed through automated tooling rather than manual coordination.
