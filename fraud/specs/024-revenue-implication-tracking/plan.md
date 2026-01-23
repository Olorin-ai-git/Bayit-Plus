# Implementation Plan: Revenue Implication Tracking

**Branch**: `024-revenue-implication-tracking` | **Date**: 2024-12-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-revenue-implication-tracking/spec.md`

## Summary

Modify the startup analysis flow to calculate and track revenue implications by:
1. Shifting time windows to historical data (12+ months ago)
2. Calculating "Saved Fraud GMV" from approved transactions that turned out to be fraud
3. Calculating "Lost Revenues" from blocked legitimate transactions × take rate
4. Displaying Net Value (Saved - Lost) in investigation results and aggregate reports

## Technical Context

**Language/Version**: Python 3.11  
**Primary Dependencies**: FastAPI, SQLAlchemy, Snowflake Connector  
**Storage**: SQLite (investigation state), Snowflake (transaction data)  
**Testing**: pytest with integration tests  
**Target Platform**: Linux server  
**Project Type**: Web application (backend + frontend)  
**Performance Goals**: Process 50 investigations/hour with revenue calculations  
**Constraints**: <30 seconds for revenue calculation per investigation  
**Scale/Scope**: ~100 investigations per analysis run

## Constitution Check

*No project-specific constitution configured. Using CLAUDE.md rules.*

✅ No mocks/stubs in production code  
✅ All configuration from environment variables  
✅ No hardcoded values  
✅ Schema-locked mode (no DDL)  
✅ Files under 200 lines  

## Project Structure

### Documentation (this feature)

```text
specs/024-revenue-implication-tracking/
├── plan.md              # This file
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── research.md          # Technical research (to be created)
```

### Source Code (repository root)

```text
# Backend (Python/FastAPI)
olorin-server/
├── app/
│   ├── config/
│   │   └── revenue_config.py        # NEW: Revenue calculation configuration
│   ├── models/
│   │   └── revenue_implication.py   # NEW: RevenueImplication data model
│   ├── schemas/
│   │   └── revenue_implication.py   # NEW: Pydantic schemas
│   ├── service/
│   │   ├── investigation/
│   │   │   ├── auto_comparison.py   # MODIFY: Time window shifts
│   │   │   └── revenue_calculator.py # NEW: Revenue calculation service
│   │   └── reporting/
│   │       └── on_demand_startup_report_service.py  # MODIFY: Include revenue data
│   └── router/
│       └── revenue_router.py        # NEW: Revenue endpoints (if needed)
└── test/
    └── unit/
        └── test_revenue_calculator.py # NEW: Unit tests

# Frontend (React/TypeScript) - LATER PHASE
olorin-front/
└── src/
    └── microservices/
        └── investigation/
            ├── components/
            │   └── RevenueMetrics.tsx  # NEW: Revenue display component
            └── pages/
                └── ParallelInvestigationsPage.tsx  # MODIFY: Add revenue columns
```

**Structure Decision**: Extend existing backend services with new revenue calculation module. Frontend changes follow existing microservices architecture.

## Technical Research Summary

### Existing Code Analysis

1. **Time Window Configuration** (`auto_comparison.py:59-71`)
   - Currently: 6-8 months ago (random), 6-month investigation window
   - Change needed: 12+ months ago, 18-12 months investigation window

2. **Transaction Data Fields** (from Snowflake schema)
   - GMV: `PAID_AMOUNT_VALUE_IN_CURRENCY`
   - Decision: `NSURE_LAST_DECISION` ('APPROVED', 'BLOCK', 'REJECT', etc.)
   - Ground Truth: `IS_FRAUD_TX` (0 or 1)

3. **Investigation State** (`investigation_state.py`)
   - Progress stored in `progress_json` field
   - Can extend with `revenue_data` nested object

4. **Report Generation** (`on_demand_startup_report_service.py`)
   - Already processes completed investigations
   - Can extend to include revenue calculations

### Key Implementation Points

1. **Saved Fraud GMV Calculation**:
   ```sql
   SELECT SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) as saved_fraud_gmv
   FROM transactions
   WHERE entity_id = :entity_id
     AND TX_DATETIME >= :window_start  -- 12 months ago
     AND TX_DATETIME < :window_end      -- 6 months ago
     AND UPPER(NSURE_LAST_DECISION) = 'APPROVED'
     AND IS_FRAUD_TX = 1
   ```

2. **Lost Revenues Calculation**:
   ```sql
   SELECT SUM(PAID_AMOUNT_VALUE_IN_CURRENCY) * :take_rate * :lifetime_multiplier as lost_revenues
   FROM transactions
   WHERE entity_id = :entity_id
     AND TX_DATETIME >= :window_start  -- 12 months ago
     AND TX_DATETIME < :window_end      -- 6 months ago
     AND UPPER(NSURE_LAST_DECISION) IN ('BLOCK', 'REJECT', 'DECLINE')
     AND IS_FRAUD_TX = 0  -- Legitimate transaction that was blocked
   ```

### Environment Variables Required

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ANALYZER_HISTORICAL_OFFSET_MONTHS` | int | 12 | How far back to set analyzer reference time |
| `INVESTIGATION_WINDOW_START_MONTHS` | int | 18 | Investigation window start (months ago) |
| `INVESTIGATION_WINDOW_END_MONTHS` | int | 12 | Investigation window end (months ago) |
| `SAVED_FRAUD_GMV_START_MONTHS` | int | 12 | Saved Fraud GMV window start |
| `SAVED_FRAUD_GMV_END_MONTHS` | int | 6 | Saved Fraud GMV window end |
| `REVENUE_TAKE_RATE_PERCENT` | float | 0.75 | Take rate percentage |
| `REVENUE_LIFETIME_MULTIPLIER` | float | 1.0 | Lifetime value multiplier (1, 4, or 6) |

## Complexity Tracking

> No constitution violations to justify.

## Implementation Phases

### Phase 1: Backend Configuration & Data Model
- Create revenue configuration module
- Create RevenueImplication data model
- Add revenue fields to investigation progress schema

### Phase 2: Time Window Adjustment
- Modify `auto_comparison.py` to use configurable historical offsets
- Update time window calculations for analyzer and investigation

### Phase 3: Revenue Calculator Service
- Implement Saved Fraud GMV calculation
- Implement Lost Revenues calculation
- Implement Net Value calculation
- Add confidence level logic

### Phase 4: Integration
- Hook revenue calculation into investigation completion flow
- Update on-demand startup report to include revenue data
- Store revenue data with investigation state

### Phase 5: Frontend Display (Future)
- Add revenue columns to ParallelInvestigationsPage
- Create RevenueMetrics component
- Update aggregate report with revenue totals

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Historical data unavailable | Graceful handling with skip + warning |
| Large GMV sums causing overflow | Use Decimal type for calculations |
| Take rate changes mid-analysis | Store take rate used with each calculation |
| Snowflake query performance | Use batching and concurrent limits |

## Next Steps

Run `/speckit.tasks` to generate detailed implementation tasks for each phase.
