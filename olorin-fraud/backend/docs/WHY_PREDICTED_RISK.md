# Why Do We Need `predicted_risk`?

## The Confusion

You asked: *"Why do we need predicted_risk? We have risk score from 6 months ago, we compare with current risk score."*

This is a common misunderstanding. Let me clarify what's actually being compared.

## What We're NOT Comparing

We are **NOT** comparing:
- ❌ Risk score from 6 months ago vs Risk score from now

## What We ARE Comparing

We are comparing:
- ✅ **Prediction** (from historical investigation) vs **Actual fraud outcomes** (ground truth)

## The Comparison Logic

### Window A (Historical Investigation - 6 months ago)
- An investigation was run 6 months ago
- It analyzed transactions from that time period
- It produced a **risk score** (e.g., 0.6) for the entity
- This risk score represents the investigation's assessment of fraud risk

### Window B (Validation Period - current/recent)
- This is the current/recent time period
- We want to answer: **"Would the risk score from 6 months ago have correctly predicted fraud in this period?"**

### How It Works

1. **Take the historical investigation's risk score** (from Window A)
   - Example: `overall_risk_score = 0.6` from investigation `auto-comp-8e3739f334eb`

2. **Apply it as `predicted_risk` to all transactions in Window B**
   - Every transaction in Window B gets `predicted_risk = 0.6`
   - This represents what the historical investigation would have predicted

3. **Compare against actual fraud labels**
   - Each transaction has `actual_outcome` (from `IS_FRAUD_TX` or entity labels)
   - `actual_outcome` can be: `FRAUD`, `NOT_FRAUD`, or `None` (pending)

4. **Calculate confusion matrix**
   - **TP (True Positive)**: `predicted_risk >= threshold` AND `actual_outcome == FRAUD`
   - **FP (False Positive)**: `predicted_risk >= threshold` AND `actual_outcome == NOT_FRAUD`
   - **TN (True Negative)**: `predicted_risk < threshold` AND `actual_outcome == NOT_FRAUD`
   - **FN (False Negative)**: `predicted_risk < threshold` AND `actual_outcome == FRAUD`

5. **Calculate metrics**
   - **Precision**: Of transactions flagged as fraud, how many were actually fraud?
   - **Recall**: Of actual fraud transactions, how many did we catch?
   - **F1 Score**: Harmonic mean of precision and recall
   - **Accuracy**: Overall correctness

## Example

### Scenario
- **Window A** (6 months ago): Investigation found `overall_risk_score = 0.6`
- **Window B** (current): 100 transactions

### What Happens
1. All 100 transactions in Window B get `predicted_risk = 0.6`
2. If `risk_threshold = 0.7`, then:
   - `predicted_label = 0` (not fraud) for all transactions (since 0.6 < 0.7)
3. Compare against actual outcomes:
   - 10 transactions were actually fraud (`actual_outcome = FRAUD`)
   - 90 transactions were not fraud (`actual_outcome = NOT_FRAUD`)
4. Confusion matrix:
   - **TP = 0**: No transactions predicted as fraud that were actually fraud
   - **FP = 0**: No transactions predicted as fraud that were not fraud
   - **TN = 90**: 90 transactions predicted as not fraud that were not fraud
   - **FN = 10**: 10 transactions predicted as not fraud that were actually fraud
5. Metrics:
   - **Precision**: 0/0 = undefined (no positive predictions)
   - **Recall**: 0/10 = 0% (caught 0 out of 10 fraud cases)
   - **Accuracy**: 90/100 = 90% (correctly classified 90 out of 100)

## Why This Matters

This comparison answers the question:
> **"If we had used the risk score from 6 months ago to make decisions today, how well would it have performed?"**

This is a **validation** or **backtesting** approach:
- We're testing whether the historical investigation's risk assessment would have been accurate for current transactions
- We're measuring the **predictive power** of the historical investigation

## The Problem We Fixed

Before the fix:
- Investigations had `overall_risk_score` (e.g., 0.6)
- But `predicted_risk` was `None` for all transactions
- This meant transactions were excluded from confusion matrix calculation
- Result: All metrics were 0.00%

After the fix:
- Investigations' `overall_risk_score` is extracted and applied as `predicted_risk`
- Transactions now have `predicted_risk` values
- Confusion matrix can be calculated correctly
- Metrics reflect actual performance

## Summary

**`predicted_risk` is NOT comparing two risk scores.**

**`predicted_risk` IS the historical investigation's risk score, applied to current transactions, compared against actual fraud outcomes.**

This is a **fraud detection performance evaluation**, not a risk score comparison.

