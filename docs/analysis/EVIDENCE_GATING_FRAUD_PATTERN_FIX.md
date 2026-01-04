# Evidence Gating Fraud Pattern Fix

## Problem Identified

The LLM analysis was policy-constrained by evidence gating rules that forced default to LOW risk (≤0.3) when external tool results were missing, even though there were clear fraud patterns in Snowflake data:

- **Velocity bursts**: 3x $250,024 in 2 minutes
- **Amount clustering**: Identical amounts in rapid succession  
- **IP rotation**: Same device using multiple IPs from same /48 subnet
- **Device-IP mismatch**: Contradiction pattern

The human analyst correctly assessed this as **Moderate risk (~0.5-0.6)**, but the LLM was forced to **0.2** due to:
1. Evidence gating blocking assessment without external tools
2. Policy constraints overriding fraud pattern recognition
3. Evidence strength calculation ignoring behavioral patterns

## Solutions Implemented

### Fix #1: ✅ Evidence Gating Policy Update (CRITICAL)

**File**: `olorin-server/app/service/agent/orchestration/risk/policy.py`

**Changes**:
- Updated `has_minimum_evidence()` to check for fraud patterns BEFORE failing evidence gate
- Added fraud pattern bypass: Strong patterns (score ≥0.5) bypass evidence gating
- Patterns detected: velocity bursts, amount clustering, IP rotation, device-IP mismatch

**Code**:
```python
# CRITICAL FIX: Strong fraud patterns bypass evidence gating
if snowflake_data:
    from app.service.agent.orchestration.risk.fraud_pattern_detectors import has_strong_fraud_patterns
    
    has_patterns, pattern_details = has_strong_fraud_patterns(snowflake_data)
    if has_patterns:
        logger.info("✅ Evidence gate BYPASSED: Strong fraud patterns detected")
        return True
```

### Fix #2: ✅ Fraud Pattern Detectors

**File**: `olorin-server/app/service/agent/orchestration/risk/fraud_pattern_detectors.py` (NEW)

**Functions Created**:
1. `detect_velocity_burst()`: Detects multiple transactions within short time windows
2. `detect_amount_clustering()`: Detects identical amounts in rapid succession
3. `detect_ip_rotation()`: Detects same device using multiple IPs from same subnet
4. `detect_device_ip_mismatch()`: Detects device-IP contradiction patterns
5. `calculate_fraud_pattern_score()`: Calculates weighted fraud pattern score
6. `has_strong_fraud_patterns()`: Checks if patterns are strong enough to bypass gating

**Pattern Detection Logic**:
- Velocity bursts: 3+ transactions within 5 minutes = HIGH signal
- Amount clustering: 2+ identical amounts within 10 minutes = MEDIUM-HIGH signal
- IP rotation: Same device, 2+ IPs from same subnet within 4 hours = MEDIUM-HIGH signal
- Device-IP mismatch: Single device across multiple IPs = MEDIUM signal

**Scoring**:
```python
fraud_pattern_score = (
    velocity_score * 0.4 +
    clustering_score * 0.3 +
    rotation_score * 0.2 +
    mismatch_score * 0.1
)
```

### Fix #3: ✅ LLM Prompt Revision

**File**: `olorin-server/app/service/agent/evidence_analyzer.py`

**Changes**:
- **Removed**: Blanket "default to LOW risk" instruction
- **Added**: Exception for fraud patterns - behavioral anomalies override evidence volume
- **Added**: Explicit instruction that behavioral anomalies are PRIMARY indicators
- **Added**: Pattern detection section in prompt showing detected patterns

**Key Changes**:
```python
# BEFORE:
"If evidence volume is low (≤1 event) or external TI is MINIMAL/clean, 
you MUST default to LOW risk (≤0.3)"

# AFTER:
"If evidence volume is low (≤1 event) AND no fraud patterns detected, 
you MAY default to LOW risk (≤0.3)"

"CRITICAL EXCEPTION: When Snowflake data shows clear fraud patterns 
(velocity bursts, amount clustering, IP rotation, device-IP mismatch), 
these behavioral anomalies are PRIMARY fraud indicators that override 
evidence volume constraints."
```

**Pattern Detection in Prompt**:
- Automatically detects patterns in Snowflake data
- Includes detected patterns in LLM prompt
- Emphasizes patterns as PRIMARY indicators

### Fix #4: ✅ Fraud Pattern Scoring in Evidence Strength

**File**: `olorin-server/app/service/agent/orchestration/risk/finalize.py`

**Changes**:
- Updated `_compute_evidence_strength()` to include fraud pattern scoring
- Fraud pattern score calculated independently
- Evidence strength boosted when patterns are strong:
  - Pattern score ≥0.6 → evidence_strength boosted to at least 0.6
  - Pattern score ≥0.4 → evidence_strength boosted to at least 0.4

**Code**:
```python
# Calculate fraud pattern score
fraud_pattern_score, pattern_details = calculate_fraud_pattern_score(results)

# Override low evidence_strength when fraud patterns are strong
if fraud_pattern_score >= 0.6 and base_evidence_strength < 0.6:
    evidence_strength = max(base_evidence_strength, 0.6)
elif fraud_pattern_score >= 0.4 and base_evidence_strength < 0.4:
    evidence_strength = max(base_evidence_strength, 0.4)
```

## Expected Behavior After Fixes

### Before (Broken)
```
Evidence Gate: FAILED (no external tools)
Evidence Strength: 0.2 (low due to no external tools)
LLM Prompt: "MUST default to LOW risk (≤0.3)"
LLM Assessment: 0.2 (forced low by policy)
Final Risk: 0.2 (blocked by evidence gate)
```

### After (Fixed)
```
Pattern Detection: ✅ Velocity burst detected (3x $250k in 2 min)
Pattern Detection: ✅ Amount clustering detected ($250k repeats)
Pattern Detection: ✅ IP rotation detected (same device, 2 IPs)
Fraud Pattern Score: 0.65 (strong patterns)

Evidence Gate: ✅ BYPASSED (fraud patterns detected)
Evidence Strength: 0.6 (boosted from 0.2 by pattern score)
LLM Prompt: "Fraud patterns detected - assess based on patterns"
LLM Assessment: 0.52 (based on patterns, not evidence volume)
Final Risk: 0.52 (published due to pattern bypass)
```

## Key Improvements

1. **Pattern Detection**: Automatically detects fraud patterns in transaction data
2. **Evidence Gate Bypass**: Strong patterns bypass evidence gating requirements
3. **LLM Prompt Enhancement**: Patterns explicitly shown to LLM as PRIMARY indicators
4. **Evidence Strength Boost**: Pattern score boosts evidence_strength independently
5. **Policy Override**: Behavioral anomalies override evidence volume constraints

## Files Modified

1. **olorin-server/app/service/agent/orchestration/risk/policy.py**
   - Updated `has_minimum_evidence()` to check fraud patterns

2. **olorin-server/app/service/agent/orchestration/risk/fraud_pattern_detectors.py** (NEW)
   - Created fraud pattern detection module

3. **olorin-server/app/service/agent/evidence_analyzer.py**
   - Updated LLM prompt to prioritize behavioral anomalies
   - Added pattern detection in prompt generation
   - Updated low evidence warning to exclude pattern cases

4. **olorin-server/app/service/agent/orchestration/risk/finalize.py**
   - Updated `_compute_evidence_strength()` to include fraud pattern scoring

## Testing Recommendations

1. **Test Pattern Detection**:
   - Use test data with velocity bursts (3+ transactions in 5 minutes)
   - Verify patterns are detected and logged
   - Check that evidence gate is bypassed

2. **Test Evidence Strength Boost**:
   - Run investigation with patterns but no external tools
   - Verify evidence_strength is boosted from 0.2 to 0.6
   - Check that fraud_pattern_score is stored in state

3. **Test LLM Assessment**:
   - Verify LLM receives pattern information in prompt
   - Check that LLM assesses risk based on patterns
   - Verify risk score is not forced to ≤0.3

4. **Test End-to-End**:
   - Run investigation matching the analyst's scenario
   - Verify final risk score is ~0.5-0.6 (not 0.2)
   - Check that recommendations include specific values

## Summary

The LLM analysis was insufficient because evidence gating policies forced default to LOW risk without considering behavioral fraud patterns. The fixes ensure that:

1. ✅ Fraud patterns are automatically detected
2. ✅ Evidence gating bypasses when patterns are strong
3. ✅ LLM prioritizes behavioral anomalies over evidence volume
4. ✅ Evidence strength is boosted by pattern scores

The human analyst's "Moderate risk" assessment (~0.5-0.6) is now achievable by the LLM system.

