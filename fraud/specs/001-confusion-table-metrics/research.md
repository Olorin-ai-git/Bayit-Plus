# Research: Confusion Table Metrics

**Feature**: Confusion Table Metrics  
**Date**: 2025-11-16  
**Phase**: 0 - Research

## Codebase Analysis

### Existing Infrastructure Identified

#### Backend Infrastructure

1. **Startup Analysis Flow** (`app/service/__init__.py`)
   - Current location: Lines 517-543
   - Condition: `if auto_run_startup_analysis:` (line 518)
   - Calls: `run_auto_comparisons_for_top_entities()` with `top_n=3`
   - Issue: Currently conditional on `auto_run_startup_analysis` flag - needs to be unconditional per FR-001
   - Modification needed: Remove conditional check, always execute when risk analyzer returns entities

2. **Auto Comparison Service** (`app/service/investigation/auto_comparison.py`)
   - Function: `run_auto_comparisons_for_top_entities()` (lines 1284-1376)
   - Current behavior: Checks if `risk_analyzer_results.get('status') != 'success'` and returns empty list
   - Issue: Early return prevents execution - needs modification to always run for top 3 entities
   - Modification needed: Remove early return conditions, always process top 3 entities

3. **Investigation Transaction Mapper** (`app/service/investigation/investigation_transaction_mapper.py`)
   - Function: `map_investigation_to_transactions()` (lines 54-213)
   - Current behavior: Maps investigation risk_score to transactions as `predicted_risk`
   - Missing: Fraud classification logic based on threshold comparison
   - Modification needed: Add logic to classify transactions as "Fraud" if `investigation_risk_score >= RISK_THRESHOLD_DEFAULT`, else "Not Fraud"

4. **Comparison Service** (`app/service/investigation/comparison_service.py`)
   - Function: `compute_confusion_matrix()` (referenced in existing code)
   - Current behavior: Calculates TP/FP/TN/FN for comparison windows
   - Missing: Aggregation across multiple entities for startup report
   - Modification needed: Add function to aggregate confusion matrix metrics across all investigated entities

5. **SQL Query Builders** (Multiple locations - CRITICAL)
   - `app/service/investigation/query_builder.py` (lines 18-67)
     - Current: Includes `MODEL_SCORE` and `IS_FRAUD_TX` in SELECT (lines 34-35, 40-41, 61-62)
     - Issue: These columns are included in comparison queries
   - `app/service/agent/tools/snowflake_tool/query_builder.py` (lines 77-133)
     - Current: Uses `EVIDENCE_FIELD_COLLECTIONS` which may include MODEL_SCORE/IS_FRAUD_TX
     - Issue: Investigation queries may include these columns
   - `app/service/agent/tools/snowflake_tool/snowflake_tool.py` (lines 180-229)
     - Current: Uses `REAL_COLUMNS` or `PRIORITY_EVIDENCE_FIELDS` which include MODEL_SCORE/IS_FRAUD_TX
     - Issue: Comprehensive investigation queries include these columns
   - Modification needed: **CRITICAL** - Remove MODEL_SCORE and IS_FRAUD_TX from ALL SELECT clauses in investigation queries

6. **Startup Report Generator** (`app/service/reporting/startup_report_generator.py`)
   - Function: `generate_startup_report()` (lines 21-112)
   - Current behavior: Generates HTML report with risk entities and comparison results
   - Missing: Confusion table section with aggregated metrics
   - Modification needed: Add confusion table section showing TP, FP, TN, FN and derived metrics (precision, recall, F1, accuracy)

7. **Risk Analyzer** (`app/service/analytics/risk_analyzer.py`)
   - Function: `get_top_risk_entities()` (lines 114-513)
   - Current behavior: Returns top riskiest entities based on risk-weighted value
   - Status: ✅ No changes needed - already returns entities list

8. **Domain Agents** (`app/service/agent/orchestration/domain_agents/base.py`)
   - Current behavior: Domain agents query transaction data for analysis
   - Issue: May reference MODEL_SCORE or IS_FRAUD_TX in queries
   - Modification needed: Ensure domain agent queries exclude MODEL_SCORE and IS_FRAUD_TX

### Database Schema Analysis

#### Transaction Table Structure
- **Snowflake**: `DBT.DBT_PROD.TXS` (or configured schema)
- **PostgreSQL**: `transactions_enriched` or similar

#### Key Columns for Confusion Matrix
- `IS_FRAUD_TX` / `is_fraud_tx`: Ground truth (boolean, 0/1 or NULL)
  - **CRITICAL**: Must be excluded from investigation queries but used for comparison
  - **Usage**: Only queried AFTER investigation completes for ground truth comparison
- `MODEL_SCORE` / `model_score`: Existing model prediction (0.0-1.0)
  - **CRITICAL**: Must be excluded from investigation queries
  - **Usage**: Not used in investigation - only for reference in comparison reports
- `TX_DATETIME` / `tx_datetime`: Transaction timestamp
- `TX_ID_KEY` / `tx_id_key`: Transaction identifier

### Technical Decisions

#### Investigation Query Exclusion Strategy
- **Approach**: Filter out MODEL_SCORE and IS_FRAUD_TX at query builder level
- **Implementation**: 
  1. Create exclusion list in query builders
  2. Filter columns before building SELECT clauses
  3. Add validation to ensure these columns never appear in investigation queries
- **Verification**: Query log analysis to confirm exclusion

#### Fraud Classification Logic
- **Threshold**: `RISK_THRESHOLD_DEFAULT` environment variable (default: 0.3)
- **Logic**: 
  - If `investigation_risk_score >= RISK_THRESHOLD_DEFAULT` → "Fraud"
  - Else → "Not Fraud"
- **Edge Cases**:
  - `investigation_risk_score = None` → Extract from `domain_findings.risk.risk_score`
  - If still None → "Not Fraud" (below threshold)
  - `investigation_risk_score = 0.0` → Check `domain_findings.risk.risk_score` first

#### Confusion Matrix Calculation
- **TP**: `predicted_risk >= threshold` AND `IS_FRAUD_TX = 1`
- **FP**: `predicted_risk >= threshold` AND `IS_FRAUD_TX = 0`
- **TN**: `predicted_risk < threshold` AND `IS_FRAUD_TX = 0`
- **FN**: `predicted_risk < threshold` AND `IS_FRAUD_TX = 1`
- **Exclusion**: Transactions with `IS_FRAUD_TX = NULL` are excluded from all categories

#### Ground Truth Retrieval
- **Timing**: Query `IS_FRAUD_TX` AFTER investigation completes
- **Window**: Use investigation window end date as reference point
- **Query**: Separate query to fetch `IS_FRAUD_TX` values for transactions in investigation window
- **Timezone**: Normalize all timestamps to UTC before comparison

### Integration Points

#### Startup Analysis Flow Integration
1. **Risk Analyzer** → Returns top entities
2. **Auto Comparison** → Runs investigations (unconditionally for top 3)
3. **Investigation Execution** → Queries exclude MODEL_SCORE/IS_FRAUD_TX
4. **Transaction Mapping** → Classifies transactions based on investigation risk_score
5. **Comparison Service** → Calculates confusion matrix per entity
6. **Report Generator** → Aggregates and displays confusion table

#### Report Display Integration
- **Location**: Startup analysis report HTML
- **Section**: New "Confusion Matrix Metrics" section
- **Content**: 
  - Aggregated TP, FP, TN, FN across all 3 entities
  - Derived metrics: Precision, Recall, F1 Score, Accuracy
  - Per-entity breakdown (optional, collapsible)
- **Styling**: Match existing report styling (Olorin branding)

### Dependencies and Constraints

#### Environment Variables
- `RISK_THRESHOLD_DEFAULT`: Fraud classification threshold (default: 0.3)
- `AUTO_RUN_STARTUP_ANALYSIS`: Controls startup analysis execution (but top 3 should always run when enabled)
- `DATABASE_PROVIDER`: Snowflake or PostgreSQL (affects column naming)

#### Performance Considerations
- Confusion matrix calculation: O(n) where n = number of transactions
- Aggregation: O(m) where m = number of entities (3)
- Target: <5 seconds for calculation after investigations complete

#### Error Handling
- Failed investigations: Log warning, exclude from confusion matrix, continue with remaining entities
- NULL IS_FRAUD_TX: Exclude from confusion matrix calculations
- Missing risk scores: Attempt extraction from domain_findings, default to "Not Fraud" if unavailable

### Reusable Components

1. **Precision/Recall Calculator** (`app/service/analytics/precision_recall.py`)
   - Existing confusion matrix calculation logic
   - Can be adapted for investigation-based predictions

2. **Comparison Service** (`app/service/investigation/comparison_service.py`)
   - Existing confusion matrix computation
   - Needs extension for multi-entity aggregation

3. **Report Generator Utilities** (`app/service/reporting/startup_report_generator.py`)
   - Existing HTML generation patterns
   - Can add confusion table section following existing structure

4. **Database Provider Abstraction** (`app/service/agent/tools/database_tool/database_provider.py`)
   - Existing query execution infrastructure
   - Column name mapping (uppercase for Snowflake, lowercase for PostgreSQL)

### Gaps and Risks

#### Critical Gaps
1. **Query Exclusion**: No existing mechanism to exclude columns from investigation queries
   - **Risk**: MODEL_SCORE/IS_FRAUD_TX may leak into investigation queries
   - **Mitigation**: Implement column filtering in all query builders

2. **Fraud Classification**: No existing logic to classify transactions based on investigation risk_score
   - **Risk**: Cannot build confusion matrix without classification
   - **Mitigation**: Add classification logic to transaction mapper

3. **Multi-Entity Aggregation**: No existing logic to aggregate confusion matrix across entities
   - **Risk**: Cannot display aggregated metrics in startup report
   - **Mitigation**: Add aggregation function to comparison service

#### Medium Risks
1. **Performance**: Aggregating confusion matrix across 3 entities may be slow
   - **Mitigation**: Use efficient data structures, batch queries

2. **Edge Cases**: NULL IS_FRAUD_TX, missing risk scores, failed investigations
   - **Mitigation**: Comprehensive error handling and logging

### Next Steps

1. **Phase 1 Design**: 
   - Design data models for confusion matrix metrics
   - Design query exclusion mechanism
   - Design fraud classification logic
   - Design report section structure

2. **Implementation Planning**:
   - Identify all query builder locations
   - Plan column exclusion implementation
   - Plan transaction classification implementation
   - Plan confusion matrix aggregation
   - Plan report section addition

