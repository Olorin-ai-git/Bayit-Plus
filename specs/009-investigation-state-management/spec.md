# Feature Specification: Investigation State Management - Event-Sourced Architecture with Cursor-Based Polling

**Feature Branch**: `001-investigation-state-management`
**Created**: 2025-11-04
**Status**: Draft
**Author**: Gil Klainert

## Overview

Replace the current polling-based `/progress` endpoint architecture with a robust event-sourced system featuring cursor-based changes feeds, conditional requests (ETags), and optional Server-Sent Events (SSE) for real-time progress monitoring. The new architecture maintains canonical investigation state on the server as both a fast-read snapshot and an append-only event log, enabling auditability, resilience, and efficient client rehydration.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Investigation Page Load Rehydration (Priority: P1)

Users navigating to an investigation page should immediately see the current investigation state without waiting for real-time updates. The page should hydrate from a snapshot, then seamlessly sync any new events in the background.

**Why this priority**: This is the primary user journey; every user interaction with investigations depends on fast, accurate initial state rendering. It's the foundation for all other features.

**Independent Test**: Can be fully tested by opening an investigation page and verifying the snapshot is displayed immediately, then confirming new events appear within the next polling cycle. Delivers complete, current investigation view on page load.

**Acceptance Scenarios**:

1. **Given** an investigation exists with known state, **When** user navigates to `/investigations/{id}`, **Then** the snapshot is displayed within 700ms (excluding network) with current status, anomaly counts, and entities
2. **Given** investigation page is open with a stored cursor in localStorage, **When** page loads, **Then** system fetches snapshot first, then polls for events since the stored cursor
3. **Given** investigation state changed since user last visited, **When** user refreshes page, **Then** the new state is visible within one polling cycle (default 15-30s)

---

### User Story 2 - Efficient Conditional Requests with 304 Not Modified (Priority: P1)

Network bandwidth and API load should be minimized during idle periods. Clients should receive 304 Not Modified responses when investigation state hasn't changed, reducing payload size and improving perceived responsiveness.

**Why this priority**: Reduces infrastructure load, improves battery life on mobile devices, and minimizes bandwidth costs. Critical for scaling to many concurrent investigation views.

**Independent Test**: Can be fully tested by repeatedly polling `/investigations/{id}` with ETag headers and verifying 304 responses when state is unchanged, and 200 with new ETag when changed. Delivers measurable bandwidth reduction.

**Acceptance Scenarios**:

1. **Given** snapshot endpoint returns ETag, **When** client retries with `If-None-Match: <ETag>` and state is unchanged, **Then** server returns 304 Not Modified
2. **Given** investigation state changes, **When** client polls with stale ETag, **Then** server returns 200 with new snapshot and updated ETag
3. **Given** multiple clients polling the same investigation, **When** state is unchanged, **Then** all clients receive 304s and no payload is transmitted

---

### User Story 3 - Adaptive Polling Based on Activity (Priority: P1)

Polling intervals should automatically adjust based on investigation activity. Active investigations should poll frequently (5-10s), idle investigations should poll slowly (60-120s), and hidden tabs should pause polling to conserve resources.

**Why this priority**: Balances latency expectations with infrastructure efficiency. Users see quick updates when things are happening, system uses minimal resources when idle.

**Independent Test**: Can be fully tested by observing polling intervals over time as activity level changes, verifying intervals match expected ranges. Delivers both responsiveness and efficiency.

**Acceptance Scenarios**:

1. **Given** investigation has recent events (within 2 minutes), **When** client polls, **Then** `poll_after_seconds` is 5-10 and client respects this hint
2. **Given** investigation is idle (no events for 5+ minutes), **When** client polls, **Then** `poll_after_seconds` is 60-120
3. **Given** browser tab is hidden (document.hidden = true), **When** tab visibility changes, **Then** polling pauses and resumes at appropriate interval

---

### User Story 4 - Event Feed Ordering and Deduplication (Priority: P1)

The events feed should deliver events in strict temporal order with a monotonic cursor. Clients should automatically deduplicate events by event ID to handle retries without duplicating changes.

**Why this priority**: Ensures consistency across clients; out-of-order or duplicate events cause incorrect UI state. Foundation for correct event consumption.

**Independent Test**: Can be fully tested by fetching events feed multiple times with overlapping cursors and verifying strict ordering and deduplication. Delivers predictable, consistent event stream.

**Acceptance Scenarios**:

1. **Given** events exist with timestamps, **When** client fetches `/investigations/{id}/events?since=<cursor>`, **Then** events are ordered by timestamp ascending and return with `next_cursor` for next fetch
2. **Given** client retries a request and receives same events twice, **When** client processes events, **Then** deduplication by event ID prevents duplicate UI updates
3. **Given** large number of events, **When** client uses `limit` parameter, **Then** `has_more` indicates if more events exist and pagination works correctly

---

### User Story 5 - Live Progress Monitoring with Server-Sent Events (Priority: P2)

Operators monitoring run progress should see tool execution logs and results in near-real-time (< 5 second latency) using Server-Sent Events, with graceful fallback to polling if SSE connection drops.

**Why this priority**: Required for operational monitoring of long-running tools, but not critical for general investigation browsing. SSE adds complexity so implemented after polling is solid.

**Independent Test**: Can be fully tested on run-details pages by opening SSE connection and verifying events arrive within 5s, and confirming fallback to polling when connection closes. Delivers real-time progress for monitors.

**Acceptance Scenarios**:

1. **Given** user on run-details page, **When** opening EventSource to `/investigations/{id}/runs/{runId}/stream`, **Then** events stream in real-time with < 5s latency
2. **Given** SSE connection established, **When** tool execution log updates occur, **Then** new entries appear immediately in UI
3. **Given** SSE connection drops (network error, timeout), **When** reconnect fails, **Then** system falls back to polling `/investigations/{id}/events` automatically

---

### User Story 6 - Optimistic Concurrency for Writes (Priority: P2)

Concurrent modifications to investigation state should be detected and resolved gracefully. When conflicts occur, the system should show what changed and offer a reconciliation UI.

**Why this priority**: Important for multi-user investigations but less critical than read scenarios. Can be implemented after polling and snapshot endpoints are stable.

**Independent Test**: Can be fully tested by simulating concurrent PATCH requests from two clients and verifying 412 Precondition Failed returned on conflict, with ability to resolve. Delivers safe concurrent editing.

**Acceptance Scenarios**:

1. **Given** client has stale investigation state, **When** attempting PATCH with outdated `If-Match: <ETag>`, **Then** server returns 412 Precondition Failed
2. **Given** 412 conflict received, **When** client refetches snapshot and retries with new ETag, **Then** PATCH succeeds
3. **Given** concurrent modifications by two analysts, **When** conflict occurs, **Then** UI shows who changed what and offers merge options

---

### User Story 7 - Multi-Tab Coordination (Priority: P3)

When multiple tabs have the same investigation open, only one tab should perform fast polling while others poll slowly, and they should share cursor state to stay synchronized.

**Why this priority**: Nice-to-have optimization for power users with many tabs. Increases complexity and is lower value than core polling functionality.

**Independent Test**: Can be fully tested by opening investigation in multiple tabs and verifying cursor sharing via localStorage events and polling interval distribution. Delivers optimal resource usage across tabs.

**Acceptance Scenarios**:

1. **Given** same investigation open in two tabs, **When** one tab updates cursor, **Then** other tab receives `storage` event and updates cursor
2. **Given** multiple tabs polling same investigation, **When** storage events indicate another tab is active, **Then** secondary tab increases polling interval to reduce QPS
3. **Given** primary tab closed, **When** storage event fires, **Then** secondary tab detects change and resumes fast polling

---

### Edge Cases

- **Clock Skew**: When server and client clocks diverge significantly, all timestamps displayed should be based on server_time, never client clock, to prevent UI confusion
- **Offline Mode**: When navigator.onLine is false, client should pause polling and queue local UI changes (notes, status) with retries when online
- **Large Backfills**: When investigation has thousands of events and cursor is far in past, events feed should paginate through results using limit and has_more
- **Cursor Expiration**: Very old cursors (> 30 days) may point to deleted events; system should handle gracefully with error message
- **Concurrent Event Ingestion**: While client is fetching events, new events may arrive; event ordering must be maintained regardless of concurrent ingestion
- **Network Jitter and 429 Rate Limits**: Client should implement exponential backoff with ±20% jitter when receiving 429 Too Many Requests
- **Hot Partitions**: During investigation spikes when many events arrive rapidly, cursors should be sharded or server poll hints should reduce client QPS

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a canonical investigation state as a fast-read snapshot in the database that can be retrieved in O(1) time
- **FR-002**: System MUST maintain an append-only event log as the source of truth for all investigation changes, with events never modified or deleted
- **FR-003**: System MUST return investigation snapshots via `GET /investigations/{id}` with ETag and/or Last-Modified headers to enable conditional requests
- **FR-004**: System MUST return ordered events feed via `GET /investigations/{id}/events?since=<cursor>&limit=<n>` with monotonic cursor and next_cursor for pagination
- **FR-005**: System MUST return lightweight investigation summary via `GET /investigations/{id}/summary` with counters and tiles, supporting conditional requests with ETag
- **FR-006**: System MUST support PATCH writes via `PATCH /investigations/{id}` with optimistic concurrency using If-Match header, returning 412 on conflict
- **FR-007**: System MUST emit events with unique IDs to enable client-side deduplication of retried requests
- **FR-008**: System MUST include `poll_after_seconds` hint in events feed response to allow server to modulate client polling frequency
- **FR-009**: System MUST support Server-Sent Events stream via `GET /investigations/{id}/runs/{runId}/stream` for real-time progress monitoring with auto-reconnect
- **FR-010**: System MUST encode ordering information in cursor (timestamp + sequence) to ensure events are never out of order
- **FR-011**: System MUST enforce row-level permissions: users can only read/modify investigations they have access to
- **FR-012**: Frontend MUST store cursor in localStorage (key: `inv:{id}:cursor`) and restore on page load
- **FR-013**: Frontend MUST implement adaptive polling intervals: 5-10s when active, 60-120s when idle, paused when tab hidden
- **FR-014**: Frontend MUST respect server poll hints and Retry-After headers for backoff
- **FR-015**: Frontend MUST deduplicate events by event ID to handle retried requests transparently

### Key Entities

- **Investigation Snapshot**: Denormalized read model representing current investigation state with version, status, anomaly counts, entities, latest_events_cursor, last_activity_at
- **Investigation Event**: Append-only event with unique ID, timestamp, actor, operation type, entity type, investigation_id, and self-describing payload
- **Event Cursor**: Monotonic identifier (timestamp + sequence) marking position in event stream, used for pagination and resumption
- **ETag/Version**: Optimistic concurrency token; version increments on each snapshot change, ETag is SHA hash of serialized snapshot

### Non-Functional Requirements

- **Performance**: Snapshot retrieval must complete in < 100ms (P95) for typical investigation sizes
- **Data Freshness**: 95th percentile ≤ 15s for active investigations, ≤ 60s when idle/hidden
- **Availability**: 99.9% for read endpoints, 99.5% for event ingestion
- **Scalability**: System must handle 10,000+ concurrent investigation views without degradation
- **Auditability**: Event log must be immutable and queryable for audit trails
- **Durability**: No events lost; replication and backups per standard practices

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Page rehydration time (snapshot fetch to first paint) is ≤ 700ms on P95 for typical investigations
- **SC-002**: 80% of polling requests to snapshot/summary endpoints return 304 Not Modified during idle periods
- **SC-003**: Average payload size for events feed is < 50KB per request (skinny payloads with deltas)
- **SC-004**: Events-to-visibility latency (event created → visible in UI) is ≤ 15s on P95 for active investigations
- **SC-005**: Polling QPS per user is reduced by 50% compared to current /progress endpoint approach during idle periods
- **SC-006**: Multi-tab scenarios reduce QPS by 80% through leader election and cursor sharing
- **SC-007**: 99.9% availability for all read endpoints; 99.5% for event ingestion
- **SC-008**: Zero events lost or duplicated; event ordering is strictly maintained across all scenarios
- **SC-009**: Successful page refresh shows current investigation state within one polling cycle (15-30s) in 100% of cases
- **SC-010**: SSE stream delivers progress events with < 5s latency when enabled; fallback to polling works in 100% of disconnect scenarios

## Architecture Decisions

### Event Sourcing

The event log is the system of record. Investigation snapshots are materialized views computed by consuming events. This enables:
- Complete audit trail of all changes
- Ability to rebuild state at any point in time
- Easier debugging and root cause analysis

### Cursor-Based Pagination

Cursors are opaque, monotonic identifiers (timestamp + sequence) that mark position in the event stream. They enable:
- Efficient resumption without re-fetching old events
- Handling of clock skew and concurrent ingestion
- Safe pagination through large event sets

### Conditional Requests with ETags

HTTP ETags on snapshot and summary endpoints enable:
- 304 Not Modified responses to reduce bandwidth
- Client-side detection of unchanged state
- Compatibility with HTTP proxies and caching layers

### Adaptive Polling

Polling intervals adjust based on activity level:
- Recent activity (events in last 2 min) → 5-10s
- Idle (no events for 5+ min) → 60-120s
- Tab hidden → paused
- Server `poll_after_seconds` hint is respected

This balances latency expectations with resource efficiency.

### SSE for Real-Time Progress

Server-Sent Events (not WebSockets) for targeted real-time monitoring because:
- One-way (server → client) communication matches use case
- Simpler to implement and operate than WebSockets
- Easier to scale (no persistent bidirectional connection per client)
- Auto-reconnect is built-in
- Falls back gracefully to polling

### Optimistic Concurrency

Writes use If-Match header with ETag/version. Conflicts (412) are resolved by client fetching new state and retrying. This enables:
- Non-blocking reads (no locks)
- Explicit conflict detection and handling
- User visibility into who changed what

## Implementation Phases

### Phase 1 (Weeks 0-2): Core Polling Architecture
- Implement events feed endpoint with cursor-based pagination
- Implement snapshot endpoint with ETag support
- Implement summary endpoint with lightweight counters
- Add adaptive polling to frontend (default intervals)
- Instrument metrics (304 ratio, payload sizes, latency)
- Deploy to production with feature flag for gradual rollout

### Phase 2 (Weeks 3-4): SSE and Advanced Polling
- Add SSE stream for run-details pages
- Implement client-side backoff and jitter for errors/429s
- Add presence indicators (who's viewing this investigation)
- Optimize snapshot materialization and caching

### Phase 3 (Weeks 5+): Optimization and Refinement
- Introduce periodic snapshots (every N events) to speed rebuilds
- Implement cursor signing/validation to prevent leaks
- Add multi-tab coordination with BroadcastChannel
- Fine-tune polling intervals based on observed load
- Implement legal holds and immutable event storage for audit

## API Contracts (Provisional)

### GET /investigations/{id}
**Response (200)**:
```json
{
  "id": "INV-42",
  "version": 128,
  "server_time": "2025-11-04T12:40:00Z",
  "status": "open",
  "priority": "P2",
  "assignee": "jlee",
  "anomaly_counts": {"open": 14, "acknowledged": 5},
  "latest_events_cursor": "2025-11-04T12:39:59.501Z-000127",
  "entities": [...],
  "last_activity_at": "2025-11-04T12:39:59Z"
}
```
**Headers**: `ETag: "abc123"`, `Last-Modified: 2025-11-04T12:39:59Z`

### GET /investigations/{id}/events?since=<cursor>&limit=n
**Response (200)**:
```json
{
  "items": [
    {
      "id": "2025-11-04T12:34:56.789Z-000123",
      "ts": "2025-11-04T12:34:56.789Z",
      "actor": {"type": "system", "service": "anomaly-detector-v2"},
      "op": "append",
      "entity": "anomaly",
      "investigation_id": "INV-42",
      "payload": {...}
    }
  ],
  "next_cursor": "2025-11-04T12:39:59.501Z-000127",
  "has_more": false,
  "poll_after_seconds": 15
}
```

### GET /investigations/{id}/summary
**Response (200)**:
```json
{
  "investigation_id": "INV-42",
  "status": "open",
  "anomalies_open": 14,
  "anomalies_acknowledged": 5,
  "last_activity_at": "2025-11-04T12:39:59Z",
  "tasks_open": 3
}
```
**Headers**: `ETag: "xyz789"`

### PATCH /investigations/{id}
**Request Headers**: `If-Match: "abc123"`
**Response (200)**: Updated snapshot
**Response (412)**: Conflict - version/ETag mismatch

### GET /investigations/{id}/runs/{runId}/stream (SSE)
Stream of server-sent events (one event per line) with run logs and progress updates.

## Testing Strategy

- **Unit Tests**: Event application, cursor generation, ETag calculation
- **Integration Tests**: Full polling flow, multi-event scenarios, cursor pagination
- **Load Tests**: 10k concurrent pollers, burst scenarios, 429 handling
- **E2E Tests**: Page load rehydration, event deduplication, fallback from SSE to polling
- **Chaos Tests**: Network delays, clock skew, concurrent ingestion, cursor expiration

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Hot partitions during spikes | Shard cursors or use topic partitioning; include server poll hints |
| Cursor leaks/guessing | Sign cursors or use opaque server-generated tokens; rotate periodically |
| Event schema drift | Version events; maintain backward-compatible readers; deprecation policy |
| Over-fetching on multi-tab | Elect leader tab via BroadcastChannel; secondary tabs poll slow |
| Clock skew between server/client | Always display server_time; never trust client clock for ordering |
| SSE connection fatigue | Implement connection pooling; graceful fallback to polling |

## Acceptance Criteria Checklist

- [ ] Snapshot endpoint returns ETag; clients receive 304 when unchanged
- [ ] Events feed delivers strict temporal ordering with monotonic cursor
- [ ] Adaptive polling reduces QPS by 50% during idle periods
- [ ] Page refresh shows current investigation state within one polling cycle
- [ ] Client deduplicates events by event ID transparently
- [ ] SSE stream delivers progress events with < 5s latency
- [ ] Fallback from SSE to polling works in 100% of disconnect scenarios
- [ ] 304 ratio metrics show > 80% during idle periods
- [ ] Zero events lost or duplicated across all scenarios
- [ ] Multi-tab scenarios reduce overall QPS by 80%
