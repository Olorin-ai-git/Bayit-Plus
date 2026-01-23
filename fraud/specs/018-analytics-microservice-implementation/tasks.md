# Tasks: Analytics Microservice

**Input**: Design documents from `/specs/001-analytics-miroservice-implementation/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `olorin-front/src/microservices/analytics/`
- **Backend**: `olorin-server/app/`
- Paths shown below use these conventions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create frontend microservice directory structure at olorin-front/src/microservices/analytics/
- [x] T002 [P] Initialize TypeScript configuration in olorin-front/src/microservices/analytics/tsconfig.json
- [x] T003 [P] Configure Tailwind CSS in olorin-front/src/microservices/analytics/tailwind.config.js
- [x] T004 [P] Set up Webpack 5 Module Federation configuration in olorin-front/src/microservices/analytics/webpack.config.js
- [x] T005 [P] Install frontend dependencies: react, react-dom, react-router-dom, chart.js, react-chartjs-2, d3, axios, mitt
- [x] T006 Create backend analytics service directory at olorin-server/app/service/analytics/
- [x] T007 [P] Install backend dependencies: pandas, numpy, scikit-learn (for metrics calculation)
- [x] T008 [P] Create environment configuration files: .env.example for frontend and backend
- [x] T009 [P] Set up ESLint and Prettier configuration for frontend
- [x] T010 [P] Set up pytest configuration for backend in olorin-server/pytest.ini

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T011 Create base TypeScript types in olorin-front/src/microservices/analytics/types/analytics.ts
- [x] T012 [P] Create metrics types in olorin-front/src/microservices/analytics/types/metrics.ts
- [x] T013 [P] Create cohort types in olorin-front/src/microservices/analytics/types/cohort.ts
- [x] T014 [P] Create experiments types in olorin-front/src/microservices/analytics/types/experiments.ts
- [x] T015 Create base analytics service client in olorin-front/src/microservices/analytics/services/analyticsService.ts
- [x] T016 [P] Create event bus integration service in olorin-front/src/microservices/analytics/services/eventBus.ts
- [x] T017 [P] Create shared utilities: formatters in olorin-front/src/microservices/analytics/utils/formatters.ts
- [x] T018 [P] Create shared utilities: validators in olorin-front/src/microservices/analytics/utils/validators.ts
- [x] T019 Create base analytics API router extension in olorin-server/app/api/routes/analytics.py (extend existing)
- [x] T020 Create base analytics models in olorin-server/app/models/analytics.py
- [x] T021 Create analytics repository base in olorin-server/app/persistence/analytics_repository.py
- [x] T022 [P] Create error boundary component in olorin-front/src/microservices/analytics/components/common/ErrorBoundary.tsx
- [x] T023 [P] Create loading state component in olorin-front/src/microservices/analytics/components/common/LoadingState.tsx
- [x] T024 [P] Create empty state component in olorin-front/src/microservices/analytics/components/common/EmptyState.tsx
- [x] T025 Set up Module Federation remote entry in olorin-front/src/microservices/analytics/bootstrap.tsx
- [x] T026 Create main AnalyticsApp component in olorin-front/src/microservices/analytics/AnalyticsApp.tsx
- [x] T027 Create barrel exports in olorin-front/src/microservices/analytics/index.ts
- [x] T028 Register analytics microservice in shell app webpack.config.js (add remote entry)
- [x] T029 Add /analytics route in shell app CoreUIApp.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Analytics Dashboard Overview (Priority: P1) 🎯 MVP

**Goal**: Display comprehensive fraud detection analytics dashboard with KPIs, trend graphs, filters, and export functionality

**Independent Test**: Navigate to `/analytics` and verify all KPI tiles display correctly with real data, trend graphs render properly, filters work as expected, and export generates correct files

### Implementation for User Story 1

- [x] T030 [US1] Create AnalyticsDashboard component in olorin-front/src/microservices/analytics/components/dashboard/AnalyticsDashboard.tsx
- [x] T031 [P] [US1] Create KPITiles component in olorin-front/src/microservices/analytics/components/dashboard/KPITiles.tsx
- [x] T032 [P] [US1] Create TrendGraphs component in olorin-front/src/microservices/analytics/components/dashboard/TrendGraphs.tsx
- [x] T033 [P] [US1] Create Filters component in olorin-front/src/microservices/analytics/components/dashboard/Filters.tsx
- [x] T034 [US1] Create useAnalytics hook for dashboard data fetching in olorin-front/src/microservices/analytics/hooks/useAnalytics.ts
- [x] T035 [US1] Create useFilters hook for filter state management in olorin-front/src/microservices/analytics/hooks/useFilters.ts
- [x] T036 [US1] Implement GET /dashboard endpoint in olorin-server/app/api/routes/analytics.py
- [x] T037 [US1] Create dashboard service method in olorin-server/app/service/analytics/dashboard_service.py
- [x] T038 [US1] Implement date range filtering logic in backend dashboard service
- [x] T039 [US1] Implement investigation filtering logic in backend dashboard service
- [x] T040 [US1] Create export service in olorin-front/src/microservices/analytics/services/exportService.ts
- [x] T041 [US1] Implement POST /export endpoint in olorin-server/app/api/routes/analytics.py
- [x] T042 [US1] Add CSV export functionality in backend export service
- [x] T043 [US1] Add JSON export functionality in backend export service
- [x] T044 [US1] Add PDF export functionality in backend export service
- [x] T045 [US1] Implement glassmorphic UI styling matching Olorin design system
- [x] T046 [US1] Add real-time updates toggle UI in Filters component
- [x] T047 [US1] Integrate dashboard with event bus for real-time updates

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Fraud Metrics Pipeline (Priority: P1)

**Goal**: Calculate and display fraud detection metrics including precision, recall, F1, capture rate, approval rate, false-positive cost, chargeback rate, latency, and throughput

**Independent Test**: Verify all fraud metrics are calculated correctly from decision data, displayed with appropriate formatting, and update in real-time as new decisions are made

### Implementation for User Story 2

- [x] T048 [US2] Create metrics calculator service in olorin-server/app/service/analytics/metrics_calculator.py
- [x] T049 [P] [US2] Create precision/recall calculator in olorin-server/app/service/analytics/precision_recall.py
- [x] T050 [P] [US2] Create latency calculator in olorin-server/app/service/analytics/latency_calculator.py
- [x] T051 [P] [US2] Create throughput calculator in olorin-server/app/service/analytics/throughput_calculator.py
- [x] T052 [US2] Implement GET /metrics endpoint in olorin-server/app/api/routes/analytics.py
- [x] T053 [US2] Implement GET /metrics/precision-recall endpoint in olorin-server/app/api/routes/analytics.py
- [x] T054 [US2] Create FraudMetrics component in olorin-front/src/microservices/analytics/components/metrics/FraudMetrics.tsx
- [x] T055 [P] [US2] Create PrecisionRecall component in olorin-front/src/microservices/analytics/components/metrics/PrecisionRecall.tsx
- [x] T056 [P] [US2] Create LatencyMetrics component in olorin-front/src/microservices/analytics/components/metrics/LatencyMetrics.tsx
- [x] T057 [P] [US2] Create ThroughputMetrics component in olorin-front/src/microservices/analytics/components/metrics/ThroughputMetrics.tsx
- [x] T058 [US2] Implement precision calculation logic (TP/(TP+FP)) in precision_recall.py
- [x] T059 [US2] Implement recall calculation logic (TP/(TP+FN)) in precision_recall.py
- [x] T060 [US2] Implement F1 score calculation logic in precision_recall.py
- [x] T061 [US2] Implement capture rate calculation in metrics_calculator.py
- [x] T062 [US2] Implement approval rate calculation in metrics_calculator.py
- [x] T063 [US2] Implement false-positive cost calculation in metrics_calculator.py
- [x] T064 [US2] Implement chargeback rate calculation in metrics_calculator.py
- [x] T065 [US2] Implement p50/p95/p99 latency percentile calculation in latency_calculator.py
- [x] T066 [US2] Implement decision throughput calculation in throughput_calculator.py
- [x] T067 [US2] Create metrics service helper in olorin-front/src/microservices/analytics/services/metricsService.ts
- [x] T068 [US2] Add real-time metrics update handler in useRealtimeUpdates hook
- [x] T069 [US2] Implement online (streaming) metrics calculation pipeline
- [x] T070 [US2] Implement offline (batch) metrics calculation pipeline

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Cohort & Slice Analysis (Priority: P2)

**Goal**: Segment fraud detection performance by merchant, channel, geography, device, risk band, model/rule version with privacy protection

**Independent Test**: Select different segmentation dimensions and verify metrics are correctly calculated for each segment, comparisons work properly, and minimum count thresholds prevent display of segments with too few data points

### Implementation for User Story 3

- [x] T071 [US3] Create cohort analyzer service in olorin-server/app/service/analytics/cohort_analyzer.py
- [x] T072 [US3] Implement GET /cohorts endpoint in olorin-server/app/api/routes/analytics.py
- [x] T073 [US3] Implement GET /cohorts/compare endpoint in olorin-server/app/api/routes/analytics.py
- [x] T074 [US3] Implement merchant segmentation logic in cohort_analyzer.py
- [x] T075 [US3] Implement channel segmentation logic in cohort_analyzer.py
- [x] T076 [US3] Implement geography segmentation logic in cohort_analyzer.py
- [x] T077 [US3] Implement device segmentation logic in cohort_analyzer.py
- [x] T078 [US3] Implement risk band segmentation logic in cohort_analyzer.py
- [x] T079 [US3] Implement model version segmentation logic in cohort_analyzer.py
- [x] T080 [US3] Implement rule version segmentation logic in cohort_analyzer.py
- [x] T081 [US3] Implement minimum count threshold enforcement (100 transactions) in cohort_analyzer.py
- [x] T082 [US3] Implement segment aggregation for small cohorts in cohort_analyzer.py
- [x] T083 [US3] Create CohortSelector component in olorin-front/src/microservices/analytics/components/cohort/CohortSelector.tsx
- [x] T084 [P] [US3] Create CohortComparison component in olorin-front/src/microservices/analytics/components/cohort/CohortComparison.tsx
- [x] T085 [P] [US3] Create CohortTable component in olorin-front/src/microservices/analytics/components/cohort/CohortTable.tsx
- [x] T086 [US3] Create useCohortAnalysis hook in olorin-front/src/microservices/analytics/hooks/useCohortAnalysis.ts
- [x] T087 [US3] Implement side-by-side comparison view in CohortComparison component
- [x] T088 [US3] Implement segment highlighting for unusual performance patterns

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Experiment & A/B Test Analytics (Priority: P2)

**Goal**: Conduct A/B tests and multivariate experiments with traffic assignment, lift tracking, guardrail monitoring, and statistical significance

**Independent Test**: Create an experiment, assign traffic to variants, verify metrics are tracked separately for each variant, and confirm guardrail alerts trigger when metrics exceed thresholds

### Implementation for User Story 4

- [x] T089 [US4] Create experiment manager service in olorin-server/app/service/analytics/experiment_manager.py
- [x] T090 [US4] Create experiments table migration in olorin-server/app/persistence/migrations/
- [x] T091 [US4] Implement GET /experiments endpoint in olorin-server/app/api/routes/analytics.py
- [x] T092 [US4] Implement POST /experiments endpoint in olorin-server/app/api/routes/analytics.py
- [x] T093 [US4] Implement GET /experiments/{experimentId} endpoint in olorin-server/app/api/routes/analytics.py
- [x] T094 [US4] Implement PUT /experiments/{experimentId} endpoint in olorin-server/app/api/routes/analytics.py
- [x] T095 [US4] Implement POST /experiments/{experimentId}/promote endpoint in olorin-server/app/api/routes/analytics.py
- [x] T096 [US4] Implement traffic assignment logic (hash-based) in experiment_manager.py
- [x] T097 [US4] Implement lift calculation logic in experiment_manager.py
- [x] T098 [US4] Implement guardrail monitoring logic in experiment_manager.py
- [x] T099 [US4] Implement statistical significance calculation (t-test/chi-square) in experiment_manager.py
- [x] T100 [US4] Implement automatic variant pausing on guardrail violation in experiment_manager.py
- [x] T101 [US4] Create ExperimentList component in olorin-front/src/microservices/analytics/components/experiments/ExperimentList.tsx
- [x] T102 [P] [US4] Create ExperimentDetail component in olorin-front/src/microservices/analytics/components/experiments/ExperimentDetail.tsx
- [x] T103 [P] [US4] Create VariantComparison component in olorin-front/src/microservices/analytics/components/experiments/VariantComparison.tsx
- [x] T104 [P] [US4] Create GuardrailMonitor component in olorin-front/src/microservices/analytics/components/experiments/GuardrailMonitor.tsx
- [x] T105 [US4] Create useExperiments hook in olorin-front/src/microservices/analytics/hooks/useExperiments.ts
- [x] T106 [US4] Implement experiment creation form in ExperimentDetail component
- [x] T107 [US4] Implement variant comparison visualization in VariantComparison component
- [x] T108 [US4] Implement guardrail alert display in GuardrailMonitor component

**Checkpoint**: At this point, User Stories 1-4 should all work independently

---

## Phase 7: User Story 5 - Drift & Data Quality Monitoring (Priority: P2)

**Goal**: Monitor data drift (PSI/KL divergence), label delay, schema conformance, null spikes, and feature range violations

**Independent Test**: Introduce data drift and verify PSI/KL metrics detect the drift, alerts are triggered, and data quality issues are correctly identified and reported

### Implementation for User Story 5

- [x] T109 [US5] Create drift detector service in olorin-server/app/service/analytics/drift_detector.py
- [x] T110 [US5] Implement GET /drift endpoint in olorin-server/app/api/routes/analytics.py
- [x] T111 [US5] Implement GET /drift/data-quality endpoint in olorin-server/app/api/routes/analytics.py
- [x] T112 [US5] Implement PSI (Population Stability Index) calculation in drift_detector.py
- [x] T113 [US5] Implement KL divergence calculation in drift_detector.py
- [x] T114 [US5] Implement label delay tracking in drift_detector.py
- [x] T115 [US5] Implement schema conformance checking in drift_detector.py
- [x] T116 [US5] Implement null rate spike detection in drift_detector.py
- [x] T117 [US5] Implement rare value anomaly detection in drift_detector.py
- [x] T118 [US5] Implement feature range violation detection in drift_detector.py
- [x] T119 [US5] Implement drift threshold alerting in drift_detector.py
- [x] T120 [US5] Create DriftMonitor component in olorin-front/src/microservices/analytics/components/drift/DriftMonitor.tsx
- [x] T121 [P] [US5] Create PSIChart component in olorin-front/src/microservices/analytics/components/drift/PSIChart.tsx
- [x] T122 [P] [US5] Create DataQuality component in olorin-front/src/microservices/analytics/components/drift/DataQuality.tsx
- [x] T123 [US5] Create useDriftDetection hook in olorin-front/src/microservices/analytics/hooks/useDriftDetection.ts
- [x] T124 [US5] Implement drift visualization in PSIChart component
- [x] T125 [US5] Implement data quality metrics display in DataQuality component

**Checkpoint**: At this point, User Stories 1-5 should all work independently

---

## Phase 8: User Story 6 - Replay & Backtest Studio (Priority: P3)

**Goal**: Replay historical fraud decisions with rule/model/threshold overrides and compare results to production

**Independent Test**: Select a historical period, configure rule/model overrides, run replay, and verify results are correctly calculated and differences from production are accurately reported

### Implementation for User Story 6

- [x] T126 [US6] Create replay engine service in olorin-server/app/service/analytics/replay_engine.py
- [x] T127 [US6] Create replay_scenarios table migration in olorin-server/app/persistence/migrations/
- [x] T128 [US6] Implement GET /replay/scenarios endpoint in olorin-server/app/api/routes/analytics.py
- [x] T129 [US6] Implement POST /replay/scenarios endpoint in olorin-server/app/api/routes/analytics.py
- [x] T130 [US6] Implement GET /replay/scenarios/{scenarioId} endpoint in olorin-server/app/api/routes/analytics.py
- [x] T131 [US6] Implement POST /replay/scenarios/{scenarioId}/run endpoint in olorin-server/app/api/routes/analytics.py
- [x] T132 [US6] Implement GET /replay/scenarios/{scenarioId}/results endpoint in olorin-server/app/api/routes/analytics.py
- [x] T133 [US6] Implement deterministic re-evaluation logic in replay_engine.py
- [x] T134 [US6] Implement replay results storage in separate fact table in replay_engine.py
- [x] T135 [US6] Implement diff comparison logic (replay vs production) in replay_engine.py
- [x] T136 [US6] Implement impact metrics calculation for replay scenarios in replay_engine.py
- [x] T137 [US6] Create ReplayStudio component in olorin-front/src/microservices/analytics/components/replay/ReplayStudio.tsx
- [x] T138 [P] [US6] Create ReplayConfig component in olorin-front/src/microservices/analytics/components/replay/ReplayConfig.tsx
- [x] T139 [P] [US6] Create ReplayResults component in olorin-front/src/microservices/analytics/components/replay/ReplayResults.tsx
- [x] T140 [P] [US6] Create DiffReport component in olorin-front/src/microservices/analytics/components/replay/DiffReport.tsx
- [x] T141 [US6] Implement replay configuration form in ReplayConfig component
- [x] T142 [US6] Implement replay results comparison view in ReplayResults component
- [x] T143 [US6] Implement diff visualization in DiffReport component

**Checkpoint**: At this point, User Stories 1-6 should all work independently

---

## Phase 9: User Story 7 - Explainers & Feature Attribution (Priority: P3)

**Goal**: Provide feature attributions (SHAP/rule traces), top drivers per cohort, and confusion matrices over time

**Independent Test**: Select a fraud decision, view its explanation, and verify feature attributions are displayed correctly, top drivers are identified, and confusion matrices show accurate classifications

### Implementation for User Story 7

- [x] T144 [US7] Create explainer service in olorin-server/app/service/analytics/explainer.py
- [x] T145 [US7] Implement GET /explain/{decisionId} endpoint in olorin-server/app/api/routes/analytics.py
- [x] T146 [US7] Implement GET /explain/cohort/{cohortId}/top-drivers endpoint in olorin-server/app/api/routes/analytics.py
- [x] T147 [US7] Implement GET /explain/confusion-matrix endpoint in olorin-server/app/api/routes/analytics.py
- [x] T148 [US7] Implement SHAP value calculation logic in explainer.py
- [x] T149 [US7] Implement rule trace extraction logic in explainer.py
- [x] T150 [US7] Implement top drivers aggregation per cohort in explainer.py
- [x] T151 [US7] Implement confusion matrix calculation over time in explainer.py
- [x] T152 [US7] Create FeatureAttribution component in olorin-front/src/microservices/analytics/components/explainers/FeatureAttribution.tsx
- [x] T153 [P] [US7] Create TopDrivers component in olorin-front/src/microservices/analytics/components/explainers/TopDrivers.tsx
- [x] T154 [P] [US7] Create ConfusionMatrix component in olorin-front/src/microservices/analytics/components/explainers/ConfusionMatrix.tsx
- [x] T155 [P] [US7] Create ExplanationExport component in olorin-front/src/microservices/analytics/components/explainers/ExplanationExport.tsx
- [x] T156 [US7] Implement feature attribution visualization in FeatureAttribution component
- [x] T157 [US7] Implement top drivers display in TopDrivers component
- [x] T158 [US7] Implement confusion matrix visualization in ConfusionMatrix component
- [x] T159 [US7] Implement explanation export functionality in ExplanationExport component

**Checkpoint**: At this point, User Stories 1-7 should all work independently

---

## Phase 10: User Story 8 - Observability & Quality Metrics (Priority: P2)

**Goal**: Monitor pipeline health, freshness, completeness, audit logs, and correlate metric regressions with deployments

**Independent Test**: Verify freshness metrics update correctly, completeness calculations are accurate, pipeline health is monitored, and alerts trigger when SLOs are violated

### Implementation for User Story 8

- [x] T160 [US8] Create pipeline monitor service in olorin-server/app/service/analytics/pipeline_monitor.py
- [x] T161 [US8] Create pipeline_health table migration in olorin-server/app/persistence/migrations/
- [x] T162 [US8] Create audit_logs table migration in olorin-server/app/persistence/migrations/
- [x] T163 [US8] Implement GET /pipeline/health endpoint in olorin-server/app/api/routes/analytics.py
- [x] T164 [US8] Implement GET /audit/logs endpoint in olorin-server/app/api/routes/analytics.py
- [x] T165 [US8] Implement pipeline freshness tracking in pipeline_monitor.py
- [x] T166 [US8] Implement data completeness tracking in pipeline_monitor.py
- [x] T167 [US8] Implement pipeline success rate monitoring in pipeline_monitor.py
- [x] T168 [US8] Implement audit log writing for all queries/exports in pipeline_monitor.py
- [x] T169 [US8] Implement changefeed integration for deployment correlation in pipeline_monitor.py
- [x] T170 [US8] Implement SLO violation alerting in pipeline_monitor.py
- [x] T171 [US8] Create PipelineHealth component in olorin-front/src/microservices/analytics/components/observability/PipelineHealth.tsx
- [x] T172 [P] [US8] Create FreshnessMonitor component in olorin-front/src/microservices/analytics/components/observability/FreshnessMonitor.tsx
- [x] T173 [P] [US8] Create CompletenessMonitor component in olorin-front/src/microservices/analytics/components/observability/CompletenessMonitor.tsx
- [x] T174 [P] [US8] Create AuditLog component in olorin-front/src/microservices/analytics/components/observability/AuditLog.tsx
- [x] T175 [US8] Implement pipeline health visualization in PipelineHealth component
- [x] T176 [US8] Implement freshness metrics display in FreshnessMonitor component
- [x] T177 [US8] Implement completeness metrics display in CompletenessMonitor component
- [x] T178 [US8] Implement audit log viewer in AuditLog component

**Checkpoint**: At this point, User Stories 1-8 should all work independently

---

## Phase 11: User Story 9 - Deep Linking & Integration (Priority: P2)

**Goal**: Navigate seamlessly between investigations, visualizations, and analytics with pre-filtered cohorts

**Independent Test**: Navigate from an investigation to `/analytics?id=investigation-123` and verify analytics are pre-filtered to show only data for that investigation, and navigation links work correctly

### Implementation for User Story 9

- [x] T179 [US9] Implement deep link parsing (query parameter ?id=) in AnalyticsApp.tsx
- [x] T180 [US9] Implement investigation ID pre-filtering in useFilters hook
- [x] T181 [US9] Add navigation link from investigations microservice to analytics in olorin-front/src/microservices/investigation/components/
- [x] T182 [US9] Add navigation link from visualization microservice to analytics in olorin-front/src/microservices/visualization/components/
- [x] T183 [US9] Implement "View Analytics" button in investigation detail view
- [x] T184 [US9] Implement "View Analytics" link in visualization components
- [x] T185 [US9] Add navigation back to investigation from analytics dashboard
- [x] T186 [US9] Add navigation back to visualization from analytics dashboard
- [x] T187 [US9] Implement cohort filter deep linking in analytics dashboard
- [x] T188 [US9] Emit analytics:navigate event on deep link navigation
- [x] T189 [US9] Handle analytics:filter-changed event for cross-service communication

**Checkpoint**: At this point, all user stories should work independently with full integration

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T190 [P] Add comprehensive error handling across all components
- [x] T191 [P] Implement loading states for all async operations
- [x] T192 [P] Add empty states for all data views
- [x] T193 [P] Implement responsive design for mobile/tablet breakpoints
- [x] T194 [P] Add accessibility attributes (ARIA labels, keyboard navigation) across all components
- [x] T195 [P] Optimize bundle size with code splitting and lazy loading
- [x] T196 [P] Implement caching strategy for metrics data (Redis or in-memory)
- [x] T197 [P] Add performance monitoring and metrics tracking
- [x] T198 [P] Create comprehensive documentation in olorin-front/src/microservices/analytics/README.md
- [x] T199 [P] Add JSDoc comments to all TypeScript functions
- [x] T200 [P] Add docstrings to all Python functions
- [x] T201 [P] Run quickstart.md validation and update if needed
- [x] T202 [P] Verify all files comply with 200-line limit (refactor if needed)
- [x] T203 [P] Verify no hardcoded values (all config from environment)
- [x] T204 [P] Verify no mock data in production code
- [x] T205 [P] Run full integration test suite
- [x] T206 [P] Perform end-to-end testing of complete user journeys

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-11)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 12)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - May use US1 dashboard but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Uses US2 metrics but independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Independently testable
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Independently testable
- **User Story 6 (P3)**: Can start after Foundational (Phase 2) - Independently testable
- **User Story 7 (P3)**: Can start after Foundational (Phase 2) - Uses US3 cohorts but independently testable
- **User Story 8 (P2)**: Can start after Foundational (Phase 2) - Independently testable
- **User Story 9 (P2)**: Can start after Foundational (Phase 2) - Requires US1 dashboard but independently testable

### Within Each User Story

- Models before services
- Services before endpoints
- Backend endpoints before frontend components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Models within a story marked [P] can run in parallel
- Components within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all components for User Story 1 together:
Task: "Create KPITiles component in olorin-front/src/microservices/analytics/components/dashboard/KPITiles.tsx"
Task: "Create TrendGraphs component in olorin-front/src/microservices/analytics/components/dashboard/TrendGraphs.tsx"
Task: "Create Filters component in olorin-front/src/microservices/analytics/components/dashboard/Filters.tsx"
```

---

## Parallel Example: User Story 2

```bash
# Launch all calculator services together:
Task: "Create precision/recall calculator in olorin-server/app/service/analytics/precision_recall.py"
Task: "Create latency calculator in olorin-server/app/service/analytics/latency_calculator.py"
Task: "Create throughput calculator in olorin-server/app/service/analytics/throughput_calculator.py"
```

---

## Implementation Strategy

### MVP First (User Stories 1-2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Dashboard)
4. Complete Phase 4: User Story 2 (Metrics Pipeline)
5. **STOP and VALIDATE**: Test User Stories 1-2 independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Stories 3-5 (P2) → Test independently → Deploy/Demo
5. Add User Stories 6-7 (P3) → Test independently → Deploy/Demo
6. Add User Stories 8-9 (P2) → Test independently → Deploy/Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Dashboard)
   - Developer B: User Story 2 (Metrics Pipeline)
   - Developer C: User Story 3 (Cohort Analysis)
3. Next iteration:
   - Developer A: User Story 4 (Experiments)
   - Developer B: User Story 5 (Drift Detection)
   - Developer C: User Story 8 (Observability)
4. Final iteration:
   - Developer A: User Story 6 (Replay)
   - Developer B: User Story 7 (Explainability)
   - Developer C: User Story 9 (Deep Linking)
5. Stories complete and integrate independently

---

## Task Summary

- **Total Tasks**: 206
- **Phase 1 (Setup)**: 10 tasks
- **Phase 2 (Foundational)**: 19 tasks
- **Phase 3 (US1 - Dashboard)**: 18 tasks
- **Phase 4 (US2 - Metrics)**: 23 tasks
- **Phase 5 (US3 - Cohorts)**: 18 tasks
- **Phase 6 (US4 - Experiments)**: 20 tasks
- **Phase 7 (US5 - Drift)**: 17 tasks
- **Phase 8 (US6 - Replay)**: 18 tasks
- **Phase 9 (US7 - Explainability)**: 16 tasks
- **Phase 10 (US8 - Observability)**: 19 tasks
- **Phase 11 (US9 - Deep Linking)**: 11 tasks
- **Phase 12 (Polish)**: 17 tasks

### Parallel Opportunities Identified

- **Phase 1**: 7 parallel tasks
- **Phase 2**: 12 parallel tasks
- **Phase 3**: 3 parallel component tasks
- **Phase 4**: 3 parallel calculator tasks, 3 parallel component tasks
- **Phase 5**: 2 parallel component tasks
- **Phase 6**: 3 parallel component tasks
- **Phase 7**: 2 parallel component tasks
- **Phase 8**: 3 parallel component tasks
- **Phase 9**: 3 parallel component tasks
- **Phase 10**: 3 parallel component tasks
- **Phase 12**: All 17 tasks can run in parallel

### Independent Test Criteria

- **US1**: Navigate to `/analytics`, verify KPIs display, filters work, export generates files
- **US2**: Verify all metrics calculated correctly, displayed with formatting, update in real-time
- **US3**: Select segmentation dimensions, verify metrics per segment, thresholds enforced
- **US4**: Create experiment, assign traffic, verify variant metrics, guardrail alerts trigger
- **US5**: Introduce data drift, verify PSI/KL detect drift, alerts trigger, quality issues identified
- **US6**: Select historical period, configure overrides, run replay, verify diff comparison
- **US7**: Select fraud decision, view explanation, verify attributions, top drivers, confusion matrix
- **US8**: Verify freshness updates, completeness accurate, pipeline health monitored, SLO alerts trigger
- **US9**: Navigate from investigation to `/analytics?id=...`, verify pre-filtering, navigation links work

### Suggested MVP Scope

**Minimum Viable Product**: User Stories 1-2 (Dashboard + Metrics Pipeline)
- Provides core analytics functionality
- Enables fraud detection performance monitoring
- Delivers immediate value to users
- Can be extended incrementally with remaining stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All files must comply with 200-line limit (SYSTEM MANDATE)
- No hardcoded values - all configuration from environment variables (SYSTEM MANDATE)
- No mock data in production code (SYSTEM MANDATE)
- Tailwind CSS only - no Material-UI (SYSTEM MANDATE)

