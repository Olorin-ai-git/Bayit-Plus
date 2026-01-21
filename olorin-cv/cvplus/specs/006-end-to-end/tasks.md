# Tasks: End-to-End Testing Flows Submodule

**Input**: Design documents from `/specs/006-end-to-end/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✓ Extracted: TypeScript, Jest/Vitest, Firebase Emulator, 3 libraries
2. Load optional design documents:
   ✓ data-model.md: 7 entities → model tasks
   ✓ contracts/: e2e-testing-api.yaml → contract test tasks
   ✓ research.md: Performance targets → setup tasks
3. Generate tasks by category:
   ✓ Setup: submodule, dependencies, Firebase emulator
   ✓ Tests: 10 contract tests, 5 integration tests
   ✓ Core: 7 models, 3 services, 3 CLI commands
   ✓ Integration: Firebase, mock data, orchestration
   ✓ Polish: unit tests, performance, documentation
4. Apply task rules:
   ✓ Different files = marked [P] for parallel
   ✓ Same file = sequential (no [P])
   ✓ Tests before implementation (TDD)
5. Number tasks sequentially (T001-T042)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness: ✓
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Submodule structure**: `packages/e2e-flows/` (git submodule)
- **Libraries**: `packages/e2e-flows/src/libs/` (e2e-flows, mock-data, api-testing)
- **Tests**: `packages/e2e-flows/tests/` (contract, integration, unit)
- **CLI**: `packages/e2e-flows/src/cli/` (command-line interfaces)

## Phase 3.1: Setup
- [ ] T001 Create git submodule at `git@github.com:gilco1973/cvplus-e2e-flows.git` in `packages/e2e-flows/`
- [ ] T002 Initialize TypeScript project with Jest/Vitest dependencies in `packages/e2e-flows/package.json`
- [ ] T003 [P] Configure ESLint and Prettier in `packages/e2e-flows/.eslintrc.js` and `.prettierrc`
- [ ] T004 [P] Setup Firebase emulator configuration in `packages/e2e-flows/firebase.json`
- [ ] T005 [P] Create environment template in `packages/e2e-flows/.env.example`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (API Endpoints)
- [ ] T006 [P] Contract test GET /scenarios in `packages/e2e-flows/tests/contract/scenarios.get.test.ts`
- [ ] T007 [P] Contract test POST /scenarios in `packages/e2e-flows/tests/contract/scenarios.post.test.ts`
- [ ] T008 [P] Contract test POST /scenarios/{id}/execute in `packages/e2e-flows/tests/contract/scenarios.execute.test.ts`
- [ ] T009 [P] Contract test GET /executions/{id} in `packages/e2e-flows/tests/contract/executions.get.test.ts`
- [ ] T010 [P] Contract test GET /mock-data in `packages/e2e-flows/tests/contract/mock-data.get.test.ts`
- [ ] T011 [P] Contract test POST /mock-data in `packages/e2e-flows/tests/contract/mock-data.post.test.ts`
- [ ] T012 [P] Contract test GET /environments in `packages/e2e-flows/tests/contract/environments.get.test.ts`
- [ ] T013 [P] Contract test GET /submodules/{name}/flows in `packages/e2e-flows/tests/contract/submodules.get.test.ts`
- [ ] T014 [P] Contract test POST /submodules/{name}/flows in `packages/e2e-flows/tests/contract/submodules.post.test.ts`

### Integration Tests (User Stories)
- [ ] T015 [P] Integration test complete user journey flow in `packages/e2e-flows/tests/integration/complete-journey.test.ts`
- [ ] T016 [P] Integration test submodule isolation flow in `packages/e2e-flows/tests/integration/submodule-isolation.test.ts`
- [ ] T017 [P] Integration test API validation flow in `packages/e2e-flows/tests/integration/api-validation.test.ts`
- [ ] T018 [P] Integration test CI/CD pipeline execution in `packages/e2e-flows/tests/integration/ci-cd-execution.test.ts`
- [ ] T019 [P] Integration test regression detection flow in `packages/e2e-flows/tests/integration/regression-detection.test.ts`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Entity Models
- [ ] T020 [P] TestScenario model in `packages/e2e-flows/src/models/TestScenario.ts`
- [ ] T021 [P] MockDataSet model in `packages/e2e-flows/src/models/MockDataSet.ts`
- [ ] T022 [P] FlowResult model in `packages/e2e-flows/src/models/FlowResult.ts`
- [ ] T023 [P] TestEnvironment model in `packages/e2e-flows/src/models/TestEnvironment.ts`
- [ ] T024 [P] APITestCase model in `packages/e2e-flows/src/models/APITestCase.ts`
- [ ] T025 [P] SubmoduleFlow model in `packages/e2e-flows/src/models/SubmoduleFlow.ts`
- [ ] T026 [P] RegressionBaseline model in `packages/e2e-flows/src/models/RegressionBaseline.ts`

### Core Services
- [ ] T027 [P] E2EFlowsService (test orchestration) in `packages/e2e-flows/src/services/E2EFlowsService.ts`
- [ ] T028 [P] MockDataService (data generation) in `packages/e2e-flows/src/services/MockDataService.ts`
- [ ] T029 [P] APITestingService (curl validation) in `packages/e2e-flows/src/services/APITestingService.ts`

### CLI Commands
- [ ] T030 [P] e2e CLI commands (--run, --list) in `packages/e2e-flows/src/cli/e2e-commands.ts`
- [ ] T031 [P] mock-data CLI commands (--generate, --clean) in `packages/e2e-flows/src/cli/mock-data-commands.ts`
- [ ] T032 [P] api-test CLI commands (--endpoint, --suite) in `packages/e2e-flows/src/cli/api-test-commands.ts`

### API Endpoints Implementation
- [ ] T033 GET /scenarios endpoint in `packages/e2e-flows/src/api/scenarios.controller.ts`
- [ ] T034 POST /scenarios endpoint (extends scenarios.controller.ts)
- [ ] T035 POST /scenarios/{id}/execute endpoint (extends scenarios.controller.ts)
- [ ] T036 GET /executions/{id} endpoint in `packages/e2e-flows/src/api/executions.controller.ts`
- [ ] T037 Mock data endpoints (GET/POST /mock-data) in `packages/e2e-flows/src/api/mock-data.controller.ts`
- [ ] T038 Environment endpoints in `packages/e2e-flows/src/api/environments.controller.ts`
- [ ] T039 Submodule flow endpoints in `packages/e2e-flows/src/api/submodules.controller.ts`

## Phase 3.4: Integration
- [ ] T040 Firebase emulator integration in `packages/e2e-flows/src/integrations/firebase.integration.ts`
- [ ] T041 Test execution orchestrator in `packages/e2e-flows/src/orchestrator/TestOrchestrator.ts`
- [ ] T042 Performance metrics collector in `packages/e2e-flows/src/metrics/PerformanceCollector.ts`
- [ ] T043 Error handling and logging middleware in `packages/e2e-flows/src/middleware/error-handler.ts`

## Phase 3.5: Polish
- [ ] T044 [P] Unit tests for TestScenario model in `packages/e2e-flows/tests/unit/models/TestScenario.test.ts`
- [ ] T045 [P] Unit tests for MockDataService in `packages/e2e-flows/tests/unit/services/MockDataService.test.ts`
- [ ] T046 [P] Unit tests for APITestingService in `packages/e2e-flows/tests/unit/services/APITestingService.test.ts`
- [ ] T047 [P] Performance tests (20-minute execution limit) in `packages/e2e-flows/tests/performance/execution-limits.test.ts`
- [ ] T048 [P] Load testing scenarios (10K concurrent users) in `packages/e2e-flows/tests/performance/load-tests.test.ts`
- [ ] T049 [P] Update documentation in `packages/e2e-flows/README.md`
- [ ] T050 [P] Create llms.txt documentation in `packages/e2e-flows/docs/llms.txt`
- [ ] T051 Validate quickstart scenarios against implementation
- [ ] T052 Remove code duplication and optimize performance

## Dependencies
- Setup tasks (T001-T005) before all other tasks
- Contract tests (T006-T014) before implementation (T020-T039)
- Integration tests (T015-T019) before implementation
- Entity models (T020-T026) before services (T027-T029)
- Services (T027-T029) before API endpoints (T033-T039)
- Core services before CLI commands (T030-T032)
- Integration tasks (T040-T043) after core implementation
- Polish tasks (T044-T052) after all implementation complete

## Parallel Execution Examples

### Phase 3.2: Contract Tests (Run Together)
```bash
# Launch T006-T014 together:
Task(subagent_type="test-writer-fixer", description="Contract test GET /scenarios", prompt="Create contract test for GET /scenarios endpoint in packages/e2e-flows/tests/contract/scenarios.get.test.ts following OpenAPI spec")

Task(subagent_type="test-writer-fixer", description="Contract test POST /scenarios", prompt="Create contract test for POST /scenarios endpoint in packages/e2e-flows/tests/contract/scenarios.post.test.ts following OpenAPI spec")

Task(subagent_type="test-writer-fixer", description="Contract test scenario execution", prompt="Create contract test for POST /scenarios/{id}/execute endpoint in packages/e2e-flows/tests/contract/scenarios.execute.test.ts")

# Continue for all contract tests...
```

### Phase 3.2: Integration Tests (Run Together)
```bash
# Launch T015-T019 together:
Task(subagent_type="test-writer-fixer", description="Integration test complete journey", prompt="Create integration test for complete user journey flow in packages/e2e-flows/tests/integration/complete-journey.test.ts covering CV upload through portal sharing")

Task(subagent_type="test-writer-fixer", description="Integration test submodule isolation", prompt="Create integration test for submodule isolation flow in packages/e2e-flows/tests/integration/submodule-isolation.test.ts testing cv-processing module independently")
```

### Phase 3.3: Entity Models (Run Together)
```bash
# Launch T020-T026 together:
Task(subagent_type="typescript-pro", description="TestScenario model", prompt="Create TestScenario TypeScript model in packages/e2e-flows/src/models/TestScenario.ts with validation rules and state transitions as specified in data-model.md")

Task(subagent_type="typescript-pro", description="MockDataSet model", prompt="Create MockDataSet TypeScript model in packages/e2e-flows/src/models/MockDataSet.ts with schema validation and checksum verification")

Task(subagent_type="typescript-pro", description="FlowResult model", prompt="Create FlowResult TypeScript model in packages/e2e-flows/src/models/FlowResult.ts with performance metrics and error handling")
```

### Phase 3.3: Core Services (Run Together)
```bash
# Launch T027-T029 together:
Task(subagent_type="typescript-pro", description="E2EFlowsService implementation", prompt="Create E2EFlowsService in packages/e2e-flows/src/services/E2EFlowsService.ts for test orchestration and scenario execution")

Task(subagent_type="typescript-pro", description="MockDataService implementation", prompt="Create MockDataService in packages/e2e-flows/src/services/MockDataService.ts for realistic test data generation with Faker.js")

Task(subagent_type="typescript-pro", description="APITestingService implementation", prompt="Create APITestingService in packages/e2e-flows/src/services/APITestingService.ts for curl-based API validation")
```

### Phase 3.5: Unit Tests (Run Together)
```bash
# Launch T044-T050 together:
Task(subagent_type="test-writer-fixer", description="TestScenario unit tests", prompt="Create comprehensive unit tests for TestScenario model in packages/e2e-flows/tests/unit/models/TestScenario.test.ts")

Task(subagent_type="test-writer-fixer", description="MockDataService unit tests", prompt="Create unit tests for MockDataService in packages/e2e-flows/tests/unit/services/MockDataService.test.ts")

Task(subagent_type="documentation-specialist", description="Update README documentation", prompt="Create comprehensive README.md in packages/e2e-flows/README.md with installation, usage, and examples")
```

## Validation Checklist
*GATE: Checked during execution*

- [x] All contracts have corresponding tests (T006-T014)
- [x] All entities have model tasks (T020-T026)
- [x] All tests come before implementation (T006-T019 before T020-T039)
- [x] Parallel tasks truly independent (different files, no dependencies)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

## Notes
- [P] tasks = different files, no dependencies - can run simultaneously
- Verify all tests fail before implementing (TDD requirement)
- Commit after completing each task
- Focus on libraries: e2e-flows (orchestration), mock-data (generation), api-testing (validation)
- Performance targets: 20-minute max execution, 10K concurrent users, <3s response times
- Integration with existing CVPlus submodule architecture (18+ modules, 166+ Firebase Functions)