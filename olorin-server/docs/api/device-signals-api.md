# Device Signals API Documentation

## Overview

The Device Signals API provides endpoints for ingesting device fingerprinting data from client-side SDKs (Fingerprint Pro, SEON, IPQS) and retrieving device analysis results for fraud detection.

## Base URL

```
/api/device-signals
```

## Authentication

All endpoints require authentication via Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tenant ID is automatically extracted from the authenticated user's context.

## Endpoints

### Ingest Device Signal

**POST** `/api/device-signals/ingest`

Ingest device fingerprinting signal from client-side SDK.

**Request Body:**
```json
{
  "device_id": "fp_1234567890abcdef",
  "transaction_id": "txn_abc123",
  "user_id": "user_456",
  "confidence_score": 0.95,
  "browser_fingerprint": {
    "user_agent": "Mozilla/5.0...",
    "screen_resolution": "1920x1080",
    "timezone": "America/New_York",
    "language": "en-US"
  },
  "behavioral_signals": {
    "mouse_movements": [...],
    "keystroke_timing": [...],
    "scroll_patterns": [...]
  },
  "sdk_provider": "fingerprint_pro",
  "captured_at": "2024-01-15T10:30:00Z"
}
```

**Response:**
```json
{
  "status": "success",
  "device_id": "fp_1234567890abcdef",
  "transaction_id": "txn_abc123",
  "snowflake": {
    "status": "success",
    "device_id": "fp_1234567890abcdef"
  },
  "splunk": {
    "status": "success",
    "event_id": "device_signal_fp_1234567890abcdef"
  },
  "kafka": {
    "status": "success",
    "event_id": "device_signal_fp_1234567890abcdef_2024-01-15T10:30:00Z"
  }
}
```

**Example:**
```bash
curl -X POST https://api.olorin.com/api/device-signals/ingest \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "fp_1234567890abcdef",
    "transaction_id": "txn_abc123",
    "user_id": "user_456",
    "confidence_score": 0.95,
    "sdk_provider": "fingerprint_pro"
  }'
```

### Get Device Signal

**GET** `/api/device-signals/{device_id}`

Get device signal by device ID.

**Path Parameters:**
- `device_id` (string, required): Device fingerprint identifier

**Query Parameters:**
- `transaction_id` (string, optional): Filter by transaction ID

**Response:**
```json
{
  "device_id": "fp_1234567890abcdef",
  "transaction_id": "txn_abc123",
  "user_id": "user_456",
  "tenant_id": "tenant_123",
  "confidence_score": 0.95,
  "browser_fingerprint": {...},
  "behavioral_signals": {...},
  "sdk_provider": "fingerprint_pro",
  "captured_at": "2024-01-15T10:30:00Z"
}
```

### List Device Signals

**GET** `/api/device-signals`

List device signals with optional filtering.

**Query Parameters:**
- `user_id` (string, optional): Filter by user ID
- `transaction_id` (string, optional): Filter by transaction ID
- `sdk_provider` (string, optional): Filter by SDK provider
- `limit` (integer, optional): Maximum number of results (default: 100)
- `offset` (integer, optional): Pagination offset (default: 0)

**Response:**
```json
{
  "signals": [
    {
      "device_id": "fp_1234567890abcdef",
      "transaction_id": "txn_abc123",
      "user_id": "user_456",
      "confidence_score": 0.95,
      "sdk_provider": "fingerprint_pro",
      "captured_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

## Data Flow

1. **Client-side SDK** captures device fingerprint
2. **POST /ingest** receives signal and validates SDK provider matches tenant configuration
3. **Signal Processor** persists to Snowflake `device_signals` table
4. **Splunk Mirror** sends event to Splunk for real-time alerting
5. **Kafka Producer** publishes event to Kafka topic for Snowpipe Streaming
6. **Snowpipe Streaming** ingests event to Snowflake `events_staging` table
7. **Dynamic Table** `features_curated` refreshes with device features (1 minute freshness)

## SDK Providers

Supported SDK providers:
- `fingerprint_pro`: Fingerprint Pro SDK
- `seon`: SEON Device Fingerprinting SDK
- `ipqs`: IPQualityScore Device Fingerprinting SDK

Tenant SDK selection is configured via `/api/tenants/{tenant_id}/device-sdk-config`.

## Error Responses

**400 Bad Request:**
```json
{
  "detail": "Invalid device signal data"
}
```

**401 Unauthorized:**
```json
{
  "detail": "Missing or invalid authentication token"
}
```

**403 Forbidden:**
```json
{
  "detail": "SDK provider mismatch with tenant configuration"
}
```

**500 Internal Server Error:**
```json
{
  "detail": "Failed to process device signal"
}
```

## Rate Limiting

- Ingestion: 1000 requests per minute per tenant
- Retrieval: 100 requests per minute per tenant

## Security

- Device signals are tenant-scoped
- SDK provider validation ensures tenant configuration compliance
- Sensitive behavioral signals are encrypted in transit

