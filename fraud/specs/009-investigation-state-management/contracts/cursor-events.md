# API Contract: Cursor-Based Events Feed

**Endpoint**: `GET /api/v1/investigations/{investigation_id}/events`
**Purpose**: Fetch ordered events since cursor with pagination
**Protocol**: HTTP/1.1, REST
**Auth**: `require_read` decorator

---

## Request

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `investigation_id` | string | Yes | Investigation identifier (e.g., "INV-42") |

### Query Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `since` | string | No | (none) | Cursor: start after this position |
| `limit` | integer | No | 100 | Max events to return (1-1000) |

### Request Headers

| Header | Required | Example | Description |
|--------|----------|---------|-------------|
| `Authorization` | Yes | `Bearer {token}` | User authentication |
| `Accept` | No | `application/json` | Response format (fixed) |

### Request Examples

**Without cursor (initial fetch)**:
```bash
GET /api/v1/investigations/INV-42/events?limit=50 HTTP/1.1
Authorization: Bearer eyJhbGc...
Accept: application/json
```

**With cursor (resumption)**:
```bash
GET /api/v1/investigations/INV-42/events?since=1730668800000_000127&limit=50 HTTP/1.1
Authorization: Bearer eyJhbGc...
```

---

## Response

### Success Response (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json
ETag: W/"abc123-def456"
Cache-Control: private, no-cache
X-Recommended-Interval: 5000

{
  "items": [
    {
      "id": "1730668800000_000123",
      "investigation_id": "INV-42",
      "ts": "2025-11-04T12:34:56.789Z",
      "actor": {
        "type": "system",
        "service": "anomaly-detector-v2"
      },
      "op": "append",
      "entity": "anomaly",
      "payload": { ... }
    }
  ],
  "next_cursor": "1730668800001_000000",
  "has_more": true,
  "poll_after_seconds": 5,
  "etag": "W/\"abc123-def456\""
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `items[]` | array | Ordered events (by timestamp ASC) |
| `next_cursor` | string | Cursor for next fetch |
| `has_more` | boolean | More events exist |
| `poll_after_seconds` | integer | Server-recommended poll interval |
| `etag` | string | ETag for conditional requests |

### Headers

| Header | Description |
|--------|-------------|
| `ETag` | Cache validation token |
| `X-Recommended-Interval` | Poll interval in milliseconds |

---

## Error Responses

### 400 Bad Request

```json
{
  "status": 400,
  "error": "InvalidCursor",
  "message": "Cursor format invalid or expired"
}
```

### 404 Not Found

```json
{
  "status": 404,
  "error": "InvestigationNotFound",
  "message": "Investigation INV-42 not found"
}
```

### 429 Too Many Requests

```json
{
  "status": 429,
  "error": "RateLimitExceeded",
  "message": "Rate limit exceeded. Retry after 10 seconds."
}
```

**Headers**:
```
Retry-After: 10
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1730668860000
```

---

## Implementation Details

### Pagination Logic

```python
@router.get("/api/v1/investigations/{investigation_id}/events")
async def get_events(
    investigation_id: str,
    since: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(require_read)
) -> EventsFeedResponse:
    # Verify user has access
    state = verify_access(investigation_id, current_user)

    # Build query
    query = db.query(InvestigationAuditLog).filter(
        InvestigationAuditLog.investigation_id == investigation_id
    ).order_by(InvestigationAuditLog.timestamp)

    # Apply cursor filter
    if since:
        since_ts, since_seq = parse_cursor(since)
        query = query.filter(
            InvestigationAuditLog.timestamp > datetime.fromtimestamp(since_ts / 1000)
        )

    # Fetch limit + 1 to detect has_more
    rows = query.limit(limit + 1).all()
    has_more = len(rows) > limit
    rows = rows[:limit]

    # Convert to events
    events = [audit_log_to_event(row) for row in rows]

    # Calculate next cursor
    next_cursor = events[-1].id if events else since

    return EventsFeedResponse(
        items=events,
        next_cursor=next_cursor,
        has_more=has_more,
        poll_after_seconds=calculate_poll_interval(state),
        etag=generate_etag(investigation_id, state.version)
    )
```

### Cursor Expiration

- Cursors older than 30 days are invalid
- Return 400 Bad Request with clear message
- Client should refetch without cursor (starting from beginning)

### Ordering Guarantee

- Events are **always** ordered by timestamp ascending
- If timestamps collide, use sequence number (secondary sort)
- Result set is **immutable** (same request always returns same events)

---

## Client Implementation Pattern

### TypeScript/React

```typescript
async function fetchEventsSince(
  investigationId: string,
  cursor: string | null,
  limit: number = 50
): Promise<{ events: InvestigationEvent[]; nextCursor: string }> {
  const params = new URLSearchParams();
  if (cursor) params.append("since", cursor);
  params.append("limit", String(limit));

  const response = await fetch(
    `/api/v1/investigations/${investigationId}/events?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    throw new Error(`Events fetch failed: ${response.statusText}`);
  }

  const data = (await response.json()) as EventsFeedResponse;

  return {
    events: data.items,
    nextCursor: data.next_cursor
  };
}
```

---

## Testing

### Unit Tests

- [x] Parse cursor correctly
- [x] Handle invalid cursor format
- [x] Detect expired cursor (>30 days)
- [x] Enforce limit bounds (1-1000)
- [x] Detect has_more accurately
- [x] Order by timestamp + sequence

### Integration Tests

- [x] Fetch initial events (no cursor)
- [x] Fetch events with cursor (continuation)
- [x] Pagination across multiple requests
- [x] Event ordering guarantee
- [x] Rate limit enforcement
- [x] Authorization checks

### Test Scenarios

See `quickstart.md` for detailed test scenarios.
