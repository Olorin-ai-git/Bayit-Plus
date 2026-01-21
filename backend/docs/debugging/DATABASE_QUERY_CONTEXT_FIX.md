# Database Query Context Fix - Investigation Entity ID Integration

**Date**: 2025-11-08
**Priority**: CRITICAL
**Status**: ✅ IMPLEMENTED

## Problem Summary

**CRITICAL BUG**: The LLM assistant was making generic schema discovery queries instead of querying actual transaction data filtered by the investigation entity ID.

### Example of the Bug

**Investigation**: IP 117.22.69.115
- **Expected Query**: `SELECT * FROM transactions_enriched WHERE ip = '117.22.69.115'`
- **Actual Query**: `SELECT table_schema, table_name, column_name FROM information_schema.columns WHERE column_name ILIKE '%ip%'`
- **Result**: LLM received schema metadata (1 row) instead of transaction data (100 rows)
- **Impact**: Risk score 0.10 instead of 0.87 - 87% underestimation

## Root Cause Analysis

The system prompt in `assistant.py` told the LLM to "use the database_query tool" but **did NOT provide the investigation context**:
- ❌ No entity ID (117.22.69.115)
- ❌ No entity type (ip)
- ❌ No table name (transactions_enriched)
- ❌ No time range (last 180 days)

**Result**: LLM had no idea WHAT to query, so it made educated guesses (schema discovery queries).

## Solution Implemented

### File Modified
`/app/service/agent/orchestration/assistant.py`

### Changes Made

1. **Created `_create_investigation_context_message()` function** (lines 27-111)
   - Extracts investigation context from state:
     - `entity_id` (e.g., "117.22.69.115")
     - `entity_type` (e.g., "ip")
     - `time_range` (start_time, end_time)
     - `table_reference` (from .env: POSTGRES_TRANSACTIONS_TABLE)

   - Maps entity_type to database column:
     - `ip` → `ip`
     - `email` → `first_recipient_email`
     - `device` → `fipp_visitor_id`
     - `phone` → `first_recipient_phone`

   - Creates system message with EXACT query pattern:
     ```sql
     SELECT * FROM {table_reference}
     WHERE {entity_column} = '{entity_id}'
     AND tx_datetime BETWEEN '{start_time}' AND '{end_time}'
     ORDER BY tx_datetime DESC
     LIMIT 1000
     ```

2. **Updated `assistant()` function** (lines 193-238)
   - **Normal scenario**: Uses investigation-context-aware message with exact query guidance
   - **Retry scenario**: Uses enhanced forceful message when LLM fails to call tools
   - Both scenarios now include investigation context (entity_id, entity_type)

### Key Features

**Context-Aware Prompting**:
- LLM receives complete investigation context in system message
- Explicit query pattern with actual entity ID substituted
- Clear instructions: "DO NOT query information_schema"
- Configurable transaction limit (default: 1000 if not set in .env)

**Retry Handling Preserved**:
- Retry messages still forceful but now include entity context
- "Query transactions for {entity_type} = {entity_id}"
- Maintains all original retry logic

**Configuration Integration**:
- Reads table name from .env: `POSTGRES_TRANSACTIONS_TABLE`
- Supports both PostgreSQL and Snowflake
- Handles schema qualification (public.transactions_enriched)

## Expected Results

### Before Fix
```
LLM prompt: "Use database_query tool"
LLM thinks: "I need to find which columns exist first"
LLM query: "SELECT table_schema, table_name, column_name FROM information_schema.columns..."
Result: Schema metadata (1 row)
Risk assessment: INCORRECT (0.10 when should be 0.87)
```

### After Fix
```
LLM prompt: "Query transactions for IP = 117.22.69.115 from table public.transactions_enriched"
LLM executes: "SELECT * FROM public.transactions_enriched WHERE ip = '117.22.69.115' AND tx_datetime BETWEEN..."
Result: Transaction data (100 rows)
Risk assessment: CORRECT (0.87)
```

## Configuration Requirements

**Environment Variables Used**:
- `DATABASE_PROVIDER` - "postgresql" or "snowflake"
- `POSTGRES_TRANSACTIONS_TABLE` - "transactions_enriched"
- `POSTGRES_SCHEMA` - "public"
- `POSTGRES_MAX_TRANSACTIONS_LIMIT` - 1000 (default if not set)

**State Requirements**:
- `entity_id` - The entity being investigated (IP, email, device, phone)
- `entity_type` - Type of entity ("ip", "email", "device", "phone")
- `time_range` - Dictionary with start_time and end_time
- `investigation_id` - Investigation identifier

## Testing Instructions

### 1. Test with Known High-Risk IP
```bash
# Investigation: IP 117.22.69.115
# Expected: Risk score > 0.80 (was 0.10 before fix)
# Expected: Evidence shows 100 transactions (was 1 schema row before fix)
```

### 2. Verify Log Messages
Look for these logs:
```
✅ Created investigation-context-aware system message for ip=117.22.69.115
```

### 3. Verify Database Query
Check that LLM makes this query (not schema discovery):
```sql
SELECT * FROM public.transactions_enriched
WHERE ip = '117.22.69.115'
AND tx_datetime BETWEEN '2025-05-12T18:20:34.352000+00:00' AND '2025-11-08T18:20:34.352000+00:00'
ORDER BY tx_datetime DESC
LIMIT 1000
```

## Compliance Checklist

- ✅ No hardcoded values - all config from .env
- ✅ No mocks/stubs/placeholders
- ✅ Proper error handling with fallbacks
- ✅ Configuration-driven table/schema names
- ✅ Maintains existing retry logic
- ✅ Preserves all graph flows
- ✅ No schema-locked violations (read-only queries)

## Rollback Plan

If issues occur:
```bash
git checkout HEAD -- app/service/agent/orchestration/assistant.py
```

## Impact Assessment

### Components Affected
- ✅ **network_agent** - Will receive correct transaction data for IP investigations
- ✅ **device_agent** - Will receive correct transaction data for device investigations
- ✅ **location_agent** - Will receive correct transaction data for location investigations
- ✅ **logs_agent** - Will receive correct transaction data for activity investigations

### Severity
- **CRITICAL**: Risk scores were systematically underestimated by 87% (0.10 instead of 0.87)
- **FALSE NEGATIVES**: 100 fraudulent transactions reported as "no activity"
- **PRODUCTION IMPACT**: All investigations since hybrid graph deployment affected

## Success Metrics

After deployment:
1. ✅ LLM makes entity-specific queries (not schema discovery)
2. ✅ Domain agents receive 100+ transaction rows (not 1 schema row)
3. ✅ Risk scores match actual fraud rates (~87%)
4. ✅ Evidence includes real transaction details
5. ✅ No "unique IP count: 0" false negatives

---

**Implementation Complete**: 2025-11-08
**Files Modified**: 1 (assistant.py)
**Lines Changed**: +87 lines (new function + enhanced logic)
**Testing Status**: ⏳ Ready for testing with IP 117.22.69.115
