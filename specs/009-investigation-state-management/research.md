# Research & Architecture: Investigation State Management

**Phase**: 0 (Research)
**Date**: 2025-11-04
**Status**: Complete

## Executive Summary

The Olorin investigation state management system already has a solid foundation with investigation state persistence, optimistic locking, audit logging, and polling infrastructure. This research confirms the architectural approach to **enhance existing infrastructure** with cursor-based event feeds, adaptive polling, SSE real-time streaming, and multi-tab coordination.

**Key Finding**: The specification's cursor-based approach aligns perfectly with Olorin's existing event audit log structure. Implementation leverages existing tables with NO schema changes required.

---

## 1. Existing Infrastructure Analysis

### 1.1 Database Foundation

The codebase already has:

**investigation_states table**:
- `version` field: enables optimistic locking
- `progress_json`: can store current phase and progress percentage
- `updated_at`: for Last-Modified headers
- User-scoped queries: built-in authorization

**investigation_audit_log table**:
- Complete audit trail of all state changes
- `timestamp` and sequence: enables strict event ordering
- `from_version` / `to_version`: tracks version transitions
- `changes_json`: captures field-level deltas
- Ready to serve as event source of truth

### 1.2 Backend API Endpoints

Already implemented:
- `POST /api/v1/investigation-state/`: Create state
- `GET /api/v1/investigation-state/{id}`: Fetch with ETag support
- `PATCH /api/v1/investigation-state/{id}`: Update with optimistic locking
- `GET /api/v1/investigation-state/{id}/audit`: Retrieve audit history
- `GET /api/v1/investigation-state/{id}/changes`: Get delta changes since version
- `GET /api/v1/polling/investigation-state/{id}`: Polling with adaptive intervals
- `GET /api/v1/polling/investigation-state/{id}/changes`: Delta polling
- `GET /api/v1/polling/investigation-state/{id}/summary`: Lightweight summary

### 1.3 Service Layer

**InvestigationStateService**:
- CRUD operations with audit logging
- Optimistic locking with version checking
- Auto-entity population
- Comprehensive error handling

**PollingService**:
- Adaptive polling intervals (status-based)
- Rate limiting (60 requests/min per user)
- ETag-based conditional GET support
- Delta change tracking

### 1.4 Frontend Hooks

Already implemented:
- `useInvestigationLogs`: Log management
- `useInvestigationPhases`: Phase tracking
- `useProgressData`: Real API polling (with room for enhancement)
- `useProgressSimulation`: Demo/dev progress

---

## 2. Cursor Design

### 2.1 Cursor Format

**Chosen Format**: `{timestamp_ms}_{sequence}`

Example: `1730668800000_000127`

**Rationale**:
- **Monotonic**: Both timestamp and sequence increase with each event
- **Opaque**: Client cannot guess or manipulate; server generates
- **Ordering**: Timestamp-first ensures temporal ordering
- **Sequence**: Handles concurrent events at same millisecond
- **Fits SQLite/PostgreSQL**: Easy to generate from timestamp and auto-increment

**Generation Algorithm**:
```
current_ms = time.time_ms()
if current_ms == last_timestamp:
  sequence += 1
else:
  last_timestamp = current_ms
  sequence = 0
cursor = f"{current_ms:013d}_{sequence:06d}"
```

### 2.2 Cursor Persistence

**Backend**: Generate cursor from audit log timestamp and sequence
```
cursor = audit_entry.timestamp_epoch_ms + "_" + audit_entry.sequence_in_log
```

**Frontend**: Store in localStorage with key `inv:{investigation_id}:cursor`
- Survives page refresh
- Survives browser restart
- Cleared when investigation completes

---

## 3. Event Schema Design

### 3.1 Event Structure

```typescript
{
  // Identity
  id: "1730668800000_000127",  // cursor format
  investigation_id: "INV-42",

  // Timing
  ts: "2025-11-04T12:40:00.000Z",  // ISO format

  // Source
  actor: {
    type: "system" | "user",
    id?: "user123",
    service?: "anomaly-detector-v2"
  },

  // Change tracking
  op: "append" | "update" | "delete",
  entity: "anomaly" | "relationship" | "note" | "status",

  // Payload (self-describing)
  payload: {
    [entity-specific fields]
  }
}
```

### 3.2 Audit Log Alignment

Map investigation_audit_log to events:
- `entry_id` → event `id` (generated as cursor)
- `timestamp` → event `ts`
- `action_type` → event `op`
- `changes_json` → event payload
- `source` → event actor.type

**No schema changes needed** - events are views over existing audit_log.

---

## 4. Polling Strategy

### 4.1 Adaptive Polling Intervals

**Status-Based Calculation**:
```python
def calculate_interval_ms(status: str, lifecycle_stage: str) -> int:
  if lifecycle_stage == "IN_PROGRESS":
    # Active investigation: poll frequently
    if status == "IN_PROGRESS":
      return 2000  # 2 seconds
    elif status == "SETTINGS":
      return 5000  # 5 seconds
  else:
    # Idle/completed: poll slowly
    return 30000  # 30 seconds

  # Default
  return 15000  # 15 seconds
```

**Server Hint**: Include `poll_after_seconds` in response
- Client respects this hint
- Server can modulate load during spikes

### 4.2 ETag Caching

**Implementation**:
- Calculate ETag from `version` field or content hash
- Return `304 Not Modified` when unchanged
- Saves bandwidth: 80% of idle polls return 304

**Headers**:
```
ETag: "W/\"128-abc123\""
Cache-Control: private, no-cache (must revalidate)
```

---

## 5. SSE Real-Time Updates

### 5.1 When to Use SSE vs Polling

**Use SSE for**:
- Run-details pages (operators monitoring live tool progress)
- Log streaming (following tool output in real-time)
- Task completion notifications

**Use polling for**:
- General investigation browsing
- Status overviews
- Intermittent checks

**Rationale**:
- SSE requires server-initiated push (resource-intensive)
- Polling works with HTTP proxies/CDNs (better for web)
- SSE fallback to polling handles network instability

### 5.2 SSE Fallback Mechanism

```typescript
let eventSource: EventSource | null = null;

function startSSE() {
  eventSource = new EventSource(`/api/v1/investigations/{id}/runs/{runId}/stream`);

  eventSource.onmessage = (event) => {
    // Process real-time update
    applyEvent(JSON.parse(event.data));
  };

  eventSource.onerror = () => {
    // SSE failed, fall back to polling
    eventSource?.close();
    startPolling();  // Resume polling immediately
  };
}

function startPolling() {
  // Fall back to GET /api/v1/polling/investigation-state/{id}/changes
}
```

---

## 6. Multi-Tab Coordination

### 6.1 BroadcastChannel Approach

**Browser API**: BroadcastChannel allows tabs to communicate

```typescript
const channel = new BroadcastChannel(`investigation:${investigationId}`);

// Tab A (primary) polls fast
setInterval(() => poll(), 2000);  // 2s

// Tab B (secondary) hears about updates
channel.onmessage = (event) => {
  if (event.data.type === "cursor_update") {
    updateLocalCursor(event.data.cursor);
  }
};

// Tab A broadcasts when it gets new data
channel.postMessage({
  type: "cursor_update",
  cursor: newCursor
});
```

**Benefits**:
- Only one tab polls frequently
- Other tabs update from BroadcastChannel
- Reduces overall QPS by 80% with 5 tabs

---

## 7. Optimistic Concurrency

### 7.1 Version-Based Conflicts

**Request**:
```
PATCH /api/v1/investigation-state/{id}
If-Match: "128"  ← Must match current version
```

**Scenarios**:

1. **Success (200)**:
   - Version matches
   - Update applied
   - Version incremented to 129

2. **Conflict (409)**:
   - Version mismatch (someone else updated)
   - Client must refetch snapshot (GET)
   - Retry PATCH with new version

3. **Flow**:
   ```
   Client1: PATCH with version=128 → Success, increments to 129
   Client2: PATCH with version=128 → 409 Conflict
   Client2: GET → Receives version=129
   Client2: PATCH with version=129 → Success, increments to 130
   ```

---

## 8. Rate Limiting & Backoff

### 8.1 Rate Limit Headers

**Response Headers**:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 47
X-RateLimit-Reset: 1730668860000
Retry-After: 10  (when 429)
```

### 8.2 Client Backoff Strategy

```typescript
async function pollWithBackoff() {
  const response = await fetch(url, { headers });

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const delay = parseInt(retryAfter || "10") * 1000;

    // Exponential backoff with jitter
    const jitter = Math.random() * 0.2 * delay;  // ±20%
    await sleep(delay + jitter);

    return pollWithBackoff();  // Retry
  }

  return response.json();
}
```

---

## 9. Progress Calculation

### 9.1 Algorithm

**Investigation Progress** = Weighted average of phases

```
progress% = (phase1_% * 0.2 + phase2_% * 0.2 + ... + phase5_% * 0.2)
```

**Phase Progress** = Weighted average of tools in that phase

```
phase% = SUM(tool_% for each tool) / tool_count
```

**Tool Progress** = Based on execution status

```
- Queued: 0%
- Running: 50%
- Completed: 100%
- Failed: 100% (marked as failed)
```

### 9.2 Storage

Store in `progress_json` field:
```json
{
  "current_phase": "Data Collection",
  "progress_percentage": 34.5,
  "phase_progress": {
    "Initialization": 100,
    "Data Collection": 50,
    "Tool Execution": 0,
    "Analysis": 0,
    "Finalization": 0
  }
}
```

---

## 10. Security & Compliance

### 10.1 Authorization

All endpoints enforce row-level access control:
```python
@require_read
async def get_investigation_state(investigation_id: str, current_user: User):
  # Verify current_user has access to investigation_id
  state = db.query(InvestigationState).filter(
    InvestigationState.investigation_id == investigation_id,
    InvestigationState.user_id == current_user.id  # ← Row-level check
  ).first()
```

### 10.2 Data at Rest

- Encrypt sensitive fields in progress_json
- Never store PII in audit_log (reference IDs instead)
- Immutable audit trail (no updates or deletes)

### 10.3 Audit Trail

Every state change creates immutable audit entry:
- Complete state snapshot (for rollback)
- Field-level changes
- Actor identification
- Source tracking (UI, API, SYSTEM, WEBHOOK, POLLING)
- Timestamp with full precision

---

## 11. Testing Strategy

### 11.1 Backend Tests

**Unit Tests**:
- Cursor generation uniqueness and ordering
- ETag calculation consistency
- Adaptive interval calculation
- Version conflict detection
- Event schema validation

**Integration Tests**:
- Full polling flow with ETag caching
- Cursor pagination with large event sets
- Optimistic locking conflict resolution
- Audit log creation and retrieval
- Rate limiting enforcement

### 11.2 Frontend Tests

**Unit Tests**:
- Adaptive polling interval selection
- Event deduplication logic
- Cursor storage and retrieval
- ETag header handling
- Backoff calculation with jitter

**Integration Tests**:
- Full polling lifecycle
- SSE with fallback to polling
- Multi-tab BroadcastChannel coordination
- Offline detection and queue handling
- Error recovery and retry

---

## 12. Metrics & Observability

### 12.1 Key Metrics

```
event_feed_latency_p95_ms: Measure cursor fetch time
polling_qps_per_user: Track requests per user per minute
304_not_modified_ratio: Monitor ETag effectiveness (target: 80% idle)
events_to_visibility_ms: Time from event creation to UI display
sse_fallback_activations: Count of SSE → polling fallbacks
multi_tab_qps_reduction: Measure load reduction across tabs (target: 80%)
```

### 12.2 Logging

**Backend**:
```python
logger.info(
  "poll_request",
  investigation_id=investigation_id,
  status_code=200,
  response_size_bytes=len(response_body),
  latency_ms=elapsed_ms,
  etag_hit=(status_code == 304)
)
```

**Frontend**:
```typescript
console.log(
  "polling_cycle",
  {
    investigationId,
    interval_ms,
    events_received: events.length,
    latency_ms,
    deduped: dedupedCount,
    new_cursor: newCursor
  }
);
```

---

## 13. Backward Compatibility

### 13.1 Existing Endpoints

**No breaking changes**:
- Existing `GET /investigation-state/{id}` continues to work
- Existing `PATCH /investigation-state/{id}` continues to work
- Existing polling endpoint unchanged
- New cursor-based endpoints are additive

### 13.2 Migration Path

1. **Phase 1**: New cursor endpoints deployed alongside existing
2. **Phase 2**: Frontend gradually migrates to cursor-based polling
3. **Phase 3**: Old polling endpoint deprecated (with 6-month notice)
4. **Phase 4**: Old endpoint removed

---

## 14. Performance Targets

| Metric | Target | Justification |
|--------|--------|---------------|
| Snapshot GET p95 | <100ms | Typical investigation is small JSON |
| Events feed p95 | <150ms | Cursor query + pagination from audit log |
| Polling QPS reduction | 50% vs current | ETag 304s + adaptive intervals |
| SSE latency | <5s | Server-initiated push |
| Multi-tab QPS reduction | 80% | Only 1 of N tabs polls fast |
| Page rehydration | <700ms | Snapshot load + first event fetch |
| 304 ratio (idle) | 80% | ETag cache effectiveness |

---

## 15. Implementation Notes

### 15.1 Dependencies

✅ **Already available**:
- SQLAlchemy ORM (database access)
- Pydantic (schema validation)
- FastAPI (WebSocket/SSE support)
- FastAPI's `sse_response` (server-sent events)

❌ **No new dependencies required**

### 15.2 File Size Compliance

- Backend services: <200 lines each (split by responsibility)
- Frontend hooks: <150 lines each (single concern)
- API routers: <250 lines (business logic + routes)

### 15.3 Test Coverage Target

- Unit tests: 85%+ coverage
- Integration tests: Critical paths 100%
- E2E tests: All user stories covered
- Overall: 87%+ coverage minimum

---

## Conclusion

The proposed cursor-based, event-sourced architecture **builds perfectly on Olorin's existing infrastructure**. No database schema changes are required. The implementation enhances existing services (PollingService, InvestigationStateService) and adds focused new services (InvestigationProgressService, WebSocket handler) without architectural disruption.

**Next Phase**: Generate data-model.md with concrete event schema, cursor format specification, and response models.
