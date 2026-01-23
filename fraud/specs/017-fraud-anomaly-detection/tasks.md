# Tasks: Fraud Anomaly Detection Service

**Input**: Design documents from `/specs/001-fraud-anomaly-detection/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included per user story for 87%+ coverage requirement. Tests must be written and FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `olorin-server/app/` (extends existing analytics microservice)
- **Frontend**: `olorin-front/src/microservices/analytics/` (extends existing analytics microservice)
- **Tests**: `olorin-server/tests/` and `olorin-front/tests/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency setup

- [X] T001 Add backend dependencies (statsmodels, scikit-learn, pandas, numpy, apscheduler) to olorin-server/pyproject.toml
- [X] T002 [P] Create anomaly detection configuration schema in olorin-server/app/config/anomaly_config.py
- [X] T003 [P] Create anomaly service directory structure olorin-server/app/service/anomaly/ with __init__.py
- [X] T004 [P] Create anomaly tools directory structure olorin-server/app/service/agent/tools/anomaly_tools/ with __init__.py
- [X] T005 [P] Create frontend anomaly types file olorin-front/src/microservices/analytics/types/anomaly.ts
- [X] T006 [P] Create frontend anomaly API client file olorin-front/src/microservices/analytics/services/anomalyApi.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create Alembic migration for detectors table in olorin-server/alembic/versions/XXX_add_detectors_table.py
- [X] T008 Create Alembic migration for detection_runs table in olorin-server/alembic/versions/XXX_add_detection_runs_table.py
- [X] T009 Create Alembic migration for anomaly_events table in olorin-server/alembic/versions/XXX_add_anomaly_events_table.py
- [X] T010 Create SQLAlchemy Detector model in olorin-server/app/models/anomaly.py
- [X] T011 Create SQLAlchemy DetectionRun model in olorin-server/app/models/anomaly.py
- [X] T012 Create SQLAlchemy AnomalyEvent model in olorin-server/app/models/anomaly.py
- [X] T013 [P] Create abstract base detector class in olorin-server/app/service/anomaly/detectors/base.py
- [X] T014 [P] Create detector factory in olorin-server/app/service/anomaly/detector_factory.py
- [X] T015 [P] Create window data access layer in olorin-server/app/service/anomaly/data/windows.py
- [X] T016 Create severity scoring logic in olorin-server/app/service/anomaly/scoring.py
- [X] T017 Create guardrails logic (persistence, hysteresis, cooldowns) in olorin-server/app/service/anomaly/guardrails.py

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Detect Transaction Anomalies in Real-Time (Priority: P1) 🎯 MVP

**Goal**: Detect time-based anomalies in transaction metrics using STL+MAD and CUSUM algorithms, persist anomalies to database, and enable LangGraph auto-investigation for critical anomalies.

**Independent Test**: Run detection job on historical data via `/v1/analytics/anomalies/detect` endpoint, verify anomalies detected/scored/persisted, verify LangGraph policy creates investigation for critical anomalies.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T018 [P] [US1] Unit test for STL+MAD detector in olorin-server/tests/unit/service/anomaly/detectors/test_stl_mad.py
- [X] T019 [P] [US1] Unit test for CUSUM detector in olorin-server/tests/unit/service/anomaly/detectors/test_cusum.py
- [X] T020 [P] [US1] Unit test for Isolation Forest detector in olorin-server/tests/unit/service/anomaly/detectors/test_isoforest.py
- [X] T021 [P] [US1] Unit test for scoring logic in olorin-server/tests/unit/service/anomaly/test_scoring.py
- [X] T022 [P] [US1] Unit test for guardrails logic in olorin-server/tests/unit/service/anomaly/test_guardrails.py
- [X] T023 [US1] Integration test for detection run flow in olorin-server/tests/integration/api/test_anomaly_detection_flow.py
- [X] T024 [US1] E2E test for detection job execution in olorin-server/tests/e2e/test_anomaly_detection_flow.py

### Implementation for User Story 1

- [X] T025 [US1] Implement STL+MAD detector in olorin-server/app/service/anomaly/detectors/stl_mad.py
- [X] T026 [US1] Implement CUSUM detector in olorin-server/app/service/anomaly/detectors/cusum.py
- [X] T027 [US1] Implement Isolation Forest detector in olorin-server/app/service/anomaly/detectors/isoforest.py
- [X] T028 [US1] Implement detection job orchestrator in olorin-server/app/service/anomaly/detection_job.py
- [X] T029 [US1] Implement POST /v1/analytics/anomalies/detect endpoint in olorin-server/app/api/routes/analytics.py
- [X] T030 [US1] Implement LangGraph anomaly policy node in olorin-server/app/service/agent/orchestration/nodes/anomaly_policy.py
- [X] T031 [US1] Implement open_investigation tool in olorin-server/app/service/agent/tools/anomaly_tools/open_investigation.py
- [X] T032 [US1] Register open_investigation tool in olorin-server/app/service/agent/tools/tool_registry.py
- [X] T033 [US1] Wire anomaly policy node into LangGraph orchestrator in olorin-server/app/service/agent/orchestration/graph_builder.py
- [X] T034 [US1] Add error handling for Snowflake connection failures (log error, mark run as 'failed', return error response)
- [X] T035 [US1] Add error handling for invalid detector parameters (return 400 validation error before creating detector)
- [X] T036 [US1] Add error handling for WebSocket disconnections (client auto-reconnect, resume from last timestamp)
- [X] T037 [US1] Add logging for all detection run operations (start, completion, errors, metrics)

**Checkpoint**: At this point, User Story 1 should be fully functional - detection runs execute, anomalies are detected/scored/persisted, and critical anomalies trigger LangGraph investigations.

---

## Phase 4: User Story 2 - View and Filter Anomalies in Anomaly Hub (Priority: P1)

**Goal**: Provide Anomaly Hub UI page with anomaly list, filtering, sorting, real-time WebSocket updates, and detail view with evidence/charts.

**Independent Test**: Access `/analytics/anomalies` page, view anomaly list, apply filters, verify WebSocket updates appear in real-time, click anomaly to view details.

### Tests for User Story 2

- [ ] T038 [P] [US2] Unit test for AnomalyTable component in olorin-front/tests/unit/microservices/analytics/anomaly/test_AnomalyTable.tsx
- [ ] T039 [P] [US2] Unit test for AnomalyFilters component in olorin-front/tests/unit/microservices/analytics/anomaly/test_AnomalyFilters.tsx
- [ ] T040 [P] [US2] Unit test for useAnomalies hook in olorin-front/tests/unit/microservices/analytics/anomaly/test_useAnomalies.ts
- [ ] T041 [P] [US2] Unit test for useAnomalyWebSocket hook in olorin-front/tests/unit/microservices/analytics/anomaly/test_useAnomalyWebSocket.ts
- [ ] T042 [US2] Integration test for GET /v1/analytics/anomalies endpoint in olorin-server/tests/integration/api/test_anomaly_endpoints.py
- [ ] T043 [US2] Integration test for WebSocket /v1/stream/anomalies endpoint in olorin-server/tests/integration/api/test_anomaly_websocket.py

### Implementation for User Story 2

**Backend Endpoints:**
- [X] T044 [US2] Implement GET /v1/analytics/anomalies endpoint in olorin-server/app/api/routes/analytics.py
- [X] T045 [US2] Implement GET /v1/analytics/anomalies/{id} endpoint in olorin-server/app/api/routes/analytics.py
- [X] T046 [US2] Implement WebSocket /v1/stream/anomalies endpoint in olorin-server/app/api/routes/analytics.py

**Shared Visual Components (Glassmorphic Style):**
- [X] T047A [US2] Create Panel component with glassmorphic styling in olorin-front/src/microservices/analytics/components/common/Panel.tsx
- [X] T047B [US2] Create Toolbar component with glassmorphic styling in olorin-front/src/microservices/analytics/components/common/Toolbar.tsx
- [X] T047C [US2] Create KpiTile component (glassmorphic card with gradient) in olorin-front/src/microservices/analytics/components/common/KpiTile.tsx
- [X] T047D [US2] Create DataTable component (sortable, glassmorphic) in olorin-front/src/microservices/analytics/components/common/DataTable.tsx
- [X] T047E [US2] Create Sparkline component (mini trend chart SVG) in olorin-front/src/microservices/analytics/components/common/Sparkline.tsx
- [X] T047F [US2] Create Toast component (notifications) in olorin-front/src/microservices/analytics/components/common/Toast.tsx
- [X] T047G [US2] Create AnalyticsHeader component (shared header) in olorin-front/src/microservices/analytics/components/common/AnalyticsHeader.tsx

**Anomaly Hub Components:**
- [X] T047 [US2] Create AnomalyTable component using DataTable in olorin-front/src/microservices/analytics/components/anomaly/AnomalyTable.tsx
- [X] T048 [US2] Create AnomalyFilters component with URL sync in olorin-front/src/microservices/analytics/components/anomaly/AnomalyFilters.tsx
- [X] T049 [US2] Create AnomalyDetails drawer component in olorin-front/src/microservices/analytics/components/anomaly/AnomalyDetails.tsx
- [X] T050 [US2] Create TimeSeriesChart component (SVG-based) in olorin-front/src/microservices/analytics/components/common/TimeSeriesChart.tsx
- [X] T051 [US2] Create SeverityBadge component in olorin-front/src/microservices/analytics/components/common/SeverityBadge.tsx

**Hooks & State Management:**
- [X] T052 [US2] Create useAnomalies hook with URL state sync in olorin-front/src/microservices/analytics/hooks/useAnomalies.ts
- [X] T052A [US2] Create useUrlState hook for query string management in olorin-front/src/microservices/analytics/hooks/useUrlState.ts
- [X] T053 [US2] Create useAnomalyWebSocket hook with auto-reconnect in olorin-front/src/microservices/analytics/hooks/useAnomalyWebSocket.ts

**Page & Routing:**
- [X] T054 [US2] Create AnomalyHubPage component with glassmorphic layout in olorin-front/src/microservices/analytics/pages/AnomalyHubPage.tsx
- [X] T055 [US2] Add route /analytics/anomalies to analytics router in olorin-front/src/microservices/analytics/
- [X] T056 [US2] Extend anomalyApi client with list/get/stream methods in olorin-front/src/microservices/analytics/services/anomalyApi.ts

**UX Enhancements:**
- [X] T056A [US2] Create skeleton loaders for anomaly table/charts in olorin-front/src/microservices/analytics/components/common/SkeletonLoader.tsx
- [X] T056B [US2] Add error boundaries around charts/tables in olorin-front/src/microservices/analytics/components/anomaly/
- [X] T056C [US2] Implement toast notification system integration in AnomalyHubPage
- [ ] T056D [US2] Add accessibility features (aria-labels, keyboard navigation) to all interactive components

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - detection runs create anomalies, and Anomaly Hub displays them with real-time updates.

---

## Phase 5: User Story 3 - Configure and Tune Detectors (Priority: P2)

**Goal**: Enable creation, configuration, and tuning of detector parameters via Detector Studio UI, with preview scores on historical data.

**Independent Test**: Create detector via `/analytics/detectors` page, adjust parameters, run preview, verify detector saves and executes correctly.

### Tests for User Story 3

- [ ] T057 [P] [US3] Unit test for DetectorForm component in olorin-front/tests/unit/microservices/analytics/anomaly/test_DetectorForm.tsx
- [ ] T058 [P] [US3] Unit test for DetectorPreview component in olorin-front/tests/unit/microservices/analytics/anomaly/test_DetectorPreview.tsx
- [ ] T059 [P] [US3] Unit test for useDetectors hook in olorin-front/tests/unit/microservices/analytics/anomaly/test_useDetectors.ts
- [ ] T060 [US3] Integration test for detector CRUD endpoints in olorin-server/tests/integration/api/test_detector_endpoints.py
- [ ] T061 [US3] Integration test for preview endpoint in olorin-server/tests/integration/api/test_detector_preview.py

### Implementation for User Story 3

**Backend Endpoints:**
- [X] T062 [US3] Implement GET /v1/analytics/detectors endpoint in olorin-server/app/api/routes/analytics.py
- [X] T063 [US3] Implement POST /v1/analytics/detectors endpoint in olorin-server/app/api/routes/analytics.py
- [X] T064 [US3] Implement GET /v1/analytics/detectors/{id} endpoint in olorin-server/app/api/routes/analytics.py
- [X] T065 [US3] Implement PUT /v1/analytics/detectors/{id} endpoint in olorin-server/app/api/routes/analytics.py
- [X] T066 [US3] Implement DELETE /v1/analytics/detectors/{id} endpoint in olorin-server/app/api/routes/analytics.py
- [X] T067 [US3] Implement POST /v1/analytics/detectors/{id}/preview endpoint in olorin-server/app/api/routes/analytics.py
- [X] T067A [US3] Implement GET /v1/analytics/series endpoint for time series data in olorin-server/app/api/routes/analytics.py

**Client-Side Preview Logic (Detector Studio):**
- [X] T067B [US3] Create mock series generator (seasonality + noise + anomalies) in olorin-front/src/microservices/analytics/utils/mockSeriesGenerator.ts
- [X] T067C [US3] Implement client-side STL approximation (two moving averages) in olorin-front/src/microservices/analytics/utils/previewScoring.ts
- [X] T067D [US3] Implement client-side MAD z-score calculation in olorin-front/src/microservices/analytics/utils/previewScoring.ts
- [X] T067E [US3] Implement client-side CUSUM-like level-shift scoring in olorin-front/src/microservices/analytics/utils/previewScoring.ts
- [X] T067F [US3] Implement fused score calculation (max(MAD, CUSUM)) in olorin-front/src/microservices/analytics/utils/previewScoring.ts
- [X] T067G [US3] Implement persistence logic for preview anomalies in olorin-front/src/microservices/analytics/utils/previewScoring.ts

**Detector Studio Components:**
- [X] T068 [US3] Create DetectorForm component with glassmorphic styling in olorin-front/src/microservices/analytics/components/anomaly/DetectorForm.tsx
- [X] T068A [US3] Create metric selector dropdown component in olorin-front/src/microservices/analytics/components/anomaly/MetricSelector.tsx
- [X] T068B [US3] Create cohort field inputs component in olorin-front/src/microservices/analytics/components/anomaly/CohortFields.tsx
- [X] T068C [US3] Create slider components for k and persistence in olorin-front/src/microservices/analytics/components/common/Slider.tsx
- [X] T069 [US3] Create DetectorPreview component (left config, right chart+table) in olorin-front/src/microservices/analytics/components/anomaly/DetectorPreview.tsx
- [X] T069A [US3] Create preview anomalies table component in olorin-front/src/microservices/analytics/components/anomaly/PreviewAnomaliesTable.tsx

**Hooks:**
- [X] T070 [US3] Create useDetectors hook in olorin-front/src/microservices/analytics/hooks/useDetectors.ts
- [X] T070A [US3] Create usePreviewScoring hook for client-side preview in olorin-front/src/microservices/analytics/hooks/usePreviewScoring.ts

**Page & Routing:**
- [X] T071 [US3] Create DetectorStudioPage component (canvas layout) in olorin-front/src/microservices/analytics/pages/DetectorStudioPage.tsx
- [X] T072 [US3] Add route /analytics/detectors/:id to analytics router in olorin-front/src/microservices/analytics/
- [X] T073 [US3] Extend anomalyApi client with detector CRUD and preview methods in olorin-front/src/microservices/analytics/services/anomalyApi.ts
- [X] T073A [US3] Add getSeries() function to anomalyApi client in olorin-front/src/microservices/analytics/services/anomalyApi.ts

**UX Enhancements:**
- [X] T073B [US3] Add toast notifications for "Reload Series" and "Run Preview" actions
- [X] T073C [US3] Add disabled button states during preview calculations
- [X] T073D [US3] Add debug text display (points/flags/last action) in DetectorPreview
- [X] T073E [US3] Implement swap to real backend (one-liner mock replacement) in DetectorPreview

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - detectors can be created/configured, and detection runs use saved configurations.

---

## Phase 6: User Story 4 - Replay Detection on Historical Windows (Priority: P2)

**Goal**: Enable backtesting detector configurations on historical windows and comparing results against production detectors.

**Independent Test**: Access `/analytics/replay`, select historical window and detector config, run replay, compare results against production anomalies.

### Tests for User Story 4

- [ ] T074 [P] [US4] Unit test for ReplayComparison component in olorin-front/tests/unit/microservices/analytics/anomaly/test_ReplayComparison.tsx
- [ ] T075 [US4] Integration test for replay endpoint in olorin-server/tests/integration/api/test_replay_endpoint.py

### Implementation for User Story 4

**Backend:**
- [X] T076 [US4] Implement POST /v1/analytics/replay endpoint in olorin-server/app/api/routes/analytics.py
- [X] T077 [US4] Create replay comparison logic in olorin-server/app/service/anomaly/replay_comparison.py
- [X] T082 [US4] Implement POST /v1/analytics/detectors/{id}/promote endpoint to promote detector config from replay to production in olorin-server/app/api/routes/analytics.py

**Replay Studio Components:**
- [X] T078 [US4] Create ReplayComparison component with diff table in olorin-front/src/microservices/analytics/components/anomaly/ReplayComparison.tsx
- [X] T078A [US4] Create diff table component (new-only, missing, overlap) in olorin-front/src/microservices/analytics/components/anomaly/DiffTable.tsx
- [X] T078B [US4] Create progress indicator component for replay runs in olorin-front/src/microservices/analytics/components/common/ProgressIndicator.tsx
- [X] T078C [US4] Implement visual diff styling (colors and badges) in DiffTable component
- [X] T079 [US4] Create ReplayStudioPage component with glassmorphic layout in olorin-front/src/microservices/analytics/pages/ReplayStudioPage.tsx

**Routing & API:**
- [X] T080 [US4] Add route /analytics/replay to analytics router in olorin-front/src/microservices/analytics/
- [X] T081 [US4] Extend anomalyApi client with replay method in olorin-front/src/microservices/analytics/services/anomalyApi.ts

**Checkpoint**: At this point, User Stories 1-4 should all work independently - replay functionality enables detector optimization.

---

## Phase 7: Shared Infrastructure & Polish

**Purpose**: Complete shared components, accessibility, and UX polish for all three pages

**Visual System Components:**
- [X] T083 [P] Create Panel component with glassmorphic styling (backdrop-blur, soft borders) in olorin-front/src/microservices/analytics/components/common/Panel.tsx
- [X] T084 [P] Create Toolbar component with glassmorphic styling in olorin-front/src/microservices/analytics/components/common/Toolbar.tsx
- [X] T085 [P] Update KpiTile component with glassmorphic styling and gradients in olorin-front/src/microservices/analytics/components/common/KpiTile.tsx
- [X] T086 [P] Create DataTable component (sortable, glassmorphic) in olorin-front/src/microservices/analytics/components/common/DataTable.tsx
- [X] T087 [P] Create Sparkline component (mini trend chart SVG) in olorin-front/src/microservices/analytics/components/common/Sparkline.tsx
- [X] T088 [P] Verify Toast component uses glassmorphic styling (already exists, verify/update if needed)
- [X] T089 [P] Create AnalyticsHeader component (shared header with navigation) in olorin-front/src/microservices/analytics/components/common/AnalyticsHeader.tsx

**State Management & Utilities:**
- [X] T090 [P] Create useUrlState hook for query string management in olorin-front/src/microservices/analytics/hooks/useUrlState.ts
- [X] T091 [P] Create local cache utility for query string keyed data in olorin-front/src/microservices/analytics/utils/cache.ts
- [X] T092 [P] Create PII masking utility in olorin-front/src/microservices/analytics/utils/piiMasking.ts

**Accessibility & UX:**
- [X] T093 [P] Ensure all buttons have type="button" and aria-labels
- [X] T094 [P] Add keyboard navigation support to all interactive components
- [X] T095 [P] Implement high-contrast text and large click targets (min 44x44px)
- [X] T096 [P] Add focus-visible styles for keyboard navigation
- [X] T097 [P] Add error boundaries around charts/tables (verify ErrorBoundary exists, wrap components)
- [X] T098 [P] Create skeleton loaders for loading states (verify SkeletonLoader exists, create if needed)
- [X] T099 [P] Add empty state components with retry buttons to all pages

**Performance Optimizations:**
- [X] T100 [P] Implement WebSocket batch updates (throttle/debounce) in useAnomalyWebSocket hook
- [X] T101 [P] Add memoization to prevent re-render storms in preview scoring
- [X] T102 [P] Implement virtual scrolling for large tables (if >1000 rows)

**Checkpoint**: All shared infrastructure complete - glassmorphic styling, accessibility, and UX polish applied consistently across all pages.

---

## Phase 8: User Story 5 - Automatic Investigation Creation for Critical Anomalies (Priority: P2)

**Goal**: LangGraph orchestrator automatically creates investigations for critical anomalies, retrieves RAG context, generates incident summary, and attaches evidence.

**Independent Test**: Trigger critical anomaly (severity='critical', persisted_n=2, score > 4.5), verify LangGraph policy routes to 'open' action, confirm investigation created with summary attached.

### Tests for User Story 5

- [ ] T103 [P] [US5] Unit test for summarize_node in olorin-server/tests/unit/service/agent/orchestration/nodes/test_summarize_node.py
- [ ] T104 [US5] Integration test for LangGraph auto-investigation flow in olorin-server/tests/integration/agent/test_anomaly_investigation_flow.py

### Implementation for User Story 5

- [X] T105 [US5] Implement summarize_node in olorin-server/app/service/agent/orchestration/nodes/summarize_node.py
- [X] T106 [US5] Implement attach_evidence tool in olorin-server/app/service/agent/tools/anomaly_tools/attach_evidence.py
- [X] T107 [US5] Register attach_evidence tool in olorin-server/app/service/agent/tools/tool_registry.py
- [X] T108 [US5] Wire summarize_node into LangGraph orchestrator in olorin-server/app/service/agent/orchestration/graph_builder.py
- [X] T109 [US5] Connect anomaly policy node to summarize_node in graph flow

**Checkpoint**: At this point, User Stories 1-5 should all work independently - critical anomalies automatically create investigations with summaries.

---

## Phase 9: User Story 6 - Launch Investigation from Anomaly (Priority: P2)

**Goal**: Enable manual investigation creation from anomalies with anomaly context (cohort, metric, window, evidence) pre-populated.

**Independent Test**: Click "Investigate" button on anomaly in Anomaly Hub, verify investigation created via `/api/v1/investigation-state/` with anomaly context, confirm investigation appears in investigations-management microservice.

### Tests for User Story 6

- [ ] T110 [P] [US6] Unit test for useInvestigation hook in olorin-front/tests/unit/microservices/analytics/anomaly/test_useInvestigation.ts
- [ ] T111 [US6] Integration test for investigation creation endpoint in olorin-server/tests/integration/api/test_anomaly_investigate_endpoint.py

### Implementation for User Story 6

- [X] T112 [US6] Implement POST /v1/analytics/anomalies/{id}/investigate endpoint in olorin-server/app/api/routes/analytics.py
- [X] T113 [US6] Create anomaly-to-investigation mapping logic in olorin-server/app/router/controllers/anomaly_controller.py
- [X] T114 [US6] Create useInvestigation hook in olorin-front/src/microservices/analytics/hooks/useInvestigation.ts
- [X] T115 [US6] Add "Investigate" button to AnomalyTable component in olorin-front/src/microservices/analytics/components/anomaly/AnomalyTable.tsx
- [X] T116 [US6] Integrate with InvestigationService in AnomalyHubPage in olorin-front/src/microservices/analytics/pages/AnomalyHubPage.tsx
- [X] T117 [US6] Extend anomalyApi client with investigate method in olorin-front/src/microservices/analytics/services/anomalyApi.ts
- [X] T117A [US6] Add investigation ID display in AnomalyTable when investigation exists
- [X] T117B [US6] Add deep-link to investigations from anomaly row in AnomalyTable

**Checkpoint**: At this point, all user stories should work independently - manual investigation creation from anomalies is functional.

---

## Phase 10: Additional LangGraph Tools & Integration

**Purpose**: Complete LangGraph integration with remaining tools

- [X] T118 [P] Implement fetch_series tool in olorin-server/app/service/agent/tools/anomaly_tools/fetch_series.py
- [X] T119 [P] Implement detect_anomalies tool in olorin-server/app/service/agent/tools/anomaly_tools/detect_anomalies.py
- [X] T120 [P] Implement list_anomalies tool in olorin-server/app/service/agent/tools/anomaly_tools/list_anomalies.py
- [X] T121 Register fetch_series tool in olorin-server/app/service/agent/tools/tool_registry.py
- [X] T122 Register detect_anomalies tool in olorin-server/app/service/agent/tools/tool_registry.py
- [X] T123 Register list_anomalies tool in olorin-server/app/service/agent/tools/tool_registry.py
- [X] T124 Implement GET /v1/analytics/series endpoint in olorin-server/app/api/routes/analytics.py

---

## Phase 11: Scheduled Detection Runs

**Purpose**: Implement scheduled detection runs with configurable interval using APScheduler

- [X] T125 Create scheduler initialization in olorin-server/app/service/anomaly/scheduler.py using APScheduler
- [X] T126 Integrate scheduler with detection job orchestrator
- [X] T127 Add scheduler startup to FastAPI app initialization in olorin-server/app/main.py
- [X] T128 Add scheduler shutdown handling for graceful shutdown

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Error Handling & Validation

- [X] T129 [P] Add error handling for POST /v1/analytics/anomalies/detect endpoint (Snowflake failures, invalid detector IDs)
- [X] T130 [P] Add error handling for GET /v1/analytics/anomalies endpoint (invalid filters, pagination errors)
- [X] T131 [P] Add error handling for GET /v1/analytics/anomalies/{id} endpoint (not found, invalid UUID)
- [X] T132 [P] Add error handling for WebSocket /v1/stream/anomalies endpoint (connection failures, subscription errors)
- [X] T133 [P] Add error handling for detector CRUD endpoints (validation errors, constraint violations)
- [X] T134 [P] Add error handling for POST /v1/analytics/replay endpoint (invalid window, detector not found)
- [X] T135 [P] Add request validation for all POST/PUT endpoints using Pydantic models
- [X] T136 [P] Add error response formatting per API contract (consistent error structure)

### Logging & Monitoring

- [X] T137 [P] Add structured logging for detection run lifecycle (start, progress, completion, errors)
- [X] T138 [P] Add structured logging for anomaly detection events (detected, scored, persisted)
- [X] T139 [P] Add structured logging for API endpoint requests/responses (method, path, status, duration)
- [X] T140 [P] Add performance metrics collection (detection run duration, API latency, WebSocket message latency)
- [X] T141 [P] Add metrics for anomaly detection rates (anomalies per run, false positive rate)

### Configuration & Compliance

- [X] T142 [P] Verify all configuration values loaded from environment variables (no hardcoded values)
- [X] T143 [P] Add configuration validation on startup (fail-fast if required env vars missing)
- [X] T144 [P] Verify all files are under 200 lines, split if needed
- [X] T145 [P] Add pre-commit hook or CI check for file size compliance (200 line limit)
- [X] T146 [P] Add pre-commit hook or CI check for hardcoded value detection

### Testing & Documentation

- [ ] T147 [P] Run test coverage check (target 87%+)
- [X] T148 [P] Add missing unit tests for edge cases (missing data, invalid params, concurrent runs)
- [X] T149 [P] Add API endpoint integration tests for all endpoints (coverage all success/error paths)
- [X] T150 [P] Add frontend component integration tests (user interactions, WebSocket updates)
- [X] T151 [P] Update API documentation (Swagger/OpenAPI) with all endpoints and schemas
- [X] T152 Run quickstart.md validation (verify all steps work end-to-end)

### Success Criteria Validation

- [ ] T133 Validate SC-001: Performance test detection runs complete within 30s for 7-day window with 100 cohorts (p95)
- [ ] T134 Validate SC-002: Performance test API endpoints respond within 200ms (p95) for list queries with filters
- [ ] T135 Validate SC-003: Performance test WebSocket streaming delivers events within 1s (p95) of detection
- [ ] T136 Validate SC-004: Performance test Anomaly Hub page loads and displays 1000 anomalies within 2s (p95)
- [ ] T137 Validate SC-005: Performance test Detector Studio allows create/configure in under 30s
- [ ] T138 Validate SC-006: Performance test Replay Studio completes backtest runs on 7-day windows within 60s (p95)
- [ ] T139 Validate SC-007: Performance test LangGraph investigation auto-creation triggers within 5s (p95) of critical anomaly
- [ ] T140 Validate SC-008: Precision test system detects anomalies with >= 85% precision on labeled test data
- [ ] T141 Validate SC-009: Data completeness test system maintains >= 99% data completeness for cohorts with sufficient volume
- [ ] T142 Validate SC-010: Throughput test system processes >= 10,000 cohorts per hour in detection runs

### Infrastructure & Reliability

- [X] T143 Verify WebSocket reconnection logic works correctly (auto-reconnect, resume from last timestamp)
- [X] T144 Verify database indexes are created via migration (detectors, detection_runs, anomaly_events tables)
- [X] T145 Verify schema verification on startup (fail-fast if schema mismatch detected)
- [X] T146 Add health check endpoint for scheduler status

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) after Foundational
  - Or sequentially in priority order (US1 → US2 → US3 → US4 → US5 → US6)
- **Additional Tools (Phase 9)**: Can run in parallel with user stories (no blocking dependencies)
- **Scheduler (Phase 10)**: Depends on US1 completion (needs detection job orchestrator)
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Depends on US1 for anomaly data, but UI can be built independently
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 for detector execution, but CRUD can be built independently
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 and US3 for detector execution and comparison
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 for anomaly events, integrates with existing LangGraph
- **User Story 6 (P2)**: Can start after Foundational (Phase 2) - Depends on US2 for Anomaly Hub UI, integrates with existing investigation service

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints/UI
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members
- Phase 9 (Additional Tools) can run in parallel with user stories

---

## Parallel Example: User Story 1

```bash
# Launch all unit tests for User Story 1 together:
Task: T018 - Unit test for STL+MAD detector
Task: T019 - Unit test for CUSUM detector
Task: T020 - Unit test for scoring logic
Task: T021 - Unit test for guardrails logic

# Launch detector implementations together (after tests):
Task: T024 - Implement STL+MAD detector
Task: T025 - Implement CUSUM detector
```

---

## Parallel Example: User Story 2

```bash
# Launch all frontend component tests together:
Task: T033 - Unit test for AnomalyTable component
Task: T034 - Unit test for AnomalyFilters component
Task: T035 - Unit test for useAnomalies hook
Task: T036 - Unit test for useAnomalyWebSocket hook

# Launch component implementations together:
Task: T042 - Create AnomalyTable component
Task: T043 - Create AnomalyFilters component
Task: T044 - Create AnomalyDetails component
Task: T045 - Create TimeSeriesChart component
Task: T046 - Create SeverityBadge component
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

**MVP Deliverable**: Detection runs execute, anomalies are detected/scored/persisted, critical anomalies trigger LangGraph investigations. Can be tested via API without UI.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Full UI)
4. Add User Story 3 → Test independently → Deploy/Demo (Detector Management)
5. Add User Story 4 → Test independently → Deploy/Demo (Replay/Backtesting)
6. Add User Story 5 → Test independently → Deploy/Demo (Auto-Investigation)
7. Add User Story 6 → Test independently → Deploy/Demo (Manual Investigation)
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Core Detection)
   - Developer B: User Story 2 (Anomaly Hub UI) - can start after US1 has some data
   - Developer C: User Story 3 (Detector Studio) - can start independently
3. After US1 completes:
   - Developer A: User Story 4 (Replay Studio)
   - Developer B: User Story 5 (Auto-Investigation)
   - Developer C: User Story 6 (Manual Investigation)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All configuration must come from environment variables (no hardcoded values)
- All files must be under 200 lines (split if needed)
- Minimum 87% test coverage required

