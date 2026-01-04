# Data Model Design: Live Investigation Data Updates

**Date**: 2025-11-06  
**Feature**: 008-live-investigation-updates  
**Status**: Complete

## Overview

This document defines the complete data model for the live investigation data updates feature. All entities are drawn directly from the feature specification and map to existing database tables and Pydantic models.

## Core Entities

### 1. Investigation

**Purpose**: Root entity representing a fraud investigation with real-time progress tracking.

**Database Table**: `investigation_states`

**Fields**:
| Field | Type | Constraints | Notes |
|-------|------|-----------|-------|
| investigation_id | String(255) | PRIMARY KEY, NOT NULL | Unique investigation identifier |
| user_id | String(255) | FOREIGN KEY, NOT NULL, INDEXED | User who owns investigation |
| status | String(50) | ENUM('CREATED','SETTINGS','IN_PROGRESS','COMPLETED','ERROR','CANCELLED'), INDEXED | Current operational status |
| lifecycle_stage | String(50) | ENUM('CREATED','SETTINGS','IN_PROGRESS','COMPLETED'), INDEXED | Lifecycle position |
| version | Integer | NOT NULL, ≥1, INDEXED | Optimistic locking version |
| progress_json | Text | JSON | Current progress state (see ProgressJSON schema below) |
| settings_json | Text | JSON | Investigation settings (entities, configuration) |
| results_json | Text | JSON | Final results (populated on completion) |
| created_at | DateTime | NOT NULL, INDEXED | Creation timestamp |
| updated_at | DateTime | NOT NULL, INDEXED | Last update timestamp |
| last_accessed | DateTime | NULLABLE | Last time accessed by user |

**Status Transitions** (valid state machine):
```
CREATED → SETTINGS → IN_PROGRESS → COMPLETED ✓
CREATED → SETTINGS → IN_PROGRESS → ERROR ✓
CREATED → SETTINGS → IN_PROGRESS → CANCELLED ✓
(Any) → ERROR (error condition) ✓
(Any) → CANCELLED (user cancels) ✓
```

**Lifecycle Mapping**:
```
Investigation.status → API Response status
CREATED              → "pending"
SETTINGS             → "pending"
IN_PROGRESS          → "running"
COMPLETED            → "completed"
ERROR                → "failed"
CANCELLED            → "failed"
```

**Optimistic Locking**: Version field prevents concurrent update conflicts. Each update increments version; concurrent updates fail with version mismatch.

**Indexes**:
- idx_investigation_user (user_id) - Find user's investigations
- idx_investigation_status (status) - Find investigations by status
- idx_investigation_updated (updated_at) - Find recently updated investigations
- idx_investigation_lifecycle (lifecycle_stage) - Find by lifecycle

---

### 2. ProgressJSON Schema (stored in investigation_states.progress_json)

**Purpose**: Captures complete investigation progress snapshot in JSON format.

**Schema**:
```json
{
  "percent_complete": 45,
  "tool_executions": [
    {
      "id": "tool_exec_001",
      "tool_name": "ip_reputation",
      "agent_type": "network_analysis_agent",
      "status": "completed",
      "queued_at": "2025-11-06T09:00:00Z",
      "started_at": "2025-11-06T09:00:01Z",
      "completed_at": "2025-11-06T09:00:05Z",
      "execution_time_ms": 4000,
      "input": {
        "entity_id": "192.168.1.1",
        "entity_type": "ip",
        "parameters": {"timeout": 30}
      },
      "result": {
        "success": true,
        "risk_score": 0.75,
        "findings": [
          {
            "finding_type": "malicious_ip",
            "severity": "high",
            "description": "IP known for C2 activity"
          }
        ],
        "metadata": {}
      },
      "error": null,
      "retry_count": 0,
      "max_retries": 3
    }
  ],
  "phases": [
    {
      "id": "phase_001",
      "name": "initialization",
      "order": 0,
      "status": "completed",
      "completion_percent": 100,
      "tool_execution_ids": ["tool_exec_001", "tool_exec_002"],
      "started_at": "2025-11-06T09:00:00Z",
      "completed_at": "2025-11-06T09:00:30Z",
      "estimated_duration_ms": 30000
    }
  ],
  "current_phase": "analysis",
  "risk_metrics": {
    "overall": 0.72,
    "by_agent": {
      "network_analysis": 0.85,
      "behavioral_analysis": 0.65
    },
    "confidence": 0.88,
    "last_calculated": "2025-11-06T09:01:00Z"
  },
  "tools_per_second": 0.25,
  "peak_tools_per_second": 1.5
}
```

**Validation Rules**:
- percent_complete: integer 0-100 (inclusive)
- tool_executions: array, 0+ items, no duplicates (id unique)
- tool_execution status: must be one of [queued, running, completed, failed, skipped]
- phases: ordered by order field (ascending), unique names
- phase status: pending/in_progress/completed/failed/skipped
- risk metrics: floats 0.0-1.0 (inclusive)
- timestamps: ISO 8601 UTC format

---

### 3. SettingsJSON Schema (stored in investigation_states.settings_json)

**Purpose**: Configuration and initial parameters for investigation.

**Schema**:
```json
{
  "entities": [
    {
      "entity_id": "entity_001",
      "entity_type": "user_id",
      "entity_value": "user_12345",
      "entity_label": "user_id: user_12345",
      "metadata": {
        "source": "manual_entry",
        "verified": true
      }
    },
    {
      "entity_id": "entity_002",
      "entity_type": "ip",
      "entity_value": "192.168.1.1",
      "entity_label": "ip: 192.168.1.1",
      "metadata": {
        "source": "from_transaction_logs",
        "verified": true
      }
    }
  ],
  "tools": ["ip_reputation", "device_analysis", "transaction_patterns"],
  "date_range_days": 7,
  "time_range": {
    "start_time": "2025-11-01T00:00:00Z",
    "end_time": "2025-11-06T23:59:59Z"
  },
  "parallel_execution": true,
  "max_tools": 6
}
```

**Validation Rules**:
- entities: array, at least 1 item
- entity_type: string, valid entity type (user_id, ip, device_id, email, etc.)
- entity_value: string, not empty
- date_range_days: integer 1-90
- max_tools: integer 1-20
- parallel_execution: boolean

---

### 4. InvestigationProgress (API Response Model)

**Purpose**: Complete progress response combining investigation_state data with calculated metrics.

**Pydantic Model** (from spec):
```python
class InvestigationProgress(BaseModel):
    # Core identification
    id: str
    investigation_id: str
    
    # Status and lifecycle
    status: str  # 'pending', 'initializing', 'running', 'paused', 'completed', 'failed', 'cancelled'
    lifecycle_stage: str  # 'draft', 'submitted', 'in_progress', 'completed', 'failed'
    completion_percent: int  # 0-100
    
    # Timestamps
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    last_updated_at: datetime
    
    # Tool execution tracking
    tool_executions: List[ToolExecution]
    total_tools: int
    completed_tools: int
    running_tools: int
    queued_tools: int
    failed_tools: int
    skipped_tools: int
    
    # Agent tracking
    agent_statuses: List[AgentStatus]
    
    # Risk assessment
    risk_metrics: RiskMetrics
    
    # Phase tracking
    phases: List[PhaseProgress]
    current_phase: Optional[str]
    
    # Entity relationships
    entities: List[InvestigationEntity]
    relationships: List[EntityRelationship]
    
    # Real-time activity
    tools_per_second: float
    peak_tools_per_second: float
    
    # Connection status
    ice_connected: bool
    
    # Error tracking
    errors: List[InvestigationError]
```

**Data Flow**: `investigation_state.progress_json` → `InvestigationProgressService.build_progress_from_state()` → `InvestigationProgress`

**Validation**:
- All fields present (defaults to empty lists/0/false where applicable)
- completion_percent: 0-100
- Timestamps: ISO 8601 UTC, created_at ≤ started_at ≤ completed_at
- Tool counts: sum of all statuses ≥ total_tools
- Phase count: at least 1 phase

---

### 5. ToolExecution

**Purpose**: Track individual tool execution details.

**Pydantic Model**:
```python
class ToolExecution(BaseModel):
    id: str
    tool_name: str
    agent_type: str
    status: str  # 'queued', 'running', 'completed', 'failed', 'skipped'
    queued_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    execution_time_ms: int
    input: ToolExecutionInput
    result: Optional[ToolExecutionResult]
    error: Optional[ToolExecutionError]
    retry_count: int
    max_retries: int
```

**Status Progression**:
```
queued → running → (completed|failed|skipped)
queued → running → failed → queued → running → completed (retry)
```

**Validation**:
- status: one of [queued, running, completed, failed, skipped]
- execution_time_ms: ≥0
- retry_count: ≥0, ≤max_retries
- timestamps ordered: queued_at ≤ started_at ≤ completed_at

---

### 6. AgentStatus

**Purpose**: Track per-agent progress and metrics.

**Pydantic Model**:
```python
class AgentStatus(BaseModel):
    agent_type: str
    agent_name: str
    status: str  # 'pending', 'running', 'completed', 'failed'
    tools_completed: int
    total_tools: int
    progress_percent: int  # 0-100
    average_execution_time_ms: int
    findings_count: int
    risk_score: float  # 0.0-1.0
    max_risk_detected: float  # 0.0-1.0
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
```

**Validation**:
- progress_percent: 0-100
- risk_score, max_risk_detected: 0.0-1.0
- tools_completed ≤ total_tools

---

### 7. PhaseProgress

**Purpose**: Track investigation phase execution.

**Pydantic Model**:
```python
class PhaseProgress(BaseModel):
    id: str
    name: str
    order: int  # 0, 1, 2, ...
    status: str  # 'pending', 'in_progress', 'completed', 'failed', 'skipped'
    completion_percent: int  # 0-100
    tool_execution_ids: List[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    estimated_duration_ms: int
```

**Validation**:
- order: unique, ordered 0...n
- completion_percent: 0-100
- tool_execution_ids: array of valid tool execution IDs
- status: one of [pending, in_progress, completed, failed, skipped]

---

### 8. RiskMetrics

**Purpose**: Aggregated risk assessment data.

**Pydantic Model**:
```python
class RiskMetrics(BaseModel):
    overall: float  # 0.0-1.0
    by_agent: Dict[str, float]  # agent_type → risk score
    confidence: float  # 0.0-1.0
    last_calculated: datetime
```

**Validation**:
- All floats: 0.0-1.0 (inclusive)
- last_calculated: ISO 8601 UTC timestamp

---

### 9. InvestigationEntity

**Purpose**: Track entities (IPs, users, devices) under investigation.

**Pydantic Model**:
```python
class InvestigationEntity(BaseModel):
    id: str
    type: str  # 'ip', 'user_id', 'device_id', 'email', etc.
    value: str
    label: Optional[str]
    metadata: Dict[str, Any]
    added_at: datetime
```

**Validation**:
- type: valid entity type
- value: not empty
- added_at: ISO 8601 UTC timestamp

---

### 10. EntityRelationship

**Purpose**: Track relationships discovered between entities.

**Pydantic Model**:
```python
class EntityRelationship(BaseModel):
    id: str
    source_entity_id: str
    target_entity_id: str
    relationship_type: str  # 'related_to', 'linked_to', 'cross_referenced', etc.
    confidence: float  # 0.0-1.0
    metadata: Dict[str, Any]
    discovered_at: datetime
```

**Validation**:
- confidence: 0.0-1.0
- source_entity_id != target_entity_id
- discovered_at: ISO 8601 UTC timestamp

---

### 11. InvestigationError

**Purpose**: Track errors encountered during investigation.

**Pydantic Model**:
```python
class InvestigationError(BaseModel):
    id: str
    code: str  # Error code (e.g., 'TOOL_TIMEOUT', 'PERMISSION_DENIED')
    message: str
    timestamp: datetime
    severity: str  # 'warning', 'error', 'critical'
    context: Dict[str, Any]
```

**Validation**:
- severity: one of [warning, error, critical]
- message: not empty
- timestamp: ISO 8601 UTC

---

### 12. InvestigationEvent (for /events endpoint)

**Purpose**: Audit trail of investigation state changes.

**Database Table**: `investigation_audit_log`

**Fields**:
| Field | Type | Constraints | Notes |
|-------|------|-----------|-------|
| entry_id | String(255) | PRIMARY KEY, NOT NULL | Unique audit entry ID |
| investigation_id | String(255) | FOREIGN KEY, NOT NULL, INDEXED | Investigation this event belongs to |
| user_id | String(255) | NOT NULL, INDEXED | User who performed action |
| action_type | String(50) | ENUM('CREATED','UPDATED','DELETED','STATE_CHANGE','SETTINGS_CHANGE'), INDEXED | Action type |
| event_type | String(50) | ENUM('tool_complete','tool_error','phase_change','entity_discovered','risk_updated') | Investigation event type |
| changes_json | Text | JSON | Field-level changes |
| state_snapshot_json | Text | JSON | Complete state snapshot after change |
| source | String(50) | ENUM('UI','API','SYSTEM','WEBHOOK','POLLING'), NOT NULL | Action source |
| from_version | Integer | Version before change |
| to_version | Integer | Version after change |
| timestamp | DateTime | NOT NULL, INDEXED | Event timestamp (millisecond precision) |

**Cursor Format**: `{timestamp_ms}_{sequence}`
- timestamp_ms: Unix milliseconds from timestamp field
- sequence: 6-digit counter for ordering at same millisecond
- Example: `1730668800000_000127`

**Event Ordering**: `ORDER BY timestamp ASC, sequence ASC`
- Guarantees consistent pagination
- Prevents duplicates

**Pagination**: Cursor-based with `limit` parameter
- Default limit: 100 events
- Max limit: 1000 events
- Valid range: 1-1000

**Cursor Expiration**: Cursors valid for 30 days
- Older cursors return 400 Bad Request error

**Indexes**:
- idx_audit_investigation (investigation_id) - Find events for investigation
- idx_audit_user (user_id) - Find events by user
- idx_audit_timestamp (timestamp) - Find events by time range
- idx_audit_action (action_type) - Find events by action

---

## Relationships

```
investigation_states (Investigation)
    ↓ (one-to-many)
investigation_audit_log (InvestigationEvent)

InvestigationProgress
    ├─ tool_executions: List[ToolExecution]
    ├─ agent_statuses: List[AgentStatus]
    ├─ phases: List[PhaseProgress]
    ├─ risk_metrics: RiskMetrics
    ├─ entities: List[InvestigationEntity]
    ├─ relationships: List[EntityRelationship]
    └─ errors: List[InvestigationError]

EntityRelationship
    ├─ source_entity_id → InvestigationEntity.id
    └─ target_entity_id → InvestigationEntity.id
```

---

## API Response Models

### GET /api/v1/investigations/{investigation_id}/progress

**Response**:
```json
{
  "id": "progress_001",
  "investigation_id": "inv_001",
  "status": "running",
  "lifecycle_stage": "in_progress",
  "completion_percent": 45,
  "created_at": "2025-11-06T09:00:00Z",
  "started_at": "2025-11-06T09:00:30Z",
  "completed_at": null,
  "last_updated_at": "2025-11-06T09:01:00Z",
  "tool_executions": [...],
  "total_tools": 6,
  "completed_tools": 3,
  "running_tools": 1,
  "queued_tools": 2,
  "failed_tools": 0,
  "skipped_tools": 0,
  "agent_statuses": [...],
  "risk_metrics": {...},
  "phases": [...],
  "current_phase": "analysis",
  "entities": [...],
  "relationships": [...],
  "tools_per_second": 0.25,
  "peak_tools_per_second": 1.5,
  "ice_connected": true,
  "errors": []
}
```

**Status Code**: 200 OK

**Headers**:
- ETag: `"v5"` (investigation version)
- Cache-Control: `private, max-age=60`
- X-Recommended-Interval: `1000` (ms)

**Conditional Request** (If-None-Match: "v5"):
- Response: 304 Not Modified (empty body, headers only)
- Target: <30ms response time

---

### GET /api/v1/investigations/{investigation_id}/events

**Response**:
```json
{
  "items": [
    {
      "event_id": "1730668800000_000001",
      "investigation_id": "inv_001",
      "event_type": "tool_complete",
      "actor": "network_analysis_agent",
      "timestamp": "2025-11-06T09:00:00Z",
      "data": {
        "tool_name": "ip_reputation",
        "tool_id": "tool_exec_001",
        "status": "completed",
        "risk_score": 0.75
      }
    }
  ],
  "next_cursor": "1730668800010_000002",
  "has_more": true,
  "poll_after_seconds": 3,
  "etag": "v5"
}
```

**Status Code**: 200 OK

**Query Parameters**:
- since: Cursor string (optional, defaults to start)
- limit: 1-1000 (optional, defaults to 100)

**Headers**:
- ETag: `"v5"`
- Cache-Control: `private, max-age=60`
- X-Recommended-Interval: `3000` (ms)

**Conditional Request** (If-None-Match: "v5"):
- Response: 304 Not Modified
- Target: <30ms response time

**Error Responses**:
- 400: Invalid or expired cursor
- 403: Not authorized
- 404: Investigation not found

---

### GET /api/v1/investigations/{investigation_id}/runs/{run_id}/stream

**Response**: Server-Sent Events (text/event-stream)

**Event Format**:
```
event: tool_complete
id: 1730668800000_000001
data: {"tool_name": "ip_reputation", "tool_id": "tool_exec_001", "status": "completed", "risk_score": 0.75}

event: heartbeat
id: 1730668800030_000002
data: {"type": "heartbeat", "timestamp": "2025-11-06T09:00:30Z"}

event: phase_change
id: 1730668800060_000003
data: {"phase_name": "analysis", "status": "in_progress", "completion_percent": 50}
```

**Status Code**: 200 OK

**Headers**:
- Content-Type: `text/event-stream`
- Cache-Control: `no-cache`
- Connection: `keep-alive`

**Query Parameters**:
- last_event_id: Event ID to resume from (optional)

---

## Validation Rules Summary

| Entity | Field | Validation |
|--------|-------|-----------|
| Investigation | investigation_id | String, not empty, PK |
| Investigation | status | ENUM(CREATED, SETTINGS, IN_PROGRESS, COMPLETED, ERROR, CANCELLED) |
| Investigation | lifecycle_stage | ENUM(CREATED, SETTINGS, IN_PROGRESS, COMPLETED) |
| Investigation | version | Integer ≥1 |
| ProgressJSON | percent_complete | Integer 0-100 |
| ProgressJSON | tool_executions | Array, id unique, status valid |
| ProgressJSON | phases | Array, order unique & ordered |
| ProgressJSON | risk_metrics | Float 0.0-1.0 |
| ToolExecution | status | ENUM(queued, running, completed, failed, skipped) |
| ToolExecution | execution_time_ms | Integer ≥0 |
| ToolExecution | retry_count | Integer ≥0 ≤max_retries |
| AgentStatus | progress_percent | Integer 0-100 |
| AgentStatus | risk_score | Float 0.0-1.0 |
| PhaseProgress | completion_percent | Integer 0-100 |
| PhaseProgress | order | Integer, unique, ordered 0...n |
| RiskMetrics | overall, confidence | Float 0.0-1.0 |
| EntityRelationship | confidence | Float 0.0-1.0 |
| InvestigationError | severity | ENUM(warning, error, critical) |
| InvestigationEvent | cursor | Format: {timestamp_ms}_{sequence} |
| InvestigationEvent | ordering | timestamp ASC, sequence ASC |

---

## Data Integrity Constraints

1. **Referential Integrity**: 
   - investigation_audit_log.investigation_id → investigation_states.investigation_id
   - investigation_audit_log.user_id → user.id
   - EntityRelationship.source/target_entity_id → InvestigationEntity.id

2. **Optimistic Locking**:
   - investigation_states.version incremented on each update
   - Concurrent updates detect via version mismatch

3. **Immutability**:
   - investigation_audit_log entries never modified (append-only)
   - investigation_states.created_at never changes
   - Timestamps use UTC timezone

4. **Consistency**:
   - Tool counts sum correctly: completed + running + queued + failed + skipped = total
   - Phases ordered by order field
   - Events ordered by timestamp ASC, sequence ASC

---

## Schema Migrations (if needed)

No migrations required - all entities map to existing schema-locked tables:
- `investigation_states` (exists since Feature 005)
- `investigation_audit_log` (exists since Feature 005)

All new fields in ProgressJSON are backward-compatible additions to the Text column.

---

**Data Model Complete**: 2025-11-06  
**Next**: API contract generation

