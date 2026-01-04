# API Contract: Investigation Comparison

**Feature**: Investigation Comparison Pipeline  
**Date**: 2025-01-27  
**Phase**: 1 - Design

## Endpoint

`POST /api/investigation/compare`

## Request

### Headers
```
Content-Type: application/json
```

### Body

```json
{
  "entity": {
    "type": "email",
    "value": "user@example.com"
  },
  "windowA": {
    "preset": "retro_14d_6mo_back"
  },
  "windowB": {
    "preset": "recent_14d"
  },
  "risk_threshold": 0.7,
  "merchant_ids": ["m_123", "m_456"],
  "options": {
    "include_per_merchant": true,
    "max_merchants": 25,
    "include_histograms": true,
    "include_timeseries": true
  }
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entity` | `object` | No | Entity filter: `{type: string, value: string}` |
| `entity.type` | `string` | If entity provided | One of: `email`, `phone`, `device_id`, `ip`, `account_id`, `card_fingerprint`, `merchant_id` |
| `entity.value` | `string` | If entity provided | Entity identifier value. For `card_fingerprint`: format "BIN|last4" or "BIN-last4" (e.g., "123456|7890") |
| `windowA` | `object` | Yes | Window A specification |
| `windowA.preset` | `string` | Yes | One of: `recent_14d`, `retro_14d_6mo_back`, `custom` |
| `windowA.start` | `string` (ISO 8601) | If preset is `custom` | Start datetime |
| `windowA.end` | `string` (ISO 8601) | If preset is `custom` | End datetime |
| `windowA.label` | `string` | No | Custom label |
| `windowB` | `object` | Yes | Window B specification (same structure as windowA) |
| `risk_threshold` | `float` | No | Risk threshold (default: from RISK_THRESHOLD_DEFAULT env var, fallback 0.7) |
| `merchant_ids` | `array[string]` | No | List of merchant IDs to filter |
| `options` | `object` | No | Comparison options |
| `options.include_per_merchant` | `boolean` | No | Include per-merchant breakdown (default: true) |
| `options.max_merchants` | `integer` | No | Max merchants in breakdown (default: 25) |
| `options.include_histograms` | `boolean` | No | Include risk histogram (default: false) |
| `options.include_timeseries` | `boolean` | No | Include daily timeseries (default: false) |

## Response

### Success Response (200 OK)

```json
{
  "entity": {
    "type": "email",
    "value": "user@example.com"
  },
  "threshold": 0.7,
  "windowA": {
    "label": "Retro 14d (6mo back)",
    "start": "2025-05-30T00:00:00-04:00",
    "end": "2025-06-13T00:00:00-04:00"
  },
  "windowB": {
    "label": "Recent 14d",
    "start": "2025-10-30T00:00:00-04:00",
    "end": "2025-11-13T00:00:00-04:00"
  },
  "A": {
    "total_transactions": 1832,
    "over_threshold": 241,
    "TP": 96,
    "FP": 41,
    "TN": 1467,
    "FN": 228,
    "precision": 0.70,
    "recall": 0.30,
    "f1": 0.42,
    "accuracy": 0.85,
    "fraud_rate": 0.18,
    "risk_histogram": [
      {"bin": "0-0.1", "n": 300},
      {"bin": "0.1-0.2", "n": 250}
    ],
    "timeseries_daily": [
      {"date": "2025-06-01", "count": 132, "TP": 10, "FP": 5, "TN": 100, "FN": 17}
    ]
  },
  "B": {
    "total_transactions": 2010,
    "over_threshold": 265,
    "TP": 110,
    "FP": 50,
    "TN": 1540,
    "FN": 310,
    "precision": 0.69,
    "recall": 0.26,
    "f1": 0.38,
    "accuracy": 0.82,
    "fraud_rate": 0.21,
    "pending_label_count": 87,
    "risk_histogram": [
      {"bin": "0.9-1.0", "n": 44}
    ],
    "timeseries_daily": [
      {"date": "2025-11-01", "count": 150, "TP": 12, "FP": 6, "TN": 115, "FN": 17}
    ]
  },
  "delta": {
    "precision": -0.01,
    "recall": -0.04,
    "f1": -0.04,
    "accuracy": -0.03,
    "fraud_rate": 0.03
  },
  "per_merchant": [
    {
      "merchant_id": "m_123",
      "A": {"TP": 40, "FP": 12, "TN": 510, "FN": 70},
      "B": {"TP": 44, "FP": 16, "TN": 530, "FN": 90},
      "delta": {"recall": -0.03}
    }
  ],
  "excluded_missing_predicted_risk": 5,
  "investigation_summary": "Over the last 14d, fraud_rate increased by 3pp vs the retro slice while recall fell by 4pp. Most lift came from merchants m_123 and m_456. Pending labels in recent may change FN/precision slightly."
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "ValidationError",
  "message": "Invalid window specification",
  "details": {
    "field": "windowA",
    "issue": "Custom preset requires both start and end dates"
  }
}
```

#### 422 Unprocessable Entity
```json
{
  "error": "ValidationError",
  "message": "Invalid entity type",
  "details": {
    "field": "entity.type",
    "provided": "invalid_type",
    "allowed": ["email", "phone", "device_id", "ip", "account_id", "card_fingerprint", "merchant_id"],
    "note": "For card_fingerprint, entity.value must be in format 'BIN|last4' or 'BIN-last4'"
  }
}
```

#### 500 Internal Server Error
```json
{
  "error": "InternalServerError",
  "message": "Failed to execute comparison",
  "details": {
    "error_type": "DatabaseError"
  }
}
```

## Timezone Handling

- All datetime values use America/New_York timezone
- Request datetimes must be ISO 8601 format with timezone
- Response datetimes include timezone offset (e.g., `-04:00` for EDT, `-05:00` for EST)
- Window boundaries: Inclusive start, exclusive end

## Performance Expectations

- Response time: <5 seconds for entity-scoped queries with <100K transactions per window
- Timeout: 30 seconds
- Rate limiting: Per API key/user (existing infrastructure)

## Example Requests

### Default Windows
```json
{
  "entity": {"type": "email", "value": "user@example.com"},
  "windowA": {"preset": "retro_14d_6mo_back"},
  "windowB": {"preset": "recent_14d"}
}
```

### Custom Windows
```json
{
  "entity": {"type": "phone", "value": "+15551234567"},
  "windowA": {
    "preset": "custom",
    "start": "2025-01-01T00:00:00-05:00",
    "end": "2025-01-15T00:00:00-05:00",
    "label": "January 2025"
  },
  "windowB": {
    "preset": "custom",
    "start": "2025-07-01T00:00:00-04:00",
    "end": "2025-07-15T00:00:00-04:00",
    "label": "July 2025"
  }
}
```

### Merchant-Scoped (No Entity)
```json
{
  "merchant_ids": ["m_123", "m_456"],
  "windowA": {"preset": "retro_14d_6mo_back"},
  "windowB": {"preset": "recent_14d"}
}
```

