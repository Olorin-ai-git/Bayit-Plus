# Tasks: Investigation Comparison Pipeline

**Input**: Design documents from `/specs/001-you-editing-fraud/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL per specification - not explicitly requested, so test tasks are not included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `olorin-server/app/`
- **Frontend**: `olorin-front/src/`
- **Tests**: `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create investigation service directory structure in olorin-server/app/service/investigation/
- [x] T002 [P] Create artifacts directory structure (ensure artifacts/ exists at olorin-server root)
- [x] T003 [P] Verify pytz dependency is available in olorin-server/pyproject.toml (add if missing)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create Pydantic models in olorin-server/app/router/models/investigation_comparison_models.py (WindowPreset, WindowSpec, ComparisonRequest, ComparisonOptions, WindowMetrics, HistogramBin, TimeseriesDaily, DeltaMetrics, ComparisonResponse, PerMerchantMetrics, WindowInfo)
- [x] T005 [P] Create window computation service in olorin-server/app/service/investigation/window_computation.py (compute_window, compute_windows_from_specs with America/New_York timezone)
- [x] T006 [P] Create entity filtering service in olorin-server/app/service/investigation/entity_filtering.py (normalize_entity_value: email LOWER, phone E164 via phonenumbers library or regex ^\+[1-9]\d{1,14}$, build_entity_where_clause with card_fingerprint parsing: extract BIN and last4 from "BIN|last4" or "BIN-last4" format, build_merchant_where_clause)
- [x] T007 [P] Create metrics calculation service in olorin-server/app/service/investigation/metrics_calculation.py (compute_confusion_matrix, compute_derived_metrics, compute_histogram, compute_timeseries with divide-by-zero guards)
- [x] T008 Create comparison orchestration service in olorin-server/app/service/investigation/comparison_service.py (orchestrates window computation, entity filtering, metrics calculation, delta computation)
- [x] T009 Create summary generator service in olorin-server/app/service/investigation/summary_generator.py (generate_investigation_summary producing 3-6 sentence prose)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Compare Default Time Windows for Entity (Priority: P1) 🎯 MVP

**Goal**: Compare recent fraud patterns against historical patterns for a specific entity using default preset windows (Recent 14d vs Retro 14d 6mo back). Returns metrics and deltas for both windows.

**Independent Test**: Call API with entity type and value, receive comparison metrics, verify frontend displays both windows side-by-side with deltas. Delivers immediate investigative value.

### Implementation for User Story 1

- [x] T010 [US1] Create API router endpoint POST /api/investigation/compare in olorin-server/app/router/investigation_comparison_router.py (accepts ComparisonRequest, returns ComparisonResponse)
- [x] T011 [US1] Register investigation_comparison_router in olorin-server/app/service/router/router_config.py
- [x] T012 [US1] Implement query execution in olorin-server/app/service/investigation/comparison_service.py (fetch transactions for both windows using database provider)
- [x] T013 [US1] Implement delta computation in olorin-server/app/service/investigation/comparison_service.py (B - A for precision, recall, f1, accuracy, fraud_rate)
- [x] T014 [US1] Create artifact persistence in olorin-server/app/service/investigation/comparison_service.py (save JSON to artifacts/investigation_{entityType}_{slug}_{winAstart}_{winBend}.json at olorin-server root, slug: lowercase, replace special chars with hyphens, max 50 chars)
- [x] T015 [US1] Create TypeScript types in olorin-front/src/microservices/investigation/types/comparison.ts (matching backend Pydantic models)
- [x] T016 [US1] Create API service client in olorin-front/src/microservices/investigation/services/comparisonService.ts (POST /api/investigation/compare)
- [x] T017 [US1] Create ComparisonPage component in olorin-front/src/microservices/investigation/pages/ComparisonPage.tsx (main page with state management)
- [x] T018 [US1] Create EntityPicker component in olorin-front/src/microservices/investigation/components/EntityPicker.tsx (typeahead for entity type + value)
- [x] T019 [US1] Create WindowPicker component in olorin-front/src/microservices/investigation/components/WindowPicker.tsx (preset selection: recent_14d, retro_14d_6mo_back)
- [x] T020 [US1] Create ThresholdControl component in olorin-front/src/microservices/investigation/components/ThresholdControl.tsx (slider + numeric input for risk threshold)
- [x] T021 [US1] Create KpiCards component in olorin-front/src/microservices/investigation/components/KpiCards.tsx (displays total_transactions, over_threshold, TP, FP, TN, FN - includes basic confusion matrix values)
- [x] T022 [US1] Create DeltaStrip component in olorin-front/src/microservices/investigation/components/DeltaStrip.tsx (badges for Δ precision, recall, f1, accuracy, fraud_rate with ▲/▼ and color semantics)
- [x] T023 [US1] Create SummaryBlock component in olorin-front/src/microservices/investigation/components/SummaryBlock.tsx (displays investigation_summary with copy button)
- [x] T024 [US1] Register /investigate/compare route in olorin-front/src/microservices/investigation/InvestigationApp.tsx
- [x] T024B [US1] Display pending_label_count in metrics section when present in recent window (show in KpiCards or separate metric card)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Can call API with default presets, receive metrics, and view results in frontend.

---

## Phase 4: User Story 2 - Custom Time Window Comparison (Priority: P2)

**Goal**: Compare custom time periods (user-specified start/end dates) to investigate specific fraud patterns or seasonal trends. Supports "Match durations" toggle.

**Independent Test**: Provide custom start/end dates for both windows via API, verify frontend allows custom date selection with "Match durations" toggle. Delivers flexibility for advanced investigations.

### Implementation for User Story 2

- [x] T025 [US2] Extend window computation service in olorin-server/app/service/investigation/window_computation.py (support CUSTOM preset with user-specified start/end)
- [x] T026 [US2] Extend WindowPicker component in olorin-front/src/microservices/investigation/components/WindowPicker.tsx (add custom date picker with start/end inputs)
- [x] T027 [US2] Implement "Match durations" toggle logic in olorin-front/src/microservices/investigation/components/WindowPicker.tsx (auto-adjust Window B duration when Window A changes)
- [x] T028 [US2] Add custom window validation in olorin-server/app/router/models/investigation_comparison_models.py (ensure start/end required for CUSTOM preset, end > start)
- [x] T029 [US2] Update comparison service in olorin-server/app/service/investigation/comparison_service.py (handle custom window labels in response)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Can use default presets or custom windows.

---

## Phase 5: User Story 3 - Merchant-Scoped Comparison (Priority: P2)

**Goal**: Compare fraud metrics across specific merchants or evaluate a single merchant's performance over time. Includes per-merchant breakdown.

**Independent Test**: Filter by merchant_ids in API request, verify per-merchant breakdown appears in results. Delivers merchant-specific insights.

### Implementation for User Story 3

- [x] T030 [US3] Extend entity filtering service in olorin-server/app/service/investigation/entity_filtering.py (support merchant_ids list filtering)
- [x] T031 [US3] Implement per-merchant metrics computation in olorin-server/app/service/investigation/comparison_service.py (compute metrics per merchant, cap at max_merchants, sort by volume)
- [x] T032 [US3] Create MerchantFilter component in olorin-front/src/microservices/investigation/components/MerchantFilter.tsx (multi-select with virtualization)
- [x] T033 [US3] Create PerMerchantTable component in olorin-front/src/microservices/investigation/components/PerMerchantTable.tsx (sortable table with A, B, Δ columns, sticky header)
- [x] T034 [US3] Integrate MerchantFilter and PerMerchantTable in olorin-front/src/microservices/investigation/pages/ComparisonPage.tsx
- [x] T035 [US3] Handle merchant-only queries (no entity) in olorin-server/app/service/investigation/comparison_service.py (global metrics for specified merchants)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently. Can filter by entity, merchants, or both.

---

## Phase 6: User Story 4 - Visualize Risk Distribution and Trends (Priority: P2)

**Goal**: Understand how predicted risk scores are distributed and how fraud patterns change over time within each window. Includes histograms and timeseries charts.

**Independent Test**: Request include_histograms and include_timeseries options, verify charts render correctly. Delivers visual insights for pattern recognition.

### Implementation for User Story 4

- [x] T036 [US4] Extend metrics calculation service in olorin-server/app/service/investigation/metrics_calculation.py (implement compute_histogram with 10 bins when include_histograms=true)
- [x] T037 [US4] Extend metrics calculation service in olorin-server/app/service/investigation/metrics_calculation.py (implement compute_timeseries_daily with 14-day aggregates when include_timeseries=true)
- [x] T038 [US4] Create RiskHistogram component in olorin-front/src/microservices/investigation/components/RiskHistogram.tsx (Recharts BarChart displaying 10-bin histogram)
- [x] T039 [US4] Create DailyTimeseries component in olorin-front/src/microservices/investigation/components/DailyTimeseries.tsx (Recharts LineChart displaying daily counts and confusion matrix values)
- [x] T040 [US4] Create ConfusionMatrixTile component in olorin-front/src/microservices/investigation/components/ConfusionMatrixTile.tsx (2×2 grid visualization of TP/FP/TN/FN)
- [x] T041 [US4] Integrate charts in olorin-front/src/microservices/investigation/pages/ComparisonPage.tsx (display in each window panel, conditionally render based on options)
- [x] T042 [US4] Add options toggle controls in olorin-front/src/microservices/investigation/pages/ComparisonPage.tsx (include_histograms, include_timeseries checkboxes)
- [x] T043 [US4] Implement PSI and KS statistics computation in olorin-server/app/service/investigation/metrics_calculation.py (distribution drift detection, display in delta section)

**Checkpoint**: At this point, User Stories 1-4 should all work independently. Can visualize risk distribution and trends with histograms and timeseries.

---

## Phase 7: User Story 5 - Export and Share Investigation Results (Priority: P3)

**Goal**: Export comparison results for reporting, share findings with stakeholders, or create tickets for follow-up actions. Includes JSON/CSV export and external links.

**Independent Test**: Click export buttons, verify JSON/CSV downloads, copy summary functionality, and external link generation. Delivers collaboration and documentation value.

### Implementation for User Story 5

- [x] T044 [US5] Implement JSON export in olorin-front/src/microservices/investigation/pages/ComparisonPage.tsx (download JSON file matching API response format)
- [x] T045 [US5] Implement CSV export in olorin-front/src/microservices/investigation/pages/ComparisonPage.tsx (tabular data: metrics, per-merchant breakdown)
- [x] T046 [US5] Implement copy summary functionality in olorin-front/src/microservices/investigation/components/SummaryBlock.tsx (copy investigation_summary to clipboard)
- [x] T047 [US5] Add external link buttons in olorin-front/src/microservices/investigation/pages/ComparisonPage.tsx (Open in Splunk case, Create Jira ticket - URLs configurable via env)
- [x] T048 [US5] Create PageToolbar component in olorin-front/src/microservices/investigation/components/PageToolbar.tsx (export buttons, external links, actions)

**Checkpoint**: At this point, all user stories should be complete. Can export results and share findings.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T049 [P] Add pending_label_count banner display in olorin-front/src/microservices/investigation/pages/ComparisonPage.tsx (optional banner enhancement - core display handled in T024B)
- [x] T050 [P] Implement PII masking in olorin-front/src/microservices/investigation/components/EntityPicker.tsx (mask entity value unless user has privileged role: "admin" or "investigator" checked via auth service/JWT claims)
- [x] T051 [P] Add empty state handling in olorin-front/src/microservices/investigation/pages/ComparisonPage.tsx (display "No data" message when zero transactions)
- [x] T052 [P] Add error handling and loading states in olorin-front/src/microservices/investigation/pages/ComparisonPage.tsx (skeleton loaders, error messages)
- [x] T053 [P] Add accessibility features in olorin-front/src/microservices/investigation/components/DeltaStrip.tsx (aria-labels for deltas, keyboard navigation)
- [x] T054 [P] Add "Show table data" toggle for charts in olorin-front/src/microservices/investigation/components/RiskHistogram.tsx and DailyTimeseries.tsx
- [x] T055 Create CLI entry point in olorin-server/app/cli/evaluate_investigation.py (command: python -m app.cli.evaluate_investigation, accepts same parameters as API via argparse, calls comparison service, persists artifact)
- [x] T056 Add comprehensive error handling in olorin-server/app/router/investigation_comparison_router.py (400, 422, 500 responses with ErrorResponse model)
- [x] T057 Add logging throughout olorin-server/app/service/investigation/comparison_service.py (window computation, query execution, metrics calculation)
- [x] T058 Run quickstart.md validation (test all example requests from quickstart.md - validation script created at specs/001-you-editing-fraud/validate_quickstart.py)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 components but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Extends comparison service but independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Extends metrics calculation but independently testable
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Uses comparison results but independently testable

### Within Each User Story

- Models before services
- Services before endpoints/UI
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members
- Polish phase tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all backend models/services together:
Task: "Create API router endpoint POST /api/investigation/compare in olorin-server/app/router/investigation_comparison_router.py"
Task: "Implement query execution in olorin-server/app/service/investigation/comparison_service.py"
Task: "Implement delta computation in olorin-server/app/service/investigation/comparison_service.py"

# Launch all frontend components together:
Task: "Create EntityPicker component in olorin-front/src/microservices/investigation/components/EntityPicker.tsx"
Task: "Create WindowPicker component in olorin-front/src/microservices/investigation/components/WindowPicker.tsx"
Task: "Create ThresholdControl component in olorin-front/src/microservices/investigation/components/ThresholdControl.tsx"
Task: "Create KpiCards component in olorin-front/src/microservices/investigation/components/KpiCards.tsx"
Task: "Create DeltaStrip component in olorin-front/src/microservices/investigation/components/DeltaStrip.tsx"
Task: "Create SummaryBlock component in olorin-front/src/microservices/investigation/components/SummaryBlock.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Deploy/Demo
7. Add Polish phase → Final validation
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (MVP)
   - Developer B: User Story 2
   - Developer C: User Story 3
   - Developer D: User Story 4
   - Developer E: User Story 5
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All files must be <200 lines (split services if needed)
- No mocks/stubs/TODOs in production code
- Guard divide-by-zero; never crash on empty sets
- All configuration from environment variables (risk threshold: RISK_THRESHOLD_DEFAULT env var)
- Performance success criteria (SC-001, SC-002) are acceptance criteria, not implementation tasks - validate during testing

---

## Task Summary

- **Total Tasks**: 59 (added T024B for pending_label_count display in US1)
- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 6 tasks
- **Phase 3 (US1 - MVP)**: 16 tasks (includes T024B)
- **Phase 4 (US2)**: 5 tasks
- **Phase 5 (US3)**: 6 tasks
- **Phase 6 (US4)**: 8 tasks
- **Phase 7 (US5)**: 5 tasks
- **Phase 8 (Polish)**: 10 tasks

**MVP Scope**: Phases 1-3 (25 tasks total) deliver User Story 1 independently testable.

