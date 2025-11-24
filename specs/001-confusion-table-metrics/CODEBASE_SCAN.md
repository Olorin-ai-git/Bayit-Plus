# Codebase Scan Summary: Confusion Table Metrics

**Date**: 2025-11-16  
**Purpose**: Comprehensive scan before implementation to prevent duplication and identify reusable components

## ✅ EXISTING INFRASTRUCTURE TO REUSE

### 1. Confusion Matrix Calculation (REUSE - DO NOT DUPLICATE)

**Location**: `olorin-server/app/service/investigation/metrics_calculation.py`

**Functions Available**:
- `compute_confusion_matrix(transactions, risk_threshold)` → Returns `(TP, FP, TN, FN, excluded_count)`
  - Lines 24-75
  - Already handles NULL actual_outcome (excludes from confusion matrix)
  - Already handles missing predicted_risk (excludes and counts)
  - ✅ REUSE THIS - DO NOT CREATE NEW FUNCTION

- `compute_derived_metrics(tp, fp, tn, fn, transactions, ci_confidence)` → Returns `(precision, recall, f1, accuracy, fraud_rate, pending_count, ci_dict, support_dict, power_dict)`
  - Lines 78-169
  - Already has divide-by-zero guards
  - Already calculates confidence intervals
  - ✅ REUSE THIS - DO NOT CREATE NEW FUNCTION

### 2. Existing Models (EXTEND - DO NOT DUPLICATE)

**Location**: `olorin-server/app/router/models/investigation_comparison_models.py`

**Existing Models**:
- `ConfusionMatrix` (lines 129-135) - Minimal, only TP/FP/TN/FN
- `WindowMetrics` (lines 172-197) - Full metrics including TP/FP/TN/FN, precision, recall, f1, accuracy
- `ComparisonResponse` (lines 237-259) - Complete comparison response structure

**Action Required**:
- ✅ EXTEND `ConfusionMatrix` model to include metadata (entity_type, entity_id, investigation_id, window info, etc.)
- ✅ CREATE NEW `AggregatedConfusionMatrix` model for aggregation
- ✅ CREATE NEW `FraudClassification` model for transaction-level classification

### 3. Transaction Mapping (EXTEND - DO NOT DUPLICATE)

**Location**: `olorin-server/app/service/investigation/investigation_transaction_mapper.py`

**Existing Function**:
- `map_investigation_to_transactions(investigation, window_start, window_end, entity_type, entity_id)` → Returns `(transactions, source, predicted_risk)`
  - Lines 54-213
  - Already extracts risk_score from investigation (with fallback to domain_findings.risk.risk_score)
  - Already maps predicted_risk to transactions
  - Already handles entity labels

**Action Required**:
- ✅ ADD fraud classification logic (predicted_label: 'Fraud' or 'Not Fraud' based on threshold)
- ✅ ADD APPROVED transaction filter (NSURE_LAST_DECISION = 'APPROVED')
- ✅ ADD function to query IS_FRAUD_TX for ground truth comparison

### 4. Startup Flow (MODIFY - DO NOT DUPLICATE)

**Location**: `olorin-server/app/service/__init__.py`

**Current State**:
- Lines 517-543: Conditional check `if auto_run_startup_analysis:` at line 518
- Calls `run_auto_comparisons_for_top_entities()` with `top_n=3`

**Action Required**:
- ✅ REMOVE conditional check - always execute when risk analyzer returns entities
- ✅ Ensure unconditional execution

**Location**: `olorin-server/app/service/investigation/auto_comparison.py`

**Current State**:
- Lines 1284-1376: `run_auto_comparisons_for_top_entities()` function
- Lines 1300-1307: Early return checks that prevent execution

**Action Required**:
- ✅ REMOVE early return conditions (lines 1300-1302, 1305-1307)
- ✅ Always process top N entities (handle edge cases: 0, 1, 2 entities gracefully)

### 5. Query Builders (MODIFY - CRITICAL FOR EXCLUSION)

**Multiple Locations Need Modification**:

#### A. `app/service/investigation/query_builder.py`
- Lines 34-35, 40-41, 61-62: Includes MODEL_SCORE and IS_FRAUD_TX in SELECT
- **Action**: ✅ ADD column exclusion logic to filter out MODEL_SCORE and IS_FRAUD_TX during investigation

#### B. `app/service/agent/tools/snowflake_tool/query_builder.py`
- Lines 31-36, 48, 60: EVIDENCE_FIELD_COLLECTIONS includes MODEL_SCORE and IS_FRAUD_TX
- **Action**: ✅ ADD exclusion filter in `build_investigation_query()` method

#### C. `app/service/agent/tools/snowflake_tool/snowflake_tool.py`
- Lines 49-52: RISK_ANALYSIS_FIELDS includes MODEL_SCORE and IS_FRAUD_TX
- Lines 90-99: REAL_COLUMNS includes RISK_ANALYSIS_FIELDS
- Lines 180-229: `build_comprehensive_investigation_query()` uses REAL_COLUMNS
- **Action**: ✅ ADD exclusion filter in query building methods

#### D. `app/service/agent/orchestration/hybrid/graph/nodes/investigation_nodes.py`
- Lines 288-289, 311-312: SELECT includes IS_FRAUD_TX and MODEL_SCORE
- **Action**: ✅ REMOVE these columns from SELECT during investigation

### 6. Reporting (EXTEND - DO NOT DUPLICATE)

**Location**: `olorin-server/app/service/reporting/startup_report_generator.py`

**Existing Function**:
- `generate_startup_report(app_state, output_path, startup_duration_seconds, reports_dir)` → Returns Path
  - Lines 21-113
  - Already generates comprehensive HTML reports
  - Already includes comparison results

**Action Required**:
- ✅ ADD `_generate_confusion_table_section()` function
- ✅ INTEGRATE confusion table into existing report structure
- ✅ REUSE existing HTML generation patterns and styling

### 7. Comparison Service (EXTEND - DO NOT DUPLICATE)

**Location**: `olorin-server/app/service/investigation/comparison_service.py`

**Existing Function**:
- `compare_windows(request)` → Returns ComparisonResponse
  - Lines 54-440
  - Already uses `compute_confusion_matrix()` and `compute_derived_metrics()`
  - Already calculates metrics per window

**Action Required**:
- ✅ ADD `aggregate_confusion_matrices()` function to aggregate across entities
- ✅ REUSE existing `compute_confusion_matrix()` and `compute_derived_metrics()` functions

## 🚫 CRITICAL: NO DUPLICATION

### Functions That MUST Be Reused (Not Created):

1. ✅ `compute_confusion_matrix()` - EXISTS in `metrics_calculation.py`
2. ✅ `compute_derived_metrics()` - EXISTS in `metrics_calculation.py`
3. ✅ `map_investigation_to_transactions()` - EXISTS in `investigation_transaction_mapper.py` (extend, don't duplicate)
4. ✅ `generate_startup_report()` - EXISTS in `startup_report_generator.py` (extend, don't duplicate)

### Models That MUST Be Extended (Not Created):

1. ✅ `ConfusionMatrix` - EXISTS but minimal (extend with metadata)
2. ✅ `WindowMetrics` - EXISTS with full metrics (can reuse structure)

## 📋 IMPLEMENTATION STRATEGY

### Phase 1: Foundational (Data Models)
- EXTEND `ConfusionMatrix` model in `investigation_comparison_models.py`
- CREATE `AggregatedConfusionMatrix` model (new)
- CREATE `FraudClassification` model (new)
- CREATE `InvestigationQueryConfig` helper class (new)

### Phase 2-6: User Stories
- MODIFY existing functions (don't duplicate)
- EXTEND existing functions (add new logic)
- REUSE existing calculation functions

### Key Principle:
**REUSE > EXTEND > CREATE**

## 🔍 VERIFICATION CHECKLIST

Before implementing each task:
- [ ] Check if function already exists
- [ ] Check if model already exists
- [ ] Verify no duplication planned
- [ ] Map task to existing infrastructure
- [ ] Confirm integration approach

## 📊 FILES TO MODIFY (No New Files Needed)

1. `app/router/models/investigation_comparison_models.py` - Add new models
2. `app/service/__init__.py` - Remove conditional check
3. `app/service/investigation/auto_comparison.py` - Remove early returns
4. `app/service/investigation/investigation_transaction_mapper.py` - Add classification + APPROVED filter
5. `app/service/investigation/comparison_service.py` - Add aggregation function
6. `app/service/investigation/query_builder.py` - Add exclusion logic
7. `app/service/agent/tools/snowflake_tool/query_builder.py` - Add exclusion logic
8. `app/service/agent/tools/snowflake_tool/snowflake_tool.py` - Add exclusion logic
9. `app/service/agent/orchestration/hybrid/graph/nodes/investigation_nodes.py` - Remove columns from SELECT
10. `app/service/reporting/startup_report_generator.py` - Add confusion table section

## ✅ CONSTITUTIONAL COMPLIANCE VERIFIED

- ✅ Zero-tolerance duplication policy - All existing functions identified for reuse
- ✅ No hardcoded values - All config from environment variables
- ✅ Complete implementations only - No stubs/mocks/TODOs planned
- ✅ File size limit - All files <200 lines (will split if needed)
- ✅ Use existing infrastructure - All tasks mapped to existing code

