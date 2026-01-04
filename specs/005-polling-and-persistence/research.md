# Technical Research: Investigation State Polling and Persistence

**Feature**: `005-polling-and-persistence`
**Date**: 2025-10-14
**Research Phase**: Phase 0
**Status**: Complete

## Executive Summary

This research document analyzes the existing Olorin infrastructure to identify patterns, gaps, and implementation strategies for wizard state polling and persistence with SQLite. The feature extends current investigation management with wizard-specific state management, adaptive polling, template persistence, and complete state recovery capabilities.

**Key Finding**: The codebase has substantial infrastructure (1,001-line polling spec, SQLAlchemy models, Zustand store) that can be extended rather than rebuilt. SQLite persistence decision simplifies implementation by leveraging existing database infrastructure.

## 1. Existing Infrastructure Analysis

### 1.1 Polling Infrastructure (/docs/frontend/FRONTEND_POLLING_SPECIFICATION.md)

**Comprehensive Polling Specification Discovered** (1,001 lines):

**Core Components**:
- **Adaptive Polling Strategy**: Fast (500ms), Normal (2s), Slow (5s) intervals
- **InvestigationPollingService Class**: Complete TypeScript implementation
- **React Hook**: `useInvestigationPolling` with state management
- **Error Handling**: Network, HTTP, Parse, Timeout, Abort error types
- **Message Deduplication**: Prevents duplicate processing
- **WebSocket Compatibility Layer**: Migration support

**Key Patterns to Leverage**:

```typescript
// Existing polling configuration
interface PollingConfig {
  baseInterval: number;        // 2000ms - Normal polling interval
  fastInterval: number;        // 500ms - Fast polling when active
  slowInterval: number;        // 5000ms - Slow polling when idle
  maxRetries: number;          // 3 - Max consecutive failures
  backoffMultiplier: number;   // 2 - Exponential backoff
  maxBackoff: number;          // 30000ms - Max backoff interval
}
```

**Existing API Endpoints** (To Be Extended):
- `GET /investigations/{investigation_id}/poll/status` - Investigation status
- `GET /investigations/{investigation_id}/poll/messages` - Message stream
- `GET /investigations/{investigation_id}/poll/latest` - Combined data

**Gap**: These endpoints are investigation-centric, not wizard-centric. Need wizard-specific endpoints for:
- Wizard step state (Settings/Progress/Results)
- Template management (save/load/delete)
- State checkpoint/recovery

### 1.2 Backend Persistence Layer

**Current Architecture** (Hybrid SQLite + In-Memory):

**Location**: `/Users/gklainert/Documents/olorin/olorin-server/app/persistence/`

**Files**:
1. `__init__.py` (133 lines) - In-memory OrderedDict with max 20 investigations
2. `models.py` (149 lines) - SQLAlchemy ORM models
3. `database.py` (109 lines) - Database session management

**Current SQLAlchemy Models** (`models.py`):

```python
class InvestigationRecord(Base, TimestampMixin):
    """Investigation record model for fraud investigations."""

    __tablename__ = "investigations"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    entity_type = Column(String, nullable=False)  # user, device, transaction
    entity_id = Column(String, nullable=False, index=True)
    investigation_type = Column(String, nullable=False)  # fraud, ato
    status = Column(String, default="pending", nullable=False)
    priority = Column(String, default="medium", nullable=False)

    # Investigation details
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    findings = Column(JSON, nullable=True)
    risk_score = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)

    # Agent and workflow tracking
    assigned_agent = Column(String, nullable=True)
    workflow_state = Column(JSON, nullable=True)

    # Metadata
    tags = Column(JSON, nullable=True)
    meta_data = Column(JSON, nullable=True)
```

**Current Database Configuration** (`database.py`):

```python
def init_database():
    """Initialize database engine and session factory."""
    settings = get_settings_for_env()
    database_url = getattr(settings, 'DATABASE_URL', 'sqlite:///./olorin_test.db')

    _engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False} if database_url.startswith("sqlite") else {}
    )

    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
```

**Existing Audit Logging**:

```python
class AuditLog(Base, TimestampMixin):
    """Audit log for tracking all system actions."""

    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=True, index=True)
    action = Column(String, nullable=False, index=True)
    resource_type = Column(String, nullable=False)
    resource_id = Column(String, nullable=True, index=True)
    details = Column(JSON, nullable=True)
    success = Column(Boolean, nullable=False)
    error_message = Column(Text, nullable=True)
```

**Gap**: Need wizard-specific tables:
- `investigation_states` - Wizard step state persistence
- `investigation_templates` - Template save/load functionality
- `investigation_audit_log` - Wizard-specific audit trail (extends existing AuditLog pattern)

### 1.3 Frontend State Management

**Location**: `/Users/gklainert/Documents/olorin/olorin-front/src/shared/store/wizardStore.ts`

**Existing Zustand Store** (203 lines):

```typescript
export const useWizardStore = create<WizardState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentStep: WizardStep.SETTINGS,
        completedSteps: [],
        investigation: null,
        settings: null,
        results: null,
        isLoading: false,
        error: null,

        // Step navigation
        setCurrentStep: (step) => { /* ... */ },
        markStepCompleted: (step) => { /* ... */ },
        navigateToStep: (step) => { /* ... */ },

        // Investigation management
        setInvestigation: (investigation) => { /* ... */ },
        updateSettings: (settingsUpdate) => { /* ... */ },
        setResults: (results) => { /* ... */ },

        startInvestigation: () => { /* ... */ },
        completeInvestigation: () => { /* ... */ },
        resetWizard: () => { /* ... */ },

        setLoading: (loading) => { /* ... */ },
        setError: (error) => { /* ... */ }
      }),
      {
        name: 'olorin-wizard-storage',
        partialize: (state) => ({
          currentStep: state.currentStep,
          completedSteps: state.completedSteps,
          investigation: state.investigation,
          settings: state.settings,
          results: state.results
        })
      }
    )
  )
);
```

**Current Capabilities**:
- Local storage persistence with partialize
- Step navigation with validation
- Investigation lifecycle management
- Zustand devtools integration

**Gaps**:
- No server synchronization
- No template management
- No polling integration
- No conflict resolution
- No state recovery from server

### 1.4 Investigation Router Patterns

**Location**: `/Users/gklainert/Documents/olorin/olorin-server/app/router/investigations_router.py`

**Current CRUD Operations**:

```python
@investigations_router.post("/investigation", response_model=InvestigationOut)
def create_investigation_endpoint(
    investigation: InvestigationCreate,
    current_user: User = Depends(require_write)
):
    existing = get_investigation(investigation.id)
    if existing:
        existing.status = "IN_PROGRESS"
        return InvestigationOut.model_validate(existing)
    inv = create_investigation(investigation)
    return InvestigationOut.model_validate(inv)

@investigations_router.get("/investigation/{investigation_id}", response_model=InvestigationOut)
def get_investigation_endpoint(
    investigation_id: str,
    entity_id: str = Query(None),
    entity_type: str = Query("user_id"),
    current_user: User = Depends(require_read)
):
    # ... implementation

@investigations_router.put("/investigation/{investigation_id}", response_model=InvestigationOut)
def update_investigation_endpoint(
    investigation_id: str,
    update: InvestigationUpdate,
    current_user: User = Depends(require_write)
):
    # ... implementation
```

**Pattern to Replicate**: Create `wizard_state_router.py` with similar structure for wizard-specific operations.

### 1.5 WebSocket Integration

**Location**: `/Users/gklainert/Documents/olorin/olorin-server/app/router/websocket_router.py`

**Current Real-Time Updates**:
- WebSocket connections for live investigation updates
- Agent progress reporting
- Log streaming
- Status change notifications

**Integration Strategy**: Polling and WebSocket can coexist:
- **WebSocket**: Real-time updates when connection available
- **Polling**: Fallback/alternative for reliability
- **Conflict Resolution**: WebSocket authoritative, polling as backup

## 2. Schema Extension Design

### 2.1 Required New Tables

Based on spec.md requirements and existing patterns, extend SQLite schema:

**Table 1: investigation_states**

```sql
CREATE TABLE investigation_states (
    investigation_id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    wizard_step VARCHAR NOT NULL,  -- SETTINGS, PROGRESS, RESULTS
    settings_json TEXT,              -- Wizard settings as JSON
    progress_json TEXT,              -- Progress state as JSON
    results_json TEXT,               -- Results as JSON
    status VARCHAR NOT NULL,         -- IN_PROGRESS, COMPLETED, ERROR
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id)
);

CREATE INDEX idx_investigation_states_user ON investigation_states(user_id);
CREATE INDEX idx_investigation_states_status ON investigation_states(status);
```

**Table 2: investigation_templates**

```sql
CREATE TABLE investigation_templates (
    template_id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    template_json TEXT NOT NULL,     -- Complete template as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    UNIQUE(user_id, name)
);

CREATE INDEX idx_templates_user ON investigation_templates(user_id);
```

**Table 3: investigation_audit_log**

```sql
CREATE TABLE investigation_audit_log (
    entry_id VARCHAR PRIMARY KEY,
    investigation_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    action_type VARCHAR NOT NULL,    -- STATE_CHANGE, TEMPLATE_SAVED, etc.
    previous_state TEXT,             -- JSON snapshot before
    new_state TEXT,                  -- JSON snapshot after
    source VARCHAR NOT NULL,         -- POLLING, WEBSOCKET, USER
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id)
);

CREATE INDEX idx_audit_log_investigation ON investigation_audit_log(investigation_id);
CREATE INDEX idx_audit_log_timestamp ON investigation_audit_log(timestamp);
```

### 2.2 SQLAlchemy Model Design

Following existing `models.py` patterns:

```python
class InvestigationState(Base, TimestampMixin):
    """Wizard state persistence model."""

    __tablename__ = "investigation_states"

    investigation_id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    wizard_step = Column(String, nullable=False)  # WizardStep enum
    settings_json = Column(Text, nullable=True)
    progress_json = Column(Text, nullable=True)
    results_json = Column(Text, nullable=True)
    status = Column(String, nullable=False)
    last_accessed = Column(DateTime(timezone=True), nullable=True)

    def to_dict(self):
        """Convert to dict for API response."""
        return {
            'investigation_id': self.investigation_id,
            'user_id': self.user_id,
            'wizard_step': self.wizard_step,
            'settings': json.loads(self.settings_json) if self.settings_json else None,
            'progress': json.loads(self.progress_json) if self.progress_json else None,
            'results': json.loads(self.results_json) if self.results_json else None,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None
        }
```

**SYSTEM MANDATE Compliance**:
- ✅ No auto-migration (schema extension requires manual approval)
- ✅ All columns explicitly defined (no dynamic schema)
- ✅ Parameterized queries only (no SQL injection risk)
- ✅ Foreign key constraints enforce referential integrity

## 3. API Design Patterns

### 3.1 Wizard State Endpoints

Following existing `investigations_router.py` patterns:

```python
# wizard_state_router.py

@wizard_router.get("/wizard/{investigation_id}/state")
async def get_wizard_state(
    investigation_id: str,
    current_user: User = Depends(require_read),
    db: Session = Depends(get_db)
):
    """Retrieve complete wizard state for investigation."""
    state = db.query(InvestigationState).filter_by(
        investigation_id=investigation_id
    ).first()

    if not state:
        raise HTTPException(status_code=404, detail="Wizard state not found")

    return state.to_dict()

@wizard_router.put("/wizard/{investigation_id}/state")
async def update_wizard_state(
    investigation_id: str,
    state_update: WizardStateUpdate,
    current_user: User = Depends(require_write),
    db: Session = Depends(get_db)
):
    """Persist wizard state to database."""
    # Validate state with Pydantic
    # Update database with transaction
    # Create audit log entry
    pass
```

### 3.2 Polling Endpoints

Extend existing polling infrastructure:

```python
@wizard_router.get("/wizard/{investigation_id}/poll")
async def poll_wizard_state(
    investigation_id: str,
    since_timestamp: Optional[str] = None,
    current_user: User = Depends(require_read),
    db: Session = Depends(get_db)
):
    """Adaptive polling for wizard state changes."""
    # Determine polling interval based on activity
    # Return incremental updates since timestamp
    # Include state diff for efficiency
    pass
```

### 3.3 Template Management Endpoints

```python
@wizard_router.post("/wizard/templates")
async def create_template(
    template: TemplateCreate,
    current_user: User = Depends(require_write),
    db: Session = Depends(get_db)
):
    """Save investigation template."""
    # Validate template with Pydantic
    # Enforce user ownership
    # Check for name conflicts
    pass

@wizard_router.get("/wizard/templates")
async def list_templates(
    current_user: User = Depends(require_read),
    db: Session = Depends(get_db)
):
    """List user's saved templates."""
    # Query templates for current user
    # Return with usage count and metadata
    pass
```

## 4. State Synchronization Strategy

### 4.1 Polling vs. WebSocket Coordination

**Conflict Resolution Rules**:

1. **WebSocket Priority**: When both active, WebSocket updates take precedence
2. **Polling Fallback**: Polling provides backup when WebSocket unavailable
3. **Event Deduplication**: Track message IDs to prevent duplicate processing
4. **Timestamp-Based**: Use `updated_at` for conflict resolution

**Implementation**:

```typescript
class StateSync {
  private webSocketState: WizardState | null = null;
  private pollingState: WizardState | null = null;

  mergeState(
    wsState: WizardState | null,
    pollState: WizardState | null
  ): WizardState {
    // WebSocket authoritative if connected
    if (wsState && this.isWebSocketConnected()) {
      return wsState;
    }

    // Polling state if WebSocket unavailable
    if (pollState) {
      return pollState;
    }

    // Use most recent by timestamp
    if (wsState && pollState) {
      return wsState.updated_at > pollState.updated_at ? wsState : pollState;
    }

    return wsState || pollState || this.getDefaultState();
  }
}
```

### 4.2 Optimistic Updates

**Frontend Strategy**:

```typescript
async function updateWizardState(updates: Partial<WizardState>) {
  // 1. Optimistically update local state
  wizardStore.updateSettings(updates);

  // 2. Send to server
  try {
    const response = await api.put(`/wizard/${investigationId}/state`, updates);

    // 3. Confirm with server response
    wizardStore.setServerState(response.data);
  } catch (error) {
    // 4. Rollback on failure
    wizardStore.rollbackState();

    // 5. Notify user
    notifications.error('Failed to save wizard state');
  }
}
```

## 5. Configuration Management

### 5.1 Backend Configuration (Pydantic)

Following SYSTEM MANDATE configuration requirements:

```python
class DatabaseConfig(BaseSettings):
    """Database configuration with validation."""

    url: str = Field(..., env="DATABASE_URL")
    pool_size: int = Field(5, env="SQLALCHEMY_POOL_SIZE", ge=1, le=20)
    max_overflow: int = Field(10, env="SQLALCHEMY_MAX_OVERFLOW", ge=0, le=50)
    pool_timeout: int = Field(30, env="SQLALCHEMY_POOL_TIMEOUT", ge=10, le=60)
    echo: bool = Field(False, env="SQLALCHEMY_ECHO")

    @validator('url')
    def validate_database_url(cls, v):
        if not v or v == "<required>":
            raise ValueError("Database URL must be configured")
        return v

class WizardPollingConfig(BaseSettings):
    """Polling configuration with adaptive intervals."""

    fast_interval_ms: int = Field(500, env="WIZARD_POLLING_FAST_INTERVAL_MS", ge=100, le=1000)
    normal_interval_ms: int = Field(2000, env="WIZARD_POLLING_NORMAL_INTERVAL_MS", ge=1000, le=5000)
    slow_interval_ms: int = Field(5000, env="WIZARD_POLLING_SLOW_INTERVAL_MS", ge=3000, le=10000)
    max_retries: int = Field(3, env="WIZARD_POLLING_MAX_RETRIES", ge=1, le=10)
```

### 5.2 Frontend Configuration (Zod)

```typescript
import { z } from 'zod';

export const WizardConfigSchema = z.object({
  apiBaseUrl: z.string().url(),
  wsBaseUrl: z.string().url(),
  polling: z.object({
    fastInterval: z.number().int().positive(),
    normalInterval: z.number().int().positive(),
    slowInterval: z.number().int().positive(),
    maxRetries: z.number().int().positive()
  }),
  features: z.object({
    enablePolling: z.boolean(),
    enableTemplates: z.boolean(),
    enableStateRecovery: z.boolean()
  })
});

export type WizardConfig = z.infer<typeof WizardConfigSchema>;
```

## 6. Testing Strategy

### 6.1 Backend Testing Approach

**Unit Tests**:
- SQLAlchemy model serialization/deserialization
- Pydantic configuration validation
- State transition logic
- Template CRUD operations

**Integration Tests**:
- Complete wizard flow (Settings → Progress → Results)
- State persistence and recovery
- Template save/load functionality
- Audit log generation

**Schema Tests** (SYSTEM MANDATE):
- Verify no DDL operations in code
- Validate all column references exist in schema
- Test foreign key constraints
- Verify index usage in queries

### 6.2 Frontend Testing Approach

**Unit Tests**:
- Zustand store state management
- Polling service logic
- State synchronization merge logic
- Template management actions

**Component Tests**:
- Wizard navigation flow
- Settings form validation
- Progress indicator updates
- Results display

**Integration Tests**:
- Complete wizard journey
- Polling integration with backend
- WebSocket/polling coordination
- State recovery after page reload

## 7. Performance Considerations

### 7.1 Database Optimization

**Query Patterns**:

```sql
-- Optimized state retrieval with index
SELECT * FROM investigation_states
WHERE user_id = ? AND status = 'IN_PROGRESS'
ORDER BY updated_at DESC
LIMIT 20;

-- Template search with index
SELECT * FROM investigation_templates
WHERE user_id = ?
ORDER BY usage_count DESC, updated_at DESC
LIMIT 50;
```

**Connection Pooling**:
- Pool size: 5-20 connections (configurable)
- Max overflow: 10 connections
- Timeout: 30 seconds
- Echo: false in production

### 7.2 Frontend Optimization

**Polling Optimization**:
- Adaptive intervals: 500ms (fast) → 2s (normal) → 5s (slow)
- Message deduplication: Set-based tracking
- Memory management: Limit to 1000 messages
- Request cancellation: AbortController usage

**State Management**:
- Local storage: 7-day TTL
- Partial state persistence
- Optimistic updates with rollback
- Debounced server synchronization

## 8. Migration Path

### 8.1 Phased Rollout

**Phase 1: Schema Extension**
- Add new tables (requires approval)
- Deploy without feature activation
- Verify schema integrity

**Phase 2: Backend Implementation**
- Implement wizard state router
- Add polling endpoints
- Deploy with feature flag disabled

**Phase 3: Frontend Integration**
- Enhance Zustand store
- Integrate polling hook
- Deploy with feature flag

**Phase 4: Gradual Activation**
- Enable for 10% of users
- Monitor metrics
- Scale to 100%

### 8.2 Rollback Strategy

- Feature flags for instant disable
- Database rollback scripts
- State migration tools
- Backward compatibility maintained

## 9. Security Considerations

### 9.1 Authentication & Authorization

**JWT Validation**:
- All wizard endpoints require authentication
- `require_read` for GET operations
- `require_write` for PUT/POST/DELETE operations
- `require_admin` for purge operations

**User Scoping**:
- Templates scoped to user_id
- State access validated per user
- Audit logs track all actions

### 9.2 SQL Injection Prevention

**SYSTEM MANDATE Compliance**:
- Parameterized queries only
- No dynamic SQL column names
- SQLAlchemy ORM prevents injection
- Input validation with Pydantic

### 9.3 Rate Limiting

```python
# Rate limit polling endpoints
@wizard_router.get("/wizard/{investigation_id}/poll")
@rate_limit(max_requests=10, window_seconds=1)
async def poll_wizard_state(...):
    pass
```

## 10. Monitoring & Observability

### 10.1 Metrics to Track

**Performance Metrics**:
- Polling request latency (p50, p95, p99)
- Database query duration
- State update frequency
- Template usage patterns

**Business Metrics**:
- Wizard completion rate
- Template creation/usage ratio
- State recovery success rate
- User abandonment points

### 10.2 Logging Strategy

**Structured Logging**:

```python
logger.info(
    "Wizard state updated",
    extra={
        "investigation_id": investigation_id,
        "user_id": user_id,
        "wizard_step": step,
        "source": "polling",
        "duration_ms": duration
    }
)
```

## 11. Recommendations

### 11.1 Immediate Actions

1. **Schema Review**: Get database schema extension approved
2. **Configuration Setup**: Define all environment variables
3. **Router Creation**: Implement `wizard_state_router.py` following existing patterns
4. **Model Extension**: Add SQLAlchemy models to `persistence/models.py`
5. **Store Enhancement**: Extend Zustand store with server sync

### 11.2 Future Enhancements

1. **Caching Layer**: Redis for hot wizard states
2. **Batch Operations**: Bulk state updates
3. **Template Sharing**: Organization-level templates
4. **Advanced Search**: Full-text search for templates
5. **Analytics**: Wizard flow analytics dashboard

## 12. Conclusion

The Olorin codebase provides excellent foundations for wizard state polling and persistence:

**Strengths**:
- ✅ Comprehensive polling specification (1,001 lines)
- ✅ SQLAlchemy ORM infrastructure established
- ✅ Zustand store with persistence middleware
- ✅ Clear router patterns to replicate
- ✅ Audit logging framework exists

**Implementation Strategy**:
- **Extend, Don't Rebuild**: Leverage existing patterns
- **SQLite Simplicity**: No Firebase complexity
- **Configuration-Driven**: SYSTEM MANDATE compliant
- **Incremental Rollout**: Feature flags for safety

**Estimated Complexity**: Medium
- Backend: ~400 lines (router + models + service)
- Frontend: ~300 lines (store enhancement + polling integration)
- Testing: ~500 lines (comprehensive coverage)
- Total: ~1,200 lines of production code

**Next Phase**: Generate comprehensive data model specification with SQLAlchemy, Pydantic, and TypeScript schemas.

---

**Research Complete**: Ready for Phase 1 - Design Artifacts Generation
