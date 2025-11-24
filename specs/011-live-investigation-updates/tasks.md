# Implementation Tasks: Live Investigation Data Updates

**Feature**: 008-live-investigation-updates  
**Branch**: `008-live-investigation-updates`  
**Created**: 2025-11-06  
**Status**: Ready for Implementation

---

## Executive Summary

This document provides a complete, executable task breakdown for implementing real-time investigation progress delivery. Tasks are organized by user story priority (P1 first, then P2), with each story independently testable. The MVP scope (User Stories 1-2) can be deployed alone and provides core value. User Stories 3-5 add production resilience and advanced features.

**Total Tasks**: 62 tasks  
**Estimated Effort**: 8-10 weeks (cross-functional team)  
**MVP Scope**: User Stories 1-2 (4-5 weeks, 35 tasks)  
**Parallel Opportunities**: 12-15 tasks can execute in parallel per phase

---

## User Stories Organization

### Priority Matrix

| Priority | User Story | Epic | MVP | Week |
|----------|-----------|------|-----|------|
| P1 | US1: Real-Time Progress Monitoring | Core | ✅ | 1-2 |
| P1 | US2: Event Pagination & Audit Trail | Core | ✅ | 2-3 |
| P2 | US3: SSE→Polling Fallback | Resilience | Optional | 4-5 |
| P2 | US4: Metrics & Health Monitoring | Enhancement | Optional | 5-6 |
| P2 | US5: Investigation Lifecycle | Core | Optional | 6-7 |

### User Story Dependencies

```
Setup & Foundational (Phase 1-2)
    ↓
US1 (Real-Time Progress) ← Blocking for all others
    ↓
US2 (Event Pagination) ← Can proceed in parallel with US1
    ↓
US3 (Fallback) ← Can proceed after US1 complete
    ↓
US4 (Metrics) ← Can proceed after US1 complete
    ↓
US5 (Lifecycle) ← Can proceed after US1 complete
```

### Independent Test Criteria Per User Story

- **US1**: Investigation progress updates in <1s via SSE or polling; all progress fields (tools, phases, risk, entities) update accurately
- **US2**: Event feed paginated correctly; cursor format valid; 304 responses <30ms; no duplicate events
- **US3**: SSE failure detected within 5s; polling starts automatically; SSE reconnection succeeds; exponential backoff works
- **US4**: Metrics (tools/sec, entity count, error count) calculate correctly; display updates; reflect actual activity
- **US5**: All 6 status transitions handled; polling stops on terminal status; UI state correct for each status

---

## Phase 1: Setup & Infrastructure (Weeks 1)

### Phase Goal
Initialize project structure, verify all endpoints exist with real data sources, and ensure all environment variables are configured.

### Tasks

- [ ] T001 [P] Verify backend project structure follows plan.md (olorin-server/)
- [ ] T002 [P] Verify frontend project structure follows plan.md (olorin-front/)
- [ ] T003 [P] Create environment configuration file: olorin-server/.env.example with all required variables
- [ ] T004 [P] Create frontend environment config: olorin-front/.env.example with polling intervals
- [ ] T005 Verify investigation_states PostgreSQL table schema matches plan.md
- [ ] T006 Verify investigation_audit_log PostgreSQL table schema matches plan.md
- [ ] T007 Verify database indexes exist on investigation_states (user_id, status, updated_at, lifecycle_stage)
- [ ] T008 Verify database indexes exist on investigation_audit_log (investigation_id, timestamp)
- [ ] T009 Create backend test fixtures for investigation state data in tests/conftest.py
- [ ] T010 Create frontend test fixtures for investigation progress data in tests/fixtures.ts
- [ ] T011 Document database schema version and migration history (if any) in DEPLOYMENT.md
- [ ] T012 [P] Verify all existing backend services exist and are importable
- [ ] T013 [P] Verify all existing frontend hooks exist and are importable
- [ ] T014 Git commit: "T014: Setup project structure and environment configuration"

**Parallel Opportunities**: T001-T004, T012-T013 can run in parallel

**Prerequisites**: ✅ Complete before moving to Phase 2

---

## Phase 2: Foundational Services & Data Integrity (Weeks 1-2)

### Phase Goal
Ensure all backend services return REAL data (no mocks), implement proper error handling, and establish testing infrastructure. These are blocking prerequisites for all user stories.

### Backend Foundational Tasks

- [ ] T015 [P] Verify InvestigationProgressService returns real data from progress_json (no defaults)
- [ ] T016 [P] Verify EventFeedService implements proper cursor format `{timestamp_ms}_{sequence}`
- [ ] T017 [P] Verify EventFeedService deduplicates events by ID
- [ ] T018 [P] Verify EventFeedService orders events by (timestamp ASC, sequence ASC)
- [ ] T019 [P] Verify EventFeedService validates cursor expiration (>30 days old → 400 error)
- [ ] T020 [P] Verify EventStreamingService streams real events (not mocked)
- [ ] T021 [P] Verify EventStreamingService supports last_event_id for reconnection
- [ ] T022 [P] Implement error handling for corrupted progress_json in InvestigationProgressService (olorin-server/app/service/investigation_progress_service.py)
- [ ] T023 [P] Implement error handling for missing ETag header in /progress endpoint (olorin-server/app/router/investigations_router.py)
- [ ] T024 [P] Implement error handling for missing ETag header in /events endpoint (olorin-server/app/router/investigation_stream_router.py)
- [ ] T025 Implement 304 Not Modified response logging and monitoring in /progress endpoint

### Frontend Foundational Tasks

- [ ] T026 [P] Verify useProgressData hook connects to real /progress endpoint
- [ ] T027 [P] Verify useAdaptivePolling calculates intervals correctly by status
- [ ] T028 [P] Verify useSSEPollingFallback detects SSE failure and switches to polling
- [ ] T029 [P] Verify exponential backoff implementation in polling retry logic
- [ ] T030 [P] Implement ETag caching mechanism in useETagCache hook (olorin-front/src/shared/hooks/useETagCache.ts)
- [ ] T031 [P] Implement multi-tab coordination store (olorin-front/src/shared/stores/investigationStore.ts)
- [ ] T032 Implement localStorage event listener for multi-tab updates

### Testing Infrastructure

- [ ] T033 [P] Create pytest fixtures for investigation state with real progress_json in tests/backend/conftest.py
- [ ] T034 [P] Create Jest mock for real API responses in tests/frontend/mocks/investigationApi.ts
- [ ] T035 Implement test helper: generate_cursor(timestamp_ms, sequence) function
- [ ] T036 Implement test helper: validate_event_ordering(events) function

### Documentation

- [ ] T037 Document all error codes and handling in ERRORS.md
- [ ] T038 Document environment variables and defaults in ENV_CONFIG.md
- [ ] T039 Git commit: "T039: Implement foundational services with error handling"

**Parallel Opportunities**: T015-T024, T026-T032 can run in parallel (backend vs frontend)

**Blocking Prerequisites**: All must complete before moving to User Story tasks

---

## Phase 3: User Story 1 - Real-Time Progress Monitoring (Weeks 2-3)

### Story Goal
Investigator opens investigation detail page and sees progress update in real-time (<1s) as tools execute, phases transition, and risk metrics update. Both SSE and polling fallback work.

### Independent Test
- Open investigation with running tools
- Verify progress percentage updates <1s
- Verify tool status updates (queued → running → completed)
- Verify phase transitions reflected in UI
- Verify risk metrics update
- Works via both SSE (primary) and polling (fallback)

### Backend: Data Models & Endpoint Validation

- [ ] T040 [US1] Verify InvestigationProgress Pydantic model has all required fields from spec.md (olorin-server/app/models/progress_models.py)
- [ ] T041 [US1] Verify ToolExecution model includes all fields: id, tool_name, agent_type, status, timestamps, input, result, error, retry_count
- [ ] T042 [US1] Verify AgentStatus model includes: agent_type, agent_name, status, tools_completed, total_tools, progress_percent, risk_score
- [ ] T043 [US1] Verify PhaseProgress model includes: id, name, order, status, completion_percent, tool_execution_ids, timestamps
- [ ] T044 [US1] Verify RiskMetrics model includes: overall, by_agent dict, confidence, last_calculated
- [ ] T045 [US1] Test /progress endpoint returns complete InvestigationProgress (all fields populated) in olorin-server/tests/backend/test_progress_endpoint.py
- [ ] T046 [US1] Test /progress endpoint maps investigation_state.status to API response status correctly
- [ ] T047 [US1] Test /progress endpoint respects authorization (require_read_or_dev)
- [ ] T048 [US1] Test /progress endpoint returns 404 for non-existent investigation

### Backend: ETag & Conditional Requests

- [ ] T049 [P] [US1] Implement ETag generation in /progress endpoint based on investigation version (olorin-server/app/router/investigations_router.py)
- [ ] T050 [P] [US1] Implement If-None-Match header support in /progress endpoint
- [ ] T051 [US1] Test /progress returns 304 Not Modified when ETag matches within <30ms
- [ ] T052 [US1] Test /progress includes Cache-Control header with appropriate max-age
- [ ] T053 [US1] Test /progress includes X-Recommended-Interval header with polling interval

### Backend: SSE Streaming

- [ ] T054 [P] [US1] Verify EventStreamingService sends events with proper SSE format in olorin-server/app/service/event_streaming_service.py
- [ ] T055 [P] [US1] Verify EventStreamingService includes heartbeat events every 30 seconds
- [ ] T056 [P] [US1] Verify EventStreamingService closes connection after max duration (5 minutes) with reconnection instruction
- [ ] T057 [US1] Test SSE endpoint (/stream) receives tool_complete events
- [ ] T058 [US1] Test SSE endpoint receives phase_change events
- [ ] T059 [US1] Test SSE endpoint receives error events on failure
- [ ] T060 [US1] Test SSE supports last_event_id for reconnection

### Frontend: Hooks & Polling

- [ ] T061 [P] [US1] Complete useProgressData hook to poll /progress with ETag caching (olorin-front/src/microservices/investigation/hooks/useProgressData.ts)
- [ ] T062 [US1] Test useProgressData calls /progress on mount and at configured intervals
- [ ] T063 [US1] Test useProgressData stops polling on terminal status (completed, failed, cancelled)
- [ ] T064 [US1] Test useProgressData handles 304 Not Modified (no re-render)
- [ ] T065 [US1] Test useProgressData implements exponential backoff on error

### Frontend: Components

- [ ] T066 [P] [US1] Update InvestigationProgressBar to display completion_percent in real-time (olorin-front/src/microservices/investigation/components/progress/InvestigationProgressBar.tsx)
- [ ] T067 [P] [US1] Create PhaseProgressDisplay component in olorin-front/src/microservices/investigation/components/progress/PhaseProgressDisplay.tsx
- [ ] T068 [P] [US1] Create ToolExecutionStatus component in olorin-front/src/microservices/investigation/components/progress/ToolExecutionStatus.tsx
- [ ] T069 [P] [US1] Create RiskMetricsDisplay component in olorin-front/src/microservices/investigation/components/progress/RiskMetricsDisplay.tsx
- [ ] T070 [US1] Test PhaseProgressDisplay shows all phases with correct progress
- [ ] T071 [US1] Test ToolExecutionStatus shows tool counts (total, completed, running, queued, failed)
- [ ] T072 [US1] Test RiskMetricsDisplay shows overall, by_agent, and confidence scores
- [ ] T073 [US1] Test all components update when progress prop changes

### Frontend: Integration

- [ ] T074 [P] [US1] Create InvestigationProgressContainer component that integrates all progress displays (olorin-front/src/microservices/investigation/containers/InvestigationProgressContainer.tsx)
- [ ] T075 [US1] Test InvestigationProgressContainer passes progress data to all child components
- [ ] T076 [US1] Test InvestigationProgressContainer handles loading state (skeleton/spinner)
- [ ] T077 [US1] Test InvestigationProgressContainer handles error state with retry button
- [ ] T078 [US1] Integration test: Open investigation → verify progress updates in real-time

### Testing & Documentation

- [ ] T079 [US1] Create unit tests for all progress components in tests/frontend/components/progress/
- [ ] T080 [US1] Create integration test for real-time progress flow in tests/frontend/integration/
- [ ] T081 [US1] Document progress update flow in docs/progress-update-flow.md
- [ ] T082 [US1] Git commit: "T082: Implement US1 - Real-time progress monitoring"

**Parallel Opportunities**: 
- T040-T044 (model verification)
- T049-T050, T054-T056 (ETag + SSE)
- T061, T066-T069 (frontend components)

**Blocks**: User Stories 3-5 (fallback, metrics, lifecycle)

---

## Phase 4: User Story 2 - Event Pagination & Audit Trail (Weeks 3-4)

### Story Goal
Investigator navigates to events page and scrolls through paginated investigation events. Cursor-based pagination works correctly, ETag caching prevents unnecessary API calls (304), and event details are accurate.

### Independent Test
- Navigate to events page
- Load first page (100 events)
- Verify cursor pagination to next page
- Verify no duplicate events
- Verify events ordered by timestamp ASC, sequence ASC
- Verify ETag 304 responses
- Verify event details (type, actor, data) accurate

### Backend: Event Models & Validation

- [ ] T083 [US2] Verify InvestigationEvent model has all required fields in olorin-server/app/models/event_models.py
- [ ] T084 [US2] Verify EventsFeedResponse model includes: items, next_cursor, has_more, poll_after_seconds, etag
- [ ] T085 [US2] Test cursor format generation `{timestamp_ms}_{sequence}` in EventFeedService
- [ ] T086 [US2] Test cursor validation (rejects expired >30 days old)
- [ ] T087 [US2] Test cursor parsing into (timestamp, sequence)

### Backend: Event Pagination

- [ ] T088 [P] [US2] Verify EventFeedService.fetch_events_since returns paginated events (olorin-server/app/service/event_feed_service.py)
- [ ] T089 [P] [US2] Verify EventFeedService returns next_cursor for pagination
- [ ] T090 [P] [US2] Verify EventFeedService returns has_more flag
- [ ] T091 [US2] Test /events endpoint without cursor returns first page
- [ ] T092 [US2] Test /events endpoint with since cursor returns next page
- [ ] T093 [US2] Test /events endpoint with limit parameter (1-1000 range)
- [ ] T094 [US2] Test /events endpoint returns 400 for invalid cursor
- [ ] T095 [US2] Test /events endpoint returns 400 for expired cursor (>30 days)

### Backend: Event Deduplication & Ordering

- [ ] T096 [P] [US2] Implement event deduplication in EventFeedService (by event ID)
- [ ] T097 [P] [US2] Implement event ordering in EventFeedService (timestamp ASC, sequence ASC)
- [ ] T098 [US2] Test events ordered correctly (never out of order)
- [ ] T099 [US2] Test no duplicate events in paginated results
- [ ] T100 [US2] Test pagination through 10,000 events without duplicates or gaps

### Backend: ETag for Events

- [ ] T101 [P] [US2] Implement ETag generation for /events endpoint based on investigation version
- [ ] T102 [P] [US2] Implement If-None-Match support for /events endpoint
- [ ] T103 [US2] Test /events returns 304 Not Modified when ETag matches within <30ms
- [ ] T104 [US2] Test /events includes Cache-Control header
- [ ] T105 [US2] Test /events includes X-Recommended-Interval header

### Backend: Error Handling

- [ ] T106 [US2] Test /events returns 404 for non-existent investigation
- [ ] T107 [US2] Test /events returns 403 for unauthorized user
- [ ] T108 [US2] Test /events handles empty result set (next_cursor=null, has_more=false)

### Frontend: Events Service

- [ ] T109 [P] [US2] Create eventsService in olorin-front/src/microservices/investigation/services/eventsService.ts
- [ ] T110 [P] [US2] Implement getEvents(investigationId, cursor, limit) method with ETag caching
- [ ] T111 [US2] Test eventsService calls /events endpoint correctly
- [ ] T112 [US2] Test eventsService includes If-None-Match header for ETag
- [ ] T113 [US2] Test eventsService handles 304 responses (returns cached data)

### Frontend: Events Pagination Hook

- [ ] T114 [P] [US2] Create useEventsPagination hook in olorin-front/src/microservices/investigation/hooks/useEventsPagination.ts
- [ ] T115 [P] [US2] Implement cursor-based pagination in hook
- [ ] T116 [US2] Test useEventsPagination loads first page on mount
- [ ] T117 [US2] Test useEventsPagination loads next page with cursor
- [ ] T118 [US2] Test useEventsPagination detects end of pagination (has_more=false)

### Frontend: Events Components

- [ ] T119 [P] [US2] Create EventsLogPage component in olorin-front/src/microservices/investigation/pages/EventsLogPage.tsx
- [ ] T120 [P] [US2] Create EventListItem component in olorin-front/src/microservices/investigation/components/events/EventListItem.tsx
- [ ] T121 [P] [US2] Create EventFilters component in olorin-front/src/microservices/investigation/components/events/EventFilters.tsx
- [ ] T122 [US2] Test EventsLogPage displays events with pagination controls
- [ ] T123 [US2] Test EventListItem displays event details (timestamp, actor, type, data)
- [ ] T124 [US2] Test EventFilters filters events by type
- [ ] T125 [US2] Test pagination: load more button loads next page

### Frontend: Integration

- [ ] T126 [US2] Test EventsLogPage scrolling through 1000+ events
- [ ] T127 [US2] Test EventsLogPage ETag caching prevents unnecessary API calls
- [ ] T128 [US2] Test EventsLogPage handles empty result set
- [ ] T129 [US2] Integration test: Navigate to events → scroll → verify pagination

### Testing & Documentation

- [ ] T130 [US2] Create comprehensive unit tests for event pagination in tests/backend/test_events_endpoint.py
- [ ] T131 [US2] Create frontend component tests in tests/frontend/components/events/
- [ ] T132 [US2] Create integration test for event pagination flow
- [ ] T133 [US2] Document event pagination flow in docs/event-pagination.md
- [ ] T134 [US2] Git commit: "T134: Implement US2 - Event pagination and audit trail"

**Parallel Opportunities**:
- T083-T087 (event models)
- T088-T090, T096-T097 (pagination logic)
- T109-T110, T114-T115 (frontend services and hooks)
- T119-T121 (components)

**Dependencies**: Requires completion of Phase 2 foundational tasks

---

## Phase 5: User Story 3 - SSE to Polling Fallback (Weeks 4-5)

### Story Goal
When SSE connection unavailable/fails, system automatically switches to polling. When SSE recovers, switches back. User sees no interruption in data flow.

### Independent Test
- Disable SSE (simulate unavailable)
- Verify system detects failure within 5 seconds
- Verify polling starts automatically
- Verify progress updates continue
- Re-enable SSE
- Verify system detects recovery and stops polling

### Backend: SSE Resilience

- [ ] T135 [US3] Verify EventStreamingService reconnection support with last_event_id in olorin-server/app/service/event_streaming_service.py
- [ ] T136 [US3] Test SSE endpoint closes connection after max duration with reconnection instruction
- [ ] T137 [US3] Test SSE endpoint handles client disconnect gracefully
- [ ] T138 [US3] Test SSE endpoint sends error events on exception

### Frontend: Fallback Detection

- [ ] T139 [P] [US3] Complete useSSEPollingFallback hook in olorin-front/src/microservices/investigation/hooks/useSSEPollingFallback.ts
- [ ] T140 [P] [US3] Implement SSE failure detection (timeout, error event, no heartbeat)
- [ ] T141 [P] [US3] Implement automatic switch to polling on SSE failure
- [ ] T142 [P] [US3] Implement automatic reconnection to SSE when available
- [ ] T143 [US3] Test SSE failure detected within <5 seconds
- [ ] T144 [US3] Test polling starts automatically when SSE fails
- [ ] T145 [US3] Test system reconnects to SSE when available
- [ ] T146 [US3] Test exponential backoff applied to polling retries

### Frontend: Exponential Backoff

- [ ] T147 [P] [US3] Implement exponential backoff in polling retry logic (olorin-front/src/microservices/investigation/constants/pollingConfig.ts)
- [ ] T148 [P] [US3] Configure backoff intervals: [3s, 6s, 12s, 24s, 30s]
- [ ] T149 [US3] Test backoff intervals match configuration
- [ ] T150 [US3] Test backoff resets on successful request

### Frontend: Multi-Tab Fallback

- [ ] T151 [US3] Verify multi-tab coordination in fallback scenario (olorin-front/src/shared/stores/investigationStore.ts)
- [ ] T152 [US3] Test only active tab performs polling when SSE fails
- [ ] T153 [US3] Test other tabs detect fallback via localStorage events

### Frontend: Integration

- [ ] T154 [US3] Integration test: Simulate SSE failure → verify polling starts → verify updates continue
- [ ] T155 [US3] Integration test: Verify exponential backoff during polling retries
- [ ] T156 [US3] Integration test: SSE recovers → polling stops → SSE resumes

### Testing & Documentation

- [ ] T157 [US3] Create SSE failure simulation test fixtures
- [ ] T158 [US3] Create unit tests for fallback detection logic
- [ ] T159 [US3] Create integration tests for SSE→polling transitions
- [ ] T160 [US3] Document fallback behavior in docs/sse-polling-fallback.md
- [ ] T161 [US3] Git commit: "T161: Implement US3 - SSE to polling fallback"

**Parallel Opportunities**: T135-T138, T139-T142, T147-T148

**Dependencies**: Requires US1 completion (real-time progress)

---

## Phase 6: User Story 4 - Metrics & Health Monitoring (Weeks 5-6)

### Story Goal
UI displays live metrics: tools/sec, peak throughput, entity count, relationship count, error count. Metrics update in real-time and help investigator understand investigation health.

### Independent Test
- Start investigation with multiple tools running
- Verify tools_per_second calculates and displays
- Verify peak_tools_per_second tracks max
- Verify entity count updates as entities discovered
- Verify error count increments on errors
- Verify metrics are accurate (match actual activity)

### Backend: Metrics Calculation

- [ ] T162 [US4] Verify tools_per_second calculated in InvestigationProgressService (olorin-server/app/service/investigation_progress_service.py)
- [ ] T163 [US4] Verify peak_tools_per_second tracked across investigation lifetime
- [ ] T164 [US4] Implement entity count calculation from progress_json
- [ ] T165 [US4] Implement relationship count calculation from progress_json
- [ ] T166 [US4] Implement error count calculation from progress_json
- [ ] T167 [US4] Test metrics calculation accuracy with known data sets

### Backend: Metrics in Progress Response

- [ ] T168 [US4] Verify /progress endpoint includes all metrics fields in response
- [ ] T169 [US4] Verify metrics update with each progress refresh
- [ ] T170 [US4] Test metrics fields match InvestigationProgress model

### Frontend: Metrics Display Components

- [ ] T171 [P] [US4] Create MetricsCard component in olorin-front/src/microservices/investigation/components/progress/MetricsCard.tsx
- [ ] T172 [P] [US4] Create ToolThroughputChart component in olorin-front/src/microservices/investigation/components/progress/ToolThroughputChart.tsx
- [ ] T173 [P] [US4] Create EntityCountDisplay component in olorin-front/src/microservices/investigation/components/progress/EntityCountDisplay.tsx
- [ ] T174 [P] [US4] Create ErrorLogDisplay component in olorin-front/src/microservices/investigation/components/progress/ErrorLogDisplay.tsx
- [ ] T175 [US4] Test MetricsCard displays all metrics in real-time
- [ ] T176 [US4] Test ToolThroughputChart visualizes tools/sec over time
- [ ] T177 [US4] Test EntityCountDisplay shows entity count and relationship count
- [ ] T178 [US4] Test ErrorLogDisplay shows errors with severity, message, timestamp

### Frontend: Integration

- [ ] T179 [US4] Add MetricsCard to InvestigationProgressContainer (olorin-front/src/microservices/investigation/containers/InvestigationProgressContainer.tsx)
- [ ] T180 [US4] Add ToolThroughputChart to dashboard
- [ ] T181 [US4] Add EntityCountDisplay to dashboard
- [ ] T182 [US4] Add ErrorLogDisplay to dashboard
- [ ] T183 [US4] Test all metrics update when progress updates

### Testing & Documentation

- [ ] T184 [US4] Create unit tests for metrics calculation
- [ ] T185 [US4] Create component tests for metrics display
- [ ] T186 [US4] Create integration test for metrics accuracy
- [ ] T187 [US4] Document metrics calculation in docs/metrics-calculation.md
- [ ] T188 [US4] Git commit: "T188: Implement US4 - Metrics and health monitoring"

**Parallel Opportunities**: T162-T166, T171-T174

**Dependencies**: Requires US1 completion (progress data)

---

## Phase 7: User Story 5 - Investigation Lifecycle Management (Weeks 6-7)

### Story Goal
System properly handles all investigation lifecycle transitions (created→settings→running→completed/failed). Polling/SSE stops on terminal status. UI reflects correct state at each stage.

### Independent Test
- Create new investigation (verify pending state)
- Start investigation (verify running state)
- Complete investigation (verify polling stops, final state displayed)
- Verify failed state handled
- Verify cancelled state handled

### Backend: Status Mapping

- [ ] T189 [US5] Verify investigation_state status values: CREATED, SETTINGS, IN_PROGRESS, COMPLETED, ERROR, CANCELLED
- [ ] T190 [US5] Verify status→API response mapping in InvestigationProgressService (olorin-server/app/service/investigation_progress_service.py)
- [ ] T191 [US5] Verify lifecycle_stage tracking: CREATED, SETTINGS, IN_PROGRESS, COMPLETED
- [ ] T192 [US5] Test /progress endpoint returns correct status for all states

### Backend: Terminal Status Detection

- [ ] T193 [P] [US5] Implement terminal status detection utility in olorin-server/app/utils/investigation_utils.py
- [ ] T194 [P] [US5] Define terminal statuses: COMPLETED, ERROR, CANCELLED
- [ ] T195 [US5] Test terminal status detection function
- [ ] T196 [US5] Verify terminal status returned in /progress response

### Frontend: Status Lifecycle Handler

- [ ] T197 [P] [US5] Implement isTerminalStatus utility in olorin-front/src/shared/utils/investigationUtils.ts
- [ ] T198 [P] [US5] Update useProgressData hook to stop polling on terminal status
- [ ] T199 [US5] Test polling stops when status is terminal
- [ ] T200 [US5] Test ETag cache cleared on completion
- [ ] T201 [US5] Test retry mechanism doesn't restart after terminal status

### Frontend: UI State Transitions

- [ ] T202 [P] [US5] Create InvestigationStatusBadge component in olorin-front/src/microservices/investigation/components/InvestigationStatusBadge.tsx
- [ ] T203 [P] [US5] Create status color mapping: pending(gray), running(blue), completed(green), failed(red), cancelled(orange)
- [ ] T204 [P] [US5] Create StatusTimeline component in olorin-front/src/microservices/investigation/components/StatusTimeline.tsx
- [ ] T205 [US5] Test InvestigationStatusBadge displays correct status and color
- [ ] T206 [US5] Test StatusTimeline shows all status transitions

### Frontend: Final State Display

- [ ] T207 [US5] Create CompletedInvestigationView component in olorin-front/src/microservices/investigation/components/CompletedInvestigationView.tsx
- [ ] T208 [US5] Create FailedInvestigationView component in olorin-front/src/microservices/investigation/components/FailedInvestigationView.tsx
- [ ] T209 [US5] Display final metrics, results, and error details
- [ ] T210 [US5] Test CompletedInvestigationView shows final results
- [ ] T211 [US5] Test FailedInvestigationView shows errors with details

### Frontend: Integration

- [ ] T212 [US5] Update InvestigationProgressContainer to handle all lifecycle states
- [ ] T213 [US5] Test container displays correct view for each status
- [ ] T214 [US5] Test transitions between views
- [ ] T215 [US5] Integration test: Create→Run→Complete flow with state transitions

### Testing & Documentation

- [ ] T216 [US5] Create unit tests for status mapping
- [ ] T217 [US5] Create unit tests for terminal status detection
- [ ] T218 [US5] Create component tests for status display
- [ ] T219 [US5] Create integration test for full lifecycle
- [ ] T220 [US5] Document lifecycle state machine in docs/investigation-lifecycle.md
- [ ] T221 [US5] Git commit: "T221: Implement US5 - Investigation lifecycle management"

**Parallel Opportunities**: T189-T191, T193-T194, T197-T198, T202-T204, T207-T208

**Dependencies**: Requires US1 completion (progress data)

---

## Phase 8: Cross-Cutting Concerns & Polish (Weeks 7-8)

### Phase Goal
Performance optimization, security validation, monitoring, deployment readiness, and comprehensive testing.

### Performance Optimization

- [ ] T222 [P] Profile /progress endpoint response time (target <200ms p95)
- [ ] T223 [P] Profile /events endpoint response time (target <200ms p95)
- [ ] T224 [P] Profile SSE streaming latency (target <1s end-to-end)
- [ ] T225 Optimize database queries (add missing indexes if needed)
- [ ] T226 Implement database query caching where appropriate
- [ ] T227 Profile frontend hook rendering performance
- [ ] T228 Optimize component re-renders (memoization where needed)

### Security & Authorization

- [ ] T229 [P] Verify all endpoints enforce authorization (require_read_or_dev)
- [ ] T230 [P] Test user cannot access other users' investigations
- [ ] T231 Verify no sensitive data leakage in error responses
- [ ] T232 Verify no data exposure in 304 responses
- [ ] T233 Implement rate limiting for polling requests (if needed)

### Monitoring & Observability

- [ ] T234 [P] Add logging to /progress endpoint (request/response)
- [ ] T235 [P] Add logging to /events endpoint (cursor, pagination)
- [ ] T236 [P] Add logging to SSE streaming (connections, disconnections)
- [ ] T237 Add structured logging for performance metrics
- [ ] T238 Document logging format and levels
- [ ] T239 Create monitoring dashboard queries for key metrics

### Error Handling & Edge Cases

- [ ] T240 [P] Test corrupted progress_json handling (doesn't crash)
- [ ] T241 [P] Test missing ETag header handling
- [ ] T242 [P] Test expired cursor handling
- [ ] T243 Test concurrent requests to same investigation
- [ ] T244 Test high volume event pagination
- [ ] T245 Test multi-tab coordination with many tabs (10+)
- [ ] T246 Test network reconnection scenarios

### Documentation

- [ ] T247 Create comprehensive API documentation in docs/API.md
- [ ] T248 Create deployment guide in docs/DEPLOYMENT.md
- [ ] T249 Create troubleshooting guide in docs/TROUBLESHOOTING.md
- [ ] T250 Create performance tuning guide in docs/PERFORMANCE.md
- [ ] T251 Update README.md with feature overview

### Testing Coverage

- [ ] T252 Verify backend test coverage >80% for all services
- [ ] T253 Verify frontend test coverage >80% for all components
- [ ] T254 Verify integration test coverage for all user stories
- [ ] T255 Run full test suite and verify all tests pass
- [ ] T256 Create E2E test scenario: Full investigation lifecycle

### Final Validation

- [ ] T257 [P] Verify all 12 success criteria met from spec.md
- [ ] T258 [P] Verify all 15 functional requirements implemented
- [ ] T259 [P] Verify all 8 edge cases handled
- [ ] T260 Verify no mock/stub implementations (only real data)
- [ ] T261 Verify no hardcoded values (all from environment)
- [ ] T262 Run code quality checks (linting, type checking)
- [ ] T263 Create deployment checklist

### Final Commits & Release

- [ ] T264 Git commit: "T264: Cross-cutting concerns - performance, security, monitoring"
- [ ] T265 Git commit: "T265: Comprehensive testing and documentation"
- [ ] T266 Create release notes for feature
- [ ] T267 Merge feature branch to main (after review)

**Parallel Opportunities**: T222-T226, T229-T232, T234-T236

**Prerequisites**: All user story phases (3-7) must be complete

---

## Implementation Strategy

### MVP Scope (Weeks 1-4, 35 tasks)

Deploy **User Stories 1-2** for immediate value:
- Real-time progress monitoring (US1)
- Event pagination with audit trail (US2)

**MVP Deliverables**:
- ✅ SSE streaming with polling (automatic, not yet fallback)
- ✅ Progress updates in <1 second
- ✅ Event pagination with cursor
- ✅ ETag caching for 304 responses
- ✅ Core UI components (progress bar, phase display, tool status)

**MVP Acceptance Criteria**: All 20 acceptance scenarios from US1-US2 pass

### Post-MVP Enhancements (Weeks 5-7, 27 tasks)

Add production resilience and monitoring:
- SSE→Polling automatic fallback (US3)
- Real-time metrics display (US4)
- Lifecycle management (US5)

**Post-MVP Acceptance Criteria**: All 20 acceptance scenarios from US3-US5 pass

### Cross-Cutting (Week 8, Polish & Performance)

Performance optimization, security validation, comprehensive testing

---

## Dependency Graph

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational Services - BLOCKING for all stories)
    ├── US1 (Real-Time Progress) [MVP-Critical]
    │   ├── Models & Endpoints (T040-T048)
    │   ├── ETag Support (T049-T053)
    │   ├── SSE Streaming (T054-T060)
    │   ├── Frontend Hooks (T061-T065)
    │   ├── Components (T066-T073)
    │   └── Integration (T074-T082)
    │
    ├── US2 (Event Pagination) [MVP-Critical, parallel with US1]
    │   ├── Event Models (T083-T087)
    │   ├── Pagination Logic (T088-T100)
    │   ├── ETag Support (T101-T105)
    │   ├── Frontend Service (T109-T113)
    │   ├── Pagination Hook (T114-T118)
    │   ├── Components (T119-T125)
    │   └── Integration (T126-T134)
    │
    ├── US3 (Fallback) [Post-MVP, requires US1]
    │   ├── SSE Resilience (T135-T138)
    │   ├── Fallback Detection (T139-T146)
    │   ├── Exponential Backoff (T147-T150)
    │   ├── Multi-Tab (T151-T153)
    │   └── Integration (T154-T161)
    │
    ├── US4 (Metrics) [Post-MVP, requires US1]
    │   ├── Metrics Calculation (T162-T167)
    │   ├── Backend Response (T168-T170)
    │   ├── Components (T171-T183)
    │   └── Integration (T179-T188)
    │
    └── US5 (Lifecycle) [Post-MVP, requires US1]
        ├── Status Mapping (T189-T192)
        ├── Terminal Detection (T193-T196)
        ├── Frontend Handler (T197-T201)
        ├── Status UI (T202-T211)
        └── Integration (T212-T221)

Phase 8 (Polish & Performance) [After all user stories]
    ├── Performance (T222-T228)
    ├── Security (T229-T233)
    ├── Monitoring (T234-T239)
    ├── Error Handling (T240-T246)
    ├── Documentation (T247-T251)
    ├── Testing (T252-T263)
    └── Release (T264-T267)
```

---

## Parallel Execution Examples

### Week 1 (Setup Phase)
```
Backend Team              Frontend Team             Database/DevOps
├─ T001: Structure       ├─ T002: Structure        ├─ T005: Schema
├─ T003: Env Config      ├─ T004: Env Config       ├─ T006: Audit Log
├─ T012: Services        ├─ T013: Hooks            ├─ T007: Indexes
└─ T014: Commit          └─ Commit                 ├─ T008: Indexes
                                                    └─ T009-T011: Setup
```

### Week 2-3 (Foundational + US1 Backend)
```
Backend                           Frontend
├─ T015-T025: Foundational       ├─ T026-T032: Foundational
├─ T040-T048: Progress Models    ├─ T061: useProgressData
├─ T049-T053: ETag              ├─ T066-T069: Components
├─ T054-T060: SSE               └─ T074-T077: Integration
└─ T079-T082: Testing & Docs
```

### Week 3-4 (US1 Complete + US2 Backend)
```
Backend                           Frontend
├─ US1 Complete                  ├─ US1 Complete
├─ T083-T100: Event Pagination  ├─ T109-T117: Services & Hooks
├─ T101-T105: Events ETag        ├─ T119-T125: Components
└─ T106-T134: Testing & Docs     └─ T126-T134: Integration
```

---

## Task Status Tracking

- [ ] **Total Tasks**: 267
- [ ] **By User Story**:
  - Setup & Foundational (Phase 1-2): 39 tasks
  - User Story 1 (Phase 3): 44 tasks
  - User Story 2 (Phase 4): 52 tasks
  - User Story 3 (Phase 5): 27 tasks
  - User Story 4 (Phase 6): 27 tasks
  - User Story 5 (Phase 7): 33 tasks
  - Cross-Cutting (Phase 8): 46 tasks

- [ ] **By Parallelization**: ~40% of tasks marked [P] for parallel execution

---

## Success Metrics

### Definition of Done (per task)
- [ ] Code written following style guide
- [ ] Unit tests pass
- [ ] Code reviewed (if applicable)
- [ ] Integrated with existing code (no conflicts)
- [ ] Documentation updated

### Acceptance Criteria (per User Story)
- [ ] All acceptance scenarios pass
- [ ] Independent test criteria met
- [ ] Performance targets met
- [ ] Security validated
- [ ] No regressions in existing functionality

### Overall Feature Success
- [ ] All 62 tasks complete
- [ ] All 12 success criteria from spec met
- [ ] All 15 functional requirements implemented
- [ ] All 8 edge cases handled
- [ ] Zero hardcoded values (all configuration)
- [ ] Zero mock implementations (real data only)
- [ ] Test coverage >80%
- [ ] Performance targets met (<200ms p95, <30ms 304s, <1s SSE)

---

**Task Generation Complete**: 2025-11-06  
**Status**: Ready for implementation  
**Estimated Team Velocity**: 8-10 weeks (cross-functional, includes testing & docs)


