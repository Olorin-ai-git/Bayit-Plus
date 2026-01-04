# Anomaly Detection API Documentation

**Version**: 1.0.0  
**Base URL**: `/v1/analytics`  
**Feature**: 001-fraud-anomaly-detection

## Overview

The Anomaly Detection API provides endpoints for detecting, managing, and investigating fraud anomalies in transaction data. All endpoints follow RESTful conventions and return JSON responses.

## Authentication

All endpoints require authentication via Bearer token in the `Authorization` header:
```
Authorization: Bearer <token>
```

## Endpoints

### Detection

#### POST `/anomalies/detect`
Trigger an anomaly detection run for a detector.

**Request Body**:
```json
{
  "detector_id": "uuid",
  "window_from": "2024-01-01T00:00:00Z",
  "window_to": "2024-01-01T23:59:59Z",
  "cohorts": ["merchant_id:m1", "merchant_id:m2"]  // Optional
}
```

**Response** (202 Accepted):
```json
{
  "run_id": "uuid",
  "status": "queued",
  "detector_id": "uuid",
  "window_from": "2024-01-01T00:00:00Z",
  "window_to": "2024-01-01T23:59:59Z"
}
```

**Error Responses**:
- `400`: Invalid request (invalid detector_id, invalid time window)
- `404`: Detector not found
- `500`: Internal server error (Snowflake connection failure)

---

#### GET `/anomalies`
List detected anomalies with optional filters.

**Query Parameters**:
- `from` (optional): Start time (ISO 8601)
- `to` (optional): End time (ISO 8601)
- `severity` (optional): Filter by severity (`info`, `warn`, `critical`)
- `metric` (optional): Filter by metric name
- `cohort` (optional): Filter by cohort (JSON string)
- `status` (optional): Filter by status (`new`, `triaged`, `closed`)
- `limit` (optional): Maximum results (default: 100, max: 1000)
- `offset` (optional): Pagination offset (default: 0)

**Response** (200 OK):
```json
{
  "anomalies": [
    {
      "id": "uuid",
      "run_id": "uuid",
      "detector_id": "uuid",
      "cohort": {"merchant_id": "m1"},
      "window_start": "2024-01-01T00:00:00Z",
      "window_end": "2024-01-01T00:15:00Z",
      "metric": "tx_count",
      "observed": 150.0,
      "expected": 100.0,
      "score": 5.0,
      "severity": "critical",
      "persisted_n": 3,
      "status": "new",
      "created_at": "2024-01-01T00:15:00Z"
    }
  ],
  "total": 42,
  "limit": 100,
  "offset": 0
}
```

---

#### GET `/anomalies/{anomaly_id}`
Get details for a specific anomaly.

**Response** (200 OK):
```json
{
  "id": "uuid",
  "run_id": "uuid",
  "detector_id": "uuid",
  "cohort": {"merchant_id": "m1"},
  "window_start": "2024-01-01T00:00:00Z",
  "window_end": "2024-01-01T00:15:00Z",
  "metric": "tx_count",
  "observed": 150.0,
  "expected": 100.0,
  "score": 5.0,
  "severity": "critical",
  "persisted_n": 3,
  "status": "new",
  "evidence": {
    "residuals": [0.1, 0.2, 5.0],
    "trend": [100, 101, 150]
  },
  "investigation_id": "uuid",
  "created_at": "2024-01-01T00:15:00Z"
}
```

**Error Responses**:
- `404`: Anomaly not found
- `422`: Invalid UUID format

---

#### WebSocket `/stream/anomalies`
Stream real-time anomaly events.

**Query Parameters**:
- `severity` (optional): Filter by severity
- `metric` (optional): Filter by metric
- `since` (optional): Resume from timestamp (ISO 8601)

**Message Format**:
```json
{
  "id": "uuid",
  "detector_id": "uuid",
  "cohort": {"merchant_id": "m1"},
  "metric": "tx_count",
  "score": 5.0,
  "severity": "critical",
  "created_at": "2024-01-01T00:15:00Z"
}
```

**Reconnection**: Client should auto-reconnect on disconnect and use `since` parameter to resume from last received timestamp.

---

### Detectors

#### GET `/detectors`
List all detectors.

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "name": "STL+MAD Detector",
    "type": "stl_mad",
    "cohort_by": ["merchant_id", "channel"],
    "metrics": ["tx_count", "decline_rate"],
    "params": {
      "k": 3.5,
      "persistence": 2,
      "min_support": 50
    },
    "enabled": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

---

#### POST `/detectors`
Create a new detector.

**Request Body**:
```json
{
  "name": "New Detector",
  "type": "stl_mad",
  "cohort_by": ["merchant_id"],
  "metrics": ["tx_count"],
  "params": {
    "k": 3.5,
    "persistence": 2,
    "min_support": 50
  },
  "enabled": true
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "name": "New Detector",
  ...
}
```

**Error Responses**:
- `400`: Invalid detector type or parameters
- `422`: Missing required fields

---

#### GET `/detectors/{detector_id}`
Get detector details.

**Response** (200 OK): Same as POST response

**Error Responses**:
- `404`: Detector not found

---

#### PUT `/detectors/{detector_id}`
Update detector configuration.

**Request Body**: Same as POST

**Response** (200 OK): Updated detector

**Error Responses**:
- `404`: Detector not found
- `400`: Invalid parameters

---

#### DELETE `/detectors/{detector_id}`
Delete a detector.

**Response** (204 No Content)

**Error Responses**:
- `404`: Detector not found

---

#### POST `/detectors/{detector_id}/preview`
Preview detector on sample data (client-side scoring).

**Request Body**:
```json
{
  "window_from": "2024-01-01T00:00:00Z",
  "window_to": "2024-01-01T23:59:59Z",
  "cohort": {"merchant_id": "m1"},
  "metric": "tx_count"
}
```

**Response** (200 OK):
```json
{
  "anomalies": [
    {
      "window_start": "2024-01-01T00:00:00Z",
      "window_end": "2024-01-01T00:15:00Z",
      "observed": 150.0,
      "expected": 100.0,
      "score": 5.0,
      "persisted_n": 2
    }
  ],
  "total_points": 96,
  "anomalies_count": 3
}
```

---

### Replay

#### POST `/replay`
Replay detection with different parameters and compare against production.

**Request Body**:
```json
{
  "detector_id": "uuid",
  "window_from": "2024-01-01T00:00:00Z",
  "window_to": "2024-01-01T23:59:59Z",
  "params": {
    "k": 4.0,
    "persistence": 3
  }
}
```

**Response** (202 Accepted):
```json
{
  "replay_id": "uuid",
  "status": "queued",
  "detector_id": "uuid"
}
```

**Poll Status**: GET `/replay/{replay_id}` or check detection run status

---

#### GET `/replay/{replay_id}/comparison`
Get replay comparison results.

**Response** (200 OK):
```json
{
  "replay_id": "uuid",
  "detector_id": "uuid",
  "production_anomalies": 10,
  "replay_anomalies": 8,
  "new_anomalies": 2,
  "missing_anomalies": 4,
  "overlap": 6,
  "comparison": {
    "new_only": [...],
    "missing_only": [...],
    "overlap": [...]
  }
}
```

---

### Investigation

#### POST `/anomalies/{anomaly_id}/investigate`
Create an investigation for an anomaly.

**Response** (201 Created):
```json
{
  "investigation_id": "uuid",
  "anomaly_id": "uuid",
  "status": "created"
}
```

---

## Error Response Format

All errors follow this format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    }
  }
}
```

**Common Error Codes**:
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `CONNECTION_ERROR`: Database connection failed
- `INTERNAL_ERROR`: Internal server error

## Rate Limiting

- Default: 100 requests per minute per IP
- WebSocket: No rate limit (throttled client-side)

## Pagination

List endpoints support pagination via `limit` and `offset`:
- Default `limit`: 100
- Maximum `limit`: 1000
- `offset`: 0-based index

## WebSocket Best Practices

1. **Auto-reconnect**: Implement exponential backoff (3s, 6s, 12s)
2. **Resume**: Use `since` parameter to resume from last timestamp
3. **Throttling**: Batch updates client-side (2-3 second intervals)
4. **Error handling**: Log errors but continue reconnecting

## Examples

### Python
```python
import requests

# List anomalies
response = requests.get(
    "https://api.example.com/v1/analytics/anomalies",
    headers={"Authorization": "Bearer <token>"},
    params={"severity": "critical", "limit": 50}
)
anomalies = response.json()["anomalies"]
```

### JavaScript
```javascript
// WebSocket connection
const ws = new WebSocket(
  'wss://api.example.com/v1/analytics/stream/anomalies?severity=critical'
);

ws.onmessage = (event) => {
  const anomaly = JSON.parse(event.data);
  console.log('Anomaly detected:', anomaly);
};
```

## OpenAPI Schema

Full OpenAPI 3.0 schema available at:
- Swagger UI: `/apidoc/swagger`
- ReDoc: `/apidoc/redoc`
- JSON Schema: `/openapi.json`

