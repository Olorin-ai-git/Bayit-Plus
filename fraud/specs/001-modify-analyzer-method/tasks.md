# Tasks: Analyzer Time Window and Investigation Range Modifications

**Input**: Design documents from `/specs/001-modify-analyzer-method/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Project Type**: Backend-only (Python/FastAPI) - olorin-server

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, configuration, and dependencies

- [X] **T001** Update .env configuration with new parameters in `/Users/olorin/Documents/olorin/olorin-server/env`
  - Add `ANALYZER_TIME_WINDOW_HOURS=24`
  - Add `ANALYZER_END_OFFSET_MONTHS=6`
  - Add `ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS=true`
  - Add `INVESTIGATION_DEFAULT_RANGE_YEARS=2`
  - Add `INVESTIGATION_START_OFFSET_YEARS=2.5`
  - Add `INVESTIGATION_END_OFFSET_MONTHS=6`
  - Add `PII_HASHING_ENABLED=true`
  - Add `PII_HASH_SALT=<secure-random-salt>`
  - Add `PII_HASH_ALGORITHM=SHA256`

- [X] **T002** Update .env.example with documented parameters - **SKIPPED** (project uses single `env` file only)

- [X] **T003** [P] Verify Python dependencies are installed (pytest, pytest-asyncio, python-dotenv)

**Checkpoint**: ✅ Phase 1 Complete - Configuration ready, dependencies installed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: PII hashing infrastructure that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### PII Hashing Infrastructure

- [X] **T004** [P] Create PII hasher utility in `/Users/olorin/Documents/olorin/olorin-server/app/service/security/pii_hasher.py` ✅
  - Implement `PIIHashConfig` dataclass with validation
  - Implement `PIIHasher` class with `hash_value()` and `hash_dict()` methods
  - Define Tier 1/2/3 PII field sets
  - Implement SHA-256 hashing with configurable salt
  - Implement case normalization for emails
  - Implement NULL value handling
  - Add global `get_pii_hasher()` function

- [X] **T005** [P] Unit tests for PII hashing in `/Users/olorin/Documents/olorin/olorin-server/tests/unit/service/test_pii_hasher.py` ✅ **14/14 passing**
  - Test deterministic hashing (same input → same output)
  - Test case normalization for emails
  - Test dict hashing (PII fields hashed, non-PII preserved)
  - Test NULL value handling
  - Test configuration validation
  - Test tier-based exclusion (Tier 1 only, Tier 1+2, all)
  - **Run tests - should FAIL before T004 complete**

- [X] **T006** Update logging configuration in `/Users/olorin/Documents/olorin/olorin-server/app/service/logging_helper.py` ✅
  - Implemented `PIILoggingFilter` class extending `logging.Filter`
  - Hash PII fields in log record args before formatting
  - Integrated with existing logging setup
  - Added `add_pii_filter_to_logger()` and `get_pii_aware_logger()` helpers

- [X] **T007** [P] Integration test for PII in logs in `/Users/olorin/Documents/olorin/olorin-server/tests/integration/test_pii_in_logs.py` ✅ **9/9 passing**
  - Test that emails are not in log output (plaintext) ✅
  - Test that IPs are not in log output (plaintext) ✅
  - Test that phone numbers are not in log output (plaintext) ✅
  - Test that hashed values appear instead ✅
  - Test NULL handling, case normalization, async logging ✅

**Checkpoint**: ✅ **Phase 2 COMPLETE** - Foundation ready - PII protection in place, user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Configure Analyzer for 24-Hour Rolling Window (Priority: P1) 🎯 MVP

**Goal**: Analyzer processes transactions from 24-hour window ending at 6 months ago, excludes fraud transactions, returns top 10%

**Independent Test**: Run analyzer with default config, verify time window ends at 6 months ago, verify fraud exclusion, verify top 10% returned

### Contract Tests for User Story 1

- [ ] **T008** [P] [US1] Contract test for analyzer time window in `/Users/olorin/Documents/olorin/olorin-server/tests/unit/service/test_analyzer_time_window_contract.py`
  - Test `AnalyzerTimeWindow` configuration loading from .env
  - Test `get_start_timestamp_sql()` generates correct nested DATEADD
  - Test `get_end_timestamp_sql()` generates correct DATEADD with offset
  - Test configuration validation (window_hours > 0, end_offset_months >= 0)
  - Test explicit boundaries in WHERE clause
  - **Run test - should FAIL before implementation**

- [ ] **T009** [P] [US1] Integration test for analyzer time range in `/Users/olorin/Documents/olorin/olorin-server/tests/integration/test_analyzer_time_range.py`
  - Test analyzer queries correct date range (6 months ago - 24h to 6 months ago)
  - Test fraud exclusion filter applied when enabled
  - Test fraud exclusion disabled when configured
  - Test top 10% calculation preserved
  - Mock Snowflake or use test data
  - **Run test - should FAIL before implementation**

### Implementation for User Story 1

- [ ] **T010** [US1] Modify analyzer query builder in `/Users/olorin/Documents/olorin/olorin-server/app/service/agent/tools/snowflake_tool/real_client.py`
  - Update `get_top_risk_entities()` method signature to add `end_offset_months` and `exclude_fraud` parameters
  - Change WHERE clause from `TX_DATETIME >= DATEADD(hour, -{time_window_hours}, CURRENT_TIMESTAMP())` to `TX_DATETIME >= DATEADD(hour, -{time_window_hours}, DATEADD(month, -{end_offset_months}, CURRENT_TIMESTAMP()))`
  - Add explicit end boundary: `AND TX_DATETIME < DATEADD(month, -{end_offset_months}, CURRENT_TIMESTAMP())`
  - Add fraud exclusion filter: `AND (IS_FRAUD_TX IS NULL OR IS_FRAUD_TX = 0)` when `exclude_fraud=True`
  - Preserve existing top 10% calculation logic (CEIL, ROW_NUMBER)
  - **Depends on**: T001 (configuration), T004-T007 (PII hashing for any logging)

- [ ] **T011** [US1] Update risk analyzer service in `/Users/olorin/Documents/olorin/olorin-server/app/service/analytics/risk_analyzer.py`
  - Add configuration loading in `__init__`: `self.analyzer_window_hours`, `self.analyzer_end_offset_months`, `self.analyzer_exclude_fraud`
  - Update `get_top_risk_entities()` to pass new parameters to `real_client.get_top_risk_entities()`
  - Add logging for time window dates (with PII hashing if needed)
  - **Depends on**: T010

- [ ] **T012** [US1] Unit tests for risk analyzer configuration in `/Users/olorin/Documents/olorin/olorin-server/tests/unit/service/test_risk_analyzer.py`
  - Test configuration loading from .env
  - Test default values applied when .env missing
  - Test parameters passed to client correctly
  - Mock `real_client` to verify parameters
  - **Run tests - should PASS after T011**

- [ ] **T013** [US1] Add validation and error handling
  - Validate time window configuration on analyzer initialization
  - Log warnings if time window contains no data
  - Handle empty result sets gracefully
  - Return empty list with warning if no entities in window
  - **Depends on**: T011

**Checkpoint**: User Story 1 complete - analyzer uses configurable time window ending at 6 months ago with fraud exclusion

---

## Phase 4: User Story 2 - Configure Investigation Time Range (Priority: P1)

**Goal**: Investigations query 2-year range (2.5 years to 6 months ago) with only approved transactions, no fraud columns in queries

**Independent Test**: Run investigation, verify time range is 2.5y to 6mo ago, verify only approved transactions, verify no fraud columns in SELECT

### Contract Tests for User Story 2

- [ ] **T014** [P] [US2] Contract test for investigation time range in `/Users/olorin/Documents/olorin/olorin-server/tests/unit/service/test_investigation_time_range_contract.py`
  - Test `InvestigationTimeRange` configuration loading from .env
  - Test `get_start_timestamp_sql()` generates correct DATEADD for years
  - Test `get_end_timestamp_sql()` matches analyzer end timestamp
  - Test configuration validation (start > end, computed range matches configured)
  - Test consistency validation with analyzer config
  - **Run test - should FAIL before implementation**

- [ ] **T015** [P] [US2] Contract test for fraud column exclusion in `/Users/olorin/Documents/olorin/olorin-server/tests/unit/service/test_fraud_column_exclusion_contract.py`
  - Test pattern matching identifies all FRAUD columns
  - Test `exclude_fraud_columns()` removes IS_FRAUD_TX and FIRST_FRAUD_STATUS_DATETIME
  - Test query validation catches fraud columns in SELECT
  - Test case-insensitive matching
  - Test future-proofing (new FRAUD_* columns auto-excluded)
  - **Run test - should FAIL before implementation**

- [ ] **T016** [P] [US2] Integration test for investigation queries in `/Users/olorin/Documents/olorin/olorin-server/tests/integration/test_investigation_query_validation.py`
  - Test investigation query spans 2.5y to 6mo ago
  - Test only approved transactions included (NSURE_LAST_DECISION = 'APPROVED')
  - Test NULL approval values excluded
  - Test no fraud columns in SELECT clause
  - Test no fraud columns in result set
  - Mock Snowflake or use test data
  - **Run test - should FAIL before implementation**

### Implementation for User Story 2

- [ ] **T017** [US2] Expand fraud column exclusion in `/Users/olorin/Documents/olorin/olorin-server/app/service/agent/tools/snowflake_tool/query_builder.py`
  - Replace explicit list `['MODEL_SCORE', 'IS_FRAUD_TX']` with pattern-based matching
  - Implement `FRAUD_PATTERN = re.compile(r'\bFRAUD\b', re.IGNORECASE)`
  - Change exclusion logic to use pattern matching on field_collection
  - Add logging for excluded columns (count and names at debug level)
  - Add query validation function to check for fraud columns in SELECT
  - **Depends on**: T001 (configuration), T004-T007 (PII hashing)

- [ ] **T018** [US2] Add investigation time range configuration to query builder in `/Users/olorin/Documents/olorin/olorin-server/app/service/agent/tools/snowflake_tool/query_builder.py`
  - Add `start_offset_years` and `end_offset_months` parameters to `build_investigation_query()`
  - Update WHERE clause to use `DATEADD(year, -{start_offset_years}, CURRENT_TIMESTAMP())`
  - Update WHERE clause end boundary to use `DATEADD(month, -{end_offset_months}, CURRENT_TIMESTAMP())`
  - Add strict approval filter: `AND NSURE_LAST_DECISION = 'APPROVED' AND NSURE_LAST_DECISION IS NOT NULL`
  - Load configuration from .env with defaults
  - **Depends on**: T017

- [ ] **T019** [US2] Unit tests for query builder in `/Users/olorin/Documents/olorin/olorin-server/tests/unit/service/test_query_builder.py`
  - Test fraud column pattern matching
  - Test exclusion of IS_FRAUD_TX and FIRST_FRAUD_STATUS_DATETIME
  - Test preservation of non-fraud columns (TX_ID_KEY, MODEL_SCORE, etc.)
  - Test time range SQL generation
  - Test approval filter in WHERE clause
  - Test query validation function
  - **Run tests - should PASS after T018**

- [ ] **T020** [US2] Add validation for consistency between analyzer and investigation configs
  - Create validation function to check end_offset_months matches between configs
  - Call validation on application startup or first query
  - Log error if configurations inconsistent
  - **Depends on**: T011, T018

**Checkpoint**: User Story 2 complete - investigations use configurable 2-year range with fraud column exclusion and strict approval filter

---

## Phase 5: User Story 3 - Validate Confusion Table Against Fraud Labels (Priority: P2)

**Goal**: Confusion table compares Olorin risk threshold vs IS_FRAUD_TX without using fraud data during investigation

**Independent Test**: Run analyzer + investigation, generate confusion table, verify TP/FP/TN/FN calculated correctly

### Validation for User Story 3

- [ ] **T021** [P] [US3] Integration test for confusion table generation in `/Users/olorin/Documents/olorin/olorin-server/tests/integration/test_confusion_table_validation.py`
  - Test confusion table generation with sample data
  - Test predicted_label calculation: `1 if predicted_risk >= threshold else 0`
  - Test comparison against IS_FRAUD_TX values
  - Test TP/FP/TN/FN counts are correct
  - Test NULL handling (excluded from confusion matrix)
  - Mock investigation results and fraud labels
  - **Run test - should PASS (no implementation needed per research.md)**

- [ ] **T022** [US3] Verify confusion matrix logic unchanged in `/Users/olorin/Documents/olorin/olorin-server/app/service/investigation/metrics_calculation.py`
  - Code review to confirm no changes needed
  - Verify `compute_confusion_matrix()` still uses correct logic
  - Verify fraud columns accessed only for validation, not investigation
  - Document that no changes required (per FR-011, FR-012, FR-013)
  - **Depends on**: T021 (validation test passing)

- [ ] **T023** [US3] End-to-end validation test
  - Run analyzer to get top risk entities
  - Run investigation for selected entities (no fraud columns)
  - Generate confusion table (access fraud columns for validation)
  - Verify complete workflow with time window modifications
  - Verify PII hashed in logs throughout workflow
  - **Depends on**: T013 (US1 complete), T020 (US2 complete)

**Checkpoint**: User Story 3 complete - confusion table validates predictions against fraud labels post-investigation

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements, documentation, and final validation

- [ ] **T024** [P] Update investigation script in `/Users/olorin/Documents/olorin/olorin-server/scripts/investigate_top_risk_entities.py`
  - Update for new time window parameters
  - Add logging with PII hashing
  - Test script execution end-to-end

- [ ] **T025** [P] Performance testing
  - Benchmark analyzer query execution time (target: <30s)
  - Benchmark investigation query execution time (target: <60s)
  - Benchmark PII hashing overhead (target: <20ms for 10K fields)
  - Monitor Snowflake query plans
  - Document performance metrics

- [ ] **T026** [P] Security audit
  - Verify no PII in logs (grep for email patterns, IP patterns, etc.)
  - Verify no PII sent to LLM (inspect API requests if applicable)
  - Verify salt is not logged or exposed
  - Verify all error messages hash PII
  - Test with production-like data volumes

- [ ] **T027** [P] Code cleanup and refactoring
  - Remove any debug logging statements
  - Ensure consistent code style
  - Add docstrings where missing
  - Update type hints

- [ ] **T028** Run complete quickstart validation from `/Users/olorin/Documents/olorin/specs/001-modify-analyzer-method/quickstart.md`
  - Follow all 10 steps
  - Verify all validation checks pass
  - Document any deviations or issues
  - **Depends on**: All implementation tasks complete

- [ ] **T029** [P] Update project README or documentation
  - Document new .env parameters
  - Document analyzer behavior changes
  - Document investigation query changes
  - Document PII hashing feature
  - Add troubleshooting section

**Checkpoint**: All polish tasks complete, feature ready for deployment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion (can run parallel to US1)
- **User Story 3 (Phase 5)**: Depends on US1 and US2 completion (validation only)
- **Polish (Phase 6)**: Depends on all user stories complete

### Critical Path

```
T001-T003 (Setup)
    ↓
T004-T007 (PII Hashing - BLOCKING)
    ↓
    ├─→ T008-T013 (US1: Analyzer)
    │
    └─→ T014-T020 (US2: Investigation)
         ↓
T021-T023 (US3: Validation)
    ↓
T024-T029 (Polish)
```

### Parallel Opportunities

**Phase 1 (Setup)**: T001, T002, T003 can run in parallel (different files)

**Phase 2 (Foundational)**: T004, T005, T007 can run in parallel (different files)

**Phase 3 (US1 Tests)**: T008, T009 can run in parallel (different test files)

**Phase 4 (US2 Tests)**: T014, T015, T016 can run in parallel (different test files)

**Phase 4 (US2 Implementation)**: T017 and T018 are sequential (same file)

**Phase 6 (Polish)**: T024, T025, T026, T027, T029 can run in parallel (different concerns)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - No dependencies on other stories (parallel to US1)
- **User Story 3 (P2)**: Can start after US1 AND US2 complete - Requires both for end-to-end validation

---

## Parallel Example: Foundational Phase

```bash
# Launch all foundational tasks together (different files):
Task: "Create PII hasher utility in app/service/security/pii_hasher.py"
Task: "Unit tests for PII hashing in tests/unit/service/test_pii_hasher.py"
Task: "Integration test for PII in logs in tests/integration/test_pii_in_logs.py"

# Note: T006 (logging config) sequential after T004 complete
```

## Parallel Example: User Story 1 Tests

```bash
# Launch all US1 contract tests together:
Task: "Contract test for analyzer time window in tests/unit/service/test_analyzer_time_window_contract.py"
Task: "Integration test for analyzer time range in tests/integration/test_analyzer_time_range.py"
```

## Parallel Example: User Story 2 Tests

```bash
# Launch all US2 contract tests together:
Task: "Contract test for investigation time range in tests/unit/service/test_investigation_time_range_contract.py"
Task: "Contract test for fraud column exclusion in tests/unit/service/test_fraud_column_exclusion_contract.py"
Task: "Integration test for investigation queries in tests/integration/test_investigation_query_validation.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T007) - **CRITICAL**
3. Complete Phase 3: User Story 1 (T008-T013)
4. **STOP and VALIDATE**: Test analyzer independently with new time window
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → PII protection in place
2. Add User Story 1 → Test analyzer independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test investigations independently → Deploy/Demo
4. Add User Story 3 → Validate confusion table → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With 2-3 developers:

1. **Team completes Setup + Foundational together** (T001-T007)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (T008-T013) - Analyzer modifications
   - **Developer B**: User Story 2 (T014-T020) - Investigation modifications
3. **Developer A+B together**: User Story 3 (T021-T023) - End-to-end validation
4. **All developers**: Polish tasks in parallel (T024-T029)

---

## Test-Driven Development (TDD) Notes

This feature follows TDD principles:

1. **Write tests FIRST** (T005, T007, T008, T009, T014, T015, T016, T021)
2. **Verify tests FAIL** before implementation
3. **Implement minimum code** to make tests pass
4. **Verify tests PASS** after implementation
5. **Refactor** with confidence (tests as safety net)

### TDD Cycle per User Story

**User Story 1**:
- T008, T009 → Write contract/integration tests → **FAIL**
- T010, T011 → Implement analyzer changes → **PASS**
- T012, T013 → Add unit tests and validation → **PASS**

**User Story 2**:
- T014, T015, T016 → Write contract/integration tests → **FAIL**
- T017, T018 → Implement investigation changes → **PASS**
- T019, T020 → Add unit tests and validation → **PASS**

**User Story 3**:
- T021 → Write integration test → **PASS** (no implementation needed!)
- T022, T023 → Verify existing logic and end-to-end → **PASS**

---

## Estimated Time

- **Phase 1 (Setup)**: 15 minutes
- **Phase 2 (Foundational - PII Hashing)**: 1.5 hours (critical!)
- **Phase 3 (User Story 1 - Analyzer)**: 1.5 hours
- **Phase 4 (User Story 2 - Investigation)**: 1.5 hours
- **Phase 5 (User Story 3 - Validation)**: 30 minutes
- **Phase 6 (Polish)**: 1 hour

**Total Sequential**: ~6 hours

**Total with Parallelization**: ~4 hours (with 2-3 developers)

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story (US1, US2, US3) for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **PII hashing is foundational and blocks all user stories** - prioritize Phase 2
- **Preserve existing top 10% calculation and confusion matrix logic** - no changes needed
- All file paths are absolute based on `/Users/olorin/Documents/olorin/olorin-server/`

