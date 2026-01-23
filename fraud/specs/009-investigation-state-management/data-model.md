# Data Model: Investigation State Management

**Phase**: 1 (Design)
**Date**: 2025-11-04
**Status**: Complete

## Overview

This document defines the data structures, cursor format, event schema, and API response models for the investigation state management system. All models are designed to work with existing database tables (no schema changes required).

---

## 1. Cursor Format & Structure

### 1.1 Cursor Definition

```typescript
// Opaque, monotonic identifier marking position in event stream
type Cursor = string;  // Format: "{timestamp_ms}_{sequence}"

// Example: "1730668800000_000127"
// - Timestamp: 1730668800000 ms since epoch
// - Sequence: 000127 (sequence number for concurrent events at same timestamp)
```

### 1.2 Cursor Parsing (Backend)

```python
def parse_cursor(cursor: str) -> tuple[int, int]:
    """Parse cursor into timestamp_ms and sequence"""
    if not cursor or "_" not in cursor:
        raise ValueError(f"Invalid cursor format: {cursor}")

    timestamp_ms_str, sequence_str = cursor.split("_")
    return int(timestamp_ms_str), int(sequence_str)

# Usage
timestamp_ms, sequence = parse_cursor("1730668800000_000127")
assert timestamp_ms == 1730668800000
assert sequence == 127
```

### 1.3 Cursor Generation (Backend)

```python
from datetime import datetime, timezone

class CursorGenerator:
    def __init__(self):
        self.last_timestamp_ms = 0
        self.sequence = 0

    def generate(self) -> str:
        """Generate next monotonic cursor"""
        current_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

        if current_ms == self.last_timestamp_ms:
            self.sequence += 1
        else:
            self.last_timestamp_ms = current_ms
            self.sequence = 0

        return f"{current_ms:013d}_{self.sequence:06d}"

# Usage
gen = CursorGenerator()
cursor1 = gen.generate()  # "1730668800000_000000"
cursor2 = gen.generate()  # "1730668800000_000001"
cursor3 = gen.generate()  # "1730668800001_000000"
```

---

## 2. Event Schema

### 2.1 Investigation Event

```typescript
interface InvestigationEvent {
  // Identity & Ordering
  id: string;                          // Cursor format: "{timestamp_ms}_{sequence}"
  investigation_id: string;            // FK: investigation_states.investigation_id
  ts: string;                          // ISO 8601 timestamp: "2025-11-04T12:40:00.000Z"

  // Source & Actor
  actor: {
    type: "system" | "user" | "webhook" | "polling";
    user_id?: string;                 // If type="user"
    service?: string;                 // If type="system" or "webhook"
  };

  // Operation & Entity
  op: "append" | "update" | "delete";
  entity:
    | "anomaly"
    | "relationship"
    | "note"
    | "status"
    | "phase"
    | "tool_execution"
    | "agent_status";

  // Self-Describing Payload
  payload: Record<string, any>;        // Entity-specific data
}
```

### 2.2 Event Examples

**Anomaly Detection Event**:
```json
{
  "id": "1730668800000_000123",
  "investigation_id": "INV-42",
  "ts": "2025-11-04T12:34:56.789Z",
  "actor": {
    "type": "system",
    "service": "anomaly-detector-v2"
  },
  "op": "append",
  "entity": "anomaly",
  "payload": {
    "anomaly_id": "A-98765",
    "rule": "large_transfer_outside_hours",
    "score": 0.93,
    "entities": [
      {"type": "account", "id": "ACCT-1122"}
    ],
    "evidence_uri": "s3://.../A-98765.json"
  }
}
```

**Phase Transition Event**:
```json
{
  "id": "1730668800001_000001",
  "investigation_id": "INV-42",
  "ts": "2025-11-04T12:35:00.000Z",
  "actor": {
    "type": "system",
    "service": "investigation-executor"
  },
  "op": "update",
  "entity": "phase",
  "payload": {
    "phase_id": "data_collection",
    "status": "completed",
    "progress_percent": 100,
    "completed_at": "2025-11-04T12:35:00.000Z"
  }
}
```

**User Note Event**:
```json
{
  "id": "1730668800002_000000",
  "investigation_id": "INV-42",
  "ts": "2025-11-04T12:36:00.000Z",
  "actor": {
    "type": "user",
    "user_id": "user-jlee"
  },
  "op": "append",
  "entity": "note",
  "payload": {
    "note_id": "N-555",
    "content": "Suspicious pattern detected in time series",
    "severity": "high"
  }
}
```

---

## 3. Investigation Snapshot

### 3.1 Investigation Snapshot Model

```typescript
interface InvestigationSnapshot {
  // Identity
  id: string;                          // investigation_id
  user_id: string;                     // Requestor's user ID

  // Lifecycle
  lifecycle_stage: "CREATED" | "SETTINGS" | "IN_PROGRESS" | "COMPLETED";
  status: "CREATED" | "SETTINGS" | "IN_PROGRESS" | "COMPLETED" | "ERROR" | "CANCELLED";

  // State Data
  settings: {
    name: string;
    entities: Array<{
      type: string;
      id: string;
      displayName?: string;
    }>;
    timeRange: {
      start: string;      // ISO date
      end: string;        // ISO date
    };
    tools: Array<{
      tool_name: string;
      enabled: boolean;
    }>;
    correlationMode: "AND" | "OR";
    executionMode: "SERIAL" | "PARALLEL";
    riskThreshold: number;
  };

  progress: {
    current_phase: string;
    progress_percentage: number;       // 0-100
    phase_progress: {
      [phase_name: string]: number;   // Progress % per phase
    };
    started_at?: string;              // ISO timestamp
  };

  results?: {
    anomalies: Array<any>;
    relationships: Array<any>;
    findings: Array<any>;
    completed_at?: string;
  };

  // Versioning & Concurrency
  version: number;                     // For optimistic locking
  created_at: string;                  // ISO timestamp
  updated_at: string;                  // ISO timestamp (Last-Modified header)
  last_accessed?: string;              // ISO timestamp
}
```

### 3.2 Snapshot Example

```json
{
  "id": "INV-42",
  "user_id": "user-jlee",
  "lifecycle_stage": "IN_PROGRESS",
  "status": "IN_PROGRESS",
  "settings": {
    "name": "Investigation into account ACCT-1122",
    "entities": [
      {
        "type": "account",
        "id": "ACCT-1122",
        "displayName": "John Lee Account"
      }
    ],
    "timeRange": {
      "start": "2025-11-01",
      "end": "2025-11-04"
    },
    "tools": [
      {"tool_name": "anomaly_detection", "enabled": true},
      {"tool_name": "network_analysis", "enabled": true}
    ],
    "correlationMode": "OR",
    "executionMode": "PARALLEL",
    "riskThreshold": 0.7
  },
  "progress": {
    "current_phase": "Data Collection",
    "progress_percentage": 34.5,
    "phase_progress": {
      "Initialization": 100,
      "Data Collection": 50,
      "Tool Execution": 0,
      "Analysis": 0,
      "Finalization": 0
    },
    "started_at": "2025-11-04T12:00:00.000Z"
  },
  "version": 128,
  "created_at": "2025-11-04T12:00:00.000Z",
  "updated_at": "2025-11-04T12:39:59.501Z"
}
```

---

## 4. Events Feed Response

### 4.1 Events Feed Response Model

```typescript
interface EventsFeedResponse {
  // Events
  items: InvestigationEvent[];        // Ordered by ts ASC

  // Pagination
  next_cursor: string;                // Cursor for next fetch
  has_more: boolean;                  // More events available

  // Server Guidance
  poll_after_seconds: number;         // Recommended wait before next poll

  // Caching
  etag?: string;                      // For conditional requests
}
```

### 4.2 Events Feed Example

```json
{
  "items": [
    {
      "id": "1730668800000_000123",
      "investigation_id": "INV-42",
      "ts": "2025-11-04T12:34:56.789Z",
      "actor": {
        "type": "system",
        "service": "anomaly-detector-v2"
      },
      "op": "append",
      "entity": "anomaly",
      "payload": {
        "anomaly_id": "A-98765",
        "rule": "large_transfer_outside_hours",
        "score": 0.93,
        "entities": [{"type": "account", "id": "ACCT-1122"}]
      }
    },
    {
      "id": "1730668800001_000000",
      "investigation_id": "INV-42",
      "ts": "2025-11-04T12:35:00.000Z",
      "actor": {
        "type": "system",
        "service": "investigation-executor"
      },
      "op": "update",
      "entity": "phase",
      "payload": {
        "phase_id": "data_collection",
        "status": "completed",
        "progress_percent": 100
      }
    }
  ],
  "next_cursor": "1730668800001_000001",
  "has_more": true,
  "poll_after_seconds": 5,
  "etag": "W/\"abc123-def456\""
}
```

---

## 5. Summary Response

### 5.1 Summary Response Model

```typescript
interface SummaryResponse {
  investigation_id: string;
  lifecycle_stage: string;
  status: string;

  // Lightweight Counters
  current_phase: string;
  progress_percentage: number;

  // Timestamps
  created_at: string;                  // ISO timestamp
  updated_at: string;                  // ISO timestamp (Last-Modified)

  // Caching
  etag?: string;                      // For 304 Not Modified
}
```

### 5.2 Summary Example

```json
{
  "investigation_id": "INV-42",
  "lifecycle_stage": "IN_PROGRESS",
  "status": "IN_PROGRESS",
  "current_phase": "Data Collection",
  "progress_percentage": 34.5,
  "created_at": "2025-11-04T12:00:00.000Z",
  "updated_at": "2025-11-04T12:39:59.501Z",
  "etag": "W/\"xyz789\""
}
```

---

## 6. Update Request Model

### 6.1 Update Request with Optimistic Locking

```typescript
interface UpdateRequest {
  // State Updates
  lifecycle_stage?: string;
  status?: string;
  settings_json?: string;
  progress_json?: string;
  results_json?: string;

  // Optimistic Locking
  version: number;                    // Must match current version (from If-Match header)
}
```

### 6.2 Update Request Headers

```
PATCH /api/v1/investigation-state/{investigation_id}
If-Match: "128"  ← ETag or version number
Content-Type: application/json
```

### 6.3 Update Request Example

```json
{
  "lifecycle_stage": "IN_PROGRESS",
  "status": "IN_PROGRESS",
  "progress_json": "{\"current_phase\": \"Tool Execution\", \"progress_percentage\": 45}",
  "version": 128
}
```

---

## 7. Error Response Models

### 7.1 Standard Error Response

```typescript
interface ErrorResponse {
  status: number;                     // HTTP status code
  error: string;                      // Error type
  message: string;                    // Human-readable message
  details?: Record<string, any>;      // Additional context
}
```

### 7.2 Conflict Response (409)

```json
{
  "status": 409,
  "error": "VersionConflict",
  "message": "Investigation state was modified. Please refresh and retry.",
  "details": {
    "current_version": 129,
    "submitted_version": 128
  }
}
```

### 7.3 Rate Limit Response (429)

```json
{
  "status": 429,
  "error": "TooManyRequests",
  "message": "Rate limit exceeded. Retry after 10 seconds.",
  "details": {
    "limit": 60,
    "window_seconds": 60,
    "reset_at": "2025-11-04T12:41:30.000Z"
  }
}
```

---

## 8. Frontend Storage Models

### 8.1 Cursor Storage

**Key**: `inv:{investigation_id}:cursor`
**Value**: Cursor string (e.g., `"1730668800000_000127"`)
**Duration**: Persists until investigation completes

```typescript
const storageKey = `inv:${investigationId}:cursor`;
localStorage.setItem(storageKey, cursor);
const savedCursor = localStorage.getItem(storageKey);
```

### 8.2 ETag Cache

**Key**: `inv:{investigation_id}:etag`
**Value**: ETag string
**Duration**: Persists across polls

```typescript
const etagKey = `inv:${investigationId}:etag`;
const headers = savedETag ? { "If-None-Match": savedETag } : {};
// If 304: reuse cached data, don't update ETag
// If 200: cache new ETag
```

---

## 9. Mapping to Existing Database

### 9.1 Cursor Generation from Audit Log

```sql
-- Generate cursor from audit log entry
SELECT
  CAST(EXTRACT(EPOCH FROM timestamp) * 1000 AS BIGINT) || '_' ||
  ROW_NUMBER() OVER (ORDER BY timestamp, entry_id) AS cursor
FROM investigation_audit_log
WHERE investigation_id = $1
ORDER BY timestamp, entry_id
```

### 9.2 Event Mapping from Audit Log

```python
def audit_log_to_event(audit_entry) -> InvestigationEvent:
    """Convert audit_log row to Event"""
    return InvestigationEvent(
        id=generate_cursor_from_timestamp(audit_entry.timestamp),
        investigation_id=audit_entry.investigation_id,
        ts=audit_entry.timestamp.isoformat() + "Z",
        actor={
            "type": audit_entry.source.lower(),  # "system", "user", "webhook", "polling"
            "user_id": audit_entry.user_id if audit_entry.source == "UI" else None,
            "service": infer_service_from_action(audit_entry.action_type)
        },
        op=map_action_to_op(audit_entry.action_type),  # "append", "update", "delete"
        entity=infer_entity_from_changes(audit_entry.changes_json),
        payload=json.loads(audit_entry.changes_json)
    )
```

---

## 10. Type Definitions for Implementation

### 10.1 Python/Pydantic

```python
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime

class Actor(BaseModel):
    type: str  # "system", "user", "webhook", "polling"
    user_id: Optional[str] = None
    service: Optional[str] = None

class InvestigationEvent(BaseModel):
    id: str
    investigation_id: str
    ts: str
    actor: Actor
    op: str  # "append", "update", "delete"
    entity: str
    payload: Dict[str, Any]

class EventsFeedResponse(BaseModel):
    items: List[InvestigationEvent]
    next_cursor: str
    has_more: bool
    poll_after_seconds: int
    etag: Optional[str] = None
```

### 10.2 TypeScript/React

```typescript
export interface Actor {
  type: "system" | "user" | "webhook" | "polling";
  user_id?: string;
  service?: string;
}

export interface InvestigationEvent {
  id: string;
  investigation_id: string;
  ts: string;
  actor: Actor;
  op: "append" | "update" | "delete";
  entity: string;
  payload: Record<string, any>;
}

export interface EventsFeedResponse {
  items: InvestigationEvent[];
  next_cursor: string;
  has_more: boolean;
  poll_after_seconds: number;
  etag?: string;
}
```

---

## Summary

This data model enables:
- ✅ Monotonic cursor-based pagination
- ✅ Self-describing events without schema changes
- ✅ Optimistic concurrency with version tracking
- ✅ ETag-based caching and 304 responses
- ✅ Complete audit trail immutability
- ✅ Efficient frontend rehydration
- ✅ Rate limit awareness and backoff
- ✅ Cross-tab cursor synchronization

**Next**: Generate API contracts (endpoints, request/response formats) in the contracts/ directory.
