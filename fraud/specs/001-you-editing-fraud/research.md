# Research: Investigation Comparison Pipeline

**Feature**: Investigation Comparison Pipeline  
**Date**: 2025-01-27  
**Phase**: 0 - Research

## Codebase Analysis

### Existing Infrastructure Identified

#### Backend Infrastructure
1. **Database Provider Abstraction** (`app/service/agent/tools/database_tool/database_provider.py`)
   - Abstract interface for Snowflake/PostgreSQL
   - Methods: `execute_query()`, `get_full_table_name()`
   - Column name mapping (uppercase for Snowflake, lowercase for PostgreSQL)

2. **Precision/Recall Calculator** (`app/service/analytics/precision_recall.py`)
   - Existing confusion matrix calculation logic
   - Handles TP/FP/TN/FN computation
   - Can be adapted for window-based comparison

3. **Metrics Calculator** (`app/service/analytics/metrics_calculator.py`)
   - Fraud metrics computation
   - Integrates with precision/recall calculator
   - Pattern for derived metrics (precision, recall, F1)

4. **Router Patterns** (`app/router/investigation_api.py`, `app/service/router/router_config.py`)
   - FastAPI router registration pattern
   - Pydantic model validation
   - Error handling with ErrorResponse model

5. **Time Window Patterns** (`app/service/anomaly/data/windows.py`)
   - Window computation logic exists
   - Timezone handling (UTC conversion)
   - Date range filtering patterns

6. **Entity Filtering** (`app/service/agent/tools/snowflake_tool/query_builder.py`)
   - Entity type to column mapping
   - WHERE clause construction
   - Email normalization patterns

7. **Artifact Persistence** (`docs/investigation-storage-locations.md`)
   - Artifacts directory: `artifacts/` at olorin-server root (per spec FR-016)
   - Note: Existing investigation storage uses `logs/investigations/` but comparison artifacts use dedicated `artifacts/` directory
   - JSON persistence patterns exist

#### Frontend Infrastructure
1. **Export Utilities** (`olorin-front/src/microservices/analytics/services/exportService.ts`)
   - JSON/CSV export patterns
   - Blob download utilities

2. **PII Masking** (`olorin-front/src/microservices/analytics/utils/piiMasking.ts`)
   - Email/phone/user ID masking functions
   - Role-based visibility patterns

3. **Chart Components** (Recharts usage in analytics microservice)
   - BarChart, LineChart patterns exist
   - Chart configuration examples

4. **Router Patterns** (`olorin-front/src/microservices/investigation/InvestigationApp.tsx`)
   - React Router setup
   - Route registration pattern

5. **API Service Patterns** (`olorin-front/src/microservices/investigation/services/investigationService.ts`)
   - BaseApiService extension
   - camelCase/snake_case transformation

### Database Schema Analysis

#### Transaction Table Structure
- **Snowflake**: `DBT.DBT_PROD.TXS` (or configured schema)
- **PostgreSQL**: `transactions_enriched` or `transaction_windows` view

#### Key Columns Identified
- `TX_ID_KEY` / `tx_id_key`: Primary key
- `TX_DATETIME` / `tx_datetime`: Event timestamp
- `MERCHANT_ID` / `merchant_id`: Merchant identifier
- `MODEL_SCORE` / `model_score`: Predicted risk (0.0-1.0)
- `IS_FRAUD_TX` / `is_fraud_tx`: Actual outcome (boolean)
- `EMAIL` / `email`, `EMAIL_NORMALIZED` / `email_normalized`: Email fields
- `PHONE_NUMBER` / `phone_number`: Phone field
- `DEVICE_ID` / `device_id`: Device identifier
- `IP` / `ip`: IP address
- `ACCOUNT_ID` / `account_id`: Account identifier
- `CARD_BIN` / `card_bin`, `LAST_FOUR` / `last_four`: Card fingerprint fields

### Technical Decisions

#### Window Computation
- **Timezone**: America/New_York (pytz)
- **Semantics**: Inclusive start, exclusive end
- **Default Presets**:
  - Recent 14d: today-14d to today (midnight boundaries)
  - Retro 14d 6mo back: recent_start - 180 days, same 14-day duration

#### Entity Normalization
- **Email**: Case-insensitive (LOWER() in SQL)
- **Phone**: E164 format (normalize before query)
- **Other entities**: As-is

#### Metrics Calculation
- **Confusion Matrix**: Known labels only (exclude NULL actual_outcome)
- **Derived Metrics**: Guard divide-by-zero (return 0.0 with warning)
- **Pending Labels**: Count separately, exclude from confusion matrix

#### Performance Considerations
- Query optimization: Use indexed columns (TX_DATETIME, entity fields)
- Batch processing: Compute histograms/timeseries in single query when possible
- Caching: Not required for initial implementation (real-time comparison)

### Dependencies to Add

#### Backend
- `pytz`: Timezone handling (may already be available)
- No new major dependencies required

#### Frontend
- `recharts`: Chart library (verify if already installed)
- No new major dependencies required

### Integration Points

1. **Database Provider**: Use existing `get_database_provider()` pattern
2. **Router Registration**: Add to `router_config.py` following existing pattern
3. **Frontend Route**: Add to `InvestigationApp.tsx` routes
4. **Export**: Reuse existing export utilities
5. **PII Masking**: Reuse existing masking utilities

### Risk Assessment

#### Low Risk
- Database query patterns well-established
- Router/API patterns consistent
- Frontend component patterns exist

#### Medium Risk
- Window computation edge cases (DST transitions, timezone boundaries)
- Large dataset performance (mitigated by entity filtering)
- Per-merchant breakdown scaling (capped at max_merchants)

#### Mitigation Strategies
- Comprehensive unit tests for window computation
- Query performance testing with realistic data volumes
- Graceful degradation for large merchant sets

## Conclusion

Existing infrastructure provides strong foundation:
- Database abstraction layer ready
- Metrics calculation patterns exist
- Frontend component patterns established
- Export and PII masking utilities available

Implementation can proceed with minimal new infrastructure, focusing on:
1. Window computation service (new, but simple)
2. Entity filtering service (new, adapts existing patterns)
3. Comparison orchestration (new, composes existing services)
4. Frontend comparison page (new UI, uses existing patterns)

