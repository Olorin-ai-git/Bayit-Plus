# Contract: OpenAPI Schema Generation

**Branch**: `001-frontend-backend-interface` | **Date**: 2025-11-01 | **Spec**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md)

## Contract Overview

This contract defines the rules and guarantees for OpenAPI 3.1 schema generation from the FastAPI backend. The OpenAPI schema serves as the single source of truth for interface compatibility between frontend and backend.

**Contract Purpose**: Ensure FastAPI automatically generates valid, complete, and consistent OpenAPI 3.1 schemas from Pydantic models.

**Parties**:
- **Provider**: Olorin Backend (FastAPI + Pydantic)
- **Consumer**: Frontend build process, Contract tests, Breaking change detection

## Schema Generation Rules

### 1. Automatic Schema Generation

**Rule**: FastAPI MUST automatically generate OpenAPI 3.1 schema from route definitions and Pydantic models.

**Backend Obligations**:
- Use Pydantic BaseModel for all request/response models
- Use FastAPI route decorators with `response_model` parameter
- Include docstrings on routes and models for descriptions
- Provide examples via `Config.json_schema_extra` or `Field(example=...)`

**Guaranteed Behavior**:
```python
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="Olorin Investigation API",
    version="1.0.0",
    description="Structured fraud detection and investigation platform"
)

class TimeRange(BaseModel):
    """Time range filter for investigation data"""
    start_time: str = Field(..., description="Start of time range (ISO 8601)")
    end_time: str = Field(..., description="End of time range (ISO 8601)")

@app.post("/api/v1/investigations/", response_model=InvestigationResponse)
async def create_investigation(request: InvestigationRequest):
    """Start structured fraud investigation"""
    # Schema automatically includes:
    # - Request body schema from InvestigationRequest
    # - Response schema from InvestigationResponse
    # - Descriptions from docstrings
    # - Examples from Field() definitions
    pass
```

**Contract Guarantee**: Schema available at `/openapi.json` within 5 seconds of application startup.

### 2. Schema Completeness

**Rule**: Generated schema MUST include all endpoints, request/response models, parameters, and authentication.

**Required Components**:
- `info`: API title, version, description
- `paths`: All endpoints with methods, parameters, request/response schemas
- `components.schemas`: All Pydantic models as reusable schemas
- `components.securitySchemes`: JWT authentication definition
- `security`: Global security requirements

**Validation**:
```bash
# Schema must validate against OpenAPI 3.1 specification
npx @apidevtools/swagger-cli validate openapi.json
```

**Contract Guarantee**: Schema passes OpenAPI 3.1 validation with zero errors.

### 3. Schema Consistency

**Rule**: Schema generation MUST be deterministic and consistent across restarts.

**Backend Obligations**:
- Schema structure remains stable unless code changes
- Field order in schemas is consistent
- Enum values maintain order
- No random or time-based schema generation

**Contract Guarantee**: Two consecutive schema generations produce identical JSON (excluding metadata timestamps).

### 4. Type Mappings

**Rule**: Pydantic types MUST map to correct OpenAPI types with appropriate formats.

**Type Mapping Table**:

| Pydantic Type | OpenAPI Type | OpenAPI Format | Notes |
|---------------|--------------|----------------|-------|
| `str` | `string` | - | Default string |
| `int` | `integer` | - | 32-bit integer |
| `float` | `number` | `float` | Floating point |
| `bool` | `boolean` | - | True/false |
| `datetime` | `string` | `date-time` | ISO 8601 format |
| `date` | `string` | `date` | YYYY-MM-DD format |
| `UUID` | `string` | `uuid` | UUID format |
| `EmailStr` | `string` | `email` | Email format |
| `HttpUrl` | `string` | `uri` | URL format |
| `List[T]` | `array` | - | Items type from T |
| `Dict[str, T]` | `object` | - | additionalProperties: T |
| `Optional[T]` | T | - | nullable/not required |
| `Literal["a", "b"]` | `string` | - | enum: ["a", "b"] |
| `Enum` | `string` | - | enum: [values] |

**Contract Guarantee**: All Pydantic types map correctly with no unsupported types.

### 5. Required vs Optional Fields

**Rule**: Schema MUST correctly identify required and optional fields based on Pydantic model definitions.

**Backend Obligations**:
```python
from pydantic import BaseModel
from typing import Optional

class InvestigationRequest(BaseModel):
    entity_id: str                    # Required (no default, no Optional)
    entity_type: str                  # Required
    time_range: Optional[TimeRange]   # Optional (wrapped in Optional)
    correlation_mode: str = "OR"      # Optional (has default value)
```

**Schema Output**:
```json
{
  "InvestigationRequest": {
    "type": "object",
    "required": ["entity_id", "entity_type"],
    "properties": {
      "entity_id": {"type": "string"},
      "entity_type": {"type": "string"},
      "time_range": {"$ref": "#/components/schemas/TimeRange"},
      "correlation_mode": {"type": "string", "default": "OR"}
    }
  }
}
```

**Contract Guarantee**: `required` array contains exactly the fields without defaults or Optional.

### 6. Validation Rules

**Rule**: Schema MUST include validation constraints from Pydantic Field() definitions.

**Backend Obligations**:
```python
from pydantic import BaseModel, Field

class InvestigationRequest(BaseModel):
    entity_id: str = Field(..., min_length=1, max_length=255)
    risk_threshold: int = Field(..., ge=0, le=100)
    tags: List[str] = Field(default=[], max_items=10)
```

**Schema Output**:
```json
{
  "entity_id": {"type": "string", "minLength": 1, "maxLength": 255},
  "risk_threshold": {"type": "integer", "minimum": 0, "maximum": 100},
  "tags": {"type": "array", "items": {"type": "string"}, "maxItems": 10}
}
```

**Contract Guarantee**: All Field() constraints appear in schema with correct OpenAPI equivalents.

### 7. Examples and Descriptions

**Rule**: Schema MUST include human-readable descriptions and examples for all models and fields.

**Backend Obligations**:
```python
class TimeRange(BaseModel):
    """Time range filter for investigation data"""
    start_time: str = Field(
        ...,
        description="Start of time range (ISO 8601)",
        example="2025-10-15T00:00:00Z"
    )
    end_time: str = Field(
        ...,
        description="End of time range (ISO 8601)",
        example="2025-10-16T23:59:59Z"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "start_time": "2025-10-15T00:00:00Z",
                "end_time": "2025-10-16T23:59:59Z"
            }
        }
```

**Contract Guarantee**:
- All models have descriptions from docstrings
- All fields have descriptions from Field()
- All models have examples from Config.json_schema_extra or Field(example=...)

### 8. Response Status Codes

**Rule**: Schema MUST document all possible response status codes with appropriate schemas.

**Backend Obligations**:
```python
from fastapi import HTTPException, status

@app.post(
    "/api/v1/investigations/",
    response_model=InvestigationResponse,
    status_code=201,
    responses={
        201: {"description": "Investigation created successfully"},
        400: {"description": "Invalid request", "model": ErrorResponse},
        401: {"description": "Unauthorized", "model": ErrorResponse},
        422: {"description": "Validation error", "model": ErrorResponse}
    }
)
async def create_investigation(request: InvestigationRequest):
    pass
```

**Contract Guarantee**: Schema documents 2xx, 4xx, and 5xx responses with appropriate models.

### 9. Authentication Schemas

**Rule**: Schema MUST define security schemes and requirements for authenticated endpoints.

**Backend Obligations**:
```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer

app = FastAPI()
security = HTTPBearer()

@app.post("/api/v1/investigations/")
async def create_investigation(
    request: InvestigationRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    pass
```

**Schema Output**:
```json
{
  "components": {
    "securitySchemes": {
      "HTTPBearer": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  },
  "security": [{"HTTPBearer": []}]
}
```

**Contract Guarantee**: All authenticated endpoints include security requirements in schema.

### 10. Schema Versioning

**Rule**: Schema version MUST match API version and follow semantic versioning.

**Backend Obligations**:
```python
app = FastAPI(
    title="Olorin Investigation API",
    version="1.0.0",  # MAJOR.MINOR.PATCH
    description="Structured fraud detection and investigation platform"
)
```

**Versioning Rules**:
- **MAJOR**: Breaking changes (field removal, type changes)
- **MINOR**: Backward-compatible additions (new optional fields, new endpoints)
- **PATCH**: Bug fixes, documentation updates (no schema changes)

**Contract Guarantee**: Schema version increments according to semantic versioning rules.

## Schema Access and Distribution

### 1. Schema Endpoint

**Rule**: Schema MUST be available at `/openapi.json` endpoint.

**Backend Obligations**:
- Serve schema at `/openapi.json` (default FastAPI behavior)
- Optionally serve at `/docs` for Swagger UI
- Optionally serve at `/redoc` for ReDoc UI

**Contract Guarantee**:
- Schema accessible via HTTP GET `/openapi.json`
- Response content-type: `application/json`
- Response time: < 100ms (cached after first generation)

### 2. Schema Caching

**Rule**: Schema MUST be generated once at startup and cached for subsequent requests.

**Performance Requirements**:
- Initial generation: < 5 seconds on application startup
- Cached retrieval: < 100ms per request
- Memory overhead: < 10MB for schema storage

**Contract Guarantee**: Schema generation does not block application startup.

### 3. Schema Export

**Rule**: Schema MUST be exportable to file for CI/CD pipeline use.

**Backend Obligations**:
```python
# olorin-server/scripts/export-openapi-schema.py
import json
from app.main import app

# Export schema to file
with open("openapi.json", "w") as f:
    json.dump(app.openapi(), f, indent=2)
```

**Contract Guarantee**: Exported schema file is valid JSON and matches `/openapi.json` endpoint.

## Schema Validation

### 1. OpenAPI Specification Compliance

**Rule**: Generated schema MUST validate against OpenAPI 3.1 specification.

**Validation Tools**:
- `@apidevtools/swagger-cli` for schema validation
- `spectral` for API linting
- `openapi-generator` for client generation testing

**Validation Command**:
```bash
npx @apidevtools/swagger-cli validate openapi.json
```

**Contract Guarantee**: Schema passes validation with zero errors, zero warnings.

### 2. Contract Test Integration

**Rule**: Schema MUST be consumable by contract testing tools (schemathesis, dredd).

**Backend Obligations**:
- Schema includes all required OpenAPI 3.1 components
- Examples are valid and executable
- Authentication schemes are testable

**Contract Guarantee**: Contract tests can execute against schema without manual modifications.

### 3. Breaking Change Detection

**Rule**: Schema changes MUST be detectable via oasdiff tool.

**Validation Command**:
```bash
oasdiff breaking openapi-v1.json openapi-v2.json
```

**Contract Guarantee**: oasdiff accurately detects all breaking changes with < 1% false negatives.

## Error Handling

### 1. Schema Generation Failures

**Rule**: Schema generation failures MUST prevent application startup.

**Backend Obligations**:
```python
try:
    app = FastAPI(...)
    schema = app.openapi()  # Validate schema generation
except Exception as e:
    logger.error(f"Schema generation failed: {e}")
    raise RuntimeError("Application cannot start without valid schema")
```

**Contract Guarantee**: Application refuses to start if schema generation fails.

### 2. Invalid Model Definitions

**Rule**: Invalid Pydantic models MUST be detected during schema generation.

**Example Invalid Models**:
```python
# ❌ INVALID: Unsupported type
class BadModel(BaseModel):
    custom_field: CustomType  # Not supported by Pydantic

# ❌ INVALID: Circular reference without handling
class Node(BaseModel):
    children: List[Node]  # Requires update_forward_refs()
```

**Contract Guarantee**: FastAPI raises clear errors for invalid model definitions during startup.

## Backward Compatibility

### 1. Schema Evolution

**Rule**: Schema changes MUST follow backward compatibility rules.

**Safe Changes** (no version bump required):
- Adding optional fields
- Adding new endpoints
- Adding new response status codes
- Adding examples or descriptions

**Breaking Changes** (require MAJOR version bump):
- Removing fields
- Renaming fields
- Changing field types
- Making optional fields required
- Removing endpoints
- Changing response status codes

**Contract Guarantee**: Backend refuses to deploy breaking changes without version bump.

### 2. Deprecation Warnings

**Rule**: Deprecated fields/endpoints MUST include deprecation warnings in schema.

**Backend Obligations**:
```python
class InvestigationRequest(BaseModel):
    entity_id: str = Field(..., description="Entity identifier", deprecated=True)
    entity_identifier: str = Field(..., description="Entity identifier (replaces entity_id)")
```

**Schema Output**:
```json
{
  "entity_id": {"type": "string", "deprecated": true, "description": "Use entity_identifier instead"}
}
```

**Contract Guarantee**: Deprecated fields marked in schema for 90 days before removal.

## Testing Requirements

### 1. Schema Validation Tests

**Rule**: Backend MUST include automated tests for schema validation.

**Test Coverage**:
```python
# test/unit/test_openapi_schema.py
import pytest
from app.main import app

def test_schema_is_valid_openapi():
    """Verify schema validates against OpenAPI 3.1 spec"""
    schema = app.openapi()
    assert "openapi" in schema
    assert schema["openapi"].startswith("3.1")

def test_schema_has_required_components():
    """Verify schema includes all required sections"""
    schema = app.openapi()
    assert "info" in schema
    assert "paths" in schema
    assert "components" in schema

def test_all_endpoints_have_descriptions():
    """Verify all endpoints have descriptions"""
    schema = app.openapi()
    for path, methods in schema["paths"].items():
        for method, details in methods.items():
            assert "description" in details, f"{method.upper()} {path} missing description"
```

**Contract Guarantee**: 100% of endpoints and models have automated validation tests.

### 2. Contract Test Integration

**Rule**: Schema MUST be tested with contract testing tools in CI pipeline.

**Test Command**:
```bash
pytest test/contract/test_investigations_contract.py --schemathesis
```

**Contract Guarantee**: Contract tests run on every PR and block merge on failure.

## Performance Requirements

| Metric | Target | Measured By |
|--------|--------|-------------|
| Initial schema generation | < 5s | Application startup time |
| Schema retrieval (cached) | < 100ms | `/openapi.json` response time |
| Schema file size | < 2MB | JSON file size |
| Schema complexity | < 100 schemas | Number of components.schemas |

**Contract Guarantee**: All performance targets met in production environment.

## Success Criteria

1. ✅ FastAPI automatically generates valid OpenAPI 3.1 schema
2. ✅ Schema includes all endpoints, models, validation rules, examples
3. ✅ Schema passes OpenAPI 3.1 validation with zero errors
4. ✅ Schema is deterministic and consistent across restarts
5. ✅ Schema accessible at `/openapi.json` with < 100ms response time
6. ✅ Contract tests execute successfully against schema
7. ✅ Breaking changes detected by oasdiff with < 1% false negatives
8. ✅ Schema changes follow semantic versioning rules
9. ✅ Deprecated fields marked for 90-day sunset period
10. ✅ 100% test coverage for schema validation

## References

- **OpenAPI 3.1 Specification**: https://spec.openapis.org/oas/v3.1.0
- **FastAPI Schema Generation**: https://fastapi.tiangolo.com/advanced/extending-openapi/
- **Pydantic JSON Schema**: https://docs.pydantic.dev/latest/concepts/json_schema/
- **Feature Spec**: [../spec.md](../spec.md)
- **Implementation Plan**: [../plan.md](../plan.md)
- **Data Model**: [../data-model.md](../data-model.md)
