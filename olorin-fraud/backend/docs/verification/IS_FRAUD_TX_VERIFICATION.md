# IS_FRAUD_TX Usage Verification Report

## Summary
✅ **VERIFIED**: `IS_FRAUD_TX` is ONLY used by the risk analyzer when determining riskiest entities. It is NOT used in any SQL queries during the investigation itself.

---

## 1. Risk Analyzer Usage (✅ CORRECT - Entity Selection Only)

### Location: `app/service/analytics/risk_analyzer.py`

**Purpose**: Filter entities to only include those with at least one confirmed fraud transaction.

**Usage**: HAVING clause in entity selection query (NOT in investigation queries)

```python
# Line 644-645
if self.must_include_confirmed_fraud:
    confirmed_fraud_having = f"AND SUM(CASE WHEN {fraud_col} = 1 THEN 1 ELSE 0 END) > 0"
    logger.info(f"🔍 Extended filter enabled: Only including entities with at least one confirmed fraud transaction (IS_FRAUD_TX = 1)")

# Line 667 - Used in HAVING clause for entity filtering
HAVING COUNT(*) >= 1 {confirmed_fraud_having}
```

**Query Context**: This is part of the risk analyzer query that selects which entities to investigate. It runs BEFORE investigation starts.

**Status**: ✅ CORRECT - This is the intended use case.

---

## 2. Investigation Query Builder (✅ CORRECT - Explicitly Excludes IS_FRAUD_TX)

### Location: `app/service/investigation/query_builder.py`

**Purpose**: Build SQL queries for fetching transactions during investigation.

**Key Code**:
```python
# Line 63 - Parameter documentation
is_investigation: If True, exclude MODEL_SCORE and IS_FRAUD_TX (CRITICAL for unbiased investigation)

# Line 99-112 - Explicit exclusion logic
# CRITICAL: During investigation, exclude MODEL_SCORE and IS_FRAUD_TX to prevent contamination
select_parts = [
    f"{tx_id_col} as transaction_id",
    f"{merchant_col} as merchant_id",
    f"{datetime_col} as event_ts"
]

if not is_investigation:
    # For comparison queries (post-investigation), include IS_FRAUD_TX for ground truth
    select_parts.append(f"{actual_outcome_col} as actual_outcome")

# MODEL_SCORE is NEVER included (excluded during investigation and comparison)
# IS_FRAUD_TX is excluded during investigation, but included for comparison
```

**Status**: ✅ CORRECT - IS_FRAUD_TX is explicitly excluded from SELECT clauses during investigation.

---

## 3. Investigation Transaction Mapper (✅ CORRECT - No WHERE Clause Filtering)

### Location: `app/service/investigation/investigation_transaction_mapper.py`

**Purpose**: Map investigation results to transactions for comparison.

**Investigation Query** (Line 552-560):
```python
query = build_transaction_query(
    window_start,
    window_end,
    entity_clause,
    "",  # No merchant filter
    is_snowflake,
    db_provider=db_provider,
    is_investigation=True  # Exclude MODEL_SCORE and IS_FRAUD_TX during investigation
)

# Add APPROVED filter to WHERE clause
if 'WHERE' in query.upper():
    query = query.rstrip(';').rstrip() + f" AND {approved_filter}"
```

**WHERE Clause Contents**:
- Date range filters (`TX_DATETIME >= ... AND TX_DATETIME < ...`)
- Entity filter (`EMAIL_NORMALIZED = '...'`)
- Approved filter (`UPPER(NSURE_LAST_DECISION) = 'APPROVED'`)
- ❌ **NO IS_FRAUD_TX filter**

**Post-Investigation Query** (Line 115-122):
```python
# This query runs AFTER investigation completes - for comparison only
query = f"""
    SELECT
        {tx_id_col} as transaction_id,
        {is_fraud_col} as is_fraud_tx
    FROM {table_name}
    WHERE {tx_id_col} IN ('{transaction_ids_str}')
      AND {datetime_col} <= '{window_end_str}'
"""
```

**Status**: ✅ CORRECT - IS_FRAUD_TX is only queried AFTER investigation for comparison, not used as a filter during investigation.

---

## 4. Data Availability Check (✅ CORRECT - No IS_FRAUD_TX Filtering)

### Location: `app/service/investigation/data_availability_check.py`

**Purpose**: Check if transaction data exists before running comparison.

**Query** (Line 89-90):
```python
count_query_a = f"SELECT COUNT(*) as count FROM {table_name} WHERE {where_a}"
count_query_b = f"SELECT COUNT(*) as count FROM {table_name} WHERE {where_b}"
```

**WHERE Clause Contents**:
- Date range filters
- Entity filter
- Merchant filter (if provided)
- ❌ **NO IS_FRAUD_TX filter**

**Status**: ✅ CORRECT - No IS_FRAUD_TX filtering.

---

## 5. Agent Tools Query Builder (✅ CORRECT - Explicitly Excludes IS_FRAUD_TX)

### Location: `app/service/agent/tools/snowflake_tool/query_builder.py`

**Purpose**: Build optimized investigation queries for agents.

**Key Code** (Line 111-119):
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

**Status**: ✅ CORRECT - IS_FRAUD_TX is explicitly excluded from agent investigation queries.

---

## 6. Common Query Templates (✅ CORRECT - Not Used During Investigation)

### Location: `app/service/agent/tools/snowflake_tool/client.py` and `schema_info.py`

**Purpose**: Example query templates for documentation/helper functions.

**Example Query**:
```python
"fraud_transactions": f"""
    SELECT {TX_ID_KEY}, {EMAIL}, {NSURE_LAST_DECISION}, {MODEL_SCORE}, {IS_FRAUD_TX},
           {TX_DATETIME}, {PAID_AMOUNT_VALUE_IN_CURRENCY}
    FROM {get_full_table_name()}
    WHERE {IS_FRAUD_TX} = 1
    ORDER BY {TX_DATETIME} DESC
"""
```

**Usage**: These are helper methods (`get_common_query()`) that are NOT called during investigation. They are example templates only.

**Verification**: Searched codebase - no calls to `get_common_query("fraud_transactions")` during investigation flow.

**Status**: ✅ CORRECT - These are example queries, not used during investigation.

---

## 7. Agent Domain Agents (✅ CORRECT - Read IS_FRAUD_TX from Results, Don't Filter)

### Locations: 
- `app/service/agent/orchestration/domain_agents/merchant_validation.py`
- `app/service/agent/orchestration/domain_agents/merchant_agent.py`
- `app/service/agent/orchestration/risk/finalize.py`

**Usage**: These agents READ `IS_FRAUD_TX` values from query results (if present), but they do NOT filter queries by `IS_FRAUD_TX`.

**Example** (merchant_validation.py, Line 251):
```python
fraud_transactions = sum(1 for r in results if r.get("IS_FRAUD_TX") == 1 or r.get("IS_FRAUD_TX") == '1')
```

**Status**: ✅ CORRECT - Reading values from results (which are excluded during investigation anyway), not filtering queries.

---

## Conclusion

✅ **VERIFICATION COMPLETE**: 

1. **Risk Analyzer**: Uses `IS_FRAUD_TX` in HAVING clause to filter entities BEFORE investigation starts ✅
2. **Investigation Queries**: Explicitly exclude `IS_FRAUD_TX` from SELECT clauses ✅
3. **Investigation WHERE Clauses**: Do NOT filter by `IS_FRAUD_TX` ✅
4. **Post-Investigation**: `IS_FRAUD_TX` is queried AFTER investigation completes for comparison purposes only ✅

**The investigation is unbiased** - it does not use `IS_FRAUD_TX` to filter or influence the investigation process. The risk analyzer uses it only to select which entities to investigate (entities that have at least one confirmed fraud transaction), which is the intended behavior.

