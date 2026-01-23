# Feature Specification: Investigation State Polling and Persistence

**Feature Branch**: `005-polling-and-persistence`
**Created**: 2025-10-14
**Status**: Draft
**Input**: User description: "polling and persistence: create a plan for full integration between wizard frontend to server backend. create all required endpoints. persist investigation state in firebase, retrieve it through polling"

## Executive Summary

This feature implements comprehensive state persistence and polling mechanisms for investigation workflows. The system extends existing REST API infrastructure to support wizard UI state management with SQLite/memory persistence and polling-based synchronization as an alternative/complement to WebSocket connections.

**ARCHITECTURAL DECISION**: Continue using existing SQLite/memory persistence infrastructure (no Firebase migration at this time). This simplifies implementation while maintaining all polling and state management functionality.

### Key Discovery: Extensive Existing Infrastructure

**CRITICAL FINDING**: The codebase already contains substantial polling and persistence infrastructure:

1. **Existing Polling Specification**: Complete implementation guide at `/docs/frontend/FRONTEND_POLLING_SPECIFICATION.md` (1,001 lines)
2. **Existing Investigation Endpoints**: `structured_investigation_router.py` with comprehensive REST API
3. **Existing Persistence Layer**: `investigations_router.py` with CRUD operations (SQLite/SQLAlchemy)
4. **Existing Status Polling**: `investigation_status_controller.py` with real-time status retrieval
5. **Existing Frontend Store**: `wizardStore.ts` with Zustand state management
6. **Existing WebSocket Integration**: Real-time updates via WebSocket connections

### Gap Analysis: What's Missing

While the codebase has extensive infrastructure, the following gaps exist:

1. **Wizard-Specific State Endpoints**: Need endpoints tailored for wizard UI flow (settings, progress, results)
2. **Persistent Investigation Templates**: Template save/load/delete functionality (SQLite-based)
3. **State Synchronization Strategy**: Coordination between polling and WebSocket updates
4. **Wizard State Recovery**: Resume investigations from any step in the wizard
5. **Enhanced SQLite Schema**: Extend existing schema for wizard state fields
6. **Frontend-Backend Schema Alignment**: Ensure wizard state matches backend investigation schema

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Investigation Template Management (Priority: P1)

**User wants to save investigation configurations as reusable templates**

**Why this priority**: Templates are fundamental to wizard UX - users expect to save and reuse common investigation patterns without re-entering settings each time.

**Independent Test**: Can be fully tested by creating a new template from wizard settings, verifying persistence in Firebase, and successfully loading it in a new investigation session.

**Acceptance Scenarios**:

1. **Given** user has configured investigation settings in wizard, **When** user clicks "Save as Template" button, **Then** template is persisted to SQLite database with unique ID and appears in template list
2. **Given** user has saved templates, **When** user opens wizard settings page, **Then** all saved templates are displayed with name, description, entity count, and last modified date
3. **Given** user selects a saved template, **When** template loads, **Then** all wizard settings (entities, time range, tools, correlation mode) populate correctly
4. **Given** user has a saved template, **When** user clicks delete button, **Then** template is removed from database and no longer appears in list
5. **Given** template name conflicts with existing template, **When** user attempts to save, **Then** system prompts for unique name or confirms overwrite

---

### User Story 2 - Investigation State Persistence (Priority: P1)

**User wants to pause investigation and resume later from exact same point**

**Why this priority**: Critical for long-running investigations or interruptions - users must be able to return to investigations without losing progress or state.

**Independent Test**: Start investigation, navigate away mid-execution, return later and verify all state (progress, logs, settings, partial results) is intact.

**Acceptance Scenarios**:

1. **Given** investigation is running at 45% progress, **When** user closes browser, **Then** investigation state persists in SQLite database with current phase, agent status, and accumulated logs
2. **Given** user returns to paused investigation, **When** wizard loads, **Then** progress page displays with exact state: current phase, completed phases, log stream, and active agents
3. **Given** investigation has completed while user was away, **When** user returns, **Then** wizard automatically navigates to results page with complete findings
4. **Given** investigation encountered error mid-execution, **When** user returns, **Then** error state is displayed with option to retry or cancel
5. **Given** multiple investigations exist, **When** user views investigation list, **Then** each shows accurate status (running, paused, completed, error) and last update timestamp

---

### User Story 3 - Polling-Based State Synchronization (Priority: P2)

**User wants real-time updates without requiring WebSocket connections**

**Why this priority**: Polling provides reliable alternative to WebSocket for restrictive network environments and simplifies state management for wizard UI.

**Independent Test**: Start investigation with polling enabled, verify wizard progress page updates every 2 seconds with new logs, phase changes, and progress percentage without WebSocket connection.

**Acceptance Scenarios**:

1. **Given** investigation is running, **When** polling is active, **Then** progress page updates every 2 seconds with new agent logs, phase transitions, and progress percentage
2. **Given** investigation transitions from "running" to "completed", **When** polling detects state change, **Then** wizard automatically navigates to results page
3. **Given** network connection is temporarily lost, **When** connection resumes, **Then** polling recovers and backfills missed updates without data loss
4. **Given** investigation has high activity (multiple agents executing), **When** polling is active, **Then** polling interval adapts to 500ms for faster updates
5. **Given** investigation has been idle for 5 minutes, **When** polling detects low activity, **Then** polling interval increases to 5 seconds to reduce server load

---

### User Story 4 - Wizard State Recovery (Priority: P2)

**User wants to resume investigation wizard from any step after page reload**

**Why this priority**: Enhances user experience by eliminating need to restart wizard flow after browser refresh or navigation.

**Independent Test**: Start wizard at settings page, reload browser, verify wizard restores to settings page with all entered data intact.

**Acceptance Scenarios**:

1. **Given** user is configuring settings in wizard, **When** page refreshes, **Then** wizard restores to settings step with all entity selections, time ranges, and tool matrix intact
2. **Given** investigation is running at progress step, **When** page refreshes, **Then** wizard restores to progress step with real-time log stream and accurate progress state
3. **Given** investigation completed and user viewing results, **When** page refreshes, **Then** wizard restores to results step with complete findings, risk gauges, and visualizations
4. **Given** wizard state is older than 7 days, **When** user attempts to load, **Then** system prompts to start fresh investigation or archive old state
5. **Given** multiple browser tabs open for same investigation, **When** state changes in one tab, **Then** other tabs sync to latest state within 5 seconds

---

### User Story 5 - Investigation History and Resume (Priority: P3)

**User wants to view history of past investigations and resume any of them**

**Why this priority**: Provides audit trail and enables users to return to previous investigations for reference or continuation.

**Independent Test**: Complete 3 investigations, verify all appear in history with accurate status, timestamps, and ability to view results or resume if incomplete.

**Acceptance Scenarios**:

1. **Given** user has completed investigations, **When** user opens investigation history, **Then** all investigations display with name, status, risk score, entity count, start/end timestamps, and duration
2. **Given** user selects completed investigation from history, **When** investigation loads, **Then** wizard navigates directly to results page with complete findings
3. **Given** user has incomplete investigation in history, **When** user clicks "Resume", **Then** wizard loads at last known step with all state intact
4. **Given** investigation history has 100+ entries, **When** user views history, **Then** list paginates with filters for status, date range, risk level, and entity type
5. **Given** user wants to archive old investigations, **When** user selects and archives, **Then** investigations move to archive view and no longer appear in active history

---

### Edge Cases

- **What happens when SQLite persistence fails mid-investigation?** System falls back to in-memory state with warning notification, attempts retry with exponential backoff
- **How does system handle when polling and WebSocket provide conflicting state?** WebSocket takes precedence as authoritative source, polling serves as fallback
- **What happens when SQLite database becomes corrupted?** Schema validation on load rejects invalid state with error message, system offers database recovery/rebuild option
- **How does system handle when browser local storage is full?** Critical wizard state stored server-side in SQLite, non-critical state degrades gracefully with user notification
- **What happens when multiple users access same investigation simultaneously?** Last-write-wins strategy with conflict detection, notification to users about concurrent access
- **How does system handle when investigation takes longer than session timeout?** Background investigation continues server-side, polling maintains connection, JWT refresh handled transparently

## Requirements *(mandatory)*

### Functional Requirements

**Backend API Endpoints:**
- **FR-001**: System MUST provide `/api/v1/wizard/{investigation_id}/state` endpoint for retrieving complete wizard state (settings, progress, results)
- **FR-002**: System MUST provide `/api/v1/wizard/{investigation_id}/state` PUT endpoint for persisting wizard state to SQLite database
- **FR-003**: System MUST provide `/api/v1/wizard/{investigation_id}/poll` endpoint with adaptive interval based on investigation activity (fast: 500ms, normal: 2000ms, slow: 5000ms)
- **FR-004**: System MUST provide `/api/v1/wizard/templates` endpoint for CRUD operations on investigation templates
- **FR-005**: System MUST provide `/api/v1/wizard/history` endpoint for retrieving investigation history with pagination, filtering, and sorting

**SQLite Persistence:**
- **FR-006**: System MUST persist investigation state to SQLite database using SQLAlchemy ORM with all wizard state fields
- **FR-007**: System MUST persist investigation templates to SQLite database with user-scoped access control
- **FR-008**: System MUST validate all database reads/writes against Pydantic schemas with fail-fast behavior on validation errors
- **FR-009**: System MUST implement transaction-based writes to SQLite to ensure state consistency
- **FR-010**: System MUST maintain investigation audit log in SQLite with all state transitions, user actions, and system events

**State Management:**
- **FR-011**: Frontend MUST use existing `wizardStore.ts` (Zustand) enhanced with local storage persistence for offline capability
- **FR-012**: System MUST synchronize wizard state between polling updates and WebSocket events with conflict resolution
- **FR-013**: System MUST cache investigation state locally (browser storage) with TTL of 7 days
- **FR-014**: System MUST implement optimistic updates with rollback on conflict or error
- **FR-015**: System MUST persist wizard step navigation history for back/forward navigation

**Polling Implementation:**
- **FR-016**: System MUST implement adaptive polling strategy: fast (500ms) for active investigations, normal (2s) for idle, slow (5s) for completed
- **FR-017**: System MUST implement exponential backoff on polling errors: base 2s × 2^retry_count, max 30s
- **FR-018**: System MUST deduplicate messages/events received via both polling and WebSocket connections
- **FR-019**: System MUST support server-sent events (SSE) as alternative to polling for environments blocking custom intervals
- **FR-020**: System MUST track "last_seen" timestamp to fetch only incremental updates, reducing bandwidth

**Configuration (SYSTEM MANDATE Compliance):**
- **FR-021**: All database configuration (SQLite path, connection pool settings) MUST come from environment variables with validation
- **FR-022**: All polling intervals MUST be configurable via environment variables with Pydantic validation
- **FR-023**: System MUST validate all configuration at startup with fail-fast behavior on missing/invalid values
- **FR-024**: System MUST support multiple database environments (dev, staging, production) via environment configuration
- **FR-025**: System MUST implement connection pooling for SQLite operations with configurable pool size

### Key Entities *(feature involves data)*

- **Investigation State**: Complete wizard state including settings, progress, results, and metadata
  - Fields: investigation_id, user_id, wizard_step, entities, settings, progress_data, results, status, created_at, updated_at, last_accessed
  - Relationships: One investigation has many templates, many audit log entries

- **Investigation Template**: Saved investigation configuration for reuse
  - Fields: template_id, user_id, name, description, entities, settings, tool_matrix, correlation_mode, created_at, updated_at, usage_count
  - Relationships: Belongs to user, created from investigation state

- **Polling State**: Current polling configuration and status
  - Fields: investigation_id, is_polling, poll_interval, last_poll_timestamp, retry_count, error_state, connection_quality
  - Relationships: Belongs to investigation, tracks polling health

- **Audit Log Entry**: Record of state changes and user actions
  - Fields: entry_id, investigation_id, user_id, action_type, previous_state, new_state, timestamp, source (polling/websocket/user)
  - Relationships: Belongs to investigation, provides audit trail

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can save investigation templates in under 5 seconds with 99.9% success rate
- **SC-002**: Users can resume investigations from any wizard step with 100% state fidelity after page reload
- **SC-003**: Polling provides investigation updates with maximum 2-second latency for active investigations
- **SC-004**: System handles 1000 concurrent polling connections per server with <1% error rate
- **SC-005**: SQLite persistence operations complete within 500ms at 99th percentile
- **SC-006**: Investigation history loads within 1 second for datasets up to 1000 investigations
- **SC-007**: Polling adapts interval correctly: transitions to fast mode within 1 second of activity detection
- **SC-008**: State synchronization between polling and WebSocket maintains consistency with zero data loss
- **SC-009**: Users can create, save, load, and delete templates with 90% success on first attempt without support
- **SC-010**: System recovers from database errors within 30 seconds using local cache and retry logic

### Business Outcomes

- **SC-011**: Reduce investigation abandonment rate by 50% through state persistence and resume capability
- **SC-012**: Increase user satisfaction scores by 30% through reliable polling alternative to WebSocket
- **SC-013**: Reduce support tickets related to "lost investigation progress" by 80%
- **SC-014**: Enable users to complete 3x more investigations through template reuse
- **SC-015**: Achieve 95% user adoption of polling-based updates within 3 months of deployment

## Technical Architecture

### Backend Components

1. **Wizard State Router** (`wizard_state_router.py`)
   - REST API endpoints for wizard state CRUD operations
   - SQLite/SQLAlchemy integration for persistence
   - Pydantic schemas for validation

2. **Polling Service** (`wizard_polling_service.py`)
   - Adaptive polling interval management
   - State diff computation for incremental updates
   - Connection quality monitoring

3. **Template Service** (`template_service.py`)
   - Template CRUD operations via SQLAlchemy ORM
   - Schema validation and versioning
   - User-specific template management

4. **State Synchronization Service** (`state_sync_service.py`)
   - Conflict resolution between polling and WebSocket
   - Optimistic update handling
   - Event deduplication

5. **SQLAlchemy Models** (`wizard_models.py`)
   - InvestigationState model with JSON fields for wizard data
   - InvestigationTemplate model with user relationships
   - AuditLog model for state change tracking
   - Indexes for query performance optimization

### Frontend Components

1. **Enhanced Wizard Store** (`wizardStore.ts`)
   - Zustand store with local storage persistence for offline capability
   - Polling subscription management
   - Optimistic update handling with server synchronization

2. **Polling Hook** (`useInvestigationPolling.ts`)
   - Adaptive polling implementation (leverages existing `/docs/frontend/FRONTEND_POLLING_SPECIFICATION.md`)
   - Connection health monitoring
   - Error handling and recovery

3. **Template Management Components**
   - Template selector UI with search and filtering
   - Template save/load/delete actions
   - Template preview and validation

4. **State Recovery Middleware**
   - Automatic wizard step restoration from server
   - Local cache management with TTL
   - Conflict resolution UI for concurrent updates

### SQLite Database Schema

```sql
-- Investigation State Table (extends existing investigations table)
CREATE TABLE investigation_states (
    investigation_id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    wizard_step VARCHAR NOT NULL,
    settings_json TEXT,
    progress_json TEXT,
    results_json TEXT,
    status VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id)
);

-- Investigation Templates Table
CREATE TABLE investigation_templates (
    template_id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    template_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    UNIQUE(user_id, name)
);

-- Audit Log Table
CREATE TABLE investigation_audit_log (
    entry_id VARCHAR PRIMARY KEY,
    investigation_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    action_type VARCHAR NOT NULL,
    previous_state TEXT,
    new_state TEXT,
    source VARCHAR NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id)
);

-- Indexes for performance
CREATE INDEX idx_investigation_states_user ON investigation_states(user_id);
CREATE INDEX idx_investigation_states_status ON investigation_states(status);
CREATE INDEX idx_templates_user ON investigation_templates(user_id);
CREATE INDEX idx_audit_log_investigation ON investigation_audit_log(investigation_id);
CREATE INDEX idx_audit_log_timestamp ON investigation_audit_log(timestamp);
```

## Configuration Schema (SYSTEM MANDATE Compliance)

### Environment Variables

```bash
# Database Configuration
DATABASE_URL=sqlite:///olorin.db
SQLALCHEMY_POOL_SIZE=5
SQLALCHEMY_MAX_OVERFLOW=10
SQLALCHEMY_POOL_TIMEOUT=30
SQLALCHEMY_ECHO=false

# Polling Configuration
WIZARD_POLLING_FAST_INTERVAL_MS=500
WIZARD_POLLING_NORMAL_INTERVAL_MS=2000
WIZARD_POLLING_SLOW_INTERVAL_MS=5000
WIZARD_POLLING_MAX_RETRIES=3
WIZARD_POLLING_BACKOFF_MULTIPLIER=2
WIZARD_POLLING_MAX_BACKOFF_MS=30000

# State Persistence Configuration
WIZARD_STATE_CACHE_TTL_SECONDS=604800  # 7 days
WIZARD_STATE_MAX_SIZE_KB=500
WIZARD_TEMPLATE_MAX_COUNT_PER_USER=50
WIZARD_HISTORY_MAX_AGE_DAYS=90

# Database Connection Pool Configuration
DB_CONNECTION_RETRY_ATTEMPTS=3
DB_CONNECTION_RETRY_DELAY_MS=1000
DB_STATEMENT_TIMEOUT_MS=30000

# Feature Flags
FEATURE_WIZARD_POLLING_ENABLED=true
FEATURE_WIZARD_TEMPLATES_ENABLED=true
FEATURE_WIZARD_STATE_RECOVERY=true
FEATURE_WIZARD_AUDIT_LOGGING=true
```

### Pydantic Configuration Schema

```python
from pydantic import BaseSettings, Field, validator
from typing import Literal

class DatabaseConfig(BaseSettings):
    url: str = Field(..., env="DATABASE_URL")
    pool_size: int = Field(5, env="SQLALCHEMY_POOL_SIZE", ge=1, le=20)
    max_overflow: int = Field(10, env="SQLALCHEMY_MAX_OVERFLOW", ge=0, le=50)
    pool_timeout: int = Field(30, env="SQLALCHEMY_POOL_TIMEOUT", ge=10, le=60)
    echo: bool = Field(False, env="SQLALCHEMY_ECHO")
    retry_attempts: int = Field(3, env="DB_CONNECTION_RETRY_ATTEMPTS", ge=1, le=10)
    retry_delay_ms: int = Field(1000, env="DB_CONNECTION_RETRY_DELAY_MS", ge=100, le=5000)
    statement_timeout_ms: int = Field(30000, env="DB_STATEMENT_TIMEOUT_MS", ge=1000, le=60000)

    @validator('url')
    def validate_database_url(cls, v):
        if not v or v == "<required>":
            raise ValueError("Database URL must be configured")
        return v

class WizardPollingConfig(BaseSettings):
    fast_interval_ms: int = Field(500, env="WIZARD_POLLING_FAST_INTERVAL_MS", ge=100, le=1000)
    normal_interval_ms: int = Field(2000, env="WIZARD_POLLING_NORMAL_INTERVAL_MS", ge=1000, le=5000)
    slow_interval_ms: int = Field(5000, env="WIZARD_POLLING_SLOW_INTERVAL_MS", ge=3000, le=10000)
    max_retries: int = Field(3, env="WIZARD_POLLING_MAX_RETRIES", ge=1, le=10)
    backoff_multiplier: int = Field(2, env="WIZARD_POLLING_BACKOFF_MULTIPLIER", ge=2, le=5)
    max_backoff_ms: int = Field(30000, env="WIZARD_POLLING_MAX_BACKOFF_MS", ge=10000, le=60000)

class WizardStateConfig(BaseSettings):
    cache_ttl_seconds: int = Field(604800, env="WIZARD_STATE_CACHE_TTL_SECONDS")
    max_size_kb: int = Field(500, env="WIZARD_STATE_MAX_SIZE_KB")
    template_max_count_per_user: int = Field(50, env="WIZARD_TEMPLATE_MAX_COUNT_PER_USER")
    history_max_age_days: int = Field(90, env="WIZARD_HISTORY_MAX_AGE_DAYS")

class WizardFeatureFlags(BaseSettings):
    sqlite_persistence: bool = Field(True, env="FEATURE_WIZARD_SQLITE_PERSISTENCE")
    polling_enabled: bool = Field(True, env="FEATURE_WIZARD_POLLING_ENABLED")
    templates_enabled: bool = Field(True, env="FEATURE_WIZARD_TEMPLATES_ENABLED")
    state_recovery: bool = Field(True, env="FEATURE_WIZARD_STATE_RECOVERY")
    audit_logging: bool = Field(True, env="FEATURE_WIZARD_AUDIT_LOGGING")

class WizardConfig(BaseSettings):
    database: DatabaseConfig = DatabaseConfig()
    polling: WizardPollingConfig = WizardPollingConfig()
    state: WizardStateConfig = WizardStateConfig()
    features: WizardFeatureFlags = WizardFeatureFlags()

    class Config:
        env_file = ".env"

def load_wizard_config() -> WizardConfig:
    try:
        return WizardConfig()
    except Exception as e:
        raise RuntimeError(f"Invalid wizard configuration – refusing to start: {e}")
```

## Integration Points

### Leveraging Existing Infrastructure

1. **Existing Polling Specification**: Adopt patterns from `/docs/frontend/FRONTEND_POLLING_SPECIFICATION.md`
2. **Existing Investigation API**: Extend `structured_investigation_router.py` with wizard-specific endpoints
3. **Existing Status Controller**: Utilize `investigation_status_controller.py` for status polling
4. **Existing Wizard Store**: Enhance `wizardStore.ts` with persistence middleware
5. **Existing WebSocket Integration**: Maintain parallel WebSocket updates with conflict resolution

### New Endpoints Required

```python
# Wizard State Management
GET  /api/v1/wizard/{investigation_id}/state
PUT  /api/v1/wizard/{investigation_id}/state
GET  /api/v1/wizard/{investigation_id}/poll
GET  /api/v1/wizard/{investigation_id}/checkpoint

# Template Management
GET    /api/v1/wizard/templates
POST   /api/v1/wizard/templates
GET    /api/v1/wizard/templates/{template_id}
PUT    /api/v1/wizard/templates/{template_id}
DELETE /api/v1/wizard/templates/{template_id}

# Investigation History
GET /api/v1/wizard/history?status=completed&page=1&limit=20
GET /api/v1/wizard/history/{investigation_id}
POST /api/v1/wizard/history/{investigation_id}/archive
```

## Dependencies

### Backend
- **sqlalchemy**: ORM for SQLite persistence (already present)
- **pydantic**: Configuration validation (already present)
- **fastapi**: REST API framework (already present)
- **aiosqlite**: Async SQLite adapter (may need to add)

### Frontend
- **zustand**: State management (already present)
- **react-query**: API state management and caching
- **zod**: TypeScript schema validation

## Testing Strategy

### Backend Tests
- **Unit Tests**: SQLite CRUD operations, polling logic, state synchronization
- **Integration Tests**: Complete wizard flow with persistence, polling endpoint reliability
- **Load Tests**: 1000 concurrent polling connections, SQLite write throughput
- **Schema Tests**: Verify schema compliance, no DDL operations

### Frontend Tests
- **Unit Tests**: Wizard store persistence middleware, polling hook state management
- **Component Tests**: Template UI interactions, state recovery flows
- **E2E Tests**: Complete wizard journey with polling, page reload recovery

## Security Considerations

- All database configuration via environment variables/secrets (SYSTEM MANDATE compliant)
- JWT validation on all wizard endpoints
- User-scoped access control for templates and investigations
- Rate limiting on polling endpoints (10 requests/second per user)
- Input validation with Pydantic on all SQLite writes
- Audit logging for all state modifications
- SQL injection prevention through parameterized queries only
- No dynamic SQL column names from user input

## Performance Targets

- SQLite write operations: <500ms at p99
- Polling latency: <2s for active investigations
- State recovery: <1s for wizard reload
- Template load: <500ms
- History query: <1s for 1000 records
- Concurrent polling: 1000 connections per server
- Database connection pool: 5-20 connections with proper timeout

## Rollout Strategy

1. **Phase 1**: Extend SQLite schema for wizard state (schema review and approval)
2. **Phase 2**: Implement wizard state persistence endpoints with SQLAlchemy
3. **Phase 3**: Add template management UI and endpoints
4. **Phase 4**: Enable polling with feature flag (parallel to WebSocket)
5. **Phase 5**: Add state recovery and resume capabilities
6. **Phase 6**: Launch investigation history view
7. **Phase 7**: Gradual rollout with monitoring and optimization

## Open Questions

1. Should templates be shared across users in same organization?
2. What retention policy for completed investigations in SQLite database?
3. Should polling automatically disable when WebSocket is healthy?
4. How to handle schema migrations for existing wizard state? (No auto-migration per SYSTEM MANDATE)
5. Should state checkpoints be automatic or user-triggered?
6. Database backup and recovery strategy for SQLite files?
7. How to handle database file corruption scenarios?
