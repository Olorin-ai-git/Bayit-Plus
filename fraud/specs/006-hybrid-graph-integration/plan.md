# Implementation Plan: Hybrid Graph Integration

**Branch**: `006-hybrid-graph-integration` | **Date**: 2025-01-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-hybrid-graph-integration/spec.md`

## Summary

This feature creates a full end-to-end integration between the backend Hybrid Graph investigation system and the frontend Investigation Wizard, enabling fraud analysts to configure investigations via Settings Page, monitor real-time progress via polling on Progress Page, and view comprehensive results on Results Page. The integration emphasizes a polling-based architecture for maximum reliability and browser compatibility, avoiding WebSocket complexity while maintaining near-real-time updates (2-second polling interval).

**Primary Requirement**: Enable investigators to leverage the powerful backend Hybrid Intelligence Graph system through an intuitive wizard interface with three seamless stages: Configure → Monitor → Analyze Results.

**Technical Approach**: Implement robust polling service with exponential backoff, integrate with existing React/TypeScript wizard pages, connect to FastAPI backend endpoints, and ensure zero data loss during network disruptions through localStorage persistence and response caching.

## Technical Context

**Language/Version**:
- **Backend**: Python 3.11 with FastAPI
- **Frontend**: TypeScript 5.x with React 18

**Primary Dependencies**:
- **Backend**: FastAPI, LangChain, LangGraph (Hybrid Graph System), Pydantic, SQLAlchemy
- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand (state management), Axios (HTTP client)

**Storage**:
- **Backend**: SQLite (development) / PostgreSQL (production) for investigation state
- **Frontend**: Browser localStorage for investigation history and offline recovery

**Testing**:
- **Backend**: pytest with minimum 30% coverage, integration tests for API endpoints
- **Frontend**: Jest + React Testing Library for component tests, Cypress for E2E wizard flow

**Target Platform**:
- **Backend**: Linux server (FastAPI on port 8090)
- **Frontend**: Modern browsers (Chrome 90+, Firefox 90+, Safari 14+, Edge 90+)

**Project Type**: Web application (frontend + backend)

**Performance Goals**:
- Investigation launch < 2 seconds response time
- Polling latency < 2 seconds (update frequency)
- Results page load < 3 seconds (with 50+ findings)
- Export PDF generation < 10 seconds
- 99.5% polling reliability with automatic recovery

**Constraints**:
- Maximum 15 minutes investigation timeout
- 200-line file size limit (all TypeScript/Python files)
- No hardcoded values (all configuration from environment)
- GAIA Design System compliance (Tailwind CSS only, no Material-UI)
- Backward compatibility with existing wizard infrastructure

**Scale/Scope**:
- Support 50 concurrent investigators
- Handle investigations with 1000+ findings
- Display 500+ log entries with virtualization
- Store 50 investigation history items in localStorage
- Support 3 concurrent investigations per user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Olorin Project does not have a formal constitution file.** Based on SYSTEM MANDATE and CLAUDE.md requirements, applying these principles:

### Core Principles Applied

✅ **No Mocks/Stubs/TODOs**: All code must be production-ready with complete implementations. Demo/test code isolated under `/demo` or `/tests` directories.

✅ **Configuration-Driven Design**: All environment-specific values (URLs, ports, timeouts, feature flags) must come from environment variables with Zod/Pydantic validation.

✅ **File Size Compliance**: All source files must be under 200 lines. Break large files into focused modules with single responsibilities.

✅ **Dependency Injection**: Services receive dependencies through constructors. No inline client creation with hardcoded literals.

✅ **Schema-Locked Database**: No DDL operations. Only reference existing database columns. Use schema validation at startup.

✅ **Zero Hardcoded Values**: Treat as hardcoded: endpoints, ports, credentials, timeouts, feature flags, file paths, thresholds, pagination sizes, business constants.

✅ **Test-First Approach**: Comprehensive test coverage with integration-style tests using real adapters and ephemeral resources.

### Gates Passed

✅ **Phase 0 Research Gate**: No architectural violations detected. Polling service pattern is simple and maintainable.

✅ **Phase 1 Design Gate**: Will verify API contracts match existing backend, data models are complete, and no new complexity introduced.

## Project Structure

### Documentation (this feature)

```
specs/006-hybrid-graph-integration/
├── plan.md              # This file (implementation plan)
├── spec.md              # Feature specification (user stories, requirements)
├── research.md          # Phase 0: Technology research and patterns
├── data-model.md        # Phase 1: Complete TypeScript/Python data models
├── quickstart.md        # Phase 1: Developer quick reference guide
├── contracts/           # Phase 1: API contract specifications
│   ├── investigation-api.md       # POST /investigations, GET /status, GET /results
│   ├── polling-service-spec.md    # Frontend polling service contract
│   └── error-codes.md             # Backend error code mappings
└── tasks.md             # Phase 2: Generated by /speckit.tasks (NOT /speckit.plan)
```

### Source Code (repository root)

#### Backend Structure
```
olorin-server/
├── app/
│   ├── router/
│   │   ├── investigations_router.py           # NEW: Investigation API routes
│   │   └── controllers/
│   │       ├── investigation_controller.py    # EXISTING: Updated for polling
│   │       ├── investigation_status_controller.py  # NEW: Status endpoint
│   │       └── investigation_results_controller.py # NEW: Results endpoint
│   ├── service/
│   │   ├── agent/orchestration/hybrid/        # EXISTING: Hybrid Graph System
│   │   ├── investigation_service.py           # EXISTING: Updated for status tracking
│   │   └── investigation_polling_adapter.py   # NEW: Adapts graph state for polling
│   ├── models/
│   │   ├── investigation_state.py             # EXISTING: Investigation database model
│   │   └── investigation_results.py           # NEW: Results aggregation model
│   └── schemas/
│       ├── investigation_config.py            # NEW: Pydantic request schema
│       ├── investigation_status.py            # NEW: Pydantic status response
│       └── investigation_results.py           # NEW: Pydantic results response
├── test/
│   ├── integration/
│   │   ├── test_investigation_api.py          # NEW: API endpoint tests
│   │   └── test_polling_workflow.py           # NEW: End-to-end polling test
│   └── unit/
│       └── test_polling_adapter.py            # NEW: Adapter unit tests
└── config/
    └── investigation_config.py                # EXISTING: Updated with polling settings
```

#### Frontend Structure
```
olorin-front/
├── src/
│   ├── microservices/investigation/
│   │   ├── pages/
│   │   │   ├── SettingsPage.tsx               # EXISTING: Add hybrid graph trigger
│   │   │   ├── ProgressPage.tsx               # EXISTING: Add polling integration
│   │   │   └── ResultsPage.tsx                # EXISTING: Add hybrid results display
│   │   ├── services/
│   │   │   ├── investigationService.ts        # EXISTING: Add hybrid endpoints
│   │   │   └── hybridGraphPollingService.ts   # NEW: Polling service
│   │   ├── hooks/
│   │   │   ├── useHybridGraphPolling.ts       # NEW: React hook for polling
│   │   │   ├── useInvestigationStatus.ts      # NEW: Status updates hook
│   │   │   └── useInvestigationResults.ts     # NEW: Results fetching hook
│   │   ├── types/
│   │   │   └── hybridGraphTypes.ts            # NEW: TypeScript interfaces
│   │   └── components/progress/
│   │       ├── HybridGraphPhaseIndicator.tsx  # NEW: Phase progress component
│   │       ├── ToolExecutionTimeline.tsx      # NEW: Tool timeline component
│   │       └── AgentStatusGauges.tsx          # EXISTING: Updated for hybrid data
│   └── shared/
│       ├── services/
│       │   └── pollingService.ts              # EXISTING: Generic polling utility
│       ├── hooks/
│       │   └── usePolling.ts                  # EXISTING: Base polling hook
│       └── config/
│           └── env.config.ts                  # EXISTING: Add hybrid graph env vars
├── __tests__/
│   ├── integration/
│   │   ├── HybridGraphWizardFlow.test.tsx     # NEW: E2E wizard test
│   │   └── PollingResilience.test.tsx         # NEW: Polling failure tests
│   └── unit/
│       ├── useHybridGraphPolling.test.ts      # NEW: Hook unit tests
│       └── hybridGraphPollingService.test.ts  # NEW: Service unit tests
└── cypress/
    └── e2e/
        └── hybrid-graph-investigation.cy.ts    # NEW: Cypress E2E test
```

**Structure Decision**:
This is a **web application** with clear frontend/backend separation. The structure leverages existing wizard infrastructure in `olorin-front/src/microservices/investigation/` and integrates with the proven Hybrid Graph system in `olorin-server/app/service/agent/orchestration/hybrid/`.

**Key Design Decisions**:
1. **Polling Service as Shared Utility**: Place polling logic in `shared/services/` for reusability across microservices
2. **Hook-Based Architecture**: Create React hooks for polling, status, and results to separate concerns and enable testing
3. **Backend Adapter Pattern**: Use `investigation_polling_adapter.py` to transform internal graph state to polling API responses
4. **Zero Breaking Changes**: All backend endpoints are new additions; existing investigation flows remain unchanged

## Complexity Tracking

*No constitutional violations - this section intentionally left empty. The feature adheres to all SYSTEM MANDATE principles without introducing unnecessary complexity.*

## Phase 0: Research & Discovery

### Objective
Research existing polling patterns, hybrid graph integration points, and wizard infrastructure to ensure seamless integration without architectural debt.

### Research Areas

#### 1. Existing Polling Infrastructure
**File**: `/olorin-front/src/shared/services/pollingService.ts`

**Questions**:
- What polling patterns are already implemented?
- Does it support exponential backoff?
- How is request cancellation handled?
- What error recovery mechanisms exist?

**Expected Findings**:
- Existing generic polling service with configurable intervals
- Cancellation via AbortController
- Retry logic implementation details
- Error handling patterns

#### 2. Hybrid Graph System Integration Points
**Files**:
- `/olorin-server/app/service/agent/orchestration/hybrid/hybrid_graph_builder.py`
- `/olorin-server/app/service/agent/orchestration/hybrid/graph/graph_builder.py`
- `/olorin-server/app/router/controllers/investigation_executor_core.py`

**Questions**:
- How does hybrid graph track execution state?
- What data is available for progress monitoring (phases, tool executions, logs)?
- How are investigation results structured?
- What error states exist?

**Expected Findings**:
- LangGraph state management approach
- Available metrics (phase, progress percentage, tool calls)
- Results aggregation mechanism
- Error handling and timeout behavior

#### 3. Wizard Store Architecture
**Files**:
- `/olorin-front/src/shared/store/wizardStore.ts`
- `/olorin-front/src/shared/hooks/useWizardPolling.ts`

**Questions**:
- How is wizard state managed (Zustand store)?
- What investigation lifecycle hooks exist?
- How is navigation handled between wizard pages?
- What persistence mechanisms are in place?

**Expected Findings**:
- Zustand store structure for settings/investigation/results
- Existing wizard navigation patterns
- localStorage usage for persistence
- State synchronization approach

#### 4. API Endpoint Patterns
**Files**:
- `/olorin-server/app/router/investigations_router.py`
- `/olorin-server/app/router/controllers/investigation_controller.py`

**Questions**:
- What investigation API endpoints exist?
- What authentication/authorization is required?
- What response formats are standard?
- How are errors returned?

**Expected Findings**:
- FastAPI router structure
- JWT authentication pattern
- Pydantic schema conventions
- Error response format (HTTP status codes + error codes)

#### 5. GAIA Design System Integration
**Files**:
- `/olorin-front/src/shared/components/`
- `/olorin-front/tailwind.config.js`

**Questions**:
- What GAIA components are available?
- What color palette must be used?
- What interaction states are required?
- What responsive patterns exist?

**Expected Findings**:
- GAIA corporate color definitions
- Existing button/panel/notification components
- Hover/active/disabled state patterns
- Responsive breakpoints (sm, md, lg, xl)

### Research Output

**File**: `research.md`

**Contents**:
- Summary of existing polling patterns with code examples
- Hybrid graph integration points mapping (state → API response)
- Wizard store data flow diagrams
- API endpoint conventions and examples
- GAIA component inventory with usage guidelines
- Identified gaps and required new components
- Recommendations for implementation approach

**Success Criteria**:
- All 5 research areas documented with concrete examples
- Integration points clearly identified
- No architectural conflicts detected
- Implementation risks identified with mitigation strategies

## Phase 1: Design & Contracts

### Objective
Design complete data models, API contracts, and component architecture ensuring zero ambiguity for Phase 2 implementation.

### Artifacts to Generate

#### 1. Data Model (`data-model.md`)

**Complete TypeScript Interfaces**:
```typescript
// Investigation Configuration (Settings → Backend)
interface InvestigationConfig {
  entity_type: EntityType;
  entity_id: string;
  time_range: TimeRange;
  tools: ToolConfig[];
  correlation_mode: CorrelationMode;
  execution_mode: ExecutionMode;
  risk_threshold: number;
}

// Investigation Status (Polling Response)
interface InvestigationStatus {
  investigation_id: string;
  status: InvestigationStatusEnum;
  current_phase: string;
  progress_percentage: number;
  estimated_completion_time: string | null;
  risk_score: number | null;
  agent_status: Record<string, AgentStatus>;
  tool_executions: ToolExecution[];
  logs: LogEntry[];
  error: ErrorDetail | null;
}

// Investigation Results (Results Page)
interface InvestigationResults {
  investigation_id: string;
  overall_risk_score: number;
  status: "completed" | "failed";
  started_at: string;
  completed_at: string;
  duration_ms: number;
  findings: Finding[];
  evidence: Evidence[];
  agent_decisions: AgentDecision[];
  summary: string;
  metadata: InvestigationMetadata;
}

// All supporting interfaces fully defined
```

**Complete Python Models**:
```python
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime

class InvestigationConfigSchema(BaseModel):
    """Request schema for POST /api/investigations"""
    entity_type: str = Field(..., regex="^(user|device|ip|transaction)$")
    entity_id: str = Field(..., min_length=1)
    time_range: TimeRangeSchema
    tools: List[ToolConfigSchema]
    correlation_mode: str = Field(..., regex="^(OR|AND)$")
    execution_mode: str = Field(..., regex="^(parallel|sequential)$")
    risk_threshold: int = Field(..., ge=0, le=100)

class InvestigationStatusSchema(BaseModel):
    """Response schema for GET /api/investigations/{id}/status"""
    investigation_id: str
    status: str
    current_phase: str
    progress_percentage: float
    # ... all fields with validation
```

**Validation Rules**:
- Entity ID format validation (email for user, UUID for device, IP regex for ip)
- Time range validation (start < end, not in future)
- Tool configuration validation (valid tool IDs, parameter schemas)
- Risk threshold range (0-100)

#### 2. API Contracts (`contracts/`)

**File**: `contracts/investigation-api.md`

**Endpoints**:
```
POST /api/investigations
Request: InvestigationConfig
Response: { investigation_id: string, status: "pending" }
Status Codes: 200 (created), 400 (invalid config), 401 (unauthorized)

GET /api/investigations/{id}/status
Response: InvestigationStatus
Status Codes: 200 (success), 404 (not found), 401 (unauthorized)

GET /api/investigations/{id}/results
Response: InvestigationResults
Status Codes: 200 (success), 404 (not found), 400 (not completed yet)

POST /api/investigations/{id}/export
Request: { format: "pdf" | "json" | "csv" }
Response: { download_url: string, expires_at: string }

PATCH /api/investigations/{id}/control
Request: { action: "pause" | "stop" | "resume" }
Response: { status: string }
```

**File**: `contracts/polling-service-spec.md`

**Polling Service Interface**:
```typescript
interface PollingServiceConfig {
  investigationId: string;
  interval: number;              // Default: 2000ms
  maxRetries: number;            // Default: 5
  backoffMultiplier: number;     // Default: 2
  maxBackoffInterval: number;    // Default: 16000ms
  onStatusUpdate: (status: InvestigationStatus) => void;
  onComplete: (results: InvestigationResults) => void;
  onError: (error: Error) => void;
}

class HybridGraphPollingService {
  start(config: PollingServiceConfig): void;
  stop(): void;
  pause(): void;
  resume(): void;
  getLastStatus(): InvestigationStatus | null;
}
```

**File**: `contracts/error-codes.md`

**Backend Error Codes**:
```
ENTITY_NOT_FOUND: Entity ID does not exist in database
INVALID_TIME_RANGE: Time range exceeds maximum duration
INVESTIGATION_TIMEOUT: Investigation exceeded 15 minute limit
AGENT_EXECUTION_FAILED: Hybrid graph agent encountered unrecoverable error
INSUFFICIENT_DATA: Not enough data available for analysis
RATE_LIMIT_EXCEEDED: Too many concurrent investigations
```

#### 3. Quickstart Guide (`quickstart.md`)

**Contents**:
- 5-minute setup instructions for developers
- Environment variable configuration examples
- API endpoint testing with curl/Postman
- Frontend wizard page integration examples
- Common troubleshooting scenarios

**Example Sections**:
```markdown
## Quick Start: Add Hybrid Graph Polling to Progress Page

1. Install dependencies: (none needed - using existing)

2. Add environment variables:
```bash
REACT_APP_FEATURE_ENABLE_HYBRID_GRAPH=true
REACT_APP_WIZARD_PROGRESS_UPDATE_INTERVAL_MS=2000
```

3. Use polling hook in ProgressPage.tsx:
```typescript
import { useHybridGraphPolling } from '../hooks/useHybridGraphPolling';

const { status, isPolling, error } = useHybridGraphPolling(investigationId);
```

4. Display status:
```typescript
{status && (
  <HybridGraphPhaseIndicator
    currentPhase={status.current_phase}
    progressPercentage={status.progress_percentage}
  />
)}
```
```

### Phase 1 Success Criteria

✅ **Data Model Complete**:
- All TypeScript interfaces defined with JSDoc comments
- All Python Pydantic models defined with validation
- Zod schemas for frontend validation
- No ambiguous types (no `any` except in `Record<string, any>`)

✅ **API Contracts Complete**:
- All 5 endpoints fully specified
- Request/response examples provided
- Error scenarios documented
- Authentication requirements clear

✅ **Quickstart Guide Complete**:
- Developer can set up integration in < 15 minutes
- All code examples are copy-paste ready
- Configuration steps are unambiguous
- Troubleshooting covers 90% of common issues

## Phase 2: Task Breakdown

*Note: This phase is executed by `/speckit.tasks` command, NOT `/speckit.plan`*

**Phase 2 will generate**: `tasks.md`

**Expected Task Structure**:
1. **Backend Tasks (15-20 tasks)**:
   - Create investigation API endpoints
   - Implement polling adapter
   - Add status tracking to hybrid graph
   - Create results aggregation logic
   - Implement export functionality
   - Write integration tests

2. **Frontend Tasks (20-25 tasks)**:
   - Create polling service
   - Implement polling hooks
   - Update Settings Page for hybrid graph
   - Update Progress Page with polling
   - Update Results Page with hybrid data
   - Create new components (phase indicator, tool timeline)
   - Write component tests

3. **Integration Tasks (5-10 tasks)**:
   - End-to-end wizard flow test
   - Polling resilience tests
   - Error scenario tests
   - Performance testing
   - Documentation updates

**Total Estimated Tasks**: 40-55 tasks
**Task Dependencies**: Clearly marked with prerequisites
**Parallel Execution**: Identified tasks that can run concurrently

## Environment Configuration

### Backend Environment Variables

```bash
# Investigation Configuration
INVESTIGATION_MAX_DURATION_MINUTES=15
INVESTIGATION_POLLING_STATUS_CACHE_TTL_SECONDS=2
INVESTIGATION_MAX_CONCURRENT_PER_USER=3
INVESTIGATION_HISTORY_RETENTION_DAYS=90

# Feature Flags
FEATURE_ENABLE_HYBRID_GRAPH_POLLING=true
FEATURE_ENABLE_MULTI_ENTITY_INVESTIGATIONS=true

# Performance
INVESTIGATION_STATUS_QUERY_TIMEOUT_MS=500
INVESTIGATION_RESULTS_QUERY_TIMEOUT_MS=2000

# Export
INVESTIGATION_EXPORT_MAX_SIZE_MB=100
INVESTIGATION_EXPORT_URL_EXPIRY_HOURS=24
```

### Frontend Environment Variables

```bash
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:8090
REACT_APP_FEATURE_ENABLE_HYBRID_GRAPH=true

# Polling Configuration
REACT_APP_WIZARD_PROGRESS_UPDATE_INTERVAL_MS=2000
REACT_APP_REQUEST_TIMEOUT_MS=30000
REACT_APP_POLLING_MAX_RETRIES=5
REACT_APP_POLLING_BACKOFF_MULTIPLIER=2
REACT_APP_POLLING_MAX_BACKOFF_MS=16000

# Investigation Limits
REACT_APP_MAX_CONCURRENT_INVESTIGATIONS=3
REACT_APP_MAX_INVESTIGATION_HISTORY=50
REACT_APP_INVESTIGATION_HISTORY_STORAGE_KEY=olorin_investigation_history

# UI Configuration
REACT_APP_MAX_LOG_ENTRIES_DISPLAY=500
REACT_APP_MAX_FINDINGS_PER_PAGE=50
REACT_APP_MAX_EVIDENCE_PER_FINDING=100
REACT_APP_MAX_TOOL_EXECUTIONS_DISPLAY=200
```

## Progress Tracking

### Phase 0: Research ✅ READY TO START
- [ ] Research existing polling infrastructure
- [ ] Research hybrid graph integration points
- [ ] Research wizard store architecture
- [ ] Research API endpoint patterns
- [ ] Research GAIA design system
- [ ] Generate research.md with findings

### Phase 1: Design ⏳ AWAITING PHASE 0
- [ ] Create complete data-model.md (TypeScript + Python)
- [ ] Create API contracts in contracts/ directory
- [ ] Create quickstart.md developer guide
- [ ] Review data models with SYSTEM MANDATE compliance
- [ ] Validate no hardcoded values in design
- [ ] Re-check constitution compliance

### Phase 2: Task Generation ⏳ AWAITING PHASE 1
- [ ] Execute `/speckit.tasks` command
- [ ] Generate tasks.md with 40-55 implementation tasks
- [ ] Mark task dependencies
- [ ] Identify parallel execution opportunities
- [ ] Assign estimated time per task

### Implementation Phases (Post-Planning)
*These phases occur after task generation via `/implement` workflow*

#### Backend Implementation
- [ ] Create investigation API endpoints
- [ ] Implement polling adapter
- [ ] Add status tracking
- [ ] Create results aggregation
- [ ] Implement export functionality
- [ ] Write backend tests

#### Frontend Implementation
- [ ] Create polling service
- [ ] Implement React hooks
- [ ] Update Settings Page
- [ ] Update Progress Page
- [ ] Update Results Page
- [ ] Create new components
- [ ] Write frontend tests

#### Integration & Testing
- [ ] E2E wizard flow tests
- [ ] Polling resilience tests
- [ ] Error scenario tests
- [ ] Performance benchmarks
- [ ] Update documentation

## Risk Mitigation

### High-Risk Areas

**Risk 1: Polling Performance Degradation**
- **Mitigation**: Implement response caching, optimize backend status queries (< 500ms), use database indexes
- **Fallback**: Increase polling interval to 5 seconds if backend load exceeds threshold

**Risk 2: Frontend State Synchronization**
- **Mitigation**: Use Zustand store as single source of truth, persist to localStorage on every update
- **Fallback**: Manual refresh button if polling fails after 5 retries

**Risk 3: Investigation Timeout Handling**
- **Mitigation**: Implement graceful timeout extension if graph shows active execution
- **Fallback**: Allow user to download partial results even on timeout

**Risk 4: Browser Compatibility Issues**
- **Mitigation**: Use AbortController polyfill, test on all supported browsers (Chrome, Firefox, Safari, Edge)
- **Fallback**: Display warning message for unsupported browsers with link to supported versions

### Monitoring & Alerts

**Backend Metrics**:
- Investigation creation rate
- Average investigation duration
- Polling request rate per investigation
- Error rate by endpoint
- Database query performance

**Frontend Metrics**:
- Polling failure rate
- Average polling latency
- localStorage usage
- Component render performance
- Error boundary triggers

## Next Steps

1. ✅ **Specification Complete**: Feature requirements fully defined in `spec.md`
2. ✅ **Planning Started**: This document provides implementation roadmap
3. 🔄 **Phase 0 Execution**: Run research tasks to gather integration details
4. ⏳ **Phase 1 Execution**: Generate data models, API contracts, and quickstart guide
5. ⏳ **Phase 2 Execution**: Use `/speckit.tasks` to generate implementation tasks
6. ⏳ **Implementation**: Execute tasks via `/implement` workflow with backend and frontend subagents

**Ready to proceed**: Execute Phase 0 research tasks to populate `research.md` with findings from existing codebase analysis.

---

**Plan Status**: 📋 **READY FOR PHASE 0 RESEARCH**
**Estimated Total Implementation Time**: 80-100 developer hours (Backend: 30-35h, Frontend: 40-50h, Integration: 10-15h)
**Target Completion**: 2-3 weeks with 2 full-time developers
