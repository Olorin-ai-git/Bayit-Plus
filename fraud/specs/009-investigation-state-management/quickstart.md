# Quick Start & Test Scenarios

**Phase**: 1 (Design)
**Date**: 2025-11-04
**Purpose**: Integration examples and test scenarios for investigation state management

---

## Overview

This document provides:
1. **Integration examples** showing how frontend & backend components work together
2. **Test scenarios** for each user story (from spec.md)
3. **Example requests/responses** for all key API interactions
4. **Troubleshooting guides** for common issues

---

## Section 1: Integration Examples

### Example 1: Page Load Rehydration (User Story 1)

**User action**: Navigate to investigation page

**Frontend flow**:
```typescript
// 1. Load page for investigation INV-42
const investigationId = "INV-42";

// 2. Fetch snapshot immediately
const response = await fetch(
  `/api/v1/investigation-state/${investigationId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const snapshot = await response.json();

// 3. Render snapshot
renderInvestigationUI(snapshot);
setState({
  id: snapshot.id,
  status: snapshot.status,
  progress: snapshot.progress.progress_percentage,
  phase: snapshot.progress.current_phase
});

// 4. Get last known cursor from localStorage
let cursor = localStorage.getItem(`inv:${investigationId}:cursor`);

// 5. If cursor exists, fetch delta events
if (cursor) {
  const eventsResponse = await fetch(
    `/api/v1/investigations/${investigationId}/events?since=${cursor}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const { items, next_cursor } = await eventsResponse.json();

  // 6. Apply events to update UI
  items.forEach(event => applyEvent(event));

  // 7. Save new cursor
  localStorage.setItem(`inv:${investigationId}:cursor`, next_cursor);
  cursor = next_cursor;
}

// 8. Start adaptive polling with cursor
startAdaptivePolling(investigationId, cursor);
```

**Backend flow** (snapshot endpoint):
```python
# Request
GET /api/v1/investigation-state/INV-42 HTTP/1.1
Authorization: Bearer {token}

# Response
HTTP/1.1 200 OK
ETag: W/"128-abc123"
Cache-Control: private, no-cache

{
  "id": "INV-42",
  "lifecycle_stage": "IN_PROGRESS",
  "status": "IN_PROGRESS",
  "progress": {
    "current_phase": "Data Collection",
    "progress_percentage": 34.5
  },
  "version": 128,
  "updated_at": "2025-11-04T12:39:59.501Z"
}
```

**Timing**:
- Snapshot GET: ~50-100ms
- Events fetch: ~50-150ms
- Total rehydration: <700ms P95

---

### Example 2: Adaptive Polling (User Story 3)

**Scenario**: Investigation is actively running (new events arriving)

**Frontend polling loop**:
```typescript
let cursor = "1730668800000_000127";
let pollInterval = 5000;  // Start with 5 seconds (investigation IN_PROGRESS)

async function poll() {
  // Build URL with cursor
  const url = `/api/v1/investigations/${investigationId}/events?since=${cursor}&limit=100`;

  // Make request with ETag caching
  const etag = localStorage.getItem(`inv:${investigationId}:etag`);
  const headers = {
    Authorization: `Bearer ${token}`,
    ...(etag && { "If-None-Match": etag })
  };

  const response = await fetch(url, { headers });

  if (response.status === 304) {
    // Not modified - no new events
    console.log("No new events (304)");
  } else if (response.status === 200) {
    // New events received
    const { items, next_cursor, poll_after_seconds, etag: newEtag } = await response.json();

    console.log(`Received ${items.length} events`);

    // Apply events
    items.forEach(event => applyEvent(event));

    // Update cursor and ETag
    cursor = next_cursor;
    localStorage.setItem(`inv:${investigationId}:cursor`, cursor);
    if (newEtag) {
      localStorage.setItem(`inv:${investigationId}:etag`, newEtag);
    }

    // Respect server's poll hint
    pollInterval = (poll_after_seconds || 5) * 1000;
  } else if (response.status === 429) {
    // Rate limited - back off
    const retryAfter = parseInt(response.headers.get("Retry-After") || "10");
    pollInterval = retryAfter * 1000 * (1 + Math.random() * 0.2);  // Add jitter
    console.log(`Rate limited. Backing off for ${pollInterval}ms`);
  }

  // Schedule next poll
  setTimeout(poll, pollInterval);
}

// Start polling
poll();
```

**Behavior**:
- **Active investigation** (IN_PROGRESS): Poll every 2-5 seconds
- **Idle investigation** (no events for 5min): Poll every 30-60 seconds
- **Tab hidden**: Pause polling
- **Rate limited**: Exponential backoff with jitter

---

### Example 3: Optimistic Concurrency (User Story 6)

**Scenario**: Two analysts modify investigation settings simultaneously

**Analyst 1 flow**:
```typescript
// Analyst 1: GET current state
let state = await getInvestigationState("INV-42");  // version=128

// Analyst 1: Modify settings
state.settings.riskThreshold = 0.8;

// Analyst 1: PATCH with If-Match
const response = await fetch(
  `/api/v1/investigation-state/INV-42`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "If-Match": "128",  // ← Optimistic lock
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      settings_json: JSON.stringify(state.settings),
      version: 128
    })
  }
);

// Success (200)
if (response.ok) {
  const updated = await response.json();
  state = updated;  // version now=129
  alert("Settings updated successfully");
}
```

**Analyst 2 flow** (concurrent with Analyst 1):
```typescript
// Analyst 2: GET current state
let state = await getInvestigationState("INV-42");  // version=128

// Analyst 2: Modify different settings
state.settings.executionMode = "SERIAL";

// Analyst 2: PATCH with If-Match
const response = await fetch(
  `/api/v1/investigation-state/INV-42`,
  {
    method: "PATCH",
    headers: {
      "If-Match": "128",  // ← Also has version 128
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      settings_json: JSON.stringify(state.settings),
      version: 128
    })
  }
);

// Conflict! (409) - Analyst 1 already updated
if (response.status === 409) {
  const conflict = await response.json();
  console.log(
    `Conflict: server has version ${conflict.details.current_version}, ` +
    `you have version ${conflict.details.submitted_version}`
  );

  // Refetch and retry
  state = await getInvestigationState("INV-42");  // version=129

  // Reapply changes
  state.settings.executionMode = "SERIAL";

  // Retry with new version
  const retryResponse = await fetch(..., {
    headers: { "If-Match": "129" },  // ← Updated version
    body: JSON.stringify({ ..., version: 129 })
  });

  if (retryResponse.ok) {
    alert("Settings updated after conflict resolution");
  }
}
```

---

## Section 2: Test Scenarios (from User Stories)

### Test Scenario 1: Investigation Page Load Rehydration

**Acceptance Criteria** (from spec.md):

1. ✅ Snapshot displayed within 700ms (excluding network)
2. ✅ Stored cursor restored from localStorage
3. ✅ Delta events fetched and applied
4. ✅ Page refresh shows current state within one polling cycle

**Test Steps**:
```
Given: Investigation INV-42 exists with 10 events
And: Browser stores cursor "1730668800000_000050"

When: User navigates to /investigations/INV-42
Then: Investigation snapshot displayed within 100ms
And: UI shows current status: "IN_PROGRESS"
And: UI shows progress: 34.5%

When: Events endpoint returns 5 new events (51-55)
Then: UI updates with new anomalies
And: Cursor updated to "1730668800000_000055"

When: User refreshes page
Then: Snapshot displayed immediately
And: New events fetched from cursor 000055
Then: Total new events applied to UI
```

### Test Scenario 2: ETag Caching with 304 Responses

**Acceptance Criteria**:

1. ✅ 80% of idle polls return 304 Not Modified
2. ✅ Payload size reduced on 304 responses
3. ✅ Client-side ETag validation works

**Test Steps**:
```
Given: Investigation is idle (no new events for 10 minutes)
And: ETag cached: "W/\"128-abc123\""

When: Poll 1 → GET with If-None-Match: "W/\"128-abc123\""
Then: Receive 304 Not Modified
And: No response body transmitted
And: No new ETag in response (reuse cached)

When: Poll 2-10 (same investigation, still idle)
Then: All 10 polls return 304
And: Total bandwidth for 10 polls ≈ 100 bytes (headers only)

When: Investigation state changes (version→129)
Then: Poll returns 200 OK
And: New ETag: "W/\"129-def456\""
And: Response includes full snapshot
```

### Test Scenario 3: Adaptive Polling Intervals

**Acceptance Criteria**:

1. ✅ Poll every 5-10s when investigation IN_PROGRESS
2. ✅ Poll every 60-120s when idle (no events for 5+ min)
3. ✅ Pause polling when tab hidden
4. ✅ Resume at appropriate interval when tab shown

**Test Steps**:
```
Given: Investigation status = "IN_PROGRESS"
And: New events arriving every 2 seconds

When: Client polls
Then: Receive poll_after_seconds: 5
And: Next poll scheduled in 5000ms

When: Investigation completes (status → "COMPLETED")
And: No new events for 5 minutes

Then: Next poll uses poll_after_seconds: 30
And: Subsequent polls extend to 60-120s range

When: Browser tab becomes hidden (document.hidden = true)
Then: Stop polling immediately

When: Browser tab becomes visible again
Then: Resume polling at appropriate interval for current status
```

### Test Scenario 4: Event Feed Ordering & Deduplication

**Acceptance Criteria**:

1. ✅ Events ordered by timestamp ascending
2. ✅ Deduplication by event ID works
3. ✅ Strict ordering maintained across pagination

**Test Steps**:
```
Given: 10 events exist with timestamps:
  Event 1: ts=12:34:56.100Z, id=...100
  Event 2: ts=12:34:56.200Z, id=...200
  Event 3: ts=12:34:56.200Z, id=...201  (same millisecond, seq=1)
  ...
  Event 10: ts=12:35:00.000Z, id=...999

When: Fetch events with limit=5
Then: Receive events 1-5 in order (100, 200, 201, ...)
And: next_cursor points to event 6

When: Fetch events with since={event5_id} limit=5
Then: Receive events 6-10
And: No overlap with previous fetch

When: Events fetched twice (simulating retry)
Then: Deduplicate by event ID
And: Each event applied exactly once to UI
```

### Test Scenario 5: SSE Real-Time with Fallback

**Acceptance Criteria**:

1. ✅ SSE delivers events with <5s latency
2. ✅ Fallback to polling on SSE failure
3. ✅ Works in 100% of disconnect scenarios

**Test Steps**:
```
Given: User on run-details page watching tool execution

When: EventSource opens to /api/v1/investigations/{id}/runs/{runId}/stream
Then: Connection established in <100ms

When: Tool completes execution
And: Server sends: data: {"event": "tool_complete", ...}
Then: Client receives within <1s
And: UI updates immediately

When: SSE connection drops (network error)
Then: EventSource.onerror fires
And: Client falls back to polling
And: Poll endpoint called: GET .../events?since={cursor}
And: Data delivery continues without user interruption

When: Polling fetch completes
And: User closes SSE connection intentionally
Then: No reconnection attempts
And: Polling continues at regular intervals
```

### Test Scenario 6: Rate Limiting & Backoff

**Acceptance Criteria**:

1. ✅ Rate limit enforcement (60 req/min per user)
2. ✅ Exponential backoff with jitter
3. ✅ Respect Retry-After header

**Test Steps**:
```
Given: User at limit (60 requests in last minute)

When: Make 61st request
Then: Receive 429 Too Many Requests
And: Headers include:
  - Retry-After: 10
  - X-RateLimit-Remaining: 0
  - X-RateLimit-Reset: {timestamp}

When: Client implements backoff
  delay = parseInt(Retry-After) * 1000 * (1 + random(0, 0.2))
Then: Retry after 10-12 seconds (with jitter)

When: Retry request sent after backoff
Then: Receive 200 OK
And: X-RateLimit-Remaining incremented
```

---

## Section 3: Common Issues & Troubleshooting

### Issue 1: Cursor Expiration

**Symptom**: Client gets 400 Bad Request on events fetch

**Cause**: Cursor is >30 days old

**Solution**:
```typescript
if (response.status === 400) {
  // Cursor expired
  localStorage.removeItem(`inv:${investigationId}:cursor`);
  // Refetch without cursor (start from beginning)
  fetchEventsSince(investigationId, null);
}
```

### Issue 2: 304 Not Modified Mismatch

**Symptom**: Client receives 304 but data on server changed

**Cause**: ETag stale or cache inconsistency

**Solution**:
- Always store ETag from 200 response
- Clear ETag if getting unexpected 304
- Server always validates ETag matches snapshot version

### Issue 3: Out-of-Order Events

**Symptom**: Events received in wrong sequence

**Cause**: Concurrent inserts or clock skew

**Solution**:
- Server guarantees ordering: Events always ordered by (timestamp, sequence)
- Client applies events in order received
- If out-of-order detected, signal error

### Issue 4: Rate Limit False Positives

**Symptom**: User getting 429 despite low QPS

**Cause**: Shared IP (corporate proxy), or clock skew

**Solution**:
- Check X-RateLimit-Remaining header
- Respect Retry-After value
- Implement exponential backoff with jitter
- Contact support if persistent

---

## Section 4: Example Curl Commands

### Fetch snapshot with ETag

```bash
curl -i \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "If-None-Match: W/\"128-abc123\"" \
  https://api.olorin.local/api/v1/investigation-state/INV-42
```

### Fetch events with cursor

```bash
curl -i \
  -H "Authorization: Bearer ${TOKEN}" \
  "https://api.olorin.local/api/v1/investigations/INV-42/events?since=1730668800000_000127&limit=50"
```

### Update with optimistic locking

```bash
curl -i -X PATCH \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "If-Match: 128" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS", "version": 128}' \
  https://api.olorin.local/api/v1/investigation-state/INV-42
```

---

## Section 5: Performance Expectations

| Operation | P50 | P95 | P99 |
|-----------|-----|-----|-----|
| GET snapshot | 20ms | 80ms | 120ms |
| GET events (50) | 50ms | 150ms | 200ms |
| PATCH update | 30ms | 100ms | 150ms |
| Full rehydration | 150ms | 650ms | 900ms |
| Poll (304) | 10ms | 30ms | 50ms |
| Poll (200) | 50ms | 150ms | 200ms |

**Target**: Page rehydration <700ms P95 (excluding network latency)

---

## Section 6: Implementation Checklist

Backend implementation:
- [ ] Cursor generation and parsing
- [ ] Events endpoint with pagination
- [ ] ETag calculation and 304 responses
- [ ] Optimistic locking (If-Match validation)
- [ ] Rate limiting enforcement
- [ ] Event ordering guarantee
- [ ] Authorization checks

Frontend implementation:
- [ ] useAdaptivePolling hook
- [ ] useEventDeduplication hook
- [ ] useCursorStorage hook
- [ ] ETag caching logic
- [ ] Backoff + jitter implementation
- [ ] SSE with fallback
- [ ] Multi-tab coordination

Testing:
- [ ] Unit: Cursor generation (uniqueness, ordering)
- [ ] Unit: Event deduplication logic
- [ ] Integration: Full polling cycle
- [ ] Integration: SSE fallback
- [ ] E2E: Page load rehydration
- [ ] Load: 10k concurrent pollers
- [ ] Chaos: Network failures, clock skew

---

## Next Steps

1. Review API contracts in `/contracts/` directory
2. Implement backend services (Phase 2)
3. Implement frontend hooks (Phase 3)
4. Run test scenarios against implementation
5. Performance benchmarking against targets
