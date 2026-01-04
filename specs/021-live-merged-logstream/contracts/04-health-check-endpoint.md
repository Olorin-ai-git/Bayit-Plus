# API Contract: Health Check Endpoint

**Endpoint**: `GET /api/v1/logs/health`

**Purpose**: Verify log streaming service and provider health status

**Protocol**: HTTP GET returning JSON health report

---

## Request

### HTTP Method
`GET`

### URL Parameters

None

### Query Parameters

None

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | No | Optional bearer token for authenticated health checks |

### Example Request

```http
GET /api/v1/logs/health HTTP/1.1
Host: localhost:8090
```

---

## Response

### Success Response

**HTTP Status**: `200 OK`

**Headers**:
- `Content-Type`: `application/json`

**Body**:

```json
{
  "status": "healthy",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "providers": {
    "frontend": {
      "status": "healthy",
      "type": "local-dev",
      "latency_ms": 5
    },
    "backend": {
      "status": "healthy",
      "type": "local-dev",
      "latency_ms": 3
    }
  },
  "aggregator": {
    "status": "healthy",
    "active_investigations": 5,
    "total_logs_streamed": 15234,
    "buffer_usage_percent": 25
  },
  "deduplicator": {
    "status": "healthy",
    "cache_size": 10000,
    "cache_usage_percent": 45,
    "deduplication_hits": 234
  },
  "metrics": {
    "avg_merge_latency_ms": 2.5,
    "p95_merge_latency_ms": 8.3,
    "p99_merge_latency_ms": 15.7,
    "sse_connections": 5,
    "polling_requests_per_minute": 120
  }
}
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `status` | enum | Overall health: `healthy`, `degraded`, `unhealthy` |
| `timestamp` | string | ISO 8601 timestamp of health check |
| `providers.{source}.status` | enum | Provider health: `healthy`, `degraded`, `unhealthy` |
| `providers.{source}.type` | string | Provider type: `local-dev`, `sentry`, `datadog`, etc. |
| `providers.{source}.latency_ms` | number | Provider response latency in milliseconds |
| `aggregator.status` | enum | Aggregator health: `healthy`, `degraded`, `unhealthy` |
| `aggregator.active_investigations` | integer | Number of investigations with active log streams |
| `aggregator.total_logs_streamed` | integer | Total logs processed since service start |
| `aggregator.buffer_usage_percent` | number | Percentage of buffer capacity used |
| `deduplicator.status` | enum | Deduplicator health: `healthy`, `degraded`, `unhealthy` |
| `deduplicator.cache_size` | integer | Max cache size |
| `deduplicator.cache_usage_percent` | number | Percentage of cache capacity used |
| `deduplicator.deduplication_hits` | integer | Number of duplicate logs detected |
| `metrics.avg_merge_latency_ms` | number | Average latency for log merge operation |
| `metrics.p95_merge_latency_ms` | number | 95th percentile merge latency |
| `metrics.p99_merge_latency_ms` | number | 99th percentile merge latency |
| `metrics.sse_connections` | integer | Number of active SSE connections |
| `metrics.polling_requests_per_minute` | number | Polling API request rate |

### Degraded Response

**HTTP Status**: `200 OK` (still functional but with issues)

**Body**:

```json
{
  "status": "degraded",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "providers": {
    "frontend": {
      "status": "healthy",
      "type": "local-dev",
      "latency_ms": 5
    },
    "backend": {
      "status": "degraded",
      "type": "local-dev",
      "latency_ms": 250,
      "warning": "High latency detected"
    }
  },
  "aggregator": {
    "status": "degraded",
    "active_investigations": 50,
    "total_logs_streamed": 152340,
    "buffer_usage_percent": 85,
    "warning": "Buffer usage high"
  },
  "deduplicator": {
    "status": "healthy",
    "cache_size": 10000,
    "cache_usage_percent": 45,
    "deduplication_hits": 234
  },
  "metrics": {
    "avg_merge_latency_ms": 15.5,
    "p95_merge_latency_ms": 45.3,
    "p99_merge_latency_ms": 95.7,
    "sse_connections": 50,
    "polling_requests_per_minute": 1200
  }
}
```

### Unhealthy Response

**HTTP Status**: `503 Service Unavailable`

**Headers**:
- `Content-Type`: `application/json`
- `Retry-After`: `30` (seconds)

**Body**:

```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "providers": {
    "frontend": {
      "status": "unhealthy",
      "type": "local-dev",
      "error": "Connection refused",
      "last_successful_check": "2025-11-12T10:25:00.000Z"
    },
    "backend": {
      "status": "healthy",
      "type": "local-dev",
      "latency_ms": 3
    }
  },
  "aggregator": {
    "status": "unhealthy",
    "error": "Buffer overflow - dropping logs",
    "active_investigations": 100,
    "total_logs_streamed": 1523400,
    "buffer_usage_percent": 100
  },
  "deduplicator": {
    "status": "healthy",
    "cache_size": 10000,
    "cache_usage_percent": 45,
    "deduplication_hits": 234
  },
  "metrics": {
    "avg_merge_latency_ms": 150.5,
    "p95_merge_latency_ms": 450.3,
    "p99_merge_latency_ms": 950.7,
    "sse_connections": 100,
    "polling_requests_per_minute": 3000
  }
}
```

---

## Behavior Specification

### Health Status Determination

**Overall Status Logic**:
- `healthy`: All providers healthy, aggregator/deduplicator functional, latency < thresholds
- `degraded`: Some providers degraded OR high latency OR high buffer usage (but still functional)
- `unhealthy`: Any provider unhealthy OR aggregator failing OR critical errors

**Provider Status Logic**:
- `healthy`: Responds within 100ms, no errors
- `degraded`: Responds within 500ms OR intermittent errors
- `unhealthy`: Timeout (>500ms) OR persistent errors OR unreachable

**Aggregator Status Logic**:
- `healthy`: Buffer usage < 80%, latency < 10ms p95
- `degraded`: Buffer usage 80-95% OR latency 10-50ms p95
- `unhealthy`: Buffer usage > 95% OR latency > 50ms p95 OR dropping logs

**Deduplicator Status Logic**:
- `healthy`: Cache usage < 90%, no errors
- `degraded`: Cache usage 90-99%
- `unhealthy`: Cache full (100%) OR persistent errors

### Provider Checks

For each provider:
1. **Ping Check**: Attempt to fetch 1 log entry (or equivalent health check)
2. **Latency Measurement**: Record response time
3. **Error Detection**: Catch connection errors, timeouts, auth failures
4. **Last Success Tracking**: Record timestamp of last successful check

### Metrics Collection

- **Merge Latency**: Time from log emission to merge completion
  - Collected via histogram metrics
  - Percentiles calculated: p50, p95, p99

- **Connection Counts**: Active SSE connections tracked via connection pool

- **Request Rates**: Polling requests counted via rate limiter metrics

- **Buffer Usage**: Current buffer size / max buffer size

- **Cache Usage**: Current cache entries / max cache entries

### Response Caching

- **Cache Duration**: 5 seconds
- **Purpose**: Prevent health check storms from overwhelming service
- **Invalidation**: Cache invalidated on any status change

### Authentication

- **Optional**: Health check works without authentication
- **Authenticated**: With bearer token, returns more detailed metrics
- **Rate Limiting**: Anonymous health checks limited to 10/minute

---

## Client Implementation Notes

### Health Check Polling

```typescript
async function checkLogStreamHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/logs/health`);

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  return await response.json();
}

// Poll health every 30 seconds
setInterval(async () => {
  try {
    const health = await checkLogStreamHealth();

    if (health.status === 'degraded') {
      showWarningBanner('Log streaming performance degraded');
    } else if (health.status === 'unhealthy') {
      showErrorBanner('Log streaming unavailable');
    }
  } catch (error) {
    console.error('Health check failed:', error);
  }
}, 30000);
```

### Integration with UI Status Indicator

```typescript
function LogStreamStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      const status = await checkLogStreamHealth();
      setHealth(status);
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!health) return null;

  return (
    <div className={`status-indicator ${health.status}`}>
      {health.status === 'healthy' && '✓ Log streaming active'}
      {health.status === 'degraded' && '⚠ Log streaming degraded'}
      {health.status === 'unhealthy' && '✗ Log streaming unavailable'}
    </div>
  );
}
```

---

## Performance Characteristics

- **Response Time**: <50ms for cached health check
- **Response Time**: <200ms for fresh health check
- **Cache Duration**: 5 seconds
- **Provider Check Timeout**: 500ms per provider
- **Rate Limit**: 10 requests/minute for anonymous, 100/minute for authenticated

---

## Testing Scenarios

1. **Healthy System**: All components healthy, verify 200 response with `status: "healthy"`
2. **Degraded Provider**: Simulate slow backend provider, verify `status: "degraded"`
3. **Unhealthy Provider**: Disconnect frontend provider, verify `status: "unhealthy"` and 503
4. **High Buffer Usage**: Fill aggregator buffer to 90%, verify degraded status
5. **Buffer Overflow**: Fill aggregator buffer to 100%, verify unhealthy status
6. **High Latency**: Simulate slow merge operation, verify degraded metrics
7. **Cache Near Full**: Fill deduplication cache to 95%, verify degraded status
8. **Connection Count**: Open 100 SSE connections, verify count in metrics
9. **Rate Limiting**: Exceed 10 requests/minute, verify 429 response
10. **Caching**: Make 2 requests within 5 seconds, verify cached response (same timestamp)
