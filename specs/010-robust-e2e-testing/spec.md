# Feature Specification: Robust End-to-End Testing for Investigation Platform

**Feature Branch**: `001-robust-e2e-testing`
**Created**: 2025-11-04
**Status**: Draft
**Input**: User description: "Build production-grade Playwright E2E test suite validating investigation creation, server lifecycle logging, API consistency, UI parity, and resilience patterns."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Execute Full Investigation Lifecycle via UI (Priority: P1)

As a QA engineer, I need to trigger an investigation through the real UI at `/investigation/settings` and capture its `investigationId` so that I can validate the end-to-end flow without mocks or shortcuts.

**Why this priority**: This is the foundational test that validates the core product flow. Without a working investigation, all subsequent validations are meaningless. This is the critical user journey.

**Independent Test**: Can be tested by navigating to the wizard, submitting settings, extracting the investigation ID, and verifying the UI indicates success. Delivers immediate value by proving the UI → backend integration works.

**Acceptance Scenarios**:

1. **Given** user navigates to `http://localhost:3000/investigation/settings`, **When** they fill in the investigation form (entities, timeRange, tools, settings), **Then** clicking "Start Investigation" submits the form without errors.
2. **Given** a successful form submission, **When** the backend processes the request, **Then** a success toast appears with investigation details or a redirect occurs with the ID in the URL.
3. **Given** an `investigationId` is captured from the response, **When** fetching `GET /investigations/{id}`, **Then** the response includes a valid snapshot with `version`, `ETag`/`Last-Modified` headers, and metadata.

---

### User Story 2 - Validate Server-Side Lifecycle Logging (Priority: P1)

As a test engineer, I need to verify that the backend logs the correct sequence of events during investigation execution (creation, agent initialization, tool usage, LLM calls, snapshot persistence, completion) so that I can assert the investigation follows the designed lifecycle.

**Why this priority**: Server logs are the source of truth for investigation behavior. This validates that agents, tools, and LLM calls execute in the correct order with proper instrumentation. Critical for production confidence.

**Independent Test**: Can be tested by fetching server logs via HTTP endpoint or shell command, parsing structured logs, and asserting the presence and order of key events. Does not depend on UI state.

**Acceptance Scenarios**:

1. **Given** an investigation has been created, **When** fetching logs via `GET /admin/logs?investigationId={id}` or `GET /investigations/{id}/logs`, **Then** logs are returned in JSON or JSONL format with timestamps and sequence numbers.
2. **Given** server logs are available, **When** parsing them, **Then** the sequence includes: `investigation_created` → `agents_initialized` → `tools_configured` → agent executions → `investigation_completed`.
3. **Given** agent execution logs, **When** examining timestamps and sequence numbers, **Then** they are strictly monotonic (no decreasing timestamps, no duplicate sequence numbers).
4. **Given** LLM usage logs, **When** extracting model name, token counts, and latency, **Then** all fields are present and valid.

---

### User Story 3 - Verify Progress API Returns Monotonic State (Priority: P1)

As a test engineer, I need to poll `GET /investigations/{id}/progress` and verify that `completion_percent` strictly increases (or plateaus) and stage transitions follow the canonical path (created → in_progress → completed) so that I can ensure the UI can rely on this API for progress display.

**Why this priority**: The progress API is the UI's primary source of truth for progress updates. Monotonic state is essential for correct rendering and avoiding UI flicker/regression. Critical for UX reliability.

**Independent Test**: Can be tested by polling the progress API at intervals and asserting that metrics only increase and never decrease. Does not require server logs or events API.

**Acceptance Scenarios**:

1. **Given** an active investigation, **When** polling `GET /investigations/{id}/progress` every 500ms, **Then** `completion_percent` either stays the same or increases (never decreases).
2. **Given** progress responses over time, **When** tracking stage transitions, **Then** they follow: `created` → `in_progress` → `completed` with no skips or backtracking.
3. **Given** a completed investigation, **When** calling progress one final time, **Then** `status` is `completed` and `completion_percent` is 100 (or close to it, allowing rounding).

---

### User Story 4 - Verify Events API Returns Append-Only Feed (Priority: P1)

As a test engineer, I need to poll `GET /investigations/{id}/events?since={cursor}&limit=n` and verify that each response contains unique event IDs, ordered by `(timestamp, sequence)`, with no gaps or duplicates so that I can ensure the event feed is a reliable audit log.

**Why this priority**: The events API is the authoritative feed for investigation state changes. Append-only guarantees enable consistent snapshots and prevent loss of data. Essential for audit trails and replay debugging.

**Independent Test**: Can be tested by making sequential requests with cursors and validating event ordering and uniqueness. Does not require UI or server logs.

**Acceptance Scenarios**:

1. **Given** an investigation is progressing, **When** calling `GET /investigations/{id}/events?since=0&limit=50`, **Then** the response includes `items[]`, `next_cursor`, and `server_time`.
2. **Given** event items in the response, **When** checking `event_id` uniqueness across multiple calls, **Then** no `event_id` appears twice.
3. **Given** events ordered by `(timestamp, sequence)`, **When** validating monotonicity, **Then** all pairs satisfy `(ts_i, seq_i) < (ts_{i+1}, seq_{i+1})` with strict ordering.
4. **Given** multiple calls with cursors, **When** comparing results, **Then** new events only appear in later calls (append-only guarantee).

---

### User Story 5 - Verify Snapshot Versioning and Updates (Priority: P2)

As a test engineer, I need to fetch `GET /investigations/{id}` at two points in time and verify that the `version` (or `Last-Modified` header) advances after new events are recorded so that I can assert snapshots are immutable when no changes occur and properly updated when changes happen.

**Why this priority**: Snapshot versioning prevents inconsistent reads and enables optimistic concurrency. Important for correctness but not as critical as the event feed itself. Supports higher-level consistency checks.

**Independent Test**: Can be tested by calling the snapshot API twice with a delay and comparing version headers. Does not require UI interaction beyond initial investigation creation.

**Acceptance Scenarios**:

1. **Given** an investigation snapshot at time T1, **When** fetching `GET /investigations/{id}`, **Then** the response includes a `version` field or `Last-Modified`/`ETag` headers.
2. **Given** a snapshot with an `ETag` header, **When** fetching again with `If-None-Match: {ETag}` and no new events have occurred, **Then** the response is `304 Not Modified`.
3. **Given** new events recorded after T1, **When** fetching the snapshot again, **Then** the `version` is newer than at T1 (or `Last-Modified` is later).

---

### User Story 6 - Verify UI Reflects Backend State (Priority: P2)

As a QA engineer, I need to cross-check the wizard UI (stepper, progress bar, activity feed, findings badges) against the `/progress` and latest events APIs so that I can ensure the UI is rendering consistent, up-to-date information.

**Why this priority**: User-facing consistency ensures users see accurate progress and findings. High importance but dependent on other APIs working correctly. Validates the integration layer.

**Independent Test**: Can be tested by starting an investigation and comparing UI elements against API responses at various points. Does not require server logs.

**Acceptance Scenarios**:

1. **Given** the wizard is visible and an investigation is in progress, **When** checking the stepper component, **Then** the current step matches `/progress.stage` (e.g., "in_progress").
2. **Given** a progress bar on the UI, **When** comparing its percentage to `/progress.completion_percent`, **Then** they match (allowing ±5% for rounding).
3. **Given** an activity timeline/feed in the UI, **When** fetching the latest events from `/events`, **Then** the feed includes descriptions matching recent events.
4. **Given** investigation findings displayed in the UI, **When** comparing counts and severity to the latest snapshot, **Then** they match.

---

### User Story 7 - Verify UI Rehydration After Hard Refresh (Priority: P2)

As a QA engineer, I need to hard-refresh the page mid-investigation and verify that the snapshot loads quickly and delta events are applied so that I can ensure users can recover state after a browser crash or refresh.

**Why this priority**: Rehydration is essential for user resilience but less critical than the initial flow. High value for a production system but secondary to core functionality.

**Independent Test**: Can be tested by triggering a page reload at a known point and validating that the UI recovers state and continues polling. Can be done in a controlled test environment.

**Acceptance Scenarios**:

1. **Given** an investigation is running and user hard-refreshes the browser (F5), **When** the page reloads, **Then** the snapshot is fetched and rendered quickly (within 2 seconds).
2. **Given** a reloaded page, **When** polling `/events` with a cursor from the last known event, **Then** the UI applies new events as they arrive (delta catch-up).
3. **Given** a rehydrated UI, **When** comparing it to the state before refresh, **Then** all state is consistent (no data loss).

---

### User Story 8 - Handle Rate Limits and Network Errors Gracefully (Priority: P3)

As a test engineer, I need to inject transient failures (429 Too Many Requests, network timeouts) and verify that the client implements exponential backoff and eventual recovery so that I can assert resilience in adverse conditions.

**Why this priority**: Resilience is important but less critical than core functionality. Validates robustness for production but can be addressed in a subsequent phase if needed.

**Independent Test**: Can be tested by intercepting HTTP requests and injecting specific error responses, then validating recovery behavior. Fully controllable in a test environment.

**Acceptance Scenarios**:

1. **Given** the client is polling `/events` and a 429 response is injected once, **When** the client receives the 429, **Then** it backs off with exponential delay and retries after the delay.
2. **Given** a backoff in progress, **When** the retry eventually succeeds, **Then** the UI continues as if nothing happened (idempotent).
3. **Given** multiple transient failures, **When** the client implements jitter, **Then** retry intervals are randomized to avoid thundering herd.

---

### User Story 9 - Assert Idempotent Rendering When No New Events (Priority: P3)

As a test engineer, I need to verify that when `/events` returns no new items, the UI does not re-render or flicker so that I can ensure polling does not cause unnecessary DOM churn.

**Why this priority**: Idempotent rendering is a nice-to-have optimization that prevents flickering and improves perceived responsiveness. Important for UX polish but not critical.

**Independent Test**: Can be tested by mocking `/events` to return no new items and checking that the rendered UI does not change (using visual regression or DOM diffing).

**Acceptance Scenarios**:

1. **Given** a stable investigation state with no new events, **When** polling `/events` multiple times, **Then** no new DOM elements are added or removed.
2. **Given** repeated polling with identical event data, **When** checking React/component re-render counts, **Then** re-renders only occur when new data actually arrives.

---

### Edge Cases

- What happens if the wizard form is submitted with invalid data? System should show validation errors without creating an investigation.
- How does the system handle a missing or invalid `investigationId` in the URL or API response? Tests should gracefully skip dependent assertions.
- What if the backend is slow and `/progress` or `/events` takes >30 seconds to return? Tests should have reasonable timeouts (e.g., 120s total) and skip if resources are unavailable.
- What if server logs are unavailable (neither HTTP endpoint nor shell command works)? Tests should skip log assertions with a clear annotation and continue with API/UI validation.
- What if ETag is not supported? Tests should gracefully skip ETag assertions and continue with version field validation.
- What if the UI wizard does not have `data-testid` attributes? Tests should fall back to semantic selectors (e.g., `role="button"`, `text="Start Investigation"`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST trigger an investigation via a wizard at `/investigation/settings` and return an `investigationId` in the response or URL.
- **FR-002**: Backend MUST log investigation lifecycle events (`investigation_created`, `agents_initialized`, `tools_configured`, `agent_execution:started/finished`, `llm_usage`, `tools_usage`, `snapshot_persisted`, `investigation_completed`, `investigation_result`) in strict order with non-decreasing timestamps.
- **FR-003**: Backend MUST provide `GET /investigations/{id}/progress` API returning `{ stage, status, completion_percent, updated_at }` with monotonically increasing `completion_percent`.
- **FR-004**: Backend MUST provide `GET /investigations/{id}/events?since={cursor}&limit=n` API returning `{ items[], next_cursor, server_time }` with append-only, uniquely ordered events by `(timestamp, sequence)`.
- **FR-005**: Backend MUST persist investigation snapshots via `GET /investigations/{id}` with `version` or `Last-Modified`/`ETag` headers.
- **FR-006**: Frontend wizard MUST display current stage, progress percentage, activity timeline, and findings that reflect `/progress` and `/events` APIs.
- **FR-007**: Frontend MUST handle hard page refresh mid-investigation by rehydrating snapshot and polling for delta events.
- **FR-008**: Client code MUST implement exponential backoff with jitter when receiving 429 or transient errors from API.
- **FR-009**: Server logs MUST be accessible via `GET /admin/logs?investigationId={id}`, `GET /investigations/{id}/logs`, or shell command (configurable via `LOG_FETCH_CMD` env).
- **FR-010**: All timestamps in logs and events MUST be ISO 8601 formatted; all sequence numbers MUST be unique and monotonic within an investigation.

### Key Entities *(include if feature involves data)*

- **Investigation**: Represents a single fraud investigation with `id`, `status` (created, in_progress, completed), `completion_percent`, stage, and findings. Immutable once created; updated via events.
- **Event**: Represents a state change with `event_id`, `timestamp`, `sequence`, `type` (e.g., agent_execution:started), `data` (contextual info), and investigation `id`.
- **Progress**: Real-time snapshot of investigation advancement with `stage`, `status`, `completion_percent`, and `updated_at`. Derived from event stream.
- **ServerLog**: Structured log entry with `timestamp`, `sequence`, `investigation_id`, `event_type`, `severity`, and `data` (including agent name, tool name, LLM model, etc.).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: E2E test suite triggers at least 5 independent investigations in sequence without failures (flake rate < 2% over 50 CI runs).
- **SC-002**: All 50+ assertions across test suites pass consistently: event ordering, monotonic progress, UI parity, snapshot versioning, log sequences.
- **SC-003**: Investigation progresses from `created` to `completed` within 120 seconds (TIME_BUDGET_MS default) in local dev environment.
- **SC-004**: Server logs show complete lifecycle with agent execution, tool usage, and LLM calls logged and ordered correctly (100% of expected events present).
- **SC-005**: `/events` API returns all unique events in strict (timestamp, sequence) order with no gaps or duplicates (100% data integrity).
- **SC-006**: Wizard UI updates (progress bar, stepper, activity feed) within 2 seconds of events appearing in `/events` API (latency ≤ 2s).
- **SC-007**: Hard page refresh recovery completes within 5 seconds and applies all delta events without data loss.
- **SC-008**: Exponential backoff on 429 errors completes recovery within 10 seconds without user intervention.
- **SC-009**: Artifacts (traces, videos, logs) are captured on test failure and saved to `test-results/` for debugging.
- **SC-010**: Test suite runs successfully with custom `FRONTEND_BASE_URL`, `BACKEND_BASE_URL`, and `LOG_FETCH_CMD` environment variables (no hardcoded URLs).

### Test Execution Requirements

- **TR-001**: All tests MUST be runnable via `npx playwright test e2e/investigations --project=chromium` with proper env var defaults.
- **TR-002**: README.md MUST document exact CLI commands for local development and CI/CD environments.
- **TR-003**: Playwright config MUST include `retries=1`, HTML+JUnit reporters, trace/video capture on first retry.
- **TR-004**: Tests MUST use Playwright's built-in `waitForEvent`, `waitForNavigation`, `waitForFunction` to avoid flakiness (no arbitrary sleeps).
- **TR-005**: All API calls MUST respect env vars: `FRONTEND_BASE_URL`, `BACKEND_BASE_URL`, defaulting to `http://localhost:3000` and `http://localhost:8090` respectively.
- **TR-006**: Time budgets (e.g., 120s for investigation completion) MUST be configurable via `TIME_BUDGET_MS` env var.

### Production Readiness

- **PR-001**: Test suite MUST support local dev, staging, and production environments via env vars (no environment hardcoding in test code).
- **PR-002**: Tests MUST NOT rely on mocks or test fixtures; all data must flow from real product code.
- **PR-003**: Server log assertions MUST gracefully skip if logs are unavailable, with a clear test annotation explaining why.
- **PR-004**: All test artifacts (logs, videos, traces) MUST be timestamped and associated with the investigation ID for easy correlation.

## Implementation Plan Overview

### Phase 1: Foundation (Test Utilities & Config)
- Create `e2e/utils/api.ts` with `getAuthHeaders`, `getSnapshot`, `getProgress`, `getEvents`, polling helpers.
- Create `e2e/utils/logs.ts` with log fetching (HTTP + shell fallback) and parsing.
- Create `e2e/utils/assertions.ts` with invariant checks (event ordering, monotonicity, counts).
- Create `e2e/utils/ids.ts` with `investigationId` extraction helpers.
- Update `playwright.config.ts` with base URL config, retries, reporters, env vars.

### Phase 2: Core Tests
- `trigger-investigation.spec.ts`: Navigate to wizard, submit form, extract ID.
- `verify-progress-and-events.spec.ts`: Poll `/progress` and `/events`, validate monotonicity and ordering.
- `verify-ui-reflects-backend.spec.ts`: Compare wizard UI to API responses.

### Phase 3: Advanced Tests
- `refresh-rehydrate.spec.ts`: Hard refresh mid-investigation, validate recovery.
- `negative-and-resilience.spec.ts`: Inject 429, test backoff, verify idempotent rendering.

### Phase 4: Documentation
- Create `e2e/README.md` with setup, run commands, env vars, and troubleshooting.

## Known Assumptions & Unknowns

### Assumptions

1. **Backend APIs exist**: `/investigations/{id}`, `/investigations/{id}/progress`, `/investigations/{id}/events` are implemented and available.
2. **Server logs available**: Either via HTTP endpoint (`/admin/logs` or `/investigations/{id}/logs`) or shell command (e.g., `docker logs`).
3. **Investigation completes within 120s**: In local dev, a full investigation cycles to `completed` in ≤120s (configurable).
4. **Wizard form has data-testid**: UI selectors like `data-testid="wizard-submit"` are present or fall back to semantic selectors.
5. **No authentication required**: Local dev defaults to anonymous auth; production may require bearer tokens (abstracted in `getAuthHeaders()`).

### Unknowns & Clarifications Needed

- **NEEDS CLARIFICATION**: What is the exact API response structure for `/investigations/{id}`? (e.g., does it include all events, or just the latest snapshot?)
- **NEEDS CLARIFICATION**: Does the backend support ETags/If-None-Match for `/investigations/{id}` or only Last-Modified?
- **NEEDS CLARIFICATION**: What are the canonical stage values? (e.g., `created`, `in_progress`, `completed`, or something else?)
- **NEEDS CLARIFICATION**: Are server logs available via HTTP endpoints, shell commands, or both? What is the exact format (JSON, JSONL, plain text)?
- **NEEDS CLARIFICATION**: How does the wizard capture and display `investigationId`? (URL param, query string, toast, modal?)
- **NEEDS CLARIFICATION**: What is the expected completion time for a typical investigation in dev/staging/production?

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Server logs unavailable | Medium | High | Implement HTTP endpoint + shell fallback; skip log assertions gracefully with annotation |
| Flaky timing (slow backend) | Medium | High | Increase `TIME_BUDGET_MS` in CI; use Playwright waits instead of sleeps |
| Missing UI selectors | Low | Medium | Add `data-testid` attributes to wizard components; use semantic selectors as fallback |
| Network timeouts in CI | Low | Medium | Implement exponential backoff; retry transient failures up to 2 times |
| State leakage between tests | Low | Medium | Use unique `investigationId` per test; clean up via API if possible, or accept some state |
| Incompatible API response format | Low | High | Validate API response structure early; adjust assertions if format differs |

## Testing Strategy

### Test Scope

- **In Scope**: Full investigation lifecycle (creation → completion), server logs, progress API, events API, UI parity, snapshot versioning, resilience/backoff.
- **Out of Scope**: Performance profiling, load testing (>1 concurrent investigation), auth flows (beyond simple bearer token), database integrity (rely on backend tests).

### Test Matrix

| Test File | Trigger | Wizard | Progress API | Events API | Logs | UI Parity | Snapshot | Refresh | Resilience |
|-----------|---------|--------|--------------|-----------|------|-----------|----------|---------|------------|
| trigger-investigation.spec.ts | ✓ | ✓ | - | - | - | - | - | - | - |
| verify-progress-and-events.spec.ts | ✓ | - | ✓ | ✓ | - | - | - | - | - |
| verify-ui-reflects-backend.spec.ts | ✓ | ✓ | ✓ | ✓ | - | ✓ | - | - | - |
| verify-snapshot-versioning.spec.ts | ✓ | - | - | - | - | - | ✓ | - | - |
| refresh-rehydrate.spec.ts | ✓ | ✓ | - | ✓ | - | ✓ | ✓ | ✓ | - |
| negative-and-resilience.spec.ts | ✓ | - | ✓ | ✓ | - | - | - | - | ✓ |
| logs-validation.spec.ts | ✓ | - | - | - | ✓ | - | - | - | - |

### Pass/Fail Criteria

**Pass**: All assertions in a test must succeed. If any assertion fails, the entire test fails. Retries (max 1) are automatic; if retry also fails, the test is marked as failed.

**Fail**: Any of the following constitute a test failure:
- Assertion error (event ordering, API response mismatch, UI element not found, log sequence broken).
- Timeout (investigation doesn't complete within TIME_BUDGET_MS, API doesn't respond within 30s).
- Network error (backend unreachable, invalid response format).
- Missing resource (server logs unavailable, wizard not at expected path).

**Skip**: Tests may be skipped (with annotation) if:
- Server logs are unavailable and no LOG_FETCH_CMD is configured.
- Backend APIs are not discoverable (404 on expected paths).
- UI elements missing but semantic selectors work as fallback.

## Next Steps

1. **Clarify unknowns** with product/backend teams (API structure, log format, stage values, completion time SLAs).
2. **Implement Phase 1** utilities and config.
3. **Run Phase 2** core tests locally to validate approach.
4. **Iterate** based on real API responses and observed behavior.
5. **Document** environment setup and troubleshooting in README.
6. **Integrate** into CI/CD pipeline with env var configuration.

