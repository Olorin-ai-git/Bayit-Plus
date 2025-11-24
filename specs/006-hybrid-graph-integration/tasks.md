# Tasks: Hybrid Graph Integration

**Input**: Design documents from `/specs/006-hybrid-graph-integration/`
**Prerequisites**: plan.md (✅), spec.md (✅)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Backend**: `olorin-server/app/`
- **Frontend**: `olorin-front/src/microservices/investigation/`
- **Shared**: `olorin-front/src/shared/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create environment configuration schema in `olorin-front/src/shared/config/hybridGraphConfig.ts` with Zod validation for all hybrid graph settings (polling interval, max retries, backoff multiplier, API endpoints)
- [x] T002 Create environment configuration schema in `olorin-server/config/hybrid_graph_config.py` with Pydantic validation for investigation settings (max duration, status cache TTL, concurrent limits)
- [x] T003 [P] Add feature flag `REACT_APP_FEATURE_ENABLE_HYBRID_GRAPH` to frontend environment configuration with documentation in `.env.example`
- [x] T004 [P] Add feature flag `FEATURE_ENABLE_HYBRID_GRAPH_POLLING` to backend environment configuration with documentation in `.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Foundation

- [x] T005 Create Pydantic schema `InvestigationConfigSchema` in `olorin-server/app/schemas/investigation_config.py` with validation for entity_type, entity_id, time_range, tools, correlation_mode, execution_mode, risk_threshold (max 200 lines)
- [x] T006 Create Pydantic schema `InvestigationStatusSchema` in `olorin-server/app/schemas/investigation_status.py` for polling responses with investigation_id, status, current_phase, progress_percentage, agent_status, tool_executions, logs (max 200 lines)
- [x] T007 Create Pydantic schema `InvestigationResultsSchema` in `olorin-server/app/schemas/investigation_results.py` for results with overall_risk_score, findings, evidence, agent_decisions, summary, metadata (max 200 lines)
- [x] T008 Create database model `InvestigationState` enhancement in `olorin-server/app/models/investigation_state.py` to track polling state (status, current_phase, progress_percentage) - NO DDL, only model updates
- [x] T009 Create polling adapter `InvestigationPollingAdapter` in `olorin-server/app/service/investigation_polling_adapter.py` to transform hybrid graph internal state to polling API responses (max 200 lines)

### Frontend Foundation

- [x] T010 [P] Create TypeScript interface `InvestigationConfig` in `olorin-front/src/microservices/investigation/types/hybridGraphTypes.ts` matching backend schema with entity_type, entity_id, time_range, tools (max 200 lines)
- [x] T011 [P] Create TypeScript interface `InvestigationStatus` in `olorin-front/src/microservices/investigation/types/hybridGraphTypes.ts` with polling response structure (max 200 lines)
- [x] T012 [P] Create TypeScript interface `InvestigationResults` in `olorin-front/src/microservices/investigation/types/hybridGraphTypes.ts` with results structure (max 200 lines)
- [x] T013 Create generic polling service `HybridGraphPollingService` in `olorin-front/src/microservices/investigation/services/hybridGraphPollingService.ts` with exponential backoff, retry logic, AbortController cancellation (max 200 lines)
- [x] T014 Create React hook `useHybridGraphPolling` in `olorin-front/src/microservices/investigation/hooks/useHybridGraphPolling.ts` wrapping polling service with state management (max 200 lines)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Configure and Launch Hybrid Graph Investigation (Priority: P1) 🎯 MVP

**Goal**: Enable investigators to configure and launch hybrid graph investigations from Settings Page

**Independent Test**: Configure settings (entity type, ID, time range, tools) and successfully launch investigation that creates database record and returns investigation ID

### Backend Implementation for User Story 1

- [x] T015 [US1] Create POST `/api/investigations` endpoint in `olorin-server/app/router/hybrid_graph_investigations_router.py` that accepts `InvestigationConfigSchema` and returns investigation_id (max 200 lines)
- [x] T016 [US1] Implement `InvestigationController.create_investigation()` in `olorin-server/app/router/controllers/hybrid_graph_investigation_controller.py` to validate config, create database record, and trigger hybrid graph execution (max 200 lines)
- [x] T017 [US1] Add entity ID validation logic in `olorin-server/app/validation/entity_validator.py` for user (email), device (UUID), IP (IP format), transaction (alphanumeric) (max 200 lines)
- [x] T018 [US1] Add time range validation in `olorin-server/app/validation/time_range_validator.py` ensuring start < end, not in future, max 90 days duration (max 200 lines)
- [x] T019 [US1] Add tool configuration validation in `olorin-server/app/validation/tool_config_validator.py` to verify tool IDs exist and parameters match schemas (max 200 lines)

### Frontend Implementation for User Story 1

- [x] T020 [US1] Update Settings Page in `olorin-front/src/microservices/investigation/pages/SettingsPage.tsx` to add "Use Hybrid Graph" toggle with feature flag check (max 200 lines)
- [x] T021 [US1] Create hybrid graph settings form component `HybridGraphSettings.tsx` in `olorin-front/src/microservices/investigation/components/settings/` with entity type selector, entity ID input, time range picker (max 200 lines)
- [x] T022 [US1] Create tool matrix component `ToolMatrixSelector.tsx` in `olorin-front/src/microservices/investigation/components/settings/` displaying 6 tool categories (Device, Location, Network, Logs, Behavior, Risk) with checkboxes (max 200 lines)
- [x] T023 [US1] Add client-side validation logic in `olorin-front/src/microservices/investigation/validation/configValidator.ts` using Zod schema for investigation config (max 200 lines)
- [x] T024 [US1] Update `investigationService.ts` in `olorin-front/src/microservices/investigation/services/` to add `createHybridInvestigation()` method calling POST `/api/investigations` (max 200 lines)
- [x] T025 [US1] Add navigation logic in Settings Page to redirect to Progress Page with investigation ID on successful launch

### Integration Tests for User Story 1

- [ ] T026 [P] [US1] Create backend integration test `test_create_investigation_api.py` in `olorin-server/test/integration/` testing POST endpoint with valid config returns 200 and investigation_id
- [ ] T027 [P] [US1] Create backend validation test `test_investigation_validation.py` in `olorin-server/test/integration/` testing invalid entity ID, time range, and tool config return 400 with error messages
- [ ] T028 [P] [US1] Create frontend integration test `SettingsPage.integration.test.tsx` in `olorin-front/src/microservices/investigation/__tests__/integration/` testing form submission and navigation
- [ ] T029 [P] [US1] Create E2E test `hybrid-graph-launch.cy.ts` in `olorin-front/cypress/e2e/` testing complete Settings Page → investigation creation → Progress Page navigation flow

**Checkpoint**: At this point, User Story 1 should be fully functional - investigators can configure and launch hybrid graph investigations

---

## Phase 4: User Story 2 - Monitor Real-Time Investigation Progress (Priority: P1)

**Goal**: Enable real-time progress monitoring with polling mechanism, displaying phases, tool executions, and risk scores

**Independent Test**: Start investigation and verify Progress Page polls every 2 seconds, updates UI with phase information, displays tool logs, and shows risk score progression

### Backend Implementation for User Story 2

- [ ] T030 [US2] Create GET `/api/investigations/{id}/status` endpoint in `olorin-server/app/router/investigations_router.py` returning `InvestigationStatusSchema` (max 200 lines)
- [ ] T031 [US2] Implement `InvestigationStatusController.get_status()` in `olorin-server/app/router/controllers/investigation_status_controller.py` fetching investigation state and calling polling adapter (max 200 lines)
- [ ] T032 [US2] Enhance `InvestigationPollingAdapter` in `olorin-server/app/service/investigation_polling_adapter.py` to extract current_phase, progress_percentage from hybrid graph state (max 200 lines)
- [ ] T033 [US2] Add agent status extraction in `InvestigationPollingAdapter` to map hybrid graph agent execution to `AgentStatus` dictionary (max 200 lines)
- [ ] T034 [US2] Add tool execution extraction in `InvestigationPollingAdapter` to transform hybrid graph tool calls to `ToolExecution` list (max 200 lines)
- [ ] T035 [US2] Add log entry extraction in `InvestigationPollingAdapter` to convert hybrid graph logs to `LogEntry` list with severity mapping (max 200 lines)
- [ ] T036 [US2] Implement response caching in `InvestigationStatusController` with 2-second TTL using Redis or in-memory cache (max 200 lines)

### Frontend Implementation for User Story 2

- [ ] T037 [US2] Update Progress Page in `olorin-front/src/microservices/investigation/pages/ProgressPage.tsx` to integrate `useHybridGraphPolling` hook when investigation is hybrid type (max 200 lines)
- [ ] T038 [US2] Create phase indicator component `HybridGraphPhaseIndicator.tsx` in `olorin-front/src/microservices/investigation/components/progress/` displaying 5 phases (Initialization, Domain Analysis, Risk Assessment, Evidence Gathering, Summary) with current phase highlighted (max 200 lines)
- [ ] T039 [US2] Create progress bar component `InvestigationProgressBar.tsx` in `olorin-front/src/microservices/investigation/components/progress/` showing 0-100% completion with estimated time (max 200 lines)
- [ ] T040 [US2] Create tool execution timeline component `ToolExecutionTimeline.tsx` in `olorin-front/src/microservices/investigation/components/progress/` listing tool calls with status badges (pending, running, completed, failed) (max 200 lines)
- [ ] T041 [US2] Update agent status gauges component `AgentStatusGauges.tsx` in `olorin-front/src/microservices/investigation/components/progress/` to display hybrid graph agent progress (Device, Location, Network, Logs, Risk) (max 200 lines)
- [ ] T042 [US2] Create risk score chart component `RiskScoreProgression.tsx` in `olorin-front/src/microservices/investigation/components/progress/` plotting risk score updates over time (max 200 lines)
- [ ] T043 [US2] Create log stream component `InvestigationLogStream.tsx` in `olorin-front/src/microservices/investigation/components/progress/` with color-coded severity and virtual scrolling (max 200 lines)
- [ ] T044 [US2] Add polling lifecycle management in Progress Page to start polling on mount, stop on unmount, handle status transitions (running → completed/failed/timeout)
- [ ] T045 [US2] Create React hook `useInvestigationStatus` in `olorin-front/src/microservices/investigation/hooks/useInvestigationStatus.ts` managing status updates and notification triggers (max 200 lines)

### Integration Tests for User Story 2

- [ ] T046 [P] [US2] Create backend integration test `test_investigation_status_api.py` in `olorin-server/test/integration/` testing GET /status endpoint returns correct phase, progress, agent status
- [ ] T047 [P] [US2] Create backend test `test_polling_adapter.py` in `olorin-server/test/unit/` testing state transformation from hybrid graph to polling response
- [ ] T048 [P] [US2] Create frontend integration test `ProgressPage.integration.test.tsx` in `olorin-front/src/microservices/investigation/__tests__/integration/` testing polling behavior, UI updates, status transitions
- [ ] T049 [P] [US2] Create polling resilience test `PollingResilience.test.tsx` in `olorin-front/src/microservices/investigation/__tests__/integration/` simulating network failures, retry logic, exponential backoff
- [ ] T050 [P] [US2] Create E2E test `hybrid-graph-progress-monitoring.cy.ts` in `olorin-front/cypress/e2e/` testing Progress Page displays real-time updates during investigation execution

**Checkpoint**: At this point, User Story 2 should be fully functional - investigators can monitor investigations in real-time with polling updates

---

## Phase 5: User Story 3 - View Comprehensive Investigation Results (Priority: P1)

**Goal**: Display comprehensive investigation results including risk score, findings, evidence, and agent decisions with export functionality

**Independent Test**: Complete investigation and verify Results Page displays final risk score, groups findings by domain, shows evidence details, and provides export (PDF, JSON)

### Backend Implementation for User Story 3

- [ ] T051 [US3] Create GET `/api/investigations/{id}/results` endpoint in `olorin-server/app/router/investigations_router.py` returning `InvestigationResultsSchema` (max 200 lines)
- [ ] T052 [US3] Implement `InvestigationResultsController.get_results()` in `olorin-server/app/router/controllers/investigation_results_controller.py` fetching completed investigation and aggregating results (max 200 lines)
- [ ] T053 [US3] Create results aggregation service `ResultsAggregator` in `olorin-server/app/service/results_aggregator.py` extracting findings, evidence, agent decisions from hybrid graph final state (max 200 lines)
- [ ] T054 [US3] Add finding grouping logic in `ResultsAggregator` to organize findings by severity (critical, high, medium, low) and domain (device, location, network, logs, risk) (max 200 lines)
- [ ] T055 [US3] Add evidence linking logic in `ResultsAggregator` to cross-reference evidence with findings and attach confidence scores (max 200 lines)
- [ ] T056 [US3] Create POST `/api/investigations/{id}/export` endpoint in `olorin-server/app/router/investigations_router.py` accepting format (pdf, json, csv) (max 200 lines)
- [ ] T057 [US3] Implement PDF export service `InvestigationPDFExporter` in `olorin-server/app/service/investigation_pdf_exporter.py` using reportlab to generate comprehensive report (max 200 lines)
- [ ] T058 [US3] Implement JSON export service `InvestigationJSONExporter` in `olorin-server/app/service/investigation_json_exporter.py` serializing complete investigation results (max 200 lines)

### Frontend Implementation for User Story 3

- [ ] T059 [US3] Update Results Page in `olorin-front/src/microservices/investigation/pages/ResultsPage.tsx` to fetch and display hybrid graph results when investigation type is hybrid (max 200 lines)
- [ ] T060 [US3] Create risk score gauge component `OverallRiskScoreGauge.tsx` in `olorin-front/src/microservices/investigation/components/results/` displaying 0-100 score with color coding (critical: red, high: amber, medium: cyan, low: gray) (max 200 lines)
- [ ] T061 [US3] Create findings list component `FindingsList.tsx` in `olorin-front/src/microservices/investigation/components/results/` grouping findings by domain with severity badges (max 200 lines)
- [ ] T062 [US3] Create finding card component `FindingCard.tsx` in `olorin-front/src/microservices/investigation/components/results/` with expandable evidence details, affected entities, timestamp (max 200 lines)
- [ ] T063 [US3] Create evidence viewer component `EvidenceViewer.tsx` in `olorin-front/src/microservices/investigation/components/results/` displaying evidence sources, confidence scores, cross-references (max 200 lines)
- [ ] T064 [US3] Create agent decisions component `AgentDecisionsSummary.tsx` in `olorin-front/src/microservices/investigation/components/results/` showing rationale, confidence, supporting evidence (max 200 lines)
- [ ] T065 [US3] Create investigation timeline component `InvestigationTimeline.tsx` in `olorin-front/src/microservices/investigation/components/results/` with chronological events, tool executions, decisions (max 200 lines)
- [ ] T066 [US3] Create export dialog component `ExportDialog.tsx` in `olorin-front/src/microservices/investigation/components/results/` with format selection (PDF, JSON, CSV) and download button (max 200 lines)
- [ ] T067 [US3] Add export functionality in `investigationService.ts` calling POST `/api/investigations/{id}/export` and triggering download
- [ ] T068 [US3] Create React hook `useInvestigationResults` in `olorin-front/src/microservices/investigation/hooks/useInvestigationResults.ts` managing results fetching and caching (max 200 lines)

### Integration Tests for User Story 3

- [ ] T069 [P] [US3] Create backend integration test `test_investigation_results_api.py` in `olorin-server/test/integration/` testing GET /results endpoint returns complete results structure
- [ ] T070 [P] [US3] Create backend test `test_results_aggregation.py` in `olorin-server/test/unit/` testing findings grouping, evidence linking, confidence scoring
- [ ] T071 [P] [US3] Create backend test `test_investigation_export.py` in `olorin-server/test/integration/` testing PDF, JSON exports contain all expected data
- [ ] T072 [P] [US3] Create frontend integration test `ResultsPage.integration.test.tsx` in `olorin-front/src/microservices/investigation/__tests__/integration/` testing results display, finding expansion, export
- [ ] T073 [P] [US3] Create E2E test `hybrid-graph-results-viewing.cy.ts` in `olorin-front/cypress/e2e/` testing complete workflow: launch → monitor → view results → export

**Checkpoint**: At this point, User Story 3 should be fully functional - investigators can view comprehensive results and export findings

---

## Phase 6: User Story 4 - Handle Investigation Failures Gracefully (Priority: P2)

**Goal**: Provide clear error messages and recovery options when investigations fail (backend errors, timeout, data unavailability)

**Independent Test**: Simulate investigation failures and verify UI displays specific error messages, provides retry options, maintains history

### Backend Implementation for User Story 4

- [ ] T074 [US4] Create error code mapping in `olorin-server/app/schemas/error_codes.py` defining ENTITY_NOT_FOUND, INVALID_TIME_RANGE, INVESTIGATION_TIMEOUT, AGENT_EXECUTION_FAILED, INSUFFICIENT_DATA, RATE_LIMIT_EXCEEDED (max 200 lines)
- [ ] T075 [US4] Add error handling in `InvestigationController` to catch hybrid graph exceptions and map to user-friendly error responses with recommendations (max 200 lines)
- [ ] T076 [US4] Add timeout extension logic in `InvestigationService` to detect active execution and extend 15-minute timeout automatically (max 200 lines)
- [ ] T077 [US4] Create PATCH `/api/investigations/{id}/control` endpoint in `olorin-server/app/router/investigations_router.py` accepting action (pause, stop, resume) (max 200 lines)

### Frontend Implementation for User Story 4

- [ ] T078 [US4] Create error notification component `InvestigationErrorNotification.tsx` in `olorin-front/src/microservices/investigation/components/progress/` displaying error message and retry button (max 200 lines)
- [ ] T079 [US4] Add error state handling in Progress Page to detect failed/timeout status and display error notification with recommended actions (max 200 lines)
- [ ] T080 [US4] Implement retry logic in Progress Page to call investigation creation endpoint with same configuration when retry button clicked
- [ ] T081 [US4] Add investigation history persistence in `olorin-front/src/microservices/investigation/services/investigationHistoryService.ts` using localStorage with max 50 items (max 200 lines)
- [ ] T082 [US4] Create connection status alert component `ConnectionStatusAlert.tsx` (already exists - update) to show "Connection lost - retrying..." during polling failures

### Integration Tests for User Story 4

- [ ] T083 [P] [US4] Create backend test `test_error_handling.py` in `olorin-server/test/integration/` testing various error scenarios return appropriate error codes and messages
- [ ] T084 [P] [US4] Create frontend test `ErrorHandling.test.tsx` in `olorin-front/src/microservices/investigation/__tests__/integration/` testing error notification display, retry functionality
- [ ] T085 [P] [US4] Create E2E test `hybrid-graph-error-scenarios.cy.ts` in `olorin-front/cypress/e2e/` testing timeout, entity not found, backend failure scenarios

**Checkpoint**: At this point, User Story 4 should be fully functional - investigators experience graceful error handling with recovery options

---

## Phase 7: User Story 5 - Multi-Entity Investigation Support (Priority: P3)

**Goal**: Enable investigations for multiple related entities simultaneously with correlation analysis

**Independent Test**: Add 3 entities (user, device, IP) in Settings Page, launch investigation, verify backend executes hybrid graph for each entity with correlation

### Backend Implementation for User Story 5

- [ ] T086 [US5] Extend `InvestigationConfigSchema` to support entity_list field accepting multiple entities with types (max 200 lines)
- [ ] T087 [US5] Add multi-entity orchestration in `InvestigationController` to create investigation group with shared group ID (max 200 lines)
- [ ] T088 [US5] Implement correlation analysis service `EntityCorrelationAnalyzer` in `olorin-server/app/service/entity_correlation_analyzer.py` detecting linkages between entities (max 200 lines)
- [ ] T089 [US5] Update `InvestigationStatusSchema` to include per-entity progress and overall correlation progress for multi-entity investigations

### Frontend Implementation for User Story 5

- [ ] T090 [US5] Update hybrid graph settings form to add entity list builder with "Add Entity" button supporting up to 5 entities
- [ ] T091 [US5] Create multi-entity progress component `MultiEntityProgressIndicator.tsx` in `olorin-front/src/microservices/investigation/components/progress/` showing separate progress for each entity plus correlation progress (max 200 lines)
- [ ] T092 [US5] Update Results Page to display correlation findings with entity relationship graph visualization using vis-network

### Integration Tests for User Story 5

- [ ] T093 [P] [US5] Create backend test `test_multi_entity_investigation.py` in `olorin-server/test/integration/` testing 3-entity investigation creates group, executes correlation analysis
- [ ] T094 [P] [US5] Create E2E test `multi-entity-investigation.cy.ts` in `olorin-front/cypress/e2e/` testing complete multi-entity workflow

**Checkpoint**: All user stories should now be independently functional - multi-entity investigations with correlation are operational

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T095 [P] Add comprehensive JSDoc comments to all TypeScript interfaces in `hybridGraphTypes.ts`
- [ ] T096 [P] Add Python docstrings to all Pydantic schemas in `investigation_config.py`, `investigation_status.py`, `investigation_results.py`
- [ ] T097 Create quickstart guide `hybrid-graph-integration-quickstart.md` in `olorin-front/docs/` with 5-minute setup instructions
- [ ] T098 Add performance monitoring instrumentation in polling service to track latency, failure rate, retry count
- [ ] T099 Add frontend error logging to browser console with investigation ID context using structured logging
- [ ] T100 [P] Add security headers to all investigation API endpoints (rate limiting, CORS validation)
- [ ] T101 Run manual accessibility testing on all new UI components ensuring WCAG 2.1 AA compliance
- [ ] T102 Create load testing script `load_test_polling.py` in `olorin-server/test/performance/` simulating 50 concurrent investigators
- [ ] T103 [P] Update main project README with hybrid graph integration section linking to quickstart guide
- [ ] T104 Create troubleshooting guide `hybrid-graph-troubleshooting.md` in `olorin-front/docs/` covering common issues

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 3 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 4 (P2): Depends on User Story 1 and 2 (needs investigation creation and progress monitoring)
  - User Story 5 (P3): Depends on User Story 1, 2, 3 (extends all functionality)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - MVP)**: Can start after Foundational (Phase 2) - Independently testable
- **User Story 2 (P1 - MVP)**: Can start after Foundational (Phase 2) - Independently testable
- **User Story 3 (P1 - MVP)**: Can start after Foundational (Phase 2) - Independently testable
- **User Story 4 (P2)**: Requires US1 (investigation creation) and US2 (progress monitoring) - Independently testable for error scenarios
- **User Story 5 (P3)**: Requires US1, US2, US3 (extends configuration, monitoring, results) - Independently testable for multi-entity

### Within Each User Story

- Backend schemas before backend endpoints
- Backend endpoints before frontend services
- Frontend services before frontend components
- Frontend components before frontend pages
- All implementation before integration tests
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 1: All Setup tasks (T001-T004) can run in parallel [P]
- Phase 2: Backend foundation tasks (T005-T009) can run parallel to frontend foundation tasks (T010-T014)
- User Story 1: Backend tasks (T015-T019) parallel to frontend tasks (T020-T025), tests (T026-T029) parallel after implementation
- User Story 2: Backend tasks (T030-T036) parallel to frontend tasks (T037-T045), tests (T046-T050) parallel after implementation
- User Story 3: Backend tasks (T051-T058) parallel to frontend tasks (T059-T068), tests (T069-T073) parallel after implementation
- User Story 4: Backend tasks (T074-T077) parallel to frontend tasks (T078-T082), tests (T083-T085) parallel after implementation
- User Story 5: Backend tasks (T086-T089) parallel to frontend tasks (T090-T092), tests (T093-T094) parallel after implementation
- Phase 8: Most polish tasks (T095-T104) can run in parallel except T103 depends on T097

---

## Parallel Example: User Story 1 - MVP

```bash
# Launch all backend tasks for User Story 1 together:
Task(subagent_type="backend-architect", description="Create POST /api/investigations endpoint", prompt="Implement POST /api/investigations endpoint in olorin-server/app/router/investigations_router.py accepting InvestigationConfigSchema")
Task(subagent_type="backend-architect", description="Create investigation controller", prompt="Implement InvestigationController.create_investigation() in olorin-server/app/router/controllers/investigation_controller.py")
Task(subagent_type="backend-architect", description="Add entity validation", prompt="Create entity_validator.py in olorin-server/app/validation/ with format validation")
Task(subagent_type="backend-architect", description="Add time range validation", prompt="Create time_range_validator.py in olorin-server/app/validation/")
Task(subagent_type="backend-architect", description="Add tool config validation", prompt="Create tool_config_validator.py in olorin-server/app/validation/")

# Launch all frontend tasks for User Story 1 together:
Task(subagent_type="react-expert", description="Update Settings Page", prompt="Update SettingsPage.tsx to add hybrid graph toggle and form")
Task(subagent_type="react-expert", description="Create hybrid graph settings form", prompt="Create HybridGraphSettings.tsx component with entity selector, ID input, time picker")
Task(subagent_type="react-expert", description="Create tool matrix selector", prompt="Create ToolMatrixSelector.tsx with 6 tool categories")
Task(subagent_type="react-expert", description="Add config validation", prompt="Create configValidator.ts with Zod schema validation")
Task(subagent_type="react-expert", description="Update investigation service", prompt="Add createHybridInvestigation() to investigationService.ts")

# Launch all integration tests for User Story 1 together:
Task(subagent_type="test-writer-fixer", description="Backend API test", prompt="Create test_create_investigation_api.py testing POST endpoint")
Task(subagent_type="test-writer-fixer", description="Backend validation test", prompt="Create test_investigation_validation.py testing error scenarios")
Task(subagent_type="test-writer-fixer", description="Frontend integration test", prompt="Create SettingsPage.integration.test.tsx testing form submission")
Task(subagent_type="test-writer-fixer", description="E2E test", prompt="Create hybrid-graph-launch.cy.ts testing complete launch flow")
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3 Only - Core Investigation Workflow)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T014) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T015-T029) - Configure & Launch
4. **STOP and VALIDATE**: Test US1 independently - can investigators launch investigations?
5. Complete Phase 4: User Story 2 (T030-T050) - Monitor Progress
6. **STOP and VALIDATE**: Test US2 independently - does polling show real-time updates?
7. Complete Phase 5: User Story 3 (T051-T073) - View Results
8. **STOP and VALIDATE**: Test US3 independently - are results comprehensive and exportable?
9. **MVP COMPLETE**: End-to-end wizard flow (Settings → Progress → Results) is operational
10. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP: Launch investigations)
3. Add User Story 2 → Test independently → Deploy/Demo (MVP: Monitor progress)
4. Add User Story 3 → Test independently → Deploy/Demo (MVP: View results)
5. Add User Story 4 → Test independently → Deploy/Demo (Error handling)
6. Add User Story 5 → Test independently → Deploy/Demo (Multi-entity support)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With 3 developers:

1. **Team completes Setup + Foundational together** (1 day)
2. **Once Foundational is done:**
   - Developer A: User Story 1 (Backend + Frontend + Tests) - 3 days
   - Developer B: User Story 2 (Backend + Frontend + Tests) - 4 days
   - Developer C: User Story 3 (Backend + Frontend + Tests) - 3 days
3. **MVP Review**: Test complete workflow (Settings → Progress → Results) - 1 day
4. **Then parallel:**
   - Developer A: User Story 4 (Error handling) - 2 days
   - Developer B: User Story 5 (Multi-entity) - 3 days
   - Developer C: Polish & Documentation (Phase 8) - 2 days
5. Stories complete and integrate independently

**Estimated Timeline**:
- Sequential (1 developer): ~12 weeks
- Parallel (3 developers): ~3-4 weeks

---

## Notes

- [P] tasks = different files, no dependencies - can run truly parallel with Task tool
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- All tasks have explicit file paths for unambiguous implementation
- 200-line file size limit enforced - tasks designed to stay under limit
- No hardcoded values - all configuration from environment with Zod/Pydantic validation
- Stop at any checkpoint to validate story independently
- Commit after each task completion using git-expert subagent
- Use code-reviewer subagent as final step after each user story phase
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
