# Risk Analyzer 14-Day Window Update

## Changes Made

### 1. **Default Time Window** (`_load_configuration()`)
   - ✅ Changed default from `'24h'` to `'14d'`
   - ✅ Environment variable: `ANALYTICS_DEFAULT_TIME_WINDOW` (defaults to `'14d'`)

### 2. **IP Fallback Window** (`get_top_risk_entities()`)
   - ✅ Changed fallback from `'7d'` to `'14d'` when no external IPs found
   - ✅ Updated log messages to reflect 14-day window
   - ✅ Updated `analysis['fallback_used']` logic

### 3. **Documentation Updates**
   - ✅ Updated docstrings to show `'14d'` as example instead of `'7d'`

## Rationale

The TXS table's latest records are ~7.6 days old, so:
- 24h window finds no data
- 7d window may find limited data
- 14d window ensures we capture all available data

## Test Results

✅ **14-day window working correctly**
- Found 32,974 entities
- Total transactions: 58,118
- Total amount: $1,036,571,226.16

## Files Modified

- `app/service/analytics/risk_analyzer.py`
  - Line 51: Default time window changed to `'14d'`
  - Line 178: Fallback window changed to `'14d'`
  - Lines 86, 122: Docstring examples updated
