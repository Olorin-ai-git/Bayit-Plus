# IP Risk API Documentation

## Overview

The IP Risk API provides endpoints for scoring IP addresses using MaxMind minFraud API, with automatic caching, rate limiting, fallback to AbuseIPDB, and persistence to Snowflake.

## Base URL

```
/api/ip-risk
```

## Authentication

All endpoints require authentication via Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tenant ID is automatically extracted from the authenticated user's context.

## Endpoints

### Score IP Address

**POST** `/api/ip-risk/score`

Score an IP address for fraud risk using MaxMind minFraud API.

**Request Body:**
```json
{
  "transaction_id": "txn_abc123",
  "ip_address": "192.168.1.1",
  "email": "user@example.com",
  "billing_country": "US",
  "transaction_amount": 99.99,
  "currency": "USD"
}
```

**Response:**
```json
{
  "transaction_id": "txn_abc123",
  "ip_address": "192.168.1.1",
  "risk_score": 0.25,
  "is_proxy": false,
  "is_vpn": false,
  "is_tor": false,
  "geolocation": {
    "country": {
      "code": "US",
      "name": "United States"
    },
    "region": {
      "code": "CA",
      "name": "California"
    },
    "city": {
      "name": "San Francisco"
    }
  },
  "velocity_signals": {
    "transaction_count_24h": 3,
    "transaction_count_7d": 12
  },
  "scored_at": "2024-01-15T10:30:00Z",
  "cached": false,
  "provider": "maxmind"
}
```

**Example:**
```bash
curl -X POST https://api.olorin.com/api/ip-risk/score \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "txn_abc123",
    "ip_address": "192.168.1.1",
    "email": "user@example.com",
    "billing_country": "US",
    "transaction_amount": 99.99,
    "currency": "USD"
  }'
```

### Get Cached Score

**GET** `/api/ip-risk/score/{ip_address}`

Get cached IP risk score if available.

**Path Parameters:**
- `ip_address` (string, required): IP address to lookup

**Query Parameters:**
- `transaction_id` (string, optional): Transaction ID for context

**Response:**
```json
{
  "transaction_id": "txn_abc123",
  "ip_address": "192.168.1.1",
  "risk_score": 0.25,
  "is_proxy": false,
  "is_vpn": false,
  "is_tor": false,
  "scored_at": "2024-01-15T10:30:00Z",
  "cached": true,
  "provider": "maxmind"
}
```

### Batch Score IPs

**POST** `/api/ip-risk/batch-score`

Score multiple IP addresses in batch.

**Request Body:**
```json
{
  "ips": [
    {
      "transaction_id": "txn_abc123",
      "ip_address": "192.168.1.1",
      "email": "user1@example.com"
    },
    {
      "transaction_id": "txn_def456",
      "ip_address": "192.168.1.2",
      "email": "user2@example.com"
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "transaction_id": "txn_abc123",
      "ip_address": "192.168.1.1",
      "risk_score": 0.25,
      "cached": false
    },
    {
      "transaction_id": "txn_def456",
      "ip_address": "192.168.1.2",
      "risk_score": 0.75,
      "cached": true
    }
  ],
  "total": 2,
  "cached_count": 1
}
```

## Data Flow

1. **POST /score** receives IP scoring request
2. **Redis Cache** checked for cached score (1 hour TTL)
3. **MaxMind API** called if cache miss (with rate limiting)
4. **AbuseIPDB Fallback** used if MaxMind unavailable
5. **Snowflake Persistence** stores score in `ip_risk_scores` table
6. **Kafka Producer** publishes event to Kafka topic for Snowpipe Streaming
7. **Snowpipe Streaming** ingests event to Snowflake `events_staging` table
8. **Dynamic Table** `features_curated` refreshes with IP risk features (1 minute freshness)

## Caching

- IP risk scores are cached in Redis for 1 hour
- Cache key format: `ip_risk:{ip_address}`
- Cache hit rate typically >80% for repeated IPs

## Rate Limiting

- MaxMind API: 1000 requests per day (configurable)
- Internal rate limiting: 100 requests per minute per tenant
- Request queuing for burst traffic

## Fallback Behavior

If MaxMind API is unavailable:
1. Check Redis cache for recent score
2. Fallback to AbuseIPDB API
3. Return cached AbuseIPDB score if available
4. Log fallback usage for monitoring

## Error Responses

**400 Bad Request:**
```json
{
  "detail": "Invalid IP address format"
}
```

**401 Unauthorized:**
```json
{
  "detail": "Missing or invalid authentication token"
}
```

**429 Too Many Requests:**
```json
{
  "detail": "Rate limit exceeded. Please retry after 60 seconds."
}
```

**500 Internal Server Error:**
```json
{
  "detail": "Failed to score IP address"
}
```

## Security

- IP addresses are validated before processing
- Rate limiting prevents abuse
- Cached scores reduce external API calls
- Tenant isolation enforced at database level

