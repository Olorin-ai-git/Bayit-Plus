# IP Risk Scoring API Contracts

**Feature**: 001-composio-tools-integration  
**Date**: 2025-01-31  
**Status**: Complete

## Overview

API contract definitions for MaxMind minFraud IP risk scoring endpoints.

## Endpoints

### POST /api/ip-risk/score

Score a transaction using MaxMind minFraud.

**Request Body**:
```json
{
  "transaction_id": "txn_xyz789",
  "ip_address": "192.0.2.1",
  "email": "user@example.com",
  "billing_country": "US",
  "transaction_amount": 100.00,
  "currency": "USD"
}
```

**Response** (200 OK):
```json
{
  "transaction_id": "txn_xyz789",
  "ip_address": "192.0.2.1",
  "risk_score": 75.5,
  "is_proxy": true,
  "is_vpn": false,
  "is_tor": false,
  "geolocation": {
    "country": {"code": "US", "name": "United States"},
    "region": {"name": "California"},
    "city": {"name": "San Francisco"}
  },
  "velocity_signals": {
    "transaction_count_24h": 5,
    "transaction_count_7d": 20
  },
  "scored_at": "2025-01-31T12:00:00Z",
  "cached": false
}
```

**Error Responses**:
- `400 Bad Request`: Invalid IP address or missing required fields
- `429 Too Many Requests`: MaxMind rate limit exceeded
- `500 Internal Server Error`: MaxMind API error or Snowflake write failure

### GET /api/ip-risk/score/{ip_address}

Get cached IP risk score (if available).

**Path Parameters**:
- `ip_address` (string, required): IP address to query

**Response** (200 OK):
```json
{
  "ip_address": "192.0.2.1",
  "risk_score": 75.5,
  "is_proxy": true,
  "is_vpn": false,
  "is_tor": false,
  "cached": true,
  "cached_at": "2025-01-31T11:00:00Z",
  "expires_at": "2025-01-31T12:00:00Z"
}
```

**Error Responses**:
- `404 Not Found`: IP address not found in cache
- `400 Bad Request`: Invalid IP address format

## Data Models

### IP Risk Score Request

```typescript
interface IPRiskScoreRequest {
  transaction_id: string;
  ip_address: string;  // IPv4 or IPv6
  email?: string;
  billing_country?: string;
  transaction_amount?: number;
  currency?: string;
  [key: string]: any;  // Additional transaction data
}
```

### IP Risk Score Response

```typescript
interface IPRiskScoreResponse {
  transaction_id: string;
  ip_address: string;
  risk_score: number;  // 0.0 - 100.0
  is_proxy: boolean;
  is_vpn: boolean;
  is_tor: boolean;
  geolocation?: {
    country?: {code: string; name: string};
    region?: {name: string};
    city?: {name: string};
  };
  velocity_signals?: {
    transaction_count_24h?: number;
    transaction_count_7d?: number;
    [key: string]: any;
  };
  scored_at: string;  // ISO 8601 timestamp
  cached: boolean;
}
```

