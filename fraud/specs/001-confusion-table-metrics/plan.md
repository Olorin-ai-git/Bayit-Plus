# Implementation Plan: Confusion Table Metrics

**Branch**: `001-confusion-table-metrics` | **Date**: 2025-11-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-confusion-table-metrics/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement confusion table metrics evaluation for fraud detection investigations. The system will always run investigations on the top 3 riskiest entities, exclude MODEL_SCORE and IS_FRAUD_TX columns from investigation queries (CRITICAL for unbiased evaluation), classify APPROVED transactions (NSURE_LAST_DECISION = 'APPROVED') as Fraud/Not Fraud based on investigation risk scores vs configurable threshold, compare predictions to current IS_FRAUD_TX ground truth values (single source of truth), and display confusion matrix (TP, FP, TN, FN) with derived metrics (precision, recall, F1, accuracy) in startup analysis reports.

**Technical Approach**: 
- Modify startup analysis flow to unconditionally run investigations for top 3 riskiest entities
- Update all SQL query builders to exclude MODEL_SCORE and IS_FRAUD_TX columns during investigation execution (CRITICAL: these must NOT appear in any investigation queries)
- Enhance transaction mapping logic to classify APPROVED transactions (filtered by NSURE_LAST_DECISION = 'APPROVED') based on investigation risk_score vs RISK_THRESHOLD_DEFAULT (default 0.3)
- Extend comparison service to calculate confusion matrix metrics comparing investigation predictions to current IS_FRAUD_TX values (IS_FRAUD_TX represents final confirmed fraud status and doesn't change retroactively)
- Add confusion table section to startup analysis report HTML with aggregated metrics across all investigated entities

## Technical Context

**Language/Version**: Python 3.11 (backend)  
**Primary Dependencies**: 
- Backend: FastAPI, Pydantic, SQLAlchemy, snowflake-connector-python, pytz
- Existing: Risk analyzer, investigation services, reporting services, comparison services  
**Storage**: Snowflake (primary) / PostgreSQL (fallback) via existing database provider abstraction  
**Testing**: pytest (backend)  
**Target Platform**: Linux server (backend)  
**Project Type**: web (backend modifications only)  
**Performance Goals**: 
- Confusion table metrics calculated within 5 seconds after all investigations complete
- Report generation completes within 10 seconds including confusion table rendering  
**Constraints**: 
- All files <200 lines
- No mocks/stubs/TODOs in production code
- Zero-tolerance duplication policy
- All configuration from environment variables (RISK_THRESHOLD_DEFAULT, default 0.3)
- CRITICAL: MODEL_SCORE and IS_FRAUD_TX must NOT appear in any investigation SQL queries (during investigation execution only - IS_FRAUD_TX is used AFTER investigation for comparison)
- Only APPROVED transactions (NSURE_LAST_DECISION = 'APPROVED') are included in confusion matrix calculation, matching the same transaction set used by risk analyzer
- Use current IS_FRAUD_TX values for comparison (IS_FRAUD_TX represents final confirmed fraud status and doesn't change retroactively)
- Guard divide-by-zero in confusion matrix calculations; handle NULL IS_FRAUD_TX gracefully (exclude NULL values from calculations)  
**Scale/Scope**: 
- Support top 3 riskiest entities from risk analyzer
- Filter to APPROVED transactions only (NSURE_LAST_DECISION = 'APPROVED') for confusion matrix calculation
- Aggregate confusion matrix metrics across all 3 entities in startup report
- Handle edge cases: NULL IS_FRAUD_TX (exclude from calculations), missing risk scores (fallback to domain_findings.risk.risk_score), failed investigations (log and continue)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Zero-tolerance duplication policy**: Reuse existing infrastructure (risk analyzer, investigation services, comparison service, reporting services, database provider)  
✅ **No hardcoded values**: All configuration from environment variables (RISK_THRESHOLD_DEFAULT, default 0.3)  
✅ **Complete implementations only**: No mocks/stubs/TODOs in production code  
✅ **File size limit**: All files <200 lines (split services appropriately)  
✅ **Mandatory codebase analysis**: Already completed comprehensive scan before planning  
✅ **Use existing infrastructure**: Leverage existing risk analyzer, investigation services, comparison service, reporting services, database provider abstraction

## Project Structure

### Documentation (this feature)

```text
specs/001-confusion-table-metrics/
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
│   │   ├── __init__.py                    # Modify: Remove conditional logic for top 3 entities
│   │   ├── analytics/
│   │   │   └── risk_analyzer.py            # Already exists - no changes needed
│   │   ├── investigation/
│   │   │   ├── auto_comparison.py          # Modify: Ensure unconditional top 3 execution
│   │   │   ├── investigation_transaction_mapper.py  # Modify: Add fraud classification logic + filter APPROVED transactions
│   │   │   └── comparison_service.py      # Modify: Add confusion matrix calculation (only APPROVED transactions)
│   │   ├── agent/
│   │   │   └── tools/
│   │   │       ├── database_tool/
│   │   │       │   └── snowflake_provider.py  # Modify: Exclude MODEL_SCORE/IS_FRAUD_TX from queries
│   │   │       └── snowflake_tool/
│   │   │           └── query_builder.py   # Modify: Remove MODEL_SCORE/IS_FRAUD_TX from SELECT
│   │   └── reporting/
│   │       └── startup_report_generator.py  # Modify: Add confusion table section
│   └── router/
│       └── models/
│           └── investigation_comparison_models.py  # May need confusion matrix models

tests/
├── unit/
│   ├── test_investigation_transaction_mapper.py  # Test fraud classification
│   ├── test_comparison_service.py               # Test confusion matrix calculation
│   └── test_startup_report_generator.py          # Test confusion table display
└── integration/
    └── test_confusion_table_e2e.py               # E2E test for full flow
```

**Structure Decision**: Backend-only modifications following existing service/router pattern. No new services created - modifications to existing investigation, comparison, and reporting services. All changes maintain existing architectural patterns.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all requirements align with constitutional principles. Changes are modifications to existing services, no new architectural components introduced.

## Progress Tracking

### Phase 0: Research ✅ COMPLETE
- [x] Analyze feature specification
- [x] Scan codebase for existing infrastructure
- [x] Identify reusable components
- [x] Document technical approach
- [x] Generate research.md

### Phase 1: Design ✅ COMPLETE
- [x] Define data models (confusion matrix metrics)
- [x] Design API contracts (if needed)
- [x] Plan service modifications
- [x] Design report section structure
- [x] Generate data-model.md
- [x] Generate contracts/ (if needed)
- [x] Generate quickstart.md

### Phase 2: Task Breakdown ⏳ PENDING
- [ ] Generate detailed tasks.md (via /speckit.tasks command)

## Next Steps

1. ✅ Phase 0 Complete: research.md generated
2. ✅ Phase 1 Complete: data-model.md, contracts/internal-service-contracts.md, quickstart.md generated
3. ⏳ Phase 2: Generate tasks.md (via /speckit.tasks command)
