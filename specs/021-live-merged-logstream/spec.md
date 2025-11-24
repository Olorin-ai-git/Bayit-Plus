# Feature Specification: Live Merged Investigation Logstream

**Feature Branch**: `021-live-merged-logstream`
**Created**: 2025-11-12
**Status**: Draft
**Input**: User description: "Live merged logstream for investigation logs - Correlates and streams live logs from frontend and backend systems for a specific investigation_id, with SSE streaming, polling fallback, and React UI component for real-time rendering, filtering, and search."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Live Merged Logs During Investigation (Priority: P1)

As an investigator, I need to see live logs from both frontend and backend systems merged in real-time during an active investigation, so I can monitor system behavior and debug issues as they happen.

**Why this priority**: This is the core value proposition of the feature - real-time visibility into both frontend and backend logs correlated by investigation ID. Without this, users cannot effectively monitor or debug investigations.

**Independent Test**: Can be fully tested by starting an investigation, opening the log viewer, and verifying that logs from both frontend and backend appear in chronological order within 2 seconds of emission. Delivers immediate value by providing unified log visibility.

**Acceptance Scenarios**:

1. **Given** an active investigation with ID "INV-123", **When** I navigate to the investigation logs view, **Then** I see a live stream of merged logs from both frontend and backend systems
2. **Given** I am viewing live logs, **When** a new log entry is emitted from either frontend or backend, **Then** the entry appears in the stream within 2 seconds
3. **Given** I am viewing live logs, **When** logs are emitted with the same timestamp from both systems, **Then** they are merged and ordered correctly with clock-skew tolerance of 5-10 seconds
4. **Given** I am viewing live logs, **When** the same log entry is emitted multiple times, **Then** duplicates are automatically deduplicated and shown only once

---

### User Story 2 - Filter and Search Logs in Real-Time (Priority: P2)

As an investigator, I need to filter logs by level (DEBUG, INFO, WARN, ERROR) and search by text, so I can focus on relevant information and quickly find specific events during an investigation.

**Why this priority**: Once users can see logs, they need to filter through the noise to find relevant information. This significantly improves usability but is not required for the MVP.

**Independent Test**: Can be tested independently by opening a log stream, applying level filters (show only ERROR logs), and verifying that only matching entries are displayed. Search functionality can be tested by entering text and confirming results match.

**Acceptance Scenarios**:

1. **Given** I am viewing a live log stream, **When** I select "ERROR" level filter, **Then** only ERROR level logs are displayed from both frontend and backend
2. **Given** I am viewing filtered logs, **When** I enter search text "network_analysis", **Then** only logs containing that text are displayed
3. **Given** I have active filters, **When** new logs arrive that don't match the filter, **Then** they are hidden but the stream continues to update with matching logs
4. **Given** I am searching logs, **When** I clear the search, **Then** all logs matching the current level filter are displayed again

---

### User Story 3 - Pause, Resume, and Control Log Stream (Priority: P2)

As an investigator, I need to pause the live log stream to examine specific entries closely, resume streaming when ready, and control autoscroll behavior, so I can analyze logs without losing my place.

**Why this priority**: Essential for usability when analyzing specific log sequences, but not required for basic log viewing functionality.

**Independent Test**: Can be tested by opening a log stream, clicking pause, verifying no new logs appear but the connection remains active, then clicking resume and verifying logs update again.

**Acceptance Scenarios**:

1. **Given** I am viewing a live log stream, **When** I click the pause button, **Then** the stream stops updating visually but continues buffering new logs in the background
2. **Given** the stream is paused, **When** I click resume, **Then** all buffered logs appear and the stream continues updating
3. **Given** autoscroll is enabled, **When** new logs arrive, **Then** the view automatically scrolls to show the latest entry
4. **Given** autoscroll is enabled, **When** I scroll up to examine older logs, **Then** autoscroll is automatically disabled
5. **Given** I have scrolled up, **When** I scroll back to the bottom, **Then** autoscroll is re-enabled

---

### User Story 4 - Recover from Connection Failures (Priority: P1)

As an investigator, I need the log stream to automatically recover from network interruptions using SSE's Last-Event-ID mechanism and fall back to polling if SSE fails, so I don't lose log visibility during network issues.

**Why this priority**: Critical for production reliability. Without this, users lose log visibility during network blips, which is unacceptable for debugging production issues.

**Independent Test**: Can be tested by simulating network interruption (pause backend, wait 5 seconds, resume) and verifying that logs resume from the correct position using Last-Event-ID without gaps or duplicates.

**Acceptance Scenarios**:

1. **Given** I am viewing a live SSE stream, **When** the network connection is interrupted briefly, **Then** the stream automatically reconnects using Last-Event-ID and resumes from the last received event
2. **Given** SSE connection fails multiple times, **When** the failure threshold is exceeded, **Then** the client automatically falls back to polling mode
3. **Given** I am in polling fallback mode, **When** logs are requested, **Then** I receive updates using cursor-based pagination with proper ETag handling for 304 responses
4. **Given** the stream has recovered, **When** I check the logs, **Then** there are no gaps or duplicate entries

---

### User Story 5 - View Historical Logs on Page Load (Priority: P2)

As an investigator, when I load the investigation page or refresh the browser, I need to see recent historical logs immediately and then have the live stream resume, so I have context before new logs arrive.

**Why this priority**: Important for usability and context, but the live streaming itself is more critical for MVP.

**Independent Test**: Can be tested by opening an investigation with existing logs, verifying that historical logs load immediately, then confirming that new logs stream in real-time after the initial backfill.

**Acceptance Scenarios**:

1. **Given** an investigation has existing logs, **When** I navigate to the investigation logs view, **Then** the most recent logs are fetched and displayed immediately via the polling API
2. **Given** historical logs have loaded, **When** the initial backfill completes, **Then** the SSE stream starts and begins showing new logs
3. **Given** I refresh the page while viewing logs, **When** the page reloads, **Then** I see the latest historical logs and the stream resumes from the correct position
4. **Given** I am viewing historical logs, **When** the view is ready, **Then** autoscroll is enabled and I see the most recent entries

---

### User Story 6 - Copy and Export Log Data (Priority: P3)

As an investigator, I need to copy individual log entries as JSON or export a set of logs, so I can share findings with team members or include them in reports.

**Why this priority**: Nice-to-have feature that enhances collaboration but is not essential for core functionality.

**Independent Test**: Can be tested by selecting a log entry, clicking copy JSON, and verifying the clipboard contains the complete log record in valid JSON format.

**Acceptance Scenarios**:

1. **Given** I am viewing logs, **When** I click the "Copy JSON" button on a log entry, **Then** the complete log record is copied to my clipboard in valid JSON format
2. **Given** I have filtered logs, **When** I click "Export visible logs", **Then** all currently visible logs are downloaded as a JSON file
3. **Given** I have copied a log entry, **When** I paste it into a text editor, **Then** all fields including context, timestamp, source, and message are included

---

### Edge Cases

- **Network instability**: What happens when the SSE connection experiences frequent disconnects (every 10-30 seconds)? The system uses exponential backoff with Last-Event-ID to prevent hammering the server and falls back to polling if SSE is consistently unstable.

- **Clock skew between systems**: How does the system handle logs when frontend and backend clocks are out of sync by 30+ seconds? The merger applies a configurable skew window (5-10s default) and uses monotonic sequence numbers to maintain order within the window.

- **High volume log bursts**: What happens when 1000+ logs are emitted in 1 second from both systems? The aggregator implements backpressure management with bounded buffers, dropping oldest logs with metrics if client is too slow, and sends heartbeats to keep connection alive.

- **Browser tab backgrounding**: How does the system behave when the browser tab is backgrounded for 10+ minutes? The SSE connection may be paused by the browser; on tab focus, the client reconnects using Last-Event-ID to catch up on missed events.

- **Concurrent investigations**: What happens when a user is viewing logs for multiple investigations simultaneously in different tabs? Each tab maintains its own SSE connection filtered by investigation_id; the backend enforces rate limits per investigation and per user.

- **PII in log messages**: How are logs sanitized when they contain personally identifiable information? The backend applies configurable PII redaction rules server-side before streaming, with audit logging of redacted content.

- **Log level filtering at scale**: What happens when applying INFO filter to a stream with 90% DEBUG logs? Filtering is performed server-side via query parameter (minLevel=INFO) to reduce bandwidth and client-side for immediate UI response.

- **Duplicate detection edge cases**: How are duplicates detected when the same message is logged with slightly different timestamps or context? The system uses event_id if available, otherwise generates sha1(message+ts+source) for deduplication with exact match within the skew window.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST merge logs from both frontend and backend providers correlated by investigation_id
- **FR-002**: System MUST stream logs via Server-Sent Events (SSE) as the primary transport mechanism
- **FR-003**: System MUST support cursor-based polling as a fallback when SSE is unavailable or fails
- **FR-004**: System MUST order merged logs by timestamp and sequence number with clock-skew tolerance of 5-10 seconds
- **FR-005**: System MUST deduplicate log entries using event_id or hash of (message+ts+source)
- **FR-006**: System MUST support resuming streams after disconnect using SSE's Last-Event-ID mechanism
- **FR-007**: System MUST emit heartbeat events every 10 seconds to keep SSE connections alive
- **FR-008**: System MUST apply server-side PII redaction before streaming logs
- **FR-009**: System MUST filter logs by minimum level (DEBUG, INFO, WARN, ERROR) via query parameter
- **FR-010**: System MUST enforce authentication via bearer token scoped to investigation:{id}:read
- **FR-011**: System MUST rate limit requests per user and per investigation
- **FR-012**: Frontend MUST display logs in a virtualized scrolling list for performance with large datasets
- **FR-013**: Frontend MUST support pause/resume controls that buffer logs during pause and flush on resume
- **FR-014**: Frontend MUST support autoscroll toggle that auto-disables when user scrolls up
- **FR-015**: Frontend MUST support client-side free-text search across visible logs
- **FR-016**: Frontend MUST support filtering by log level with real-time updates
- **FR-017**: Frontend MUST backfill historical logs on page load before starting live stream
- **FR-018**: Frontend MUST handle SSE errors by automatically falling back to polling mode
- **FR-019**: System MUST accept POST requests to /client-logs for browser log ingestion in local dev mode
- **FR-020**: System MUST propagate investigation_id via X-Investigation-Id header to backend logs
- **FR-021**: System MUST implement /health endpoint that verifies both log providers are reachable
- **FR-022**: System MUST handle backpressure by capping buffers and dropping oldest logs with metrics
- **FR-023**: System MUST support ETag-based conditional requests for polling endpoint to return 304 when no new logs
- **FR-024**: System MUST assign monotonic sequence numbers to logs that lack them
- **FR-025**: Frontend MUST allow copying individual log entries as JSON to clipboard

### Key Entities *(include if feature involves data)*

- **UnifiedLog**: A normalized log record with fields event_id (string), ts (ISO 8601 timestamp), seq (integer), source (frontend|backend), service (string), level (DEBUG|INFO|WARN|ERROR), investigation_id (string), correlation_id (optional string), message (string), context (object), schema_version (integer). Represents a single log entry from either frontend or backend, normalized for unified display and processing.

- **LogProvider**: An interface for fetching and streaming logs from a specific source. Has methods fetch(params) returning paginated log items with cursor, and stream(params) returning an AsyncIterable of UnifiedLog. Represents the abstraction layer between different logging backends (local dev, Sentry, Datadog, ELK, CloudWatch).

- **LogAggregator**: Service that merges streams from multiple LogProviders, deduplicates, orders by timestamp, and emits unified stream. Maintains in-memory buffers, manages clock skew window, assigns sequence numbers, and generates heartbeats. Represents the core business logic for log merging and streaming.

- **SSEConnection**: Represents an active Server-Sent Events connection to a client, tracking Last-Event-ID for resume capability, handling heartbeats, and managing connection lifecycle. Includes backpressure management and error handling.

- **Investigation**: Entity representing an investigation context with investigation_id as primary identifier. Logs are correlated to investigations via this ID, enabling filtering and isolation of log streams.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view merged logs from frontend and backend within 2 seconds of navigating to investigation logs view
- **SC-002**: New log entries appear in the stream within 2 seconds of emission from either frontend or backend
- **SC-003**: SSE connections automatically recover from network interruptions within 5 seconds using Last-Event-ID without data loss
- **SC-004**: System successfully falls back to polling mode when SSE fails after 3 consecutive connection errors
- **SC-005**: No duplicate log entries appear in the stream (99.9% deduplication accuracy)
- **SC-006**: Log ordering is maintained with no more than 0.1% out-of-order entries within the clock-skew window
- **SC-007**: The virtualized log viewer maintains 60fps scrolling performance with 10,000+ log entries loaded
- **SC-008**: Filter and search operations return results within 100ms for datasets up to 10,000 entries
- **SC-009**: System handles 1000+ concurrent SSE connections per backend instance without degradation
- **SC-010**: PII redaction rules are applied to 100% of logs before streaming with audit trail
- **SC-011**: Backend API responds to /health checks in under 200ms with valid provider status
- **SC-012**: 95% of users successfully view live logs on first attempt without errors
- **SC-013**: Average time to identify and debug investigation issues is reduced by 40% compared to viewing separate logs
- **SC-014**: Support tickets related to "can't see logs" or "logs not updating" are reduced by 60%
- **SC-015**: System maintains log stream availability of 99.9% during normal operation
