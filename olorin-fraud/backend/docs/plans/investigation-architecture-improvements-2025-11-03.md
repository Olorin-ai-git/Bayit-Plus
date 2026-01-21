# Investigation Architecture Improvements Plan

**Author**: Gil Klainert
**Date**: 2025-11-03
**Status**: 🔄 PENDING APPROVAL

## Executive Summary

This plan addresses critical gaps in the investigation state persistence and lifecycle management system. The current implementation lacks comprehensive state tracking, tool usage persistence, and proper lifecycle management. This architecture upgrade will provide:

- Complete investigation state persistence with event sourcing
- Real-time progress tracking with granular tool usage monitoring
- Robust lifecycle management with state machine implementation
- Comprehensive audit trail for compliance and debugging
- Enhanced WebSocket integration for real-time updates

## Current State Analysis

### Critical Gaps Identified

1. **State Persistence**: Basic model exists but lacks comprehensive tracking
2. **Progress API**: No dedicated `/progress` endpoint with detailed status
3. **Tool Usage Tracking**: Not implemented - no visibility into agent tool execution
4. **Lifecycle Management**: Minimal implementation with just basic status field
5. **Audit Trail**: No event history or compliance tracking
6. **Recovery Mechanisms**: No ability to resume failed investigations

## Proposed Architecture

### 1. Enhanced Database Schema

```sql
-- Core investigation table with enhanced fields
CREATE TABLE investigations (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    investigation_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_phase VARCHAR(100),
    progress_percentage INTEGER DEFAULT 0,

    -- Lifecycle timestamps
    created_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL,

    -- Execution details
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    parent_investigation_id UUID,

    -- Results and metadata
    result JSONB,
    metadata JSONB,
    configuration JSONB,

    FOREIGN KEY (parent_investigation_id) REFERENCES investigations(id)
);

-- Investigation phases for granular tracking
CREATE TABLE investigation_phases (
    id UUID PRIMARY KEY,
    investigation_id UUID NOT NULL,
    phase_name VARCHAR(100) NOT NULL,
    phase_order INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    progress_percentage INTEGER DEFAULT 0,

    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,

    input_data JSONB,
    output_data JSONB,
    error_details JSONB,

    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
);

-- Tool execution tracking
CREATE TABLE tool_executions (
    id UUID PRIMARY KEY,
    investigation_id UUID NOT NULL,
    phase_id UUID,
    agent_name VARCHAR(100) NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    tool_version VARCHAR(20),

    -- Execution details
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    status VARCHAR(50) NOT NULL,

    -- Tool I/O
    input_parameters JSONB,
    output_result JSONB,
    error_message TEXT,

    -- Metrics
    tokens_used INTEGER,
    api_calls_made INTEGER,
    cost_estimate DECIMAL(10,4),

    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE,
    FOREIGN KEY (phase_id) REFERENCES investigation_phases(id) ON DELETE CASCADE
);

-- Event sourcing for complete audit trail
CREATE TABLE investigation_events (
    id UUID PRIMARY KEY,
    investigation_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_timestamp TIMESTAMP NOT NULL,
    actor VARCHAR(255),

    -- Event details
    previous_state VARCHAR(50),
    new_state VARCHAR(50),
    event_data JSONB,
    metadata JSONB,

    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE,
    INDEX idx_events_investigation_time (investigation_id, event_timestamp)
);

-- Progress snapshots for recovery
CREATE TABLE investigation_snapshots (
    id UUID PRIMARY KEY,
    investigation_id UUID NOT NULL,
    snapshot_timestamp TIMESTAMP NOT NULL,
    snapshot_type VARCHAR(50) NOT NULL,

    state_data JSONB NOT NULL,
    phase_states JSONB NOT NULL,
    tool_states JSONB NOT NULL,

    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE,
    INDEX idx_snapshots_investigation (investigation_id, snapshot_timestamp DESC)
);
```

### 2. State Machine Implementation

```python
from enum import Enum
from typing import Optional, Dict, Any

class InvestigationState(Enum):
    """Investigation lifecycle states"""
    CREATED = "created"
    QUEUED = "queued"
    INITIALIZING = "initializing"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETING = "completing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"

class PhaseState(Enum):
    """Individual phase states"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

# State transition rules
ALLOWED_TRANSITIONS = {
    InvestigationState.CREATED: [InvestigationState.QUEUED, InvestigationState.CANCELLED],
    InvestigationState.QUEUED: [InvestigationState.INITIALIZING, InvestigationState.CANCELLED],
    InvestigationState.INITIALIZING: [InvestigationState.RUNNING, InvestigationState.FAILED],
    InvestigationState.RUNNING: [InvestigationState.PAUSED, InvestigationState.COMPLETING, InvestigationState.FAILED],
    InvestigationState.PAUSED: [InvestigationState.RUNNING, InvestigationState.CANCELLED],
    InvestigationState.COMPLETING: [InvestigationState.COMPLETED, InvestigationState.FAILED],
    InvestigationState.FAILED: [InvestigationState.RETRYING, InvestigationState.CANCELLED],
    InvestigationState.RETRYING: [InvestigationState.INITIALIZING, InvestigationState.FAILED],
    # Terminal states
    InvestigationState.COMPLETED: [],
    InvestigationState.CANCELLED: [],
}
```

### 3. Progress Tracking System

```python
class ProgressTracker:
    """
    Comprehensive progress tracking with:
    - Phase-based progress calculation
    - Tool execution monitoring
    - Real-time updates via WebSocket
    """

    def calculate_progress(self, investigation_id: str) -> Dict[str, Any]:
        """
        Calculate detailed progress for an investigation
        """
        return {
            "investigation_id": investigation_id,
            "overall_progress": 65,  # Percentage
            "current_phase": {
                "name": "network_analysis",
                "progress": 40,
                "status": "running"
            },
            "phases": [
                {
                    "name": "initialization",
                    "status": "completed",
                    "progress": 100,
                    "duration_ms": 1200
                },
                {
                    "name": "device_analysis",
                    "status": "completed",
                    "progress": 100,
                    "duration_ms": 3500,
                    "tools_used": ["fingerprint_analyzer", "device_reputation"]
                },
                {
                    "name": "network_analysis",
                    "status": "running",
                    "progress": 40,
                    "active_tool": "ip_geolocation",
                    "tools_completed": ["vpn_detection"],
                    "tools_pending": ["proxy_detection", "tor_check"]
                }
            ],
            "tool_executions": [
                {
                    "tool": "fingerprint_analyzer",
                    "agent": "device_agent",
                    "status": "completed",
                    "duration_ms": 1800,
                    "result_summary": "High confidence device match"
                }
            ],
            "estimated_completion": "2025-11-03T15:30:00Z",
            "state_transitions": [
                {
                    "from": "created",
                    "to": "queued",
                    "timestamp": "2025-11-03T15:00:00Z"
                }
            ]
        }
```

### 4. Enhanced API Endpoints

```python
# New and enhanced endpoints

@router.get("/investigation/{investigation_id}/progress")
async def get_investigation_progress(
    investigation_id: str,
    include_tools: bool = True,
    include_events: bool = False
) -> InvestigationProgress:
    """
    Get detailed progress for an investigation
    Always returns current state, phases, and tool usage
    """
    pass

@router.post("/investigation/{investigation_id}/transition")
async def transition_investigation_state(
    investigation_id: str,
    new_state: InvestigationState,
    reason: Optional[str] = None
) -> InvestigationStateResponse:
    """
    Manually transition investigation state (admin only)
    """
    pass

@router.get("/investigation/{investigation_id}/tools")
async def get_tool_executions(
    investigation_id: str,
    agent_filter: Optional[str] = None,
    status_filter: Optional[str] = None
) -> List[ToolExecution]:
    """
    Get all tool executions for an investigation
    """
    pass

@router.post("/investigation/{investigation_id}/pause")
async def pause_investigation(investigation_id: str) -> InvestigationResponse:
    """Pause a running investigation"""
    pass

@router.post("/investigation/{investigation_id}/resume")
async def resume_investigation(investigation_id: str) -> InvestigationResponse:
    """Resume a paused investigation"""
    pass

@router.get("/investigation/{investigation_id}/events")
async def get_investigation_events(
    investigation_id: str,
    event_type: Optional[str] = None,
    limit: int = 100
) -> List[InvestigationEvent]:
    """Get event history for audit trail"""
    pass
```

### 5. WebSocket Event System

```python
class InvestigationWebSocketManager:
    """Enhanced WebSocket manager for real-time updates"""

    async def broadcast_progress_update(
        self,
        investigation_id: str,
        update_type: str,
        data: Dict[str, Any]
    ):
        """
        Broadcast structured progress updates
        """
        event = {
            "type": "investigation.progress",
            "investigation_id": investigation_id,
            "update_type": update_type,  # phase_started, tool_executed, state_changed
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        }
        await self.send_to_investigation_room(investigation_id, event)

    # Event types
    EVENT_TYPES = {
        "INVESTIGATION_STARTED": "investigation.started",
        "INVESTIGATION_COMPLETED": "investigation.completed",
        "INVESTIGATION_FAILED": "investigation.failed",
        "PHASE_STARTED": "phase.started",
        "PHASE_COMPLETED": "phase.completed",
        "TOOL_STARTED": "tool.started",
        "TOOL_COMPLETED": "tool.completed",
        "TOOL_FAILED": "tool.failed",
        "PROGRESS_UPDATE": "progress.update",
        "STATE_TRANSITION": "state.transition",
        "ERROR_OCCURRED": "error.occurred"
    }
```

### 6. Service Layer Implementation

```python
class InvestigationStateService:
    """
    Core service for managing investigation state
    """

    async def create_investigation(
        self,
        user_id: str,
        subject: str,
        investigation_type: str,
        configuration: Dict[str, Any]
    ) -> Investigation:
        """Create new investigation with initial state"""

        # Create investigation record
        investigation = await self._create_investigation_record(...)

        # Create initial phases
        phases = await self._create_investigation_phases(investigation.id)

        # Record creation event
        await self._record_event(
            investigation.id,
            "INVESTIGATION_CREATED",
            None,
            InvestigationState.CREATED
        )

        # Queue for execution
        await self._queue_investigation(investigation.id)

        return investigation

    async def record_tool_execution(
        self,
        investigation_id: str,
        phase_id: str,
        agent_name: str,
        tool_name: str,
        input_parameters: Dict[str, Any],
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> ToolExecution:
        """Record tool execution with all details"""

        tool_execution = await self._create_tool_execution_record(...)

        # Update phase progress
        await self._update_phase_progress(phase_id)

        # Update investigation progress
        await self._update_investigation_progress(investigation_id)

        # Broadcast WebSocket update
        await self._broadcast_tool_update(investigation_id, tool_execution)

        return tool_execution

    async def transition_state(
        self,
        investigation_id: str,
        new_state: InvestigationState,
        reason: Optional[str] = None
    ) -> bool:
        """
        Transition investigation to new state with validation
        """

        current_state = await self._get_current_state(investigation_id)

        # Validate transition
        if not self._is_valid_transition(current_state, new_state):
            raise InvalidStateTransition(
                f"Cannot transition from {current_state} to {new_state}"
            )

        # Update state
        await self._update_investigation_state(investigation_id, new_state)

        # Record event
        await self._record_event(
            investigation_id,
            "STATE_TRANSITION",
            current_state,
            new_state,
            {"reason": reason}
        )

        # Broadcast update
        await self._broadcast_state_change(investigation_id, new_state)

        # Execute state hooks
        await self._execute_state_hooks(investigation_id, new_state)

        return True
```

## Implementation Phases

### Phase 1: Database Schema (Week 1)
- Create migration scripts for new tables
- Update SQLAlchemy models
- Add indexes for performance
- Implement database connection pooling

### Phase 2: State Management (Week 1-2)
- Implement state machine
- Add transition validation
- Create event recording system
- Build recovery mechanisms

### Phase 3: Progress Tracking (Week 2)
- Implement progress calculation logic
- Add phase tracking
- Create tool execution monitoring
- Build progress API endpoints

### Phase 4: WebSocket Enhancement (Week 3)
- Implement structured event system
- Add investigation-specific rooms
- Create reconnection handling
- Build event replay for missed updates

### Phase 5: Testing & Documentation (Week 3-4)
- Comprehensive unit tests
- Integration tests
- Performance testing
- API documentation

## Migration Strategy

1. **Backward Compatibility**
   - Maintain existing endpoints during transition
   - Add feature flags for new functionality
   - Gradual migration of existing investigations

2. **Data Migration**
   - Script to migrate existing investigation records
   - Populate new fields with defaults
   - Backfill event history where possible

3. **Rollback Plan**
   - Database backup before migration
   - Feature flags for instant rollback
   - Monitoring for migration issues

## Performance Considerations

1. **Database Optimization**
   - Proper indexing on frequently queried fields
   - Partitioning for investigation_events table
   - Connection pooling for concurrent access

2. **Caching Strategy**
   - Redis cache for active investigation states
   - Progress calculation caching
   - Tool result caching

3. **Async Processing**
   - Background tasks for heavy computations
   - Event processing queue
   - Batch updates for progress

## Security Considerations

1. **Access Control**
   - Role-based access to investigation data
   - Audit trail for all state changes
   - Encrypted storage for sensitive data

2. **Data Protection**
   - PII masking in logs
   - Secure tool parameter storage
   - Compliance with data retention policies

## Monitoring & Observability

1. **Metrics**
   - Investigation completion rates
   - Average phase durations
   - Tool execution success rates
   - State transition patterns

2. **Alerts**
   - Failed investigations
   - Stuck investigations (no progress)
   - High retry rates
   - Performance degradation

## Success Criteria

1. **Functional Requirements**
   - ✅ Complete state persistence for all investigations
   - ✅ Real-time progress updates via API and WebSocket
   - ✅ Full audit trail of all actions
   - ✅ Ability to pause/resume investigations
   - ✅ Tool usage tracking with metrics

2. **Non-Functional Requirements**
   - ✅ < 100ms response time for progress API
   - ✅ Support 100+ concurrent investigations
   - ✅ 99.9% uptime for investigation service
   - ✅ Complete recovery from failures

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Database migration failure | High | Comprehensive backup and rollback plan |
| Performance degradation | Medium | Gradual rollout with monitoring |
| State corruption | High | Event sourcing for recovery |
| WebSocket scalability | Medium | Redis pub/sub for scaling |

## Next Steps

1. Review and approve this architecture plan
2. Create detailed technical specifications
3. Set up development environment
4. Begin Phase 1 implementation
5. Schedule regular progress reviews

## Appendix: Mermaid Diagrams

See accompanying visualization at `/docs/diagrams/investigation-architecture.html`

---

**Status**: Awaiting approval to proceed with implementation

**Approval Required From**: Engineering Lead, Product Owner

**Estimated Timeline**: 4 weeks for complete implementation

**Resource Requirements**: 2 backend engineers, 1 database specialist