# Tasks: Unified Module Requirements

**Input**: Design documents from `/specs/007-unified-module-requirements/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Found: tech stack (TypeScript/Node.js), libraries (validation-lib, template-lib, reporting-lib)
2. Load optional design documents:
   → ✅ data-model.md: Extract entities → ModuleStructure, ComplianceRule, ValidationReport, ModuleTemplate
   → ✅ contracts/: module-validation-api.yaml → API endpoints
   → ✅ research.md: Multi-tier validation, graduated enforcement
   → ✅ quickstart.md: 6 scenarios for integration tests
3. Generate tasks by category:
   → Setup: project init, TypeScript config, linting
   → Tests: API contract tests, integration tests from scenarios
   → Core: models, validation services, CLI commands
   → Integration: file system access, template generation, reporting
   → Polish: unit tests, performance optimization, documentation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T061)
6. Generate dependency graph including critical architectural requirements
7. Create parallel execution examples
8. Validate task completeness: ✅ All requirements including critical architectural standards covered
9. Return: SUCCESS (61 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Libraries: `src/lib/validation/`, `src/lib/template/`, `src/lib/reporting/`
- CLI tools: `src/cli/validator.ts`, `src/cli/generator.ts`, `src/cli/reporter.ts`

## Phase 3.1: Setup
- [ ] T001 Create project structure with src/, tests/, docs/, dist/ directories
- [ ] T002 Initialize TypeScript project with Node.js 18+ dependencies (fs, path, yaml, commander)
- [ ] T003 [P] Configure ESLint, Prettier, and Jest testing framework
- [ ] T004 [P] Set up package.json with build, test, lint, dev scripts per constitutional requirements

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests [P]
- [ ] T005 [P] Contract test POST /modules/validate in tests/contract/test_validate_module.ts
- [ ] T006 [P] Contract test POST /modules/validate-batch in tests/contract/test_validate_batch.ts
- [ ] T007 [P] Contract test GET /templates in tests/contract/test_list_templates.ts
- [ ] T008 [P] Contract test POST /templates/{templateId}/generate in tests/contract/test_generate_module.ts
- [ ] T009 [P] Contract test GET /compliance/rules in tests/contract/test_compliance_rules.ts
- [ ] T010 [P] Contract test GET /compliance/reports in tests/contract/test_validation_reports.ts
- [ ] T011 [P] Contract test GET /compliance/ecosystem in tests/contract/test_ecosystem_compliance.ts

### Critical Architectural Validation Contract Tests [P]
- [ ] T012 [P] Contract test POST /architecture/scan-segregation in tests/contract/test_code_segregation.ts
- [ ] T013 [P] Contract test POST /architecture/check-distribution in tests/contract/test_distribution_architecture.ts
- [ ] T014 [P] Contract test POST /architecture/detect-mocks in tests/contract/test_mock_detection.ts
- [ ] T015 [P] Contract test POST /architecture/validate-builds in tests/contract/test_build_validation.ts
- [ ] T016 [P] Contract test POST /architecture/analyze-dependencies in tests/contract/test_dependency_analysis.ts

### Integration Tests [P]
- [ ] T017 [P] Integration test Scenario 1: Validate existing module in tests/integration/test_validate_existing_module.ts
- [ ] T018 [P] Integration test Scenario 2: Create new compliant module in tests/integration/test_create_compliant_module.ts
- [ ] T019 [P] Integration test Scenario 3: Batch validate all modules in tests/integration/test_batch_validate_all.ts
- [ ] T020 [P] Integration test Scenario 4: Fix common violations in tests/integration/test_fix_violations.ts
- [ ] T021 [P] Integration test Scenario 5: Monitor compliance trends in tests/integration/test_monitor_compliance.ts
- [ ] T022 [P] Integration test Scenario 6: Migrate legacy module in tests/integration/test_migrate_legacy.ts

### Architectural Validation Integration Tests [P]
- [ ] T023 [P] Integration test: Complete code segregation validation workflow in tests/integration/test_code_segregation_workflow.ts
- [ ] T024 [P] Integration test: Distribution architecture compliance across modules in tests/integration/test_distribution_compliance_workflow.ts
- [ ] T025 [P] Integration test: Mock/stub detection and reporting workflow in tests/integration/test_mock_detection_workflow.ts
- [ ] T026 [P] Integration test: Build validation across all CVPlus modules in tests/integration/test_build_validation_workflow.ts
- [ ] T027 [P] Integration test: Dependency chain integrity analysis workflow in tests/integration/test_dependency_analysis_workflow.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Models [P]
- [ ] T028 [P] ModuleStructure type and validation schema in src/models/ModuleStructure.ts
- [ ] T029 [P] ComplianceRule type and validation schema in src/models/ComplianceRule.ts
- [ ] T030 [P] ValidationReport type and aggregation logic in src/models/ValidationReport.ts
- [ ] T031 [P] ModuleTemplate type and customization logic in src/models/ModuleTemplate.ts
- [ ] T032 [P] Supporting types (ModuleType, RuleCategory, RuleSeverity, ValidationStatus) in src/models/types.ts

### Core Libraries [P]
- [ ] T033 [P] ValidationService core logic in src/lib/validation/ValidationService.ts
- [ ] T034 [P] TemplateService core logic in src/lib/template/TemplateService.ts
- [ ] T035 [P] ReportingService core logic in src/lib/reporting/ReportingService.ts
- [ ] T036 [P] FileSystemValidator for module structure checks in src/lib/validation/FileSystemValidator.ts
- [ ] T037 [P] ComplianceRuleEngine for rule execution in src/lib/validation/ComplianceRuleEngine.ts
- [ ] T038 [P] TemplateGenerator for module scaffolding in src/lib/template/TemplateGenerator.ts

### Critical Architectural Validation Services [P]
- [ ] T039 [P] CodeSegregationScanner for misplaced code detection in src/lib/architecture/CodeSegregationScanner.ts
- [ ] T040 [P] DistributionValidator for dist/ folder compliance in src/lib/architecture/DistributionValidator.ts
- [ ] T041 [P] MockDetector for stub/placeholder/mock detection in src/lib/architecture/MockDetector.ts
- [ ] T042 [P] BuildValidator for clean build verification in src/lib/architecture/BuildValidator.ts
- [ ] T043 [P] DependencyAnalyzer for circular dependency detection in src/lib/architecture/DependencyAnalyzer.ts

### CLI Implementation
- [ ] T044 cvplus-validator CLI with validate, validate-all, fix, ecosystem, segregation, distribution, mocks, builds, dependencies commands in src/cli/validator.ts
- [ ] T045 cvplus-generator CLI with list-templates, create commands in src/cli/generator.ts
- [ ] T046 cvplus-reporter CLI with generate, monitor, trends commands in src/cli/reporter.ts
- [ ] T047 cvplus-migrator CLI with analyze, plan, migrate commands in src/cli/migrator.ts
- [ ] T048 cvplus-architect CLI with scan-segregation, check-distribution, detect-mocks, validate-builds, analyze-dependencies commands in src/cli/architect.ts

## Phase 3.4: Integration
- [ ] T049 Integrate ValidationService with file system access and error handling
- [ ] T050 Implement graduated enforcement mechanism (warning → error → critical → auto-fix)
- [ ] T051 Add structured logging for validation results and compliance scores
- [ ] T052 Implement multi-tier validation schedule (pre-commit, CI/CD, daily, on-demand)
- [ ] T053 Integrate architectural validation services with main validation workflow
- [ ] T054 Implement comprehensive architectural violation reporting and remediation

## Phase 3.5: Polish
- [ ] T055 [P] Unit tests for validation logic in tests/unit/test_validation_service.ts
- [ ] T056 [P] Unit tests for architectural validation services in tests/unit/test_architectural_validation.ts
- [ ] T057 [P] Performance optimization to meet <30 second validation requirement
- [ ] T058 [P] Generate llms.txt documentation for all libraries in docs/llms.txt
- [ ] T059 [P] Create module templates for backend, frontend, utility, API, and core types
- [ ] T060 [P] Add comprehensive error messages and remediation guidance
- [ ] T061 [P] Implement caching system for validation results with hash-based invalidation

## Dependencies
- Setup (T001-T004) before all other phases
- Contract tests (T005-T016) before any implementation
- Integration tests (T017-T027) before implementation
- Models (T028-T032) before services (T033-T043)
- Services before CLI (T044-T048)
- Core implementation before integration (T049-T054)
- Implementation before polish (T055-T061)

## Parallel Example
```bash
# Phase 3.2: Launch contract tests together (T005-T016):
Task: "Contract test POST /modules/validate in tests/contract/test_validate_module.ts"
Task: "Contract test POST /modules/validate-batch in tests/contract/test_validate_batch.ts"
Task: "Contract test GET /templates in tests/contract/test_list_templates.ts"
Task: "Contract test POST /templates/{templateId}/generate in tests/contract/test_generate_module.ts"
Task: "Contract test GET /compliance/rules in tests/contract/test_compliance_rules.ts"
Task: "Contract test GET /compliance/reports in tests/contract/test_validation_reports.ts"
Task: "Contract test GET /compliance/ecosystem in tests/contract/test_ecosystem_compliance.ts"
Task: "Contract test POST /architecture/scan-segregation in tests/contract/test_code_segregation.ts"
Task: "Contract test POST /architecture/check-distribution in tests/contract/test_distribution_architecture.ts"
Task: "Contract test POST /architecture/detect-mocks in tests/contract/test_mock_detection.ts"
Task: "Contract test POST /architecture/validate-builds in tests/contract/test_build_validation.ts"
Task: "Contract test POST /architecture/analyze-dependencies in tests/contract/test_dependency_analysis.ts"

# Phase 3.2: Launch integration tests together (T017-T027):
Task: "Integration test Scenario 1: Validate existing module in tests/integration/test_validate_existing_module.ts"
Task: "Integration test Scenario 2: Create new compliant module in tests/integration/test_create_compliant_module.ts"
Task: "Integration test Scenario 3: Batch validate all modules in tests/integration/test_batch_validate_all.ts"
Task: "Integration test Scenario 4: Fix common violations in tests/integration/test_fix_violations.ts"
Task: "Integration test Scenario 5: Monitor compliance trends in tests/integration/test_monitor_compliance.ts"
Task: "Integration test Scenario 6: Migrate legacy module in tests/integration/test_migrate_legacy.ts"
Task: "Integration test: Complete code segregation validation workflow in tests/integration/test_code_segregation_workflow.ts"
Task: "Integration test: Distribution architecture compliance across modules in tests/integration/test_distribution_compliance_workflow.ts"
Task: "Integration test: Mock/stub detection and reporting workflow in tests/integration/test_mock_detection_workflow.ts"
Task: "Integration test: Build validation across all CVPlus modules in tests/integration/test_build_validation_workflow.ts"
Task: "Integration test: Dependency chain integrity analysis workflow in tests/integration/test_dependency_analysis_workflow.ts"

# Phase 3.3: Launch model creation together (T028-T032):
Task: "ModuleStructure type and validation schema in src/models/ModuleStructure.ts"
Task: "ComplianceRule type and validation schema in src/models/ComplianceRule.ts"
Task: "ValidationReport type and aggregation logic in src/models/ValidationReport.ts"
Task: "ModuleTemplate type and customization logic in src/models/ModuleTemplate.ts"
Task: "Supporting types (ModuleType, RuleCategory, RuleSeverity, ValidationStatus) in src/models/types.ts"

# Phase 3.3: Launch core library development together (T033-T043):
Task: "ValidationService core logic in src/lib/validation/ValidationService.ts"
Task: "TemplateService core logic in src/lib/template/TemplateService.ts"
Task: "ReportingService core logic in src/lib/reporting/ReportingService.ts"
Task: "FileSystemValidator for module structure checks in src/lib/validation/FileSystemValidator.ts"
Task: "ComplianceRuleEngine for rule execution in src/lib/validation/ComplianceRuleEngine.ts"
Task: "TemplateGenerator for module scaffolding in src/lib/template/TemplateGenerator.ts"
Task: "CodeSegregationScanner for misplaced code detection in src/lib/architecture/CodeSegregationScanner.ts"
Task: "DistributionValidator for dist/ folder compliance in src/lib/architecture/DistributionValidator.ts"
Task: "MockDetector for stub/placeholder/mock detection in src/lib/architecture/MockDetector.ts"
Task: "BuildValidator for clean build verification in src/lib/architecture/BuildValidator.ts"
Task: "DependencyAnalyzer for circular dependency detection in src/lib/architecture/DependencyAnalyzer.ts"
```

## Notes
- [P] tasks = different files, no dependencies between them
- Verify ALL tests fail before implementing (RED phase of TDD)
- Commit after each task completion
- Follow constitutional principles: library-first, CLI per library, TDD enforcement

## Task Generation Rules Applied

1. **From Contracts (module-validation-api.yaml)**:
   - 7 endpoints → 7 contract test tasks [P] (T005-T011)
   - API implementation integrated into library services

2. **From Critical Architectural Requirements**:
   - 5 architectural standards → 5 contract tests [P] (T012-T016)
   - 5 architectural services → 5 integration tests [P] (T023-T027)
   - 5 implementation services → 5 service tasks [P] (T039-T043)
   - Architectural CLI → 1 CLI implementation task (T048)

3. **From Data Model**:
   - 4 entities → 4 model creation tasks [P] (T028-T031)
   - 1 supporting types file [P] (T032)
   - Entity relationships → service layer integration (T049-T054)

4. **From Quickstart Scenarios**:
   - 6 scenarios → 6 integration test tasks [P] (T017-T022)
   - CLI usage examples → 4 CLI implementation tasks (T044-T047)

5. **From Implementation Plan**:
   - 3 libraries → 6 service tasks [P] (T033-T038)
   - Constitutional requirements → setup and polish tasks

## Validation Checklist ✅
- [x] All API endpoints have corresponding contract tests (T005-T016)
- [x] All entities have model creation tasks (T028-T032)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD order enforced: Contract→Integration→Models→Services→CLI→Polish
- [x] Constitutional compliance: library-first architecture, CLI per library
- [x] Performance requirements addressed: <30 second validation (T057)
- [x] All quickstart scenarios have corresponding integration tests
- [x] Multi-tier validation and graduated enforcement implemented (T050, T052)
- [x] Critical architectural requirements fully integrated:
  - [x] Code segregation validation (T012, T023, T039)
  - [x] Distribution architecture enforcement (T013, T024, T040)
  - [x] Mock/stub detection (T014, T025, T041)
  - [x] Build validation (T015, T026, T042)
  - [x] Dependency chain integrity (T016, T027, T043)
- [x] Architectural CLI commands implemented (T048)
- [x] Comprehensive architectural integration workflow (T053-T054)