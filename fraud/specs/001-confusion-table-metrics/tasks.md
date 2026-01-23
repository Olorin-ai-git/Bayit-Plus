# Tasks: Confusion Table Metrics

**Input**: Design documents from `/specs/001-confusion-table-metrics/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL per spec - not explicitly requested, so test tasks are not included. Focus on implementation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Backend: `olorin-server/app/`
- Tests: `olorin-server/tests/`
- All paths relative to repository root

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Core data models and infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 [P] Create ConfusionMatrix data model in `olorin-server/app/router/models/investigation_comparison_models.py` (includes TP, FP, TN, FN, precision, recall, F1, accuracy, metadata)
- [x] T002 [P] Create AggregatedConfusionMatrix data model in `olorin-server/app/router/models/investigation_comparison_models.py` (aggregated metrics across entities)
- [x] T003 [P] Create FraudClassification data model in `olorin-server/app/router/models/investigation_comparison_models.py` (predicted_label, actual_outcome, confusion_category)
- [x] T004 [P] Create InvestigationQueryConfig helper class in `olorin-server/app/service/investigation/query_builder.py` (exclude_columns method for MODEL_SCORE/IS_FRAUD_TX)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 2: User Story 1 - Always Run Investigations on Top 3 Riskiest Entities (Priority: P1) 🎯 MVP

**Goal**: Modify startup analysis flow to unconditionally run investigations for top 3 riskiest entities, removing any conditional logic that might prevent execution.

**Independent Test**: Verify that when `AUTO_RUN_STARTUP_ANALYSIS=true`, the system always runs investigations for exactly the top 3 entities from the risk analyzer results, even if other conditions might previously have prevented execution.

### Implementation for User Story 1

- [x] T005 [US1] Remove conditional check in `olorin-server/app/service/__init__.py` (around line 518) - always execute `run_auto_comparisons_for_top_entities()` when risk analyzer returns entities
- [x] T006 [US1] Modify `run_auto_comparisons_for_top_entities()` in `olorin-server/app/service/investigation/auto_comparison.py` to remove early return conditions and always process top 3 entities (lines 1284-1376)
- [x] T007 [US1] Add logging in `olorin-server/app/service/investigation/auto_comparison.py` to confirm unconditional top 3 execution
- [x] T008 [US1] Handle edge case: if risk analyzer returns fewer than 3 entities, process all available entities (1 or 2) in `olorin-server/app/service/investigation/auto_comparison.py`
- [x] T009 [US1] Handle edge case: if risk analyzer returns 0 entities, log warning and skip investigation creation (no crash) in `olorin-server/app/service/investigation/auto_comparison.py`

**Checkpoint**: At this point, User Story 1 should be fully functional - top 3 investigations always run unconditionally

---

## Phase 3: User Story 2 - Exclude MODEL_SCORE and IS_FRAUD_TX from Investigation Queries (Priority: P1)

**Goal**: Ensure all SQL queries executed during investigation (data ingestion, domain analysis, etc.) completely exclude MODEL_SCORE and IS_FRAUD_TX columns to prevent contamination of investigation results.

**Independent Test**: Verify that all SQL queries executed during investigation do NOT include `MODEL_SCORE` or `IS_FRAUD_TX` in SELECT clauses, WHERE clauses, or any other query components. This can be verified by examining query logs.

### Implementation for User Story 2

- [x] T010 [US2] Add column exclusion logic to `build_transaction_query()` in `olorin-server/app/service/investigation/query_builder.py` to filter out MODEL_SCORE and IS_FRAUD_TX from SELECT clauses
- [x] T011 [US2] Update `exclude_columns_from_select()` helper in `olorin-server/app/service/agent/tools/snowflake_tool/query_builder.py` to handle MODEL_SCORE and IS_FRAUD_TX exclusion
- [x] T012 [US2] Modify Snowflake query builder in `olorin-server/app/service/agent/tools/snowflake_tool/snowflake_tool.py` to exclude MODEL_SCORE and IS_FRAUD_TX from EVIDENCE_FIELD_COLLECTIONS and PRIORITY_EVIDENCE_FIELDS during investigation
- [x] T013 [US2] Update domain agent queries in `olorin-server/app/service/agent/orchestration/domain_agents/base.py` to exclude MODEL_SCORE and IS_FRAUD_TX from transaction queries
- [x] T014 [US2] Add validation logging in `olorin-server/app/service/agent/tools/database_tool/snowflake_provider.py` to confirm excluded columns are not present in investigation queries
- [x] T015 [US2] Ensure case-insensitive column name handling for PostgreSQL vs Snowflake in all query builders (MODEL_SCORE vs model_score, IS_FRAUD_TX vs is_fraud_tx)

**Checkpoint**: At this point, User Story 2 should be fully functional - all investigation queries exclude MODEL_SCORE and IS_FRAUD_TX

---

## Phase 4: User Story 3 - Classify Transactions as Fraud/Not Fraud Based on Investigation Results (Priority: P1)

**Goal**: Classify APPROVED transactions (NSURE_LAST_DECISION = 'APPROVED') as "Fraud" or "Not Fraud" based on investigation risk_score compared to RISK_THRESHOLD_DEFAULT (default 0.3).

**Independent Test**: Verify that after an investigation completes, all APPROVED transactions in the investigation window are labeled as "Fraud" if `investigation_risk_score >= RISK_THRESHOLD_DEFAULT` (default 0.3), and "Not Fraud" otherwise. Verify filtering for `NSURE_LAST_DECISION = 'APPROVED'`.

### Implementation for User Story 3

- [x] T016 [US3] Add `classify_transaction_fraud()` function in `olorin-server/app/service/investigation/investigation_transaction_mapper.py` to classify based on risk_score vs threshold
- [x] T017 [US3] Extract risk score with fallback logic in `olorin-server/app/service/investigation/investigation_transaction_mapper.py` (priority: overall_risk_score → domain_findings.risk.risk_score → None → "Not Fraud")
- [x] T018 [US3] Modify `map_investigation_to_transactions()` in `olorin-server/app/service/investigation/investigation_transaction_mapper.py` to add `predicted_label` field ('Fraud' or 'Not Fraud') based on classification
- [x] T019 [US3] Add APPROVED transaction filter (NSURE_LAST_DECISION = 'APPROVED') to transaction queries in `olorin-server/app/service/investigation/investigation_transaction_mapper.py` using case-insensitive matching
- [x] T020 [US3] Read RISK_THRESHOLD_DEFAULT from environment variables (default 0.3) in `olorin-server/app/service/investigation/investigation_transaction_mapper.py`
- [x] T021 [US3] Handle edge case: if investigation_risk_score is None or 0.0, attempt extraction from domain_findings.risk.risk_score before defaulting to "Not Fraud" in `olorin-server/app/service/investigation/investigation_transaction_mapper.py`

**Checkpoint**: At this point, User Story 3 should be fully functional - transactions are classified as Fraud/Not Fraud based on investigation risk scores

---

## Phase 5: User Story 4 - Compare Investigation Predictions to IS_FRAUD_TX Ground Truth (Priority: P1)

**Goal**: Compare investigation predictions (Fraud/Not Fraud) to current IS_FRAUD_TX values for APPROVED transactions within the investigation window, calculating confusion matrix metrics (TP, FP, TN, FN).

**Independent Test**: Verify that for each APPROVED transaction in the investigation window, the system retrieves the current `IS_FRAUD_TX` value and compares it to the investigation's fraud prediction, correctly categorizing into TP/FP/TN/FN.

### Implementation for User Story 4

- [x] T022 [US4] Add function to query IS_FRAUD_TX values for transactions in `olorin-server/app/service/investigation/investigation_transaction_mapper.py` (separate query AFTER investigation completes)
- [x] T023 [US4] Map IS_FRAUD_TX values to `actual_outcome` field (1, 0, or None) in transaction records in `olorin-server/app/service/investigation/investigation_transaction_mapper.py`
- [x] T024 [US4] Implement `calculate_confusion_matrix()` function in `olorin-server/app/service/investigation/comparison_service.py` to calculate TP, FP, TN, FN from transactions with predicted_label and actual_outcome
- [x] T025 [US4] Add logic to exclude transactions with NULL IS_FRAUD_TX from confusion matrix calculations in `olorin-server/app/service/investigation/comparison_service.py` (count in excluded_count)
- [x] T026 [US4] Calculate derived metrics (precision, recall, F1_score, accuracy) in `calculate_confusion_matrix()` with divide-by-zero guards in `olorin-server/app/service/investigation/comparison_service.py`
- [x] T027 [US4] Create ConfusionMatrix object with all required fields (TP, FP, TN, FN, excluded_count, precision, recall, F1, accuracy, metadata) in `olorin-server/app/service/investigation/comparison_service.py`
- [x] T028 [US4] Ensure only APPROVED transactions (NSURE_LAST_DECISION = 'APPROVED') are included in confusion matrix calculation in `olorin-server/app/service/investigation/comparison_service.py`

**Checkpoint**: At this point, User Story 4 should be fully functional - confusion matrix metrics are calculated correctly per entity

---

## Phase 6: User Story 5 - Generate and Display Confusion Table in Reports (Priority: P2)

**Goal**: Calculate aggregated confusion matrix metrics across all 3 investigated entities and display confusion table (TP, FP, TN, FN, precision, recall, F1, accuracy) in startup analysis report HTML.

**Independent Test**: Verify that the startup analysis report HTML includes a confusion table section showing TP, FP, TN, FN counts and derived metrics (precision, recall, F1, accuracy) for aggregated results across top 3 entities.

### Implementation for User Story 5

- [x] T029 [US5] Implement `aggregate_confusion_matrices()` function in `olorin-server/app/service/investigation/comparison_service.py` to aggregate ConfusionMatrix objects across multiple entities
- [x] T030 [US5] Create AggregatedConfusionMatrix object with total_TP, total_FP, total_TN, total_FN, aggregated metrics, and per-entity breakdown in `olorin-server/app/service/investigation/comparison_service.py`
- [x] T031 [US5] Integrate confusion matrix calculation into startup analysis flow in `olorin-server/app/service/__init__.py` - call after investigations complete
- [x] T032 [US5] Add `_generate_confusion_table_section()` function in `olorin-server/app/service/reporting/startup_report_generator.py` to generate HTML for confusion table section
- [x] T033 [US5] Include aggregated metrics table (TP, FP, TN, FN, precision, recall, F1, accuracy) in confusion table HTML in `olorin-server/app/service/reporting/startup_report_generator.py`
- [x] T034 [US5] Add per-entity breakdown section (collapsible/details element) in confusion table HTML in `olorin-server/app/service/reporting/startup_report_generator.py`
- [x] T035 [US5] Match existing report styling (Olorin branding) for confusion table section in `olorin-server/app/service/reporting/startup_report_generator.py`
- [x] T036 [US5] Handle edge case: display "No data available" if no transactions match criteria in confusion table HTML in `olorin-server/app/service/reporting/startup_report_generator.py`
- [x] T037 [US5] Handle edge case: show zeros with explanatory note if investigation window has zero transactions in confusion table HTML in `olorin-server/app/service/reporting/startup_report_generator.py`
- [x] T038 [US5] Handle edge case: log warning and exclude failed investigations from confusion matrix, but continue processing remaining entities in `olorin-server/app/service/investigation/comparison_service.py`

**Checkpoint**: At this point, User Story 5 should be fully functional - confusion table is displayed in startup analysis report

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, edge case handling, and validation

- [x] T039 [P] Add comprehensive logging for confusion matrix calculation flow in `olorin-server/app/service/investigation/comparison_service.py`
- [x] T040 [P] Add validation for confusion matrix metrics (sum check: TP+FP+TN+FN+excluded = total_transactions) in `olorin-server/app/service/investigation/comparison_service.py`
- [x] T041 [P] Ensure timezone normalization (UTC) for all timestamp comparisons in `olorin-server/app/service/investigation/investigation_transaction_mapper.py`
- [x] T042 [P] Add performance monitoring for confusion matrix calculation (target: <5 seconds after investigations complete) in `olorin-server/app/service/investigation/comparison_service.py`
- [x] T043 [P] Handle edge case: if multiple investigations exist for same entity, use most recent completed investigation in `olorin-server/app/service/investigation/comparison_service.py`
- [x] T044 [P] Verify all query logs confirm MODEL_SCORE and IS_FRAUD_TX exclusion during investigation execution
- [x] T045 [P] Run quickstart.md validation to verify end-to-end flow works correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies - can start immediately
- **User Stories (Phase 2-6)**: All depend on Foundational phase completion
  - User stories can proceed sequentially in priority order (US1 → US2 → US3 → US4 → US5)
  - US1, US2, US3, US4 can potentially run in parallel after foundational (different files)
  - US5 depends on US4 completion (needs confusion matrix calculation)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 1) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 1) - Independent of other stories
- **User Story 3 (P1)**: Can start after Foundational (Phase 1) - Independent of other stories, but benefits from US2 (query exclusion)
- **User Story 4 (P1)**: Can start after Foundational (Phase 1) - Depends on US3 (needs transaction classification)
- **User Story 5 (P2)**: Depends on US4 completion (needs confusion matrix calculation)

### Within Each User Story

- Core implementation before integration
- Query builders before transaction mapping
- Transaction mapping before confusion matrix calculation
- Confusion matrix calculation before aggregation
- Aggregation before report display
- Story complete before moving to next priority

### Parallel Opportunities

- All Foundational tasks (T001-T004) marked [P] can run in parallel
- US1, US2, US3 can potentially run in parallel after foundational (different files, minimal dependencies)
- US4 depends on US3 (needs classification)
- US5 depends on US4 (needs confusion matrix)
- Polish tasks marked [P] can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all foundational models together:
Task: "Create ConfusionMatrix data model in olorin-server/app/router/models/investigation_comparison_models.py"
Task: "Create AggregatedConfusionMatrix data model in olorin-server/app/router/models/investigation_comparison_models.py"
Task: "Create FraudClassification data model in olorin-server/app/router/models/investigation_comparison_models.py"
Task: "Create InvestigationQueryConfig helper class in olorin-server/app/service/investigation/query_builder.py"
```

---

## Parallel Example: User Stories 1-3

```bash
# After foundational phase, these can run in parallel:
Task: "Remove conditional check in olorin-server/app/service/__init__.py" (US1)
Task: "Add column exclusion logic to build_transaction_query()" (US2)
Task: "Add classify_transaction_fraud() function" (US3)
```

---

## Implementation Strategy

### MVP First (User Stories 1-4 Only)

1. Complete Phase 1: Foundational (data models)
2. Complete Phase 2: User Story 1 (unconditional top 3)
3. Complete Phase 3: User Story 2 (query exclusion)
4. Complete Phase 4: User Story 3 (fraud classification)
5. Complete Phase 5: User Story 4 (confusion matrix calculation)
6. **STOP and VALIDATE**: Test confusion matrix calculation independently
7. Deploy/demo if ready (confusion matrix available programmatically)

### Incremental Delivery

1. Complete Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (top 3 always run)
3. Add User Story 2 → Test independently → Deploy/Demo (queries exclude columns)
4. Add User Story 3 → Test independently → Deploy/Demo (transactions classified)
5. Add User Story 4 → Test independently → Deploy/Demo (confusion matrix calculated)
6. Add User Story 5 → Test independently → Deploy/Demo (confusion table displayed)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Foundational together (T001-T004)
2. Once Foundational is done:
   - Developer A: User Story 1 (unconditional top 3)
   - Developer B: User Story 2 (query exclusion)
   - Developer C: User Story 3 (fraud classification)
3. After US1-US3 complete:
   - Developer A: User Story 4 (confusion matrix calculation)
   - Developer B: User Story 5 (report display)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- CRITICAL: MODEL_SCORE and IS_FRAUD_TX must NOT appear in investigation queries (only used AFTER for comparison)
- Only APPROVED transactions (NSURE_LAST_DECISION = 'APPROVED') are included in confusion matrix
- Use current IS_FRAUD_TX values (not temporal/historical queries)
- Guard divide-by-zero in all metric calculations
- Handle NULL IS_FRAUD_TX by excluding from calculations

---

## Summary

- **Total Tasks**: 45 tasks
- **Foundational Tasks**: 4 tasks (T001-T004)
- **User Story 1 Tasks**: 5 tasks (T005-T009)
- **User Story 2 Tasks**: 6 tasks (T010-T015)
- **User Story 3 Tasks**: 6 tasks (T016-T021)
- **User Story 4 Tasks**: 7 tasks (T022-T028)
- **User Story 5 Tasks**: 10 tasks (T029-T038)
- **Polish Tasks**: 7 tasks (T039-T045)

- **Parallel Opportunities**: Foundational phase (4 tasks), User Stories 1-3 can run in parallel after foundational, Polish tasks
- **Independent Test Criteria**: Each user story has clear independent test criteria from spec.md
- **Suggested MVP Scope**: User Stories 1-4 (confusion matrix calculation without display) - 24 tasks
- **Format Validation**: ✅ ALL tasks follow checklist format (checkbox, ID, labels, file paths)

