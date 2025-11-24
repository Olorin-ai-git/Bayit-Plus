# OpenAPI Schema Evolution Guidelines

**Status**: Active
**Author**: API Team
**Date**: 2025-11-01
**Target Audience**: Backend developers, API designers, Frontend teams

---

## Executive Summary

This document defines guidelines for evolving OpenAPI schemas while maintaining backward compatibility with existing clients. Following these guidelines ensures smooth API evolution without breaking existing integrations.

**Key Principles**:
- **Additive Changes Are Safe**: Adding optional fields, endpoints, or enum values
- **Removal Is Breaking**: Removing anything breaks existing clients
- **Type Changes Are Breaking**: Changing field types breaks existing clients
- **Semantic Versioning**: Version changes signal breaking vs non-breaking changes

---

## Change Classification

### 1. Non-Breaking Changes ✅

These changes **do not require a new API version**. They are backward compatible.

#### Adding Optional Request Fields
```yaml
# Before
InvestigationRequest:
  required:
    - entity_id
    - entity_type
  properties:
    entity_id:
      type: string
    entity_type:
      type: string

# After (NON-BREAKING)
InvestigationRequest:
  required:
    - entity_id
    - entity_type
  properties:
    entity_id:
      type: string
    entity_type:
      type: string
    time_range:  # NEW OPTIONAL FIELD
      type: object
      properties:
        start:
          type: string
          format: date
        end:
          type: string
          format: date
```

**Why Safe**: Old clients omit the field; new clients can use it.

---

#### Adding Response Fields
```yaml
# Before
InvestigationResponse:
  properties:
    investigation_id:
      type: string
    status:
      type: string

# After (NON-BREAKING)
InvestigationResponse:
  properties:
    investigation_id:
      type: string
    status:
      type: string
    risk_score:  # NEW RESPONSE FIELD
      type: number
      nullable: true
```

**Why Safe**: Old clients ignore unknown fields; new clients can use them.

---

#### Adding New Endpoints
```yaml
# NEW ENDPOINT (NON-BREAKING)
/api/v1/investigations/{id}/timeline:
  get:
    summary: Get investigation timeline
```

**Why Safe**: Old clients don't call new endpoints.

---

#### Adding New HTTP Methods
```yaml
# Before
/api/v1/investigations/{id}:
  get: ...

# After (NON-BREAKING)
/api/v1/investigations/{id}:
  get: ...
  patch:  # NEW METHOD
    summary: Partially update investigation
```

**Why Safe**: Old clients don't use new methods.

---

#### Adding Enum Values
```yaml
# Before
entity_type:
  type: string
  enum:
    - email
    - phone

# After (NON-BREAKING)
entity_type:
  type: string
  enum:
    - email
    - phone
    - device_id  # NEW ENUM VALUE
```

**Why Safe**: Old clients send valid old values; new clients can send new values. Backend must accept both.

---

#### Relaxing Constraints (Making Fields Optional)
```yaml
# Before
InvestigationRequest:
  required:
    - entity_id
    - entity_type
    - time_range

# After (NON-BREAKING)
InvestigationRequest:
  required:
    - entity_id
    - entity_type
    # time_range now optional
```

**Why Safe**: Old clients still send required fields; new clients can omit optional fields.

---

### 2. Breaking Changes ⚠️

These changes **require a new API version** (e.g., v1 → v2).

#### Removing Request Fields
```yaml
# v1
InvestigationRequest:
  properties:
    entity_id:
      type: string
    deprecated_field:
      type: string

# v2 (BREAKING)
InvestigationRequest:
  properties:
    entity_id:
      type: string
    # deprecated_field REMOVED
```

**Why Breaking**: Old clients send `deprecated_field`; v2 rejects it or ignores it unexpectedly.

---

#### Removing Response Fields
```yaml
# v1
InvestigationResponse:
  properties:
    investigation_id:
      type: string
    legacy_status:
      type: string

# v2 (BREAKING)
InvestigationResponse:
  properties:
    investigation_id:
      type: string
    # legacy_status REMOVED
```

**Why Breaking**: Old clients expect `legacy_status` in response.

---

#### Changing Field Types
```yaml
# v1
risk_score:
  type: number

# v2 (BREAKING)
risk_score:
  type: string  # Changed from number to string
```

**Why Breaking**: Type mismatch causes parsing errors.

---

#### Removing Enum Values
```yaml
# v1
status:
  enum:
    - pending
    - in_progress
    - completed
    - failed

# v2 (BREAKING)
status:
  enum:
    - pending
    - in_progress
    - completed
    # 'failed' REMOVED
```

**Why Breaking**: Old clients may send `failed`; v2 rejects it.

---

#### Making Optional Fields Required
```yaml
# v1
InvestigationRequest:
  properties:
    entity_id:
      type: string
    optional_field:
      type: string

# v2 (BREAKING)
InvestigationRequest:
  required:
    - entity_id
    - optional_field  # Now required
```

**Why Breaking**: Old clients don't send `optional_field`; v2 rejects requests.

---

#### Removing Endpoints
```yaml
# v1
/api/v1/legacy-endpoint:
  get: ...

# v2 (BREAKING)
# /api/v1/legacy-endpoint REMOVED
```

**Why Breaking**: Old clients call removed endpoint; v2 returns 404.

---

#### Removing HTTP Methods
```yaml
# v1
/api/v1/investigations/{id}:
  get: ...
  delete: ...

# v2 (BREAKING)
/api/v1/investigations/{id}:
  get: ...
  # delete REMOVED
```

**Why Breaking**: Old clients call DELETE; v2 returns 405 Method Not Allowed.

---

#### Changing HTTP Status Codes
```yaml
# v1
POST /investigations/:
  responses:
    '201':
      description: Created

# v2 (BREAKING)
POST /investigations/:
  responses:
    '200':  # Changed from 201 to 200
      description: OK
```

**Why Breaking**: Old clients expect 201; new behavior returns 200.

---

## Schema Evolution Best Practices

### 1. Always Add, Never Remove (in same version)

**Preferred Pattern** (Non-Breaking):
```yaml
# v1.0 → v1.1
InvestigationResponse:
  properties:
    investigation_id: { type: string }
    status: { type: string }
    risk_score: { type: number, nullable: true }  # ADDED
    new_field: { type: string }  # ADDED
```

**Anti-Pattern** (Breaking):
```yaml
# v1.0 → v1.1 (WRONG!)
InvestigationResponse:
  properties:
    investigation_id: { type: string }
    # status REMOVED (BREAKING!)
    risk_score: { type: number }
```

---

### 2. Use Nullable for New Fields

When adding response fields, make them `nullable: true` to avoid breaking old clients that don't expect them.

```yaml
# Good
new_field:
  type: string
  nullable: true

# Avoid (clients may not handle null)
new_field:
  type: string
```

---

### 3. Deprecate Before Removing

**3-Phase Deprecation Process**:

1. **Phase 1: Mark as Deprecated** (v1.1)
```yaml
legacy_field:
  type: string
  deprecated: true
  description: "Deprecated. Use new_field instead. Will be removed in v2.0."
```

2. **Phase 2: Add Deprecation Headers** (v1.1)
```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 01 May 2026 00:00:00 GMT
Link: <https://api.example.com/docs/v2-migration>; rel="deprecation"
```

3. **Phase 3: Remove in Next Major Version** (v2.0)
```yaml
# legacy_field removed in v2.0
```

---

### 4. Use Extend, Don't Modify

**Good** (Additive):
```yaml
# v1
InvestigationRequest:
  properties:
    entity_id: { type: string }

# v1.1 (Extend)
InvestigationRequest:
  properties:
    entity_id: { type: string }
    entity_type: { type: string }  # ADDED
    time_range: { type: object }   # ADDED
```

**Bad** (Modification):
```yaml
# v1
entity_id:
  type: string

# v1.1 (BREAKING CHANGE!)
entity_id:
  type: object  # Type changed
```

---

### 5. Version Endpoints, Not Schemas

**Preferred** (URL Versioning):
```
/api/v1/investigations/
/api/v2/investigations/
```

**Avoid** (Schema Versioning):
```
/api/investigations/ (with InvestigationV1Request, InvestigationV2Request)
```

**Why**: URL versioning makes version boundaries clear.

---

### 6. Provide Clear Migration Paths

For every breaking change, document migration path:

```yaml
# v1 → v2 Migration
status_code:
  # v1: string enum
  # v2: integer (BREAKING)
  # Migration: Map string to integer
  #   'pending' → 1
  #   'in_progress' → 2
  #   'completed' → 3
```

---

## Evolution Workflow

### Step 1: Design Change
- Review change classification (breaking vs non-breaking)
- If breaking: plan new major version
- If non-breaking: add to current version

### Step 2: Update OpenAPI Schema
```bash
# Edit Pydantic models
vim olorin-server/app/models/investigation_api.py

# Regenerate OpenAPI schema
poetry run python -m app.local_server &
curl http://localhost:8090/openapi.json > openapi-new.json
```

### Step 3: Run Breaking Change Detection
```bash
cd olorin-front
npm run api:detect-breaking-changes openapi-old.json openapi-new.json
```

### Step 4: Generate Comparison Report
```bash
npm run api:compare-schemas openapi-old.json openapi-new.json > changes.md
```

### Step 5: Create Migration Guide (if breaking)
```bash
# Use template
cp docs/api/migration-guide-template.md docs/api/migration-v1-v2.md
# Fill in actual changes
```

### Step 6: Update Frontend Types
```bash
npm run generate-api-types
```

### Step 7: Run Contract Tests
```bash
npm run contract:test
npm run test:backward-compatibility
```

### Step 8: Update Version in CI
```yaml
# .github/workflows/contract-tests.yml
env:
  API_VERSION: v2  # Update version
```

---

## Common Schema Evolution Scenarios

### Scenario 1: Adding a New Required Field

**Problem**: You want to add a required field to a request.

**Solution**: Add it as optional first, then make it required in next major version.

```yaml
# v1.1 (Add as optional)
InvestigationRequest:
  properties:
    entity_id: { type: string }
    new_field: { type: string }  # Optional

# v2.0 (Make required)
InvestigationRequest:
  required:
    - entity_id
    - new_field
```

---

### Scenario 2: Renaming a Field

**Problem**: You want to rename `entity_id` to `entity_identifier`.

**Solution**: Add new field, deprecate old, remove in next major version.

```yaml
# v1.1 (Additive)
InvestigationRequest:
  properties:
    entity_id:  # Deprecated
      type: string
      deprecated: true
    entity_identifier:  # New field
      type: string

# v2.0 (Remove old)
InvestigationRequest:
  properties:
    entity_identifier:  # Only new field
      type: string
```

---

### Scenario 3: Changing Field Type

**Problem**: `risk_score` is currently `number`, but you want `string`.

**Solution**: Create new field with new type, deprecate old, remove in next major version.

```yaml
# v1.1 (Add new field)
InvestigationResponse:
  properties:
    risk_score:  # Deprecated number
      type: number
      deprecated: true
    risk_level:  # New string field
      type: string

# v2.0 (Remove old)
InvestigationResponse:
  properties:
    risk_level:  # Only new field
      type: string
```

---

### Scenario 4: Splitting a Field

**Problem**: `entity` field contains both ID and type; you want separate fields.

**Solution**: Add separate fields, deprecate combined field, remove in next major version.

```yaml
# v1.0
entity:
  type: object
  properties:
    value: { type: string }  # "user@example.com|email"

# v1.1 (Add separate fields)
entity:
  type: object
  deprecated: true
entity_id:
  type: string
entity_type:
  type: string

# v2.0 (Remove old)
entity_id:
  type: string
entity_type:
  type: string
```

---

## Validation Checklist

Before deploying schema changes:

- [ ] Run `npm run api:detect-breaking-changes` (must pass for non-breaking changes)
- [ ] Run `npm run api:compare-schemas` (review all changes)
- [ ] Run `npm run contract:test` (all contract tests must pass)
- [ ] Run `npm run test:backward-compatibility` (all backward compat tests must pass)
- [ ] Update API version if breaking changes detected
- [ ] Create migration guide if new major version
- [ ] Update deprecation headers if deprecating fields
- [ ] Document all changes in CHANGELOG.md
- [ ] Update frontend types: `npm run generate-api-types`
- [ ] Verify client SDK compatibility (if applicable)

---

## Resources

- **OpenAPI 3.1 Specification**: https://spec.openapis.org/oas/v3.1.0
- **Semantic Versioning**: https://semver.org/
- **API Versioning Strategy**: `/docs/api/versioning-strategy.md`
- **Migration Guide Template**: `/docs/api/migration-guide-template.md`
- **Breaking Change Detection**: `/scripts/detect-breaking-changes.ts`
- **Schema Comparison**: `/scripts/compare-schemas.ts`

---

**Last Updated**: 2025-11-01
**Document Version**: 1.0.0
**Maintained By**: API Team
