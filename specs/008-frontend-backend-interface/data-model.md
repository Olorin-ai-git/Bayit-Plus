# Data Model: Frontend-Backend Interface Compatibility

**Branch**: `001-frontend-backend-interface` | **Date**: 2025-11-01 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

This document defines the data models, schema structures, and type mappings that enable guaranteed interface compatibility between the Olorin frontend (React TypeScript) and backend (Python FastAPI). The OpenAPI 3.1 schema serves as the single source of truth, with Pydantic models on the backend automatically generating the schema, and TypeScript types on the frontend automatically generated from the schema.

**Design Principle**: Schema-First Development
- Backend: Pydantic Models → OpenAPI Schema (automatic)
- Frontend: OpenAPI Schema → TypeScript Types (automatic)
- Contract: OpenAPI Schema validates both sides

## OpenAPI Schema Structure

### Schema Components

The OpenAPI schema is organized into reusable components following the OpenAPI 3.1 specification:

```yaml
openapi: 3.1.0
info:
  title: Olorin Investigation API
  version: 1.0.0
  description: Structured fraud detection and investigation platform

components:
  schemas:
    # Core domain models
    TimeRange:
      type: object
      description: Time range filter for investigation data
      properties:
        start_time:
          type: string
          format: date-time
          description: Start of time range (ISO 8601)
          example: "2025-10-15T00:00:00Z"
        end_time:
          type: string
          format: date-time
          description: End of time range (ISO 8601)
          example: "2025-10-16T23:59:59Z"
      required:
        - start_time
        - end_time

    EntityType:
      type: string
      description: Type of entity being investigated
      enum:
        - email
        - phone
        - device_id
        - ip_address
        - user_id
      example: email

    InvestigationStatus:
      type: string
      description: Current status of investigation
      enum:
        - pending
        - in_progress
        - completed
        - failed
      example: in_progress

    InvestigationRequest:
      type: object
      description: Request to start structured investigation
      properties:
        entity_id:
          type: string
          description: Identifier of entity to investigate
          example: "user@example.com"
        entity_type:
          $ref: '#/components/schemas/EntityType'
        time_range:
          $ref: '#/components/schemas/TimeRange'
          description: Optional time range filter (defaults to 7 days if not provided)
        correlation_mode:
          type: string
          enum: [OR, AND]
          default: OR
          description: How to correlate multiple entities
      required:
        - entity_id
        - entity_type

    InvestigationResponse:
      type: object
      description: Investigation details
      properties:
        investigation_id:
          type: string
          format: uuid
          description: Unique investigation identifier
          example: "550e8400-e29b-41d4-a716-446655440000"
        entity_id:
          type: string
          description: Identifier of investigated entity
        entity_type:
          $ref: '#/components/schemas/EntityType'
        status:
          $ref: '#/components/schemas/InvestigationStatus'
        time_range:
          $ref: '#/components/schemas/TimeRange'
        risk_score:
          type: number
          format: float
          minimum: 0
          maximum: 100
          description: Overall risk score (0-100)
          example: 75.5
        created_at:
          type: string
          format: date-time
          description: Investigation creation timestamp
        completed_at:
          type: string
          format: date-time
          nullable: true
          description: Investigation completion timestamp (null if in progress)
      required:
        - investigation_id
        - entity_id
        - entity_type
        - status
        - created_at

    ErrorResponse:
      type: object
      description: Error response structure
      properties:
        error:
          type: string
          description: Error type/code
          example: "VALIDATION_ERROR"
        message:
          type: string
          description: Human-readable error message
          example: "Invalid entity_type: must be one of [email, phone, device_id, ip_address, user_id]"
        details:
          type: object
          additionalProperties: true
          description: Additional error context
      required:
        - error
        - message

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT authentication token

security:
  - BearerAuth: []

paths:
  /api/v1/investigations/:
    post:
      summary: Create new investigation
      description: Start structured fraud investigation for specified entity
      operationId: createInvestigation
      tags:
        - investigations
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/InvestigationRequest'
      responses:
        '201':
          description: Investigation created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InvestigationResponse'
        '400':
          description: Invalid request parameters
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized - missing or invalid JWT token
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '422':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /api/v1/investigations/{investigation_id}:
    get:
      summary: Get investigation details
      description: Retrieve details of specific investigation
      operationId: getInvestigation
      tags:
        - investigations
      parameters:
        - name: investigation_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
          description: Investigation unique identifier
      responses:
        '200':
          description: Investigation details retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InvestigationResponse'
        '404':
          description: Investigation not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
```

### Schema Generation Flow

**Backend (FastAPI + Pydantic)**:

```python
# olorin-server/app/router/models/structured_investigation_models.py
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum

class EntityType(str, Enum):
    """Type of entity being investigated"""
    EMAIL = "email"
    PHONE = "phone"
    DEVICE_ID = "device_id"
    IP_ADDRESS = "ip_address"
    USER_ID = "user_id"

class TimeRange(BaseModel):
    """Time range filter for investigation data"""
    start_time: datetime = Field(..., description="Start of time range (ISO 8601)")
    end_time: datetime = Field(..., description="End of time range (ISO 8601)")

    class Config:
        json_schema_extra = {
            "example": {
                "start_time": "2025-10-15T00:00:00Z",
                "end_time": "2025-10-16T23:59:59Z"
            }
        }

class InvestigationRequest(BaseModel):
    """Request to start structured investigation"""
    entity_id: str = Field(..., description="Identifier of entity to investigate")
    entity_type: EntityType
    time_range: Optional[TimeRange] = Field(
        None,
        description="Optional time range filter (defaults to 7 days if not provided)"
    )
    correlation_mode: Literal["OR", "AND"] = Field(
        default="OR",
        description="How to correlate multiple entities"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "entity_id": "user@example.com",
                "entity_type": "email",
                "time_range": {
                    "start_time": "2025-10-15T00:00:00Z",
                    "end_time": "2025-10-16T23:59:59Z"
                }
            }
        }

class InvestigationResponse(BaseModel):
    """Investigation details"""
    investigation_id: str = Field(..., description="Unique investigation identifier")
    entity_id: str
    entity_type: EntityType
    status: Literal["pending", "in_progress", "completed", "failed"]
    time_range: Optional[TimeRange]
    risk_score: float = Field(..., ge=0, le=100, description="Overall risk score (0-100)")
    created_at: datetime
    completed_at: Optional[datetime] = None

# olorin-server/app/main.py
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(
    title="Olorin Investigation API",
    version="1.0.0",
    description="Structured fraud detection and investigation platform"
)

@app.post(
    "/api/v1/investigations/",
    response_model=InvestigationResponse,
    status_code=201,
    tags=["investigations"],
    summary="Create new investigation",
    description="Start structured fraud investigation for specified entity"
)
async def create_investigation(request: InvestigationRequest):
    """
    Start structured fraud investigation for specified entity.

    Returns investigation details with unique ID and initial status.
    """
    # Implementation
    pass

# OpenAPI schema is automatically available at /openapi.json
```

**Key Features**:
- Pydantic models define structure with Field() for descriptions and validation
- Enums map to OpenAPI enum types
- Optional fields map to nullable/optional in schema
- Examples provided via Config.json_schema_extra
- FastAPI route decorators define response models, status codes, descriptions
- Schema automatically generated at `/openapi.json` endpoint

## TypeScript Interface Mappings

### Automatic Type Generation

**Frontend Type Generation**:

```bash
# olorin-front/scripts/generate-api-types.sh
#!/bin/bash

BACKEND_URL="${BACKEND_URL:-http://localhost:8090}"

# Generate TypeScript types from OpenAPI schema
npx openapi-typescript ${BACKEND_URL}/openapi.json \
  --output src/api/generated/types.ts

# Generate API client with fetch wrapper
npx openapi-typescript-codegen \
  --input ${BACKEND_URL}/openapi.json \
  --output src/api/generated \
  --client fetch \
  --useOptions \
  --useUnionTypes

echo "✅ TypeScript types generated successfully"
```

**Generated TypeScript Types**:

```typescript
// olorin-front/src/api/generated/types.ts (auto-generated)

/**
 * Type of entity being investigated
 */
export enum EntityType {
  EMAIL = "email",
  PHONE = "phone",
  DEVICE_ID = "device_id",
  IP_ADDRESS = "ip_address",
  USER_ID = "user_id"
}

/**
 * Time range filter for investigation data
 */
export interface TimeRange {
  /** Start of time range (ISO 8601) */
  start_time: string; // format: date-time
  /** End of time range (ISO 8601) */
  end_time: string; // format: date-time
}

/**
 * Request to start structured investigation
 */
export interface InvestigationRequest {
  /** Identifier of entity to investigate */
  entity_id: string;
  entity_type: EntityType;
  /** Optional time range filter (defaults to 7 days if not provided) */
  time_range?: TimeRange;
  /** How to correlate multiple entities */
  correlation_mode?: "OR" | "AND";
}

/**
 * Investigation details
 */
export interface InvestigationResponse {
  /** Unique investigation identifier */
  investigation_id: string; // format: uuid
  entity_id: string;
  entity_type: EntityType;
  status: "pending" | "in_progress" | "completed" | "failed";
  time_range?: TimeRange;
  /** Overall risk score (0-100) */
  risk_score: number; // min: 0, max: 100
  created_at: string; // format: date-time
  completed_at?: string | null; // format: date-time
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  /** Error type/code */
  error: string;
  /** Human-readable error message */
  message: string;
  /** Additional error context */
  details?: Record<string, any>;
}
```

**Generated API Client**:

```typescript
// olorin-front/src/api/generated/api.ts (auto-generated)

import type { InvestigationRequest, InvestigationResponse, ErrorResponse } from './types';

export class InvestigationsService {
  /**
   * Create new investigation
   * Start structured fraud investigation for specified entity
   * @param requestBody
   * @returns InvestigationResponse Investigation created successfully
   * @throws ApiError
   */
  public static async createInvestigation(
    requestBody: InvestigationRequest
  ): Promise<InvestigationResponse> {
    const response = await fetch('/api/v1/investigations/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new ApiError(response.status, error);
    }

    return response.json();
  }

  /**
   * Get investigation details
   * Retrieve details of specific investigation
   * @param investigationId Investigation unique identifier
   * @returns InvestigationResponse Investigation details retrieved successfully
   * @throws ApiError
   */
  public static async getInvestigation(
    investigationId: string
  ): Promise<InvestigationResponse> {
    const response = await fetch(`/api/v1/investigations/${investigationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new ApiError(response.status, error);
    }

    return response.json();
  }
}
```

### Type Mapping Rules

**Python Pydantic → OpenAPI → TypeScript**:

| Pydantic Type | OpenAPI Type | TypeScript Type | Notes |
|---------------|--------------|-----------------|-------|
| `str` | `string` | `string` | Direct mapping |
| `int` | `integer` | `number` | JS has no separate integer type |
| `float` | `number` | `number` | Direct mapping |
| `bool` | `boolean` | `boolean` | Direct mapping |
| `datetime` | `string` (format: date-time) | `string` | ISO 8601 string, requires parsing |
| `Optional[T]` | nullable/optional | `T \| undefined` | Optional fields |
| `Literal["a", "b"]` | enum | `"a" \| "b"` | Union types |
| `Enum` | enum | `enum` | Named enums |
| `List[T]` | array | `T[]` | Array types |
| `Dict[str, T]` | object (additionalProperties) | `Record<string, T>` | Dictionary/map types |
| `BaseModel` | object (schema ref) | `interface` | Nested objects |

**Special Cases**:

1. **snake_case → camelCase Transformation**:
   - Backend: `entity_id`, `time_range`, `created_at`
   - Frontend: Configurable via openapi-typescript-codegen
   - **Decision**: Keep snake_case for consistency with backend (easier debugging)

2. **Date/Time Handling**:
   - Backend: Python `datetime` objects
   - Schema: ISO 8601 strings (`2025-10-15T00:00:00Z`)
   - Frontend: TypeScript `string`, parse with `new Date()` or date-fns

3. **UUID Types**:
   - Backend: `str` with UUID validation
   - Schema: `string` with `format: uuid`
   - Frontend: `string`, validation via regex if needed

4. **Enums**:
   - Backend: Python `Enum` or `Literal`
   - Schema: `enum` array
   - Frontend: TypeScript `enum` or union types

## API Versioning Strategy

### URL-Based Versioning (Recommended)

**Pattern**: `/api/{version}/{resource}/`

**Examples**:
- `/api/v1/investigations/` - Version 1
- `/api/v2/investigations/` - Version 2

**Backend Implementation**:

```python
# olorin-server/app/main.py
from fastapi import FastAPI

app = FastAPI()

# Version 1 routes
from .router.v1 import investigations as v1_investigations
app.include_router(
    v1_investigations.router,
    prefix="/api/v1",
    tags=["v1", "investigations"]
)

# Version 2 routes (new fields, breaking changes)
from .router.v2 import investigations as v2_investigations
app.include_router(
    v2_investigations.router,
    prefix="/api/v2",
    tags=["v2", "investigations"]
)
```

**Frontend Implementation**:

```typescript
// olorin-front/src/api/config.ts
export const API_CONFIG = {
  baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090',
  version: process.env.REACT_APP_API_VERSION || 'v1', // Configurable version
  timeout: parseInt(process.env.REACT_APP_REQUEST_TIMEOUT_MS || '30000')
};

// olorin-front/src/api/client.ts
import { API_CONFIG } from './config';

export class ApiClient {
  private baseUrl: string;

  constructor(version: string = API_CONFIG.version) {
    this.baseUrl = `${API_CONFIG.baseUrl}/api/${version}`;
  }

  async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.json());
    }

    return response.json();
  }
}

// Usage
const clientV1 = new ApiClient('v1');
const clientV2 = new ApiClient('v2');
```

### Version Migration Path

**Scenario**: Add new required field `risk_threshold` to InvestigationRequest

**Version 1 (Existing)**:
```python
class InvestigationRequest(BaseModel):
    entity_id: str
    entity_type: EntityType
    time_range: Optional[TimeRange] = None
```

**Version 2 (Breaking Change)**:
```python
class InvestigationRequestV2(BaseModel):
    entity_id: str
    entity_type: EntityType
    time_range: Optional[TimeRange] = None
    risk_threshold: int = Field(..., ge=0, le=100)  # NEW REQUIRED FIELD
```

**Migration Steps**:

1. **Deploy v2 backend** (both v1 and v2 endpoints live)
2. **Update frontend gradually**:
   ```typescript
   // Phase 1: Feature flag for v2
   const apiVersion = featureFlags.enableV2API ? 'v2' : 'v1';
   const client = new ApiClient(apiVersion);

   // Phase 2: A/B test v2 with 10% of users
   const apiVersion = Math.random() < 0.1 ? 'v2' : 'v1';

   // Phase 3: Full rollout to v2
   const apiVersion = 'v2';
   ```
3. **Deprecation warnings** (Sunset header):
   ```python
   @app.post("/api/v1/investigations/")
   async def create_investigation_v1(request: InvestigationRequest):
       return InvestigationResponse(
           headers={"Sunset": "Wed, 15 Jan 2026 00:00:00 GMT"}
       )
   ```
4. **Sunset v1** after 90-day deprecation period

**Version Negotiation**:

Frontend can detect available versions:
```typescript
// olorin-front/src/api/version-detector.ts
export async function detectAvailableVersions(): Promise<string[]> {
  const versions = ['v1', 'v2', 'v3'];
  const available: string[] = [];

  for (const version of versions) {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/${version}/health`);
      if (response.ok) {
        available.push(version);
      }
    } catch {
      // Version not available
    }
  }

  return available;
}

// Use latest available version
const versions = await detectAvailableVersions();
const latestVersion = versions[versions.length - 1] || 'v1';
const client = new ApiClient(latestVersion);
```

## Schema Evolution Patterns

### Backward-Compatible Changes (Safe)

These changes do NOT require version bumps:

1. **Adding Optional Fields**:
   ```python
   # ✅ SAFE: Add optional field
   class InvestigationResponse(BaseModel):
       investigation_id: str
       entity_id: str
       status: str
       new_field: Optional[str] = None  # NEW OPTIONAL FIELD
   ```

2. **Adding New Endpoints**:
   ```python
   # ✅ SAFE: New endpoint
   @app.get("/api/v1/investigations/{id}/timeline")
   async def get_investigation_timeline(id: str):
       pass
   ```

3. **Adding Enum Values** (with caution):
   ```python
   # ✅ SAFE: Add new enum value (if frontend handles unknown values)
   class EntityType(str, Enum):
       EMAIL = "email"
       PHONE = "phone"
       SSN = "ssn"  # NEW VALUE
   ```

4. **Relaxing Validation**:
   ```python
   # ✅ SAFE: Remove maximum constraint
   risk_score: float = Field(..., ge=0)  # Was: ge=0, le=100
   ```

### Breaking Changes (Require Version Bump)

These changes REQUIRE new API version:

1. **Removing Fields**:
   ```python
   # ❌ BREAKING: Remove field
   class InvestigationResponse(BaseModel):
       investigation_id: str
       # entity_id: str  # REMOVED - breaks clients
       status: str
   ```

2. **Renaming Fields**:
   ```python
   # ❌ BREAKING: Rename field
   class InvestigationResponse(BaseModel):
       investigation_id: str
       entity_identifier: str  # Was: entity_id - breaks clients
   ```

3. **Changing Field Types**:
   ```python
   # ❌ BREAKING: Change type
   risk_score: int  # Was: float - breaks clients expecting decimals
   ```

4. **Making Optional Fields Required**:
   ```python
   # ❌ BREAKING: Make required
   time_range: TimeRange  # Was: Optional[TimeRange] - breaks clients not sending it
   ```

5. **Removing Enum Values**:
   ```python
   # ❌ BREAKING: Remove enum value
   class EntityType(str, Enum):
       EMAIL = "email"
       # PHONE = "phone"  # REMOVED - breaks clients using it
   ```

6. **Changing Response Status Codes**:
   ```python
   # ❌ BREAKING: Change status code
   @app.post("/api/v1/investigations/", status_code=200)  # Was: 201
   ```

### Schema Evolution Workflow

**Safe Change Example**:
```bash
# 1. Add optional field to Pydantic model
# 2. Restart backend → schema updated automatically
# 3. Regenerate frontend types: npm run generate-api-types
# 4. Frontend builds successfully (optional field handled gracefully)
# 5. Deploy backend and frontend independently
```

**Breaking Change Example**:
```bash
# 1. Create v2 models with breaking changes
# 2. Add v2 endpoints alongside v1
# 3. Generate separate v2 schema: /api/v2/openapi.json
# 4. Generate v2 TypeScript types in separate directory
# 5. Deploy backend with both v1 and v2
# 6. Gradually migrate frontend from v1 to v2 client
# 7. Deprecate v1 after 90 days
# 8. Remove v1 code after sunset period
```

## Data Validation

### Backend Validation (Pydantic)

```python
from pydantic import BaseModel, Field, validator, root_validator
from datetime import datetime, timedelta

class TimeRange(BaseModel):
    start_time: datetime
    end_time: datetime

    @validator('end_time')
    def end_after_start(cls, v, values):
        """Ensure end_time is after start_time"""
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('end_time must be after start_time')
        return v

    @root_validator
    def max_range_90_days(cls, values):
        """Ensure time range is not more than 90 days"""
        start = values.get('start_time')
        end = values.get('end_time')
        if start and end:
            if (end - start) > timedelta(days=90):
                raise ValueError('time_range cannot exceed 90 days')
        return values

class InvestigationRequest(BaseModel):
    entity_id: str = Field(..., min_length=1, max_length=255)
    entity_type: EntityType
    time_range: Optional[TimeRange] = None

    @validator('entity_id')
    def validate_entity_format(cls, v, values):
        """Validate entity_id format based on entity_type"""
        entity_type = values.get('entity_type')
        if entity_type == EntityType.EMAIL:
            # Simple email validation
            if '@' not in v:
                raise ValueError('Invalid email format')
        return v
```

### Frontend Validation (TypeScript)

```typescript
// olorin-front/src/api/validators.ts
import type { InvestigationRequest, TimeRange } from './generated/types';

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateTimeRange(timeRange: TimeRange): void {
  const start = new Date(timeRange.start_time);
  const end = new Date(timeRange.end_time);

  if (end <= start) {
    throw new ValidationError('end_time', 'end_time must be after start_time');
  }

  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 90) {
    throw new ValidationError('time_range', 'time_range cannot exceed 90 days');
  }
}

export function validateInvestigationRequest(request: InvestigationRequest): void {
  if (!request.entity_id || request.entity_id.trim().length === 0) {
    throw new ValidationError('entity_id', 'entity_id is required');
  }

  if (request.entity_id.length > 255) {
    throw new ValidationError('entity_id', 'entity_id cannot exceed 255 characters');
  }

  if (request.time_range) {
    validateTimeRange(request.time_range);
  }

  // Entity-specific validation
  if (request.entity_type === 'email' && !request.entity_id.includes('@')) {
    throw new ValidationError('entity_id', 'Invalid email format');
  }
}
```

## Performance Considerations

### Schema Generation Performance

**Backend (FastAPI)**:
- Schema generation happens once at startup
- Cached in memory for all subsequent requests
- Overhead: < 5 seconds on application startup
- No runtime cost for serving `/openapi.json`

**Frontend (Type Generation)**:
- Type generation happens during build process
- Overhead: < 10 seconds added to build time
- No runtime cost (types are compile-time only)

### Schema Validation Performance

**Backend Runtime Validation**:
```python
# Pydantic validation overhead: ~5ms per request
@app.post("/api/v1/investigations/")
async def create_investigation(request: InvestigationRequest):
    # Request validated automatically by Pydantic
    # Validation happens before this code executes
    pass
```

**Production Optimization**:
```python
from pydantic import BaseModel

class InvestigationRequest(BaseModel):
    class Config:
        # Optimization: Use assignment validation (faster)
        validate_assignment = False  # Only validate on creation

        # Optimization: Pre-compile validators
        arbitrary_types_allowed = False
```

## Next Steps

1. ✅ **Data Model Complete** - This document defines schema structure and type mappings
2. ⏳ **Create Contracts** - Define interface contracts for each component
3. ⏳ **Create Quick-Start Guide** - Developer workflow documentation
4. ⏳ **Implementation** - Begin Sprint 1 (OpenAPI schema generation + TypeScript types)

## References

- **OpenAPI 3.1 Specification**: https://spec.openapis.org/oas/v3.1.0
- **Pydantic Documentation**: https://docs.pydantic.dev/
- **openapi-typescript**: https://github.com/drwpow/openapi-typescript
- **FastAPI Schema Generation**: https://fastapi.tiangolo.com/advanced/extending-openapi/
- **Feature Spec**: [spec.md](./spec.md)
- **Implementation Plan**: [plan.md](./plan.md)
- **Technical Research**: [research.md](./research.md)
