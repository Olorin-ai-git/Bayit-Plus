# Tasks: Manual Investigation UI Migration

**Input**: Design documents from `/specs/002-verify-and-plan/`
**Prerequisites**: plan.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✓ Tech stack: TypeScript 4.9+, React 18, Tailwind CSS, Module Federation
   ✓ Structure: Microservices at src/microservices/manual-investigation/
2. Load optional design documents:
   ✓ data-model.md: 10 entities identified
   ✓ contracts/: 2 files (investigation-api.yaml, websocket-events.ts)
   ✓ quickstart.md: 4 user flows, performance metrics
3. Generate tasks by category:
   ✓ Setup: Module Federation config, dependencies
   ✓ Tests: API contract tests, WebSocket tests, integration tests
   ✓ Core: TypeScript interfaces, React components, services
   ✓ Integration: Backend API, WebSocket, event bus
   ✓ Polish: Performance, accessibility, documentation
4. Apply task rules:
   ✓ Different files marked [P] for parallel
   ✓ Tests before implementation (TDD)
5. Number tasks: T001-T045
6. Return: SUCCESS (45 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Frontend**: `olorin-front/src/microservices/manual-investigation/`
- **Shared**: `olorin-front/src/microservices/shared/`
- **Tests**: `olorin-front/tests/`
- **Backend**: `olorin-server/app/`

## Phase 3.1: Setup & Configuration
- [ ] T001 Create microservice structure at olorin-front/src/microservices/manual-investigation/
- [ ] T002 Configure Module Federation in olorin-front/webpack.config.js for manual-investigation service
- [ ] T003 [P] Install Tailwind dependencies and configure in olorin-front/tailwind.config.js
- [ ] T004 [P] Setup TypeScript config in olorin-front/src/microservices/manual-investigation/tsconfig.json
- [ ] T005 [P] Configure Jest testing for microservice in olorin-front/jest.config.js

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### API Contract Tests
- [ ] T006 [P] Contract test POST /api/investigation in olorin-front/tests/contract/test_investigation_create.ts
- [ ] T007 [P] Contract test GET /api/investigation/{id} in olorin-front/tests/contract/test_investigation_get.ts
- [ ] T008 [P] Contract test PUT /api/investigation/{id} in olorin-front/tests/contract/test_investigation_update.ts
- [ ] T009 [P] Contract test GET /api/investigation/{id}/steps in olorin-front/tests/contract/test_investigation_steps.ts
- [ ] T010 [P] Contract test POST /api/network in olorin-front/tests/contract/test_network_analysis.ts
- [ ] T011 [P] Contract test POST /api/device in olorin-front/tests/contract/test_device_analysis.ts
- [ ] T012 [P] Contract test POST /api/location in olorin-front/tests/contract/test_location_analysis.ts
- [ ] T013 [P] Contract test POST /api/logs in olorin-front/tests/contract/test_logs_analysis.ts

### WebSocket Contract Tests
- [ ] T014 [P] WebSocket connection test in olorin-front/tests/contract/test_websocket_connection.ts
- [ ] T015 [P] WebSocket event tests in olorin-front/tests/contract/test_websocket_events.ts

### Integration Tests (User Flows)
- [ ] T016 [P] Integration test: Investigation dashboard flow in olorin-front/tests/integration/test_dashboard_flow.ts
- [ ] T017 [P] Integration test: Execute investigation step in olorin-front/tests/integration/test_step_execution.ts
- [ ] T018 [P] Integration test: Add collaboration comment in olorin-front/tests/integration/test_collaboration.ts
- [ ] T019 [P] Integration test: Generate report in olorin-front/tests/integration/test_report_generation.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### TypeScript Interfaces (Data Models)
- [ ] T020 [P] Investigation interface in olorin-front/src/microservices/manual-investigation/types/Investigation.ts
- [ ] T021 [P] InvestigationStep interface in olorin-front/src/microservices/manual-investigation/types/InvestigationStep.ts
- [ ] T022 [P] AgentResponse interface in olorin-front/src/microservices/manual-investigation/types/AgentResponse.ts
- [ ] T023 [P] RiskScore interface in olorin-front/src/microservices/manual-investigation/types/RiskScore.ts
- [ ] T024 [P] Evidence interface in olorin-front/src/microservices/manual-investigation/types/Evidence.ts
- [ ] T025 [P] Comment interface in olorin-front/src/microservices/manual-investigation/types/Comment.ts

### Service Layer
- [ ] T026 [P] InvestigationService in olorin-front/src/microservices/manual-investigation/services/InvestigationService.ts
- [ ] T027 [P] AgentAnalysisService in olorin-front/src/microservices/manual-investigation/services/AgentAnalysisService.ts
- [ ] T028 [P] WebSocketService in olorin-front/src/microservices/shared/services/WebSocketService.ts
- [ ] T029 [P] EventBusService in olorin-front/src/microservices/shared/services/EventBusService.ts

### React Components (Tailwind CSS)
- [ ] T030 InvestigationDashboard component in olorin-front/src/microservices/manual-investigation/components/InvestigationDashboard.tsx
- [ ] T031 InvestigationDetails component in olorin-front/src/microservices/manual-investigation/components/InvestigationDetails.tsx
- [ ] T032 StepTracker component in olorin-front/src/microservices/manual-investigation/components/StepTracker.tsx
- [ ] T033 RiskScoreDisplay component in olorin-front/src/microservices/manual-investigation/components/RiskScoreDisplay.tsx
- [ ] T034 AgentResultsViewer component in olorin-front/src/microservices/manual-investigation/components/AgentResultsViewer.tsx
- [ ] T035 CollaborationPanel component in olorin-front/src/microservices/manual-investigation/components/CollaborationPanel.tsx
- [ ] T036 EvidenceManager component in olorin-front/src/microservices/manual-investigation/components/EvidenceManager.tsx
- [ ] T037 ReportGenerator component in olorin-front/src/microservices/manual-investigation/components/ReportGenerator.tsx

## Phase 3.4: Integration & Real-time Features
- [ ] T038 Connect InvestigationService to backend API endpoints
- [ ] T039 Implement WebSocket event handlers for real-time updates
- [ ] T040 Integrate EventBus for cross-microservice communication
- [ ] T041 Implement authentication/authorization hooks
- [ ] T042 Add error boundaries and fallback UI

## Phase 3.5: Polish & Performance
- [ ] T043 [P] Performance optimization: Code splitting and lazy loading
- [ ] T044 [P] Accessibility audit and WCAG compliance
- [ ] T045 [P] Update documentation in olorin-front/docs/manual-investigation/

## Dependencies
- Setup (T001-T005) must complete first
- Tests (T006-T019) before implementation (T020-T037)
- TypeScript interfaces (T020-T025) before services (T026-T029)
- Services before components (T030-T037)
- Components before integration (T038-T042)
- Everything before polish (T043-T045)

## Parallel Execution Examples

### Parallel Group 1: Initial Setup (T003-T005)
```bash
# Run these 3 tasks simultaneously:
Task agent="setup-specialist" task="Install Tailwind dependencies and configure in olorin-front/tailwind.config.js"
Task agent="setup-specialist" task="Setup TypeScript config in olorin-front/src/microservices/manual-investigation/tsconfig.json"
Task agent="setup-specialist" task="Configure Jest testing for microservice in olorin-front/jest.config.js"
```

### Parallel Group 2: Contract Tests (T006-T013)
```bash
# Run these 8 API contract tests simultaneously:
Task agent="test-writer-fixer" task="Contract test POST /api/investigation in olorin-front/tests/contract/test_investigation_create.ts"
Task agent="test-writer-fixer" task="Contract test GET /api/investigation/{id} in olorin-front/tests/contract/test_investigation_get.ts"
Task agent="test-writer-fixer" task="Contract test PUT /api/investigation/{id} in olorin-front/tests/contract/test_investigation_update.ts"
Task agent="test-writer-fixer" task="Contract test GET /api/investigation/{id}/steps in olorin-front/tests/contract/test_investigation_steps.ts"
Task agent="test-writer-fixer" task="Contract test POST /api/network in olorin-front/tests/contract/test_network_analysis.ts"
Task agent="test-writer-fixer" task="Contract test POST /api/device in olorin-front/tests/contract/test_device_analysis.ts"
Task agent="test-writer-fixer" task="Contract test POST /api/location in olorin-front/tests/contract/test_location_analysis.ts"
Task agent="test-writer-fixer" task="Contract test POST /api/logs in olorin-front/tests/contract/test_logs_analysis.ts"
```

### Parallel Group 3: TypeScript Interfaces (T020-T025)
```bash
# Run these 6 interface creations simultaneously:
Task agent="typescript-pro" task="Investigation interface in olorin-front/src/microservices/manual-investigation/types/Investigation.ts"
Task agent="typescript-pro" task="InvestigationStep interface in olorin-front/src/microservices/manual-investigation/types/InvestigationStep.ts"
Task agent="typescript-pro" task="AgentResponse interface in olorin-front/src/microservices/manual-investigation/types/AgentResponse.ts"
Task agent="typescript-pro" task="RiskScore interface in olorin-front/src/microservices/manual-investigation/types/RiskScore.ts"
Task agent="typescript-pro" task="Evidence interface in olorin-front/src/microservices/manual-investigation/types/Evidence.ts"
Task agent="typescript-pro" task="Comment interface in olorin-front/src/microservices/manual-investigation/types/Comment.ts"
```

### Parallel Group 4: Service Layer (T026-T029)
```bash
# Run these 4 service creations simultaneously:
Task agent="frontend-developer" task="InvestigationService in olorin-front/src/microservices/manual-investigation/services/InvestigationService.ts"
Task agent="frontend-developer" task="AgentAnalysisService in olorin-front/src/microservices/manual-investigation/services/AgentAnalysisService.ts"
Task agent="frontend-developer" task="WebSocketService in olorin-front/src/microservices/shared/services/WebSocketService.ts"
Task agent="frontend-developer" task="EventBusService in olorin-front/src/microservices/shared/services/EventBusService.ts"
```

## Notes
- [P] tasks work on different files with no dependencies
- All tests must be written and fail before implementation
- Each component must use Tailwind CSS exclusively (no Material-UI)
- All files must be < 200 lines (split if needed)
- Commit after each task completion
- WebSocket integration is critical for real-time features

## Validation Checklist
*GATE: Verified during task generation*

- [x] All API endpoints have contract tests (8 endpoints → 8 tests)
- [x] All entities have TypeScript interfaces (6 core entities)
- [x] All user flows have integration tests (4 flows)
- [x] All tests come before implementation
- [x] Parallel tasks are truly independent
- [x] Each task specifies exact file path
- [x] No parallel tasks modify the same file

## Success Metrics
- All 45 tasks completed
- All tests passing
- <200 lines per file
- 100% Tailwind CSS
- WebSocket real-time updates functional
- Performance goals met (<2s load, <500ms transitions)