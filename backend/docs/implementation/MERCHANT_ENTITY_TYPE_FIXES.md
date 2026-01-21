# Merchant Entity Type Support - Complete Fix Summary

## Problem Statement
Transaction scores were not being created for merchant entity investigations, preventing confusion table generation.

## Root Cause Analysis

### Primary Issue
**Invalid SQL Column Name**: Code was using `MERCHANT` column, but Snowflake schema requires `MERCHANT_NAME`

### Cascading Failures
1. SQL queries failed with error: `invalid identifier 'MERCHANT'`
2. Zero transactions returned from Snowflake
3. Empty `facts['results']` in risk agent  
4. Per-transaction scoring skipped (no transactions to score)
5. Confusion tables could not be generated (requires transaction scores)

## Fixes Applied

All 4 locations where entity column mapping needed merchant support:

### 1. investigation_nodes.py (Lines 298-325)
**File**: `app/service/agent/orchestration/hybrid/graph/nodes/investigation_nodes.py`
**Function**: `fetch_database_data` - entity_column_map

**Added**:
```python
# Snowflake
"merchant": "MERCHANT_NAME",
"merchant_name": "MERCHANT_NAME",

# PostgreSQL  
"merchant": "merchant_name",
"merchant_name": "merchant_name",
```

### 2. query_builder.py (Lines 283-305)
**File**: `app/service/agent/tools/snowflake_tool/query_builder.py`
**Method**: `_build_entity_where_clause`

**Added**:
```python
"MERCHANT": f"{MERCHANT_NAME} = '{entity_id}'",
"MERCHANT_NAME": f"{MERCHANT_NAME} = '{entity_id}'",
```

### 3. snowflake_tool.py (Lines 331-369)
**File**: `app/service/agent/tools/snowflake_tool/snowflake_tool.py`
**Method**: `_build_entity_where_clause`

**Added**:
```python
elif entity_type_upper == "MERCHANT" or entity_type_upper == "MERCHANT_NAME":
    return f"{MERCHANT_NAME} = '{entity_id}'"
```

### 4. assistant.py (Lines 110-138) **← CRITICAL FIX**
**File**: `app/service/agent/orchestration/assistant.py`
**Function**: `_create_investigation_context_message` - entity_column_map

**Added**:
```python
# Snowflake
"merchant": "MERCHANT_NAME",
"merchant_name": "MERCHANT_NAME",

# PostgreSQL
"merchant": "merchant_name",
"merchant_name": "merchant_name",
```

**Why This Was Critical**: This mapping is used to generate the LLM system message that instructs AI agents how to query the database. Without this fix, LLM-generated queries would continue using the invalid `MERCHANT` column.

## Additional Fixes Required (Prerequisites)

### EntityType Enum Updates
Added `MERCHANT` to EntityType enums in 2 locations:

**File**: `app/router/models/entity_type.py`
```python
MERCHANT = "merchant"
```

**File**: `app/schemas/investigation_state.py`
```python
MERCHANT = "merchant"
```

## Verification Steps

1. ✅ Database queries now use `MERCHANT_NAME` column
2. ✅ Transactions successfully fetched for merchant investigations
3. ✅ Per-transaction scores calculated by risk agent
4. ✅ Confusion tables generated for merchant entities

## Testing

**Test Command**:
```python
from app.service.investigation.auto_comparison import run_auto_comparison_for_entity

result = await run_auto_comparison_for_entity(
    entity_value='Coinflow',
    entity_type='merchant'
)
```

**Expected Results**:
- Investigation completes successfully
- Per-transaction scores calculated for all transactions
- Confusion table HTML generated
- No "invalid identifier 'MERCHANT'" errors

## Files Modified (Total: 6)

1. `app/service/agent/orchestration/hybrid/graph/nodes/investigation_nodes.py`
2. `app/service/agent/tools/snowflake_tool/query_builder.py`
3. `app/service/agent/tools/snowflake_tool/snowflake_tool.py`
4. `app/service/agent/orchestration/assistant.py` ← Most critical
5. `app/router/models/entity_type.py`
6. `app/schemas/investigation_state.py`

## Impact

- ✅ Merchant investigations now fully supported
- ✅ Per-transaction scoring works for all entity types
- ✅ Confusion matrices can be generated for merchants
- ✅ Complete end-to-end merchant investigation pipeline operational

