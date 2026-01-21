# API Migration Guide: v{OLD} to v{NEW}

**Status**: Draft
**Author**: API Team
**Date**: {YYYY-MM-DD}
**Target Audience**: Frontend developers, API consumers

---

## Executive Summary

This guide helps you migrate from Olorin API v{OLD} to v{NEW}.

**Key Information**:
- **Migration Deadline**: {YYYY-MM-DD} (6 months after v{NEW} release)
- **Deprecation Date**: {YYYY-MM-DD} (v{OLD} marked deprecated)
- **Sunset Date**: {YYYY-MM-DD} (v{OLD} will return HTTP 410 Gone)
- **Estimated Migration Effort**: {X} hours for typical client

**Quick Links**:
- [Breaking Changes](#breaking-changes)
- [Step-by-Step Migration](#step-by-step-migration)
- [Code Examples](#code-examples)
- [Testing Checklist](#testing-checklist)

---

## Timeline

```
{YYYY-MM-DD}  v{NEW} Released (v{OLD} still supported)
              ↓
              3 months
              ↓
{YYYY-MM-DD}  v{OLD} Deprecated (warning headers added)
              ↓
              6 months minimum support
              ↓
{YYYY-MM-DD}  v{OLD} Sunset (returns HTTP 410 Gone)
```

---

## Breaking Changes

### 1. {Breaking Change Category}

**Change Type**: {Removed Field | Type Change | Endpoint Removed | etc.}
**Severity**: Breaking
**Affected Endpoints**: {List endpoints}

**What Changed**:
```diff
// v{OLD}
- {old code example}

// v{NEW}
+ {new code example}
```

**Why This Changed**:
{Explanation of business/technical rationale}

**Migration Steps**:
1. {Step 1}
2. {Step 2}
3. {Step 3}

**Code Example**:
```typescript
// Before (v{OLD})
const oldRequest = {
  // old structure
};

// After (v{NEW})
const newRequest = {
  // new structure
};
```

---

### 2. {Next Breaking Change}

{Repeat structure from above}

---

## Non-Breaking Changes

### New Features Added

**Feature**: {Feature Name}
**Type**: Non-Breaking (Optional)
**Endpoints**: {List endpoints}

**Description**:
{What the new feature does}

**Usage Example**:
```typescript
// New optional feature in v{NEW}
const request = {
  // existing fields work as before
  entity_id: "user@example.com",
  entity_type: "email",

  // New optional field (v{NEW}+)
  new_optional_field: "value"  // Can be omitted
};
```

---

## Step-by-Step Migration

### Prerequisites

- [ ] Backend team has deployed v{NEW} to all environments
- [ ] You have access to both v{OLD} and v{NEW} OpenAPI schemas
- [ ] Test environment available for validation

### Phase 1: Analysis (Estimated: {X} hours)

1. **Run Breaking Change Detection**:
   ```bash
   npm run api:detect-breaking-changes v{OLD}-schema.json v{NEW}-schema.json
   ```

2. **Review Impact**:
   - List all API calls your application makes
   - Identify which are affected by breaking changes
   - Estimate effort for each change

3. **Update Dependencies**:
   ```bash
   npm run generate-api-types  # Generates v{NEW} types
   ```

### Phase 2: Code Updates (Estimated: {X} hours)

1. **Update API Configuration**:
   ```typescript
   // .env
   - REACT_APP_API_BASE_URL=https://api.olorin.example.com/api/v{OLD}
   + REACT_APP_API_BASE_URL=https://api.olorin.example.com/api/v{NEW}
   ```

2. **Update Import Statements**:
   ```typescript
   // Before
   import { InvestigationRequest } from '@/api/generated/v{OLD}/models';

   // After
   import { InvestigationRequest } from '@/api/generated/models';
   ```

3. **Apply Breaking Changes**:
   - Follow migration steps for each breaking change (see above)
   - Update request/response handling code
   - Update error handling if error format changed

4. **Test Each Change**:
   ```bash
   npm run test:backward-compatibility
   npm run contract:test
   ```

### Phase 3: Testing (Estimated: {X} hours)

1. **Unit Tests**:
   - Update test fixtures for new types
   - Run all unit tests
   - Verify 100% pass rate

2. **Integration Tests**:
   - Test against v{NEW} backend
   - Verify all endpoints work correctly
   - Test error scenarios

3. **Contract Tests**:
   ```bash
   npm run contract:test
   ```

4. **Backward Compatibility Tests**:
   ```bash
   npm run test:backward-compatibility
   ```

### Phase 4: Deployment (Estimated: {X} hours)

1. **Staging Deployment**:
   - Deploy to staging environment
   - Run smoke tests
   - Monitor for errors

2. **Canary Deployment** (Recommended):
   - Deploy to 10% of production traffic
   - Monitor error rates and performance
   - Gradually increase to 100%

3. **Full Production Deployment**:
   - Deploy to all production instances
   - Monitor dashboards for anomalies
   - Have rollback plan ready

---

## Code Examples

### Example 1: {Use Case Name}

**Scenario**: {Description of common use case}

**v{OLD} Implementation**:
```typescript
// Old code (v{OLD})
async function createInvestigation(entityId: string) {
  const response = await axios.post('/api/v{OLD}/investigations/', {
    entity_id: entityId,
    entity_type: 'email',
    // v{OLD} structure
  });

  return response.data;
}
```

**v{NEW} Implementation**:
```typescript
// New code (v{NEW})
async function createInvestigation(entityId: string) {
  const response = await axios.post('/api/v{NEW}/investigations/', {
    entity_id: entityId,
    entity_type: 'email',
    // v{NEW} structure with changes
  });

  return response.data;
}
```

**Key Differences**:
- {Difference 1}
- {Difference 2}

---

### Example 2: Error Handling

**v{OLD} Error Handling**:
```typescript
try {
  await createInvestigation('user@example.com');
} catch (error) {
  if (error.response?.status === 400) {
    // v{OLD} error structure
    console.error(error.response.data.message);
  }
}
```

**v{NEW} Error Handling**:
```typescript
try {
  await createInvestigation('user@example.com');
} catch (error) {
  if (error.response?.status === 400) {
    // v{NEW} error structure (if changed)
    const { error: errorType, message, details } = error.response.data;
    console.error(`${errorType}: ${message}`);
  }
}
```

---

## Testing Checklist

### Automated Tests

- [ ] All unit tests pass with v{NEW} types
- [ ] All integration tests pass against v{NEW} backend
- [ ] Contract tests validate v{NEW} OpenAPI compliance
- [ ] Backward compatibility tests pass
- [ ] Breaking change detection shows no unexpected changes

### Manual Testing

- [ ] Test all critical user flows end-to-end
- [ ] Verify error handling works correctly
- [ ] Test edge cases and boundary conditions
- [ ] Verify UI displays data correctly
- [ ] Test performance (response times acceptable)

### Deployment Verification

- [ ] Staging environment fully functional
- [ ] Production canary deployment successful
- [ ] Monitoring dashboards show normal metrics
- [ ] Error rates within acceptable thresholds
- [ ] No increase in support tickets

---

## Rollback Plan

If issues are discovered after deployment:

### Immediate Rollback

1. **Revert Environment Configuration**:
   ```bash
   # Revert to v{OLD}
   export REACT_APP_API_BASE_URL=https://api.olorin.example.com/api/v{OLD}
   ```

2. **Redeploy Previous Version**:
   ```bash
   git revert HEAD
   npm run build
   npm run deploy
   ```

3. **Verify Rollback**:
   - Check application loads correctly
   - Test critical user flows
   - Monitor error rates

### Gradual Rollback (Canary)

If using canary deployment:
1. Reduce canary percentage to 0%
2. Route all traffic to v{OLD}
3. Investigate and fix issues
4. Retry deployment when ready

---

## Common Issues & Solutions

### Issue 1: {Common Problem}

**Symptoms**:
- {Symptom 1}
- {Symptom 2}

**Cause**:
{Explanation of root cause}

**Solution**:
```typescript
// Code example showing fix
```

---

### Issue 2: Type Errors After Migration

**Symptoms**:
- TypeScript compilation errors
- Type mismatches in API calls

**Cause**:
Generated types from v{NEW} schema don't match old code.

**Solution**:
1. Regenerate types: `npm run generate-api-types`
2. Fix type errors in your code
3. Run `npm run typecheck` to verify

---

## Getting Help

### Resources

- **API Documentation**: https://api.olorin.example.com/api/v{NEW}/docs
- **OpenAPI Schema**: https://api.olorin.example.com/api/v{NEW}/openapi.json
- **Migration Support**: #api-migration Slack channel

### Support Contacts

- **API Team**: api-team@olorin.example.com
- **On-Call Engineer**: oncall@olorin.example.com
- **Slack Channel**: #api-migration

### Office Hours

API team available for migration support:
- **Timezone**: {Timezone}
- **Hours**: {Days} {Start time} - {End time}

---

## Appendix

### A. Complete Field Mapping

| v{OLD} Field | v{NEW} Field | Notes |
|--------------|--------------|-------|
| {old_field_1} | {new_field_1} | {Notes} |
| {old_field_2} | {new_field_2} | {Notes} |
| {old_field_3} | Removed | {Migration path} |
| N/A | {new_field_4} | {New optional field} |

### B. Endpoint Changes Summary

| Endpoint | v{OLD} | v{NEW} | Change Type |
|----------|--------|--------|-------------|
| POST /investigations/ | ✅ | ✅ | Modified (breaking) |
| GET /investigations/{id} | ✅ | ✅ | No change |
| {endpoint} | ✅ | ❌ | Removed |
| {endpoint} | ❌ | ✅ | Added |

### C. HTTP Status Code Changes

| Scenario | v{OLD} Status | v{NEW} Status | Impact |
|----------|---------------|---------------|--------|
| Success | 201 | 201 | No change |
| Validation Error | 400 | 400 | No change |
| {scenario} | {old} | {new} | Breaking |

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| {YYYY-MM-DD} | 1.0.0 | Initial migration guide |
| {YYYY-MM-DD} | 1.1.0 | Added code examples for {feature} |
| {YYYY-MM-DD} | 1.2.0 | Updated timeline and rollback procedures |

---

**Last Updated**: {YYYY-MM-DD}
**Guide Version**: 1.0.0
**API Version**: v{OLD} → v{NEW}
