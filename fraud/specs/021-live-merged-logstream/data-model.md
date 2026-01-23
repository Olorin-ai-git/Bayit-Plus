# Data Model: Live Merged Investigation Logstream

**Feature Branch**: `021-live-merged-logstream`
**Created**: 2025-11-12
**Status**: Phase 1 Design Artifact

## Overview

This document defines the core data structures, entities, and their relationships for the live merged logstream feature. All models follow strict typing with validation to ensure data integrity across the frontend-backend boundary.

---

## Core Entities

### 1. UnifiedLog

**Purpose**: Normalized log record that represents a single log entry from any source (frontend or backend)

**Schema Version**: 1 (for future migration compatibility)

#### Python (Pydantic Model)

```python
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, Literal
from datetime import datetime
import uuid

class UnifiedLog(BaseModel):
    """Unified log entry normalized from any source."""

    # Identity
    event_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Unique event identifier, used for deduplication"
    )

    # Timestamp and ordering
    ts: datetime = Field(
        description="ISO 8601 timestamp when log was emitted"
    )
    seq: int = Field(
        default=0,
        ge=0,
        description="Monotonic sequence number for ordering logs with same timestamp"
    )

    # Source identification
    source: Literal["frontend", "backend"] = Field(
        description="Which system emitted this log"
    )
    service: str = Field(
        description="Service name within the source (e.g., 'investigation-service', 'react-app')"
    )

    # Log content
    level: Literal["DEBUG", "INFO", "WARN", "ERROR"] = Field(
        description="Log severity level"
    )
    message: str = Field(
        min_length=1,
        max_length=10000,
        description="Log message content (PII-redacted)"
    )

    # Correlation
    investigation_id: str = Field(
        description="Investigation ID this log belongs to"
    )
    correlation_id: Optional[str] = Field(
        default=None,
        description="Optional correlation ID for tracing requests across services"
    )

    # Additional context
    context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional structured context data"
    )

    # Metadata
    schema_version: int = Field(
        default=1,
        description="Schema version for migration compatibility"
    )

    @validator('ts', pre=True)
    def parse_timestamp(cls, v):
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
```

#### TypeScript Interface

```typescript
export interface UnifiedLog {
  // Identity
  event_id: string;

  // Timestamp and ordering
  ts: string; // ISO 8601 timestamp
  seq: number; // Monotonic sequence number

  // Source identification
  source: 'frontend' | 'backend';
  service: string;

  // Log content
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;

  // Correlation
  investigation_id: string;
  correlation_id?: string;

  // Additional context
  context: Record<string, any>;

  // Metadata
  schema_version: number;
}

// Zod schema for runtime validation
import { z } from 'zod';

export const UnifiedLogSchema = z.object({
  event_id: z.string().uuid(),
  ts: z.string().datetime(),
  seq: z.number().int().nonnegative(),
  source: z.enum(['frontend', 'backend']),
  service: z.string().min(1),
  level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']),
  message: z.string().min(1).max(10000),
  investigation_id: z.string().min(1),
  correlation_id: z.string().optional(),
  context: z.record(z.any()),
  schema_version: z.number().int().default(1)
});
```

---

### 2. LogStreamConfig

**Purpose**: Configuration for log streaming behavior, loaded from environment variables

#### Python (Pydantic Settings)

```python
from pydantic import BaseSettings, Field, validator
from typing import List, Literal

class LogStreamConfig(BaseSettings):
    """Configuration for log streaming service."""

    # Server configuration
    sse_heartbeat_interval_seconds: int = Field(
        default=10,
        ge=1,
        le=60,
        description="Interval for SSE heartbeat events"
    )

    sse_retry_timeout_ms: int = Field(
        default=3000,
        ge=1000,
        le=30000,
        description="Client retry timeout for SSE reconnection"
    )

    # Merge configuration
    clock_skew_tolerance_seconds: int = Field(
        default=10,
        ge=0,
        le=300,
        description="Clock skew tolerance window for log merging"
    )

    max_buffer_size: int = Field(
        default=10000,
        ge=100,
        le=100000,
        description="Maximum number of logs to buffer per investigation"
    )

    # Deduplication
    dedup_cache_size: int = Field(
        default=10000,
        ge=100,
        le=100000,
        description="LRU cache size for deduplication hashes"
    )

    dedup_window_seconds: int = Field(
        default=60,
        ge=10,
        le=3600,
        description="Time window for deduplication matching"
    )

    # Rate limiting
    rate_limit_per_user_per_minute: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Max requests per user per minute"
    )

    rate_limit_per_investigation_per_minute: int = Field(
        default=1000,
        ge=100,
        le=10000,
        description="Max requests per investigation per minute"
    )

    # PII redaction patterns
    pii_redaction_enabled: bool = Field(
        default=True,
        description="Enable PII redaction"
    )

    pii_patterns: List[str] = Field(
        default=[
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
            r'\b\d{3}-\d{2}-\d{4}\b',  # SSN
            r'\b\d{16}\b',  # Credit card
            r'\b(?:\d{1,3}\.){3}\d{1,3}\b'  # IP address
        ],
        description="Regex patterns for PII detection"
    )

    # Polling fallback
    polling_default_limit: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Default page size for polling endpoint"
    )

    polling_max_limit: int = Field(
        default=1000,
        ge=100,
        le=10000,
        description="Maximum page size for polling endpoint"
    )

    # Log provider configuration
    log_provider_mode: Literal["local-dev", "sentry", "datadog", "elk", "cloudwatch"] = Field(
        default="local-dev",
        description="Which log provider implementation to use"
    )

    class Config:
        env_prefix = "LOGSTREAM_"
        case_sensitive = False
```

#### TypeScript Config

```typescript
import { z } from 'zod';

export const LogStreamConfigSchema = z.object({
  // SSE configuration
  sseHeartbeatIntervalMs: z.number().int().min(1000).max(60000).default(10000),
  sseRetryTimeoutMs: z.number().int().min(1000).max(30000).default(3000),

  // Polling fallback
  pollingIntervalMs: z.number().int().min(1000).max(10000).default(5000),
  pollingDefaultLimit: z.number().int().min(10).max(1000).default(100),

  // UI configuration
  virtualizedOverscanCount: z.number().int().min(1).max(50).default(5),
  maxVisibleLogs: z.number().int().min(100).max(100000).default(10000),

  // Filtering
  defaultLogLevel: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('DEBUG'),
  searchDebounceMs: z.number().int().min(100).max(2000).default(500),

  // Autoscroll
  autoscrollEnabled: z.boolean().default(true),
  autoscrollThreshold: z.number().int().min(10).max(1000).default(100)
});

export type LogStreamConfig = z.infer<typeof LogStreamConfigSchema>;

// Load from environment
export function loadLogStreamConfig(): LogStreamConfig {
  return LogStreamConfigSchema.parse({
    sseHeartbeatIntervalMs: parseInt(process.env.REACT_APP_SSE_HEARTBEAT_INTERVAL_MS || '10000'),
    sseRetryTimeoutMs: parseInt(process.env.REACT_APP_SSE_RETRY_TIMEOUT_MS || '3000'),
    pollingIntervalMs: parseInt(process.env.REACT_APP_POLLING_INTERVAL_MS || '5000'),
    pollingDefaultLimit: parseInt(process.env.REACT_APP_POLLING_DEFAULT_LIMIT || '100'),
    virtualizedOverscanCount: parseInt(process.env.REACT_APP_VIRTUALIZED_OVERSCAN || '5'),
    maxVisibleLogs: parseInt(process.env.REACT_APP_MAX_VISIBLE_LOGS || '10000'),
    defaultLogLevel: process.env.REACT_APP_DEFAULT_LOG_LEVEL || 'DEBUG',
    searchDebounceMs: parseInt(process.env.REACT_APP_SEARCH_DEBOUNCE_MS || '500'),
    autoscrollEnabled: process.env.REACT_APP_AUTOSCROLL_ENABLED !== 'false',
    autoscrollThreshold: parseInt(process.env.REACT_APP_AUTOSCROLL_THRESHOLD || '100')
  });
}
```

---

### 3. LogStreamCursor

**Purpose**: Cursor for pagination in polling fallback mode

#### Python Model

```python
from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional

class LogStreamCursor(BaseModel):
    """Cursor for paginated log retrieval."""

    timestamp: datetime = Field(
        description="Timestamp of the last log in the page"
    )

    sequence: int = Field(
        ge=0,
        description="Sequence number of the last log in the page"
    )

    @property
    def encoded(self) -> str:
        """Encode cursor as string for API transport."""
        return f"{self.timestamp.isoformat()}#{self.sequence:03d}"

    @classmethod
    def decode(cls, cursor_str: str) -> "LogStreamCursor":
        """Decode cursor from API string format."""
        parts = cursor_str.split('#')
        if len(parts) != 2:
            raise ValueError(f"Invalid cursor format: {cursor_str}")

        timestamp = datetime.fromisoformat(parts[0])
        sequence = int(parts[1])

        return cls(timestamp=timestamp, sequence=sequence)
```

#### TypeScript Interface

```typescript
export interface LogStreamCursor {
  timestamp: string; // ISO 8601
  sequence: number;
}

export function encodeCursor(cursor: LogStreamCursor): string {
  return `${cursor.timestamp}#${cursor.sequence.toString().padStart(3, '0')}`;
}

export function decodeCursor(cursorStr: string): LogStreamCursor {
  const parts = cursorStr.split('#');
  if (parts.length !== 2) {
    throw new Error(`Invalid cursor format: ${cursorStr}`);
  }

  return {
    timestamp: parts[0],
    sequence: parseInt(parts[1], 10)
  };
}
```

---

### 4. LogFilterParams

**Purpose**: Parameters for filtering logs on both client and server side

#### Python Model

```python
from pydantic import BaseModel, Field
from typing import Optional, Literal

class LogFilterParams(BaseModel):
    """Parameters for filtering log stream."""

    investigation_id: str = Field(
        description="Investigation ID to filter by (required)"
    )

    min_level: Optional[Literal["DEBUG", "INFO", "WARN", "ERROR"]] = Field(
        default=None,
        description="Minimum log level to include (server-side filter)"
    )

    source: Optional[Literal["frontend", "backend"]] = Field(
        default=None,
        description="Filter by log source"
    )

    service: Optional[str] = Field(
        default=None,
        description="Filter by specific service name"
    )

    search_text: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Free-text search across log messages (client-side)"
    )

    after_cursor: Optional[str] = Field(
        default=None,
        description="Cursor for pagination (timestamp#seq format)"
    )

    limit: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Page size for polling mode"
    )
```

#### TypeScript Interface

```typescript
export interface LogFilterParams {
  investigationId: string;
  minLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  source?: 'frontend' | 'backend';
  service?: string;
  searchText?: string;
  afterCursor?: string;
  limit?: number;
}
```

---

### 5. SSEEvent

**Purpose**: Server-Sent Event wrapper for typed event handling

#### TypeScript Interface

```typescript
export type SSEEventType = 'log' | 'heartbeat' | 'error' | 'connection_established';

export interface SSEEvent<T = any> {
  id?: string; // Last-Event-ID for reconnection
  event: SSEEventType;
  data: T;
  retry?: number; // Retry timeout in milliseconds
}

export interface LogSSEEvent extends SSEEvent<UnifiedLog> {
  event: 'log';
  data: UnifiedLog;
}

export interface HeartbeatSSEEvent extends SSEEvent<{ server_time: string }> {
  event: 'heartbeat';
  data: {
    server_time: string;
  };
}

export interface ErrorSSEEvent extends SSEEvent<{ message: string; code?: string }> {
  event: 'error';
  data: {
    message: string;
    code?: string;
  };
}

export interface ConnectionEstablishedEvent extends SSEEvent<{ investigation_id: string }> {
  event: 'connection_established';
  data: {
    investigation_id: string;
  };
}

export type TypedSSEEvent = LogSSEEvent | HeartbeatSSEEvent | ErrorSSEEvent | ConnectionEstablishedEvent;
```

---

### 6. LogStreamMetrics

**Purpose**: Metrics for monitoring log stream health and performance

#### Python Model

```python
from pydantic import BaseModel, Field
from datetime import datetime

class LogStreamMetrics(BaseModel):
    """Metrics for log stream monitoring."""

    investigation_id: str

    # Volume metrics
    total_logs_streamed: int = Field(ge=0)
    frontend_logs_count: int = Field(ge=0)
    backend_logs_count: int = Field(ge=0)

    # Performance metrics
    avg_merge_latency_ms: float = Field(ge=0)
    p95_merge_latency_ms: float = Field(ge=0)
    p99_merge_latency_ms: float = Field(ge=0)

    # Reliability metrics
    deduplication_hits: int = Field(ge=0)
    sse_reconnections: int = Field(ge=0)
    polling_fallbacks: int = Field(ge=0)

    # Rate limiting
    rate_limit_violations: int = Field(ge=0)

    # Timestamps
    stream_started_at: datetime
    last_log_at: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
```

---

## Relationships

```
Investigation (1) ──── (N) UnifiedLog
    │
    │ investigation_id
    │
    ├──> LogStreamMetrics (1:1)
    └──> LogFilterParams (N) [multiple filter queries]

UnifiedLog:
  - Keyed by event_id
  - Ordered by (ts, seq)
  - Grouped by investigation_id
  - Filterable by (level, source, service)

LogStreamCursor:
  - Points to specific UnifiedLog
  - Used for pagination resumption
  - Encoded as "timestamp#seq"
```

---

## Data Flow

```
Frontend Browser ──POST──> /client-logs ──> BackendLogProvider
                                              │
                                              ├──> UnifiedLog (source=frontend)
                                              │
Backend FastAPI ───logs──> FrontendLogProvider ──> UnifiedLog (source=backend)
                                              │
                                              └──> LogAggregatorService
                                                    │
                                                    ├─> Merge (min-heap by ts, seq)
                                                    ├─> Deduplicate (SHA-1 hash)
                                                    ├─> Apply PII redaction
                                                    │
                                                    ├─> SSE Stream ──> Browser EventSource
                                                    │    (event: log, id: ts#seq)
                                                    │
                                                    └─> Polling API ──> fetch() fallback
                                                         (cursor pagination)
```

---

## Storage Considerations

**No persistent storage required for MVP (local-dev mode)**:
- Logs are streamed in real-time from application loggers
- Ephemeral in-memory buffers for merging and deduplication
- Backpressure management drops oldest logs when buffer full

**Future cloud provider modes** (Sentry, Datadog, ELK, CloudWatch):
- Logs retrieved from external log aggregation services via API
- Cursor-based pagination for historical log retrieval
- Same UnifiedLog schema for normalized access

---

## Validation Rules

1. **event_id uniqueness**: Enforced via deduplication service
2. **timestamp ordering**: Maintained via (ts, seq) tuple ordering
3. **investigation_id required**: All logs must have investigation context
4. **PII redaction**: Applied server-side before streaming
5. **Message length limits**: Max 10,000 characters per log message
6. **Context size limits**: Max 100KB per context object
7. **Schema version**: Current version is 1, validated on both ends

---

## Migration Strategy

When schema changes are required:

1. Increment `schema_version` field
2. Backend maintains backward compatibility for N-1 versions
3. Frontend validates schema_version and displays warning if mismatch
4. Logs with unsupported schema_version are displayed with degraded UI

---

## Performance Characteristics

- **UnifiedLog serialization**: ~1ms per log (JSON encoding)
- **Deduplication lookup**: O(1) with LRU cache
- **Merge operation**: O(n log k) where k = number of providers (2 for MVP)
- **Memory per investigation**: ~10MB for 10,000 buffered logs
- **Network payload**: ~500 bytes per log average (compressed SSE)

---

## Security Considerations

1. **PII Redaction**: Applied server-side before any transmission
2. **Authentication**: Bearer token required for all log endpoints
3. **Authorization**: User must have `investigation:{id}:read` permission
4. **Rate Limiting**: Prevents DoS via excessive log requests
5. **Input Validation**: All fields validated via Pydantic/Zod schemas
6. **XSS Prevention**: Log messages escaped before rendering in UI
