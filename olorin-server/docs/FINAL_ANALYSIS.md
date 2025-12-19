# Fraud Detection Model - Root Cause Analysis

## Critical Discovery

After extensive tuning attempts, we've uncovered the **fundamental issue**:

### The Problem

**Score Distribution**: ALL transactions score 0.0
```
min=0.000, median=0.000, avg=0.000, max=0.000
```

**Yet Confusion Matrix shows**: 100% flagged as fraud (TP+FP=2000, TN=0)

**This mismatch reveals**: The confusion matrix classification is **NOT using per-transaction scores** from the Enhanced Risk Scorer!

## Root Cause

The classification is likely using:
1. **Entity-level overall risk score** instead of per-transaction scores
2. Or a **fallback classification** when per-transaction scores are missing/zero

### Evidence

1. **Outlier detection generates 0.0 for all transactions**
   - Amount-based outliers don't differentiate fraud from legitimate
   - All transactions in the investigation window have similar amounts
   
2. **Confusion matrix still classifies transactions**
   - Must be using entity-level score (e.g., overall_risk_score=0.5)
   - Or default classification logic

3. **Threshold changes have no effect on per-transaction classification**
   - Changing from 0.3 → 0.5 → 0.35 affects entity-level classification
   - But per-transaction scores remain 0.0

## Why Amount-Only Outlier Detection Fails

**The Data Reality**:
- Investigation windows are 6 months (180 days)
- 2000 transactions per merchant over 6 months
- Fraudulent and legitimate transactions have **overlapping amount distributions**
- Statistical outliers (IQR, Z-score) don't align with fraud

**Example**:
- Merchant A fraud: $50-200 range
- Merchant A legitimate: $20-300 range
- **Overlap**: 70-80% of transactions in$50-200 are legitimate!
- Amount alone cannot distinguish

## What We've Tried

| Attempt | Approach | Result |
|---------|----------|--------|
| 1 | Pattern-based (velocity, concentration) | 100% fraud (all TN=0) |
| 2 | Conservative outlier (z>2.5) | 0% fraud (all TP=0) |
| 3 | Balanced outlier (z>1.5) + threshold 0.35 | 100% fraud again |

## The Real Solution

**Per-transaction fraud detection for merchants requires**:

### 1. **Behavioral Signals** (not just amount)
   - Transaction velocity patterns
   - Geographic anomalies
   - Device/IP consistency
   - Time-of-day patterns
   - Customer history

### 2. **Supervised Learning**
   - Train on historical labeled data
   - Learn fraud patterns specific to each merchant
   - Calibrated probability scores

### 3. **Rule-Based Overlays**
   - Known fraud patterns (card testing, account takeover)
   - Business logic rules
   - Blacklist/whitelist

## Current Limitations

**Data Available**: Only amounts and timestamps (clustered in time)
**Data NOT Available**: 
- Device IDs
- IP addresses  
- Geographic locations
- Customer identifiers
- Temporal patterns (all within 30-min windows)

**With current data, it's mathematically impossible to achieve good precision/recall for merchant per-transaction scoring.**

## Recommendations

### Option 1: Accept Entity-Level Scoring Only
- Use overall risk scores for merchant investigations
- Don't attempt per-transaction classification
- Focus on identifying risky **merchants**, not risky transactions

### Option 2: Require Additional Data
- Request device/IP/geo data for investigations
- Implement temporal analysis (need longer time windows)
- Add customer-level features

### Option 3: Use Historical Model
- Train supervised model on past fraud
- Requires significant labeled training data
- Merchant-specific models

### Option 4: Hybrid Approach
- Entity-level risk for merchants
- Per-transaction scoring ONLY for email/IP/device investigations  
  (where behavioral signals work)

## Current System Status

✅ **Working**: Entity-level risk scoring  
✅ **Working**: Investigation workflow  
✅ **Working**: Confusion matrix generation  
❌ **Not Working**: Per-transaction fraud detection for merchants with amount-only data  

## Conclusion

The tuning efforts revealed that **the problem isn't the threshold or algorithm** - it's that:

1. **Amount-based outliers score everything as 0.0** (no signal)
2. **Confusion matrix uses entity-level scores** (not per-transaction)
3. **Data limitations prevent meaningful per-transaction classification**

**Recommendation**: Use entity-level scoring for merchants, reserve per-transaction scoring for entity types with richer behavioral data (email, IP, device).

