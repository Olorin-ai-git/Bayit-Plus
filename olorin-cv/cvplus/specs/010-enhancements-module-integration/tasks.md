# Tasks: Enhancements Module Integration & Recovery

**Input**: Design documents from `/specs/010-enhancements-module-integration/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✅ Extracted: TypeScript 5.0+, React 18+, Firebase Functions, Vitest/Jest testing
   ✅ Structure: CVPlus modular architecture - packages/enhancements/ submodule
2. Load optional design documents:
   ✅ data-model.md: Extract entities → EnhancementService, EnhancementComponent, FileMapping, MigrationManifest
   ✅ contracts/: enhancement-service.yaml, frontend-components.ts → contract test tasks
   ✅ research.md: Layer 3 positioning, dependency resolution, migration scope
3. Generate tasks by category:
   ✅ Setup: migration baseline, validation infrastructure
   ✅ Tests: contract preservation tests, migration validation tests
   ✅ Core: file migrations, service implementations, component migrations
   ✅ Integration: import chain updates, build integration, deployment validation
   ✅ Polish: performance validation, documentation updates, rollback testing
4. Apply task rules:
   ✅ Different files = mark [P] for parallel
   ✅ Same file = sequential (no [P])
   ✅ Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. SUCCESS - 42 tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **CVPlus Structure**: `packages/enhancements/` submodule integration
- **Migration Sources**: `packages/processing/`, `frontend/src/services/`, `functions/src/`
- **Target Structure**: `packages/enhancements/src/backend/`, `packages/enhancements/src/frontend/`

## Phase 3.1: Setup & Baseline Documentation
- [ ] T001 Create migration baseline documentation in `/Users/gklainert/Documents/cvplus/specs/010-enhancements-module-integration/migration-baseline.md`
- [ ] T002 Document current build status and test coverage baselines using `npm run build` and `npm test`
- [ ] T003 [P] Generate current API export inventory in `/Users/gklainert/Documents/cvplus/migration-exports-baseline.txt`
- [ ] T004 [P] Verify enhancements module structure exists in `/Users/gklainert/Documents/cvplus/packages/enhancements/`

## Phase 3.2: Contract Preservation Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY migration**
- [ ] T005 [P] Contract test for `/enhancements/process` endpoint in `/Users/gklainert/Documents/cvplus/packages/enhancements/src/tests/contract/enhancement-process.test.ts`
- [ ] T006 [P] Contract test for `/enhancements/calendar/sync` endpoint in `/Users/gklainert/Documents/cvplus/packages/enhancements/src/tests/contract/calendar-sync.test.ts`
- [ ] T007 [P] Contract test for `/enhancements/booking/create` endpoint in `/Users/gklainert/Documents/cvplus/packages/enhancements/src/tests/contract/booking-create.test.ts`
- [ ] T008 [P] Frontend component contract test for CSSOptimizerService in `/Users/gklainert/Documents/cvplus/packages/enhancements/src/tests/contract/css-optimizer.test.ts`
- [ ] T009 [P] Frontend component contract test for ErrorRecoveryService in `/Users/gklainert/Documents/cvplus/packages/enhancements/src/tests/contract/error-recovery.test.ts`
- [ ] T010 [P] Frontend component contract test for FeaturePriorityService in `/Users/gklainert/Documents/cvplus/packages/enhancements/src/tests/contract/feature-priority.test.ts`
- [ ] T011 [P] Integration test for enhancement processing workflow in `/Users/gklainert/Documents/cvplus/packages/enhancements/src/tests/integration/enhancement-workflow.test.ts`
- [ ] T012 [P] Integration test for calendar integration workflow in `/Users/gklainert/Documents/cvplus/packages/enhancements/src/tests/integration/calendar-integration.test.ts`

## Phase 3.3: Migration Validation Models (ONLY after tests are failing)
- [ ] T013 [P] Create FileMapping entity model in `/Users/gklainert/Documents/cvplus/packages/enhancements/src/models/FileMapping.ts`
- [ ] T014 [P] Create MigrationManifest entity model in `/Users/gklainert/Documents/cvplus/packages/enhancements/src/models/MigrationManifest.ts`
- [ ] T015 [P] Create APIContract entity model in `/Users/gklainert/Documents/cvplus/packages/enhancements/src/models/APIContract.ts`
- [ ] T016 [P] Create DependencyMapping entity model in `/Users/gklainert/Documents/cvplus/packages/enhancements/src/models/DependencyMapping.ts`
- [ ] T017 [P] Create BuildValidation entity model in `/Users/gklainert/Documents/cvplus/packages/enhancements/src/models/BuildValidation.ts`

## Phase 3.4: Backend Service Migration
- [ ] T018 Migrate enhancement processing service from `/Users/gklainert/Documents/cvplus/packages/processing/src/backend/services/enhancement-processing.service.ts` to `/Users/gklainert/Documents/cvplus/packages/enhancements/src/backend/services/cv-enhancement.service.ts`
- [ ] T019 Create enhancement processing facade in `/Users/gklainert/Documents/cvplus/packages/processing/src/backend/services/enhancement-processing.service.ts` for backward compatibility
- [ ] T020 Update dependency imports in migrated service to use @cvplus/core, @cvplus/auth patterns
- [ ] T021 Migrate enhancement service types from `/Users/gklainert/Documents/cvplus/packages/processing/src/services/enhancements/` to `/Users/gklainert/Documents/cvplus/packages/enhancements/src/types/`

## Phase 3.5: Frontend Service Migration
- [ ] T022 [P] Migrate CSS optimizer service from `/Users/gklainert/Documents/cvplus/frontend/src/services/enhancement/css-optimizer.service.ts` to `/Users/gklainert/Documents/cvplus/packages/enhancements/src/frontend/services/css-optimizer.service.ts`
- [ ] T023 [P] Migrate error recovery service from `/Users/gklainert/Documents/cvplus/frontend/src/services/enhancement/error-recovery.service.ts` to `/Users/gklainert/Documents/cvplus/packages/enhancements/src/frontend/services/error-recovery.service.ts`
- [ ] T024 [P] Migrate feature priority service from `/Users/gklainert/Documents/cvplus/frontend/src/services/enhancement/feature-priority.service.ts` to `/Users/gklainert/Documents/cvplus/packages/enhancements/src/frontend/services/feature-priority.service.ts`
- [ ] T025 [P] Migrate HTML validator service from `/Users/gklainert/Documents/cvplus/frontend/src/services/enhancement/html-validator.service.ts` to `/Users/gklainert/Documents/cvplus/packages/enhancements/src/frontend/services/html-validator.service.ts`
- [ ] T026 [P] Migrate performance monitor service from `/Users/gklainert/Documents/cvplus/frontend/src/services/enhancement/performance-monitor.service.ts` to `/Users/gklainert/Documents/cvplus/packages/enhancements/src/frontend/services/performance-monitor.service.ts`
- [ ] T027 [P] Migrate preview service from `/Users/gklainert/Documents/cvplus/frontend/src/services/enhancement/preview.service.ts` to `/Users/gklainert/Documents/cvplus/packages/enhancements/src/frontend/services/preview.service.ts`
- [ ] T028 [P] Migrate progressive enhancement utility from `/Users/gklainert/Documents/cvplus/frontend/src/services/progressive-enhancement/HTMLContentMerger.ts` to `/Users/gklainert/Documents/cvplus/packages/enhancements/src/frontend/utilities/HTMLContentMerger.ts`

## Phase 3.6: Component and Type Migration
- [ ] T029 [P] Migrate frontend enhancement components from `/Users/gklainert/Documents/cvplus/frontend/src/components/enhancement/` to `/Users/gklainert/Documents/cvplus/packages/enhancements/src/frontend/components/`
- [ ] T030 Create centralized enhancement types export in `/Users/gklainert/Documents/cvplus/packages/enhancements/src/types/index.ts`
- [ ] T031 Update enhancement module main exports in `/Users/gklainert/Documents/cvplus/packages/enhancements/src/index.ts`

## Phase 3.7: Import Chain Updates & Integration
- [ ] T032 Update all @cvplus imports in functions/src/index.ts to reference @cvplus/enhancements for enhancement functionality
- [ ] T033 Update processing module imports to use @cvplus/enhancements facade pattern
- [ ] T034 Update frontend component imports across CVPlus to use @cvplus/enhancements pattern
- [ ] T035 Remove original enhancement files from processing module after facade validation
- [ ] T036 Remove original enhancement service directories from frontend after migration validation

## Phase 3.8: Build System Integration & Validation
- [ ] T037 Update enhancements module package.json dependencies to include all required imports
- [ ] T038 Run full TypeScript compilation validation across entire CVPlus project with `npm run build`
- [ ] T039 Execute all enhancement-related tests with `npm test` and validate >90% coverage maintained
- [ ] T040 Firebase Functions deployment validation with `firebase deploy --only functions`

## Phase 3.9: Performance & Quality Validation
- [ ] T041 [P] Execute performance benchmarking using quickstart guide validation scenarios
- [ ] T042 [P] Create rollback validation script in `/Users/gklainert/Documents/cvplus/scripts/enhancement-migration-rollback.sh`

## Dependencies
- Baseline documentation (T001-T004) before contract tests (T005-T012)
- Contract tests (T005-T012) before models (T013-T017)
- Models (T013-T017) before service migrations (T018-T021)
- Backend migrations (T018-T021) before frontend migrations (T022-T028)
- File migrations (T018-T028) before component migration (T029-T031)
- Component migration (T029-T031) before import updates (T032-T036)
- Import updates (T032-T036) before build validation (T037-T040)
- Build validation (T037-T040) before performance validation (T041-T042)

## Parallel Execution Examples

### Contract Tests (After T004 Setup)
```bash
# Launch T005-T010 together (different contract files):
Task: "Contract test for /enhancements/process endpoint in enhancement-process.test.ts"
Task: "Contract test for /enhancements/calendar/sync endpoint in calendar-sync.test.ts"
Task: "Contract test for /enhancements/booking/create endpoint in booking-create.test.ts"
Task: "Frontend component contract test for CSSOptimizerService in css-optimizer.test.ts"
Task: "Frontend component contract test for ErrorRecoveryService in error-recovery.test.ts"
Task: "Frontend component contract test for FeaturePriorityService in feature-priority.test.ts"
```

### Model Creation (After Contract Tests Pass)
```bash
# Launch T013-T017 together (different model files):
Task: "Create FileMapping entity model in FileMapping.ts"
Task: "Create MigrationManifest entity model in MigrationManifest.ts"
Task: "Create APIContract entity model in APIContract.ts"
Task: "Create DependencyMapping entity model in DependencyMapping.ts"
Task: "Create BuildValidation entity model in BuildValidation.ts"
```

### Frontend Service Migration (After Backend Migration)
```bash
# Launch T022-T027 together (different service files):
Task: "Migrate CSS optimizer service to css-optimizer.service.ts"
Task: "Migrate error recovery service to error-recovery.service.ts"
Task: "Migrate feature priority service to feature-priority.service.ts"
Task: "Migrate HTML validator service to html-validator.service.ts"
Task: "Migrate performance monitor service to performance-monitor.service.ts"
Task: "Migrate preview service to preview.service.ts"
```

## Migration-Specific Notes
- **API Contract Preservation**: All migrations must preserve external API contracts through facade pattern
- **Layer Architecture Compliance**: Enhancements module positioned at Layer 3, dependencies only on Layers 0-2
- **Build Validation**: Each migration phase must pass TypeScript compilation and testing
- **Rollback Strategy**: Atomic commits per task enable quick rollback if issues arise
- **Performance Monitoring**: Build time <20% increase, test time <15% increase limits enforced

## Validation Checklist
*GATE: Checked before considering migration complete*

- [ ] All API contracts preserved and tested
- [ ] All migrated files compile with TypeScript strict mode
- [ ] All tests pass with >90% coverage maintained
- [ ] Build process completes successfully
- [ ] Firebase Functions deploy without errors
- [ ] Import chains follow @cvplus/enhancements pattern
- [ ] Performance benchmarks within acceptable limits
- [ ] Architecture compliance achieved (Layer 3 positioning)
- [ ] Rollback procedure validated and documented

## Success Criteria
- ✅ All 20+ enhancement files migrated to enhancements submodule
- ✅ Zero breaking changes for external consumers
- ✅ CVPlus Layer Architecture fully compliant
- ✅ All functionality preserved with no regression
- ✅ Build and deployment processes successful
- ✅ Comprehensive test coverage maintained