# Tasks: Live Merged Investigation Logstream

**Input**: Design documents from `/specs/021-live-merged-logstream/`
**Prerequisites**: plan.md, spec.md (6 user stories), research.md
**Branch**: `021-live-merged-logstream`

**Organization**: Tasks are grouped by user story (US1-US6) to enable independent implementation and testing of each story. US1 and US4 are P1 (critical MVP), US2, US3, US5 are P2, and US6 is P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `olorin-server/app/`
- **Frontend**: `olorin-front/src/`
- This is a web application with separate backend and frontend

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for log streaming feature

- [ ] T001 Install backend dependencies: structlog, python-dateutil in olorin-server/pyproject.toml
- [ ] T002 Install frontend dependencies: react-window, zod in olorin-front/package.json
- [ ] T003 [P] Create configuration schema for log streaming in olorin-server/app/config/logstream_config.py
- [ ] T004 [P] Create TypeScript configuration schema in olorin-front/src/config/logstream-config.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create UnifiedLog Pydantic model in olorin-server/app/models/unified_log.py
- [ ] T006 [P] Create UnifiedLog TypeScript interface in olorin-front/src/shared/types/unified-log.ts
- [ ] T007 Create LogProvider base interface in olorin-server/app/services/log_providers/base.py
- [ ] T008 [P] Implement FrontendLogProvider (local-dev mode) in olorin-server/app/services/log_providers/frontend_provider.py
- [ ] T009 [P] Implement BackendLogProvider (local-dev mode) in olorin-server/app/services/log_providers/backend_provider.py
- [ ] T010 Create LogAggregatorService with min-heap merge in olorin-server/app/services/log_aggregator.py
- [ ] T011 Create LogDeduplicatorService with SHA-1 hashing in olorin-server/app/services/log_deduplicator.py
- [ ] T012 Create LogStreamRouter with SSE and polling endpoints in olorin-server/app/router/log_stream_router.py
- [ ] T013 [P] Create frontend logger utility with investigation_id injection in olorin-front/src/shared/services/frontendLogger.ts
- [ ] T014 [P] Create logStreamService API client in olorin-front/src/shared/services/logStreamService.ts
- [ ] T015 Add X-Investigation-Id middleware in olorin-server/app/middleware/investigation_correlation.py
- [ ] T016 [P] Configure PII redaction patterns in olorin-server/app/utils/pii_redaction.py
- [ ] T017 [P] Implement rate limiting for log endpoints in olorin-server/app/middleware/log_rate_limiter.py
- [ ] T018 Add environment variable validation with fail-fast on startup in olorin-server/app/config/logstream_validator.py

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Live Merged Logs During Investigation (Priority: P1) 🎯 MVP

**Goal**: Enable investigators to see live logs from both frontend and backend systems merged in real-time

**Independent Test**: Start investigation, open log viewer, verify logs from both sources appear within 2 seconds

### Implementation for User Story 1

- [ ] T019 [US1] Implement SSE event generator in olorin-server/app/services/sse_generator.py
- [ ] T020 [US1] Add GET /investigations/{id}/logs/stream endpoint with SSE response in olorin-server/app/router/log_stream_router.py
- [ ] T021 [US1] Implement heartbeat event emission (10s interval) in SSE generator
- [ ] T022 [US1] Add Last-Event-ID resume support in SSE endpoint
- [ ] T023 [P] [US1] Create useLogStream React hook for SSE connection in olorin-front/src/shared/hooks/useLogStream.ts
- [ ] T024 [P] [US1] Create LogEntry component with color-coded levels in olorin-front/src/microservices/investigation/components/LogEntry.tsx
- [ ] T025 [US1] Create LiveLogStream component with react-window virtualization in olorin-front/src/microservices/investigation/components/LiveLogStream.tsx
- [ ] T026 [US1] Implement autoscroll functionality in LiveLogStream component
- [ ] T027 [US1] Add POST /client-logs endpoint for frontend log ingestion in olorin-server/app/router/log_stream_router.py
- [ ] T028 [US1] Implement log merge with clock-skew tolerance (5-10s) in LogAggregatorService
- [ ] T029 [US1] Add deduplication during merge in LogAggregatorService
- [ ] T030 [US1] Integrate LiveLogStream into investigation page route

**Checkpoint**: At this point, User Story 1 should be fully functional - users can view live merged logs

---

## Phase 4: User Story 2 - Filter and Search Logs in Real-Time (Priority: P2)

**Goal**: Enable filtering by level and free-text search to focus on relevant information

**Independent Test**: Open log stream, apply ERROR filter, verify only ERROR logs shown

### Implementation for User Story 2

- [ ] T031 [P] [US2] Create useLogFilters hook for client-side filtering in olorin-front/src/shared/hooks/useLogFilters.ts
- [ ] T032 [P] [US2] Create LogFilters component with level dropdown in olorin-front/src/microservices/investigation/components/LogFilters.tsx
- [ ] T033 [US2] Add search input with debounce (500ms) to LogFilters component
- [ ] T034 [US2] Implement client-side log filtering by level in useLogFilters hook
- [ ] T035 [US2] Implement client-side text search across log messages in useLogFilters hook
- [ ] T036 [US2] Add minLevel query parameter support to GET /investigations/{id}/logs/stream endpoint
- [ ] T037 [US2] Implement server-side level filtering in LogAggregatorService
- [ ] T038 [US2] Update LiveLogStream to use filtered logs from useLogFilters

**Checkpoint**: User Story 2 complete - filtering and search work as expected

---

## Phase 5: User Story 3 - Pause, Resume, and Control Log Stream (Priority: P2)

**Goal**: Allow users to pause stream to examine specific entries, resume when ready

**Independent Test**: Pause stream, verify no new logs appear but connection stays alive, resume and verify logs flush

### Implementation for User Story 3

- [ ] T039 [P] [US3] Create LogStreamControls component with pause/resume buttons in olorin-front/src/microservices/investigation/components/LogStreamControls.tsx
- [ ] T040 [P] [US3] Add autoscroll toggle to LogStreamControls component
- [ ] T041 [US3] Implement pause functionality: stop UI updates but continue buffering in useLogStream hook
- [ ] T042 [US3] Implement resume functionality: flush buffered logs and continue updates in useLogStream hook
- [ ] T043 [US3] Add autoscroll auto-disable on user scroll up in LiveLogStream component
- [ ] T044 [US3] Add autoscroll re-enable when scrolled to bottom in LiveLogStream component
- [ ] T045 [US3] Integrate LogStreamControls into LiveLogStream component

**Checkpoint**: User Story 3 complete - pause/resume and autoscroll control work as expected

---

## Phase 6: User Story 4 - Recover from Connection Failures (Priority: P1) 🎯 Critical Reliability

**Goal**: Ensure log stream automatically recovers from network interruptions and falls back to polling if SSE fails

**Independent Test**: Simulate network interruption, verify logs resume from correct position without gaps

### Implementation for User Story 4

- [ ] T046 [US4] Implement exponential backoff reconnection (3s, 6s, 12s, max 30s) in useLogStream hook
- [ ] T047 [US4] Add SSE error handling with failure counter (threshold: 3 failures) in useLogStream hook
- [ ] T048 [P] [US4] Create useLogPolling hook for polling fallback in olorin-front/src/shared/hooks/useLogPolling.ts
- [ ] T049 [US4] Implement GET /investigations/{id}/logs endpoint with cursor pagination in olorin-server/app/router/log_stream_router.py
- [ ] T050 [US4] Add ETag support for 304 Not Modified responses in polling endpoint
- [ ] T051 [US4] Implement cursor generation (timestamp#seq format) in polling endpoint
- [ ] T052 [US4] Add automatic fallback to polling when SSE fails in useLogStream hook
- [ ] T053 [US4] Add connection status indicator (connected/polling/error) to LiveLogStream component
- [ ] T054 [US4] Implement gap detection and logging for debugging in useLogStream hook

**Checkpoint**: User Story 4 complete - reliable connection with automatic recovery and fallback

---

## Phase 7: User Story 5 - View Historical Logs on Page Load (Priority: P2)

**Goal**: Show recent historical logs immediately on page load, then start live stream

**Independent Test**: Open investigation with existing logs, verify historical logs load first, then live stream starts

### Implementation for User Story 5

- [ ] T055 [US5] Implement backfill logic in useLogStream hook: fetch historical logs via polling endpoint before starting SSE
- [ ] T056 [US5] Add loading state during historical log fetch in LiveLogStream component
- [ ] T057 [US5] Implement seamless transition from historical to live logs in useLogStream hook
- [ ] T058 [US5] Add cursor tracking for Last-Event-ID to resume live stream from last historical log
- [ ] T059 [US5] Handle page refresh: rehydrate with latest historical logs and resume stream

**Checkpoint**: User Story 5 complete - historical logs load before live streaming begins

---

## Phase 8: User Story 6 - Copy and Export Log Data (Priority: P3)

**Goal**: Allow users to copy individual log entries or export filtered logs

**Independent Test**: Click copy JSON on log entry, verify clipboard contains valid JSON

### Implementation for User Story 6

- [ ] T060 [P] [US6] Add "Copy JSON" button to LogEntry component
- [ ] T061 [P] [US6] Implement clipboard copy functionality using navigator.clipboard API
- [ ] T062 [US6] Add "Export visible logs" button to LogStreamControls component
- [ ] T063 [US6] Implement JSON file download with filtered/visible logs only
- [ ] T064 [US6] Add success notification on copy/export actions

**Checkpoint**: User Story 6 complete - copy and export functionality works as expected

---

## Phase 9: Integration & Polish

**Purpose**: Cross-story integration, performance optimization, and production readiness

- [ ] T065 [P] Add unit tests for LogAggregatorService in olorin-server/app/test/unit/service/test_log_aggregator.py
- [ ] T066 [P] Add unit tests for LogDeduplicatorService in olorin-server/app/test/unit/service/test_log_deduplicator.py
- [ ] T067 [P] Add unit tests for LogProvider implementations in olorin-server/app/test/unit/service/log_providers/
- [ ] T068 [P] Add unit tests for useLogStream hook in olorin-front/src/shared/hooks/__tests__/useLogStream.test.ts
- [ ] T069 [P] Add unit tests for useLogPolling hook in olorin-front/src/shared/hooks/__tests__/useLogPolling.test.ts
- [ ] T070 [P] Add unit tests for useLogFilters hook in olorin-front/src/shared/hooks/__tests__/useLogFilters.test.ts
- [ ] T071 Add integration test for SSE connection and log streaming in olorin-server/app/test/integration/test_log_stream.py
- [ ] T072 Add integration test for polling fallback in olorin-server/app/test/integration/test_log_polling.py
- [ ] T073 Add Playwright E2E test for complete log viewing flow in olorin-front/tests/e2e/logstream.spec.ts
- [ ] T074 Add Playwright test for SSE reconnection with Last-Event-ID
- [ ] T075 Add Playwright test for filtering and search functionality
- [ ] T076 [P] Create .env.example with all log streaming config keys in olorin-server/.env.example
- [ ] T077 [P] Create .env.example with all frontend config keys in olorin-front/.env.example
- [ ] T078 Add configuration validation tests in olorin-server/app/test/unit/config/test_logstream_validator.py
- [ ] T079 [P] Create quickstart documentation in specs/021-live-merged-logstream/quickstart.md
- [ ] T080 [P] Document cloud provider stubs (Sentry, Datadog, ELK, CloudWatch) in specs/021-live-merged-logstream/cloud-providers.md
- [ ] T081 Add performance benchmarking script for 10,000 log entries in olorin-front/scripts/benchmark-logstream.ts
- [ ] T082 Add memory leak detection tests for long-running streams in olorin-front/tests/performance/memory-leak.test.ts
- [ ] T083 Implement /health endpoint with provider status checks in olorin-server/app/router/log_stream_router.py
- [ ] T084 Add metrics for stream QPS, merge lag, dedupe hits, SSE reconnects in olorin-server/app/services/log_metrics.py
- [ ] T085 [P] Add PII redaction unit tests in olorin-server/app/test/unit/utils/test_pii_redaction.py
- [ ] T086 [P] Add rate limiting unit tests in olorin-server/app/test/unit/middleware/test_log_rate_limiter.py
- [ ] T087 Verify all files are under 200 lines (break down if needed)
- [ ] T088 Run tox linting and type checking on all Python files
- [ ] T089 Run ESLint and TypeScript checks on all frontend files
- [ ] T090 Verify no hardcoded values remain (all externalized to config)

---

## Parallel Execution Examples

### Backend Core Services (Can run in parallel)
```bash
# T008, T009, T011 can run in parallel - different files
Task(subagent_type="backend-architect", description="Implement FrontendLogProvider", ...)
Task(subagent_type="backend-architect", description="Implement BackendLogProvider", ...)
Task(subagent_type="backend-architect", description="Create LogDeduplicatorService", ...)
```

### Frontend Hooks (Can run in parallel)
```bash
# T023, T031, T048 can run in parallel - different files
Task(subagent_type="react-expert", description="Create useLogStream hook", ...)
Task(subagent_type="react-expert", description="Create useLogFilters hook", ...)
Task(subagent_type="react-expert", description="Create useLogPolling hook", ...)
```

### Frontend Components (Can run in parallel)
```bash
# T024, T032, T039 can run in parallel - different files
Task(subagent_type="react-expert", description="Create LogEntry component", ...)
Task(subagent_type="react-expert", description="Create LogFilters component", ...)
Task(subagent_type="react-expert", description="Create LogStreamControls component", ...)
```

### Test Suite (Can run in parallel)
```bash
# T065, T066, T067, T068, T069, T070 can all run in parallel - different test files
Task(subagent_type="test-writer-fixer", description="Unit tests for LogAggregatorService", ...)
Task(subagent_type="test-writer-fixer", description="Unit tests for LogDeduplicatorService", ...)
# ... etc
```

---

## Task Dependencies Summary

- **T001-T004**: No dependencies (setup)
- **T005-T018**: Foundation tasks, some can run in parallel ([P] marked)
- **T019-T030**: US1 tasks, depends on T005-T018 foundation
- **T031-T038**: US2 tasks, depends on US1 (T019-T030)
- **T039-T045**: US3 tasks, depends on US1 (T019-T030)
- **T046-T054**: US4 tasks, depends on US1 (T019-T030) and partial US2 (T048 needs polling)
- **T055-T059**: US5 tasks, depends on US1 and US4 (needs polling)
- **T060-T064**: US6 tasks, depends on US1 only (independent of US2-US5)
- **T065-T090**: Polish tasks, can mostly run in parallel after implementation

---

## Critical Success Factors

1. **Foundation First**: Complete T005-T018 before any US implementation
2. **US1 is Blocking**: US1 must be complete before US2-US6 can start
3. **US4 Priority**: Implement US4 early for production reliability
4. **Testing**: Run tests after each user story completion
5. **Configuration**: Verify no hardcoded values in T090
6. **File Size**: Keep all files under 200 lines per T087

---

## Estimated Effort

- **Phase 1-2 (Foundation)**: ~8-10 hours
- **Phase 3 (US1 - MVP)**: ~12-15 hours
- **Phase 4 (US2)**: ~4-6 hours
- **Phase 5 (US3)**: ~3-4 hours
- **Phase 6 (US4 - Critical)**: ~8-10 hours
- **Phase 7 (US5)**: ~3-4 hours
- **Phase 8 (US6)**: ~2-3 hours
- **Phase 9 (Polish)**: ~10-12 hours

**Total**: ~50-64 hours

---

## Notes

- All tasks follow SYSTEM MANDATE: no hardcoded values, no mocks/stubs, configuration-driven
- PII redaction is mandatory server-side (T016)
- Rate limiting prevents abuse (T017)
- Virtualized scrolling ensures 60fps performance with 10,000+ logs (T025)
- SSE with polling fallback ensures 99.9% reliability (US4)
- Each user story is independently testable
- Tasks are ordered by dependencies for optimal execution
