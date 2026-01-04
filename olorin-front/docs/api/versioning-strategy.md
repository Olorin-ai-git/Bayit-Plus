# API Versioning Strategy

## Overview

This document defines the API versioning strategy for Olorin frontend-backend integration. It ensures backward compatibility, smooth version transitions, and clear communication of breaking changes.

**Constitutional Compliance**:
- Version numbers from configuration (API_PREFIX environment variable)
- No hardcoded API versions in code
- Automated version detection and validation
- Fail-fast behavior on version mismatches

## Versioning Scheme

### URL-Based Versioning

We use URL path versioning with the format: `/api/v{MAJOR}/`

**Example**:
```
https://api.olorin.example.com/api/v1/investigations/
https://api.olorin.example.com/api/v2/investigations/
```

**Constitutional Compliance**:
```python
# Backend (environment-driven)
API_PREFIX = os.getenv("API_PREFIX", "/api/v1")

# Frontend (environment-driven)
apiBaseUrl: process.env.REACT_APP_API_BASE_URL  # includes /api/v1
```

### Semantic Versioning

API versions follow semantic versioning principles:

- **MAJOR** (v1, v2, v3): Breaking changes that require client updates
- **MINOR**: Backward-compatible new features (handled via OpenAPI schema evolution)
- **PATCH**: Backward-compatible bug fixes (no version change needed)

## Version Lifecycle

### 1. Active Version (Current)

The current production API version (e.g., `v1`).

**Characteristics**:
- Full support and maintenance
- New features added as backward-compatible changes
- Bug fixes applied immediately
- OpenAPI schema continuously updated

### 2. Deprecated Version

Previous version marked for retirement but still functional.

**Characteristics**:
- Security updates only
- No new features
- Deprecation warnings in responses
- 6-month minimum support window

**Response Header**:
```http
Sunset: Sat, 01 Jun 2025 00:00:00 GMT
Deprecation: true
Link: </api/v2/investigations/>; rel="successor-version"
```

### 3. Retired Version

Version no longer accessible.

**Characteristics**:
- Returns HTTP 410 Gone
- Error response with migration guide link

## Breaking Changes

### What Constitutes a Breaking Change

**Require MAJOR version increment**:
- Removing endpoints
- Removing request/response fields
- Changing field types
- Renaming fields
- Changing authentication methods
- Modifying error response structure
- Changing HTTP status codes for existing responses

**Do NOT require version increment** (backward-compatible):
- Adding new endpoints
- Adding optional request fields
- Adding response fields
- Relaxing validation rules
- Adding new enum values (if clients handle unknowns)

## Version Migration Process

### Step 1: Announce Breaking Changes

**Timeline**: 3 months before release

- Update CHANGELOG.md with breaking changes
- Email notifications to API consumers
- In-app deprecation warnings

### Step 2: Deploy New Version Alongside Current

**Timeline**: Release day

```bash
# Backend supports both versions
/api/v1/investigations/  # Current (to be deprecated)
/api/v2/investigations/  # New version
```

### Step 3: Deprecation Period

**Duration**: 6 months minimum

- v1 marked as deprecated
- Sunset header added to v1 responses
- Migration guide published
- Contract tests run against both versions

### Step 4: Retirement

**Timeline**: After deprecation period

- v1 returns HTTP 410 Gone
- Error message includes migration guide URL
- Monitoring for v1 traffic

## Version Detection & Validation

### Frontend Version Check (Startup)

```typescript
// src/api/version-check.ts
export async function validateApiVersion(): Promise<void> {
  const config = getApiConfig();
  const response = await fetch(`${config.apiBaseUrl}/version`);
  const { version, deprecated, sunset } = await response.json();

  if (deprecated) {
    console.warn(`⚠️ API ${version} is deprecated. Sunset: ${sunset}`);
  }

  // Fail fast if version mismatch
  const expectedVersion = config.apiVersion; // from env
  if (version !== expectedVersion) {
    throw new Error(
      `API version mismatch! Expected: ${expectedVersion}, Got: ${version}`
    );
  }
}
```

### Backend Version Endpoint

```python
# app/router/version_router.py
@router.get("/version")
async def get_api_version():
    return {
        "version": "v1",
        "deprecated": False,
        "sunset": None,  # ISO 8601 date when deprecated
        "successor": None  # URL of next version
    }
```

## Contract Testing Across Versions

### Test Both Versions During Deprecation

```yaml
# dredd.yml (multi-version)
endpoint: http://localhost:8090/api/v1
blueprint: ./src/api/generated/openapi-v1.json

---

endpoint: http://localhost:8090/api/v2
blueprint: ./src/api/generated/openapi-v2.json
```

### Automated Version Comparison

```bash
npm run contract:compare-versions
# Compares v1 and v2 schemas
# Reports breaking changes
# Validates migration guide
```

## Schema Evolution Guidelines

### Adding Fields (Backward-Compatible)

**DO**:
```typescript
// v1 -> v1.1 (no version change)
interface InvestigationResponse {
  investigation_id: string;
  status: string;
  risk_score: number | null;
  // NEW: Optional field added
  created_by?: string;
}
```

**Clients**: Older clients ignore new field (backward compatible)

### Removing Fields (BREAKING)

**DON'T** in same version:
```typescript
// ❌ BREAKING CHANGE - requires v2
interface InvestigationResponse {
  investigation_id: string;
  status: string;
  // risk_score removed - BREAKING!
}
```

**DO** with new version:
```typescript
// v2 - new major version
interface InvestigationResponseV2 {
  investigation_id: string;
  status: string;
  // risk_score removed in v2
  // Documented in migration guide
}
```

### Changing Field Types (BREAKING)

**Transition Pattern**:

**v1.x** - Add new field, deprecate old:
```typescript
interface InvestigationResponse {
  risk_score: number | null;      // deprecated
  risk_assessment?: RiskAssessment;  // new structure
}
```

**v2** - Remove old field:
```typescript
interface InvestigationResponseV2 {
  risk_assessment: RiskAssessment;  // required in v2
}
```

## Environment Configuration

### Backend Configuration

```bash
# .env.example (backend)
API_VERSION=v1
API_PREFIX=/api/v1
API_DEPRECATED=false
API_SUNSET_DATE=  # ISO 8601 date
API_SUCCESSOR_URL=  # URL to next version
```

### Frontend Configuration

```bash
# .env.example (frontend)
REACT_APP_API_VERSION=v1
REACT_APP_API_BASE_URL=https://api.olorin.example.com/api/v1
REACT_APP_API_VERSION_CHECK_ENABLED=true
```

## Monitoring & Metrics

### Version Usage Tracking

**Metrics to Track**:
- Request count per API version
- Error rate per version
- Response time per version
- Client version distribution

**Alerts**:
- Traffic spike on deprecated version
- Errors on new version exceeding threshold
- Zero traffic on deprecated version (ready for retirement)

## Documentation Requirements

### Per-Version Documentation

Each API version requires:

1. **OpenAPI Specification**: `openapi-v{MAJOR}.json`
2. **Migration Guide**: `MIGRATION_v{PREV}-to-v{CURRENT}.md`
3. **Changelog**: Breaking changes, new features, deprecations
4. **Contract Tests**: Automated validation suite

### Migration Guide Template

```markdown
# Migration Guide: v1 to v2

## Breaking Changes

### 1. Risk Score Structure Changed

**v1**:
```json
{ "risk_score": 75.5 }
```

**v2**:
```json
{
  "risk_assessment": {
    "score": 75.5,
    "level": "high",
    "factors": [...]
  }
}
```

**Action Required**: Update client code to use `risk_assessment` object.

## Timeline

- **v2 Available**: 2025-01-15
- **v1 Deprecated**: 2025-01-15
- **v1 Sunset**: 2025-07-15

## Code Examples

[Code migration examples...]
```

## Related Documentation

- [Breaking Change Detection](./breaking-change-detection.md)
- [Backward Compatibility Testing](./backward-compatibility.md)
- [OpenAPI Schema Evolution](./schema-evolution.md)
- [API Deprecation Strategy](./deprecation-strategy.md)
