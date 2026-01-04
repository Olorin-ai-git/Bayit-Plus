# Device Signals API Contracts

**Feature**: 001-composio-tools-integration  
**Date**: 2025-01-31  
**Status**: Complete

## Overview

API contract definitions for device fingerprint signal capture endpoints.

## Endpoints

### POST /api/device-signals

Capture device fingerprint signals from browser SDK.

**Request Body**:
```json
{
  "device_id": "fp_abc123",
  "transaction_id": "txn_xyz789",
  "user_id": "user_123",
  "confidence_score": 0.95,
  "browser_fingerprint": {
    "user_agent": "Mozilla/5.0...",
    "screen_resolution": "1920x1080",
    "timezone": "America/Los_Angeles",
    "language": "en-US"
  },
  "behavioral_signals": {
    "mouse_movements": [...],
    "typing_patterns": [...],
    "scroll_behavior": [...]
  },
  "sdk_provider": "fingerprint_pro"
}
```

**Response** (201 Created):
```json
{
  "device_id": "fp_abc123",
  "transaction_id": "txn_xyz789",
  "status": "captured",
  "captured_at": "2025-01-31T12:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request body (missing required fields, invalid confidence_score range)
- `500 Internal Server Error`: Snowflake write failure

## Data Models

### Device Signal Request

```typescript
interface DeviceSignalRequest {
  device_id: string;
  transaction_id?: string;
  user_id?: string;
  confidence_score: number;  // 0.0 - 1.0
  browser_fingerprint: {
    user_agent?: string;
    screen_resolution?: string;
    timezone?: string;
    language?: string;
    [key: string]: any;  // Additional browser fingerprint data
  };
  behavioral_signals?: {
    mouse_movements?: Array<any>;
    typing_patterns?: Array<any>;
    scroll_behavior?: Array<any>;
    [key: string]: any;  // Additional behavioral signals
  };
  sdk_provider: 'fingerprint_pro' | 'seon' | 'ipqs';
}
```

### Device Signal Response

```typescript
interface DeviceSignalResponse {
  device_id: string;
  transaction_id?: string;
  status: 'captured' | 'failed';
  captured_at: string;  // ISO 8601 timestamp
  error_message?: string;
}
```

