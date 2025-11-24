# Precision & Confusion Matrix Fixes

## Overview

This document describes the fixes implemented to unblock confusion matrix generation and improve precision.

## Key Changes

### 1. Relaxed Transaction Decision Filter

**Problem**: The mapper was filtering to `APPROVED` transactions only, resulting in 0 rows for many investigations.

**Solution**: Made the filter configurable via `TRANSACTION_DECISION_FILTER` environment variable:

- **`FINALIZED`** (default): Includes `APPROVED`, `AUTHORIZED`, and `SETTLED` transactions
- **`APPROVED_ONLY`**: Strict APPROVED-only (for risk analyzer compatibility)
- **`ALL`**: No filter - includes all transactions

**Usage**:
```bash
# In .env file
TRANSACTION_DECISION_FILTER=FINALIZED  # Recommended for confusion matrix
# or
TRANSACTION_DECISION_FILTER=ALL  # Maximum coverage
```

**Code**: `app/service/investigation/investigation_transaction_mapper.py::_build_approved_filter()`

### 2. Enhanced Logging for Debugging

**Problem**: Difficult to diagnose where transactions are lost during mapping.

**Solution**: Added comprehensive logging at each step:

- Query parameters (entity, window, filter mode)
- Row counts after each query/join
- Transaction ID key detection
- Per-transaction score mapping status
- Exclusion reasons

**Key Log Points**:
- Before query: Entity clause, window dates, filter mode
- After query: Row count returned
- After mapping: Mapped count, excluded count, classification breakdown
- Warnings: Missing transaction_scores, empty results

### 3. Per-Transaction Score Enforcement

**Problem**: System was falling back to entity-level scores when per-transaction scores were missing.

**Solution**: Strict enforcement - transactions without per-transaction scores are excluded from confusion matrix (no fallback).

**Impact**: Ensures confusion matrix only includes transactions with individual risk scores, improving precision.

## Configuration

### Environment Variables

```bash
# Transaction decision filter (default: FINALIZED)
TRANSACTION_DECISION_FILTER=FINALIZED  # or APPROVED_ONLY or ALL

# Risk threshold for classification (default: 0.3)
RISK_THRESHOLD_DEFAULT=0.3
```

## Troubleshooting

### No Transactions Found

If you see "No transactions found" warnings:

1. **Check filter mode**: Try `TRANSACTION_DECISION_FILTER=ALL` to include all decisions
2. **Verify timezone**: Ensure window dates are timezone-aware and match Snowflake timezone
3. **Check entity exists**: Verify the entity has transactions in the specified window
4. **Review logs**: Check the detailed logging output for query parameters

### Empty Confusion Matrix

If confusion matrix is empty despite finding transactions:

1. **Check transaction_scores**: Verify investigation has `transaction_scores` in `progress_json`
2. **Review exclusion logs**: Check why transactions were excluded (missing scores, invalid scores, etc.)
3. **Verify investigation completion**: Ensure investigation completed successfully and calculated per-transaction scores

## Next Steps (Future Improvements)

### A) Feature Upgrades for Precision

1. **Entity-scoped velocity**: Track `tx_per_5min` by (email, device_id, ip_address) separately
2. **Geovelocity features**: Convert impossible travel to numeric distance/speed features
3. **Amount micro-patterns**: Frequency of near-threshold amounts ($998-$1000 bin counts)
4. **Device/IP stability**: `devices_per_email_14d`, `IPs_per_device_14d`, `user_agents_per_device`
5. **Merchant consistency**: Single-merchant concentration + UNKNOWN decision ratio

### B) Calibration & Ensemble

1. **Train calibration model**: Gradient-boosted tree or logistic regression on historical window
2. **Platt/Isotonic calibration**: Ensure "0.5" means "~50% fraud"
3. **Rule-overrides layer**: 
   - Suppress flags when (ip_reputation_clean AND no high-weight feature fired)
   - Hard-block when impossible-travel speed >> feasible

### C) Precision Optimization

1. **Optimize precision @ k**: Use labeled window to optimize precision at operating threshold
2. **Clean-intel veto**: Down-weight when IP reputation is VERY_LOW/MINIMAL and no other high-weight features fire
3. **Label-driven calibration**: Use historical fraud labels to calibrate anomaly-only signals

## Files Modified

- `app/service/investigation/investigation_transaction_mapper.py`
  - `_build_approved_filter()`: Made configurable with FINALIZED/ALL options
  - Enhanced logging throughout mapping process
  - Strict per-transaction score enforcement

## Testing

To test the fixes:

```bash
# Test with FINALIZED filter (default)
poetry run python scripts/generate_confusion_tables_for_recent.py

# Test with ALL filter (maximum coverage)
TRANSACTION_DECISION_FILTER=ALL poetry run python scripts/generate_confusion_tables_for_recent.py
```

Check logs for:
- Row counts at each step
- Filter mode being used
- Transaction mapping success/failure reasons

