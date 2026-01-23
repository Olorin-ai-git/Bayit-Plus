# Quick Start: Investigation Comparison Pipeline

**Feature**: Investigation Comparison Pipeline  
**Date**: 2025-01-27  
**Phase**: 1 - Design

## Overview

The Investigation Comparison Pipeline allows fraud analysts to compare fraud metrics across two matched time windows for a specific entity or merchant scope. This enables identification of changes in fraud rates, model performance, and risk distribution over time.

## Key Features

- **Default Presets**: Compare Recent 14d vs Retro 14d (6mo back)
- **Custom Windows**: Specify any time range with inclusive start, exclusive end semantics
- **Entity Filtering**: Filter by email, phone, device_id, ip, account_id, card_fingerprint (format: "BIN|last4"), or merchant_id
- **Merchant Breakdown**: Per-merchant metrics comparison (capped at 25 merchants)
- **Visualizations**: Risk histograms and daily timeseries charts
- **Export**: JSON/CSV export of comparison results

## API Usage

### Basic Example

```bash
curl -X POST http://localhost:8080/api/investigation/compare \
  -H "Content-Type: application/json" \
  -d '{
    "entity": {
      "type": "email",
      "value": "user@example.com"
    },
    "windowA": {
      "preset": "retro_14d_6mo_back"
    },
    "windowB": {
      "preset": "recent_14d"
    }
  }'
```

### With Options

```bash
curl -X POST http://localhost:8080/api/investigation/compare \
  -H "Content-Type: application/json" \
  -d '{
    "entity": {"type": "email", "value": "user@example.com"},
    "windowA": {"preset": "retro_14d_6mo_back"},
    "windowB": {"preset": "recent_14d"},
    "risk_threshold": 0.7,
    "options": {
      "include_per_merchant": true,
      "include_histograms": true,
      "include_timeseries": true
    }
  }'
```

## CLI Usage

```bash
python -m app.cli.evaluate_investigation \
  --entity-type email \
  --entity-value user@example.com \
  --window-a-preset retro_14d_6mo_back \
  --window-b-preset recent_14d \
  --risk-threshold 0.7 \
  --include-per-merchant \
  --include-histograms
```

## Frontend Usage

Navigate to `/investigate/compare` in the Olorin frontend application.

1. **Select Entity**: Choose entity type and enter value (e.g., email: `user@example.com`)
2. **Select Windows**: Choose presets or specify custom dates
3. **Set Threshold**: Adjust risk threshold slider (default: 0.7)
4. **Filter Merchants**: Optionally select specific merchants
5. **Click Apply**: Execute comparison
6. **Review Results**: View side-by-side panels with metrics, charts, and deltas
7. **Export**: Download JSON/CSV or copy summary

## Window Presets

### Recent 14d
- **Start**: Today - 14 days (midnight, America/New_York)
- **End**: Today (midnight, America/New_York)
- **Label**: "Recent 14d"

### Retro 14d (6mo back)
- **Start**: Recent 14d start - 180 days
- **End**: Retro start + 14 days
- **Label**: "Retro 14d (6mo back)"

### Custom
- **Start**: User-specified (ISO 8601, America/New_York timezone)
- **End**: User-specified (ISO 8601, America/New_York timezone)
- **Label**: User-specified or auto-generated

## Metrics Explained

### Confusion Matrix
- **TP (True Positives)**: Predicted fraud, actual fraud
- **FP (False Positives)**: Predicted fraud, actual not fraud
- **TN (True Negatives)**: Predicted not fraud, actual not fraud
- **FN (False Negatives)**: Predicted not fraud, actual fraud

### Derived Metrics
- **Precision**: TP / (TP + FP) - Of predicted fraud, how many were actually fraud?
- **Recall**: TP / (TP + FN) - Of actual fraud, how many were caught?
- **F1**: 2 * (precision * recall) / (precision + recall) - Harmonic mean
- **Accuracy**: (TP + TN) / (TP + FP + TN + FN) - Overall correctness
- **Fraud Rate**: Mean of is_fraud (known labels only)

### Deltas
All deltas are computed as Window B - Window A:
- Positive delta = metric increased
- Negative delta = metric decreased

## Entity Normalization

- **Email**: Case-insensitive (normalized to lowercase using SQL LOWER())
- **Phone**: E164 format (e.g., `+15551234567`) - normalized using phonenumbers library or regex `^\+[1-9]\d{1,14}$`
- **Card Fingerprint**: Format "BIN|last4" or "BIN-last4" (e.g., "123456|7890") - both BIN and last4 must match
- **Other entities**: As-is

## Timezone

All windows use **America/New_York** timezone:
- Inclusive start: `>= start_datetime`
- Exclusive end: `< end_datetime`

Example: Window from `2025-01-01T00:00:00-05:00` to `2025-01-15T00:00:00-05:00` includes transactions from Jan 1 00:00:00 EST through Jan 14 23:59:59 EST.

## Artifacts

Comparison results are persisted to:
```
artifacts/investigation_{entityType}_{slug(value)}_{winAstart}_{winBend}.json
```
Location: `artifacts/` directory at olorin-server root.

Slug generation: lowercase, replace special chars with hyphens, max 50 chars.

Example: `artifacts/investigation_email_user-example-com_20250530_20251113.json`

## Troubleshooting

### No Data Returned
- Verify entity value exists in database
- Check time window spans (may be no transactions in range)
- Verify merchant_ids if filtering by merchants

### Missing Metrics
- Check if `pending_label_count` is high (many unknown labels)
- Verify `predicted_risk` is not NULL for transactions
- Check `excluded_missing_predicted_risk` in response

### Performance Issues
- Entity filtering significantly improves performance
- Limit `max_merchants` if per-merchant breakdown is slow
- Disable `include_histograms` and `include_timeseries` if not needed

## Next Steps

1. Review [data-model.md](./data-model.md) for detailed data structures
2. Review [contracts/investigation-comparison-api.md](./contracts/investigation-comparison-api.md) for API details
3. See [tasks.md](./tasks.md) for implementation tasks (generated via `/speckit.tasks`)

