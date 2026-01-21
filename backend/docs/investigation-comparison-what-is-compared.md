# Investigation Comparison: What Is Being Compared?

## Overview

The "Investigation Comparison" feature compares **fraud detection performance metrics** across two time windows by analyzing **transaction data** from Snowflake.

## What Is Actually Compared

### 1. **Transaction Fraud Detection Metrics** (Not Investigations Themselves)

The comparison analyzes **transactions** from the Snowflake transaction table and computes fraud detection performance metrics for each time window:

#### Data Queried:
- **Transaction records** from Snowflake (`TX_ID_KEY`, `TX_DATETIME`, `MODEL_SCORE`, `IS_FRAUD_TX`, `STORE_ID`, etc.)
- Filtered by:
  - Time window (Window A and Window B)
  - Entity (email, phone, device_id, IP, account_id, card_fingerprint, merchant_id) - optional
  - Merchant IDs - optional

#### Metrics Calculated Per Window:

**Confusion Matrix:**
- **TP (True Positives)**: Transactions predicted as fraud that were actually fraud
- **FP (False Positives)**: Transactions predicted as fraud that were NOT fraud
- **TN (True Negatives)**: Transactions predicted as NOT fraud that were NOT fraud
- **FN (False Negatives)**: Transactions predicted as NOT fraud that were actually fraud

**Derived Metrics:**
- **Precision**: TP / (TP + FP) - Of transactions flagged as fraud, how many were actually fraud?
- **Recall**: TP / (TP + FN) - Of actual fraud transactions, how many did we catch?
- **F1 Score**: Harmonic mean of precision and recall
- **Accuracy**: (TP + TN) / (TP + FP + TN + FN) - Overall correctness
- **Fraud Rate**: Percentage of transactions that were actually fraud

**Aggregations:**
- **Total Transactions**: Count of all transactions in the window
- **Over Threshold**: Count of transactions with predicted_risk >= risk_threshold
- **Pending Labels**: Count of transactions without final fraud labels yet

### 2. **Comparison Between Two Time Windows**

The feature compares these metrics **between two time periods**:

- **Window A**: First time period (e.g., "Recent 14 days")
- **Window B**: Second time period (e.g., "Retro 14 days, 6 months back")

#### What Gets Compared:

1. **Raw Counts**: Total transactions, over-threshold counts
2. **Confusion Matrix**: TP, FP, TN, FN for each window
3. **Performance Metrics**: Precision, recall, F1, accuracy, fraud_rate
4. **Deltas**: Change in each metric (Window B - Window A)
5. **Distribution Statistics**: PSI and KS statistics for predicted_risk distribution drift
6. **Per-Merchant Breakdown**: Same metrics broken down by merchant

### 3. **How Investigations Relate**

When comparing investigations (from the investigations-management page):

- The **time windows** come from the investigations' `from` and `to` fields
- The **entity** comes from the investigations' `entity_type` and `entity_id`
- But the comparison still analyzes **transaction data**, not the investigation records themselves

## Example

**Comparing two investigations for email `user@example.com`:**

1. Investigation A: `from: 2025-01-01`, `to: 2025-01-15`, `entity: email:user@example.com`
2. Investigation B: `from: 2025-01-16`, `to: 2025-01-30`, `entity: email:user@example.com`

**What happens:**
- Query transactions for `user@example.com` in Window A (Jan 1-15)
- Query transactions for `user@example.com` in Window B (Jan 16-30)
- Calculate fraud detection metrics for each window
- Compare: "Did our fraud detection perform better in Window A or Window B?"

**Result:**
- Window A: 100 transactions, Precision=0.85, Recall=0.70, Fraud Rate=0.15
- Window B: 120 transactions, Precision=0.80, Recall=0.75, Fraud Rate=0.18
- Delta: Precision↓0.05, Recall↑0.05, Fraud Rate↑0.03

## Summary

**You are comparing:**
- ✅ **Transaction fraud detection performance metrics** across two time windows
- ✅ **Model performance** (precision, recall, accuracy) 
- ✅ **Fraud patterns** (fraud rate, distribution changes)
- ✅ **Per-merchant performance** breakdowns

**You are NOT comparing:**
- ❌ Investigation records themselves
- ❌ Investigation metadata or status
- ❌ Investigation results or findings

The feature is named "Investigation Comparison" because it's commonly used to compare fraud detection performance between time periods associated with different investigations, but the actual comparison is of transaction-level fraud detection metrics.

