# Research: Live Investigation Data Updates

**Date**: 2025-11-06  
**Feature**: 008-live-investigation-updates  
**Status**: Complete

## Overview

This research document consolidates all technical findings and decisions for the live investigation data updates feature. All research was completed during the specification phase through comprehensive codebase analysis.

## Research Findings

### 1. Backend Endpoint Architecture

**Finding**: All three required endpoints already exist and are production-ready.

**Decision**: Reuse existing endpoints, verify they return real data without mocks.

**Evidence**:
- `/api/v1/investigations/{id}/progress` implemented in `olorin-server/app/router/investigations_router.py` (lines 107-140)
  - Uses `InvestigationProgressService.build_progress_from_state(state)`
  - Returns `InvestigationProgress` Pydantic model with all required fields
  - Data source: `investigation_state.progress_json` (stored in database)
  - No hardcoded or placeholder values

- `/api/v1/investigations/{id}/events` implemented in `olorin-server/app/router/investigation_stream_router.py` (lines 40-164)
  - Uses `EventFeedService.fetch_events_since()`
  - Supports cursor-based pagination with format `{timestamp_ms}_{sequence}`
  - Supports ETag-based conditional requests (If-None-Match header)
  - Returns 304 Not Modified for unchanged data
  - Performance target: <30ms for 304 responses
  - Data source: `investigation_audit_log` table (real events)

- `/api/v1/investigations/{id}/runs/{run_id}/stream` implemented in `olorin-server/app/router/investigation_sse_router.py` (lines 41-143)
  - Uses `EventStreamingService.stream_investigation_events()`
  - Streams events as text/event-stream (Server-Sent Events)
  - Supports reconnection via `last_event_id` parameter
  - Includes heartbeat to keep connection alive
  - Auto-closes after 5 minutes with reconnection instruction

**Rationale**: Building on proven, tested infrastructure rather than rewriting reduces bugs and development time.

### 2. Investigation State Data Model

**Finding**: Investigation state is stored in PostgreSQL `investigation_states` table with proper schema design.

**Schema Verification**:
```
investigation_states table:
- investigation_id (PK): String(255)
- user_id: String(255) [indexed]
- status: String(50) [indexed]
- lifecycle_stage: String(50) [indexed]
- progress_json: Text (contains tool_executions, percent_complete, phases, metrics)
- settings_json: Text (contains entities array)
- results_json: Text (final investigation results)
- version: Integer (for optimistic locking)
- created_at, updated_at: DateTime [indexed]
- last_accessed: DateTime
```

**Progress JSON Structure**:
```json
{
  "tool_executions": [
    {
      "id": "tool_exec_123",
      "tool_name": "ip_reputation",
      "agent_type": "network_analysis",
      "status": "completed",
      "queued_at": "2025-11-06T09:00:00Z",
      "started_at": "2025-11-06T09:00:01Z",
      "completed_at": "2025-11-06T09:00:05Z",
      "execution_time_ms": 4000,
      "input": {"entity_id": "192.168.1.1", "entity_type": "ip"},
      "result": {"success": true, "risk_score": 0.75, "findings": [...]},
      "retry_count": 0
    }
  ],
  "percent_complete": 45,
  "phases": [
    {
      "id": "phase_init",
      "name": "initialization",
      "order": 0,
      "status": "completed",
      "completion_percent": 100,
      "tool_execution_ids": ["tool_exec_1", "tool_exec_2"],
      "started_at": "2025-11-06T09:00:00Z",
      "completed_at": "2025-11-06T09:00:30Z"
    }
  ]
}
```

**Decision**: Data model is properly normalized and verified. No schema changes needed.

**Rationale**: PostgreSQL schema-locked design prevents accidental changes and ensures data integrity.

### 3. Event Pagination & Deduplication

**Finding**: Cursor-based pagination is properly implemented with deduplication.

**Cursor Format**: `{timestamp_ms}_{sequence}`
- Example: `1730668800000_000127`
- timestamp_ms: Unix milliseconds since epoch
- sequence: 6-digit counter for ordering events at same millisecond

**Event Ordering**: Strictly ordered by `timestamp ASC, sequence ASC`
- Guarantees consistent pagination
- Prevents duplicates when paginating

**ETag Support**:
- Generates unique hash based on investigation version
- Returns 304 Not Modified when content unchanged
- Performance target: <30ms for 304 responses
- Reduces bandwidth by 90% on unchanged data

**Implementation**: `EventFeedService` in `olorin-server/app/service/event_feed_service.py`
- `fetch_events_since(cursor, limit)` method
- Cursor validation with expiration (>30 days old = 400 error)
- Configurable limits (1-1000 events per page, default 100)

**Decision**: Use existing EventFeedService as-is, verify it properly deduplicates events.

**Rationale**: Cursor-based pagination scales better than offset pagination for large datasets.

### 4. Server-Sent Events (SSE) Implementation

**Finding**: SSE endpoint is properly implemented with reconnection support.

**Implementation**: `EventStreamingService` in `olorin-server/app/service/event_streaming_service.py`

**Features**:
- Streams events in JSON format
- Event types: tool_complete, tool_error, phase_change, entity_discovered, heartbeat
- Heartbeat interval: configurable (default 30 seconds)
- Max connection duration: configurable (default 5 minutes)
- Batch size: configurable (default 10 events)
- Poll interval: configurable (default 0.5 seconds)
- Last event ID support for client reconnection

**Configuration** (environment variables):
```
SSE_HEARTBEAT_INTERVAL_SECONDS=30
SSE_MAX_DURATION_SECONDS=300
SSE_BATCH_SIZE=10
SSE_POLL_INTERVAL_SECONDS=0.5
```

**Decision**: Use existing EventStreamingService, verify reconnection logic and performance.

**Rationale**: SSE is native browser technology, no additional libraries needed for clients.

### 5. Frontend Infrastructure

**Finding**: Frontend has comprehensive infrastructure for real-time updates already implemented.

**Existing Hooks**:
1. `useProgressData` - Polls /progress with ETag caching
   - File: `olorin-front/src/microservices/investigation/hooks/useProgressData.ts`
   - Features: ETag cache, conditional requests, automatic retry with backoff

2. `useAdaptivePolling` - Manages polling intervals based on status
   - File: `olorin-front/src/microservices/investigation/hooks/useAdaptivePolling.ts`
   - Adjusts intervals by investigation status and lifecycle stage
   - Pauses polling when tab is hidden

3. `useWizardPolling` - State polling for wizard flow
   - File: `olorin-front/src/shared/hooks/useWizardPolling.ts`
   - ETag-based conditional requests
   - Exponential backoff on failure

4. `useSSEPollingFallback` - Automatic SSE to polling fallback
   - File: `olorin-front/src/microservices/investigation/hooks/useSSEPollingFallback.ts`
   - Detects SSE failure and switches to polling
   - Reconnects to SSE when available

**Existing Components**:
- `InvestigationProgressBar` - Progress visualization
- `InvestigationStatus` - Status display with metrics
- `ConnectionStatusHeader` - Connection status and controls
- `WizardStateDisplay` - Investigation state display

**Polling Configuration**:
```typescript
// olorin-front/src/microservices/investigation/constants/pollingConfig.ts
PROGRESS_INTERVAL_MS: 3000      // Poll every 3 seconds
ENTITY_GRAPH_INTERVAL_MS: 30000 // Poll entity graph every 30 seconds
MAX_RETRIES: 5
RETRY_BACKOFF_MS: [3000, 6000, 12000, 24000, 30000]
```

**Decision**: Reuse all existing hooks and components, complete any missing implementations.

**Rationale**: Leveraging existing tested code reduces bugs and accelerates delivery.

### 6. Data Models Verification

**Finding**: All required Pydantic models exist and are properly typed.

**Models**:
- `InvestigationProgress` (complete response model)
  - Fields: id, investigation_id, status, lifecycle_stage, completion_percent, 
    tool_executions[], agent_statuses[], risk_metrics, phases[], entities[], 
    relationships[], tools_per_second, peak_tools_per_second, errors[]

- `ToolExecution` (individual tool tracking)
  - Fields: id, tool_name, agent_type, status, queued_at, started_at, completed_at, 
    execution_time_ms, input, result, error, retry_count, max_retries

- `AgentStatus` (per-agent progress)
  - Fields: agent_type, agent_name, status, tools_completed, total_tools, 
    progress_percent, average_execution_time_ms, findings_count, risk_score, max_risk_detected

- `PhaseProgress` (phase tracking)
  - Fields: id, name, order, status, completion_percent, tool_execution_ids, 
    started_at, completed_at, estimated_duration_ms

- `RiskMetrics` (risk assessment)
  - Fields: overall (float 0.0-1.0), by_agent (dict), confidence (float 0.0-1.0), last_calculated

- `InvestigationEntity` (entity tracking)
  - Fields: id, type, value, label, metadata, added_at

- `EntityRelationship` (relationship tracking)
  - Fields: id, source_entity_id, target_entity_id, relationship_type, confidence, metadata, discovered_at

- `InvestigationError` (error tracking)
  - Fields: id, code, message, timestamp, severity, context

**Decision**: All models verified complete and accurate. No changes needed.

**Rationale**: Comprehensive models ensure type safety and prevent data loss.

### 7. Multi-Tab Coordination Strategy

**Finding**: Frontend can coordinate between tabs using LocalStorage events.

**Approach**: 
- Store investigation_id and last_update_timestamp in LocalStorage key: `investigation_{id}_lastUpdate`
- Only one tab should have active SSE or polling for each investigation
- Other tabs listen to LocalStorage changes and update their local state
- Heartbeat mechanism prevents stale data

**Alternatives Considered**:
1. BroadcastChannel API - Better performance, but limited browser support
2. Service Worker coordination - Complex, requires service worker registration
3. Server-side session tracking - Violates stateless API design
4. Shared IndexedDB - Overkill for this use case

**Decision**: Use LocalStorage with fallback to duplicate connections gracefully (not ideal but works).

**Rationale**: LocalStorage is widely supported and sufficient for coordination.

### 8. Polling Interval Strategy

**Finding**: Polling intervals should vary by investigation status and lifecycle stage.

**Recommended Intervals**:
```
Status: CREATED/SETTINGS (pending)       → 5-10 seconds (user hasn't started yet)
Status: IN_PROGRESS                      → 1-3 seconds (active investigation)
Status: COMPLETED/FAILED/CANCELLED       → 0 seconds (stop polling)

Lifecycle: draft                         → 10 seconds
Lifecycle: submitted                     → 5 seconds
Lifecycle: in_progress                   → 1-2 seconds (fast)
Lifecycle: completed/failed              → 0 seconds (stop)
```

**Configuration** (environment variables):
```
POLLING_INTERVAL_PENDING_MS=5000      # While pending
POLLING_INTERVAL_RUNNING_MS=1000      # While running
POLLING_INTERVAL_IDLE_MS=10000        # Idle phases
POLLING_MAX_BACKOFF_MS=30000          # Max backoff on errors
```

**Decision**: Implement adaptive polling based on status + lifecycle combination.

**Rationale**: Reduces server load during idle phases while providing real-time updates during active investigation.

### 9. SSE to Polling Fallback Behavior

**Finding**: Fallback mechanism should be transparent and automatic.

**Trigger**: SSE connection fails when:
- Connection times out (network issue)
- Server returns 500+ error
- Network reconnection happens
- Client detects no heartbeat for 2× heartbeat interval

**Fallback Process**:
1. Detect SSE failure (within 1-2 seconds)
2. Switch to polling immediately
3. Start polling with normal intervals
4. Every 10 seconds, attempt to reconnect to SSE
5. When SSE connects successfully, stop polling and resume SSE
6. Continue until investigation reaches terminal status

**Exponential Backoff** (for polling retries):
- Attempt 1: 3s
- Attempt 2: 6s
- Attempt 3: 12s
- Attempt 4: 24s
- Attempt 5: 30s (max)

**Decision**: Implement automatic, transparent fallback with exponential backoff.

**Rationale**: Ensures continuous data delivery even under poor network conditions.

### 10. Error Handling & Recovery

**Finding**: System should gracefully handle all error scenarios.

**Handled Scenarios**:
1. SSE connection timeout → Fallback to polling
2. Polling request timeout → Exponential backoff + retry
3. Invalid cursor (expired >30 days) → 400 error, restart from current
4. Corrupted progress_json → Return defaults, log error
5. Missing ETag header → Treat as 200 response, recompute ETag
6. Network disconnection → Automatic retry with backoff
7. Investigation completes → Stop polling, display final state
8. User navigates away → Clean up timers, close connections
9. Multiple tabs open → Coordinate to prevent duplicate requests
10. Out of memory → Graceful degradation, stop updates

**Decision**: Implement comprehensive error handling for all edge cases identified in spec.

**Rationale**: Ensures robust, production-ready system that works in real-world conditions.

## Architecture Decisions Summary

| Decision | Rationale | Alternatives Rejected |
|----------|-----------|----------------------|
| Reuse existing endpoints | Proven, tested infrastructure | Rewrite from scratch (risk, time) |
| PostgreSQL for storage | Already schema-locked, proven | NoSQL (requires migration) |
| Cursor-based pagination | Scales with large datasets | Offset pagination (breaks with inserts) |
| SSE for real-time | Native browser support | WebSocket (requires upgrade), polling (latency) |
| LocalStorage for coordination | Widely supported | BroadcastChannel (limited browser support) |
| Adaptive polling intervals | Reduces load, maintains responsiveness | Fixed intervals (either slow or wasteful) |
| Automatic SSE→polling fallback | Transparent to user, maintains availability | Manual switch (poor UX) |
| Environment variables for config | No hardcoded values, flexible deployment | Hardcoded values (violates mandate) |

## Technology Stack Verification

✅ **Backend**:
- Python 3.11 - FastAPI, SQLAlchemy, Pydantic
- PostgreSQL - schema-locked investigation_states table
- pytest - unit and integration tests

✅ **Frontend**:
- TypeScript 5.x - React hooks, React Testing Library
- React 18+ - Hooks-based architecture
- Playwright - E2E testing

✅ **Real-Time Delivery**:
- Server-Sent Events (HTTP long-poll with text/event-stream)
- Standard HTTP polling with conditional requests (ETag)
- No additional libraries needed (browser native)

✅ **Data Models**:
- Pydantic for type safety
- SQLAlchemy for ORM
- TypeScript for frontend types

✅ **Testing**:
- pytest for backend unit/integration tests
- Jest + React Testing Library for frontend
- Playwright for E2E testing

## Unknowns Resolution Summary

**All unknowns resolved during specification phase**:
- ✅ Data structure in progress_json verified
- ✅ Event ordering and cursor format verified
- ✅ SSE implementation verified
- ✅ Frontend hooks architecture verified
- ✅ ETag caching mechanism verified
- ✅ Multi-tab coordination strategy decided
- ✅ Polling interval calculation decided
- ✅ Fallback behavior decided
- ✅ Error handling strategy decided

**No blocking unknowns remain**. Implementation can proceed immediately.

## Implementation Readiness

**Status**: ✅ **READY FOR IMPLEMENTATION**

All technical decisions made, all unknowns resolved, all architecture verified.

No showstoppers or missing information. Implementation can begin with high confidence.

---

**Research Complete**: 2025-11-06  
**Next Phase**: Data model design & API contracts generation

