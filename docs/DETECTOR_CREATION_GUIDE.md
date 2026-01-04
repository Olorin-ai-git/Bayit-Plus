# Creating Detectors from Investigation Findings

## Overview

When an investigation reveals anomalies, you can create detectors to automatically catch similar patterns in the future. This guide explains how to map investigation findings to detector configuration.

## Available Metrics

Detectors can monitor these metrics from the `transaction_windows` view:

### Basic Metrics
- **`tx_count`** - Total transaction count per window
- **`unique_users`** - Count of distinct users
- **`unique_cards`** - Count of distinct cards  
- **`unique_devices`** - Count of distinct devices

### Amount Metrics
- **`amount_mean`** - Average transaction amount
- **`amount_p90`** - 90th percentile transaction amount
- **`amount_std`** - Standard deviation of transaction amounts

### Rate Metrics
- **`decline_rate`** - Proportion of declined transactions (0-1)
- **`refund_rate`** - Proportion of refunded transactions (0-1)
- **`cnp_share`** - Card-not-present transaction share (0-1)

### Derived Metrics
- **`tx_per_user`** - Average transactions per user
- **`method_share_card`** - Card payment method share (0-1)
- **`method_share_ach`** - ACH payment method share (0-1)
- **`method_share_alt`** - Alternative payment method share (0-1)

## Available Cohort Dimensions

Detectors can group by these dimensions:

- **`geo`** - Geographic region (maps to `ip_country_code` in database)
- **`merchant_id`** - Merchant identifier (maps to `store_id` in database)
- **`channel`** - Channel type (maps to `device_type` in database)

## Detector Types

1. **`stl_mad`** - STL decomposition + Median Absolute Deviation (best for seasonal patterns)
2. **`cusum`** - Cumulative Sum (best for detecting mean shifts)
3. **`isoforest`** - Isolation Forest (best for multivariate anomalies)
4. **`rcf`** - Random Cut Forest (best for streaming data)
5. **`matrix_profile`** - Matrix Profile (best for pattern matching)

## Step-by-Step Guide

### Step 1: Review Investigation Report

Look at your investigation report and identify:
1. **What metrics were anomalous?** (e.g., high decline_rate, unusual tx_count)
2. **What dimensions were involved?** (e.g., specific geo region, merchant, channel)
3. **What time patterns?** (e.g., sudden spike, gradual increase)

### Step 2: Map Findings to Detector Config

**Example Investigation Findings:**
- High decline rate for transactions from Russia (geo: RU)
- Unusual transaction count spike
- Multiple devices used

**Detector Configuration:**
```json
{
  "name": "High Decline Rate - Russia",
  "type": "stl_mad",
  "cohort_by": ["geo"],
  "metrics": ["decline_rate", "tx_count"],
  "params": {
    "period": 672,
    "robust": true,
    "k": 3.5,
    "persistence": 2,
    "min_support": 50,
    "severity_thresholds": {
      "info_max": 3.0,
      "warn_max": 4.5,
      "critical_min": 4.5
    }
  },
  "enabled": true
}
```

### Step 3: Use Helper Script

```bash
# Analyze investigation and suggest detector config
poetry run python scripts/create_detector_from_investigation.py \
  --investigation-id <your-investigation-id>

# Create the detector automatically
poetry run python scripts/create_detector_from_investigation.py \
  --investigation-id <your-investigation-id> \
  --create
```

### Step 4: Create via API

```bash
curl -X POST http://localhost:8090/api/v1/analytics/detectors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "High Decline Rate - Russia",
    "type": "stl_mad",
    "cohort_by": ["geo"],
    "metrics": ["decline_rate", "tx_count"],
    "params": {
      "k": 3.5,
      "persistence": 2,
      "min_support": 50
    },
    "enabled": true
  }'
```

## Common Patterns

### Pattern 1: Geographic Fraud
**Findings:** High fraud in specific countries
**Detector:**
```json
{
  "cohort_by": ["geo"],
  "metrics": ["decline_rate", "tx_count", "amount_mean"]
}
```

### Pattern 2: Merchant-Specific Issues
**Findings:** Specific merchant has unusual patterns
**Detector:**
```json
{
  "cohort_by": ["merchant_id", "channel"],
  "metrics": ["tx_count", "decline_rate"]
}
```

### Pattern 3: Device Anomalies
**Findings:** Unusual device patterns
**Detector:**
```json
{
  "cohort_by": ["channel", "geo"],
  "metrics": ["unique_devices", "tx_per_user"]
}
```

### Pattern 4: Payment Method Shifts
**Findings:** Unusual payment method distribution
**Detector:**
```json
{
  "cohort_by": ["geo"],
  "metrics": ["method_share_card", "method_share_ach", "cnp_share"]
}
```

## Parameter Tuning

### Sensitivity (`k` parameter)
- **Lower k (e.g., 2.5)** = More sensitive, more anomalies detected
- **Higher k (e.g., 4.5)** = Less sensitive, fewer false positives

### Persistence (`persistence` parameter)
- **Lower (e.g., 1)** = Alert on single window anomaly
- **Higher (e.g., 3)** = Require anomaly to persist across multiple windows

### Minimum Support (`min_support` parameter)
- Minimum number of data points required before detecting anomalies
- Prevents false positives on sparse data

## Testing Your Detector

1. **Preview Mode:** Test detector on historical data without creating anomalies
   ```bash
   POST /api/v1/analytics/detectors/{detector_id}/preview
   ```

2. **Run Detection:** Execute detector on a time window
   ```bash
   POST /api/v1/analytics/anomalies/detect
   {
     "detector_id": "...",
     "window_from": "2025-01-01T00:00:00Z",
     "window_to": "2025-01-08T00:00:00Z"
   }
   ```

3. **Review Anomalies:** Check if detector catches expected patterns
   ```bash
   GET /api/v1/analytics/anomalies?detector_id=...
   ```

## Best Practices

1. **Start Broad, Then Narrow:** Begin with common metrics (`tx_count`, `decline_rate`) and common cohorts (`geo`), then refine based on results

2. **Use Multiple Metrics:** Monitor related metrics together (e.g., `tx_count` + `decline_rate` + `amount_mean`)

3. **Match Investigation Scope:** If investigation found issues in specific geo regions, create geo-based detector

4. **Test Before Enabling:** Use preview mode to validate detector behavior before enabling

5. **Monitor Detector Performance:** Review anomaly quality and adjust parameters as needed

6. **Document Detector Purpose:** Use descriptive names that explain what the detector is looking for

## Troubleshooting

**No anomalies detected:**
- Lower `k` parameter (more sensitive)
- Reduce `persistence` requirement
- Check if metrics/cohorts match your data

**Too many false positives:**
- Increase `k` parameter (less sensitive)
- Increase `persistence` requirement
- Increase `min_support` to require more data

**Detector not finding expected patterns:**
- Verify metrics exist in `transaction_windows` view
- Check cohort dimensions match investigation findings
- Try different detector type (e.g., `cusum` for sudden changes vs `stl_mad` for seasonal)

