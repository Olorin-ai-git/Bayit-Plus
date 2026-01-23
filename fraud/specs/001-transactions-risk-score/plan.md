# Implementation Plan: Per-Transaction Risk Scoring

**Branch**: `001-transactions-risk-score` | **Date**: 2025-11-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-transactions-risk-score/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement per-transaction risk scoring during investigations. The system will calculate a unique risk score for each transaction using transaction-specific features (amount, merchant, device, location, payment method, behavioral patterns) combined with entity-level domain findings. Per-transaction scores will be stored in `progress_json.transaction_scores` dict and used in confusion matrix calculations instead of applying a single entity-level risk score to all transactions. Transactions without per-transaction scores will be excluded from confusion matrix (no fallback to entity-level score).

**Technical Approach**: 
- Modify risk agent to calculate per-transaction scores during investigation using transaction features and domain findings
- **Clarified**: Domain findings contain entity-specific mappings (e.g., `merchant_risks: {merchant_name: risk_score}`) that are matched to transaction features
- **Clarified**: Score calculation formula: `tx_score = 0.6 * feature_score + 0.4 * domain_score`, where `feature_score = (normalized_amount + normalized_merchant + normalized_device + normalized_location) / 4` (normalized to [0,1] range)
- **Clarified**: Minimum 2 of 4 critical features (amount, merchant, device, location) required - transactions with fewer features excluded
- **Clarified**: When transaction features don't match domain mappings, use aggregate domain risk score as fallback
- Store per-transaction scores in `progress_json.transaction_scores` dict keyed by `TX_ID_KEY`
- Update `map_investigation_to_transactions()` to use per-transaction scores when available
- Exclude transactions without per-transaction scores from confusion matrix calculations
- Ensure calculation completes within investigation timeout for large transaction volumes

## Clarifications

**Reference**: See [spec.md](./spec.md#clarifications) for full clarification session details.

Key clarifications resolved during specification:
1. **Domain Findings Mapping**: Domain findings contain entity-specific mappings (e.g., `merchant_risks: {merchant_name: risk_score}`) that are matched to transaction features
2. **Minimum Features**: At least 2 of 4 critical features (amount, merchant, device, location) required - transactions with fewer features excluded
3. **Missing Mappings Fallback**: Use aggregate domain risk score as fallback when transaction features don't match domain mappings
4. **Score Calculation Formula**: `tx_score = 0.6 * feature_score + 0.4 * domain_score`, where `feature_score = (normalized_amount + normalized_merchant + normalized_device + normalized_location) / 4` (normalized to [0,1] range)
5. **Feature Score Combination**: Normalized weighted average with equal weights (25% each) after normalizing each feature to [0,1] range

## Technical Context

**Language/Version**: Python 3.11 (backend)  
**Primary Dependencies**: 
- Backend: FastAPI, Pydantic, SQLAlchemy, snowflake-connector-python, pytz
- Existing: Risk agent, investigation services, domain agents, transaction mapper, comparison services  
**Storage**: PostgreSQL (investigation state) / Snowflake (transaction data) via existing database provider abstraction  
**Testing**: pytest (backend)  
**Target Platform**: Linux server (backend)  
**Project Type**: web (backend modifications only)  
**Performance Goals**: 
- Per-transaction score calculation completes within investigation timeout (30 minutes default)
- Handle 1000+ transactions efficiently with batch processing
- Score calculation adds <5 seconds overhead per 100 transactions  
**Constraints**: 
- All files <200 lines
- No mocks/stubs/TODOs in production code
- Zero-tolerance duplication policy
- MUST NOT use `MODEL_SCORE` or `NSURE_LAST_DECISION` in per-transaction risk calculation
- Only Approved transactions are considered (already filtered)
- Transactions without scores excluded from confusion matrix (no fallback)
- Validate scores are in range [0.0, 1.0] before storage
- Handle missing/invalid transaction features gracefully
- **Clarified**: Minimum 2 of 4 critical features (amount, merchant, device, location) required for scoring
- **Clarified**: Use aggregate domain risk score as fallback when transaction features don't match domain mappings
- **Clarified**: Score formula: `tx_score = 0.6 * feature_score + 0.4 * domain_score`, where `feature_score = (normalized_amount + normalized_merchant + normalized_device + normalized_location) / 4`  
**Scale/Scope**: 
- Support investigations with 1-1000+ transactions
- Calculate per-transaction scores for all transactions with sufficient features
- Store scores efficiently in `transaction_scores` dict
- Integrate with existing confusion matrix calculation flow

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Zero-tolerance duplication policy**: Reuse existing infrastructure (risk agent, domain agents, transaction mapper, investigation services)  
✅ **No hardcoded values**: Use existing configuration patterns and environment variables  
✅ **Complete implementations only**: No mocks/stubs/TODOs in production code  
✅ **File size limit**: All files <200 lines (split services appropriately if needed)  
✅ **Mandatory codebase analysis**: Will complete comprehensive scan during Phase 0 research  
✅ **Use existing infrastructure**: Leverage existing risk agent, domain findings, transaction data structures, investigation state management

## Project Structure

### Documentation (this feature)

```text
specs/001-transactions-risk-score/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
olorin-server/
├── app/
│   ├── service/
│   │   ├── agent/
│   │   │   └── orchestration/
│   │   │       └── domain_agents/
│   │   │           └── risk_agent.py            # Modify: Add per-transaction score calculation
│   │   ├── investigation/
│   │   │   └── investigation_transaction_mapper.py  # Modify: Use per-transaction scores, exclude missing
│   │   └── state_update_helper.py              # Modify: Store transaction_scores in progress_json
│   └── router/
│       └── controllers/
│           └── investigation_controller.py     # May need updates for transaction_scores storage

tests/
├── unit/
│   ├── test_risk_agent.py                      # Test per-transaction score calculation
│   ├── test_investigation_transaction_mapper.py # Test per-transaction score usage
│   └── test_state_update_helper.py             # Test transaction_scores storage
└── integration/
    └── test_per_transaction_scoring_e2e.py      # E2E test for full flow
```

**Structure Decision**: Backend-only modifications following existing service/router pattern. No new services created - modifications to existing risk agent, transaction mapper, and state management. All changes maintain existing architectural patterns.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all requirements align with constitutional principles. Changes are modifications to existing services, no new architectural components introduced.

## Progress Tracking

### Phase 0: Research ✅ COMPLETE
- [x] Analyze feature specification
- [x] Scan codebase for existing transaction processing infrastructure
- [x] Identify reusable components (risk agent, domain findings, transaction features)
- [x] Document technical approach for per-transaction scoring
- [x] Generate research.md

### Phase 1: Design ✅ COMPLETE
- [x] Define data models (transaction_scores dict structure)
- [x] Design per-transaction score calculation algorithm
- [x] Plan service modifications (risk agent, transaction mapper)
- [x] Design score storage and retrieval patterns
- [x] Generate data-model.md
- [x] Generate contracts/ (if needed)
- [x] Generate quickstart.md

### Phase 2: Task Breakdown ⏳ PENDING
- [ ] Generate detailed tasks.md (via /speckit.tasks command)

## Next Steps

1. ✅ Phase 0 Complete: research.md generated
2. ✅ Phase 1 Complete: data-model.md, contracts/internal-service-contracts.md, quickstart.md generated
3. ⏳ Phase 2: Generate tasks.md (via /speckit.tasks command)
