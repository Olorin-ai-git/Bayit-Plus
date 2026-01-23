# API Contract: SSE Stream Endpoint

**Endpoint**: `GET /api/v1/investigations/{investigation_id}/logs/stream`

**Purpose**: Establishes Server-Sent Events (SSE) connection for real-time log streaming

**Protocol**: Server-Sent Events (SSE) over HTTP

---

## Request

### HTTP Method
`GET`

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `investigation_id` | string | Yes | Investigation ID to stream logs for |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `minLevel` | enum | No | `DEBUG` | Minimum log level to include: `DEBUG`, `INFO`, `WARN`, `ERROR` |
| `source` | enum | No | (all) | Filter by source: `frontend`, `backend` |
| `service` | string | No | (all) | Filter by specific service name |

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token with `investigation:{id}:read` permission |
| `Last-Event-ID` | No | Last received event ID for reconnection (format: `timestamp#seq`) |
| `Accept` | Yes | Must be `text/event-stream` |

### Example Request

```http
GET /api/v1/investigations/INV-123/logs/stream?minLevel=INFO HTTP/1.1
Host: localhost:8090
Authorization: Bearer eyJhbGc...
Accept: text/event-stream
Last-Event-ID: 2025-11-12T10:30:00.123Z#042
```

---

## Response

### Success Response

**HTTP Status**: `200 OK`

### Response Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Content-Type` | `text/event-stream` | SSE media type |
| `Cache-Control` | `no-store, no-cache` | Disable caching |
| `Connection` | `keep-alive` | Maintain persistent connection |
| `X-Accel-Buffering` | `no` | Disable nginx buffering |

### SSE Event Types

#### 1. Connection Established Event

Sent immediately when connection is established.

```
event: connection_established
id: 2025-11-12T10:30:00.000Z#000
data: {"investigation_id":"INV-123"}

```

#### 2. Log Event

Sent for each new log entry.

```
event: log
id: 2025-11-12T10:30:05.123Z#042
data: {"event_id":"550e8400-e29b-41d4-a716-446655440000","ts":"2025-11-12T10:30:05.123Z","seq":42,"source":"backend","service":"investigation-service","level":"INFO","message":"Investigation started","investigation_id":"INV-123","correlation_id":"req-abc123","context":{"user_id":"user-456"},"schema_version":1}

```

**Data Schema**: See `UnifiedLog` in data-model.md

#### 3. Heartbeat Event

Sent every 10 seconds to keep connection alive.

```
event: heartbeat
data: {"server_time":"2025-11-12T10:30:10.000Z"}

```

#### 4. Error Event

Sent when an error occurs that doesn't close the connection.

```
event: error
data: {"message":"Rate limit exceeded","code":"RATE_LIMIT_EXCEEDED"}

```

### Error Responses

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

### Connection Lifecycle

1. **Establishment**: Client sends GET request with `Accept: text/event-stream`
2. **Initial Event**: Server sends `connection_established` event
3. **Streaming**: Server sends `log` events as they occur, interleaved with `heartbeat` events
4. **Heartbeats**: Server sends `heartbeat` event every 10 seconds to prevent timeout
5. **Closure**: Either side can close the connection; client should implement reconnection logic

### Reconnection with Last-Event-ID

When reconnecting after disconnect:

1. Client includes `Last-Event-ID` header with the `id` field from the last received event
2. Server uses this ID to resume streaming from the next log after that ID
3. Format: `{timestamp}#{sequence}` (e.g., `2025-11-12T10:30:05.123Z#042`)
4. Server looks up logs with `(ts > timestamp) OR (ts = timestamp AND seq > sequence)`
5. Server sends missed logs first, then continues with live stream

### Server-Side Filtering

- `minLevel`: Server only sends logs with level >= specified level
  - Example: `minLevel=ERROR` only sends ERROR logs
  - Reduces bandwidth for high-volume streams
  - Client can apply additional client-side filtering for search

- `source`: Server only sends logs from specified source
  - Example: `source=backend` only sends backend logs

- `service`: Server only sends logs from specified service
  - Example: `service=investigation-service`

### Rate Limiting

- **Per User**: 100 requests per minute
- **Per Investigation**: 1000 requests per minute
- Exceeded limits return `429 Too Many Requests`
- Client should implement exponential backoff

### Error Handling

- **Connection Errors**: Client should reconnect with exponential backoff (3s, 6s, 12s, max 30s)
- **SSE Parse Errors**: Client should log error and continue processing next event
- **Server Errors**: If `error` event received, client should display to user but maintain connection
- **Connection Timeout**: If no event received for 30 seconds (3x heartbeat interval), client should reconnect

### Security

- **Authentication**: Bearer token must be valid and not expired
- **Authorization**: User must have `investigation:{investigation_id}:read` permission
- **PII Redaction**: All log messages are PII-redacted server-side before streaming
- **Rate Limiting**: Prevents abuse and DoS attacks

---

## Client Implementation Notes

### EventSource API (Browser)

```typescript
const eventSource = new EventSource(
  `${API_BASE_URL}/investigations/${investigationId}/logs/stream?minLevel=INFO`,
  { withCredentials: false } // Bearer token in URL not supported; use polyfill or fetch
);

// Handle connection established
eventSource.addEventListener('connection_established', (event) => {
  const data = JSON.parse(event.data);
  console.log('Connected to investigation:', data.investigation_id);
});

// Handle log events
eventSource.addEventListener('log', (event) => {
  const log: UnifiedLog = JSON.parse(event.data);
  setLogs(prev => [...prev, log]);
});

// Handle heartbeats
eventSource.addEventListener('heartbeat', (event) => {
  const data = JSON.parse(event.data);
  setLastHeartbeat(data.server_time);
});

// Handle errors
eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  console.error('Stream error:', data.message);
});

// Handle connection errors
eventSource.onerror = (error) => {
  console.error('SSE connection error:', error);
  eventSource.close();
  // Implement exponential backoff reconnection
  scheduleReconnect();
};

// Cleanup
return () => eventSource.close();
```

### Reconnection with Last-Event-ID

```typescript
let lastEventId: string | null = null;

eventSource.addEventListener('log', (event) => {
  lastEventId = event.lastEventId; // Browser automatically tracks this
  // Process log...
});

// On reconnect
function reconnect() {
  const url = new URL(`${API_BASE_URL}/investigations/${investigationId}/logs/stream`);
  url.searchParams.set('minLevel', 'INFO');

  // Use fetch API with custom header for Last-Event-ID (EventSource doesn't support headers)
  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${token}`,
      'Last-Event-ID': lastEventId || ''
    }
  });

  const reader = response.body.getReader();
  // Parse SSE manually or use polyfill
}
```

---

## Performance Characteristics

- **Latency**: <100ms from log emission to client receipt (under normal load)
- **Throughput**: Supports 1000+ concurrent connections per backend instance
- **Bandwidth**: ~500 bytes per log event (compressed)
- **Heartbeat Overhead**: 50-100 bytes every 10 seconds
- **Reconnection Time**: <1 second with Last-Event-ID

---

## Testing Scenarios

1. **Basic Streaming**: Connect and verify logs appear within 2 seconds
2. **Filtering**: Apply `minLevel=ERROR` and verify only ERROR logs received
3. **Heartbeats**: Verify heartbeat events arrive every 10 seconds
4. **Reconnection**: Disconnect, wait 5 seconds, reconnect with Last-Event-ID, verify no gaps
5. **Rate Limiting**: Exceed 100 requests/minute and verify 429 response
6. **Authorization**: Remove bearer token and verify 401 response
7. **Invalid Investigation**: Use non-existent ID and verify 404 response
8. **Long-Running**: Keep connection open for 1 hour and verify stability
