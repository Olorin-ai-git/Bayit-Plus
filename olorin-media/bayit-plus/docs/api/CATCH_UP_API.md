# Catch-Up API Reference

**Date**: 2026-01-30
**Status**: Implemented (Beta 500)
**Component**: AI-Powered Catch-Up Summaries
**Base URL**: `/api/v1/live/{channel_id}/catchup`

---

## Table of Contents

1. [Endpoints](#endpoints)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Data Models](#data-models)
5. [Related Documents](#related-documents)

---

## Endpoints

### GET `/api/v1/live/{channel_id}/catchup`

Generate or retrieve a cached AI-powered catch-up summary for a live channel. Summarizes what has been broadcast in a configurable time window, enriched with EPG (Electronic Program Guide) data.

**Authentication**: Required (Firebase JWT Bearer token, Beta 500 user)

**Credit Cost**: 5 credits per generated summary. Cached responses cost 0 credits.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `channel_id` | string | The unique identifier of the live channel |

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `window_minutes` | integer | 15 (from `CATCHUP_DEFAULT_WINDOW_MINUTES`) | Number of minutes of content to summarize |
| `target_language` | string | `en` | Target language for the summary (ISO 639-1 code) |

**Response** (200 OK):

```json
{
  "summary": "The show has been discussing the upcoming municipal elections in Tel Aviv, focusing on the candidates' positions on public transportation infrastructure and housing development.",
  "key_points": [
    "Three mayoral candidates debated public transit expansion plans",
    "Housing prices in central Tel Aviv increased 12% year-over-year",
    "New light rail extension approved for southern neighborhoods",
    "Audience poll showed 58% support for green transportation initiatives",
    "Next segment will cover education policy proposals"
  ],
  "program_info": {
    "program_name": "Evening News with Yonit Levi",
    "program_start": "2026-01-30T18:00:00Z",
    "program_end": "2026-01-30T19:00:00Z",
    "category": "News"
  },
  "window_start": "2026-01-30T18:15:00Z",
  "window_end": "2026-01-30T18:30:00Z",
  "cached": false,
  "credits_used": 5,
  "remaining_credits": 245
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `summary` | string | AI-generated summary of the broadcast content (max `CATCHUP_MAX_SUMMARY_CHARS` characters) |
| `key_points` | string[] | Bullet-point highlights (max `CATCHUP_MAX_SUMMARY_KEY_POINTS` items) |
| `program_info` | object or null | EPG metadata for the current program (null if EPG data unavailable) |
| `program_info.program_name` | string | Name of the currently broadcasting program |
| `program_info.program_start` | string (ISO 8601) | Program start time |
| `program_info.program_end` | string (ISO 8601) | Program end time |
| `program_info.category` | string | Program category (News, Entertainment, Sports, etc.) |
| `window_start` | string (ISO 8601) | Start of the summarized time window (quantized to 1-minute intervals) |
| `window_end` | string (ISO 8601) | End of the summarized time window (quantized to 1-minute intervals) |
| `cached` | boolean | Whether this summary was served from cache (no credits deducted if true) |
| `credits_used` | integer | Number of credits deducted for this request (0 if cached) |
| `remaining_credits` | integer | User's remaining credit balance after this request |

**Errors**:

| Status | Code | Description |
|--------|------|-------------|
| 401 | `auth_failed` | Missing or invalid authentication token |
| 402 | `insufficient_credits` | User does not have enough credits (requires 5 credits, configured via `CATCHUP_CREDIT_COST`) |
| 403 | `beta_required` | Catch-up summaries require Beta 500 membership |
| 404 | `channel_not_found` | Channel does not exist or is not currently live |
| 422 | `insufficient_data` | Not enough transcript data available (channel has been live for less than `CATCHUP_MIN_DATA_SECONDS`) |
| 429 | `quota_exceeded` | Too many catch-up requests in a short period. Retry after `CATCHUP_RETRY_AFTER_SECONDS` |
| 503 | `service_unavailable` | AI summarization service is temporarily unavailable |

**Error Response Body**:

```json
{
  "error": {
    "code": "insufficient_credits",
    "message": "You need 5 credits to generate a catch-up summary. Current balance: 3.",
    "details": {
      "required_credits": 5,
      "current_balance": 3
    }
  }
}
```

**Rate Limit Error (429)**:

```json
{
  "error": {
    "code": "quota_exceeded",
    "message": "Too many catch-up requests. Please try again later.",
    "details": {
      "retry_after_seconds": 300
    }
  }
}
```

**Caching Behavior**:

- Summaries are cached with a TTL of `CATCHUP_CACHE_TTL_SECONDS` (default: 180 seconds)
- Time windows are quantized to `CATCHUP_WINDOW_QUANTIZATION_SECONDS` (default: 60 seconds) for cache efficiency
- Cache key format: `{channel_id}:{window_start}:{window_end}:{target_language}`
- Cached responses return `cached: true` and `credits_used: 0`

---

### GET `/api/v1/live/{channel_id}/catchup/available`

Check whether catch-up data is available for a live channel. Used by the frontend to determine if the catch-up feature should be shown.

**Authentication**: Required (Firebase JWT Bearer token)

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `channel_id` | string | The unique identifier of the live channel |

**Response** (200 OK):

```json
{
  "available": true,
  "channel_id": "channel_abc123",
  "is_live": true,
  "live_duration_minutes": 27,
  "auto_trigger_threshold_minutes": 5,
  "meets_threshold": true,
  "has_transcript_data": true
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `available` | boolean | Whether catch-up is available (channel is live, has transcript data, and meets minimum duration) |
| `channel_id` | string | The channel identifier |
| `is_live` | boolean | Whether the channel is currently broadcasting |
| `live_duration_minutes` | integer | How long the channel has been live (in minutes) |
| `auto_trigger_threshold_minutes` | integer | Minimum minutes live before auto-prompt triggers (from `CATCHUP_AUTO_TRIGGER_MINUTES`) |
| `meets_threshold` | boolean | Whether the live duration meets the auto-trigger threshold |
| `has_transcript_data` | boolean | Whether transcript data is available for summarization |

**Errors**:

| Status | Code | Description |
|--------|------|-------------|
| 401 | `auth_failed` | Missing or invalid authentication token |
| 404 | `channel_not_found` | Channel does not exist |

---

## Authentication

All endpoints require a Firebase JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <firebase_jwt_token>
```

The `/catchup` endpoint additionally requires the authenticated user to be a Beta 500 member. Non-beta users receive a 403 response.

The `/catchup/available` endpoint is accessible to all authenticated users (used for UI feature detection).

---

## Error Handling

### Standard Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "<error_code>",
    "message": "<human_readable_message>",
    "details": {}
  }
}
```

### Retry Strategy

| Error | Retry? | Strategy |
|-------|--------|----------|
| 401 `auth_failed` | Yes | Re-authenticate with Firebase and retry |
| 402 `insufficient_credits` | No | User needs more credits |
| 403 `beta_required` | No | User is not a Beta 500 member |
| 404 `channel_not_found` | No | Channel does not exist or is not live |
| 422 `insufficient_data` | Yes | Wait for more transcript data to accumulate, then retry |
| 429 `quota_exceeded` | Yes | Wait `retry_after_seconds` and retry |
| 503 `service_unavailable` | Yes | Exponential backoff, max 3 retries |

---

## Data Models

### CatchUpSummaryResponse

```typescript
interface CatchUpSummaryResponse {
  summary: string
  key_points: string[]
  program_info: ProgramInfo | null
  window_start: string          // ISO 8601
  window_end: string            // ISO 8601
  cached: boolean
  credits_used: number
  remaining_credits: number
}
```

### ProgramInfo

```typescript
interface ProgramInfo {
  program_name: string
  program_start: string         // ISO 8601
  program_end: string           // ISO 8601
  category: string
}
```

### CatchUpAvailableResponse

```typescript
interface CatchUpAvailableResponse {
  available: boolean
  channel_id: string
  is_live: boolean
  live_duration_minutes: number
  auto_trigger_threshold_minutes: number
  meets_threshold: boolean
  has_transcript_data: boolean
}
```

### CatchUpErrorResponse

```typescript
interface CatchUpErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}
```

---

## Related Documents

- [AI Catch-Up Summaries Feature](../features/AI_CATCH_UP_SUMMARIES.md) - Feature overview and architecture
- [Google Cloud Secrets: Catch-Up](../deployment/GCLOUD_SECRETS_CATCH_UP.md) - Secrets management
- [Channel Chat API Reference](./CHANNEL_CHAT_API.md) - Companion Beta 500 API
- [Beta 500 Implementation Plan](../implementation/BETA_500_REVISED_PLAN.md) - Overall beta program
