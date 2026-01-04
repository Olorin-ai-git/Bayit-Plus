# Tasks: Revenue Implication Tracking

**Input**: Design documents from `/specs/024-revenue-implication-tracking/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and configuration

- [ ] T001 [P] Create `olorin-server/app/config/revenue_config.py` with environment variable loading for all revenue parameters
- [ ] T002 [P] Create `olorin-server/app/schemas/revenue_implication.py` with Pydantic schemas for revenue data
- [ ] T003 Add revenue configuration validation to startup checks

**Checkpoint**: Configuration infrastructure ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core revenue calculation infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create `olorin-server/app/service/investigation/revenue_calculator.py` with base class structure
- [ ] T005 [P] Implement `calculate_saved_fraud_gmv()` method - query Snowflake for approved fraud transactions
- [ ] T006 [P] Implement `calculate_lost_revenues()` method - query Snowflake for blocked legitimate transactions
- [ ] T007 Implement `calculate_net_value()` method - combine Saved GMV and Lost Revenues
- [ ] T008 Implement `determine_confidence_level()` based on transaction volume thresholds
- [ ] T009 Add error handling for missing/incomplete transaction data

**Checkpoint**: Revenue calculator service ready - user story implementation can begin

---

## Phase 3: User Story 1 - Revenue Impact Dashboard View (Priority: P1) 🎯 MVP

**Goal**: Display Saved Fraud GMV, Lost Revenues, and Net Value for each completed investigation

**Independent Test**: Run historical analysis on known entity, verify revenue metrics appear in results

### Implementation for User Story 1

- [ ] T010 [US1] Modify `olorin-server/app/service/investigation/auto_comparison.py` to call revenue calculator after investigation completion
- [ ] T011 [US1] Create `RevenueImplication` dataclass in revenue_calculator.py to hold calculation results
- [ ] T012 [US1] Add `revenue_data` field to investigation progress JSON schema
- [ ] T013 [US1] Update `process_single_comparison()` in auto_comparison.py to include revenue data in results
- [ ] T014 [US1] Modify `ComparisonExecutor.create_and_wait_for_investigation()` to trigger revenue calculation on completion
- [ ] T015 [US1] Add revenue metrics to investigation result dictionary returned by executor

**Checkpoint**: User Story 1 complete - individual investigations show revenue metrics

---

## Phase 4: User Story 2 - Historical Time Window Analysis (Priority: P1)

**Goal**: Run startup analysis on 12+ month historical data with correct time windows

**Independent Test**: Trigger startup analysis, verify it targets correct historical windows

### Implementation for User Story 2

- [ ] T016 [US2] Modify `auto_comparison.py` time window calculation to use `ANALYZER_HISTORICAL_OFFSET_MONTHS` (default 12)
- [ ] T017 [US2] Update investigation window to use `INVESTIGATION_WINDOW_START_MONTHS` (18) and `INVESTIGATION_WINDOW_END_MONTHS` (12)
- [ ] T018 [US2] Add `SAVED_FRAUD_GMV_START_MONTHS` and `SAVED_FRAUD_GMV_END_MONTHS` to revenue calculator
- [ ] T019 [US2] Update logging to show which time windows are being used
- [ ] T020 [US2] Add validation that historical offset is at least 12 months

**Checkpoint**: User Story 2 complete - analysis uses correct historical windows

---

## Phase 5: User Story 3 - Aggregate Revenue Report (Priority: P2)

**Goal**: Show aggregated revenue metrics across all completed investigations

**Independent Test**: Run multiple investigations, verify aggregate report sums correctly

### Implementation for User Story 3

- [ ] T021 [US3] Modify `olorin-server/app/service/reporting/on_demand_startup_report_service.py` to aggregate revenue data
- [ ] T022 [US3] Add `aggregate_revenue_metrics()` function to sum Saved GMV, Lost Revenues, Net Value
- [ ] T023 [US3] Update `_generate_interim_report_html()` to include revenue metrics section
- [ ] T024 [US3] Add revenue totals to Executive Summary in report
- [ ] T025 [US3] Add per-merchant revenue breakdown to Detailed Analysis section

**Checkpoint**: User Story 3 complete - aggregate report includes revenue totals

---

## Phase 6: User Story 4 - Configurable Parameters (Priority: P3)

**Goal**: Allow configuration of take rate and lifetime multiplier

**Independent Test**: Change config values, verify calculations use new parameters

### Implementation for User Story 4

- [ ] T026 [US4] Add `REVENUE_TAKE_RATE_PERCENT` to revenue_config.py with default 0.75
- [ ] T027 [US4] Add `REVENUE_LIFETIME_MULTIPLIER` to revenue_config.py with default 1.0
- [ ] T028 [US4] Store `take_rate_used` and `multiplier_used` in RevenueImplication result
- [ ] T029 [US4] Add config reload support (changes take effect without restart)
- [ ] T030 [US4] Document all revenue configuration parameters in config example files

**Checkpoint**: User Story 4 complete - all parameters configurable

---

## Phase 7: Frontend Display (Future Enhancement)

**Purpose**: Display revenue metrics in UI (can be deferred)

- [ ] T031 [P] Create `olorin-front/src/microservices/investigation/components/RevenueMetrics.tsx`
- [ ] T032 Add revenue columns (Saved GMV, Lost Revenues, Net Value) to ParallelInvestigationsPage table
- [ ] T033 Add revenue totals to page header summary
- [ ] T034 Format currency values appropriately (commas, decimals)
- [ ] T035 Add tooltips explaining each metric

**Checkpoint**: Frontend displays revenue metrics

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T036 [P] Update `.env.example` with all new revenue configuration parameters
- [ ] T037 [P] Add logging for revenue calculations (INFO level for success, WARN for skipped entities)
- [ ] T038 Performance optimization - batch revenue queries where possible
- [ ] T039 Add revenue calculation timing metrics to logs
- [ ] T040 Validate edge cases (zero GMV, negative net value, missing data)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational, can parallel with US1
- **User Story 3 (Phase 5)**: Depends on US1 completion
- **User Story 4 (Phase 6)**: Depends on Foundational, can parallel with US1-3
- **Frontend (Phase 7)**: Depends on US1 completion
- **Polish (Phase 8)**: Depends on all desired user stories

### Parallel Opportunities

```
Phase 1 → T001, T002 can run in parallel
Phase 2 → T005, T006 can run in parallel (different query implementations)
Phase 3 + Phase 4 → US1 and US2 can run in parallel after Phase 2
Phase 6 → US4 can run in parallel with US1-3
Phase 7 → T031 can run in parallel with other frontend tasks
```

### Within Each User Story

- Models/schemas before services
- Services before integration
- Backend before frontend
- Core implementation before edge cases

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (revenue display)
4. Complete Phase 4: User Story 2 (historical windows)
5. **STOP and VALIDATE**: Test with real data
6. Deploy/demo MVP

### Full Feature

1. MVP above
2. Phase 5: User Story 3 (aggregate report)
3. Phase 6: User Story 4 (configurable parameters)
4. Phase 7: Frontend display
5. Phase 8: Polish

---

## Notes

- All revenue values should use Decimal type internally for precision
- Store take rate and multiplier used with each calculation for audit trail
- Skip entities with missing data rather than failing entire analysis
- Log confidence levels for each calculation
- Currency is assumed to be consistent (no conversion needed)







