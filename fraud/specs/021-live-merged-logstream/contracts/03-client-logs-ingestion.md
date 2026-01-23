# API Contract: Client Logs Ingestion

**Endpoint**: `POST /api/v1/client-logs`

**Purpose**: Accept log entries from frontend browser for local-dev mode integration

**Protocol**: HTTP POST with JSON payload

**Mode**: Local development only (disabled in production environments)

---

## Request

### HTTP Method
`POST`

### URL Parameters

None

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | Must be `application/json` |
| `X-Investigation-Id` | Yes | Investigation ID this log belongs to |
| `Authorization` | No | Bearer token (optional in local-dev mode) |

### Request Body Schema

Single log entry:

```json
{
  "ts": "2025-11-12T10:30:05.123Z",
  "level": "INFO",
  "message": "User clicked investigate button",
  "service": "react-app",
  "correlation_id": "req-abc123",
  "context": {
    "component": "InvestigationButton",
    "user_action": "click"
  }
}
```

Batch of log entries (recommended for performance):

```json
{
  "logs": [
    {
      "ts": "2025-11-12T10:30:05.123Z",
      "level": "INFO",
      "message": "User clicked investigate button",
      "service": "react-app",
      "correlation_id": "req-abc123",
      "context": {
        "component": "InvestigationButton"
      }
    },
    {
      "ts": "2025-11-12T10:30:06.456Z",
      "level": "ERROR",
      "message": "Network request failed",
      "service": "react-app",
      "correlation_id": "req-abc123",
      "context": {
        "endpoint": "/api/data",
        "error": "timeout"
      }
    }
  ]
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ts` | string | Yes | ISO 8601 timestamp when log was emitted |
| `level` | enum | Yes | Log level: `DEBUG`, `INFO`, `WARN`, `ERROR` |
| `message` | string | Yes | Log message content (max 10,000 characters) |
| `service` | string | No | Service name (default: `"react-app"`) |
| `correlation_id` | string | No | Optional correlation ID for tracing |
| `context` | object | No | Additional structured context data |

**Batch Format**:
- `logs`: Array of log entry objects (max 100 per request)

### Example Request

```http
POST /api/v1/client-logs HTTP/1.1
Host: localhost:8090
Content-Type: application/json
X-Investigation-Id: INV-123

{
  "logs": [
    {
      "ts": "2025-11-12T10:30:05.123Z",
      "level": "INFO",
      "message": "Investigation started from UI",
      "service": "react-app",
      "context": {
        "investigation_id": "INV-123",
        "user_id": "user-456"
      }
    },
    {
      "ts": "2025-11-12T10:30:06.789Z",
      "level": "ERROR",
      "message": "Failed to load investigation data",
      "service": "react-app",
      "correlation_id": "req-abc123",
      "context": {
        "endpoint": "/api/v1/investigations/INV-123",
        "error_code": "TIMEOUT"
      }
    }
  ]
}
```

---

## Response

### Success Response

**HTTP Status**: `202 Accepted`

**Headers**:
- `Content-Type`: `application/json`

**Body**:

```json
{
  "accepted": 2,
  "investigation_id": "INV-123"
}
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `accepted` | integer | Number of log entries accepted |
| `investigation_id` | string | Investigation ID these logs were associated with |

### Error Responses

#### 400 Bad Request

Invalid request body or missing required fields.

```json
{
  "error": "bad_request",
  "message": "Invalid log entry format",
  "details": {
    "field": "level",
    "reason": "must be one of: DEBUG, INFO, WARN, ERROR"
  }
}
```

#### 413 Payload Too Large

Batch size exceeds maximum (100 entries) or message too long (10,000 characters).

```json
{
  "error": "payload_too_large",
  "message": "Batch size exceeds maximum of 100 entries",
  "details": {
    "max_batch_size": 100,
    "received": 150
  }
}
```

#### 429 Too Many Requests

Rate limit exceeded.

```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many log submissions. Limit: 1000 per minute per investigation",
  "retry_after": 30
}
```

#### 503 Service Unavailable

Service is not in local-dev mode (client logs ingestion disabled in production).

```json
{
  "error": "service_unavailable",
  "message": "Client log ingestion is only available in local-dev mode"
}
```

---

## Behavior Specification

### Local-Dev Mode Only

- **Environment Check**: Endpoint only accepts requests when `LOG_PROVIDER_MODE=local-dev`
- **Production Safety**: Returns `503 Service Unavailable` in non-dev environments
- **No Authentication**: Optional bearer token in local-dev for convenience
- **Purpose**: Enable frontend-backend log correlation during local development

### Log Processing Pipeline

1. **Receive Request**: Server receives POST request with log entry/entries
2. **Validation**: Validate request body against schema
3. **Enrichment**: Server adds:
   - `source: "frontend"`
   - `investigation_id` from `X-Investigation-Id` header
   - `event_id` (generated UUID)
   - `seq` (monotonic sequence number)
   - `schema_version: 1`
4. **PII Redaction**: Apply PII redaction rules to message field
5. **Ingestion**: Pass to LogAggregatorService for merging with backend logs
6. **Response**: Return `202 Accepted` immediately (async processing)

### Batching Recommendations

**Client should batch logs** to reduce HTTP overhead:
- **Batch Size**: 10-50 logs per request (max 100)
- **Flush Interval**: Every 5 seconds OR when batch reaches size limit
- **Critical Logs**: ERROR/WARN logs can be sent immediately
- **Buffer Overflow**: Drop oldest DEBUG logs if buffer exceeds limit

### Rate Limiting

- **Per Investigation**: 1000 log submissions per minute
- **Batch Counted As**: 1 request regardless of number of logs in batch
- **Exceeded Limits**: Return `429 Too Many Requests`
- **Backoff Strategy**: Client should implement exponential backoff

### Investigation ID Correlation

- **Header Required**: `X-Investigation-Id` must be present
- **Validation**: Investigation ID must exist (soft check in local-dev)
- **Propagation**: Used to correlate frontend logs with backend logs
- **Missing Header**: Returns `400 Bad Request`

### Timestamp Handling

- **Client Timestamp**: Use `Date.now()` or `new Date().toISOString()` in browser
- **Server Timestamp**: Server does NOT override client timestamp
- **Clock Skew**: Merge algorithm handles clock skew up to 10 seconds
- **Timezone**: All timestamps must be in UTC (ISO 8601 with Z suffix)

### Security

- **No Sensitive Data**: Frontend must not log PII or secrets
- **Server-Side Redaction**: PII patterns are still applied server-side as safeguard
- **Input Validation**: All fields validated to prevent injection attacks
- **Message Length**: Limited to 10,000 characters to prevent abuse
- **Context Size**: Limited to 100KB per context object

---

## Client Implementation Notes

### Frontend Logger Utility

```typescript
import { UnifiedLog } from '@/types/unified-log';

class FrontendLogger {
  private buffer: Partial<UnifiedLog>[] = [];
  private readonly BATCH_SIZE = 20;
  private readonly FLUSH_INTERVAL_MS = 5000;
  private flushTimer: NodeJS.Timeout | null = null;
  private investigationId: string | null = null;

  constructor() {
    this.startFlushTimer();
  }

  setInvestigationId(id: string) {
    this.investigationId = id;
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  log(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, context?: Record<string, any>) {
    const entry: Partial<UnifiedLog> = {
      ts: new Date().toISOString(),
      level,
      message,
      service: 'react-app',
      context: context || {}
    };

    this.buffer.push(entry);

    // Flush immediately for errors
    if (level === 'ERROR' || level === 'WARN') {
      this.flush();
    }

    // Flush if batch size reached
    if (this.buffer.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0 || !this.investigationId) {
      return;
    }

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      const response = await fetch(`${API_BASE_URL}/client-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Investigation-Id': this.investigationId
        },
        body: JSON.stringify({ logs })
      });

      if (!response.ok) {
        console.error('Failed to send logs:', response.status);
        // Could implement retry logic here
      }
    } catch (error) {
      console.error('Error sending logs:', error);
      // Don't throw - logging failures shouldn't break the app
    }
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(); // Final flush
  }
}

export const frontendLogger = new FrontendLogger();

// Convenience methods
export const logger = {
  debug: (msg: string, ctx?: Record<string, any>) => frontendLogger.log('DEBUG', msg, ctx),
  info: (msg: string, ctx?: Record<string, any>) => frontendLogger.log('INFO', msg, ctx),
  warn: (msg: string, ctx?: Record<string, any>) => frontendLogger.log('WARN', msg, ctx),
  error: (msg: string, ctx?: Record<string, any>) => frontendLogger.log('ERROR', msg, ctx)
};
```

### Usage in Components

```typescript
import { logger } from '@/shared/services/frontendLogger';

function InvestigationButton({ investigationId }: Props) {
  const handleClick = () => {
    logger.info('User clicked investigate button', {
      component: 'InvestigationButton',
      investigation_id: investigationId,
      user_action: 'click'
    });

    try {
      startInvestigation(investigationId);
    } catch (error) {
      logger.error('Failed to start investigation', {
        component: 'InvestigationButton',
        investigation_id: investigationId,
        error: error.message
      });
    }
  };

  return <button onClick={handleClick}>Investigate</button>;
}
```

### Integration with Investigation Context

```typescript
import { frontendLogger } from '@/shared/services/frontendLogger';

function InvestigationPage() {
  const { investigationId } = useParams();

  useEffect(() => {
    if (investigationId) {
      frontendLogger.setInvestigationId(investigationId);
    }

    return () => {
      frontendLogger.destroy();
    };
  }, [investigationId]);

  // ... rest of component
}
```

---

## Performance Characteristics

- **Batch Processing**: ~1ms per log entry on server
- **Network Overhead**: ~200-500 bytes per request (headers)
- **Payload Size**: ~500 bytes per log entry average
- **Recommended Batch**: 20 logs = ~10KB payload
- **Throughput**: Server can handle 10,000+ logs/second per investigation

---

## Testing Scenarios

1. **Single Log Entry**: Submit single log, verify 202 response
2. **Batch Submission**: Submit batch of 20 logs, verify all accepted
3. **Max Batch Size**: Submit 100 logs, verify accepted
4. **Over Max Batch**: Submit 101 logs, verify 413 response
5. **Invalid Level**: Submit log with invalid level, verify 400 response
6. **Missing Investigation ID**: Omit `X-Investigation-Id` header, verify 400 response
7. **Message Too Long**: Submit log with 10,001 character message, verify 413 response
8. **Rate Limiting**: Submit 1001 requests in 1 minute, verify 429 response
9. **Production Mode**: Switch to production mode, verify 503 response
10. **PII Redaction**: Submit log with email in message, verify redacted in stream
