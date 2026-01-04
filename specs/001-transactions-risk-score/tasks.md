# Implementation Tasks: Per-Transaction Risk Scoring

**Feature**: Per-Transaction Risk Scoring  
**Branch**: `001-transactions-risk-score`  
**Date**: 2025-11-17  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

This document contains the detailed implementation tasks for per-transaction risk scoring. Tasks are organized by phase and user story to enable independent implementation and testing.

**Total Tasks**: 34  
**MVP Scope**: User Story 1 (Tasks T001-T018, T007A)  
**Estimated Time**: 2-3 days for MVP, 4-5 days for full implementation

## Dependencies

### User Story Completion Order

1. **Phase 1: Setup** → Must complete before all other phases
2. **Phase 2: Foundational** → Must complete before user story phases
3. **Phase 3: User Story 1** → Core functionality, can be tested independently
4. **Phase 4: User Story 2** → Depends on User Story 1 (uses transaction_scores)
5. **Phase 5: User Story 3** → Depends on User Story 1 (enhances scoring formula)
6. **Final Phase: Polish** → Depends on all user stories

### Parallel Execution Opportunities

- **Phase 3 (User Story 1)**: Tasks T008-T011 can be parallelized (different normalization functions)
- **Phase 4 (User Story 2)**: Tasks T019-T022 can be parallelized (different modifications to mapper)
- **Phase 5 (User Story 3)**: Tasks T023-T025 can be parallelized (different feature enhancements)

## Implementation Strategy

**MVP First**: Implement User Story 1 (per-transaction score calculation) first, then User Story 2 (confusion matrix integration), then User Story 3 (feature blending).

**Incremental Delivery**: Each user story phase is independently testable and can be deployed separately.

---

## Phase 1: Setup

**Goal**: Prepare project structure and validate prerequisites.

**Independent Test**: Verify project structure matches plan.md and all dependencies are available.

### Tasks

- [x] T001 Verify existing risk agent structure in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py`
- [x] T002 Verify existing transaction mapper structure in `olorin-server/app/service/investigation/investigation_transaction_mapper.py`
- [x] T003 Verify existing state update helper structure in `olorin-server/app/service/state_update_helper.py`
- [x] T004 Review domain findings structure in `progress_json["domain_findings"]` to understand entity-specific mappings

---

## Phase 2: Foundational

**Goal**: Implement core data structures and validation utilities needed by all user stories.

**Independent Test**: Verify transaction_scores dict structure and validation functions work correctly.

### Tasks

- [x] T005 Create helper function `_validate_transaction_score()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to validate scores are in range [0.0, 1.0]
- [x] T006 Create helper function `_extract_transaction_features()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to extract and normalize transaction features (amount, merchant, device, location), ensuring `MODEL_SCORE` and `NSURE_LAST_DECISION` are not accessed
- [x] T007 Create helper function `_count_critical_features()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to count available critical features (amount, merchant, device, location)
- [x] T007A [US1] Add validation check in `_calculate_per_transaction_scores()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to ensure `MODEL_SCORE` and `NSURE_LAST_DECISION` are not used during per-transaction score calculation (FR-005 compliance)

---

## Phase 3: User Story 1 - Calculate Per-Transaction Risk Scores During Investigation

**Goal**: Calculate unique risk score for each transaction during investigation and store in `progress_json["transaction_scores"]`.

**Independent Test**: Run investigation and verify:
1. Each transaction in `facts["results"]` receives a unique risk score
2. Transaction scores are stored in `progress_json.transaction_scores` dict
3. Scores are in valid range [0.0, 1.0]
4. Transactions with insufficient features are excluded

**Acceptance Criteria**:
- Given an investigation with 10 transactions, each transaction has a unique risk score stored in `transaction_scores` dict keyed by `TX_ID_KEY`
- Transactions with different amounts receive different risk scores (high amounts = higher risk)
- Transactions with different merchants receive different risk scores based on merchant domain findings
- Transactions with fewer than 2 critical features are excluded from `transaction_scores` dict

### Tasks

- [x] T008 [US1] Create function `_normalize_amount_feature()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to normalize transaction amount to [0,1] range based on max amount in investigation
- [x] T009 [US1] Create function `_normalize_merchant_feature()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to extract merchant risk from domain findings (check `merchant_risks` dict first, fallback to aggregate `merchant.risk_score`)
- [x] T010 [US1] Create function `_normalize_device_feature()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to extract device risk from domain findings (check `device_risks` dict first, fallback to aggregate `device.risk_score`)
- [x] T011 [US1] Create function `_normalize_location_feature()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to extract location risk from domain findings (check location/network domain findings, fallback to aggregate risk_score)
- [x] T012 [US1] Create function `_calculate_feature_score()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to calculate feature_score using normalized weighted average: `(normalized_amount + normalized_merchant + normalized_device + normalized_location) / 4`
- [x] T013 [US1] Create function `_calculate_domain_score()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to calculate confidence-weighted average of matched domain findings for a transaction (weight each domain by its confidence score, default to equal weights if confidence unavailable)
- [x] T014 [US1] Create function `_calculate_per_transaction_score()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to calculate single transaction score using formula: `tx_score = 0.6 * feature_score + 0.4 * domain_score`
- [x] T015 [US1] Create function `_calculate_per_transaction_scores()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to process all transactions in `facts["results"]`, validate features (require at least 2 of 4 critical features), calculate scores, and return `transaction_scores` dict
- [x] T016 [US1] Integrate `_calculate_per_transaction_scores()` into risk agent execution flow in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` (call after domain findings are complete, before investigation completion)
- [x] T017 [US1] Update `apply_state_updates()` in `olorin-server/app/service/state_update_helper.py` to store `transaction_scores` dict in `progress_json["transaction_scores"]` when provided
- [x] T018 [US1] Add validation in `apply_state_updates()` in `olorin-server/app/service/state_update_helper.py` to ensure all scores in `transaction_scores` dict are in range [0.0, 1.0] before storage

---

## Phase 4: User Story 2 - Use Per-Transaction Scores in Confusion Matrix

**Goal**: Use per-transaction risk scores in confusion matrix calculations instead of single entity-level score.

**Independent Test**: Run investigation with per-transaction scores, generate confusion table, and verify:
1. Each transaction uses its own `predicted_risk` value from `transaction_scores[tx_id]`
2. Transactions without scores are excluded from confusion matrix
3. TP/FP/TN/FN counts reflect per-transaction predictions

**Acceptance Criteria**:
- Given an investigation with per-transaction scores stored, `map_investigation_to_transactions()` sets each transaction's `predicted_risk` from `transaction_scores[tx_id]` instead of `overall_risk_score`
- Given transactions with scores [0.2, 0.4, 0.6, 0.8] and threshold 0.3, transactions with scores >= 0.3 are classified as Fraud
- Given per-transaction scores exist but some transactions are missing scores, missing transactions are excluded from confusion matrix calculations with a warning log

### Tasks

- [x] T019 [US2] Modify `map_investigation_to_transactions()` in `olorin-server/app/service/investigation/investigation_transaction_mapper.py` to check for `transaction_scores` dict in `progress_json`
- [x] T020 [US2] Update transaction mapping logic in `olorin-server/app/service/investigation/investigation_transaction_mapper.py` to use `transaction_scores[tx_id]` as `predicted_risk` if available, otherwise exclude transaction (set `predicted_risk` to None, skip transaction)
- [x] T021 [US2] Add logging in `map_investigation_to_transactions()` in `olorin-server/app/service/investigation/investigation_transaction_mapper.py` to warn when transactions are excluded due to missing per-transaction scores
- [x] T022 [US2] Add handling in `map_investigation_to_transactions()` in `olorin-server/app/service/investigation/investigation_transaction_mapper.py` for missing `transaction_scores` dict (exclude all transactions, log warning)

---

## Phase 5: User Story 3 - Blend Transaction Features with Entity-Level Domain Findings

**Goal**: Enhance per-transaction scoring to properly blend transaction-specific features with entity-level domain findings using the clarified formula.

**Independent Test**: Verify that:
1. Transaction amount influences per-transaction score
2. Merchant risk (from merchant domain) influences per-transaction score
3. Device risk (from device domain) influences per-transaction score
4. Location risk (from location/network domain) influences per-transaction score
5. Formula uses weighted sum: `tx_score = 0.6 * feature_score + 0.4 * domain_score`

**Acceptance Criteria**:
- Given a transaction with high amount ($1000) and entity-level device risk score 0.8, the per-transaction score reflects both high amount and high device risk
- Given a transaction with low-risk merchant and high-risk location, the score balances both factors appropriately
- Formula uses weighted sum: `tx_score = 0.6 * feature_score + 0.4 * domain_score` where feature_score combines transaction-specific features and domain_score is weighted average of matched domain findings

### Tasks

- [x] T023 [US3] Enhance `_calculate_feature_score()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to ensure proper normalization of all features to [0,1] range before averaging
- [x] T024 [US3] Enhance `_calculate_domain_score()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to properly match transaction features to entity-specific mappings in domain findings (merchant → merchant_risks, device → device_risks, location → location/network findings)
- [x] T025 [US3] Verify `_calculate_per_transaction_score()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` uses correct formula: `tx_score = 0.6 * feature_score + 0.4 * domain_score` with validated inputs

---

## Final Phase: Polish & Cross-Cutting Concerns

**Goal**: Add error handling, logging, performance optimizations, and edge case handling.

**Independent Test**: Verify all edge cases are handled gracefully and performance meets targets.

### Tasks

- [x] T026 Add batch processing logic in `_calculate_per_transaction_scores()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to process transactions in batches of 100 for large volumes
- [x] T027 Add timeout handling in `_calculate_per_transaction_scores()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to ensure calculation completes within investigation timeout
- [x] T028 Add comprehensive error handling in `_calculate_per_transaction_scores()` in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` for missing features, invalid values, and missing domain findings
- [x] T029 Add logging throughout per-transaction score calculation in `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py` to track calculation progress, excluded transactions, and warnings
- [x] T030 Add unit tests in `olorin-server/tests/unit/test_risk_agent.py` for per-transaction score calculation functions
- [x] T031 Add unit tests in `olorin-server/tests/unit/test_investigation_transaction_mapper.py` for per-transaction score usage in mapping
- [x] T032 Add unit tests in `olorin-server/tests/unit/test_state_update_helper.py` for transaction_scores storage
- [x] T033 Add integration test in `olorin-server/tests/integration/test_per_transaction_scoring_e2e.py` for full flow from calculation to confusion matrix

---

## Task Summary

### By Phase

- **Phase 1 (Setup)**: 4 tasks (T001-T004)
- **Phase 2 (Foundational)**: 4 tasks (T005-T007, T007A)
- **Phase 3 (User Story 1)**: 11 tasks (T008-T018)
- **Phase 4 (User Story 2)**: 4 tasks (T019-T022)
- **Phase 5 (User Story 3)**: 3 tasks (T023-T025)
- **Final Phase (Polish)**: 8 tasks (T026-T033)

### By User Story

- **User Story 1**: 12 tasks (T007A, T008-T018)
- **User Story 2**: 4 tasks (T019-T022)
- **User Story 3**: 3 tasks (T023-T025)

### By File

- `risk_agent.py`: 19 tasks (T005-T018, T007A, T023-T025, T026-T029)
- `investigation_transaction_mapper.py`: 4 tasks (T019-T022)
- `state_update_helper.py`: 2 tasks (T017-T018)
- Test files: 4 tasks (T030-T033)

### Parallel Opportunities

- **Phase 3**: Tasks T008-T011 can be parallelized (different normalization functions)
- **Phase 4**: Tasks T019-T022 can be parallelized (different modifications to mapper)
- **Final Phase**: Tasks T030-T033 can be parallelized (different test files)

---

## MVP Scope

**Recommended MVP**: User Story 1 (Phase 3) - Calculate Per-Transaction Risk Scores

**MVP Tasks**: T001-T018, T007A (19 tasks)

**MVP Deliverable**: 
- Per-transaction scores calculated and stored during investigation
- Scores validated and stored in `progress_json["transaction_scores"]`
- Transactions with insufficient features excluded

**Next Steps After MVP**:
1. User Story 2: Integrate per-transaction scores into confusion matrix
2. User Story 3: Enhance scoring formula with proper feature blending
3. Polish: Add tests, error handling, performance optimizations

---

## Notes

- All tasks must follow the strict checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
- Tasks marked with `[P]` can be parallelized (different files, no dependencies)
- Tasks marked with `[US1]`, `[US2]`, `[US3]` belong to specific user stories
- All file paths are relative to repository root (`olorin-server/`)
- Tests are included in Final Phase (not required for MVP, but recommended)

