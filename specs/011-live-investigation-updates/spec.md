# Feature Specification: Live Investigation Data Updates

**Feature Branch**: `008-live-investigation-updates`  
**Created**: 2025-11-06  
**Status**: Ready for Clarification  
**Input**: User description: "live investigation data. we have a partially implemented SSE updates and polling during the investigation. we need to be able to update the investigation progress and reflect it in the ui. check /progress response and /events response."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Monitor Investigation Progress in Real-Time (Priority: P1)

An investigator running a fraud detection investigation needs to see live updates to the investigation progress as tools execute, phases transition, and risk metrics are calculated. This provides immediate visibility into the investigation's execution status without manual page refreshes.

**Why this priority**: This is the core feature - without real-time progress updates, users cannot effectively monitor investigations. This is the MVP foundation.

**Independent Test**: Open an investigation detail page and verify that progress percentage, tool execution status, phase transitions, and risk metrics update automatically as the investigation progresses (via both SSE and polling fallback).

**Acceptance Scenarios**:

1. **Given** an investigation is running, **When** a tool completes execution, **Then** the UI reflects the updated tool status, completion count, and progress percentage within 1 second (SSE) or polling interval (fallback).
2. **Given** an investigation is running, **When** a phase transitions (e.g., from "initialization" to "analysis"), **Then** the current_phase updates and the phase progress bar reflects the new phase.
3. **Given** an investigation is running, **When** the risk score is recalculated, **Then** the risk metrics (overall, by agent, confidence) are reflected in the UI in real-time.
4. **Given** an investigation is in progress, **When** the user opens a new tab for the same investigation, **Then** both tabs receive synchronized updates (multi-tab support).

---

### User Story 2 - View Detailed Investigation Events (Priority: P1)

An investigator needs to review all events that occurred during the investigation - tool executions, phase changes, errors, entity discoveries - with cursor-based pagination and efficient caching to minimize API calls.

**Why this priority**: Events provide the audit trail and detailed activity log essential for investigation comprehension and compliance.

**Independent Test**: Navigate to the events log page, scroll through paginated events, verify ETag caching prevents unnecessary API responses (304 Not Modified), and confirm event details (timestamp, actor, event type, payload) are accurate.

**Acceptance Scenarios**:

1. **Given** an investigation has completed with events recorded, **When** the user requests the events feed, **Then** the API returns events paginated by cursor (timestamp_sequence format) with up to 100 items per page.
2. **Given** the user has previously fetched events, **When** polling for new events with the same ETag, **Then** the API returns 304 Not Modified within 30ms with Cache-Control headers.
3. **Given** the user requests events with a cursor parameter, **When** requesting the next page, **Then** the response includes next_cursor for pagination and has_more flag indicating if more events exist.
4. **Given** events exist across multiple days, **When** paginating through events, **Then** cursor-based pagination correctly orders events by timestamp ASC, sequence ASC without duplicates.

---

### User Story 3 - Automatic Fallback from SSE to Polling (Priority: P2)

When a real-time SSE connection is unavailable or unreliable, the system automatically falls back to polling using the /events and /progress endpoints to ensure investigation progress updates continue to reach the user (with adjusted intervals).

**Why this priority**: Ensures reliability and graceful degradation. Not MVP-critical if SSE works reliably, but essential for production resilience.

**Independent Test**: Simulate SSE connection failure/unavailability, verify polling begins automatically, confirm progress updates continue to flow, and verify switching back to SSE when connection restores.

**Acceptance Scenarios**:

1. **Given** SSE is unavailable, **When** an investigation is opened, **Then** the system automatically switches to polling with the configured polling interval.
2. **Given** polling is active, **When** SSE connection is restored, **Then** the system transitions back to SSE and stops polling.
3. **Given** the system is polling, **When** multiple requests occur in quick succession, **Then** exponential backoff is applied with configurable max retry intervals.
4. **Given** the user has multiple tabs open, **When** one tab detects SSE failure, **Then** only that tab switches to polling (other tabs remain independent).

---

### User Story 4 - Display Real-Time Investigation Metrics (Priority: P2)

The UI displays live metrics updating in real-time: tools executed per second, peak throughput, entities discovered, relationships formed, error rates, and agent-specific progress. These metrics help investigator understand investigation velocity and health.

**Why this priority**: Enhances user understanding of investigation performance and helps identify bottlenecks. Valuable but not critical for investigation completion.

**Independent Test**: Monitor investigation dashboard and verify that metrics (tools/sec, peak tools/sec, entity count, error count) update and reflect actual investigation activity.

**Acceptance Scenarios**:

1. **Given** tools are executing, **When** progress updates arrive, **Then** tools_per_second and peak_tools_per_second are calculated and displayed.
2. **Given** entities are being discovered, **When** progress updates include new entities, **Then** entity count and relationships count are updated in the UI.
3. **Given** errors occur during investigation, **When** progress updates include errors, **Then** error log displays errors with severity (warning/error/critical), message, and timestamp.
4. **Given** investigation is complete, **When** final progress update arrives, **Then** metrics are frozen at their final values and UI indicates investigation completion.

---

### User Story 5 - Handle Investigation Status Lifecycle (Priority: P2)

The system properly handles and reflects the full investigation lifecycle: from creation through completion/failure, with appropriate UI state transitions and stopping polling/SSE when terminal status is reached (completed, failed, cancelled).

**Why this priority**: Ensures proper lifecycle management and prevents unnecessary resource consumption from continued polling after investigation ends.

**Independent Test**: Run investigation to completion/failure, verify UI transitions to terminal state, confirm polling/SSE stops, and verify retry mechanisms don't restart.

**Acceptance Scenarios**:

1. **Given** investigation status is "running", **When** status changes to "completed", **Then** the UI transitions to completed state and stops polling/SSE.
2. **Given** investigation status is "pending", **When** status transitions to "initializing" then "running", **Then** polling continues with appropriate intervals for each status.
3. **Given** investigation status is "running", **When** status changes to "failed", **Then** the UI displays failure state and includes error details.
4. **Given** terminal status is reached, **When** polling interval calculation is triggered, **Then** polling stops and no further requests are made.

---

### Edge Cases

- What happens when the investigation completes while the user is viewing it? (should gracefully stop updates)
- What happens when network connectivity is poor and multiple requests timeout? (exponential backoff + fallback to polling)
- What happens when the user opens 10+ tabs for the same investigation? (multi-tab coordination without thundering herd of requests)
- What happens when progress_json is corrupted or empty? (system should provide defaults and not crash)
- What happens when /events cursor is expired (>30 days old)? (return 400 Bad Request with clear error)
- What happens when SSE connection is idle for the max duration (5 minutes)? (server closes connection, client should reconnect)
- What happens when event_feed_service returns empty results? (next_cursor is null, has_more is false)
- What happens when ETag header is missing from polling response? (should handle gracefully and recompute on next request)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `/api/v1/investigations/{investigation_id}/progress` endpoint that returns current investigation progress including status, completion percent, tool executions, phases, risk metrics, and entities.
- **FR-002**: System MUST provide a `/api/v1/investigations/{investigation_id}/events` endpoint that returns paginated investigation events (tool_complete, tool_error, phase_change, entity_discovered, risk_updated) with cursor-based pagination.
- **FR-003**: System MUST support SSE streaming via `/api/v1/investigations/{investigation_id}/runs/{run_id}/stream` endpoint for real-time event delivery with automatic reconnection support using last_event_id.
- **FR-004**: System MUST calculate investigation progress from investigation_state.progress_json with percent_complete (0-100), tool execution counts (total, completed, running, queued, failed, skipped), and phase progress.
- **FR-005**: System MUST implement ETag-based conditional requests on both /progress and /events endpoints to return 304 Not Modified when content unchanged, with response time target <30ms for 304s.
- **FR-006**: Frontend MUST poll /progress endpoint at adaptive intervals (faster during active phases, slower during idle phases) with exponential backoff on failure.
- **FR-007**: Frontend MUST fall back to polling when SSE unavailable, with automatic reconnection when SSE becomes available again.
- **FR-008**: Frontend MUST respect multi-tab coordination - only one active polling/SSE connection per investigation, with other tabs receiving updates via LocalStorage or similar mechanism.
- **FR-009**: Frontend MUST display real-time metrics: tools_per_second, peak_tools_per_second, entity count, relationship count, error count, and updated timestamps.
- **FR-010**: Frontend MUST stop polling/SSE when investigation reaches terminal status (completed, failed, cancelled) and clear any retry mechanisms.
- **FR-011**: System MUST include recommended polling intervals in response headers (X-Recommended-Interval) and Cache-Control directives.
- **FR-012**: System MUST track investigation lifecycle: CREATED → SETTINGS → IN_PROGRESS → COMPLETED/FAILED/CANCELLED with appropriate status mappings to UI states.
- **FR-013**: Event feed MUST return events ordered by timestamp ASC, sequence ASC with deduplication by event ID.
- **FR-014**: Cursor pagination MUST use format `{timestamp_ms}_{sequence}` where timestamp is milliseconds since epoch and sequence is 6-digit counter for same-millisecond ordering.
- **FR-015**: System MUST handle investigation state transitions atomically with version tracking (optimistic locking) to prevent concurrent update conflicts.

### Key Entities

- **Investigation**: Uniquely identified by investigation_id, tracks status (CREATED/SETTINGS/IN_PROGRESS/COMPLETED/ERROR/CANCELLED), lifecycle_stage, and version for optimistic locking.
  - Primary data: investigation_id (PK), user_id (FK), status, lifecycle_stage, version, created_at, updated_at
  - Related data: settings_json (configuration), progress_json (current progress state), results_json (final results)

- **InvestigationEvent**: State changes and activities during investigation execution.
  - Attributes: event_id (cursor-based: timestamp_sequence), investigation_id, event_type (phase_change/tool_complete/tool_error/entity_discovered/risk_updated), actor (system/agent_name/tool_name), data (event-specific payload), timestamp
  - Ordering: timestamp ASC, sequence ASC (no duplicates)
  - Pagination: cursor-based with next_cursor for navigation

- **InvestigationProgress**: Real-time progress snapshot aggregated from investigation_state.
  - Attributes: completion_percent (0-100), tool_executions (list with status), phases (with progress), risk_metrics (overall/by_agent/confidence), current_phase, tools_per_second, entities, relationships, errors
  - Calculated from: progress_json (tool_executions, percent_complete, phases) + settings_json (entities) + agent states (risk_metrics)

- **ToolExecution**: Individual tool execution tracking.
  - Attributes: id, tool_name, agent_type, status (queued/running/completed/failed/skipped), execution_time_ms, input (entity_id, entity_type, parameters), result (success, risk_score, findings), error (code, message)
  - Status progression: queued → running → (completed|failed|skipped)

- **Phase**: Investigation phase execution tracking.
  - Attributes: id, name, order, status (pending/in_progress/completed/failed/skipped), completion_percent, tool_execution_ids (list), timestamps (started_at, completed_at)
  - Ordered by: order field (0, 1, 2, ...)

- **InvestigationEntity**: Entity information for investigation.
  - Attributes: id, type (ip/user_id/device_id/etc), value, label, metadata, added_at
  - Source: settings_json.entities array

- **EntityRelationship**: Discovered relationships between entities.
  - Attributes: id, source_entity_id, target_entity_id, relationship_type, confidence (0.0-1.0), metadata, discovered_at

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Progress updates are delivered to UI within 1 second of state change when using SSE (real-time), or within configured polling interval when using polling fallback.
- **SC-002**: ETag-based 304 responses are returned in under 30ms (measured server-side response time), reducing bandwidth by 90% on unchanged data.
- **SC-003**: Cursor-based pagination works correctly - pagination through 10,000 events completes without duplicates, missing events, or ordering issues.
- **SC-004**: Multi-tab support prevents thundering herd - opening 5 tabs for same investigation results in only 1 active SSE/polling connection.
- **SC-005**: Automatic SSE-to-polling fallback occurs within 5 seconds of SSE failure, and user sees continuous updates without manual intervention.
- **SC-006**: Investigation metrics (tools/sec, entity count, relationship count) update with each progress refresh and accurately reflect investigation activity.
- **SC-007**: Investigation lifecycle is correctly tracked - all 6 status transitions (CREATED→SETTINGS→IN_PROGRESS→COMPLETED/ERROR/CANCELLED) occur without data corruption or missed updates.
- **SC-008**: 95% of progress queries complete in under 200ms (including database query, ETag computation, and response serialization).
- **SC-009**: Terminal status detection works reliably - 100% of investigations reaching "completed", "failed", or "cancelled" stop polling/SSE immediately.
- **SC-010**: Exponential backoff works correctly - 5 consecutive failures result in backoff intervals of [3s, 6s, 12s, 24s, 30s] as configured.
- **SC-011**: Event feed correctly deduplicates events by ID - loading same cursor twice returns identical event sets with no duplicates.
- **SC-012**: Zero stub implementations - all endpoints return real data from investigation_state (progress_json, settings_json), not hardcoded or placeholder values.

### Technology-Agnostic Success Definition

Users can observe investigation progress updating in real-time on their dashboard without page refreshes, with automatic fallback to periodic updates if the real-time connection drops, and progress updates continue accurately until the investigation reaches a terminal state.

## Assumptions

1. **SSE Connection Reliability**: SSE connections will be interrupted occasionally (network blips, load balancer restarts), requiring automatic fallback and reconnection logic.
2. **Progress Data Location**: All progress data (tool executions, phases, metrics) is stored in `investigation_state.progress_json` as JSON, not in separate tables.
3. **Event Ordering**: Events are strictly ordered by (timestamp DESC, sequence DESC) for pagination purposes, with sequence number incremented for same-millisecond events.
4. **Multi-Tab Coordination**: Browsers support LocalStorage, allowing coordination between tabs without server-side session state.
5. **Polling Intervals**: Intervals vary by investigation status: fast (1-3s) during active phases, slow (10-30s) during idle phases, configurable via environment.
6. **Version Tracking**: Optimistic locking with version field in investigation_state prevents conflicts when multiple processes update investigation state.
7. **No Real-Time Database**: No real-time database (like Firebase Realtime DB) is available, so SSE and polling are the real-time mechanisms.
8. **User Permissions**: All progress/events endpoints respect existing authorization (require_read_or_dev), no new permissions needed.
9. **Configuration via Environment**: All timing values (polling intervals, SSE max duration, backoff values) come from environment variables, not hardcoded.
10. **Existing Database Schema**: Investigation state is persisted in `investigation_states` table with schema-locked columns (investigation_id, status, progress_json, version, updated_at).

## Notes & Clarifications

### Implementation Approach

The feature builds on existing partially-implemented infrastructure:

1. **Backend Already Has**:
   - `/api/v1/investigations/{id}/progress` endpoint (gets investigation from db, builds response via InvestigationProgressService.build_progress_from_state)
   - `/api/v1/investigations/{id}/events` endpoint (provides cursor-based pagination via EventFeedService)
   - `/api/v1/investigations/{id}/runs/{run_id}/stream` SSE endpoint (streams events via EventStreamingService)
   - Investigation state model and progress_json schema for storing tool executions, phases, metrics
   - Optimistic locking with version field
   - ETag support for conditional requests

2. **Frontend Already Has**:
   - useProgressData hook (polls /progress with ETag caching)
   - useAdaptivePolling hook (manages polling intervals based on status)
   - useWizardPolling hook (ETag caching for polling)
   - SSE fallback support in useSSEPollingFallback hook
   - Multi-tab coordination placeholders
   - Progress bar, status display, metrics components

3. **What Needs Completion**:
   - Ensure /progress endpoint returns complete, real (non-mock) data from progress_json
   - Ensure /events endpoint properly deduplicates and handles cursor pagination
   - Complete SSE implementation with proper reconnection support
   - Ensure frontend hooks are properly connected to real endpoints and responses
   - Verify multi-tab coordination prevents duplicate requests
   - Add UI components to display all progress fields (phases, entities, relationships, errors)

### Non-Functional Requirements

- **Performance**: <200ms response time for 95% of requests, <30ms for 304 responses
- **Scalability**: Support concurrent connections from thousands of users polling same investigation
- **Reliability**: 99.9% uptime for /progress and /events endpoints
- **Security**: All responses respect user permissions, no data leakage between users
- **Compliance**: Audit trail of all investigation updates via investigation_audit_log table
