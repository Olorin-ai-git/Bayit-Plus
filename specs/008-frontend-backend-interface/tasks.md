# Tasks: Frontend-Backend Interface Compatibility

**Input**: Design documents from `/specs/001-frontend-backend-interface/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `olorin-server/app/`, `olorin-server/test/`
- **Frontend**: `olorin-front/src/`, `olorin-front/test/`
- **CI/CD**: `.github/workflows/`
- **Documentation**: `docs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Install backend dependencies: `cd olorin-server && poetry add schemathesis pytest-cov openapi-spec-validator`
- [X] T002 Install frontend dependencies: `cd olorin-front && npm install --save-dev openapi-typescript openapi-typescript-codegen dredd ajv`
- [X] T003 [P] Create `.env.example` files with required config keys in both `olorin-server/` and `olorin-front/`
- [X] T004 [P] Add `openapi.json` to `.gitignore` in `olorin-server/`
- [X] T005 [P] Add `src/api/generated/` to `.gitignore` in `olorin-front/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create configuration schema in `olorin-server/app/config/api_config.py` with Pydantic validation for `BACKEND_URL`, `API_BASE_URL`, `REQUEST_TIMEOUT_MS`, `CONTRACT_TEST_TIMEOUT`
- [X] T007 Create configuration schema in `olorin-front/src/config/environment.ts` with runtime validation for `REACT_APP_API_BASE_URL`, `REACT_APP_API_VERSION`, `REACT_APP_REQUEST_TIMEOUT_MS`
- [X] T008 [P] Setup structured logging in `olorin-server/app/logging_config.py` with log levels from environment variables
- [X] T009 [P] Setup structured logging in `olorin-front/src/utils/logger.ts` with log levels from environment
- [X] T010 Create base Pydantic models in `olorin-server/app/router/models/base.py` with common fields (id, created_at, updated_at)
- [X] T011 Setup FastAPI app configuration in `olorin-server/app/main.py` with OpenAPI metadata (title, version, description)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Schema-First Development with Auto-Generated Types (Priority: P1) 🎯 MVP

**Goal**: Enable frontend developers to consume auto-generated TypeScript types from backend OpenAPI schema

**Independent Test**: Generate OpenAPI schema from backend, run code generator to produce TypeScript types, import types in frontend code, verify compilation succeeds with correct types

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T012 [P] [US1] Backend schema validation test in `olorin-server/test/unit/test_openapi_schema.py` - verify schema validates against OpenAPI 3.1 spec
- [ ] T013 [P] [US1] TypeScript type generation test in `olorin-front/test/unit/type-generation.test.ts` - verify types compile without errors

### Implementation for User Story 1

- [ ] T014 [P] [US1] Create `TimeRange` Pydantic model in `olorin-server/app/router/models/investigation_models.py` with `start_time` and `end_time` datetime fields, validation, examples
- [ ] T015 [P] [US1] Create `EntityType` enum in `olorin-server/app/router/models/investigation_models.py` with values (email, phone, device_id, ip_address, user_id)
- [ ] T016 [P] [US1] Create `InvestigationRequest` Pydantic model in `olorin-server/app/router/models/investigation_models.py` with entity_id, entity_type, optional time_range
- [ ] T017 [P] [US1] Create `InvestigationResponse` Pydantic model in `olorin-server/app/router/models/investigation_models.py` with investigation_id, status, risk_score, timestamps
- [ ] T018 [P] [US1] Create `ErrorResponse` Pydantic model in `olorin-server/app/router/models/error_models.py` with error, message, details fields
- [ ] T019 [US1] Create POST `/api/v1/investigations/` endpoint in `olorin-server/app/router/controllers/investigation_controller.py` with `response_model=InvestigationResponse`, status_code=201
- [ ] T020 [US1] Create GET `/api/v1/investigations/{investigation_id}` endpoint in `olorin-server/app/router/controllers/investigation_controller.py` with 200/404 responses
- [ ] T021 [US1] Create health check endpoints in `olorin-server/app/router/controllers/health_controller.py` (/health/ready, /health/live, /health/startup)
- [ ] T022 [US1] Create type generation script in `olorin-front/scripts/generate-api-types.sh` that calls `openapi-typescript` and `openapi-typescript-codegen`
- [ ] T023 [US1] Add `generate-api-types` and `prebuild` scripts to `olorin-front/package.json`
- [ ] T024 [US1] Create API config in `olorin-front/src/api/config.ts` with base URL and version from environment
- [ ] T025 [US1] Create sample React component in `olorin-front/src/components/InvestigationForm.tsx` using generated types to demonstrate type-safe API calls

**Checkpoint**: At this point, User Story 1 should be fully functional - frontend has type-safe API access to backend endpoints

---

## Phase 4: User Story 2 - Contract Testing for API Compatibility (Priority: P1)

**Goal**: Enable backend developers to run contract tests that validate API against published schema to detect breaking changes

**Independent Test**: Define contract tests for single endpoint, make breaking change, run tests, verify they fail

### Tests for User Story 2 ⚠️

- [ ] T026 [P] [US2] Backend contract test for POST `/api/v1/investigations/` in `olorin-server/test/contract/test_investigations_contract.py` using schemathesis
- [ ] T027 [P] [US2] Backend contract test for GET `/api/v1/investigations/{id}` in `olorin-server/test/contract/test_investigations_contract.py` using schemathesis
- [ ] T028 [P] [US2] Frontend contract test for investigations API in `olorin-front/test/contract/investigation-api.contract.test.ts` using dredd or jest-openapi
- [ ] T029 [P] [US2] Contract test coverage validation in `olorin-server/test/contract/test_coverage.py` - verify 95%+ endpoint coverage

### Implementation for User Story 2

- [ ] T030 [US2] Setup schemathesis in `olorin-server/test/contract/conftest.py` with FastAPI app schema loading
- [ ] T031 [US2] Create parametrized contract test runner in `olorin-server/test/contract/test_api_contract.py` using `@schema.parametrize()` for all endpoints
- [ ] T032 [US2] Add validation tests for error responses (400, 401, 404, 422) in `olorin-server/test/contract/test_error_responses.py`
- [ ] T033 [US2] Add authentication contract tests in `olorin-server/test/contract/test_auth_contract.py` - verify JWT requirements
- [ ] T034 [US2] Create request body validation tests in `olorin-server/test/contract/test_request_validation.py` - test required fields, constraints, enums
- [ ] T035 [US2] Setup dredd configuration in `olorin-front/dredd.yml` with backend URL, authentication hooks, endpoint filters
- [ ] T036 [US2] Create dredd hooks in `olorin-front/test/contract/hooks.ts` for adding JWT tokens to requests
- [ ] T037 [US2] Create frontend contract test runner in `olorin-front/test/contract/run-contract-tests.ts` that validates requests against schema
- [ ] T038 [US2] Add response validation in `olorin-front/src/api/validators.ts` using Ajv for runtime schema validation
- [ ] T039 [US2] Create mock server setup in `olorin-front/src/mocks/server.ts` using MSW with responses matching OpenAPI examples

**Checkpoint**: Contract tests protect all endpoints from breaking changes - both backend implementation and frontend usage validated

---

## Phase 5: User Story 7 - Continuous Integration Contract Validation (Priority: P2)

**Goal**: Automatically validate contracts in CI pipeline for every pull request to catch breaking changes in code review

**Independent Test**: Create PR with breaking change, run CI pipeline, verify contract tests fail, see PR blocked from merge

### Tests for User Story 7 ⚠️

- [ ] T040 [P] [US7] CI workflow test in `.github/workflows/test-ci-contract-validation.yml` - verify workflow fails on breaking changes

### Implementation for User Story 7

- [ ] T041 [P] [US7] Create backend contract test CI workflow in `.github/workflows/backend-contract-tests.yml` with pytest contract tests
- [ ] T042 [P] [US7] Create frontend contract test CI workflow in `.github/workflows/frontend-contract-tests.yml` with dredd tests
- [ ] T043 [P] [US7] Create breaking change detection workflow in `.github/workflows/breaking-change-detection.yml` using oasdiff
- [ ] T044 [US7] Install and configure oasdiff in `.github/workflows/breaking-change-detection.yml` to compare schemas between branches
- [ ] T045 [US7] Add PR status check requirements in `.github/workflows/` - block merge if contract tests fail
- [ ] T046 [US7] Create contract test report generation in `.github/workflows/contract-test-report.yml` - publish results as PR comment
- [ ] T047 [US7] Add contract test coverage report in `.github/workflows/contract-test-report.yml` - show endpoint coverage percentage

**Checkpoint**: CI pipeline protects main branch - breaking changes caught in PR before merge

---

## Phase 6: User Story 3 - Automated Rollback for Breaking Changes (Priority: P2)

**Goal**: Automatically detect and rollback deployments that break API contracts without manual intervention

**Independent Test**: Deploy backend with breaking change, run post-deployment validation, detect failure, trigger automatic rollback, verify frontend continues working

### Tests for User Story 3 ⚠️

- [ ] T048 [P] [US3] Post-deployment validation test in `olorin-server/test/deployment/test_post_deploy_validation.py` - verify contract tests run after deployment
- [ ] T049 [P] [US3] Rollback mechanism test in `deployment/test-rollback.sh` - verify rollback completes < 120 seconds

### Implementation for User Story 3

- [ ] T050 [US3] Create health check implementation in `olorin-server/app/router/controllers/health_controller.py` with database, external services, schema validation checks
- [ ] T051 [US3] Create Kubernetes readiness probe config in `deployment/backend-deployment.yml` with /health/ready endpoint, thresholds
- [ ] T052 [US3] Create Kubernetes liveness probe config in `deployment/backend-deployment.yml` with /health/live endpoint
- [ ] T053 [US3] Create Kubernetes startup probe config in `deployment/backend-deployment.yml` with /health/startup endpoint
- [ ] T054 [US3] Create Prometheus metrics in `olorin-server/app/metrics.py` for request count, latency, error rate, contract test failures
- [ ] T055 [US3] Create canary deployment config in `deployment/canary-config.yml` using Istio VirtualService with 10% traffic split
- [ ] T056 [US3] Create monitoring alert rules in `deployment/prometheus-rules.yml` for error rate > 2%, latency > 2x baseline
- [ ] T057 [US3] Create automated rollback script in `deployment/rollback-canary.sh` that routes 100% traffic to stable, scales down canary
- [ ] T058 [US3] Create rollback verification script in `deployment/verify-rollback.sh` that checks traffic routing, pod termination, health checks
- [ ] T059 [US3] Create post-deployment contract test runner in `deployment/post-deploy-contract-tests.sh` that runs full contract suite against deployed backend
- [ ] T060 [US3] Create canary deployment workflow in `.github/workflows/canary-deployment.yml` with progressive traffic shifting (10% → 25% → 50% → 100%)
- [ ] T061 [US3] Add rollback trigger in `.github/workflows/canary-deployment.yml` that monitors metrics and triggers rollback on threshold breach

**Checkpoint**: Production deployment protected by automated rollback - breaking changes auto-reverted < 120 seconds

---

## Phase 7: User Story 4 - Version Negotiation for Gradual Migration (Priority: P3)

**Goal**: Support multiple API versions simultaneously with version negotiation for independent deployment

**Independent Test**: Deploy backend with v1 and v2 endpoints, have old frontend call v1, have new frontend call v2, verify both work

### Tests for User Story 4 ⚠️

- [ ] T062 [P] [US4] Version negotiation test in `olorin-server/test/integration/test_version_negotiation.py` - verify correct version routing
- [ ] T063 [P] [US4] Multi-version compatibility test in `olorin-front/test/integration/version-compatibility.test.ts` - test frontend with both v1 and v2

### Implementation for User Story 4

- [ ] T064 [P] [US4] Create v2 models in `olorin-server/app/router/v2/models/investigation_models.py` with breaking changes example
- [ ] T065 [US4] Create v2 controller in `olorin-server/app/router/v2/controllers/investigation_controller.py` with new endpoint implementations
- [ ] T066 [US4] Add v1 router with prefix `/api/v1` in `olorin-server/app/main.py` including existing investigation controller
- [ ] T067 [US4] Add v2 router with prefix `/api/v2` in `olorin-server/app/main.py` including v2 investigation controller
- [ ] T068 [US4] Create version detection utility in `olorin-front/src/api/version-detector.ts` that checks available versions via health endpoints
- [ ] T069 [US4] Generate v2 types in `olorin-front/src/api/generated/v2/` using separate openapi-typescript command
- [ ] T070 [US4] Create versioned API client factory in `olorin-front/src/api/client.ts` that accepts version parameter ('v1' or 'v2')
- [ ] T071 [US4] Add feature flag support in `olorin-front/src/config/feature-flags.ts` for `ENABLE_V2_API`
- [ ] T072 [US4] Add deprecation header middleware in `olorin-server/app/middleware/deprecation.py` that adds `Sunset` header to v1 responses
- [ ] T073 [US4] Create version migration guide in `docs/api-version-migration.md` with v1 → v2 upgrade path

**Checkpoint**: Multiple API versions running simultaneously - frontend and backend deployable independently

---

## Phase 8: User Story 5 - Real-Time Contract Monitoring (Priority: P3)

**Goal**: Monitor API contract compliance in production to detect schema drift and compatibility issues

**Independent Test**: Setup monitoring for single endpoint, send valid/invalid requests, verify alerts fire for schema violations

### Tests for User Story 5 ⚠️

- [ ] T074 [P] [US5] Monitoring alert test in `deployment/test-monitoring-alerts.sh` - verify alerts fire on schema violations

### Implementation for User Story 5

- [ ] T075 [US5] Create schema validation middleware in `olorin-server/app/middleware/schema_validation.py` that validates all responses against schema
- [ ] T076 [US5] Add schema violation metrics to `olorin-server/app/metrics.py` - counter for violations by endpoint
- [ ] T077 [US5] Create monitoring dashboard config in `deployment/grafana-dashboard.json` with contract compliance metrics
- [ ] T078 [US5] Create alert rules in `deployment/prometheus-alerts.yml` for schema violations, unknown fields, unexpected types
- [ ] T079 [US5] Add request logging middleware in `olorin-server/app/middleware/request_logging.py` that logs schema violations with caller details
- [ ] T080 [US5] Create monitoring notification config in `deployment/alertmanager-config.yml` for Slack/PagerDuty integration
- [ ] T081 [US5] Add production contract test scheduler in `deployment/production-contract-tests-cron.yml` that runs contract tests against prod every hour

**Checkpoint**: Production monitoring active - schema violations detected and alerted in real-time

---

## Phase 9: User Story 6 - Interactive API Documentation with Live Testing (Priority: P3)

**Goal**: Provide interactive API documentation with live testing capability for developer self-service

**Independent Test**: Access Swagger UI, select endpoint, fill parameters, execute live request, verify response matches schema

### Tests for User Story 6 ⚠️

- [ ] T082 [P] [US6] Swagger UI availability test in `olorin-server/test/integration/test_swagger_ui.py` - verify /docs endpoint accessible

### Implementation for User Story 6

- [ ] T083 [US6] Enable Swagger UI in `olorin-server/app/main.py` with `docs_url="/docs"` configuration
- [ ] T084 [US6] Enable ReDoc in `olorin-server/app/main.py` with `redoc_url="/redoc"` configuration
- [ ] T085 [US6] Customize Swagger UI in `olorin-server/app/main.py` with branding, authentication, try-it-out enabled
- [ ] T086 [US6] Add example requests to Pydantic models in `olorin-server/app/router/models/` using `Config.json_schema_extra`
- [ ] T087 [US6] Add endpoint descriptions and tags in `olorin-server/app/router/controllers/` using FastAPI route decorators
- [ ] T088 [US6] Create API documentation landing page in `docs/api-documentation.md` with links to /docs, /redoc, /openapi.json
- [ ] T089 [US6] Add authentication instructions to Swagger UI in `olorin-server/app/main.py` custom OpenAPI config

**Checkpoint**: Interactive API documentation available - developers can explore and test APIs without backend setup

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T090 [P] Update quickstart.md in `specs/001-frontend-backend-interface/quickstart.md` with final implementation details
- [ ] T091 [P] Create API migration runbook in `docs/runbooks/api-migration.md` with step-by-step deployment procedures
- [ ] T092 [P] Create troubleshooting guide in `docs/troubleshooting/contract-testing.md` with common issues and solutions
- [ ] T093 [P] Add performance benchmarks in `olorin-server/test/performance/test_schema_generation.py` - verify < 5s generation time
- [ ] T094 [P] Add performance benchmarks in `olorin-front/test/performance/test_type_generation.ts` - verify < 10s generation time
- [ ] T095 [P] Add contract test performance benchmarks in `test/performance/test_contract_suite.py` - verify < 60s execution time
- [ ] T096 [P] Security audit of generated types in `olorin-front/src/api/generated/` - verify no sensitive data exposure
- [ ] T097 [P] Security audit of OpenAPI schema in `olorin-server/openapi.json` - verify no internal endpoints exposed
- [ ] T098 Code cleanup and refactoring - remove any temporary or debug code
- [ ] T099 Final integration testing - verify all user stories work together
- [ ] T100 Production readiness checklist validation per quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - US1 (P1) + US2 (P1) + US7 (P2) can proceed in parallel (MVP core)
  - US3 (P2) depends on US1 + US2 (needs working contract tests)
  - US4 (P3), US5 (P3), US6 (P3) can proceed after MVP core
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### Critical Path (MVP)

1. **Setup** (T001-T005) → **Foundational** (T006-T011) → **US1** (T012-T025) → **US2** (T026-T039) → **US7** (T040-T047)

This delivers: Auto-generated types + Contract testing + CI validation = Core compatibility guarantee

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - No dependencies on other stories (can run parallel with US1)
- **User Story 7 (P2)**: Can start after Foundational - May integrate with US1/US2 but independently testable
- **User Story 3 (P2)**: Depends on US1 + US2 (needs working endpoints and contract tests)
- **User Story 4 (P3)**: Depends on US1 (needs schema generation working)
- **User Story 5 (P3)**: Depends on US1 + US2 (needs endpoints and contract tests for monitoring)
- **User Story 6 (P3)**: Depends on US1 (needs OpenAPI schema)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services before endpoints
- Backend implementation before frontend type generation
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Setup Phase (All Parallel)**:
```bash
Task(subagent_type="backend-architect", description="Install backend dependencies",
     prompt="Install schemathesis, pytest-cov, openapi-spec-validator in olorin-server using poetry")
Task(subagent_type="frontend-developer", description="Install frontend dependencies",
     prompt="Install openapi-typescript, openapi-typescript-codegen, dredd, ajv in olorin-front using npm")
Task(subagent_type="backend-architect", description="Create backend .env.example",
     prompt="Create .env.example in olorin-server with BACKEND_URL, REQUEST_TIMEOUT_MS placeholders")
```

**Foundational Phase (Parallel Configuration)**:
```bash
Task(subagent_type="backend-architect", description="Create backend config schema",
     prompt="Create app/config/api_config.py with Pydantic validation for all API configuration")
Task(subagent_type="frontend-developer", description="Create frontend config schema",
     prompt="Create src/config/environment.ts with runtime validation for frontend environment variables")
Task(subagent_type="backend-architect", description="Setup backend logging",
     prompt="Create app/logging_config.py with structured logging from environment variables")
Task(subagent_type="frontend-developer", description="Setup frontend logging",
     prompt="Create src/utils/logger.ts with structured logging from environment")
```

**User Story 1 - Models (All Parallel)**:
```bash
Task(subagent_type="backend-architect", description="Create TimeRange model",
     prompt="Create TimeRange Pydantic model in app/router/models/investigation_models.py per data-model.md")
Task(subagent_type="backend-architect", description="Create EntityType enum",
     prompt="Create EntityType enum in app/router/models/investigation_models.py with email, phone, device_id, ip_address, user_id")
Task(subagent_type="backend-architect", description="Create InvestigationRequest model",
     prompt="Create InvestigationRequest Pydantic model per data-model.md with validation and examples")
Task(subagent_type="backend-architect", description="Create InvestigationResponse model",
     prompt="Create InvestigationResponse Pydantic model per data-model.md with all response fields")
Task(subagent_type="backend-architect", description="Create ErrorResponse model",
     prompt="Create ErrorResponse Pydantic model in app/router/models/error_models.py per data-model.md")
```

**User Story 2 - Contract Tests (All Parallel)**:
```bash
Task(subagent_type="test-writer-fixer", description="Backend POST contract test",
     prompt="Create schemathesis contract test for POST /api/v1/investigations/ in test/contract/test_investigations_contract.py")
Task(subagent_type="test-writer-fixer", description="Backend GET contract test",
     prompt="Create schemathesis contract test for GET /api/v1/investigations/{id} in test/contract/test_investigations_contract.py")
Task(subagent_type="test-writer-fixer", description="Frontend contract test",
     prompt="Create dredd contract test in test/contract/investigation-api.contract.test.ts per contract-testing-contract.md")
Task(subagent_type="test-writer-fixer", description="Contract coverage validation",
     prompt="Create coverage validation test in test/contract/test_coverage.py verifying 95%+ endpoint coverage")
```

**User Story 7 - CI Workflows (All Parallel)**:
```bash
Task(subagent_type="devops-automator", description="Backend contract CI workflow",
     prompt="Create .github/workflows/backend-contract-tests.yml running pytest contract tests on every PR")
Task(subagent_type="devops-automator", description="Frontend contract CI workflow",
     prompt="Create .github/workflows/frontend-contract-tests.yml running dredd tests on every PR")
Task(subagent_type="devops-automator", description="Breaking change detection workflow",
     prompt="Create .github/workflows/breaking-change-detection.yml using oasdiff to compare schemas")
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 7)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T011) - **CRITICAL BLOCKER**
3. Complete Phase 3: User Story 1 (T012-T025) - Auto-generated types
4. Complete Phase 4: User Story 2 (T026-T039) - Contract testing
5. Complete Phase 5: User Story 7 (T040-T047) - CI validation
6. **STOP and VALIDATE**: Test core compatibility system end-to-end
7. Deploy/demo MVP

**MVP delivers**: Schema-first development + contract testing + CI validation = core compatibility guarantee

### Incremental Delivery

1. **MVP** (US1 + US2 + US7): Schema generation + Contract tests + CI → Deploy (Core compatibility)
2. **+ US3**: Automated rollback → Deploy (Production safety)
3. **+ US4**: API versioning → Deploy (Independent deployment)
4. **+ US5**: Real-time monitoring → Deploy (Observability)
5. **+ US6**: Interactive docs → Deploy (Developer experience)
6. Each addition adds value without breaking previous functionality

### Parallel Team Strategy

With 8 team members (3 backend, 3 frontend, 2 DevOps):

1. **Team completes Setup + Foundational together** (T001-T011)
2. **Once Foundational done, parallel execution**:
   - Backend Team A: US1 backend models and endpoints (T014-T021)
   - Backend Team B: US2 backend contract tests (T026-T034)
   - Frontend Team A: US1 type generation and components (T022-T025)
   - Frontend Team B: US2 frontend contract tests (T035-T039)
   - DevOps Team: US7 CI workflows (T041-T047)
3. **After MVP, parallel P2/P3 stories**:
   - Backend + DevOps: US3 rollback automation (T050-T061)
   - Backend Team: US4 API versioning (T064-T073)
   - Backend + DevOps: US5 monitoring (T075-T081)
   - Backend + Frontend: US6 interactive docs (T083-T089)

---

## Notes

- [P] tasks = different files or services, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability and independent testing
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD approach)
- Commit after each task or logical group for easy rollback
- Stop at any checkpoint to validate story independently
- Backend tasks use Python FastAPI + Pydantic + Poetry
- Frontend tasks use TypeScript + React + npm
- All configuration from environment variables (no hardcoded values)
- All contract tests achieve 95%+ endpoint coverage
- Performance targets: Schema generation < 5s, Type generation < 10s, Contract tests < 60s
- Automated rollback < 120 seconds from detection to stable state
