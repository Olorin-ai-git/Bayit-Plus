# Fix for Empty Metrics in Comparison Reports

## Problem

Comparison reports were showing all metrics as empty (0.00%) because:
1. **Missing `predicted_risk`**: Investigations without `overall_risk_score` resulted in all transactions having `predicted_risk: None`, which excluded them from confusion matrix calculation
2. **Missing `overall_risk_score`**: When investigations completed, `overall_risk_score` wasn't always stored in `progress_json`, making it unavailable for comparison metrics

## Root Cause

1. **Transaction Mapping**: When an investigation had no `overall_risk_score`, all transactions got `predicted_risk: None`, excluding them from metrics
2. **Risk Score Persistence**: When investigations completed, `risk_score` was stored but `overall_risk_score` wasn't always set in `progress_json`

## Fixes Applied

### 1. Remove MODEL_SCORE Fallback (`investigation_transaction_mapper.py`)

**CRITICAL**: The system MUST NOT use Snowflake MODEL_SCORE as fallback. Only investigation risk scores are used:

```python
if investigation_risk_score is not None:
    mapped_tx['predicted_risk'] = investigation_risk_score
else:
    # NO FALLBACK - if investigation doesn't have risk score, predicted_risk is None
    mapped_tx['predicted_risk'] = None
```

**Impact**: Metrics only reflect actual investigation results. If an investigation doesn't have a risk score, transactions will have `predicted_risk=None`, which correctly excludes them from metrics calculation.

### 2. Ensure `overall_risk_score` is Stored (`investigation_controller.py`)

When investigations complete, ensure `overall_risk_score` is set from `risk_score`:

```python
# CRITICAL: Ensure overall_risk_score is set from risk_score if available
if "risk_score" in findings_summary and findings_summary["risk_score"] is not None:
    findings_summary["overall_risk_score"] = findings_summary["risk_score"]
```

**Impact**: Completed investigations now have `overall_risk_score` available for comparison metrics.

### 3. Ensure `overall_risk_score` in State Updates (`state_update_helper.py`)

When progress is updated, ensure `overall_risk_score` is set:

```python
if "risk_score" in progress_dict and progress_dict["risk_score"] is not None:
    progress_dict["overall_risk_score"] = progress_dict["risk_score"]
```

**Impact**: All state updates now ensure `overall_risk_score` is available.

## How to Regenerate Comparison Reports

### Option 1: Via API (Recommended)

If the server is running, use the comparison API:

```bash
curl -X POST http://localhost:8000/api/v1/investigations/compare/html \
  -H "Content-Type: application/json" \
  -d '{
    "entity": {
      "type": "email",
      "value": "moeller2media@gmail.com"
    },
    "windowA": {
      "preset": "CUSTOM",
      "start": "2025-10-28T00:00:00-05:00",
      "end": "2025-11-11T00:00:00-05:00"
    },
    "windowB": {
      "preset": "CUSTOM",
      "start": "2025-11-11T00:00:00-05:00",
      "end": "2025-11-15T00:00:00-05:00"
    },
    "risk_threshold": 0.7,
    "options": {
      "include_histograms": true,
      "include_timeseries": true
    }
  }' \
  --output comparison_report.html
```

### Option 2: Via Python Script

Create a simple script:

```python
import asyncio
import sys
sys.path.insert(0, '/path/to/olorin-server')

from app.service.investigation.auto_comparison import run_auto_comparison_for_entity
from pathlib import Path

async def regenerate():
    result = await run_auto_comparison_for_entity(
        entity_value="moeller2media@gmail.com",
        entity_type="email",
        reports_dir=Path("artifacts/comparisons/regenerated")
    )
    print(f"Status: {result.get('status')}")
    print(f"Report: {result.get('report_path')}")

asyncio.run(regenerate())
```

### Option 3: Via CLI (if available)

```bash
cd olorin-server
olorin compare --entity email:moeller2media@gmail.com \
  --window-a-start 2025-10-28 \
  --window-a-end 2025-11-11 \
  --window-b-start 2025-11-11 \
  --window-b-end 2025-11-15
```

## Verification

After regenerating, check the report for:
1. **Non-zero metrics**: Precision, Recall, F1, Accuracy should have values if transactions have labels
2. **Support metrics**: Should show `known_transactions > 0`, `actual_frauds > 0`, `predicted_positives > 0`
3. **Confusion matrix**: TP, FP, TN, FN should sum to the number of known transactions

## Ensuring Investigations Complete with Risk Scores

The fixes ensure that:
1. **New investigations** will have `overall_risk_score` stored when they complete
2. **Existing investigations** without risk scores will have `predicted_risk=None` (NO FALLBACK to MODEL_SCORE)
3. **All state updates** ensure `overall_risk_score` is set from `risk_score`

## Next Steps

1. **Regenerate comparison reports** for entities that had empty metrics
2. **Monitor new investigations** to ensure they complete with risk scores
3. **Check investigation logs** if risk scores are still missing - may indicate investigation completion issues

