# Summary Generation Crash Investigation Report

## 🐛 Problem Analysis

**Error**: `float() argument must be a string or a real number, not 'NoneType'`
**Location**: Summary generation step in investigation system
**Investigation ID**: unified_test_device_spoofing_1758488509
**Entity**: IP 95.211.35.146
**Timestamp**: 2025-09-21T17:02:52.162466

## 🔍 Root Cause Analysis

### Primary Issue
The canonical_outcome.py file has been partially fixed but still contains several unsafe `float(state.get(...))` calls that crash when state values are `None` due to evidence gating.

### Evidence Gating Context
- Evidence gating can set `risk_score` and other metrics to `None` when insufficient evidence is available
- The investigation shows `risk_score: None` in final state
- Domain findings show valid numeric scores: network=0.9, device=0.7, location=0.7, logs=0.4, authentication=0.0

### Problematic Code Locations

**File**: `/app/service/agent/orchestration/hybrid/canonical_outcome.py`

**Fixed (Line 248)**:
```python
risk_score = coerce_float(state.get("risk_score"), 0.0)  ✅ SAFE
```

**Still Broken (Lines 267, 293-295, 309, 317, 334)**:
```python
confidence_score=float(state.get("ai_confidence", 0.0)),           # Line 267 ❌
snowflake_quality=float(state.get("snowflake_quality", 0.0)),      # Line 293 ❌
tools_quality=float(state.get("tools_quality", 0.0)),              # Line 294 ❌
domains_quality=float(state.get("domains_quality", 0.0)),          # Line 295 ❌
investigation_efficiency=float(state.get("investigation_efficiency", 0.0)), # Line 309 ❌
final_confidence=float(state.get("ai_confidence", 0.0)),           # Line 317 ❌
data_quality_score=float(state.get("evidence_strength", 0.0)),     # Line 334 ❌
```

## 🚨 Critical Issue
When evidence gating blocks risk score publication, it sets values to `None`. However, `state.get("key", 0.0)` returns `None` (not the default `0.0`) when the key exists but has value `None`. This causes `float(None)` crashes.

## 🛠️ Solution Strategy

### 1. Replace All Unsafe float() Calls
Replace all `float(state.get(...))` patterns with safe `coerce_float()` calls.

### 2. Use Safe Formatting in Summary Generation
Ensure all string formatting operations use `fmt_num()` instead of direct f-string formatting.

### 3. Add Defensive Programming
Implement null-safe patterns consistently across all summary generation code.

## 📋 Implementation Plan

### Phase 1: Fix canonical_outcome.py
- Replace remaining 6 unsafe `float()` calls with `coerce_float()`
- Ensure all state value access is null-safe

### Phase 2: Validate Summary Generator
- Review summary_generator.py for any remaining unsafe patterns
- Ensure all formatting uses safe utilities

### Phase 3: Test Edge Cases
- Test investigation with evidence gating (None risk scores)
- Verify summary generation doesn't crash on any None values
- Validate confirmed fraud cases still work properly

## 🔧 Expected Fixes

After implementation:
- ✅ No `float(None)` crashes in summary generation
- ✅ Evidence gating works properly (None values preserved as N/A)
- ✅ Confirmed fraud cases bypass evidence gating correctly
- ✅ All summary formatting is null-safe

## 🎯 Success Criteria

1. Investigation `unified_test_device_spoofing_1758488509` completes without crashes
2. Summary generation handles `None` risk scores gracefully
3. All numeric formatting displays "N/A" for None values instead of crashing
4. Confirmed fraud cases still receive proper risk floor (≥0.60)