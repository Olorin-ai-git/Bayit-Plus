# OLORIN INVESTIGATION STATE MANAGEMENT INFRASTRUCTURE ANALYSIS

## Executive Summary

The Olorin codebase **ALREADY HAS COMPREHENSIVE INFRASTRUCTURE** for investigation state management, polling, persistence, and progress tracking. The investigation state system is well-architected with:

- **Database models** for state persistence and audit logging
- **REST API endpoints** for CRUD operations and polling
- **Service layer** with optimistic locking and audit trails
- **Frontend hooks** for progress tracking, logs, and phases
- **Polling system** with adaptive intervals, rate limiting, and ETag support

**CRITICAL FINDING**: This codebase does NOT need to be built from scratch - it needs to be **INTEGRATED AND CONNECTED** between frontend and backend.

---

## BACKEND (olorin-server) INFRASTRUCTURE

### 1. DATABASE MODELS & SCHEMA

#### InvestigationState Table
**File**: `/app/models/investigation_state.py`

**Schema Definition**:
```
Table: investigation_states
Primary Key: investigation_id (String(255))

Columns:
- investigation_id (PK)     : String(255), indexed
- user_id                   : String(255), indexed
- lifecycle_stage           : String(50), CHECK constraint, indexed
  Valid values: 'CREATED', 'SETTINGS', 'IN_PROGRESS', 'COMPLETED'
- status                    : String(50), CHECK constraint, indexed
  Valid values: 'CREATED', 'SETTINGS', 'IN_PROGRESS', 'COMPLETED', 'ERROR', 'CANCELLED'
- settings_json             : Text, nullable
- progress_json             : Text, nullable (current_phase, progress_percentage)
- results_json              : Text, nullable
- version                   : Integer, default=1, CHECK constraint (>= 1)
- created_at                : DateTime, server_default=now(), indexed
- updated_at                : DateTime, server_default=now(), onupdate=now(), indexed
- last_accessed             : DateTime, nullable

Indexes:
- idx_investigation_states_user (user_id)
- idx_investigation_states_status (status)
- idx_investigation_states_updated (updated_at)
- idx_investigation_states_lifecycle (lifecycle_stage)
```

**Key Features**:
- Optimistic locking via `version` field
- Lifecycle tracking: CREATED → SETTINGS → IN_PROGRESS → COMPLETED
- JSON fields for flexible state storage
- Full audit trail with timestamps
- User-scoped queries for multi-tenancy

---

#### InvestigationAuditLog Table
**File**: `/app/models/investigation_audit_log.py`

**Schema Definition**:
```
Table: investigation_audit_log

Columns:
- entry_id                  : String(255), PK
- investigation_id          : String(255), indexed, FK reference
- user_id                   : String(255), indexed
- action_type               : String(50), indexed
  Valid values: 'CREATED', 'UPDATED', 'DELETED', 'STATE_CHANGE', 'SETTINGS_CHANGE'
- changes_json              : Text, nullable (field-level changes)
- state_snapshot_json       : Text, nullable (complete state after change)
- source                    : String(50), indexed
  Valid values: 'UI', 'API', 'SYSTEM', 'WEBHOOK', 'POLLING'
- from_version              : Integer, nullable
- to_version                : Integer, nullable
- timestamp                 : DateTime, server_default=now(), indexed

Indexes:
- idx_investigation_audit_log_investigation
- idx_investigation_audit_log_user
- idx_investigation_audit_log_timestamp
- idx_investigation_audit_log_action
```

**Key Features**:
- Complete audit trail for compliance
- Captures version transitions
- Tracks change source (UI, API, SYSTEM, WEBHOOK, POLLING)
- Full state snapshots for rollback capability
- Queryable by timestamp for historical analysis

---

### 2. API ENDPOINTS

#### Investigation State Router
**File**: `/app/router/investigation_state_router.py`

**Endpoints**:

```
POST /api/v1/investigation-state/
- Create new investigation state
- Request: InvestigationStateCreate (user_id, investigation_id, lifecycle_stage, status, settings)
- Response: InvestigationStateResponse (201 Created)
- Headers: ETag (version-based), Location
- Auth: require_write_or_dev
- Auto-populates top 10% risk entities if placeholder detected

GET /api/v1/investigation-state/{investigation_id}
- Retrieve investigation state with conditional GET support
- Response: InvestigationStateResponse (200 OK) or 304 Not Modified
- Headers: ETag, Cache-Control
- Query params: none (explicit investigation_id in path)
- Conditional: If-None-Match header for ETag caching
- Auth: require_read_or_dev

PATCH /api/v1/investigation-state/{investigation_id}
- Update investigation state with optimistic locking
- Request: InvestigationStateUpdate (lifecycle_stage, settings_json, progress_json, status, version)
- Response: InvestigationStateResponse (200 OK)
- Conflict: 409 Conflict if version mismatch
- Creates audit log entry for every update
- Auth: require_write_or_dev

DELETE /api/v1/investigation-state/{investigation_id}
- Soft delete investigation state (sets status to DELETED)
- Response: 204 No Content
- Creates audit log entry
- Auth: require_write_or_dev

GET /api/v1/investigation-state/{investigation_id}/audit
- Retrieve audit history for investigation
- Response: List[AuditLogSchema]
- Query params: limit (optional, default=100), offset (optional, default=0)
- Ordered by timestamp DESC
- Auth: require_read_or_dev

GET /api/v1/investigation-state/{investigation_id}/changes
- Retrieve changes since specified version
- Query params: since_version (required, ge=1), include_snapshot (optional)
- Response: {changes: [...], snapshot: {...} (optional)}
- Auth: require_read_or_dev
```

#### Polling Router
**File**: `/app/router/polling_router.py`

**Endpoints**:

```
GET /api/v1/polling/investigation-state/{investigation_id}
- Poll investigation state with adaptive intervals and ETag support
- Conditional: If-None-Match header (304 Not Modified)
- Response: {state_data, recommended_interval_ms, etag}
- Headers: X-Recommended-Interval, ETag, Cache-Control
- Rate limiting: 429 Too Many Requests if limit exceeded
- Auth: require_read
- Adaptive interval calculation based on investigation status

GET /api/v1/polling/investigation-state/{investigation_id}/changes
- Poll for delta changes since version
- Query params: since_version (required), include_snapshot (optional)
- Response: {changes: [...], recommended_interval_ms, etag}
- Headers: X-Recommended-Interval, ETag
- Auth: require_read

GET /api/v1/polling/investigation-state/{investigation_id}/summary
- Get concise summary for high-frequency polling
- Response: {current_phase, progress_percentage, status, updated_at}
- Lightweight response for frequent polling
- Auth: require_read
```

---

### 3. SERVICE LAYER

#### InvestigationStateService
**File**: `/app/service/investigation_state_service.py`

**Responsibilities**:
- CRUD operations on investigation state
- Optimistic locking with version conflict detection
- Automatic audit log creation
- Auto-entity population for placeholder selections

**Key Methods**:
```python
create_state(user_id: str, data: InvestigationStateCreate) -> InvestigationStateResponse
- Creates new investigation state
- Auto-generates investigation_id if not provided
- Checks for duplicates (409 conflict)
- Populates auto-select entities from Snowflake
- Creates CREATED audit entry

get_state(investigation_id: str, user_id: str) -> InvestigationStateResponse
- Retrieves investigation state with authorization check
- Updates last_accessed timestamp
- Raises 404 if not found or unauthorized

update_state(investigation_id: str, user_id: str, data: InvestigationStateUpdate, expected_version: int) -> InvestigationStateResponse
- Updates investigation state with optimistic locking
- Checks version match (409 if mismatch)
- Increments version on success
- Creates UPDATED audit entry with change tracking

delete_state(investigation_id: str, user_id: str) -> None
- Soft delete (sets status to DELETED)
- Creates DELETED audit entry

get_audit_history(investigation_id: str, user_id: str, limit: int, offset: int) -> List[AuditLogSchema]
- Retrieves audit entries for investigation
- Ordered by timestamp DESC
- Includes authorization check

get_changes_since_version(investigation_id: str, user_id: str, since_version: int, include_snapshot: bool) -> Dict[str, Any]
- Retrieves delta changes from audit log
- Optionally includes complete state snapshot
- Useful for delta sync and recovery
```

---

#### PollingService
**File**: `/app/service/polling_service.py`

**Responsibilities**:
- Adaptive polling with recommended intervals
- Rate limiting per user/investigation
- ETag-based caching
- Delta change tracking

**Key Methods**:
```python
poll_state(investigation_id: str, user_id: str, if_none_match: Optional[str]) -> Optional[Dict[str, Any]]
- Returns state with recommended interval or None if 304
- Calculates recommended interval based on status
- Supports ETag-based 304 Not Modified responses

poll_changes(investigation_id: str, user_id: str, since_version: int) -> Dict[str, Any]
- Returns delta changes since specified version
- Includes recommended interval for next poll

calculate_recommended_interval(state: InvestigationState) -> int
- Adaptive polling: faster when IN_PROGRESS, slower when COMPLETED
- Based on lifecycle_stage and status fields
- Returns milliseconds (e.g., 1000, 5000, 30000)

is_rate_limited(user_id: str) -> bool
- Checks if user exceeded rate limit
- Configurable requests_per_minute

get_poll_summary(investigation_id: str, user_id: str) -> Dict[str, Any]
- Lightweight summary for high-frequency polling
- Returns: current_phase, progress_percentage, status, updated_at
```

---

### 4. PYDANTIC SCHEMAS

#### Investigation State Schemas
**File**: `/app/schemas/investigation_state.py`

```python
# Request schemas
InvestigationStateCreate:
  - investigation_id: Optional[str] (auto-generated if not provided)
  - user_id: str
  - lifecycle_stage: Literal['CREATED', 'SETTINGS', 'IN_PROGRESS', 'COMPLETED']
  - status: Literal['CREATED', 'SETTINGS', 'IN_PROGRESS', 'COMPLETED', 'ERROR', 'CANCELLED']
  - settings: Optional[WizardSettings]

InvestigationStateUpdate:
  - lifecycle_stage: Optional[Literal[...]]
  - settings_json: Optional[str]
  - progress_json: Optional[str]
  - results_json: Optional[str]
  - status: Optional[Literal[...]]
  - version: int (for optimistic locking)

# Response schemas
InvestigationStateResponse:
  - investigation_id: str
  - user_id: str
  - lifecycle_stage: str
  - settings_json: Optional[str]
  - progress_json: Optional[str]
  - results_json: Optional[str]
  - status: str
  - version: int
  - created_at: datetime
  - updated_at: datetime
  - last_accessed: Optional[datetime]

AuditLogSchema:
  - entry_id: str
  - investigation_id: str
  - user_id: str
  - action_type: str
  - changes_json: Optional[str]
  - state_snapshot_json: Optional[str]
  - source: str
  - from_version: Optional[int]
  - to_version: Optional[int]
  - timestamp: datetime
```

#### Progress Models
**File**: `/app/models/progress_models.py`

```python
# Models for tracking investigation progress
PhaseProgress:
  - id: str
  - name: str
  - order: int
  - status: Literal['pending', 'in_progress', 'completed', 'failed', 'skipped']
  - completion_percent: int (0-100)
  - tool_execution_ids: List[str]
  - started_at: Optional[datetime]
  - completed_at: Optional[datetime]
  - estimated_duration_ms: int

ToolExecution:
  - id: str
  - tool_name: str
  - agent_type: str
  - status: Literal['queued', 'running', 'completed', 'failed', 'skipped']
  - queued_at: datetime
  - started_at: Optional[datetime]
  - completed_at: Optional[datetime]
  - execution_time_ms: int
  - input: ToolExecutionInput
  - result: Optional[ToolExecutionResult]
  - error: Optional[ToolExecutionError]
  - retry_count: int
  - max_retries: int

AgentStatus:
  - agent_type: str
  - agent_name: str
  - status: Literal['pending', 'running', 'completed', 'failed']
  - tools_completed: int
  - total_tools: int
  - progress_percent: int (0-100)
  - average_execution_time_ms: int
  - findings_count: int
  - risk_score: float
  - max_risk_detected: float
  - started_at: Optional[datetime]
  - completed_at: Optional[datetime]

InvestigationStatus:
  - investigation_id: str
  - status: str
  - current_phase: str
  - progress_percentage: float (0-100)
  - agents: List[AgentStatus]
  - tools: List[ToolExecutionSchema]
  - logs: List[LogEntrySchema]
```

---

### 5. CONFIGURATION

#### Investigation State Configuration
**File**: `/app/config/investigation_state_config.py`

```python
PollingConfig:
  - interval_min_ms: int (default=1000)
  - interval_max_ms: int (default=30000)
  - interval_pending_ms: int (default=5000)
  - interval_running_ms: int (default=2000)
  - interval_completed_ms: int (default=30000)

RateLimitConfig:
  - enabled: bool (default=True)
  - requests_per_minute: int (default=60)
  - requests_per_hour: int (default=1000)
  - burst_size: int (default=10)

InvestigationStateConfig:
  - max_audit_entries_per_query: int (default=1000)
  - auto_purge_completed_after_days: int (default=90)
  - default_timezone: str (default='UTC')
```

---

## FRONTEND (olorin-front) INFRASTRUCTURE

### 1. React Hooks for Investigation Management

#### useInvestigationLogs
**File**: `/src/microservices/investigation/hooks/useInvestigationLogs.ts`

**Purpose**: Manage log entries for investigation progress

**Features**:
- Initialize with starting log entry
- Add new log entries with timestamp, level, message, source
- Reactive state management

**Interface**:
```typescript
function useInvestigationLogs(
  settings: WizardSettings | null,
  investigationData?: InvestigationProgress | null
): {
  logs: LogEntry[]
  addLog: (log: LogEntry) => void
}

LogEntry {
  timestamp: string (ISO format)
  level: 'info' | 'warning' | 'error' | 'debug'
  message: string
  source: string
}
```

---

#### useInvestigationPhases
**File**: `/src/microservices/investigation/hooks/useInvestigationPhases.ts`

**Purpose**: Manage investigation phases and progression

**Features**:
- Initialize 5-phase workflow:
  1. Initialization (preparing environment)
  2. Data Collection (gathering from sources)
  3. Tool Execution (running tools)
  4. Analysis (analyzing data)
  5. Finalization (compiling results)
- Track phase status: pending, running, completed, failed, skipped
- Update phase progress with milestone logging
- Auto-transition to next phase at 100% completion
- Timeline tracking (startTime, endTime)

**Interface**:
```typescript
function useInvestigationPhases(
  settings: WizardSettings | null,
  addLog: (log: LogEntry) => void
): {
  phases: Phase[]
  currentPhaseId: string | null
  updatePhaseProgress: (phaseId: string, progress: number) => void
  completePhase: (phaseId: string) => void
}

Phase {
  id: string
  name: string
  description: string
  order: int
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  progress: number (0-100)
  startTime?: string (ISO)
  endTime?: string (ISO)
  estimatedDuration?: number (ms)
}
```

---

#### useProgressSimulation
**File**: `/src/microservices/investigation/hooks/useProgressSimulation.ts`

**Purpose**: Simulate progress updates for development/demo

**Features**:
- Generates random anomalies with risk levels
- Simulates agent activity detection
- Creates synthetic entity relationships
- Updates agent metrics
- Tracks anomaly detection over time

**Note**: This is for DEVELOPMENT ONLY - production uses real polling data

**Interface**:
```typescript
function useProgressSimulation(
  investigation: Investigation | null,
  settings: WizardSettings | null,
  callbacks: {
    updatePhaseProgress: (phaseId: string, progress: number) => void
    updateToolStatus: (toolId: string, status: string) => void
    addAnomaly: (anomaly: RadarAnomaly) => void
    addRelationship: (relationship: EntityRelationship) => void
    updateAgentMetrics: (agentType: AgentType, updates: any) => void
  },
  relationships: EntityRelationship[]
): void
```

---

#### useProgressData
**File**: `/src/microservices/investigation/hooks/useProgressData.ts`

**Purpose**: Fetch real investigation progress from backend API

**Features**:
- Polls `/api/v1/polling/investigation-state/{id}` endpoint
- Adaptive polling intervals from server
- ETag-based caching (304 Not Modified)
- Rate limit handling (429 Too Many Requests)
- Automatic retry logic
- Real-time progress percentage and phase tracking

**Interface**:
```typescript
function useProgressData(
  investigationId: string | null,
  pollingInterval?: number
): {
  progressData: ProgressData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

ProgressData {
  investigation_id: string
  status: string
  current_phase: string
  progress_percentage: number (0-100)
  updated_at: string (ISO)
  lifecycle_stage: string
  version: number
  settings_json: string (JSON)
  progress_json: string (JSON)
  results_json: string (JSON)
}
```

---

### 2. Investigation Context

#### InvestigationContext
**File**: `/src/microservices/investigation/contexts/InvestigationContext.tsx`

**Purpose**: Global state management for investigation wizard

**Provides**:
- Current investigation state
- Settings configuration
- Progress tracking
- Phase management
- Log management
- Tool execution tracking
- Error handling

**State Structure**:
```typescript
{
  // Investigation Identity
  investigationId: string | null
  userId: string | null
  
  // Lifecycle
  lifecycle_stage: 'CREATED' | 'SETTINGS' | 'IN_PROGRESS' | 'COMPLETED'
  status: 'CREATED' | 'SETTINGS' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR' | 'CANCELLED'
  
  // Settings & Configuration
  settings: WizardSettings | null
  
  // Progress Tracking
  phases: Phase[]
  currentPhaseId: string | null
  progressPercentage: number (0-100)
  
  // Logs & Events
  logs: LogEntry[]
  
  // Tool Execution
  toolExecutions: ToolExecution[]
  
  // Results
  results: InvestigationResults | null
  
  // Error Handling
  error: Error | null
  
  // Timestamps
  createdAt: string (ISO)
  updatedAt: string (ISO)
  startedAt: string (ISO)
  completedAt: string (ISO)
}
```

---

### 3. API Integration

#### Polling Configuration
**File**: `/src/microservices/investigation/config/validatePollingConfig.ts`

```typescript
PollingConfig {
  minInterval: number = 1000 (ms)
  maxInterval: number = 30000 (ms)
  pendingInterval: number = 5000 (ms)
  runningInterval: number = 2000 (ms)
  completedInterval: number = 30000 (ms)
  enableETag: boolean = true
  enableRateLimit: boolean = true
  maxRetries: number = 3
  retryBackoff: number = 1.5 (multiplier)
}
```

---

## INTEGRATION POINTS

### Data Flow: Frontend → Backend

```
Frontend (React)
├── InvestigationContext (global state)
├── useProgressData (polling hook)
├── useInvestigationPhases (phase management)
├── useInvestigationLogs (log management)
└── REST API calls
    │
    ├── POST /api/v1/investigation-state/
    │   └── Create investigation state
    │
    ├── GET /api/v1/investigation-state/{id}
    │   └── Fetch current state (conditional with ETag)
    │
    ├── GET /api/v1/polling/investigation-state/{id}
    │   └── Poll for updates (adaptive interval)
    │
    ├── GET /api/v1/polling/investigation-state/{id}/changes
    │   └── Get delta changes since version
    │
    └── PATCH /api/v1/investigation-state/{id}
        └── Update state (with optimistic locking)

Backend (Python/FastAPI)
├── InvestigationStateRouter (endpoints)
├── PollingRouter (polling endpoints)
├── InvestigationStateService (business logic)
├── PollingService (polling logic)
└── Database
    ├── investigation_states (state persistence)
    ├── investigation_audit_log (audit trail)
    └── SQLite / PostgreSQL
```

---

## SCHEMA COMPLIANCE (Schema-Locked Mode)

### Database Schema Verification

**Tables Referenced**:
1. `investigation_states`
   - Columns: investigation_id, user_id, lifecycle_stage, status, settings_json, progress_json, results_json, version, created_at, updated_at, last_accessed
   - No DDL required (table exists)

2. `investigation_audit_log`
   - Columns: entry_id, investigation_id, user_id, action_type, changes_json, state_snapshot_json, source, from_version, to_version, timestamp
   - No DDL required (table exists)

**No DDL or migrations required** - all tables are already created and mapped to models.

---

## EXISTING INFRASTRUCTURE SUMMARY

### What's Already Implemented

✅ **Database Schema**
- investigation_states table with full schema
- investigation_audit_log table with audit trail
- Optimistic locking via version field
- User-scoped authorization

✅ **API Endpoints**
- POST /investigation-state/ (create)
- GET /investigation-state/{id} (read with conditional GET)
- PATCH /investigation-state/{id} (update with optimistic locking)
- DELETE /investigation-state/{id} (soft delete)
- GET /investigation-state/{id}/audit (audit history)
- GET /investigation-state/{id}/changes (delta sync)
- GET /polling/investigation-state/{id} (adaptive polling)
- GET /polling/investigation-state/{id}/changes (delta polling)

✅ **Service Layer**
- InvestigationStateService (CRUD + audit)
- PollingService (adaptive polling + rate limiting)
- Audit log creation on every state change
- Auto-entity population from Snowflake

✅ **Frontend Hooks**
- useInvestigationLogs (log management)
- useInvestigationPhases (phase tracking)
- useProgressSimulation (demo/dev progress)
- useProgressData (real API polling)

✅ **Pydantic Schemas**
- InvestigationStateCreate
- InvestigationStateUpdate
- InvestigationStateResponse
- ProgressData models
- Phase, ToolExecution, AgentStatus models

✅ **Configuration**
- PollingConfig (adaptive intervals)
- RateLimitConfig (rate limiting)
- InvestigationStateConfig (general settings)

---

## WHAT NEEDS TO BE BUILT

### 1. WebSocket Real-Time Updates
- Backend: WebSocket endpoint for live progress
- Frontend: useWebSocket hook for real-time subscription
- Event types: progress_update, phase_change, tool_complete, log_entry, investigation_complete

### 2. Investigation Progress Service
- Backend: Track and calculate progress percentage
- Aggregate phase, tool, and agent progress
- Store in progress_json field

### 3. Investigation Executor
- Backend: Orchestrate investigation execution
- Call agents, tools, and analysis services
- Update progress_json in real-time
- Handle errors and retries

### 4. Progress Page UI
- Frontend: Display real-time progress
- Show phases, tools, logs with color-coded severity
- WebSocket integration for live updates

### 5. Results Page UI
- Frontend: Display investigation results
- Risk gauges, findings, relationships
- Export capabilities

### 6. Frontend API Service Layer
- Frontend: Typed API client for all endpoints
- Error handling, retry logic, request/response logging

---

## CRITICAL INTEGRATION POINTS

1. **State Persistence**: Investigation state flows through investigation_states table
2. **Progress Tracking**: progress_json field in investigation_states stores current_phase, progress_percentage
3. **Audit Trail**: Every state change creates an entry in investigation_audit_log
4. **Real-Time Updates**: WebSocket broadcasts to connected clients
5. **Polling**: Frontend polls /api/v1/polling/investigation-state/{id} with ETag caching
6. **Optimistic Locking**: Frontend must track and send version in PATCH requests
7. **Rate Limiting**: Frontend must respect Retry-After header

---

## REFERENCES

### Backend Files
- `/app/models/investigation_state.py` - State model with optimistic locking
- `/app/models/investigation_audit_log.py` - Audit log model
- `/app/router/investigation_state_router.py` - State CRUD endpoints
- `/app/router/polling_router.py` - Polling endpoints
- `/app/service/investigation_state_service.py` - State CRUD service
- `/app/service/polling_service.py` - Polling service
- `/app/schemas/investigation_state.py` - Pydantic schemas
- `/app/models/progress_models.py` - Progress tracking models
- `/app/config/investigation_state_config.py` - Configuration

### Frontend Files
- `/src/microservices/investigation/hooks/useInvestigationLogs.ts` - Log management
- `/src/microservices/investigation/hooks/useInvestigationPhases.ts` - Phase management
- `/src/microservices/investigation/hooks/useProgressSimulation.ts` - Demo progress
- `/src/microservices/investigation/hooks/useProgressData.ts` - Real polling
- `/src/microservices/investigation/contexts/InvestigationContext.tsx` - Global state
- `/src/microservices/investigation/config/validatePollingConfig.ts` - Polling config

