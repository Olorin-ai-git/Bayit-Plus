# Tasks: Real-Time Flow Dashboard

**Input**: Design documents from `specs/026-realtime-flow-dashboard/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), plus `research.md`, `data-model.md`, `contracts/`, `quickstart.md`  
**Tests**: Not explicitly requested in the spec; tasks below focus on implementation + verification steps.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure configuration is present and fail-fast behavior is enforced consistently.

- [x] T001 Add monitoring env vars for local development in `olorin-front/.envrc`
- [x] T002 Add fail-fast bundling checks for monitoring env vars in `olorin-front/webpack.config.js`
- [x] T003 Add monitoring env var injection via DefinePlugin in `olorin-front/webpack.config.js`
- [x] T004 Add fail-fast bundling checks for monitoring env vars in `olorin-front/webpack.prod.config.js`
- [x] T005 Add monitoring env var injection via DefinePlugin in `olorin-front/webpack.prod.config.js`
- [x] T006 Update TypeScript env var typings in `olorin-front/src/types/declarations/environment.d.ts`
- [x] T007 Document required env keys in `olorin-front/src/api/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the shared backend API contract and frontend service wiring required by all user stories.

### Backend: Flow progression API (read-only)

- [x] T008 [P] Add response schemas in `olorin-server/app/schemas/flow_progression.py`
- [x] T009 [P] Implement aggregation service over persisted investigation state in `olorin-server/app/service/flow_progression_service.py`
- [x] T010 [P] Implement read-only endpoint router in `olorin-server/app/router/flow_progression_router.py`
- [x] T011 Add router include in `olorin-server/app/service/router/router_config.py`

### Frontend: API typing + UI component primitives

- [x] T012 [P] Add flow progression types and API method in `olorin-front/src/microservices/investigation/services/investigationService.ts`
- [x] T013 [P] Create flow progression UI component in `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/FlowProgressionPanels.tsx`
- [x] T014 Ensure investigation polling retry/backoff reads config (no hardcoded constants) in `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/useInvestigationPolling.ts`
- [x] T015 Ensure required monitoring config keys are validated (fail-fast) in `olorin-front/src/microservices/investigation/config/investigationConfig.ts`

**Checkpoint**: Backend provides `/api/v1/investigation-state/flow-progression` and frontend can call it via `investigationService`.

---

## Phase 3: User Story 1 - Monitor running investigations with live flow progress (Priority: P1) 🎯 MVP

**Goal**: The Running Investigations page shows a real-time list of running investigations with status/progress updates.

**Independent Test**: Start at least one real investigation; verify the table updates status/progress without manual refresh.

- [x] T016 [US1] Verify investigation list uses existing polling/event-bus updates and remains stable in `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/ParallelInvestigationsPage.tsx`
- [x] T017 [US1] Confirm investigation list pagination size is config-driven (no literals) in `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/useInvestigationPolling.ts`
- [x] T018 [US1] Ensure row click navigation remains correct in `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/ParallelInvestigationsPage.tsx`

---

## Phase 4: User Story 2 - See today’s (daily) flow progression live (Priority: P2)

**Goal**: Daily Flow Progression panel shows the current UTC day’s counts by status, updating automatically.

**Independent Test**: While investigations start/complete/fail, verify the daily panel updates without refresh; when no daily data exists, verify “no data available” is shown.

- [x] T019 [US2] Wire daily flow progression fetch and state into page lifecycle in `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/ParallelInvestigationsPage.tsx`
- [x] T020 [US2] Render daily panel with explicit “no data available” state in `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/FlowProgressionPanels.tsx`
- [x] T021 [US2] Confirm daily flow aggregation uses persisted investigation state (created_at + status) in `olorin-server/app/service/flow_progression_service.py`

---

## Phase 5: User Story 3 - See month-to-date (monthly) flow progression live (Priority: P3)

**Goal**: Monthly Flow Progression panel shows UTC month-to-date totals and per-day breakdown, updating automatically as new data appears.

**Independent Test**: Verify monthly totals and by-day breakdown are shown when month data exists; verify explicit “no data available” when it does not.

- [x] T022 [US3] Wire monthly flow progression fetch and state into page lifecycle in `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/ParallelInvestigationsPage.tsx`
- [x] T023 [US3] Render monthly totals + by-day breakdown in `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/FlowProgressionPanels.tsx`
- [x] T024 [US3] Confirm monthly aggregation groups by UTC day and month using persisted state rows in `olorin-server/app/service/flow_progression_service.py`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation + contract alignment + compliance verification.

- [x] T025 [P] Ensure feature docs are consistent: `specs/026-realtime-flow-dashboard/spec.md`, `specs/026-realtime-flow-dashboard/plan.md`, `specs/026-realtime-flow-dashboard/quickstart.md`
- [x] T026 [P] Ensure contract matches implementation in `specs/026-realtime-flow-dashboard/contracts/flow-progression.openapi.yaml`
- [x] T027 [P] Verify no forbidden tokens exist in touched production files (scan changed paths)
- [x] T028 [P] Verify file size limits (<200 lines) for all touched `.ts/.tsx/.py` files (scan changed paths)
- [x] T029 Update checklist notes in `specs/026-realtime-flow-dashboard/checklists/requirements.md` if any scope changes were made during implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on Foundational
- **US3 (Phase 5)**: depends on Foundational
- **Polish (Phase 6)**: depends on completing the desired user stories

### Parallel Opportunities

- Phase 2 backend tasks (T008–T011) can be parallelized across files.
- Phase 2 frontend tasks (T012–T015) can be parallelized across files.
- Phase 6 tasks are mostly parallelizable.

---

## Parallel Example: US2 (Daily Panel)

```text
Task: "Implement daily aggregation in olorin-server/app/service/flow_progression_service.py"
Task: "Render daily panel states in olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/FlowProgressionPanels.tsx"
```

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1 Setup
2. Phase 2 Foundational
3. Phase 3 US1
4. Validate US1 independently

### Incremental Delivery

1. Add US2 (daily panel) and validate independently
2. Add US3 (monthly panel) and validate independently
3. Finish with Phase 6 polish tasks


