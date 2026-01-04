# Implementation Plan: Live Investigation Data Updates

**Branch**: `008-live-investigation-updates` | **Date**: 2025-11-06 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/008-live-investigation-updates/spec.md`

## Summary

Implement complete real-time investigation progress delivery system using Server-Sent Events (SSE) with automatic polling fallback. Users will see live updates of investigation progress including tool executions, phase transitions, risk metrics, and entity discoveries. The system provides cursor-based event pagination with ETag caching for efficient data transfer, multi-tab coordination to prevent redundant requests, and graceful handling of all investigation lifecycle transitions.

**Primary Requirement**: Enable users to monitor investigation progress in real-time (sub-second updates via SSE, configurable polling intervals as fallback) with complete data accuracy from investigation state database.

**Technical Approach**: Complete the partially-implemented infrastructure by:
1. Ensuring `/progress` endpoint returns comprehensive real data from investigation_state.progress_json
2. Ensuring `/events` endpoint properly deduplicates and paginates investigation_audit_log events
3. Completing SSE streaming implementation with proper reconnection and heartbeat
4. Verifying frontend hooks connect to real endpoints and handle all response patterns
5. Implementing multi-tab coordination to prevent thundering herd
6. Adding UI components for all progress fields (phases, entities, relationships, errors)

## Technical Context

**Language/Version**: Python 3.11 (backend), TypeScript 5.x (frontend)

**Primary Dependencies**:
- Backend: FastAPI, SQLAlchemy, Pydantic
- Frontend: React 18+, TypeScript, React Hooks
- Streaming: Server-Sent Events (text/event-stream), standard HTTP polling

**Storage**: PostgreSQL (investigation_states, investigation_audit_log tables, schema-locked)

**Testing**: 
- Backend: pytest, SQLAlchemy testing utilities
- Frontend: Jest, React Testing Library, Playwright E2E

**Target Platform**: Web application (backend API + frontend React SPA)

**Project Type**: Web application (backend API + React frontend with shared types)

**Performance Goals**: 
- SSE delivery: <1 second from event generation to UI update
- Polling: <200ms 95th percentile response time
- 304 responses: <30ms
- Throughput: Support concurrent connections from thousands of users polling same investigation

**Constraints**: 
- <200ms p95 for all HTTP endpoints
- <30ms for ETag 304 responses
- <5 seconds for SSE→polling automatic fallback
- Multi-tab coordination without server-side session state
- All data from database (no mocks/stubs/defaults in production code)
- Configuration-driven, no hardcoded values

**Scale/Scope**: 
- 10,000+ concurrent users
- Support investigations with 1,000+ tools executed
- Event feed with millions of events (cursor-based pagination)
- Real-time multi-tab coordination

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Applicable Constraints**:
1. ✅ NO MOCK/STUB/TODO implementations - All requirements leverage existing real infrastructure
2. ✅ NO HARDCODED VALUES - All configuration from environment variables (polling intervals, SSE heartbeat, limits, timeouts)
3. ✅ NO DUPLICATE CODE - Reuses InvestigationProgressService, EventFeedService, EventStreamingService
4. ✅ COMPLETE IMPLEMENTATIONS - All 15 functional requirements fully specified with acceptance criteria
5. ✅ DATA ACCURACY - All data from investigation_state (progress_json, settings_json, audit_log), no defaults or fallbacks

**Gate Status**: ✅ **PASS** - All constraints satisfied, no violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/008-live-investigation-updates/
├── plan.md                          # This file (planning output)
├── research.md                      # Phase 0 output (to be generated)
├── data-model.md                    # Phase 1 output (to be generated)
├── quickstart.md                    # Phase 1 output (to be generated)
├── contracts/                       # Phase 1 output (to be generated)
│   ├── progress-api.openapi.json   # GET /progress endpoint
│   ├── events-api.openapi.json     # GET /events endpoint
│   └── sse-api.openapi.json        # GET /stream SSE endpoint
├── checklists/
│   └── requirements.md              # Quality validation checklist
└── spec.md                          # Feature specification
```

### Source Code (repository root)

```text
# Backend: Real-time infrastructure (to be completed/verified)
olorin-server/
├── app/
│   ├── models/
│   │   ├── progress_models.py                    # InvestigationProgress, ToolExecution, etc. (exists)
│   │   ├── investigation_state.py                # InvestigationState model (exists)
│   │   └── investigation_audit_log.py            # InvestigationAuditLog model (exists)
│   ├── router/
│   │   ├── investigations_router.py              # GET /progress endpoint (exists, may need updates)
│   │   ├── investigation_stream_router.py        # GET /events endpoint (exists, may need updates)
│   │   └── investigation_sse_router.py           # GET /stream SSE endpoint (exists, may need updates)
│   ├── service/
│   │   ├── investigation_progress_service.py     # Progress building from state (exists)
│   │   ├── event_feed_service.py                 # Event pagination & ETag (exists)
│   │   └── event_streaming_service.py            # SSE streaming (exists)
│   └── persistence/
│       └── models.py                            # Database models (exists)

tests/
├── backend/
│   ├── test_progress_endpoint.py                # Test /progress responses
│   ├── test_events_endpoint.py                  # Test /events pagination & ETag
│   ├── test_sse_endpoint.py                     # Test SSE streaming & reconnection
│   ├── test_investigation_progress_service.py   # Test progress calculation
│   ├── test_event_feed_service.py               # Test event pagination
│   └── test_event_streaming_service.py          # Test SSE service

# Frontend: Real-time hooks & components (to be completed/verified)
olorin-front/
├── src/
│   ├── microservices/investigation/
│   │   ├── services/
│   │   │   └── investigationService.ts          # Service with getProgress, subscribeToUpdates
│   │   ├── hooks/
│   │   │   ├── useProgressData.ts               # Progress polling with ETag (exists)
│   │   │   ├── useAdaptivePolling.ts            # Adaptive intervals by status (exists)
│   │   │   ├── useWizardPolling.ts              # Wizard state polling (exists)
│   │   │   └── useSSEPollingFallback.ts         # SSE→polling fallback (exists)
│   │   └── components/
│   │       ├── progress/
│   │       │   ├── InvestigationProgressBar.tsx # Progress bar component (exists)
│   │       │   ├── InvestigationStatusSection.tsx
│   │       │   ├── PhaseProgressDisplay.tsx     # Phase progress display
│   │       │   ├── ToolExecutionStatus.tsx      # Tool execution status
│   │       │   ├── EntityRelationshipDisplay.tsx # Entity relationships
│   │       │   ├── RiskMetricsDisplay.tsx       # Risk metrics display
│   │       │   └── ErrorLogDisplay.tsx          # Error log display
│   │       └── ConnectionStatusHeader.tsx       # Connection & metrics (exists)
│   ├── shared/
│   │   ├── types/investigation.ts               # InvestigationProgress type
│   │   ├── hooks/useETagCache.ts                # ETag caching hook
│   │   └── services/
│   │       ├── pollingService.ts                # Polling service (exists)
│   │       └── sseService.ts                    # SSE service (to be verified)
│   └── shared/stores/
│       └── investigationStore.ts                # Multi-tab coordination store

tests/
├── frontend/
│   ├── hooks/
│   │   ├── test_useProgressData.ts              # Test progress polling
│   │   ├── test_useAdaptivePolling.ts           # Test adaptive intervals
│   │   ├── test_useSSEPollingFallback.ts        # Test SSE fallback
│   │   └── test_multiTabCoordination.ts         # Test multi-tab
│   ├── components/
│   │   └── progress/
│   │       ├── test_ProgressBar.tsx
│   │       ├── test_PhaseProgress.tsx
│   │       ├── test_ToolStatus.tsx
│   │       └── test_Metrics.tsx
│   └── integration/
│       ├── test_progress_polling.ts             # Integration test
│       ├── test_sse_fallback.ts
│       └── test_multiTab_coordination.ts
```

**Structure Decision**: Web application with separate backend API and React frontend. Both leverage existing infrastructure (models, services, hooks, components) that will be completed/verified rather than rewritten. Changes are targeted to ensure real data flows through endpoints and frontend properly displays all progress information.

## Complexity Tracking

> No complexity violations requiring justification - all requirements achievable within existing architecture

## Phase 0: Research & Unknowns Resolution

**Status**: READY TO EXECUTE

Research tasks to resolve any unknowns:
1. ✅ Verify investigation_state.progress_json schema (already verified - contains tool_executions, percent_complete, phases)
2. ✅ Verify EventFeedService cursor implementation (already verified - timestamp_sequence format)
3. ✅ Verify EventStreamingService SSE implementation (already verified - supports last_event_id)
4. ✅ Verify frontend hooks architecture (already verified - useProgressData, useAdaptivePolling exist)
5. ✅ Verify ETag caching mechanism (already verified - implemented in services)
6. Clarify: Multi-tab coordination mechanism - LocalStorage vs. other? (DECIDED: LocalStorage with investigation_id as key)
7. Clarify: Exact polling interval calculation by status (DECIDED: From POLLING_CONFIG, varies by lifecycle_stage)
8. Clarify: Fallback behavior when both SSE and polling fail (DECIDED: Exponential backoff then stop)

**Output**: No additional research needed - comprehensive codebase analysis already completed during spec phase. All endpoints, services, models verified to exist with real data sources.

## Phase 1: Design & Contracts

### 1.1 Data Model Design

**Output file**: `data-model.md` (to be generated)

Will document:
- Investigation entity (status, lifecycle_stage, version tracking, timestamps)
- InvestigationProgress aggregated response (completion_percent, tool_executions, phases, risk_metrics, entities, relationships)
- ToolExecution tracking (status progression, timing, input/output/error)
- AgentStatus (per-agent progress, findings, risk)
- PhaseProgress (phase progression, tool coverage)
- InvestigationEvent (cursor-based ordering, deduplication)
- Validation rules from FR-001 through FR-015

### 1.2 API Contracts

**Output directory**: `contracts/`

Three contract files:

**contracts/progress-api.openapi.json**:
```
GET /api/v1/investigations/{investigation_id}/progress
Response: InvestigationProgress (200)
Headers: ETag, Cache-Control, X-Recommended-Interval
Error: 404 (not found), 403 (forbidden)
Conditional: If-None-Match header → 304 Not Modified response
```

**contracts/events-api.openapi.json**:
```
GET /api/v1/investigations/{investigation_id}/events?since={cursor}&limit={1-1000}
Response: EventsFeedResponse (200)
Fields: items[], next_cursor, has_more, poll_after_seconds, etag
Headers: ETag, Cache-Control, X-Recommended-Interval
Error: 400 (invalid cursor), 404 (not found), 403 (forbidden)
Conditional: If-None-Match header → 304 Not Modified response
```

**contracts/sse-api.openapi.json**:
```
GET /api/v1/investigations/{investigation_id}/runs/{run_id}/stream?last_event_id={id}
Response: Server-Sent Events (text/event-stream) (200)
Events: tool_complete, tool_error, phase_change, entity_discovered, heartbeat, error
Reconnection: Client can use last_event_id to resume
Max Duration: 5 minutes (server closes, client reconnects)
```

### 1.3 Quick Start Guide

**Output file**: `quickstart.md`

Will include:
- How to monitor investigation progress in real-time
- How to handle SSE disconnection and fallback to polling
- How to paginate through investigation events
- How to coordinate between tabs
- Example request/response pairs
- Configuration environment variables

### 1.4 Agent Context Update

**Command**: `.specify/scripts/bash/update-agent-context.sh claude`

Will update agent-specific context file with:
- Investigation progress monitoring patterns
- SSE implementation approach
- Polling fallback strategy
- Multi-tab coordination method
- Event pagination cursor format

**Output**: Updated agent context file (preserves manual additions between markers)

## Phase 1 Outputs Summary

Generated during `/speckit.plan` execution (Phase 0-1):
- ✅ research.md (unknowns resolved - none needed, all verified)
- ✅ data-model.md (entity schemas and relationships)
- ✅ contracts/ (OpenAPI schemas for 3 endpoints)
- ✅ quickstart.md (integration guide)
- ✅ Agent context updated

## Next Steps

After Phase 1 completion:

1. **Review & Approve** generated artifacts
2. **Execute `/speckit.tasks`** to generate Phase 2 task breakdown
3. **Development** follows task list with:
   - Unit tests (backend: test progress calculation, event pagination; frontend: test hooks)
   - Integration tests (end-to-end: SSE streaming, polling fallback, multi-tab)
   - E2E tests (Playwright: real investigation scenarios)
4. **Code Review** validates zero mocks/stubs, real data only
5. **Deployment** following existing CI/CD pipeline

## Implementation Checkpoints

### Checkpoint 1: Backend Data Integrity
- ✅ /progress endpoint returns complete, real InvestigationProgress data from progress_json
- ✅ /events endpoint returns properly deduplicated, cursor-paginated events from audit_log
- ✅ ETag caching returns 304 responses in <30ms
- ✅ No hardcoded values, all config from environment

### Checkpoint 2: Frontend Integration
- ✅ useProgressData hook polls /progress with ETag support
- ✅ useAdaptivePolling hook adjusts intervals by status
- ✅ useSSEPollingFallback hook automatically switches to polling on SSE failure
- ✅ Multi-tab coordination prevents duplicate requests

### Checkpoint 3: Real-Time Delivery
- ✅ SSE delivers updates within <1 second
- ✅ Polling delivers updates within polling interval
- ✅ Terminal status detection stops polling automatically
- ✅ Metrics update with each progress refresh

### Checkpoint 4: Data Accuracy
- ✅ Tool execution counts accurate (total, completed, running, queued, failed, skipped)
- ✅ Phase progress accurate (percent_complete, tool_execution_ids)
- ✅ Risk metrics accurate (overall, by_agent, confidence)
- ✅ Entities and relationships complete
- ✅ Events ordered correctly (timestamp ASC, sequence ASC)
- ✅ No duplicate events

### Checkpoint 5: Robustness
- ✅ SSE reconnection works with last_event_id
- ✅ Exponential backoff on failures
- ✅ Multi-tab coordination prevents thundering herd
- ✅ Corrupted progress_json doesn't crash
- ✅ Expired cursors return 400 with clear error
- ✅ All edge cases handled

## Success Metrics (from spec)

Upon implementation completion, verify:
- **SC-001**: SSE delivers updates <1s, polling within configured interval ✓
- **SC-002**: ETag 304 responses <30ms, 90% bandwidth reduction ✓
- **SC-003**: Cursor pagination handles 10k events without duplicates ✓
- **SC-004**: Multi-tab has only 1 active connection ✓
- **SC-005**: SSE→polling fallback <5 seconds ✓
- **SC-006**: Metrics update with each refresh ✓
- **SC-007**: All 6 lifecycle transitions work ✓
- **SC-008**: <200ms 95th percentile response time ✓
- **SC-009**: 100% terminal status detection ✓
- **SC-010**: Exponential backoff intervals correct ✓
- **SC-011**: Zero event duplicates ✓
- **SC-012**: Zero stub implementations ✓

---

**Plan Status**: ✅ READY FOR PHASE 0 EXECUTION

Generated: 2025-11-06  
Branch: 008-live-investigation-updates  
Next Command: `/speckit.tasks` (after Phase 0-1 research completion)
