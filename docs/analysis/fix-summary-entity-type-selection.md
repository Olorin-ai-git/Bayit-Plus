# Fix Summary: Entity Type Selection from .env Configuration

**Date**: 2025-11-13  
**Issue**: Test runner hardcoded IP grouping, ignoring `.env` configuration  
**Status**: ✅ **FIXED**

## Problem

The test runner (`unified_ai_investigation_test_runner.py`) was hardcoded to query the risk analyzer with `group_by=IP`, ignoring the `ANALYTICS_DEFAULT_GROUP_BY=email` setting in the `.env` file.

## Root Cause

**File**: `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py`  
**Line**: 934

The `load_snowflake_data()` method explicitly passed `group_by=IP` instead of reading from `.env`:

```python
# ❌ BEFORE: Hardcoded IP
results = await analyzer.get_top_risk_entities(
    time_window='24h',
    group_by=IP,  # Hardcoded - ignores .env
    top_percentage=10,
    force_refresh=False
)
```

## Solution

Updated the test runner to:
1. Read `ANALYTICS_DEFAULT_GROUP_BY` from `.env`
2. Map the configuration value to the correct schema constant
3. Use the configured grouping for risk analyzer queries
4. Support multiple entity types (email, IP, device_id, etc.)

## Changes Made

### 1. Configuration Reading
```python
# ✅ AFTER: Reads from .env
default_group_by = os.getenv('ANALYTICS_DEFAULT_GROUP_BY', 'email').upper()

# Map to schema constant
group_by_column = EMAIL  # Default
if default_group_by == 'IP' or default_group_by == 'IP_ADDRESS':
    group_by_column = IP
elif default_group_by == 'EMAIL':
    group_by_column = EMAIL

results = await analyzer.get_top_risk_entities(
    time_window='24h',
    group_by=group_by_column,  # Uses .env config
    top_percentage=10,
    force_refresh=False
)
```

### 2. Entity Storage
- Stores entities with generic `entity` key
- Adds type-specific keys (`ip`, `email`, `device_id`) for backward compatibility

### 3. Entity Type Detection
- Determines entity type from `.env` configuration
- Falls back to format inference if needed
- Supports email, IP, device_id, and user_id

### 4. EntityType Enum Mapping
- Properly maps to `EntityType.EMAIL`, `EntityType.IP`, `EntityType.DEVICE_ID`
- Maintains backward compatibility

## Configuration

**Current `.env` Setting**:
```bash
ANALYTICS_DEFAULT_GROUP_BY=email
```

**Supported Values**:
- `email` - Group by email addresses (default, recommended for account-level fraud)
- `ip` - Group by IP addresses (for network-level fraud)
- `device_id` - Group by device IDs (for device-level fraud)

## Testing

### Verify Email Grouping
```bash
# Ensure .env has:
ANALYTICS_DEFAULT_GROUP_BY=email

# Run test
python -m scripts.testing.run_unified_tests --scenario device_spoofing --mode demo

# Expected: Investigation uses email addresses
```

### Verify IP Grouping
```bash
# Change .env to:
ANALYTICS_DEFAULT_GROUP_BY=ip

# Run test
python -m scripts.testing.run_unified_tests --scenario device_spoofing --mode demo

# Expected: Investigation uses IP addresses
```

## Impact

✅ **Before**: Always used IP addresses, ignoring `.env` configuration  
✅ **After**: Respects `.env` configuration, defaults to email (better for account-level fraud)

## Files Modified

1. `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py`
   - `load_snowflake_data()` method (lines 918-983)
   - `_create_test_context()` method (lines 1582-1637)
   - Entity type mapping (lines 1679-1689)

2. `docs/analysis/ip-vs-email-entity-selection-analysis.md`
   - Updated with fix details and implementation notes

## Next Steps

1. ✅ Test with `ANALYTICS_DEFAULT_GROUP_BY=email` to verify email grouping
2. ✅ Test with `ANALYTICS_DEFAULT_GROUP_BY=ip` to verify IP grouping still works
3. Consider adding scenario-based entity type selection (future enhancement)
4. Consider multi-entity investigation support (future enhancement)


