# Olorin Deduplication - PR Execution Plan

**Author**: Orchestrator Agent
**Date**: 2025-11-06
**Timeline**: 6 weeks
**Total PRs**: 11
**Total Effort**: 78 hours
**Expected Duplication Reduction**: 68% (5,712 lines eliminated)

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: Foundation](#phase-1-foundation-week-1)
3. [Phase 2: Contract-Driven Types](#phase-2-contract-driven-types-week-2)
4. [Phase 3: Validation Unification](#phase-3-validation-unification-week-3)
5. [Phase 4: Service Layer](#phase-4-service-layer-week-4)
6. [Phase 5: React Hooks](#phase-5-react-hooks-week-5)
7. [Phase 6: Testing & CI](#phase-6-testing--ci-week-6)
8. [Dependencies Graph](#dependencies-graph)
9. [Risk Management](#risk-management)
10. [Rollback Procedures](#rollback-procedures)

---

## Overview

This plan outlines 11 PRs across 6 phases to eliminate 68% of code duplication in the Olorin monorepo.

### Execution Principles

1. **Sequential Phases**: Complete one phase before starting the next
2. **Foundation First**: Establish configuration and types before building on them
3. **Low Risk First**: Start with low-risk, high-value PRs
4. **Incremental Migration**: Use codemods and feature flags for gradual rollout
5. **Comprehensive Testing**: Every PR requires 100% test pass rate
6. **Clear Rollback**: Every PR has a documented rollback plan

### Success Criteria

- [ ] All 11 PRs merged successfully
- [ ] 68% duplication reduction achieved
- [ ] Zero regression in functionality
- [ ] All tests passing
- [ ] Team onboarded to new patterns
- [ ] Documentation updated

---

## Phase 1: Foundation (Week 1)

**Goal**: Establish configuration and type foundations

### PR #1: Configuration Centralization

**Status**: Ready to start
**Priority**: HIGHEST (Foundation for all other PRs)
**Effort**: 4 hours
**Risk**: Low
**Lines Saved**: 520

#### Description

Consolidate 18 scattered configuration files into a single, type-safe configuration layer using Zod validation.

#### Implementation Steps

1. **Create Directory Structure**
   ```bash
   mkdir -p olorin-front/src/shared/config/{schema,loaders}
   ```

2. **Implement Zod Schemas**

   Create `schema/app.schema.ts`:
   ```typescript
   import { z } from 'zod';

   export const appConfigSchema = z.object({
     env: z.enum(['production', 'staging', 'development']),
     apiBaseUrl: z.string().url(),
     wsBaseUrl: z.string().url(),
     frontendPort: z.number().int().positive(),
   });

   export type AppConfig = z.infer<typeof appConfigSchema>;
   ```

   Create `schema/features.schema.ts`, `schema/services.schema.ts`, `schema/ui.schema.ts` similarly.

3. **Implement Config Loaders**

   Create `loaders/env.loader.ts` with fail-fast validation.

4. **Create Centralized AppConfig Class**

   Create `AppConfig.ts` with singleton pattern.

5. **Migrate Consumers**

   Run codemod to update all `process.env` references:
   ```bash
   npx jscodeshift -t scripts/codemods/migrate-config.ts src/
   ```

6. **Delete Duplicate Files**

   Remove 12 duplicate configuration files.

7. **Update Tests**

   Add comprehensive config validation tests.

#### Files to Modify

- **Create** (8 files):
  - `src/shared/config/schema/app.schema.ts`
  - `src/shared/config/schema/features.schema.ts`
  - `src/shared/config/schema/services.schema.ts`
  - `src/shared/config/schema/ui.schema.ts`
  - `src/shared/config/loaders/env.loader.ts`
  - `src/shared/config/AppConfig.ts`
  - `src/shared/config/index.ts`
  - `scripts/codemods/migrate-config.ts`

- **Modify** (18 files):
  - All files currently using `process.env` directly

- **Delete** (12 files):
  - `src/config/*.ts` (conflicting config files)
  - Various scattered config utilities

#### Testing Strategy

```typescript
// tests/config/AppConfig.test.ts
describe('AppConfig', () => {
  it('should fail fast on missing required config', () => {
    delete process.env.REACT_APP_API_BASE_URL;
    expect(() => new AppConfig()).toThrow('Invalid configuration');
  });

  it('should validate environment enum', () => {
    process.env.REACT_APP_ENV = 'invalid';
    expect(() => new AppConfig()).toThrow();
  });

  it('should provide type-safe access', () => {
    const config = AppConfig.getInstance();
    expect(config.apiBaseUrl).toBe('http://localhost:8090');
  });
});
```

#### Acceptance Criteria

- [ ] All configuration centralized in `/src/shared/config/`
- [ ] Zod schemas validate all environment variables
- [ ] Config fails fast on missing/invalid values
- [ ] All consumers migrated to use centralized config
- [ ] 12 duplicate files deleted
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Documentation updated

#### Rollback Plan

**Complexity**: Simple

**Steps**:
1. `git revert <commit-sha>`
2. Redeploy previous version
3. No cascading dependencies

---

### PR #2: Investigation Types Unification (Frontend)

**Status**: Ready to start (can run parallel with PR #1)
**Priority**: HIGH (Foundation for type safety)
**Effort**: 6 hours
**Risk**: Medium
**Lines Saved**: 210

#### Description

Unify 3 duplicate TypeScript investigation type definitions into a single canonical location.

#### Implementation Steps

1. **Choose Canonical Location**

   Use `/src/shared/types/investigation/` (already modular).

2. **Audit Existing Definitions**

   Compare all 3 locations:
   - `/src/shared/types/investigation.types.ts` (141 lines)
   - `/src/types/investigation.ts` (60 lines)
   - `/src/shared/types/investigation/index.ts` + core.ts (79 lines)

3. **Consolidate Types**

   Keep modular structure:
   ```
   shared/types/investigation/
   ├── index.ts           # Re-exports
   ├── core.ts            # Core investigation types
   ├── entity.ts          # Entity types
   ├── status.ts          # Status enums
   └── params.ts          # Investigation parameters
   ```

4. **Run Codemod**

   Update all imports:
   ```bash
   npx jscodeshift -t scripts/codemods/migrate-investigation-imports.ts src/
   ```

5. **Delete Duplicate Files**

   Remove `/src/types/investigation.ts` and update `/src/shared/types/investigation.types.ts` to re-export from modular structure.

6. **Verify Compilation**

   Run `npm run typecheck` to ensure no type errors.

#### Files to Modify

- **Create** (1 file):
  - `scripts/codemods/migrate-investigation-imports.ts`

- **Modify** (30 files):
  - All files importing investigation types

- **Delete** (2 files):
  - `/src/types/investigation.ts`
  - Update `/src/shared/types/investigation.types.ts` to become a re-export

#### Testing Strategy

```typescript
// tests/types/investigation.test.ts
describe('Investigation Types', () => {
  it('should have consistent enum values', () => {
    expect(InvestigationType.STRUCTURED).toBe('structured');
    expect(InvestigationType.MANUAL).toBe('manual');
  });

  it('should match backend schema', () => {
    // Contract test to validate frontend types match backend
  });
});
```

#### Acceptance Criteria

- [ ] Single source of truth: `/src/shared/types/investigation/`
- [ ] All duplicate definitions removed
- [ ] All imports updated
- [ ] TypeScript compilation succeeds
- [ ] All tests pass
- [ ] No runtime type errors

#### Rollback Plan

**Complexity**: Medium

**Steps**:
1. Restore deleted type files
2. Revert import changes using reverse codemod
3. Verify compilation

---

## Phase 2: Contract-Driven Types (Week 2)

**Goal**: Establish type contract between frontend and backend

### PR #3: OpenAPI Schema Generation (Backend)

**Status**: Depends on Phase 1 completion
**Priority**: CRITICAL (Enables contract-driven development)
**Effort**: 8 hours
**Risk**: Low
**Lines Saved**: 150

#### Description

Generate OpenAPI 3.1 specification from Python Pydantic schemas to establish single source of truth for types.

#### Implementation Steps

1. **Install Dependencies**
   ```bash
   cd olorin-server
   poetry add "fastapi[all]" openapi-schema-pydantic
   ```

2. **Create Generation Script**

   Create `scripts/generate_openapi.py`:
   ```python
   #!/usr/bin/env python3
   import json
   from fastapi.openapi.utils import get_openapi
   from app.main import app

   if __name__ == "__main__":
       openapi_schema = get_openapi(
           title=app.title,
           version=app.version,
           openapi_version="3.1.0",
           description=app.description,
           routes=app.routes,
       )
       print(json.dumps(openapi_schema, indent=2))
   ```

3. **Generate Spec**
   ```bash
   poetry run python scripts/generate_openapi.py > openapi.json
   ```

4. **Validate Spec**
   ```bash
   # Use openapi-spec-validator
   poetry add --dev openapi-spec-validator
   poetry run openapi-spec-validator openapi.json
   ```

5. **Add to CI Pipeline**

   Create `.github/workflows/openapi-validation.yml`:
   ```yaml
   name: OpenAPI Validation
   on: [push, pull_request]
   jobs:
     validate:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Setup Python
           uses: actions/setup-python@v4
           with:
             python-version: '3.11'
         - name: Install Poetry
           run: pip install poetry
         - name: Install dependencies
           run: cd olorin-server && poetry install
         - name: Generate OpenAPI spec
           run: cd olorin-server && poetry run python scripts/generate_openapi.py > openapi.json
         - name: Validate spec
           run: cd olorin-server && poetry run openapi-spec-validator openapi.json
   ```

6. **Documentation**

   Add README explaining how to regenerate spec.

#### Files to Modify

- **Create** (3 files):
  - `olorin-server/scripts/generate_openapi.py`
  - `olorin-server/openapi.json`
  - `.github/workflows/openapi-validation.yml`

- **Modify** (2 files):
  - `olorin-server/pyproject.toml` (add dependencies)
  - `olorin-server/README.md` (add documentation)

#### Testing Strategy

```python
# tests/test_openapi.py
def test_openapi_spec_generation():
    """Test that OpenAPI spec can be generated successfully."""
    from scripts.generate_openapi import generate_spec
    spec = generate_spec()
    assert spec is not None
    assert spec['openapi'] == '3.1.0'
    assert 'paths' in spec
    assert 'components' in spec

def test_investigation_schema_in_spec():
    """Test that Investigation schema is included."""
    spec = generate_spec()
    schemas = spec['components']['schemas']
    assert 'Investigation' in schemas
    assert 'InvestigationState' in schemas
```

#### Acceptance Criteria

- [ ] Valid OpenAPI 3.1 spec generated
- [ ] All Pydantic models included in spec
- [ ] Schema validation passes
- [ ] CI pipeline validates spec on every push
- [ ] Documentation updated
- [ ] No manual changes to openapi.json (auto-generated only)

#### Rollback Plan

**Complexity**: Trivial

**Steps**:
1. Remove generation script
2. Remove CI workflow
3. No production impact (additive only)

---

### PR #4: TypeScript Type Generation (Frontend)

**Status**: Depends on PR #3
**Priority**: CRITICAL (Completes contract-driven pipeline)
**Effort**: 6 hours
**Risk**: Medium
**Lines Saved**: 350

#### Description

Auto-generate TypeScript types from OpenAPI spec to ensure 100% type safety between frontend and backend.

#### Implementation Steps

1. **Install Dependencies**
   ```bash
   cd olorin-front
   npm install --save-dev openapi-typescript
   ```

2. **Create Generation Script**

   Create `scripts/generate-api-types.sh`:
   ```bash
   #!/bin/bash
   set -e

   echo "Generating TypeScript types from OpenAPI spec..."
   npx openapi-typescript ../olorin-server/openapi.json \
     -o src/api/generated/types.ts \
     --export-type

   echo "Type generation complete!"
   ```

3. **Generate Types**
   ```bash
   chmod +x scripts/generate-api-types.sh
   ./scripts/generate-api-types.sh
   ```

4. **Update Imports**

   Replace manual type imports with generated types:
   ```typescript
   // Before
   import { Investigation } from '@/types/investigation';

   // After
   import { Investigation } from '@/api/generated/types';
   ```

5. **Delete Manual Type Definitions**

   Remove 10 files with manually maintained types.

6. **Add to Build Process**

   Update `package.json`:
   ```json
   {
     "scripts": {
       "generate:types": "./scripts/generate-api-types.sh",
       "prebuild": "npm run generate:types",
       "build": "webpack --mode production"
     }
   }
   ```

7. **Add CI Validation**

   Ensure types are regenerated and checked in CI:
   ```yaml
   - name: Generate API types
     run: npm run generate:types
   - name: Check for uncommitted changes
     run: git diff --exit-code src/api/generated/types.ts
   ```

#### Files to Modify

- **Create** (2 files):
  - `scripts/generate-api-types.sh`
  - `src/api/generated/types.ts` (generated)

- **Modify** (40 files):
  - All files importing manual types

- **Delete** (10 files):
  - Manual type definition files

#### Testing Strategy

```typescript
// tests/api/contract.test.ts
describe('API Contract', () => {
  it('should have matching Investigation type', () => {
    const investigation: Investigation = {
      investigationId: '123',
      createdAt: new Date().toISOString(),
      investigationType: 'structured',
    };
    // Type check passes = test passes
    expect(investigation).toBeDefined();
  });

  it('should enforce required fields', () => {
    // @ts-expect-error - missing required field
    const invalid: Investigation = {
      investigationId: '123',
    };
  });
});
```

#### Acceptance Criteria

- [ ] TypeScript types generated from OpenAPI spec
- [ ] Types match backend Pydantic schemas exactly
- [ ] All imports updated to use generated types
- [ ] 10 manual type files deleted
- [ ] Build includes type generation step
- [ ] CI validates types are up-to-date
- [ ] TypeScript compilation succeeds
- [ ] All tests pass

#### Rollback Plan

**Complexity**: Medium

**Steps**:
1. Restore manual type files
2. Revert import changes
3. Remove type generation from build process
4. Verify compilation

---

### PR #5: Contract Testing Pipeline

**Status**: Depends on PR #3 and PR #4
**Priority**: HIGH (Prevents contract drift)
**Effort**: 4 hours
**Risk**: Low
**Lines Saved**: 0 (prevents future bugs)

#### Description

Setup contract testing to validate frontend types always match backend schemas.

#### Implementation Steps

1. **Choose Contract Testing Tool**

   Use Schemathesis for API contract testing:
   ```bash
   cd olorin-server
   poetry add --dev schemathesis
   ```

2. **Create Contract Test Suite**

   Create `tests/contract/test_api_contract.py`:
   ```python
   import schemathesis

   schema = schemathesis.from_uri("http://localhost:8090/openapi.json")

   @schema.parametrize()
   def test_api_contract(case):
       """Test that API conforms to OpenAPI spec."""
       response = case.call_and_validate()
       case.validate_response(response)
   ```

3. **Add Frontend Contract Tests**

   Create `tests/contract/api.contract.test.ts`:
   ```typescript
   import { validateAgainstSchema } from '@/test-utils/contract';
   import openapi from '@/../olorin-server/openapi.json';

   describe('API Contract', () => {
     it('should match OpenAPI schema for Investigation', async () => {
       const response = await fetch('/api/investigations/123');
       const data = await response.json();

       const valid = validateAgainstSchema(data, openapi, '#/components/schemas/Investigation');
       expect(valid).toBe(true);
     });
   });
   ```

4. **Add CI Workflow**

   Create `.github/workflows/contract-testing.yml`:
   ```yaml
   name: Contract Testing
   on: [push, pull_request]
   jobs:
     contract-tests:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Start backend
           run: cd olorin-server && poetry run uvicorn app.main:app --host 0.0.0.0 --port 8090 &
         - name: Wait for backend
           run: sleep 10
         - name: Run contract tests
           run: cd olorin-server && poetry run pytest tests/contract/
         - name: Frontend contract tests
           run: cd olorin-front && npm run test:contract
   ```

5. **Configure to Block Merges**

   Update branch protection rules to require contract tests to pass.

#### Files to Modify

- **Create** (3 files):
  - `olorin-server/tests/contract/test_api_contract.py`
  - `olorin-front/tests/contract/api.contract.test.ts`
  - `.github/workflows/contract-testing.yml`

- **Modify** (2 files):
  - `olorin-server/pyproject.toml` (add schemathesis)
  - `olorin-front/package.json` (add test:contract script)

#### Testing Strategy

Contract tests themselves are the testing strategy. They validate:
1. Backend API conforms to OpenAPI spec
2. Frontend types match OpenAPI spec
3. API responses match schema definitions

#### Acceptance Criteria

- [ ] Contract tests pass for all API endpoints
- [ ] CI blocks merges on contract violations
- [ ] Documentation explains contract testing
- [ ] Team trained on contract-driven development
- [ ] Branch protection rules updated

#### Rollback Plan

**Complexity**: Trivial

**Steps**:
1. Disable CI workflow
2. Update branch protection rules
3. No production impact

---

## Phase 3: Validation Unification (Week 3)

**Goal**: Consolidate all validation logic

### PR #6: Centralized Validation Library

**Status**: Depends on PR #1 (config) and PR #4 (types)
**Priority**: HIGH
**Effort**: 12 hours
**Risk**: Medium
**Lines Saved**: 840

#### Description

Consolidate 28 duplicate validation implementations into a single, Zod-based validation library.

#### Implementation Steps

1. **Create Directory Structure**
   ```bash
   mkdir -p olorin-front/src/shared/validation/{schemas,validators,rules}
   ```

2. **Implement Zod Schemas**

   Aligned with OpenAPI types from PR #4:

   Create `schemas/common.schemas.ts`:
   ```typescript
   import { z } from 'zod';

   export const emailSchema = z.string().email();
   export const uuidSchema = z.string().uuid();
   export const riskScoreSchema = z.number().int().min(0).max(100);
   ```

   Create `schemas/entity.schemas.ts`, `schemas/investigation.schemas.ts`, etc.

3. **Implement Validators**

   Create `validators/email.validator.ts`:
   ```typescript
   import { emailSchema } from '../schemas/common.schemas';

   export function validateEmail(email: string): boolean {
     return emailSchema.safeParse(email).success;
   }

   export function validateEmailWithError(email: string): {
     valid: boolean;
     error?: string;
   } {
     const result = emailSchema.safeParse(email);
     return {
       valid: result.success,
       error: result.error?.message,
     };
   }
   ```

   Implement validators for: UUID, risk score, entity type, time range, date, phone, etc.

4. **Implement Business Rules**

   Create `rules/investigation.rules.ts`:
   ```typescript
   export const investigationRules = {
     maxEntitiesPerInvestigation: 100,
     minTimeRangeDays: 1,
     maxTimeRangeDays: 365,
     requiredFields: ['investigationType', 'entities', 'timeRange'],
   };
   ```

5. **Run Codemod**

   Migrate all validation calls:
   ```bash
   npx jscodeshift -t scripts/codemods/migrate-validation.ts src/
   ```

6. **Delete Duplicate Implementations**

   Remove 15 duplicate validation files.

7. **Add Comprehensive Tests**

   100% coverage for all validators:
   ```typescript
   describe('Email Validator', () => {
     describe('validateEmail', () => {
       it('should accept valid emails', () => {
         expect(validateEmail('user@example.com')).toBe(true);
         expect(validateEmail('test.user+tag@sub.example.co.uk')).toBe(true);
       });

       it('should reject invalid emails', () => {
         expect(validateEmail('invalid')).toBe(false);
         expect(validateEmail('@example.com')).toBe(false);
         expect(validateEmail('user@')).toBe(false);
       });

       it('should handle edge cases', () => {
         expect(validateEmail('')).toBe(false);
         expect(validateEmail(' user@example.com ')).toBe(false);
       });
     });

     describe('validateEmailWithError', () => {
       it('should provide error messages', () => {
         const result = validateEmailWithError('invalid');
         expect(result.valid).toBe(false);
         expect(result.error).toContain('email');
       });
     });
   });
   ```

#### Files to Modify

- **Create** (12 files):
  - Zod schemas (5 files)
  - Validators (6 files)
  - Business rules (1 file)
  - Codemod script (1 file)

- **Modify** (35 files):
  - All files using validation

- **Delete** (15 files):
  - Duplicate validation implementations

#### Testing Strategy

- **Unit Tests**: 100% coverage for all validators
- **Integration Tests**: Validate in real components
- **Contract Tests**: Ensure validation matches backend
- **Regression Tests**: Compare old vs new validation behavior

#### Acceptance Criteria

- [ ] All validation logic centralized
- [ ] 100% test coverage for validators
- [ ] Zod schemas aligned with OpenAPI types
- [ ] 28 duplicate implementations removed
- [ ] All consumers migrated
- [ ] Build succeeds
- [ ] All tests pass
- [ ] No validation behavior regressions

#### Rollback Plan

**Complexity**: Complex

**Steps**:
1. Restore deleted validation files
2. Revert validation calls using reverse codemod
3. Run full test suite
4. May require component-by-component rollback if issues found

---

## Phase 4: Service Layer (Week 4)

**Goal**: Consolidate HTTP and WebSocket services

### PR #7: HTTP Client Abstraction

**Status**: Depends on PR #1 (config)
**Priority**: MEDIUM
**Effort**: 10 hours
**Risk**: Medium
**Lines Saved**: 680

*(Full details similar to PR #6)*

### PR #8: WebSocket Manager Consolidation

**Status**: Depends on PR #1 (config)
**Priority**: MEDIUM
**Effort**: 6 hours
**Risk**: Low
**Lines Saved**: 320

*(Full details similar to PR #6)*

---

## Phase 5: React Hooks (Week 5)

### PR #9: Composable Data Hooks

**Status**: Depends on PR #7 (HTTP client)
**Priority**: MEDIUM
**Effort**: 16 hours
**Risk**: HIGH
**Lines Saved**: 390

*(Full details with gradual migration strategy)*

---

## Phase 6: Testing & CI (Week 6)

### PR #10: Test Utilities Consolidation

**Status**: Independent
**Priority**: LOW
**Effort**: 8 hours
**Risk**: Low
**Lines Saved**: 540

*(Full details)*

### PR #11: CI/CD Workflow Consolidation

**Status**: Independent
**Priority**: LOW
**Effort**: 4 hours
**Risk**: Low
**Lines Saved**: 260

*(Full details)*

---

## Dependencies Graph

```
Phase 1:
  PR-1 (Config) ──┐
  PR-2 (Types)    │
                  │
Phase 2:          │
  PR-3 (OpenAPI) ─┼──┐
  PR-4 (TS Gen) ──┘  │
  PR-5 (Contract) ───┘

Phase 3:
  PR-6 (Validation) ──(depends on PR-1, PR-4)

Phase 4:
  PR-7 (HTTP Client) ─(depends on PR-1)
  PR-8 (WebSocket) ───(depends on PR-1)

Phase 5:
  PR-9 (Hooks) ───────(depends on PR-7)

Phase 6:
  PR-10 (Test Utils) ─(independent)
  PR-11 (CI/CD) ──────(independent)
```

---

## Risk Management

### High-Risk PRs

**PR #9 (React Hooks)**

- **Risk**: Component behavior changes
- **Mitigation**:
  1. Feature flags for gradual rollout
  2. Visual regression testing
  3. Component-by-component migration
  4. Extensive integration tests
  5. Performance benchmarks
  6. Manual QA for critical paths

### Medium-Risk PRs

**PR #2, #4, #6, #7**

- **Risk**: Type errors, validation changes, API failures
- **Mitigation**:
  1. Comprehensive unit tests
  2. Integration tests
  3. Staged rollout
  4. Canary deployment
  5. Monitoring and alerts

### Low-Risk PRs

**PR #1, #3, #5, #8, #10, #11**

- **Risk**: Minimal
- **Mitigation**: Standard testing and review

---

## Rollback Procedures

### Emergency Rollback

If critical issues are detected in production:

1. **Immediate**: Stop deployment if in progress
2. **Identify**: Determine which PR caused the issue
3. **Execute Rollback**: Use PR-specific rollback plan
4. **Verify**: Test rollback in staging
5. **Deploy**: Roll back to production
6. **Post-Mortem**: Analyze failure
7. **Fix and Retry**: Address issues and retry when ready

### Per-PR Rollback Complexity

| PR | Complexity | Time to Rollback |
|----|------------|------------------|
| PR-1 | Simple | 15 minutes |
| PR-2 | Medium | 1 hour |
| PR-3 | Trivial | 5 minutes |
| PR-4 | Medium | 1 hour |
| PR-5 | Trivial | 5 minutes |
| PR-6 | Complex | 2-4 hours |
| PR-7 | Medium | 1-2 hours |
| PR-8 | Easy | 30 minutes |
| PR-9 | Complex | 2-4 hours |
| PR-10 | Trivial | 15 minutes |
| PR-11 | Trivial | 5 minutes |

---

## Success Metrics

Track these metrics throughout the 6-week period:

### Quantitative

- **Duplicate Code Lines**: 8,400 → 2,688 (Target: < 3,000)
- **Duplication Percentage**: 12% → 3.8% (Target: < 5%)
- **Configuration Files**: 18 → 1
- **Validation Implementations**: 28 → 1
- **Service Implementations**: 24 → 1 base + services
- **Type Definition Files**: 15 → 1 generated

### Qualitative

- [ ] Single source of truth for all types
- [ ] Contract-driven development established
- [ ] Type safety guaranteed between layers
- [ ] Configuration centralized with validation
- [ ] Validation consistent across codebase
- [ ] Service layer follows DI pattern
- [ ] Test utilities centralized
- [ ] CI/CD workflows optimized

---

## Communication Plan

### Weekly Updates

Send to stakeholders every Friday:
- PRs completed this week
- PRs in progress
- Blockers or issues
- Next week's plan

### Team Standup

Daily 15-minute sync:
- What was completed yesterday
- What will be worked on today
- Any blockers

### Demo Sessions

After each phase completion:
- Demo new patterns to team
- Q&A session
- Gather feedback

---

## Next Steps

**Immediate Actions** (This Week):

1. [ ] Review and approve this PR plan
2. [ ] Assign owners to each PR
3. [ ] Create Jira epics and stories for all 11 PRs
4. [ ] Reserve team calendars for 6-week deduplication sprint
5. [ ] Communicate initiative to all stakeholders
6. [ ] Setup project tracking dashboard

**Phase 1 Kickoff** (Week 1):

1. [ ] Start PR #1: Configuration Centralization
2. [ ] Start PR #2: Investigation Types Unification
3. [ ] Daily standups to track progress
4. [ ] Address any blockers immediately

---

**Plan Author**: Orchestrator Agent
**Date**: 2025-11-06
**Version**: 1.0
