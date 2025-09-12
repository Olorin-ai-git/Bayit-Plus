# Confirmed Fraud Fix Execution Trace Debug Report

## Problem Summary
The confirmed fraud fixes were implemented but are NOT working because the evidence gating logic conflicts with downstream functions that expect numeric risk scores.

## Root Cause Analysis

### The Evidence Gating Logic (Working Correctly)
In `/app/service/agent/orchestration/risk/finalize.py` line ~310:
```python
if not validation_result["can_publish_numeric_risk"]:
    # Block numeric risk publication - mark as needs more evidence
    state["risk_score"] = None  # ← THIS SETS risk_score TO None
    state["investigation_status"] = validation_result["status"]
    state["recommended_next_actions"] = validation_result["recommended_actions"]
    logger.warning(f"🚫 EVIDENCE GATE: Blocked numeric risk publication - {validation_result['status']}")
```

### The Float Conversion Crashes (Multiple Locations)

**Location 1: `/app/service/agent/orchestration/hybrid/canonical_outcome.py:247`**
```python
def _build_risk_assessment(self, state: HybridInvestigationState) -> RiskAssessment:
    risk_score = float(state.get("risk_score", 0.0))  # ← CRASH HERE
```
- Problem: `state.get("risk_score", 0.0)` returns `None` (not missing key), so default `0.0` is ignored
- Fix needed: Check for None explicitly

**Location 2: `/app/service/reporting/components/risk_dashboard.py:117`**
```python
if isinstance(risk_score, (int, float)):
    risk_score = max(0.0, min(1.0, float(risk_score)))  # ← SAFE
else:
    risk_score = 0.0  # ← HANDLES None CORRECTLY
```
- Status: Already fixed with proper None handling

**Location 3: `/app/service/agent/orchestration/hybrid/graph/metrics/summary_generator.py:276`**
```python
def _get_fraud_likelihood(self, risk_score: float) -> str:
    if risk_score is None:
        return "N/A"  # ← ALREADY FIXED
    
    try:
        risk_score = float(risk_score)  # ← SAFE
    except (TypeError, ValueError):
        return "N/A"
```
- Status: Already fixed with proper None handling

## Confirmed Fraud Bypass Logic

### The Issue: Confirmed Fraud Floor Logic Bypassed by Evidence Gate
In `finalize_risk()`, the confirmed fraud floor is applied AFTER evidence gating:

```python
# Line ~310: Evidence gating blocks numeric risk
if not validation_result["can_publish_numeric_risk"]:
    state["risk_score"] = None  # ← BLOCKS RISK PUBLICATION
    return  # ← EXITS EARLY

# Line ~320: Confirmed fraud floor (NEVER REACHED when evidence gate blocks)
for row in snowflake_data["results"]:
    if isinstance(row, dict) and row.get("IS_FRAUD_TX") is True:
        fraud_floor = 0.60
        if final_risk is None or final_risk < fraud_floor:
            final_risk = fraud_floor  # ← NEVER EXECUTED
```

### The Fix Required
The confirmed fraud bypass logic needs to run BEFORE evidence gating, not after.

## Network Domain "Insufficient Evidence" Issue

### The Problem
Even though Snowflake shows `IS_FRAUD_TX: true, MODEL_SCORE: 0.99`, the network domain says:
```
Network domain: risk_score: 0.501 but LLM says "insufficient evidence"
```

### Root Cause
The network domain analysis is not checking for confirmed fraud signals from Snowflake data. It's making its own independent assessment.

## Action Items

1. **Fix canonical_outcome.py float(None) crash**
   - Line 247: Use `coerce_float(state.get("risk_score"), 0.0)` instead of `float(state.get("risk_score", 0.0))`

2. **Move confirmed fraud bypass BEFORE evidence gating**
   - In `finalize_risk()`, check for confirmed fraud first
   - If confirmed fraud detected, bypass evidence gating entirely

3. **Fix network domain confirmed fraud detection**
   - Pass Snowflake confirmed fraud status to network domain
   - Override "insufficient evidence" when ground truth confirms fraud

4. **Add defensive checks in all float conversion locations**
   - Search for remaining `float(state.get("risk_score"` patterns
   - Replace with safe conversion functions

## Current Status
- ✅ SummaryGenerator: Fixed
- ✅ Risk Dashboard: Fixed  
- ❌ Canonical Outcome: **NEEDS FIX** (Line 247)
- ❌ Evidence gating order: **NEEDS FIX** (Confirmed fraud should bypass evidence gate)
- ❌ Network domain fraud detection: **NEEDS FIX** (Should recognize confirmed fraud from Snowflake)

## Test Case to Validate
Run investigation with:
- `IS_FRAUD_TX: true` in Snowflake results
- `MODEL_SCORE: 0.99` in Snowflake results

**Expected Behavior:**
- Risk score should be ≥ 0.60 (fraud floor)
- No `float(None)` crashes
- Network domain should acknowledge confirmed fraud
- Investigation status should be "completed_with_numeric_risk"

**Current Broken Behavior:**
- `risk_score -> None` (evidence gate blocking)
- `float() argument must be a string or a real number, not 'NoneType'` crash
- Network domain ignores confirmed fraud signals