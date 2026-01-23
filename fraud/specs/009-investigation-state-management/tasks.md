# Tasks: Investigation State Management - Event-Sourced Architecture with Cursor-Based Polling

**Input**: Design documents from `/specs/001-investigation-state-management/`
**Prerequisites**: plan.md (✅), data-model.md (✅), research.md (✅), contracts/cursor-events.md (✅), quickstart.md (✅)
**Branch**: `001-investigation-state-management` | **Date**: 2025-11-04

**Organization**: Tasks organized by user story (US1-US7) to enable independent implementation and testing. All design phase (research, planning, data modeling, contracts) is complete. Phase 2 begins backend implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US7)
- All paths are absolute or relative to repository root

---

## Phase 1: Setup & Infrastructure (Complete - Design Phase Finished)

**Purpose**: Design and architectural planning completed; implementation phase begins

✅ Research & architecture decisions complete (research.md)
✅ Data models and schemas defined (data-model.md)
✅ API contracts specified (contracts/cursor-events.md)
✅ Test scenarios documented (quickstart.md)
✅ Implementation plan established (plan.md)

**No setup tasks required** - all planning artifacts complete. Move to Phase 2 foundational tasks.

---

## Phase 2: Foundational Infrastructure (Backend Core)

**Purpose**: Core backend infrastructure that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Models & Schemas

- [ ] T001 [P] Create event models in `olorin-server/app/schemas/event_models.py` with:
  - `Actor` model (type, user_id, service)
  - `InvestigationEvent` model (id, investigation_id, ts, actor, op, entity, payload)
  - `EventsFeedResponse` model (items, next_cursor, has_more, poll_after_seconds, etag)
  - `SummaryResponse` model (lightweight snapshot with current_phase, progress_percentage)
  - Reference: data-model.md sections 2.1, 4.1, 5.1 for exact field definitions

- [ ] T002 [P] Create cursor utility module in `olorin-server/app/utils/cursor_utils.py` with:
  - `parse_cursor(cursor: str) -> tuple[int, int]` function
  - `CursorGenerator` class with monotonic generation (timestamp_ms + sequence)
  - Complete implementations from data-model.md section 1.2-1.3
  - Include full type hints and docstrings

- [ ] T003 [P] Enhance Pydantic schemas in `olorin-server/app/schemas/investigation_state.py`:
  - Add `version` field for optimistic locking
  - Add `progress` field with progress_json structure
  - Add `etag` field for conditional requests
  - Maintain backward compatibility with existing fields
  - Reference data-model.md section 3.1 for snapshot structure

### Backend Services

- [ ] T004 Create `InvestigationProgressService` in `olorin-server/app/service/investigation_progress_service.py`:
  - Method `calculate_investigation_progress()` for weighted average calculation
  - Method `calculate_phase_progress()` for per-phase progress
  - Method `calculate_tool_progress()` for per-tool progress (queued/running/completed/failed)
  - Reference research.md section 9 for progress calculation algorithm
  - Return type: dict with current_phase, progress_percentage, phase_progress mapping
  - **File size constraint**: Must be <200 lines - focus only on progress calculation

- [ ] T005 Enhance `olorin-server/app/service/polling_service.py`:
  - Add `calculate_adaptive_interval(status: str, lifecycle_stage: str) -> int` method
  - Add `should_return_etag_304(current_version, client_etag) -> bool` method
  - Add `generate_etag(investigation_id: str, version: int) -> str` method
  - Reference research.md sections 4.1 and 8.2 for interval calculation and ETag logic
  - Enhance existing polling service without breaking existing functionality
  - **File size constraint**: Keep original file <200 lines after enhancements

### Backend Routers & Endpoints

- [ ] T006 [P] Create event models response schema update in `olorin-server/app/schemas/investigation_state.py`:
  - Update `InvestigationStateResponse` to include `version` and `etag` fields
  - Ensure all 200/304/409/429 response models include proper error details
  - Reference contracts/cursor-events.md for exact response format

- [ ] T007 Enhance `olorin-server/app/router/polling_router.py`:
  - Add support for `If-None-Match` header in GET requests
  - Return 304 Not Modified when ETag matches (no body)
  - Include `poll_after_seconds` hint in all responses
  - Include `X-RateLimit-*` headers in all responses
  - Reference contracts/cursor-events.md for request/response format
  - **File size constraint**: Keep <200 lines - may split into separate handler module if needed

### Backend Tests (TDD - Write Tests First)

- [ ] T008 [P] Unit test for cursor utilities in `olorin-server/test/unit/test_cursor_utils.py`:
  - Test `parse_cursor()` with valid format ("1730668800000_000127")
  - Test `parse_cursor()` with invalid formats (missing underscore, non-numeric)
  - Test `CursorGenerator` monotonic generation (timestamp then sequence increments)
  - Test cursor ordering guarantees (same timestamp → sequence increases)
  - Test cursor uniqueness across rapid calls
  - Target: 100% coverage of cursor_utils.py

- [ ] T009 [P] Unit test for progress calculation in `olorin-server/test/unit/test_investigation_progress_service.py`:
  - Test `calculate_investigation_progress()` with all phases at 0%
  - Test `calculate_investigation_progress()` with mixed phase percentages
  - Test `calculate_phase_progress()` with all tools completed
  - Test `calculate_tool_progress()` for each state (queued/running/completed/failed)
  - Test weighted average calculation correctness
  - Target: 100% coverage of investigation_progress_service.py

- [ ] T010 [P] Unit test for adaptive polling in `olorin-server/test/unit/test_polling_service_enhancements.py`:
  - Test `calculate_adaptive_interval()` when IN_PROGRESS (expects 2000-5000ms)
  - Test `calculate_adaptive_interval()` when idle >5min (expects 30000-120000ms)
  - Test `generate_etag()` produces consistent output for same version
  - Test `should_return_etag_304()` with matching and non-matching ETags
  - Target: 85%+ coverage of polling_service enhancements

- [ ] T011 [P] Integration test for event feed pagination in `olorin-server/test/integration/test_event_feed_pagination.py`:
  - Test cursor pagination with limit parameter
  - Test ordering guarantee (events always by timestamp ASC)
  - Test next_cursor points to correct position
  - Test has_more flag accuracy
  - Test large event set pagination across multiple requests
  - Reference quickstart.md test scenario 4 for exact test cases

**Checkpoint**: Foundation infrastructure complete. All backend models, schemas, services, and routers enhanced with cursor/ETag/progress capabilities.

---

## Phase 3: User Story 1 - Page Load Rehydration (Priority: P1) 🎯 MVP

**Goal**: When user navigates to investigation page, snapshot loads within 700ms and delta events apply automatically

**Independent Test**: `pytest test/integration/test_page_load_rehydration.py -v`

**Functional Requirements**: US1, Req 1.1, 1.2, 1.3, 1.4

### Implementation - Backend

- [ ] T012 [US1] Enhance `GET /api/v1/investigation-state/{investigation_id}` endpoint in `olorin-server/app/router/investigation_state_router.py`:
  - Return complete snapshot with version and etag fields
  - Include progress (current_phase, progress_percentage, phase_progress)
  - Support If-None-Match header for 304 responses
  - Performance target: <100ms P95 response time (excluding network)
  - Reference data-model.md section 3.1 for snapshot schema

- [ ] T013 [US1] Create new endpoint `GET /api/v1/investigations/{investigation_id}/events` in `olorin-server/app/router/investigation_stream_router.py`:
  - Accept query params: `since` (cursor, optional), `limit` (1-1000, default 100)
  - Return EventsFeedResponse with items[], next_cursor, has_more, poll_after_seconds, etag
  - Implement cursor pagination logic using existing investigation_audit_log table
  - Query optimization: fetch limit+1 to detect has_more efficiently
  - Performance target: <150ms P95 response time for 50 events
  - Complete implementation from contracts/cursor-events.md sections 1-2
  - **File size constraint**: Must be <200 lines - keep focused on route handler only

- [ ] T014 [US1] Implement cursor-based event conversion in `olorin-server/app/service/event_feed_service.py`:
  - Method `fetch_events_since(investigation_id, cursor, limit) -> EventsFeedResponse`
  - Convert investigation_audit_log entries to InvestigationEvent objects
  - Generate next_cursor from last event's timestamp and sequence
  - Handle cursor expiration (>30 days) with 400 Bad Request
  - Enforce authorization checks (user must have read access to investigation)
  - Reference data-model.md section 9.2 for audit_log to event mapping
  - **File size constraint**: Must be <200 lines

- [ ] T015 [US1] Add investigation state persistence check in `olorin-server/app/service/investigation_state_service.py`:
  - Verify snapshot exists and is accessible by current user
  - Return 404 if investigation not found or access denied
  - Include proper error messages and status codes
  - Maintain existing error handling patterns

### Implementation - Frontend

- [ ] T016 [P] [US1] Create `useInvestigationSnapshot` hook in `olorin-front/src/microservices/investigation/hooks/useInvestigationSnapshot.ts`:
  - Fetch snapshot from `GET /api/v1/investigation-state/{investigationId}`
  - Parse and return: { id, status, progress, version, updated_at }
  - Handle 404 Not Found and authorization errors
  - Performance target: resolve within 100ms
  - **File size constraint**: Must be <150 lines

- [ ] T017 [P] [US1] Create `useCursorStorage` hook in `olorin-front/src/microservices/investigation/hooks/useCursorStorage.ts`:
  - Get cursor from localStorage with key `inv:{investigationId}:cursor`
  - Save cursor to localStorage after events fetch
  - Return both current cursor and save method
  - Handle missing cursor gracefully (return null)
  - **File size constraint**: Must be <80 lines

- [ ] T018 [P] [US1] Create `useEventFetch` hook in `olorin-front/src/microservices/investigation/hooks/useEventFetch.ts`:
  - Fetch events from `GET /api/v1/investigations/{investigationId}/events?since={cursor}&limit=50`
  - Parse EventsFeedResponse: { items, next_cursor, has_more, poll_after_seconds }
  - Handle 400 Bad Request (expired cursor) - clear cursor and refetch
  - Return { events, nextCursor, hasMore, pollAfterSeconds }
  - **File size constraint**: Must be <150 lines

- [ ] T019 [US1] Enhance `ProgressPage.tsx` in `olorin-front/src/microservices/investigation/pages/ProgressPage.tsx`:
  - On page load: call useInvestigationSnapshot to get initial state
  - Display snapshot (status, progress percentage, current phase) within 100ms
  - Get cursor from useCursorStorage
  - Call useEventFetch to get delta events since cursor
  - Apply events to update UI state
  - Save new cursor to useCursorStorage
  - Handle loading and error states
  - Performance target: full rehydration <700ms P95 (excluding network)

### Tests - User Story 1

- [ ] T020 [P] [US1] Contract test for page load snapshot in `olorin-server/test/contract/test_investigation_state_snapshot.py`:
  - Test GET /api/v1/investigation-state/{id} returns 200 with complete snapshot
  - Test response includes version, updated_at, progress fields
  - Test snapshot structure matches InvestigationSnapshot schema from data-model.md
  - Test error response for non-existent investigation (404)
  - Reference quickstart.md Example 1 for request/response format

- [ ] T021 [P] [US1] Contract test for events feed in `olorin-server/test/contract/test_events_feed.py`:
  - Test GET /api/v1/investigations/{id}/events returns 200 with EventsFeedResponse
  - Test pagination: limit parameter works (1-1000 range)
  - Test cursor parameter: since filter returns only newer events
  - Test next_cursor points to correct position for pagination
  - Test has_more flag is accurate
  - Reference contracts/cursor-events.md for full API contract

- [ ] T022 [P] [US1] Integration test for page load rehydration in `olorin-server/test/integration/test_page_load_rehydration.py`:
  - Create test investigation with 10 events in audit log
  - Save cursor after event 5
  - Test: Fetch snapshot → assert status IN_PROGRESS
  - Test: Fetch events with saved cursor → assert events 6-10 returned
  - Test: Apply events to UI → assert updated state
  - Reference quickstart.md Test Scenario 1 for exact steps

- [ ] T023 [P] [US1] Frontend unit test for snapshot hook in `olorin-front/test/unit/useInvestigationSnapshot.test.ts`:
  - Mock fetch API
  - Test: Hook fetches snapshot successfully and returns parsed data
  - Test: Hook handles 404 Not Found error gracefully
  - Test: Hook handles network error gracefully
  - Test: Hook returns correct data structure { id, status, progress, version }

- [ ] T024 [P] [US1] Frontend unit test for cursor storage hook in `olorin-front/test/unit/useCursorStorage.test.ts`:
  - Mock localStorage
  - Test: Hook retrieves cursor from localStorage
  - Test: Hook saves cursor to localStorage with correct key
  - Test: Hook returns null if cursor doesn't exist
  - Test: Hook uses correct key format: `inv:{investigationId}:cursor`

- [ ] T025 [P] [US1] Frontend integration test for page rehydration in `olorin-front/test/integration/page-load-rehydration.test.ts`:
  - Mock API responses for snapshot and events endpoints
  - Test: Navigate to investigation page → snapshot displays within 100ms
  - Test: Events fetch succeeds → UI updates with new events
  - Test: Cursor persists to localStorage → next page load resumes from cursor
  - Test: Full rehydration flow from page load to interactive state

**Checkpoint**: User Story 1 complete. Investigation page loading, cursor storage, and event fetching fully functional.

---

## Phase 4: User Story 2 - Adaptive Polling with ETag Caching (Priority: P1) 🎯 MVP

**Goal**: Frontend polls intelligently based on status (5s when active, 60s when idle) with ETag caching reducing bandwidth by 80%

**Independent Test**: `pytest test/integration/test_adaptive_polling_flow.py -v && npm test test/integration/polling-flow.test.ts`

**Functional Requirements**: US3, Req 3.1, 3.2, 3.3, 3.4

### Implementation - Backend

- [ ] T026 [US2] Enhance event feed endpoint in `olorin-server/app/router/investigation_stream_router.py`:
  - Add ETag response header (W/"version-hash" format)
  - Check If-None-Match header in request
  - Return 304 Not Modified if ETag matches (empty body)
  - Include X-Recommended-Interval header with poll_after_seconds value
  - Performance target: 304 responses <30ms (headers only, no body)
  - Reference contracts/cursor-events.md sections 2-3 for exact header format

- [ ] T027 [US2] Implement ETag generation in `olorin-server/app/service/event_feed_service.py`:
  - Method `generate_etag_for_investigation(investigation_id: str, version: int) -> str`
  - Format: W/"version-hash" (include investigation_id + version in hash)
  - Consistent generation (same inputs → same ETag)
  - Reference research.md section 4.2 for ETag caching strategy

### Implementation - Frontend

- [ ] T028 [P] [US2] Create `useAdaptivePolling` hook in `olorin-front/src/microservices/investigation/hooks/useAdaptivePolling.ts`:
  - Accept investigationId, status (IN_PROGRESS/COMPLETED/etc), callback
  - Calculate poll interval based on status and lifecycle_stage
  - Default 5s when IN_PROGRESS, 30-60s when idle
  - Pause polling when document.hidden = true (tab background)
  - Resume polling when tab becomes visible again
  - Expose { pollInterval, startPolling, stopPolling } methods
  - Reference research.md section 4.1 for interval calculation logic
  - **File size constraint**: Must be <150 lines

- [ ] T029 [P] [US2] Create `useETagCache` hook in `olorin-front/src/microservices/investigation/hooks/useETagCache.ts`:
  - Get ETag from localStorage with key `inv:{investigationId}:etag`
  - Save ETag after successful fetch
  - Return current ETag and save method
  - Return null if ETag missing (first fetch, no cache)
  - **File size constraint**: Must be <80 lines

- [ ] T030 [US2] Enhance polling flow in `olorin-front/src/microservices/investigation/hooks/useProgressData.ts`:
  - Integrate useAdaptivePolling hook for intelligent interval calculation
  - Integrate useETagCache hook for conditional requests
  - Build If-None-Match header from cached ETag
  - Handle 304 Not Modified response (no body, skip event processing)
  - Handle 200 OK response (update ETag cache, process events)
  - Reference quickstart.md Example 2 for complete polling loop
  - Performance target: 304 responses skip processing immediately

- [ ] T031 [US2] Implement multi-tab pause in `olorin-front/src/microservices/investigation/hooks/useAdaptivePolling.ts`:
  - Detect document visibility changes via visibilitychange event
  - Pause polling when document.hidden = true
  - Resume polling when document.hidden = false
  - Resume at appropriate interval for current investigation status
  - No polling requests sent while tab hidden

### Tests - User Story 2

- [ ] T032 [P] [US2] Unit test for adaptive polling intervals in `olorin-server/test/unit/test_polling_intervals.py`:
  - Test interval = 2-5s when status IN_PROGRESS
  - Test interval = 30-120s when status COMPLETED and idle >5min
  - Test poll_after_seconds hint in response
  - Reference research.md section 4.1 for interval calculation

- [ ] T033 [P] [US2] Unit test for ETag generation in `olorin-server/test/unit/test_etag_generation.py`:
  - Test same investigation_id + version produces same ETag
  - Test different versions produce different ETags
  - Test ETag format is W/"string"
  - Test consistency across multiple calls

- [ ] T034 [P] [US2] Unit test for ETag caching logic in `olorin-front/test/unit/useETagCache.test.ts`:
  - Mock localStorage
  - Test: Hook saves ETag after fetch
  - Test: Hook retrieves cached ETag for next request
  - Test: Hook returns null on first fetch (no cache)
  - Test: Hook uses correct key format

- [ ] T035 [P] [US2] Unit test for adaptive polling hook in `olorin-front/test/unit/useAdaptivePolling.test.ts`:
  - Test interval = 5s when status IN_PROGRESS
  - Test interval = 60s when idle
  - Test polling pauses when document.hidden = true
  - Test polling resumes when document.hidden = false
  - Test startPolling and stopPolling methods

- [ ] T036 [P] [US2] Integration test for ETag 304 responses in `olorin-server/test/integration/test_etag_304_responses.py`:
  - Test Poll 1: GET without If-None-Match → 200 OK with ETag header
  - Test Poll 2: GET with matching If-None-Match → 304 Not Modified (empty body)
  - Test Poll 3-10: All return 304 for idle investigation
  - Test when investigation changes: next poll returns 200 with new ETag
  - Reference quickstart.md Test Scenario 2 for exact steps

- [ ] T037 [P] [US2] Integration test for adaptive polling flow in `olorin-server/test/integration/test_adaptive_polling_flow.py`:
  - Create active investigation (IN_PROGRESS)
  - Test: Poll receives poll_after_seconds: 5
  - Complete investigation
  - Test: Poll receives poll_after_seconds: 60
  - Verify rate limit headers (X-RateLimit-*) present

- [ ] T038 [US2] Frontend integration test for adaptive polling in `olorin-front/test/integration/polling-flow.test.ts`:
  - Mock API with events endpoint
  - Test: useAdaptivePolling calculates 5s interval when IN_PROGRESS
  - Test: Poll loop fetches events successfully
  - Test: ETag caching works (subsequent poll returns 304)
  - Test: Polling pauses when tab hidden, resumes when visible
  - Test: Full polling lifecycle from start to completion
  - Reference quickstart.md Example 2 for complete flow

**Checkpoint**: User Stories 1 & 2 complete. Page loading + adaptive polling with ETag caching fully functional. Ready for MVP delivery.

---

## Phase 5: User Story 3 - Event Ordering & Deduplication (Priority: P2)

**Goal**: Events maintain strict ordering by timestamp and are deduplicated by event ID across retries

**Independent Test**: `pytest test/integration/test_event_ordering.py -v && npm test test/unit/useEventDeduplication.test.ts`

**Functional Requirements**: US4, Req 4.1, 4.2, 4.3

### Implementation - Backend

- [ ] T039 [US3] Implement event ordering guarantee in `olorin-server/app/service/event_feed_service.py`:
  - Query ORDER BY timestamp ASC, sequence ASC
  - Ensure events returned in exact monotonic order
  - Test with concurrent events at same millisecond (use sequence for ordering)
  - Return immutable result set (same request always returns same events)

- [ ] T040 [US3] Add event deduplication support in event feed response:
  - Include event `id` field (cursor format) as deduplication key
  - Document in API contract that client should deduplicate by ID
  - Backend ensures no duplicate IDs in single response
  - Reference data-model.md section 2.1 for event ID format

### Implementation - Frontend

- [ ] T041 [P] [US3] Create `useEventDeduplication` hook in `olorin-front/src/microservices/investigation/hooks/useEventDeduplication.ts`:
  - Accept events[] array
  - Deduplicate by event.id using Set
  - Maintain order (same order as input)
  - Return deduplicated events[]
  - **File size constraint**: Must be <100 lines

- [ ] T042 [US3] Integrate deduplication in `olorin-front/src/microservices/investigation/hooks/useProgressData.ts`:
  - After fetching events, call useEventDeduplication
  - Apply deduplicated events to UI state
  - Ensure events applied exactly once per ID

### Tests - User Story 3

- [ ] T043 [P] [US3] Unit test for event ordering in `olorin-server/test/unit/test_event_ordering.py`:
  - Test events ordered by timestamp ascending
  - Test same-timestamp events use sequence for ordering
  - Test 10 events at different milliseconds maintain order
  - Test ordering with timestamp collisions (sequence handling)

- [ ] T044 [P] [US3] Unit test for event deduplication in `olorin-front/test/unit/useEventDeduplication.test.ts`:
  - Test: Input 10 unique events → output 10 unique events
  - Test: Input with 2 duplicates → output deduped
  - Test: Output maintains input order
  - Test: Deduplication by event.id using Set

- [ ] T045 [P] [US3] Integration test for pagination ordering in `olorin-server/test/integration/test_event_pagination_ordering.py`:
  - Create investigation with 10 events
  - Test: Fetch with limit=5 → events 1-5 in order
  - Test: next_cursor points to event 6
  - Test: Fetch with since={event5_cursor} → events 6-10 in order
  - Test: No overlap between paginated requests
  - Reference quickstart.md Test Scenario 4 for exact steps

- [ ] T046 [P] [US3] Integration test for event feed ordering in `olorin-server/test/integration/test_event_feed_ordering.py`:
  - Create events with varying timestamps
  - Test: Events returned in ascending timestamp order
  - Test: Same-millisecond events use sequence for order
  - Test: Result set immutable (same request always same events)

**Checkpoint**: Event ordering and deduplication fully tested and working correctly.

---

## Phase 6: User Story 4 - Optimistic Concurrency Control (Priority: P2)

**Goal**: Concurrent updates detect conflicts via version field + If-Match header; conflicts return 409 with retry guidance

**Independent Test**: `pytest test/integration/test_optimistic_concurrency.py -v`

**Functional Requirements**: US6, Req 6.1, 6.2, 6.3, 6.4

### Implementation - Backend

- [ ] T047 [US4] Implement optimistic locking in `olorin-server/app/service/investigation_state_service.py`:
  - PATCH endpoint accepts version field in request body
  - Check If-Match header matches current version
  - If version matches: apply update, increment version, return 200
  - If version mismatch: return 409 Conflict with current_version, submitted_version in response
  - Update audit_log to record version transition (from_version → to_version)
  - Reference research.md section 7.1 and data-model.md section 6.2 for details

- [ ] T048 [US4] Enhance PATCH endpoint in `olorin-server/app/router/investigation_state_router.py`:
  - Accept If-Match header (version number)
  - Return 409 response with error details on version conflict
  - Include current_version, submitted_version in error response
  - Return new version in 200 OK response
  - Reference data-model.md section 7.2 for 409 Conflict response format
  - **File size constraint**: Keep <200 lines

### Implementation - Frontend

- [ ] T049 [US4] Create `useOptimisticUpdate` hook in `olorin-front/src/microservices/investigation/hooks/useOptimisticUpdate.ts`:
  - Accept investigationId, updates object, currentVersion
  - Send PATCH with If-Match: currentVersion header
  - Handle 200 OK: update state, return success
  - Handle 409 Conflict: refetch snapshot (new version), show error message
  - Implement retry logic: fetch new snapshot → reapply changes → retry PATCH
  - Return { updateState, isConflict, retryUpdate } methods
  - **File size constraint**: Must be <180 lines

- [ ] T050 [US4] Integrate concurrency control in ProgressPage.tsx:
  - Fetch current version from snapshot
  - When updating (e.g., settings), use useOptimisticUpdate
  - Pass currentVersion to hook
  - Handle 409 responses with user-friendly error message
  - Show retry button to user on conflict

### Tests - User Story 4

- [ ] T051 [P] [US4] Unit test for version conflict detection in `olorin-server/test/unit/test_version_conflict.py`:
  - Test: Matching version → update succeeds
  - Test: Mismatched version → 409 response
  - Test: Response includes current_version, submitted_version
  - Test: Version incremented on successful update

- [ ] T052 [P] [US4] Integration test for optimistic concurrency in `olorin-server/test/integration/test_optimistic_concurrency.py`:
  - Create investigation with version=100
  - Analyst 1: GET → fetch version=100
  - Analyst 1: PATCH with If-Match: 100 → Success, version=101
  - Analyst 2: GET → fetch version=100 (older snapshot)
  - Analyst 2: PATCH with If-Match: 100 → 409 Conflict
  - Analyst 2: GET → fetch version=101
  - Analyst 2: PATCH with If-Match: 101 → Success, version=102
  - Reference quickstart.md Example 3 for exact scenario

- [ ] T053 [P] [US4] Unit test for optimistic update hook in `olorin-front/test/unit/useOptimisticUpdate.test.ts`:
  - Mock API responses
  - Test: Successful update (200 OK) returns success
  - Test: Conflict (409) triggers refetch
  - Test: Retry after conflict succeeds with new version
  - Test: Conflict error message shown to user

- [ ] T054 [P] [US4] Integration test for concurrent update handling in `olorin-server/test/integration/test_concurrent_updates.py`:
  - Simulate 2 concurrent PATCH requests with same version
  - First succeeds (version increments)
  - Second receives 409
  - Both analytics/logs recorded correctly

**Checkpoint**: Optimistic concurrency control fully functional. Concurrent updates handled safely with conflict detection.

---

## Phase 7: User Story 5 - SSE Real-Time with Fallback (Priority: P2)

**Goal**: Run-details page receives tool progress updates via SSE (<5s latency); falls back to polling on disconnect

**Independent Test**: `pytest test/integration/test_sse_fallback.py -v && npm test test/integration/sse-fallback.test.ts`

**Functional Requirements**: US5, Req 5.1, 5.2, 5.3, 5.4

### Implementation - Backend

- [ ] T055 [US5] Create SSE stream endpoint in `olorin-server/app/router/investigation_stream_router.py`:
  - Endpoint: `GET /api/v1/investigations/{investigation_id}/runs/{run_id}/stream`
  - Accept Authorization header
  - Establish EventSource connection
  - Stream tool progress updates as `data: {JSON}` format
  - Send tool_complete, tool_error, phase_change events
  - Verify user has read access to investigation
  - Reference research.md section 5.1 for SSE usage patterns
  - **File size constraint**: Must be <200 lines - focus on stream handler only

- [ ] T056 [US5] Implement event streaming service in `olorin-server/app/service/event_streaming_service.py`:
  - Method `stream_investigation_events(investigation_id: str) -> AsyncGenerator`
  - Query investigation_audit_log for recent events
  - Yield events in SSE format
  - Monitor for new events and stream when available
  - **File size constraint**: Must be <200 lines

- [ ] T057 [US5] Add fallback polling endpoint enhancement in `olorin-server/app/router/investigation_stream_router.py`:
  - Ensure polling endpoint (`GET /api/v1/investigations/{id}/events`) always available
  - SSE should reference polling endpoint as fallback
  - Performance target: polling fallback responds within 200ms

### Implementation - Frontend

- [ ] T058 [P] [US5] Create `useWebSocketFallback` hook in `olorin-front/src/microservices/investigation/hooks/useWebSocketFallback.ts`:
  - Accept investigationId, runId, onEventCallback
  - Open EventSource to SSE endpoint
  - Parse events: tool_complete, tool_error, phase_change
  - On error: close SSE, fall back to polling
  - Resume with polling immediately (no delay)
  - Return { isConnected, fallbackMode, startSSE, stopSSE }
  - **File size constraint**: Must be <180 lines

- [ ] T059 [US5] Create `useSSEPollingFallback` hook in `olorin-front/src/microservices/investigation/hooks/useSSEPollingFallback.ts`:
  - Wrap useWebSocketFallback + useAdaptivePolling
  - Try SSE first for low-latency updates (<5s)
  - On SSE disconnect: seamlessly switch to polling
  - Resume polling at appropriate interval for status
  - Return { events, isUsingSSE, isUsingPolling, latency }
  - **File size constraint**: Must be <150 lines

- [ ] T060 [US5] Create run-details page/component showing real-time tool progress:
  - In `olorin-front/src/microservices/investigation/pages/RunDetailsPage.tsx` or similar
  - Use useSSEPollingFallback hook to fetch tool progress
  - Display tool status (queued/running/completed/failed)
  - Show tool output/logs as they stream
  - Handle SSE ↔ polling transition gracefully
  - No disruption to user when switching modes

### Tests - User Story 5

- [ ] T061 [P] [US5] Unit test for SSE message parsing in `olorin-server/test/unit/test_sse_format.py`:
  - Test tool_complete event format
  - Test tool_error event format
  - Test phase_change event format
  - Test SSE data: prefix handling

- [ ] T062 [P] [US5] Integration test for SSE streaming in `olorin-server/test/integration/test_sse_realtime.py`:
  - Create investigation with running tool
  - Connect SSE to /api/v1/investigations/{id}/runs/{runId}/stream
  - Verify tool_complete event received <5s from completion
  - Verify event format matches specification

- [ ] T063 [P] [US5] Integration test for SSE fallback to polling in `olorin-server/test/integration/test_sse_fallback.py`:
  - Start SSE stream
  - Close server connection (simulate network failure)
  - Verify client detects disconnect
  - Verify client falls back to polling
  - Verify polling continues to deliver updates

- [ ] T064 [P] [US5] Unit test for SSE fallback hook in `olorin-front/test/unit/useWebSocketFallback.test.ts`:
  - Mock EventSource
  - Test: onOpen → isConnected = true
  - Test: onError → falls back to polling immediately
  - Test: onMessage parses events correctly
  - Test: cleanup closes EventSource

- [ ] T065 [P] [US5] Integration test for SSE+Polling fallback in `olorin-front/test/integration/sse-fallback.test.ts`:
  - Mock API with SSE endpoint
  - Simulate SSE connection → receive events
  - Simulate network error → automatic fallback to polling
  - Verify polling continues without user intervention
  - Verify no gap in event delivery during transition

**Checkpoint**: Real-time SSE streaming with automatic polling fallback fully functional.

---

## Phase 8: User Story 6 - Rate Limiting & Backoff (Priority: P3)

**Goal**: Enforce 60 requests/min per user; clients implement exponential backoff with jitter for 429 responses

**Independent Test**: `pytest test/integration/test_rate_limiting.py -v && npm test test/unit/useRateLimitBackoff.test.ts`

**Functional Requirements**: US7 (implied), Req 8.1, 8.2, 8.3

### Implementation - Backend

- [ ] T066 [US6] Implement rate limiting middleware in `olorin-server/app/middleware/rate_limit_middleware.py`:
  - Enforce 60 requests/min per user_id (from JWT token)
  - Use sliding window algorithm (Redis preferred, in-memory fallback)
  - Return 429 Too Many Requests when limit exceeded
  - Include response headers: Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
  - Reference research.md section 8.1 for headers format
  - **File size constraint**: Must be <200 lines

- [ ] T067 [US6] Add rate limiting headers to all endpoints in `olorin-server/app/router/`:
  - All polling, event, and snapshot endpoints return X-RateLimit-* headers
  - Remaining count calculated per request
  - Reset timestamp included in header
  - Reference contracts/cursor-events.md section 3.2 for header format

### Implementation - Frontend

- [ ] T068 [P] [US6] Create `useRateLimitBackoff` hook in `olorin-front/src/microservices/investigation/hooks/useRateLimitBackoff.ts`:
  - Accept fetch function and request config
  - On 429 response: extract Retry-After header
  - Implement exponential backoff: delay = Retry-After * 1000 * (1 + random(0, 0.2))
  - Retry request after backoff
  - Maximum retries: 3 (then fail)
  - Return { fetchWithBackoff, isBackingOff, remainingRetries }
  - **File size constraint**: Must be <150 lines

- [ ] T069 [US6] Integrate rate limit backoff in `useAdaptivePolling` hook:
  - Wrap polling fetch with rate limit backoff
  - Handle 429 responses automatically
  - Pause polling during backoff period
  - Resume polling after backoff completes
  - Log rate limiting events for debugging

### Tests - User Story 6

- [ ] T070 [P] [US6] Unit test for rate limiting algorithm in `olorin-server/test/unit/test_rate_limiting.py`:
  - Test: 60 requests in 60s → all succeed
  - Test: 61st request → 429 response
  - Test: After 1min window expires → limit resets
  - Test: X-RateLimit-Remaining decreases correctly
  - Test: X-RateLimit-Reset timestamp correct

- [ ] T071 [P] [US6] Integration test for rate limiting enforcement in `olorin-server/test/integration/test_rate_limiting_enforcement.py`:
  - Send 60 requests rapidly
  - Verify all succeed with decreasing X-RateLimit-Remaining
  - Send 61st request → 429 response with Retry-After header
  - Wait for reset window → verify limit resets

- [ ] T072 [P] [US6] Unit test for backoff calculation in `olorin-front/test/unit/useRateLimitBackoff.test.ts`:
  - Test: Retry-After: 10 → delay between 10-12s (with jitter)
  - Test: Exponential backoff after multiple retries
  - Test: Random jitter applied (±20%)
  - Test: Maximum 3 retries then fail
  - Mock fetch to verify backoff delay

- [ ] T073 [P] [US6] Integration test for backoff in `olorin-front/test/integration/rate-limit-backoff.test.ts`:
  - Mock API to return 429 after 60 requests
  - Test: Client detects 429 and backs off
  - Test: After backoff, retry succeeds
  - Test: No requests sent during backoff window
  - Reference research.md section 8.2 for backoff strategy

**Checkpoint**: Rate limiting and exponential backoff working correctly. System protected from excessive polling.

---

## Phase 9: User Story 7 - Multi-Tab Coordination (Priority: P3)

**Goal**: Only one tab polls frequently; other tabs receive cursor updates via BroadcastChannel, reducing QPS by 80%

**Independent Test**: `npm test test/integration/multi-tab-coordination.test.ts`

**Functional Requirements**: US2 (implied), Req multi-tab, Research section 6

### Implementation - Frontend

- [ ] T074 [P] [US7] Create `useBroadcastCoordination` hook in `olorin-front/src/microservices/investigation/hooks/useBroadcastCoordination.ts`:
  - Create BroadcastChannel with name `investigation:{investigationId}`
  - Detect if this is primary tab (first to establish channel)
  - Primary tab: poll frequently (2-5s)
  - Secondary tabs: listen for updates via onmessage
  - When primary updates: broadcast { type: "cursor_update", cursor: newCursor, version: newVersion }
  - Return { isPrimaryTab, isBroadcastSupported }
  - **File size constraint**: Must be <160 lines

- [ ] T075 [US7] Enhance `useAdaptivePolling` hook to support multi-tab mode:
  - Accept optional isBroadcastSupported flag
  - If not primary tab: interval = Infinity (no polling in secondary)
  - Listen to BroadcastChannel for updates
  - Update local cursor/version when broadcast received
  - Trigger UI update callback when receiving broadcast
  - Resume to normal polling if primary tab closes

- [ ] T076 [US7] Enhance `useCursorStorage` hook to support broadcast updates:
  - On BroadcastChannel message with cursor_update
  - Update localStorage with new cursor and version
  - Call callback to notify UI of update

### Tests - User Story 7

- [ ] T077 [P] [US7] Unit test for primary tab detection in `olorin-front/test/unit/useBroadcastCoordination.test.ts`:
  - Mock BroadcastChannel
  - Test: First tab detected as primary
  - Test: Subsequent tabs detected as secondary
  - Test: Message broadcast from primary tab received by secondary

- [ ] T078 [P] [US7] Integration test for multi-tab coordination in `olorin-front/test/integration/multi-tab-coordination.test.ts`:
  - Simulate 3 browser tabs accessing same investigation
  - Tab 1 (primary): polls every 5s
  - Tab 2 (secondary): no polling
  - Tab 3 (secondary): no polling
  - Primary receives events → broadcasts cursor_update
  - Tab 2 & 3 receive update → update local state
  - Close Tab 1 → Tab 2 becomes primary and resumes polling
  - Verify reduced QPS (80% reduction with 3 tabs)

- [ ] T079 [P] [US7] Performance test for multi-tab QPS reduction in `olorin-front/test/integration/multi-tab-qps-reduction.test.ts`:
  - Simulate single tab: measure polling QPS (baseline)
  - Simulate 5 tabs with coordination: measure QPS (target: 80% reduction)
  - Verify broadcast latency <100ms
  - Verify no message loss across tabs

**Checkpoint**: Multi-tab coordination reducing QPS by 80%. Secondary tabs receive updates instantly.

---

## Phase 10: Polish, Documentation & Final Testing

**Purpose**: Final validation, documentation, and delivery readiness

### Backend Polish

- [ ] T080 [P] Add comprehensive logging to `olorin-server/app/service/` and `olorin-server/app/router/`:
  - Log all cursor operations (parse, generate, paginate)
  - Log ETag hits/misses
  - Log rate limiting events
  - Log version conflicts
  - Include investigation_id, user_id, latency_ms in all logs

- [ ] T081 [P] Add error handling for edge cases:
  - Cursor expiration (>30 days) → 400 Bad Request
  - Invalid cursor format → 400 Bad Request
  - Non-existent investigation → 404 Not Found
  - Unauthorized access → 403 Forbidden
  - Rate limit exceeded → 429 Too Many Requests with Retry-After

- [ ] T082 [P] Performance validation:
  - Benchmark snapshot GET: target <100ms P95
  - Benchmark event feed GET: target <150ms P95 for 50 events
  - Benchmark ETag 304: target <30ms P95
  - Run against integration test data

- [ ] T083 Verify schema-locked mode compliance:
  - Audit all database operations (no DDL)
  - Verify all columns referenced exist in schema manifest
  - Run startup schema verification check
  - Confirm no migrations or auto-sync enabled

### Frontend Polish

- [ ] T084 [P] Add comprehensive error boundaries:
  - useInvestigationSnapshot errors → show error message, retry button
  - useEventFetch errors → log error, continue polling
  - useAdaptivePolling errors → fall back to fixed interval
  - useWebSocketFallback errors → switch to polling

- [ ] T085 [P] Add loading and skeleton states:
  - Snapshot loading → show skeleton
  - Events loading → show loading indicator
  - Fallback to polling → show "Polling" badge
  - SSE active → show "Live" badge

- [ ] T086 [P] Add performance monitoring:
  - Measure snapshot fetch time
  - Measure event fetch time
  - Measure event processing time
  - Log rehydration total time
  - Send metrics to telemetry (if enabled)

- [ ] T087 [P] Verify file size compliance:
  - Scan all src/ files: confirm all <200 lines
  - Break oversized files into focused modules
  - Maintain clarity and documentation

### Documentation

- [ ] T088 [P] Document all new hooks in `olorin-front/src/microservices/investigation/hooks/README.md`:
  - useAdaptivePolling: purpose, props, return values
  - useEventDeduplication: purpose, props, return values
  - useCursorStorage: purpose, props, return values
  - useWebSocketFallback: purpose, props, return values
  - useOptimisticUpdate: purpose, props, return values
  - useRateLimitBackoff: purpose, props, return values
  - useBroadcastCoordination: purpose, props, return values
  - Include usage examples for each

- [ ] T089 [P] Document all new services in `olorin-server/docs/services/`:
  - InvestigationProgressService: methods, usage patterns
  - EventFeedService: cursor pagination, event ordering
  - EventStreamingService: SSE implementation details
  - All error codes and response formats

- [ ] T090 [P] Add TypeScript interfaces documentation:
  - Document all types from event_models.py
  - Include cursor format specification
  - Include event schema with examples
  - Include response format examples

### Final Validation Testing

- [ ] T091 Run all unit tests and verify coverage:
  - Backend: `poetry run pytest test/unit/ --cov=app --cov-report=html`
  - Frontend: `npm run test:unit -- --coverage`
  - Target: 87%+ coverage minimum
  - Generate coverage report

- [ ] T092 Run all integration tests:
  - Backend: `poetry run pytest test/integration/ -v`
  - Frontend: `npm run test:integration`
  - Target: All tests passing
  - No flaky tests

- [ ] T093 Run performance benchmarks:
  - Execute performance tests from Phase 10
  - Compare against targets from plan.md
  - Document any deviations
  - Analyze bottlenecks if needed

- [ ] T094 [P] Verify spec acceptance criteria:
  - US1: Page load rehydration <700ms → ✅/❌
  - US2: Adaptive polling (active 5s, idle 60s) → ✅/❌
  - US3: ETag caching (80% 304 ratio) → ✅/❌
  - US4: Event ordering and deduplication → ✅/❌
  - US5: SSE <5s latency with polling fallback → ✅/❌
  - US6: Optimistic concurrency with 409 conflicts → ✅/❌
  - US7: Rate limiting with exponential backoff → ✅/❌
  - US8: Multi-tab coordination (80% QPS reduction) → ✅/❌

- [ ] T095 Run quickstart.md test scenarios:
  - Example 1: Page Load Rehydration → pass/fail
  - Example 2: Adaptive Polling → pass/fail
  - Example 3: Optimistic Concurrency → pass/fail
  - All 6 test scenarios from Section 2 → pass/fail

### Delivery Readiness

- [ ] T096 [P] Create pull request with all changes:
  - Branch: `001-investigation-state-management`
  - PR template with user stories and acceptance criteria
  - Link to spec.md, plan.md, research.md, data-model.md
  - Link to contract files

- [ ] T097 [P] Create deployment checklist:
  - Database migration needed? No (schema-locked)
  - Environment variables needed? Document in .env.example
  - Feature flags needed? Document in config
  - Backward compatibility verified? Yes/No

- [ ] T098 Update project documentation:
  - Add new endpoints to API documentation
  - Update architecture diagrams (if applicable)
  - Add implementation notes to README

- [ ] T099 Create CHANGELOG entry:
  - Feature: Investigation State Management Event-Sourced Architecture
  - Key capabilities: cursor-based polling, ETag caching, SSE, optimistic concurrency
  - User stories implemented: US1-US7
  - Performance improvements: 80% QPS reduction with multi-tab, 80% 304 ratio when idle

**Checkpoint**: All code complete, tested, documented, and ready for production deployment.

---

## Summary

**Total Tasks**: 99 tasks (T001-T099)

### Phase Breakdown

- **Phase 1**: Setup & Planning (✅ Complete)
- **Phase 2**: Foundational Infrastructure (T001-T011) - 11 tasks
- **Phase 3**: User Story 1 - Page Load (T012-T025) - 14 tasks
- **Phase 4**: User Story 2 - Adaptive Polling (T026-T038) - 13 tasks
- **Phase 5**: User Story 3 - Event Ordering (T039-T046) - 8 tasks
- **Phase 6**: User Story 4 - Optimistic Concurrency (T047-T054) - 8 tasks
- **Phase 7**: User Story 5 - SSE Fallback (T055-T065) - 11 tasks
- **Phase 8**: User Story 6 - Rate Limiting (T066-T073) - 8 tasks
- **Phase 9**: User Story 7 - Multi-Tab Coordination (T074-T079) - 6 tasks
- **Phase 10**: Polish & Final Testing (T080-T099) - 20 tasks

### Parallel Execution Opportunities

**Backend Parallel Groups** (can run simultaneously after Phase 2 starts):
- Cursor utilities + ETag generation + Event models (T001, T002, T003)
- Event ordering + Event deduplication (T039, T040)
- Rate limiting middleware (T066)

**Frontend Parallel Groups** (can run simultaneously after Phase 2 starts):
- All hooks: useAdaptivePolling, useEventFetch, useETagCache, useWebSocketFallback, useOptimisticUpdate, useRateLimitBackoff, useBroadcastCoordination
- All tests: unit tests, integration tests

**User Story Parallel Execution** (after Phase 2 foundational completes):
- US1, US2, US3, US4 can run in parallel (different files, no dependencies)
- US5, US6, US7 can run in parallel (different files, no dependencies)

### Dependency Chain

```
Phase 2 (Foundational) ─┬─→ Phase 3 (US1) ─┬─→ Phase 10 (Polish)
                        ├─→ Phase 4 (US2) ─┤
                        ├─→ Phase 5 (US3) ─┤
                        ├─→ Phase 6 (US4) ─┤
                        ├─→ Phase 7 (US5) ─┤
                        ├─→ Phase 8 (US6) ─┤
                        └─→ Phase 9 (US7) ─┘
```

### File Size Compliance

All new files designed to stay <200 lines:
- Services: 150-200 lines each (focused responsibility)
- Hooks: 80-180 lines each (single concern)
- Routers: 150-200 lines each (handler only, business logic in services)
- Tests: 100-150 lines each (focused on single scenario)

---

## Next Steps

1. ✅ Phase 1 & 2 Plan: Design documents complete
2. ⏳ Phase 2 Begin: Execute T001-T011 (Foundational infrastructure)
3. ⏳ Phase 3+ Begin: After Phase 2 complete, execute user story tasks in priority order
4. ⏳ Phase 10: Polish & final validation before production deployment

**Estimated Timeline**:
- Phase 2: 2-3 days (foundational)
- Phase 3-4: 3-5 days (MVP user stories 1-2)
- Phase 5-9: 5-7 days (remaining user stories)
- Phase 10: 2-3 days (polish & validation)
- **Total**: ~2 weeks for complete implementation

---

## File Location

Generated: `/Users/gklainert/Documents/olorin/specs/001-investigation-state-management/tasks.md`
