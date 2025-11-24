# API Contract: Polling Endpoint (Fallback)

**Endpoint**: `GET /api/v1/investigations/{investigation_id}/logs`

**Purpose**: Cursor-based polling endpoint for log retrieval when SSE is unavailable

**Protocol**: HTTP REST with cursor pagination

---

## Request

### HTTP Method
`GET`

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `investigation_id` | string | Yes | Investigation ID to retrieve logs for |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `afterCursor` | string | No | (none) | Cursor for pagination (format: `timestamp#seq`) |
| `limit` | integer | No | 100 | Number of logs to return (min: 10, max: 1000) |
| `minLevel` | enum | No | `DEBUG` | Minimum log level: `DEBUG`, `INFO`, `WARN`, `ERROR` |
| `source` | enum | No | (all) | Filter by source: `frontend`, `backend` |
| `service` | string | No | (all) | Filter by specific service name |

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token with `investigation:{id}:read` permission |
| `If-None-Match` | No | ETag from previous response for conditional requests |

### Example Request

```http
GET /api/v1/investigations/INV-123/logs?afterCursor=2025-11-12T10:30:00.123Z%23042&limit=100&minLevel=INFO HTTP/1.1
Host: localhost:8090
Authorization: Bearer eyJhbGc...
If-None-Match: "W/\"abc123-xyz789\""
```

---

## Response

### Success Response (200 OK)

**HTTP Status**: `200 OK`

### Response Headers

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `ETag` | Entity tag for conditional requests (format: `"W/\"{hash}\""`) |
| `X-Total-Count` | Total number of logs for this investigation (if available) |
| `X-Has-More` | `true` if more logs available, `false` if end reached |

### Response Body Schema

```json
{
  "logs": [
    {
      "event_id": "550e8400-e29b-41d4-a716-446655440000",
      "ts": "2025-11-12T10:30:05.123Z",
      "seq": 42,
      "source": "backend",
      "service": "investigation-service",
      "level": "INFO",
      "message": "Investigation started",
      "investigation_id": "INV-123",
      "correlation_id": "req-abc123",
      "context": {
        "user_id": "user-456"
      },
      "schema_version": 1
    }
  ],
  "pagination": {
    "afterCursor": "2025-11-12T10:30:05.123Z#042",
    "nextCursor": "2025-11-12T10:30:15.456Z#087",
    "hasMore": true,
    "limit": 100,
    "returned": 100
  }
}
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `logs` | array | Array of UnifiedLog objects (see data-model.md) |
| `pagination.afterCursor` | string\|null | Cursor that was used for this request |
| `pagination.nextCursor` | string\|null | Cursor to use for next request (null if no more logs) |
| `pagination.hasMore` | boolean | Whether more logs are available |
| `pagination.limit` | integer | Limit that was applied |
| `pagination.returned` | integer | Number of logs actually returned |

### Example Response

```json
{
  "logs": [
    {
      "event_id": "550e8400-e29b-41d4-a716-446655440000",
      "ts": "2025-11-12T10:30:05.123Z",
      "seq": 42,
      "source": "backend",
      "service": "investigation-service",
      "level": "INFO",
      "message": "Investigation started",
      "investigation_id": "INV-123",
      "correlation_id": "req-abc123",
      "context": {"user_id": "user-456"},
      "schema_version": 1
    },
    {
      "event_id": "660f9511-f30c-52e5-b827-557766551111",
      "ts": "2025-11-12T10:30:15.456Z",
      "seq": 87,
      "source": "frontend",
      "service": "react-app",
      "level": "ERROR",
      "message": "Network request failed",
      "investigation_id": "INV-123",
      "context": {"endpoint": "/api/data"},
      "schema_version": 1
    }
  ],
  "pagination": {
    "afterCursor": "2025-11-12T10:30:00.123Z#042",
    "nextCursor": "2025-11-12T10:30:15.456Z#087",
    "hasMore": true,
    "limit": 100,
    "returned": 2
  }
}
```

### Not Modified Response (304)

**HTTP Status**: `304 Not Modified`

**Condition**: ETag matches (no new logs since last request)

**Headers**:
- `ETag`: Same as request's `If-None-Match`

**Body**: Empty

### Error Responses

#### 400 Bad Request

Invalid cursor format or invalid query parameters.

```json
{
  "error": "bad_request",
  "message": "Invalid cursor format: expected 'timestamp#seq'",
  "details": {
    "cursor": "invalid-format"
  }
}
```

#### 401 Unauthorized

User is not authenticated.

```json
{
  "error": "unauthorized",
  "message": "Missing or invalid authentication token"
}
```

#### 403 Forbidden

User doesn't have permission to view this investigation.

```json
{
  "error": "forbidden",
  "message": "Insufficient permissions for investigation:INV-123:read"
}
```

#### 404 Not Found

Investigation doesn't exist.

```json
{
  "error": "not_found",
  "message": "Investigation INV-123 not found"
}
```

#### 429 Too Many Requests

Rate limit exceeded.

```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Limit: 100 per minute per user",
  "retry_after": 30
}
```

---

## Behavior Specification

### Cursor-Based Pagination

1. **Initial Request**: Client makes request without `afterCursor` to get most recent logs
2. **Subsequent Requests**: Client uses `nextCursor` from response as `afterCursor` in next request
3. **End of Stream**: When `hasMore` is `false` and `nextCursor` is `null`, no more logs available
4. **Ordering**: Logs are always ordered by `(ts, seq)` ascending

### Cursor Format

Format: `{timestamp}#{sequence}`
- `timestamp`: ISO 8601 timestamp (e.g., `2025-11-12T10:30:05.123Z`)
- `sequence`: 3-digit zero-padded sequence number (e.g., `042`)
- Separator: `#`
- Example: `2025-11-12T10:30:05.123Z#042`

### ETag for Conditional Requests

1. **Purpose**: Reduce bandwidth when polling for new logs that haven't arrived yet
2. **Generation**: Server generates ETag based on latest log timestamp and count
3. **Usage**: Client sends `If-None-Match` header with ETag from previous response
4. **304 Response**: If no new logs since ETag was generated, server returns 304 with empty body
5. **200 Response**: If new logs available, server returns full response with new ETag

### Backfill on Page Load

For historical log retrieval when user loads the page:

1. Client makes initial request without `afterCursor`
2. Server returns most recent N logs (where N = limit)
3. Client renders these logs
4. Client then switches to SSE for live updates OR continues polling with `nextCursor`

### Rate Limiting

- **Per User**: 100 requests per minute
- **Per Investigation**: 1000 requests per minute
- Exceeded limits return `429 Too Many Requests`
- Client should implement exponential backoff and switch to longer polling intervals

### Polling Interval Recommendations

- **Active Investigation**: Poll every 5 seconds
- **Idle Investigation**: Poll every 30 seconds
- **Background Tab**: Reduce polling frequency to save resources
- **Rate Limited**: Increase interval exponentially (5s → 10s → 20s → 30s max)

### Filtering

Same as SSE endpoint:
- `minLevel`: Server only returns logs with level >= specified level
- `source`: Server only returns logs from specified source
- `service`: Server only returns logs from specified service

### Security

- **Authentication**: Bearer token must be valid and not expired
- **Authorization**: User must have `investigation:{investigation_id}:read` permission
- **PII Redaction**: All log messages are PII-redacted server-side before returning
- **Rate Limiting**: Prevents abuse and DoS attacks

---

## Client Implementation Notes

### Basic Polling Loop

```typescript
async function pollLogs(investigationId: string, afterCursor: string | null) {
  const url = new URL(`${API_BASE_URL}/investigations/${investigationId}/logs`);

  if (afterCursor) {
    url.searchParams.set('afterCursor', afterCursor);
  }
  url.searchParams.set('limit', '100');
  url.searchParams.set('minLevel', 'INFO');

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'If-None-Match': lastETag || ''
    }
  });

  if (response.status === 304) {
    // No new logs, retry later
    return { logs: [], nextCursor: afterCursor, hasMore: true };
  }

  if (!response.ok) {
    throw new Error(`Polling failed: ${response.status}`);
  }

  const data = await response.json();
  lastETag = response.headers.get('ETag') || '';

  return data;
}
```

### Polling with Exponential Backoff

```typescript
let pollingInterval = 5000; // Start with 5 seconds

async function startPolling(investigationId: string) {
  let cursor: string | null = null;

  while (isActive) {
    try {
      const result = await pollLogs(investigationId, cursor);

      if (result.logs.length > 0) {
        // New logs received, process them
        processLogs(result.logs);
        cursor = result.pagination.nextCursor;

        // Reset interval on success
        pollingInterval = 5000;
      } else {
        // No new logs, increase interval
        pollingInterval = Math.min(pollingInterval * 1.5, 30000);
      }

      await sleep(pollingInterval);
    } catch (error) {
      if (error.status === 429) {
        // Rate limited, back off significantly
        pollingInterval = Math.min(pollingInterval * 2, 60000);
      }
      await sleep(pollingInterval);
    }
  }
}
```

### Fallback from SSE to Polling

```typescript
function startLogStream(investigationId: string) {
  let eventSource: EventSource | null = null;
  let failureCount = 0;
  const MAX_SSE_FAILURES = 3;

  function trySSE() {
    eventSource = new EventSource(`${API_BASE_URL}/investigations/${investigationId}/logs/stream`);

    eventSource.onerror = () => {
      failureCount++;
      eventSource?.close();

      if (failureCount >= MAX_SSE_FAILURES) {
        console.log('SSE failed 3 times, falling back to polling');
        startPolling(investigationId);
      } else {
        // Retry SSE with exponential backoff
        setTimeout(trySSE, Math.pow(2, failureCount) * 1000);
      }
    };

    eventSource.addEventListener('log', (event) => {
      failureCount = 0; // Reset on success
      processLog(JSON.parse(event.data));
    });
  }

  trySSE();
}
```

---

## Performance Characteristics

- **Latency**: 5-30 seconds per poll (depending on polling interval)
- **Bandwidth**: Same as SSE (~500 bytes per log), but with HTTP overhead per request
- **Overhead**: ~200-500 bytes per polling request (headers + pagination metadata)
- **ETag Savings**: 304 response is ~100 bytes vs full response
- **Recommended Interval**: 5 seconds for active investigations

---

## Testing Scenarios

1. **Initial Fetch**: Request without cursor, verify most recent logs returned
2. **Pagination**: Use `nextCursor` from response, verify next page of logs
3. **End of Stream**: Continue pagination until `hasMore` is `false`
4. **ETag Conditional**: Send `If-None-Match` with valid ETag, verify 304 when no new logs
5. **Filtering**: Apply `minLevel=ERROR`, verify only ERROR logs returned
6. **Rate Limiting**: Exceed 100 requests/minute, verify 429 response
7. **Invalid Cursor**: Send malformed cursor, verify 400 response
8. **Authorization**: Remove bearer token, verify 401 response
9. **Large Limit**: Request `limit=1000`, verify maximum limit enforced
10. **Clock Skew**: Verify logs are ordered correctly despite clock skew between frontend/backend
