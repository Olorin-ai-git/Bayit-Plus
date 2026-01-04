# Data Model: Investigation Comparison Pipeline

**Feature**: Investigation Comparison Pipeline  
**Date**: 2025-01-27  
**Phase**: 1 - Design

## Overview

This document defines the data models for the investigation comparison pipeline, including request/response structures, window specifications, and metrics representations.

## Core Models

### WindowSpec

Specification for a time window in comparison.

```python
class WindowSpec(BaseModel):
    preset: WindowPreset  # 'recent_14d' | 'retro_14d_6mo_back' | 'custom'
    start: Optional[datetime]  # Required if preset is 'custom'
    end: Optional[datetime]    # Required if preset is 'custom'
    label: Optional[str]      # Custom label
```

**Preset Types**:
- `recent_14d`: Recent 14 days (today-14d to today)
- `retro_14d_6mo_back`: Retrospective 14 days, 6 months back
- `custom`: User-specified start/end dates

### ComparisonRequest

Request payload for comparison API.

```python
class ComparisonRequest(BaseModel):
    entity: Optional[Dict[str, str]]  # {'type': 'email', 'value': 'user@example.com'}
    windowA: WindowSpec
    windowB: WindowSpec
    risk_threshold: float = 0.7  # Default from config
    merchant_ids: Optional[List[str]]
    options: Optional[ComparisonOptions]
```

**Entity Types**: `email`, `phone`, `device_id`, `ip`, `account_id`, `card_fingerprint`, `merchant_id`

### ComparisonOptions

Options for comparison computation.

```python
class ComparisonOptions(BaseModel):
    include_per_merchant: bool = True
    max_merchants: int = 25  # Cap for per-merchant breakdown
    include_histograms: bool = False
    include_timeseries: bool = False
```

### WindowMetrics

Aggregated metrics for a single window.

```python
class WindowMetrics(BaseModel):
    total_transactions: int
    over_threshold: int  # predicted_risk >= risk_threshold
    TP: int  # True Positives
    FP: int  # False Positives
    TN: int  # True Negatives
    FN: int  # False Negatives
    precision: float  # TP / (TP + FP)
    recall: float    # TP / (TP + FN)
    f1: float        # 2 * (precision * recall) / (precision + recall)
    accuracy: float  # (TP + TN) / (TP + FP + TN + FN)
    fraud_rate: float  # Mean of is_fraud (known labels only)
    pending_label_count: Optional[int]  # NULL actual_outcome count
    risk_histogram: Optional[List[HistogramBin]]  # 10 bins
    timeseries_daily: Optional[List[TimeseriesDaily]]  # 14-day daily aggregates
```

### HistogramBin

Risk histogram bin.

```python
class HistogramBin(BaseModel):
    bin: str  # e.g., "0-0.1", "0.1-0.2", ..., "0.9-1.0"
    n: int    # Count in bin
```

### TimeseriesDaily

Daily timeseries data point.

```python
class TimeseriesDaily(BaseModel):
    date: str  # YYYY-MM-DD
    count: int  # Transaction count
    TP: Optional[int]
    FP: Optional[int]
    TN: Optional[int]
    FN: Optional[int]
```

### DeltaMetrics

Delta metrics (B - A).

```python
class DeltaMetrics(BaseModel):
    precision: float
    recall: float
    f1: float
    accuracy: float
    fraud_rate: float
```

### ComparisonResponse

Complete comparison result.

```python
class ComparisonResponse(BaseModel):
    entity: Optional[Dict[str, str]]
    threshold: float
    windowA: WindowInfo  # {label, start, end}
    windowB: WindowInfo
    A: WindowMetrics
    B: WindowMetrics
    delta: DeltaMetrics
    per_merchant: Optional[List[PerMerchantMetrics]]
    excluded_missing_predicted_risk: Optional[int]
    investigation_summary: str  # 3-6 sentences
```

### PerMerchantMetrics

Per-merchant comparison metrics.

```python
class PerMerchantMetrics(BaseModel):
    merchant_id: str
    A: Dict[str, Any]  # Partial WindowMetrics
    B: Dict[str, Any]
    delta: Dict[str, float]  # Partial DeltaMetrics
```

## Database Schema Mapping

### Transaction Table Columns

| Entity Type | Snowflake Column | PostgreSQL Column |
|------------|------------------|-------------------|
| email | EMAIL, EMAIL_NORMALIZED | email, email_normalized |
| phone | PHONE_NUMBER | phone_number |
| device_id | DEVICE_ID | device_id |
| ip | IP | ip |
| account_id | ACCOUNT_ID | account_id |
| card_fingerprint | CARD_BIN, LAST_FOUR | card_bin, last_four | **Note**: Matching requires both BIN and last4 to match (WHERE CARD_BIN = ? AND LAST_FOUR = ?) |
| merchant_id | MERCHANT_ID | merchant_id |

### Core Transaction Columns

| Field | Snowflake | PostgreSQL |
|-------|-----------|------------|
| Transaction ID | TX_ID_KEY | tx_id_key |
| Event Timestamp | TX_DATETIME | tx_datetime |
| Predicted Risk | MODEL_SCORE | model_score |
| Actual Outcome | IS_FRAUD_TX | is_fraud_tx |

### Label Mapping

```python
is_fraud = CASE
    WHEN actual_outcome IN ('FRAUD', 1, TRUE) THEN 1
    WHEN actual_outcome IN ('NOT_FRAUD', 0, FALSE) THEN 0
    ELSE NULL
END

predicted_label = CASE
    WHEN predicted_risk >= risk_threshold THEN 1
    ELSE 0
END
```

### Card Fingerprint Matching

For `entity_type='card_fingerprint'`, the entity_value should contain both BIN and last4 (format: "BIN|last4" or "BIN-last4"). Matching logic:
- Parse entity_value to extract BIN and last4
- Query: `WHERE CARD_BIN = :bin AND LAST_FOUR = :last_four`
- Both values must match (AND condition, not OR)

## Data Flow

1. **Request** → Parse `ComparisonRequest`
2. **Window Computation** → Compute start/end dates for Window A and B
3. **Entity Filtering** → Build WHERE clause for entity/merchant filters
4. **Query Execution** → Fetch transactions from database
5. **Metrics Calculation** → Compute confusion matrix, derived metrics
6. **Optional Aggregations** → Histograms, timeseries if requested
7. **Delta Computation** → Calculate B - A for metrics
8. **Summary Generation** → Generate prose summary
9. **Response** → Return `ComparisonResponse`
10. **Persistence** → Save to artifacts directory

## Edge Cases

### Zero Transactions
- Return zeros for all metrics
- Set `total_transactions = 0`
- Generate summary noting empty windows

### Missing Predicted Risk
- Exclude from `over_threshold` count
- Include in `total_transactions`
- Report `excluded_missing_predicted_risk`

### Pending Labels
- Count in `pending_label_count`
- Exclude from confusion matrix (TP/FP/TN/FN)
- Include in `total_transactions`

### Divide-by-Zero
- Return 0.0 for precision/recall/F1 if denominator is zero
- Log warning for monitoring
- Never crash

### Large Merchant Sets
- Compute global totals on all merchants
- Cap `per_merchant` array at `max_merchants`
- Sort by transaction volume (descending)

## Validation Rules

1. **Window Validation**:
   - Custom windows require both start and end
   - End must be after start
   - Windows must not be in the future

2. **Entity Validation**:
   - Entity type must be one of supported types
   - Entity value must be non-empty if type provided
   - For `card_fingerprint`: Entity value must contain both BIN and last4 (format: "BIN|last4" or "BIN-last4")

3. **Threshold Validation**:
   - Risk threshold must be between 0.0 and 1.0
   - Default: From RISK_THRESHOLD_DEFAULT environment variable, fallback to 0.7 if not set

4. **Options Validation**:
   - `max_merchants` must be between 1 and 1000

5. **Slug Generation** (for artifact filenames):
   - Convert to lowercase
   - Replace special characters with hyphens
   - Maximum length: 50 characters
   - Example: "user@example.com" → "user-example-com"

