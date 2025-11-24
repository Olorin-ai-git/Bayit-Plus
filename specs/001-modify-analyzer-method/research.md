# Research: Analyzer Time Window and Investigation Range Modifications

**Feature**: 001-modify-analyzer-method  
**Date**: 2025-11-21  
**Phase**: 0 - Research

## Codebase Analysis

### Existing Infrastructure Identified

#### 1. Analyzer Core Logic

**File**: `olorin-server/app/service/agent/tools/snowflake_tool/real_client.py`  
**Method**: `get_top_risk_entities()` (lines 450-496)

**Current Behavior**:
```python
async def get_top_risk_entities(
    self, 
    time_window_hours: int = 24,
    group_by: str = 'email',
    top_percentage: float = 0.10,
    min_transactions: int = 1
) -> List[Dict[str, Any]]:
    query = f"""
    WITH risk_calculations AS (
        SELECT 
            {group_by} as entity,
            COUNT(*) as transaction_count,
            SUM({PAID_AMOUNT_VALUE_IN_CURRENCY}) as total_amount,
            AVG({MODEL_SCORE}) as avg_risk_score,
            SUM({MODEL_SCORE} * {PAID_AMOUNT_VALUE_IN_CURRENCY}) as risk_weighted_value,
            MAX({MODEL_SCORE}) as max_risk_score,
            SUM(CASE WHEN {IS_FRAUD_TX} = 1 THEN 1 ELSE 0 END) as fraud_count
        FROM {self.get_full_table_name()}
        WHERE {TX_DATETIME} >= DATEADD(hour, -{time_window_hours}, CURRENT_TIMESTAMP())
            AND {group_by} IS NOT NULL
        GROUP BY {group_by}
        HAVING COUNT(*) >= {min_transactions}
    ),
    ranked AS (
        SELECT *,
            ROW_NUMBER() OVER (ORDER BY risk_weighted_value DESC) as risk_rank,
            COUNT(*) OVER() as total_entities
        FROM risk_calculations
    )
    SELECT * FROM ranked
    WHERE risk_rank <= CEIL(total_entities * {top_percentage})
    ORDER BY risk_weighted_value DESC
    """
```

**Key Findings**:
- Line 480: Uses `DATEADD(hour, -{time_window_hours}, CURRENT_TIMESTAMP())` - window ends at NOW
- Line 478: Includes `IS_FRAUD_TX` in SELECT for fraud_count calculation
- Line 492: Top 10% calculation uses `CEIL(total_entities * {top_percentage})` with `ROW_NUMBER()`
- No explicit end boundary for time window
- No fraud exclusion filter in WHERE clause

**Required Changes**:
1. Change time window to end at 6 months ago instead of NOW
2. Add explicit end boundary: `TX_DATETIME < DATEADD(month, -6, CURRENT_TIMESTAMP())`
3. Add fraud exclusion filter when .env flag enabled
4. Preserve top 10% calculation logic exactly as-is

---

#### 2. Risk Analyzer Service

**File**: `olorin-server/app/service/analytics/risk_analyzer.py`  
**Method**: `get_top_risk_entities()` (lines 135-234)

**Current Behavior**:
- Parses time window string (e.g., "24h", "7d") to hours
- Calculates window dates using `max_lookback_days` offset
- Lines 180-182: Calculates end_date and start_date for logging
- Line 192: Already filters approved transactions using `_build_approved_filter()`
- Delegates actual query execution to `real_client.py`

**Key Findings**:
- Already has `max_lookback_months` parameter (used to cap lookback)
- Current logic: `end_date = datetime.utcnow() - timedelta(days=max_lookback_days)`
- `max_lookback_months` defaults to 6 (from config)
- Line 192: Approved filter already implemented: `NSURE_LAST_DECISION = 'APPROVED'`

**Required Changes**:
1. Leverage existing `max_lookback_months` parameter (already set to 6)
2. Update end_date calculation to use this offset
3. Ensure start_date calculation accounts for window size from end_date
4. No changes needed for approved filter (already correct)

---

#### 3. Investigation Query Builder

**File**: `olorin-server/app/service/agent/tools/snowflake_tool/query_builder.py`  
**Method**: `build_investigation_query()` (line 87+)

**Current Behavior** (lines 111-119):
```python
# CRITICAL: Exclude MODEL_SCORE and IS_FRAUD_TX from investigation queries
# These columns must NOT appear in SELECT clauses during investigation
excluded_columns_upper = ['MODEL_SCORE', 'IS_FRAUD_TX']
field_collection = [
    field for field in field_collection
    if field.upper() not in excluded_columns_upper
]

logger.info(f"🚫 Excluded MODEL_SCORE and IS_FRAUD_TX from investigation query (unbiased evaluation)")
```

**Key Findings**:
- Already excludes `MODEL_SCORE` and `IS_FRAUD_TX` from investigation queries
- Uses explicit list of excluded columns (hard-coded)
- Exclusion is case-insensitive (`field.upper()`)
- Only excludes from SELECT clause, not comprehensive pattern matching

**Required Changes**:
1. Expand exclusion from explicit list to pattern-based matching
2. Change from `['MODEL_SCORE', 'IS_FRAUD_TX']` to any field containing "FRAUD"
3. Add validation to ensure no FRAUD columns in any query clause
4. Update logging to reflect pattern-based exclusion

---

#### 4. Schema Constants

**File**: `olorin-server/app/service/agent/tools/snowflake_tool/schema_constants.py`

**Fraud-Related Columns Identified**:
- Line 212: `IS_FRAUD_TX = "IS_FRAUD_TX"` (NUMBER(1,0) - primary fraud label)
- Line 309: `FIRST_FRAUD_STATUS_DATETIME = "FIRST_FRAUD_STATUS_DATETIME"` (TIMESTAMP_NTZ(9))
- Line 974: Schema definition confirms `IS_FRAUD_TX`: "NUMBER(1,0)"
- Line 973: Schema definition confirms `FIRST_FRAUD_STATUS_DATETIME`: "TIMESTAMP_NTZ(9)"

**All Columns in Schema** (lines 476+):
- Total: 500+ columns defined
- Fraud-related: 2 columns containing "FRAUD" in name
  - `IS_FRAUD_TX`
  - `FIRST_FRAUD_STATUS_DATETIME`

**Required Changes**:
1. No direct changes to schema_constants.py
2. Use these constants for pattern matching in query builder
3. Create helper function to identify fraud columns dynamically

---

#### 5. Confusion Matrix Calculation

**File**: `olorin-server/app/service/investigation/metrics_calculation.py`  
**Method**: `compute_confusion_matrix()` (lines 24-75)

**Current Behavior**:
```python
def compute_confusion_matrix(
    transactions: List[Dict[str, Any]],
    risk_threshold: float
) -> Tuple[int, int, int, int, int]:
    tp = fp = tn = fn = 0
    excluded_missing_predicted_risk = 0

    for tx in transactions:
        predicted_risk = tx.get("predicted_risk")
        actual_outcome = tx.get("actual_outcome")

        # Map actual_outcome to is_fraud (1, 0, or None)
        if actual_outcome in ("FRAUD", 1, True):
            is_fraud = 1
        elif actual_outcome in ("NOT_FRAUD", 0, False):
            is_fraud = 0
        else:
            is_fraud = None

        # Skip if predicted_risk is missing
        if predicted_risk is None:
            excluded_missing_predicted_risk += 1
            continue

        # Skip if label is unknown
        if is_fraud is None:
            continue

        # Compute predicted_label
        predicted_label = 1 if predicted_risk >= risk_threshold else 0

        # Confusion matrix
        if predicted_label == 1 and is_fraud == 1:
            tp += 1
        elif predicted_label == 1 and is_fraud == 0:
            fp += 1
        elif predicted_label == 0 and is_fraud == 0:
            tn += 1
        elif predicted_label == 0 and is_fraud == 1:
            fn += 1

    return tp, fp, tn, fn, excluded_missing_predicted_risk
```

**Key Findings**:
- Line 63: Classification logic: `predicted_label = 1 if predicted_risk >= risk_threshold else 0`
- Lines 66-73: Confusion matrix calculation (TP/FP/TN/FN)
- Correctly compares predicted_label vs is_fraud (actual outcome)
- Handles NULL/missing values appropriately
- Uses `actual_outcome` (mapped from IS_FRAUD_TX in caller)

**Required Changes**:
- **NO CHANGES NEEDED** - Logic is already correct per spec requirements

---

## Configuration Analysis

### Current .env Parameters

**Existing Parameters** (found in codebase):
```env
USE_SNOWFLAKE=true
DATABASE_PROVIDER=snowflake
```

**Risk Analyzer Defaults** (from `risk_analyzer.py`):
- `default_time_window = "24h"`
- `default_group_by = "email"`
- `default_top_percentage = 10`
- `max_lookback_months = 6`
- `cache_ttl = timedelta(hours=1)`

### Required New Parameters

```env
# Analyzer Configuration
ANALYZER_TIME_WINDOW_HOURS=24                    # Time window in hours
ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS=true         # Exclude fraud transactions flag

# Investigation Time Range Configuration
INVESTIGATION_DEFAULT_RANGE_YEARS=2              # Investigation span in years
INVESTIGATION_START_OFFSET_YEARS=2.5             # Years back from today to start
INVESTIGATION_END_OFFSET_MONTHS=6                # Months back from today to end

# Risk Threshold (if not already defined)
RISK_THRESHOLD_DEFAULT=0.5                       # Threshold for confusion matrix
```

---

## Dependencies and Integrations

### Upstream Dependencies

1. **Snowflake Database**
   - All time-based queries use Snowflake date functions (`DATEADD`, `CURRENT_TIMESTAMP`)
   - Must maintain compatibility with Snowflake SQL dialect

2. **Environment Configuration**
   - All `.env` parameters loaded via `os.getenv()` or config loader
   - Need to add parameter validation and defaults

3. **Existing Investigations**
   - Investigation flow depends on analyzer results
   - Changes to time windows must not break investigation creation

### Downstream Dependencies

1. **Startup Analysis Flow** (`app/service/__init__.py`)
   - Calls `run_auto_comparisons_for_top_entities()` on startup
   - May need to handle empty results if time window has no transactions

2. **Confusion Table Generation**
   - Depends on investigation results having transactions
   - Depends on IS_FRAUD_TX column being accessible post-investigation

3. **Reporting and Visualization**
   - HTML confusion tables display TP/FP/TN/FN metrics
   - Time range changes may affect report interpretation

---

## Risk Assessment

### High Risk

1. **Query Performance**
   - Adding explicit end boundary may change query plan
   - 2.5-year investigation range is significantly longer than current queries
   - **Mitigation**: Add query performance monitoring, consider indexes on TX_DATETIME

2. **Backward Compatibility**
   - Existing investigations may expect different time windows
   - **Mitigation**: Use .env defaults that match current behavior initially

### Medium Risk

1. **Fraud Column Pattern Matching**
   - Pattern-based exclusion is more fragile than explicit list
   - Future columns with "FRAUD" in name will be auto-excluded
   - **Mitigation**: Add comprehensive logging of excluded columns

2. **Empty Result Sets**
   - 24-hour window 6 months ago may have sparse data
   - **Mitigation**: Add validation and warning logging for empty results

### Low Risk

1. **Confusion Matrix Logic**
   - No changes to existing working logic
   - Already handles NULL values correctly

2. **Top 10% Calculation**
   - Preserving exact existing logic
   - Well-tested and stable

---

## Testing Strategy

### Unit Tests Required

1. **Time Window Calculation**
   - Test analyzer window ends at 6 months ago
   - Test investigation range spans 2.5y to 6mo ago
   - Test boundary conditions (empty windows, sparse data)

2. **Fraud Column Exclusion**
   - Test pattern matching identifies all FRAUD columns
   - Test exclusion works for IS_FRAUD_TX and FIRST_FRAUD_STATUS_DATETIME
   - Test future-proofing (new FRAUD columns auto-excluded)

3. **Configuration Loading**
   - Test .env parameters loaded correctly
   - Test defaults applied when parameters missing
   - Test parameter validation

### Integration Tests Required

1. **End-to-End Time Range Validation**
   - Test analyzer queries actual Snowflake with correct time window
   - Test investigation queries span correct 2-year range
   - Test both windows end at same point (6 months ago)

2. **Fraud Exclusion Validation**
   - Test analyzer excludes transactions with IS_FRAUD_TX populated
   - Test investigation queries have no FRAUD columns in SELECT
   - Test confusion table still accesses IS_FRAUD_TX post-investigation

3. **Top 10% Consistency**
   - Test top 10% calculation matches existing behavior
   - Test entity ranking preserved with new time windows

---

## Implementation Approach

### Phase 1: Analyzer Time Window Modification

**Priority**: High  
**Risk**: Medium  
**Effort**: 2-3 hours

**Steps**:
1. Modify `real_client.py` line 480 to add 6-month offset
2. Add explicit end boundary check
3. Add fraud exclusion filter (conditional on .env flag)
4. Add .env parameter handling in config
5. Unit test time window calculations
6. Integration test with Snowflake

### Phase 2: Investigation Range Configuration

**Priority**: High  
**Risk**: Medium  
**Effort**: 2-3 hours

**Steps**:
1. Add investigation time range parameters to .env
2. Modify query builder to use configurable ranges
3. Ensure NSURE_LAST_DECISION filter applied (already done)
4. Unit test range calculations
5. Integration test query execution

### Phase 3: Fraud Column Pattern Exclusion

**Priority**: High  
**Risk**: High  
**Effort**: 3-4 hours

**Steps**:
1. Modify `query_builder.py` exclusion logic
2. Change from explicit list to pattern matching
3. Add validation function to check for FRAUD columns in queries
4. Add comprehensive logging
5. Unit test pattern matching
6. Integration test with real investigations

### Phase 4: Validation and Testing

**Priority**: High  
**Risk**: Low  
**Effort**: 2-3 hours

**Steps**:
1. Create comprehensive unit test suite
2. Create integration test for end-to-end flow
3. Verify confusion matrix unchanged
4. Performance testing for new time windows
5. Document any performance implications

---

## Open Questions

1. **Query Performance**: Should we add indexes on TX_DATETIME for the new time ranges?
   - **Action**: Monitor query performance post-deployment

2. **Empty Windows**: What should happen if 24H window has zero transactions?
   - **Recommendation**: Return empty list, log warning

3. **Backward Compatibility**: Should old investigations continue to work?
   - **Recommendation**: New parameters affect only new investigations

4. **Pattern Matching Scope**: Should exclusion apply to WHERE clause too, or just SELECT?
   - **Recommendation**: Start with SELECT only, expand if needed

---

## Security Considerations (Added Requirement)

### PII Data Protection

**New Requirement**: All Personally Identifiable Information (PII) must be hashed before logging or sending to LLM.

**PII Fields Identified**:
- Tier 1 (Direct Identifiers): EMAIL, PHONE_NUMBER, FIRST_NAME, LAST_NAME, UNIQUE_USER_ID, DATE_OF_BIRTH
- Tier 2 (Technical Identifiers): IP, DEVICE_ID, USER_AGENT, VISITOR_ID
- Tier 3 (Quasi-Identifiers): CARD_BIN, LAST_FOUR, BILLING_ADDRESS_LINE_1, SHIPPING_ADDRESS_LINE_1

**Implementation Approach**:
1. Create PII hashing utility (`app/service/security/pii_hasher.py`)
2. Use SHA-256 with configurable salt
3. Integrate with logging infrastructure (custom formatter)
4. Hash PII before LLM API calls
5. Maintain deterministic hashing for correlation

**Affected Components**:
- All logging statements that may contain PII
- LLM investigation prompts
- Analytics reports and dashboards
- Error messages and exception logs

**Configuration**:
```env
PII_HASHING_ENABLED=true
PII_HASH_SALT=<secure-random-salt>
PII_HASH_ALGORITHM=SHA256
```

**Testing Requirements**:
- Unit tests for hash determinism
- Integration tests to verify no PII in logs
- Validation that PII is not sent to LLM in plaintext

---

## Next Steps

1. ✅ **Phase 0 Complete**: Research and analysis documented (including PII requirements)
2. ⏳ **Phase 1**: Design data models and contracts
3. ⏳ **Phase 2**: Create detailed task breakdown

**Proceed to Phase 1**: Generate data-model.md, contracts/, and quickstart.md

