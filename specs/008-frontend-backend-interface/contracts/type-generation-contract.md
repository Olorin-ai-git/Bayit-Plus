# Contract: TypeScript Type Generation

**Branch**: `001-frontend-backend-interface` | **Date**: 2025-11-01 | **Spec**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md)

## Contract Overview

This contract defines the rules and guarantees for automatic TypeScript type generation from OpenAPI schemas. Generated types ensure type safety and interface compatibility in the frontend application.

**Contract Purpose**: Ensure TypeScript types accurately represent backend API contracts with compile-time type safety.

**Parties**:
- **Provider**: Frontend build process (openapi-typescript, openapi-typescript-codegen)
- **Consumer**: Frontend React components, API services, state management

## Type Generation Rules

### 1. Automatic Type Generation

**Rule**: TypeScript types MUST be automatically generated from OpenAPI schema without manual modifications.

**Frontend Obligations**:
```bash
# olorin-front/scripts/generate-api-types.sh
#!/bin/bash

BACKEND_URL="${BACKEND_URL:-http://localhost:8090}"

# Generate TypeScript interfaces from OpenAPI schema
npx openapi-typescript ${BACKEND_URL}/openapi.json \
  --output src/api/generated/types.ts

# Generate API client with type-safe fetch wrappers
npx openapi-typescript-codegen \
  --input ${BACKEND_URL}/openapi.json \
  --output src/api/generated \
  --client fetch \
  --useOptions \
  --useUnionTypes

echo "✅ TypeScript types generated successfully"
```

**Contract Guarantee**: Type generation completes in < 10 seconds with zero errors.

### 2. Type Mapping Accuracy

**Rule**: TypeScript types MUST accurately represent OpenAPI schema types.

**Type Mapping Table**:

| OpenAPI Type | OpenAPI Format | TypeScript Type | Example |
|--------------|----------------|-----------------|---------|
| `string` | - | `string` | `"example"` |
| `string` | `date-time` | `string` | `"2025-10-15T00:00:00Z"` |
| `string` | `date` | `string` | `"2025-10-15"` |
| `string` | `uuid` | `string` | `"550e8400-e29b-41d4-a716-446655440000"` |
| `string` | `email` | `string` | `"user@example.com"` |
| `string` | `uri` | `string` | `"https://example.com"` |
| `integer` | - | `number` | `42` |
| `number` | `float` | `number` | `3.14` |
| `boolean` | - | `boolean` | `true` |
| `array` | - | `T[]` | `["a", "b"]` |
| `object` | - | `interface` | `{key: value}` |
| `object` | additionalProperties | `Record<string, T>` | `{[key: string]: T}` |
| enum | - | `enum` or union | `"a" \| "b"` |
| nullable | - | `T \| null` | `string \| null` |
| optional | - | `T \| undefined` | `string?` |
| oneOf | - | `A \| B \| C` | Union types |
| allOf | - | `A & B & C` | Intersection types |
| anyOf | - | `A \| B \| C` | Union types |

**Contract Guarantee**: All OpenAPI types map to correct TypeScript equivalents.

### 3. Interface Generation

**Rule**: TypeScript interfaces MUST be generated for all OpenAPI schemas.

**Generated Interface Example**:

OpenAPI Schema:
```json
{
  "TimeRange": {
    "type": "object",
    "description": "Time range filter for investigation data",
    "required": ["start_time", "end_time"],
    "properties": {
      "start_time": {
        "type": "string",
        "format": "date-time",
        "description": "Start of time range (ISO 8601)"
      },
      "end_time": {
        "type": "string",
        "format": "date-time",
        "description": "End of time range (ISO 8601)"
      }
    }
  }
}
```

Generated TypeScript:
```typescript
/**
 * Time range filter for investigation data
 */
export interface TimeRange {
  /** Start of time range (ISO 8601) */
  start_time: string; // format: date-time
  /** End of time range (ISO 8601) */
  end_time: string; // format: date-time
}
```

**Contract Guarantee**: All schemas generate valid TypeScript interfaces with JSDoc comments.

### 4. Enum Generation

**Rule**: OpenAPI enums MUST generate TypeScript enums or union types.

**Option 1: TypeScript Enum** (default):
```typescript
export enum EntityType {
  EMAIL = "email",
  PHONE = "phone",
  DEVICE_ID = "device_id",
  IP_ADDRESS = "ip_address",
  USER_ID = "user_id"
}
```

**Option 2: Union Type** (with --useUnionTypes):
```typescript
export type EntityType = "email" | "phone" | "device_id" | "ip_address" | "user_id";
```

**Contract Guarantee**: Enum values match OpenAPI schema exactly.

### 5. Required vs Optional Fields

**Rule**: TypeScript interfaces MUST correctly represent required and optional fields.

**OpenAPI Schema**:
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

**Generated TypeScript**:
```typescript
export interface InvestigationRequest {
  entity_id: string;                  // Required (in 'required' array)
  entity_type: string;                // Required (in 'required' array)
  time_range?: TimeRange;             // Optional (not in 'required' array)
  correlation_mode?: string;          // Optional (not in 'required' array)
}
```

**Contract Guarantee**: Required fields have no `?`, optional fields have `?`.

### 6. Nullable Fields

**Rule**: Nullable fields MUST use TypeScript union with `null`.

**OpenAPI Schema**:
```json
{
  "completed_at": {
    "type": "string",
    "format": "date-time",
    "nullable": true
  }
}
```

**Generated TypeScript**:
```typescript
export interface InvestigationResponse {
  completed_at: string | null;  // Nullable field
}
```

**Contract Guarantee**: Nullable fields generate `T | null` union types.

### 7. Nested Objects

**Rule**: Nested object references MUST use TypeScript interface references.

**OpenAPI Schema**:
```json
{
  "InvestigationRequest": {
    "properties": {
      "time_range": {"$ref": "#/components/schemas/TimeRange"}
    }
  }
}
```

**Generated TypeScript**:
```typescript
export interface InvestigationRequest {
  time_range?: TimeRange;  // References TimeRange interface
}
```

**Contract Guarantee**: Schema `$ref` generates TypeScript interface references.

### 8. Array Types

**Rule**: Array types MUST use TypeScript array notation.

**OpenAPI Schema**:
```json
{
  "tags": {
    "type": "array",
    "items": {"type": "string"},
    "maxItems": 10
  }
}
```

**Generated TypeScript**:
```typescript
export interface InvestigationRequest {
  tags?: string[];  // Array of strings
}
```

**Contract Guarantee**: OpenAPI arrays generate TypeScript `T[]` notation.

### 9. Dictionary Types

**Rule**: Dictionary types MUST use TypeScript `Record<string, T>`.

**OpenAPI Schema**:
```json
{
  "metadata": {
    "type": "object",
    "additionalProperties": {"type": "string"}
  }
}
```

**Generated TypeScript**:
```typescript
export interface InvestigationRequest {
  metadata?: Record<string, string>;  // Dictionary with string values
}
```

**Contract Guarantee**: additionalProperties generates `Record<string, T>`.

### 10. Union and Intersection Types

**Rule**: oneOf/anyOf MUST generate union types, allOf MUST generate intersection types.

**Union Type Example**:
```json
{
  "result": {
    "oneOf": [
      {"$ref": "#/components/schemas/SuccessResponse"},
      {"$ref": "#/components/schemas/ErrorResponse"}
    ]
  }
}
```

**Generated TypeScript**:
```typescript
export type Result = SuccessResponse | ErrorResponse;
```

**Intersection Type Example**:
```json
{
  "ExtendedInvestigation": {
    "allOf": [
      {"$ref": "#/components/schemas/Investigation"},
      {"type": "object", "properties": {"extra_field": {"type": "string"}}}
    ]
  }
}
```

**Generated TypeScript**:
```typescript
export type ExtendedInvestigation = Investigation & {
  extra_field?: string;
};
```

**Contract Guarantee**: Schema composition generates correct TypeScript operators.

## API Client Generation

### 1. Typed API Functions

**Rule**: Generated API client MUST provide type-safe functions for all endpoints.

**Generated API Client**:
```typescript
// olorin-front/src/api/generated/api.ts
export class InvestigationsService {
  /**
   * Create new investigation
   * @param requestBody Investigation request
   * @returns InvestigationResponse Investigation created successfully
   * @throws ApiError
   */
  public static async createInvestigation(
    requestBody: InvestigationRequest
  ): Promise<InvestigationResponse> {
    const response = await fetch('/api/v1/investigations/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.json());
    }

    return response.json();
  }
}
```

**Contract Guarantee**: All endpoints generate type-safe API functions.

### 2. Request Body Typing

**Rule**: Request body parameters MUST use generated TypeScript interfaces.

**Usage Example**:
```typescript
import { InvestigationsService, InvestigationRequest } from './api/generated';

// ✅ VALID: Type-checked request
const request: InvestigationRequest = {
  entity_id: "user@example.com",
  entity_type: "email",
  time_range: {
    start_time: "2025-10-15T00:00:00Z",
    end_time: "2025-10-16T23:59:59Z"
  }
};

const response = await InvestigationsService.createInvestigation(request);

// ❌ COMPILE ERROR: Missing required field
const badRequest: InvestigationRequest = {
  entity_type: "email"  // Missing entity_id - TypeScript error!
};
```

**Contract Guarantee**: TypeScript compiler catches missing/invalid request fields.

### 3. Response Type Inference

**Rule**: API function return types MUST match OpenAPI response schemas.

**Type Inference Example**:
```typescript
// Response type is automatically inferred
const investigation = await InvestigationsService.createInvestigation(request);

// TypeScript knows exact response structure
console.log(investigation.investigation_id);  // ✅ Valid - TypeScript knows this field exists
console.log(investigation.invalid_field);     // ❌ Compile error - Field doesn't exist
```

**Contract Guarantee**: TypeScript provides autocomplete and type checking for responses.

### 4. Error Response Typing

**Rule**: Error responses MUST have typed error models.

**Generated Error Types**:
```typescript
export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, any>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: ErrorResponse
  ) {
    super(body.message);
  }
}
```

**Usage Example**:
```typescript
try {
  await InvestigationsService.createInvestigation(request);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error ${error.status}: ${error.body.message}`);
    console.error('Details:', error.body.details);
  }
}
```

**Contract Guarantee**: Error handling is type-safe with structured error models.

## Naming Conventions

### 1. Interface Naming

**Rule**: Interface names MUST match OpenAPI schema names exactly.

**OpenAPI Schema**: `InvestigationRequest`
**TypeScript Interface**: `export interface InvestigationRequest`

**Contract Guarantee**: No naming transformations applied to schema names.

### 2. Field Naming (snake_case Preservation)

**Rule**: Field names MUST preserve snake_case from backend (no camelCase transformation).

**Rationale**: Consistency with backend reduces debugging confusion.

**OpenAPI Schema**:
```json
{"entity_id": "string", "time_range": "object"}
```

**Generated TypeScript**:
```typescript
export interface InvestigationRequest {
  entity_id: string;    // ✅ Keep snake_case
  time_range?: TimeRange;  // ✅ Keep snake_case
}
```

**Contract Guarantee**: Field names match OpenAPI schema exactly (snake_case preserved).

### 3. Service Class Naming

**Rule**: Generated service classes MUST use PascalCase with `Service` suffix.

**OpenAPI Tag**: `investigations`
**Generated Class**: `export class InvestigationsService`

**Contract Guarantee**: Service class names derived from OpenAPI tags.

## Generated File Structure

**Rule**: Generated files MUST follow consistent directory structure.

**Directory Layout**:
```
olorin-front/src/api/generated/
├── types.ts              # All TypeScript interfaces and enums
├── api.ts                # API service classes with fetch wrappers
├── models/               # Individual model files (optional)
│   ├── InvestigationRequest.ts
│   ├── InvestigationResponse.ts
│   └── TimeRange.ts
└── services/             # Individual service files (optional)
    └── InvestigationsService.ts
```

**Contract Guarantee**: All generated files placed in `src/api/generated/` (gitignored).

## Build Integration

### 1. Pre-Build Type Generation

**Rule**: TypeScript types MUST be generated before frontend build.

**Package.json Script**:
```json
{
  "scripts": {
    "generate-api-types": "./scripts/generate-api-types.sh",
    "prebuild": "npm run generate-api-types",
    "build": "react-scripts build"
  }
}
```

**Contract Guarantee**: `npm run build` automatically regenerates types from latest schema.

### 2. Development Type Generation

**Rule**: Types MUST be regenerable during development for schema updates.

**Development Workflow**:
```bash
# Backend schema changed - regenerate frontend types
npm run generate-api-types

# TypeScript compiler immediately shows type errors for breaking changes
npm run typecheck
```

**Contract Guarantee**: Type errors detected immediately after schema changes.

### 3. CI/CD Integration

**Rule**: Type generation MUST be validated in CI pipeline.

**CI Workflow**:
```yaml
# .github/workflows/frontend-build.yml
- name: Generate API Types
  run: npm run generate-api-types

- name: TypeScript Type Check
  run: npm run typecheck

- name: Build Frontend
  run: npm run build
```

**Contract Guarantee**: CI fails if type generation produces TypeScript errors.

## Version Compatibility

### 1. Multiple Version Support

**Rule**: Frontend MUST support generating types for multiple API versions.

**Version-Specific Generation**:
```bash
# Generate v1 types
npx openapi-typescript http://localhost:8090/api/v1/openapi.json \
  --output src/api/generated/v1/types.ts

# Generate v2 types
npx openapi-typescript http://localhost:8090/api/v2/openapi.json \
  --output src/api/generated/v2/types.ts
```

**Usage Example**:
```typescript
import { InvestigationRequest as V1Request } from './api/generated/v1/types';
import { InvestigationRequest as V2Request } from './api/generated/v2/types';

const apiVersion = featureFlags.enableV2 ? 'v2' : 'v1';
```

**Contract Guarantee**: Multiple API versions generate isolated type namespaces.

### 2. Migration Path

**Rule**: Type changes from v1 to v2 MUST be detectable at compile-time.

**Breaking Change Example**:
```typescript
// v1: entity_id is string
const requestV1: V1Request = {
  entity_id: "user@example.com",
  entity_type: "email"
};

// v2: entity_id renamed to entity_identifier (breaking change)
const requestV2: V2Request = {
  entity_identifier: "user@example.com",  // ✅ TypeScript catches field rename
  entity_type: "email"
};
```

**Contract Guarantee**: Breaking API changes cause TypeScript compile errors.

## Quality Assurance

### 1. Generated Code Linting

**Rule**: Generated types MUST pass ESLint and Prettier checks.

**Linting Configuration**:
```json
// .eslintrc.json
{
  "overrides": [
    {
      "files": ["src/api/generated/**/*"],
      "rules": {
        "@typescript-eslint/no-explicit-any": "off",  // Allow 'any' in generated code
        "@typescript-eslint/ban-types": "off"
      }
    }
  ]
}
```

**Contract Guarantee**: Generated code passes linting without manual fixes.

### 2. Type Completeness

**Rule**: Generated types MUST include all schemas from OpenAPI.

**Validation**:
```typescript
// test/api/test-type-generation.ts
import * as GeneratedTypes from '@/api/generated/types';

test('all OpenAPI schemas have TypeScript types', async () => {
  const schema = await fetch('http://localhost:8090/openapi.json').then(r => r.json());
  const schemaNames = Object.keys(schema.components.schemas);

  schemaNames.forEach(name => {
    expect(GeneratedTypes).toHaveProperty(name);
  });
});
```

**Contract Guarantee**: 100% of OpenAPI schemas generate TypeScript types.

### 3. Type Safety Verification

**Rule**: Generated types MUST provide compile-time type safety.

**Type Safety Tests**:
```typescript
// This file should have zero TypeScript errors
import { InvestigationRequest, InvestigationsService } from '@/api/generated';

const validRequest: InvestigationRequest = {
  entity_id: "test",
  entity_type: "email"
};

// TypeScript verifies all required fields present
const response = await InvestigationsService.createInvestigation(validRequest);

// TypeScript verifies response structure
const id: string = response.investigation_id;
```

**Contract Guarantee**: Generated types enable 100% type-safe API interactions.

## Performance Requirements

| Metric | Target | Measured By |
|--------|--------|-------------|
| Type generation time | < 10s | Script execution time |
| Generated file size | < 500KB | types.ts file size |
| Number of interfaces | < 100 | Count of export interface |
| TypeScript compile time | < 30s | tsc --noEmit duration |

**Contract Guarantee**: All performance targets met during CI builds.

## Success Criteria

1. ✅ Types automatically generated from OpenAPI schema
2. ✅ All OpenAPI types map to correct TypeScript equivalents
3. ✅ Required/optional fields correctly represented
4. ✅ Type-safe API client functions for all endpoints
5. ✅ Compile-time validation of request/response structures
6. ✅ Generated code passes linting and type checking
7. ✅ Multiple API versions supported with isolated namespaces
8. ✅ Breaking changes cause TypeScript compile errors
9. ✅ Type generation integrated into build pipeline
10. ✅ < 10 second generation time with < 500KB output

## References

- **openapi-typescript**: https://github.com/drwpow/openapi-typescript
- **openapi-typescript-codegen**: https://github.com/ferdikoomen/openapi-typescript-codegen
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/
- **Feature Spec**: [../spec.md](../spec.md)
- **Implementation Plan**: [../plan.md](../plan.md)
- **Data Model**: [../data-model.md](../data-model.md)
