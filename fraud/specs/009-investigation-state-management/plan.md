# Implementation Plan: Investigation State Management - Event-Sourced Architecture with Cursor-Based Polling

**Branch**: `001-investigation-state-management` | **Date**: 2025-11-04 | **Spec**: `/specs/001-investigation-state-management/spec.md`
**Input**: Feature specification with 7 user stories, 15 functional requirements, and 10 measurable success criteria

## Summary

Replace the current polling-based `/progress` endpoint architecture with a robust event-sourced system featuring cursor-based changes feeds, conditional requests (ETags), and optional Server-Sent Events (SSE). The Olorin codebase already has comprehensive foundational infrastructure in place: investigation state persistence, optimistic locking, audit logging, and polling endpoints. This implementation focuses on **integrating and enhancing existing infrastructure** rather than building from scratch, adding cursor-based event feeds, SSE real-time streaming, multi-tab coordination, and advanced polling strategies.

## Technical Context

**Language/Version**: Python 3.11 (backend), TypeScript 5.x (frontend)
**Backend Dependencies**: FastAPI, SQLAlchemy, Pydantic, pytest
**Frontend Dependencies**: React 18+, TypeScript, Tailwind CSS, React Hooks
**Storage**: SQLite (dev) / PostgreSQL (prod) - existing `investigation_states` and `investigation_audit_log` tables
**Testing**: pytest (backend), Jest/Vitest (frontend)
**Target Platform**: Web application (React frontend, FastAPI backend)
**Project Type**: Full-stack (web)
**Performance Goals**:
  - Snapshot retrieval: <100ms P95
  - Events-to-visibility: ≤15s P95 active, ≤60s idle
  - 304 Not Modified ratio: 80% during idle periods
  - SSE latency: <5s for real-time progress

**Constraints**:
  - Maintain backward compatibility with existing polling endpoints
  - No database schema changes (schema-locked mode)
  - All code files <200 lines
  - Zero mocks/stubs in production code
  - Full test coverage (87%+ minimum)

**Scale/Scope**:
  - 10,000+ concurrent investigation views
  - Support for multi-tab coordination
  - Rate limiting: 60 requests/min per user
  - Audit trail immutability

## Constitution Check

✅ **GATE PASSED**: No constitutional violations. The implementation:
- Uses existing infrastructure (no new libraries or unwarranted complexity)
- Maintains test-first approach (tests generated for each endpoint)
- Follows separation of concerns (service layer → router layer → schema layer)
- Ensures observability (comprehensive logging and audit trails)
- Schema-locked (no DDL changes required)

## Project Structure

### Documentation (this feature)

```text
specs/001-investigation-state-management/
├── spec.md              # Feature specification (7 stories, 15 reqs, 10 success criteria)
├── plan.md              # This file (implementation approach and phases)
├── research.md          # Phase 0: Technical research and architecture decisions
├── data-model.md        # Phase 1: Event schema, cursor structure, response models
├── quickstart.md        # Phase 1: Test scenarios and integration examples
├── contracts/           # Phase 1: API contracts for cursor feed, SSE, polling
│   ├── cursor-events.md
│   ├── adaptive-polling.md
│   ├── sse-realtime.md
│   └── optimistic-concurrency.md
└── tasks.md             # Phase 2: Actionable implementation tasks (T001-T025)
```

### Source Code (existing structure preserved)

```text
olorin-server/ (Backend)
├── app/
│   ├── models/
│   │   ├── investigation_state.py       # ✅ EXISTS
│   │   ├── investigation_audit_log.py   # ✅ EXISTS
│   │   └── progress_models.py           # ✅ EXISTS
│   ├── service/
│   │   ├── investigation_state_service.py  # ✅ EXISTS
│   │   ├── polling_service.py           # ✅ EXISTS (will be enhanced)
│   │   └── investigation_progress_service.py  # NEW: real-time progress
│   ├── router/
│   │   ├── investigation_state_router.py    # ✅ EXISTS
│   │   ├── polling_router.py            # ✅ EXISTS (will be enhanced)
│   │   └── investigation_stream_router.py   # NEW: WebSocket/SSE
│   └── schemas/
│       ├── investigation_state.py       # ✅ EXISTS
│       └── event_models.py              # NEW: cursor events, deltas
├── test/
│   ├── unit/
│   │   ├── test_polling_service.py      # NEW: adaptive polling tests
│   │   └── test_event_ordering.py       # NEW: cursor and ordering tests
│   └── integration/
│       ├── test_polling_flow.py         # NEW: E2E polling scenarios
│       └── test_sse_fallback.py         # NEW: SSE with fallback

olorin-front/ (Frontend)
├── src/
│   ├── microservices/investigation/
│   │   ├── hooks/
│   │   │   ├── useInvestigationLogs.ts      # ✅ EXISTS
│   │   │   ├── useInvestigationPhases.ts    # ✅ EXISTS
│   │   │   ├── useProgressData.ts           # ✅ EXISTS (will be enhanced)
│   │   │   ├── useAdaptivePolling.ts        # NEW: adaptive intervals
│   │   │   ├── useEventDeduplication.ts     # NEW: event dedup logic
│   │   │   ├── useCursorStorage.ts          # NEW: localStorage cursor mgmt
│   │   │   └── useWebSocketFallback.ts      # NEW: SSE with fallback
│   │   ├── contexts/
│   │   │   └── InvestigationContext.tsx     # ✅ EXISTS
│   │   ├── services/
│   │   │   └── investigationApiService.ts   # NEW: typed HTTP client
│   │   └── pages/
│   │       ├── ProgressPage.tsx             # ✅ EXISTS
│   │       └── ResultsPage.tsx              # ✅ EXISTS
│   └── shared/
│       └── components/
│           └── PollingStatusIndicator.tsx   # NEW: last update time
└── test/
    ├── unit/
    │   ├── useAdaptivePolling.test.ts       # NEW: interval calculation
    │   └── useEventDeduplication.test.ts    # NEW: dedup logic
    └── integration/
        ├── polling-flow.test.ts             # NEW: E2E scenario
        └── sse-fallback.test.ts             # NEW: connection recovery
```

**Structure Decision**: Existing architecture is sound. Implementation focuses on enhancing service layers (polling, progress tracking), adding new services (real-time, WebSocket), and creating frontend hooks for advanced polling strategies. No structural reorganization needed.

## Implementation Phases

### Phase 0: Research & Architecture (Week 0)
- Finalize cursor format (timestamp + sequence)
- Document event schema and versioning strategy
- Design multi-tab coordination approach (BroadcastChannel vs SharedWorker)
- Verify SSE fallback mechanism
- **Output**: research.md

### Phase 1: Design & Contracts (Week 0-1)
- Define event schema with unique IDs
- Specify cursor pagination protocol
- Create API contracts for cursor feed, polling, SSE
- Design response models with version/ETag
- Plan progress calculation algorithm
- **Output**: data-model.md, contracts/, quickstart.md

### Phase 2: Backend Implementation (Week 1-2)
- Enhance PollingService: adaptive intervals, delta changes
- Create InvestigationProgressService: progress % calculation
- Add cursor-based events endpoint
- Implement WebSocket/SSE stream endpoint
- Add comprehensive event auditing
- **Tests**: Unit + integration for all new services

### Phase 3: Frontend Implementation (Week 2-3)
- Implement useAdaptivePolling hook
- Implement useEventDeduplication hook
- Implement useCursorStorage hook
- Enhance useProgressData for ETag caching
- Create SSE fallback mechanism
- **Tests**: Unit + integration for all hooks

### Phase 4: Integration & Polish (Week 3-4)
- E2E polling scenarios
- SSE ↔ polling fallback testing
- Rate limit handling and backoff
- Multi-tab coordination testing
- Performance benchmarking
- **Output**: Full test coverage (87%+)

## Complexity Tracking

> **No violations detected** - This is an enhancement to existing infrastructure with clear separation of concerns.

The implementation maintains simplicity by:
- Reusing existing state persistence layer
- Enhancing (not rewriting) existing polling service
- Adding new services only for cursor events and progress tracking
- Frontend hooks provide clean abstraction for polling complexity
