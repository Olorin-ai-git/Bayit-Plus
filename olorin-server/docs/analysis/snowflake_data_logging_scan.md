# Snowflake Data Logging Scan

## Summary
This document identifies all locations where `snowflake_data` is being logged or printed in the codebase.

## Critical Logging Locations (Verbose Output)

### 1. `app/service/agent/orchestration/domain_agents/base.py`

#### Line 49: Character count logging
```python
logger.debug(f"[Step {step}.1]   Snowflake data: {'Yes' if snowflake_data else 'No'} ({len(str(snowflake_data))} chars)")
```
**Issue**: Converts entire `snowflake_data` to string to count characters - could be verbose
**Status**: ⚠️ Moderate - Only logs character count, not full data

#### Line 120: Keys logging (when no 'results' key)
```python
logger.debug(f"[Step {step}]   📊 Snowflake data is dict but no 'results' key. Keys: {list(snowflake_data.keys())[:5]}")
```
**Issue**: Logs keys when structure is unexpected
**Status**: ✅ Safe - Only logs first 5 keys

#### Line 141: String preview (when parsing fails)
```python
logger.debug(f"[Step {step}]   String content preview: {snowflake_data[:200]}...")
```
**Issue**: Logs first 200 characters of string data
**Status**: ⚠️ Moderate - Could show partial data

---

### 2. `app/service/agent/orchestration/orchestrator/handlers/tool_execution/logger_utilities.py`

#### Line 33: Character count
```python
logger.debug(f"   📊 Snowflake context available: Yes ({len(str(snowflake_data))} chars)")
```
**Issue**: Converts entire `snowflake_data` to string to count characters
**Status**: ⚠️ Moderate - Only logs character count

#### Line 34: Preview (150 chars)
```python
logger.debug(f"   📊 Snowflake preview: {str(snowflake_data)[:150]}...")
```
**Issue**: Logs first 150 characters of `snowflake_data`
**Status**: ⚠️ Moderate - Could show partial transaction data

---

### 3. `app/service/agent/orchestration/orchestrator/utils/data_formatters.py`

#### Line 36: Raw data fallback (500 chars)
```python
return f"Raw data: {str(snowflake_data)[:500]}"
```
**Issue**: Returns first 500 characters as string
**Status**: ⚠️ Moderate - Used in formatting, not direct logging

#### Line 94: Raw data summary (200 chars)
```python
return f"Raw data summary: {snowflake_data[:200]}..."
```
**Issue**: Returns first 200 characters
**Status**: ⚠️ Moderate - Used in formatting

---

### 4. `app/service/agent/orchestration/orchestrator/analysis/data_analyzer.py`

#### Line 26: Raw result preview (200 chars)
```python
return f"Snowflake raw result: {snowflake_data[:200]}{'...' if len(snowflake_data) > 200 else ''}"
```
**Issue**: Returns first 200 characters
**Status**: ⚠️ Moderate - Used in summarization

#### Line 29: Type and preview (200 chars)
```python
return f"Snowflake data type: {type(snowflake_data)} - {str(snowflake_data)[:200]}"
```
**Issue**: Logs type and first 200 characters
**Status**: ⚠️ Moderate - Used in summarization

---

### 5. `app/service/agent/evidence_analyzer.py`

#### Line 412: Raw data fallback (300 chars)
```python
return f"Raw Snowflake data: {str(snowflake_data)[:300]}..."
```
**Issue**: Returns first 300 characters
**Status**: ⚠️ Moderate - Used in evidence analysis

---

### 6. `app/service/agent/orchestration/orchestrator/handlers/summary/data_formatters.py`

#### Line 40: Raw data fallback (500 chars)
```python
return f"Raw data: {str(snowflake_data)[:500]}"
```
**Issue**: Returns first 500 characters
**Status**: ⚠️ Moderate - Used in summary formatting

---

## Safe Logging Locations (Already Summarized)

### 7. `app/service/agent/orchestration/state_schema.py`

#### Line 388-389: Uses summary function ✅
```python
snowflake_summary = _summarize_snowflake_data_for_logging(snowflake_data)
logger.debug(f"[Step 9.1]     snowflake_data: {snowflake_summary}")
```
**Status**: ✅ Safe - Uses `_summarize_snowflake_data_for_logging()` which only logs row count and columns

---

### 8. `app/service/logging/autonomous_investigation_logger.py`

#### Lines 457-465: Uses summary function ✅
```python
if 'snowflake_data' in summarized_state and summarized_state['snowflake_data']:
    snowflake_data = summarized_state['snowflake_data']
    if isinstance(snowflake_data, dict) and 'results' in snowflake_data:
        results = snowflake_data.get('results', [])
        summarized_state['snowflake_data'] = {
            'success': snowflake_data.get('success'),
            'source': snowflake_data.get('source', 'unknown'),
            'row_count': len(results) if isinstance(results, list) else 0,
            'columns': list(results[0].keys())[:5] if results and isinstance(results, list) and results and isinstance(results[0], dict) else []
        }
```
**Status**: ✅ Safe - Summarizes before logging (row count, columns only)

---

## Recommendations

### High Priority Fixes

1. **`logger_utilities.py:34`** - Remove or summarize the 150-character preview
   ```python
   # Current:
   logger.debug(f"   📊 Snowflake preview: {str(snowflake_data)[:150]}...")
   
   # Suggested:
   if isinstance(snowflake_data, dict) and 'results' in snowflake_data:
       logger.debug(f"   📊 Snowflake preview: {len(snowflake_data['results'])} records")
   else:
       logger.debug(f"   📊 Snowflake preview: Available")
   ```

2. **`data_formatters.py:36`** - Use summary instead of raw data
   ```python
   # Current:
   return f"Raw data: {str(snowflake_data)[:500]}"
   
   # Suggested:
   if isinstance(snowflake_data, dict) and 'results' in snowflake_data:
       return f"Transaction data: {len(snowflake_data['results'])} records"
   return "Data available"
   ```

3. **`data_analyzer.py:26,29`** - Already summarizes but could be more concise
   ```python
   # Current:
   return f"Snowflake raw result: {snowflake_data[:200]}..."
   
   # Suggested:
   if isinstance(snowflake_data, dict) and 'results' in snowflake_data:
       return f"{len(snowflake_data['results'])} records analyzed"
   return "Snowflake data available"
   ```

### Medium Priority Fixes

4. **`base.py:49`** - Character count is safe but could be more informative
   ```python
   # Current:
   logger.debug(f"[Step {step}.1]   Snowflake data: {'Yes' if snowflake_data else 'No'} ({len(str(snowflake_data))} chars)")
   
   # Suggested:
   if snowflake_data and isinstance(snowflake_data, dict) and 'results' in snowflake_data:
       logger.debug(f"[Step {step}.1]   Snowflake data: Yes ({len(snowflake_data['results'])} records)")
   else:
       logger.debug(f"[Step {step}.1]   Snowflake data: {'Yes' if snowflake_data else 'No'}")
   ```

5. **`base.py:141`** - String preview when parsing fails
   ```python
   # Current:
   logger.debug(f"[Step {step}]   String content preview: {snowflake_data[:200]}...")
   
   # Suggested:
   logger.debug(f"[Step {step}]   String content preview: {len(snowflake_data)} chars (first 50): {snowflake_data[:50]}...")
   ```

### Low Priority (Already Safe)

- `state_schema.py` - Already uses summary function ✅
- `autonomous_investigation_logger.py` - Already summarizes ✅

## Files to Update

1. `app/service/agent/orchestration/orchestrator/handlers/tool_execution/logger_utilities.py`
2. `app/service/agent/orchestration/orchestrator/utils/data_formatters.py`
3. `app/service/agent/orchestration/orchestrator/analysis/data_analyzer.py`
4. `app/service/agent/orchestration/domain_agents/base.py`
5. `app/service/agent/evidence_analyzer.py`
6. `app/service/agent/orchestration/orchestrator/handlers/summary/data_formatters.py`

## Summary

**Total locations found**: 15+ logging/formatting locations
**Critical (verbose)**: 6 locations that log raw/preview data
**Safe (already summarized)**: 2 locations using summary functions
**Recommendation**: Update the 6 critical locations to use summaries instead of raw data previews










