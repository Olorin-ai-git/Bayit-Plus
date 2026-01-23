# Quickstart: Per-Transaction Risk Scoring

**Feature**: Per-Transaction Risk Scoring  
**Date**: 2025-11-17  
**Phase**: 1 - Design

## Overview

This quickstart guide explains how to use and verify per-transaction risk scoring functionality.

## How It Works

### 1. During Investigation

When an investigation runs, the risk agent:
1. Processes transactions from `facts["results"]`
2. Extracts transaction features (amount, merchant, device, location, etc.)
3. Combines with entity-level domain findings
4. Calculates unique risk score for each transaction
5. Stores scores in `progress_json["transaction_scores"]` dict

### 2. During Confusion Matrix Calculation

When generating confusion tables:
1. `map_investigation_to_transactions()` checks for `transaction_scores` dict
2. For each transaction:
   - If score exists: Use per-transaction score as `predicted_risk`
   - If score missing: Exclude transaction (no fallback)
3. Confusion matrix uses per-transaction predictions

## Verification Steps

### Step 1: Run an Investigation

```bash
# Start investigation (via API or startup analysis)
# Investigation will automatically calculate per-transaction scores
```

### Step 2: Check Investigation State

```python
from app.persistence.database import get_db
from app.service.investigation_state_service import InvestigationStateService
import json

db = next(get_db())
service = InvestigationStateService(db)
state = service.get_state_with_auth(
    investigation_id='your-investigation-id',
    user_id='your-user-id'
)

progress = json.loads(state.progress_json)
transaction_scores = progress.get('transaction_scores', {})

print(f"Found {len(transaction_scores)} per-transaction scores")
for tx_id, score in list(transaction_scores.items())[:5]:
    print(f"  {tx_id}: {score:.3f}")
```

### Step 3: Verify Confusion Matrix Uses Per-Transaction Scores

```python
from app.service.investigation.investigation_transaction_mapper import map_investigation_to_transactions
from datetime import datetime

investigation = {
    'id': 'your-investigation-id',
    'progress_json': progress_json  # Contains transaction_scores
}

transactions, source, predicted_risk = await map_investigation_to_transactions(
    investigation=investigation,
    window_start=datetime(...),
    window_end=datetime(...),
    entity_type='email',
    entity_id='user@example.com'
)

# Check that transactions have per-transaction predicted_risk values
for tx in transactions[:5]:
    print(f"Transaction {tx['transaction_id']}: predicted_risk={tx.get('predicted_risk')}")
```

### Step 4: Generate Confusion Table

```bash
# Generate confusion table (will use per-transaction scores)
python scripts/generate_confusion_table_for_investigation.py your-investigation-id
```

## Expected Behavior

### With Per-Transaction Scores

- **Investigation State**: `progress_json["transaction_scores"]` contains dict of scores
- **Confusion Matrix**: Each transaction uses its own score
- **Precision**: Should improve compared to single entity-level score
- **Recall**: Should remain high (>=95%)

### Without Per-Transaction Scores (Old Investigations)

- **Investigation State**: `transaction_scores` key missing from `progress_json`
- **Confusion Matrix**: Empty (all transactions excluded)
- **Logging**: Warning logged that per-transaction scores not available

## Troubleshooting

### Issue: No transaction_scores in progress_json

**Possible Causes**:
- Investigation completed before per-transaction scoring implemented
- Score calculation failed (check logs)
- Insufficient transaction features

**Solution**: Re-run investigation or check investigation logs for errors

### Issue: Some transactions missing scores

**Possible Causes**:
- Missing critical transaction features
- Invalid feature values
- Score calculation skipped for those transactions

**Solution**: Check logs for warnings about excluded transactions

### Issue: Confusion matrix is empty

**Possible Causes**:
- No `transaction_scores` dict in investigation
- All transactions excluded due to missing scores

**Solution**: Check investigation state and logs for exclusion reasons

## Performance Notes

- **Calculation Time**: <5 seconds per 100 transactions
- **Storage Size**: ~100 bytes per transaction
- **Lookup Time**: O(1) per transaction (dict lookup)

## Next Steps

1. Review implementation tasks in `tasks.md`
2. Implement per-transaction score calculation
3. Update transaction mapper to use per-transaction scores
4. Test with sample investigations
5. Verify confusion matrix improvements

