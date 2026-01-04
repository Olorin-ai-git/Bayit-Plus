# Phase 0: Research - Live Merged Investigation Logstream

**Feature**: `021-live-merged-logstream`
**Date**: 2025-11-12
**Status**: Research Complete

## Executive Summary

This document captures research findings for implementing a production-ready live merged logstream that correlates and streams logs from both frontend (React/TypeScript) and backend (FastAPI/Python) systems for a specific investigation_id. The system uses Server-Sent Events (SSE) as the primary transport with automatic fallback to polling, ensuring 99.9% reliability even during network instability.

## Technology Research

### SSE (Server-Sent Events) Implementation

**Why SSE over WebSockets**:
- One-way communication from server to client (perfect for log streaming)
- Automatic reconnection with Last-Event-ID support built into browser
- Works through most firewalls and proxies better than WebSockets
- Lower overhead than WebSocket bidirectional channels
- Native browser support with EventSource API

**SSE Limitations and Mitigations**:
- Browser limit of 6 concurrent connections per domain
  - **Mitigation**: Close inactive streams, reuse connections
- No built-in binary support (text-only)
  - **Not an issue**: Logs are text-based JSON
- IE/Edge legacy support issues
  - **Acceptable**: Modern browsers only (Chrome, Firefox, Safari, Edge Chromium)

**SSE Best Practices Found**:
1. Use `text/event-stream` content type
2. Set `Cache-Control: no-store, no-cache`
3. Keep connection alive with periodic heartbeats (10s recommended)
4. Support Last-Event-ID header for resume after disconnect
5. Implement exponential backoff on client reconnection (3s, 6s, 12s, max 30s)

### Frontend Log Capture

**Browser Logging Approaches**:
1. **Console Interception** (chosen for local dev)
   - Override console.log/warn/error methods
   - Capture all console output automatically
   - Add investigation_id to log context
   - POST batches to backend /client-logs endpoint

2. **Manual Logging** (production alternative)
   - Custom logger utility (winston-like interface)
   - Explicit logging in React components
   - Better performance, but requires developer discipline

**Frontend Log Correlation**:
- Attach `investigation_id` to React context during investigation
- Include in every log entry automatically
- Add `source: "frontend"` and `service: "web"` fields
- Capture component stack for context

### Backend Log Capture

**Python Logging Strategy**:
1. **Structured Logging** with `structlog` library
   - JSON-formatted log records
   - Contextual information bound to logger
   - Thread-local context for request tracking

2. **FastAPI Middleware** for auto-correlation
   - Read `X-Investigation-Id` header from requests
   - Inject into logging context automatically
   - Add to all logs during request lifecycle

3. **Log Buffer** (chosen approach)
   - In-memory ring buffer (collections.deque with maxlen)
   - Efficient O(1) append and O(n) iteration
   - Configurable size (default 10,000 entries)
   - Thread-safe with asyncio.Lock

**Alternative: File Tailing** (for production)
- Tail log file with `watchfiles` library
- Parse JSON log records
- Filter by investigation_id
- Lower memory footprint for high-volume logs

### Log Merging Algorithms

**Min-Heap Merge** (chosen approach):
```python
import heapq
from typing import AsyncIterable

async def merge_log_streams(*streams: AsyncIterable[UnifiedLog]) -> AsyncIterable[UnifiedLog]:
    """Merge multiple sorted log streams using min-heap."""
    heap = []
    iterators = [stream.__aiter__() for stream in streams]

    # Initialize heap with first item from each stream
    for idx, it in enumerate(iterators):
        try:
            item = await it.__anext__()
            heapq.heappush(heap, (item.ts, item.seq, idx, item))
        except StopAsyncIteration:
            pass

    # Merge streams
    while heap:
        ts, seq, idx, item = heapq.heappop(heap)
        yield item

        # Get next item from same stream
        try:
            next_item = await iterators[idx].__anext__()
            heapq.heappush(heap, (next_item.ts, next_item.seq, idx, next_item))
        except StopAsyncIteration:
            pass
```

**Complexity**: O(n log k) where n = total logs, k = number of providers (2 in our case)

**Clock Skew Handling**:
- Allow 5-10 second skew window (configurable)
- Use monotonic sequence numbers as tie-breaker
- Emit logs once skew window expires
- Buffer logs within window for reordering

### Deduplication Strategies

**Hash-Based Deduplication** (chosen approach):
```python
import hashlib
from functools import lru_cache

@lru_cache(maxsize=10000)
def generate_log_hash(message: str, ts: str, source: str) -> str:
    """Generate deterministic hash for deduplication."""
    content = f"{message}|{ts}|{source}"
    return hashlib.sha1(content.encode()).hexdigest()
```

**Deduplication Algorithm**:
1. Check if `event_id` is present → use as primary key
2. If no `event_id`, generate `sha1(message+ts+source)`
3. Maintain LRU cache of seen hashes (last 10,000)
4. Skip log if hash found in cache
5. Cache evicts oldest entries automatically

**Performance**: O(1) lookup, O(1) insert with LRU cache

### SSE Implementation Research

**Backend SSE with FastAPI**:
```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from typing import AsyncIterator

async def event_generator(investigation_id: str) -> AsyncIterator[str]:
    """Generate SSE events."""
    while True:
        # Get next log entry
        log = await get_next_log(investigation_id)

        # Format as SSE event
        event_id = f"{log.ts}#{log.seq:03d}"
        yield f"event: log\n"
        yield f"id: {event_id}\n"
        yield f"data: {log.json()}\n\n"

        # Heartbeat every 10s
        await asyncio.sleep(10)
        yield f"event: heartbeat\n"
        yield f"data: {json.dumps({'server_time': datetime.utcnow().isoformat()})}\n\n"

@app.get("/investigations/{id}/logs/stream")
async def stream_logs(id: str):
    return StreamingResponse(
        event_generator(id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-store, no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )
```

**Frontend SSE with React**:
```typescript
useEffect(() => {
  const eventSource = new EventSource(
    `${API_BASE_URL}/investigations/${investigationId}/logs/stream`,
    { withCredentials: false }
  );

  eventSource.addEventListener('log', (event) => {
    const log = JSON.parse(event.data);
    setLogs(prev => [...prev, log]);
  });

  eventSource.addEventListener('heartbeat', (event) => {
    setLastHeartbeat(JSON.parse(event.data).server_time);
  });

  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    eventSource.close();
    // Fallback to polling
    startPolling(investigationId);
  };

  return () => eventSource.close();
}, [investigationId]);
```

### React Virtualization Research

**Why Virtualization**:
- Rendering 10,000+ log entries causes browser freezing
- Virtual scrolling renders only visible items
- Dramatic performance improvement (60fps vs <10fps)

**Library Options**:
1. **react-window** (chosen)
   - Lightweight (6.5kb gzipped)
   - Simple API
   - Fixed/variable size support
   - Active maintenance

2. **react-virtualized** (alternative)
   - More features but heavier (27kb gzipped)
   - Overkill for our use case

**Implementation Pattern**:
```typescript
import { FixedSizeList } from 'react-window';

const LogList = ({ logs }: { logs: UnifiedLog[] }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <LogEntry log={logs[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={logs.length}
      itemSize={60}  // Fixed height per log entry
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

### PII Redaction Strategies

**Server-Side Redaction** (mandatory):
```python
import re
from typing import Dict, Pattern

# Regex patterns for PII detection
PII_PATTERNS: Dict[str, Pattern] = {
    'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
    'phone': re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'),
    'ssn': re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
    'credit_card': re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'),
    'ip_address': re.compile(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b')
}

def redact_pii(text: str) -> str:
    """Redact PII from log message."""
    redacted = text
    for pii_type, pattern in PII_PATTERNS.items():
        redacted = pattern.sub(f'[REDACTED_{pii_type.upper()}]', redacted)
    return redacted
```

**Configuration-Driven Redaction**:
- Enable/disable per PII type via config
- Custom patterns via environment variables
- Audit log of redactions for compliance

### Rate Limiting Research

**Per-User Rate Limiting**:
```python
from fastapi import HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/investigations/{id}/logs/stream")
@limiter.limit("100/minute")  # 100 requests per minute per IP
async def stream_logs(id: str, request: Request):
    # ... implementation
```

**Per-Investigation Rate Limiting**:
```python
from collections import defaultdict
from datetime import datetime, timedelta

# In-memory rate limit tracker
investigation_requests: Dict[str, List[datetime]] = defaultdict(list)

async def check_investigation_rate_limit(investigation_id: str, limit: int = 1000):
    """Check if investigation has exceeded rate limit."""
    now = datetime.utcnow()
    one_minute_ago = now - timedelta(minutes=1)

    # Clean old requests
    investigation_requests[investigation_id] = [
        req_time for req_time in investigation_requests[investigation_id]
        if req_time > one_minute_ago
    ]

    # Check limit
    if len(investigation_requests[investigation_id]) >= limit:
        raise HTTPException(status_code=429, detail="Investigation rate limit exceeded")

    # Track this request
    investigation_requests[investigation_id].append(now)
```

### Polling Fallback Implementation

**Cursor-Based Pagination**:
```python
from typing import Optional

@app.get("/investigations/{id}/logs")
async def get_logs(
    id: str,
    since: Optional[str] = None,  # Cursor: timestamp#seq
    limit: int = 100,
    min_level: Optional[str] = None
):
    """Polling endpoint with cursor-based pagination."""
    # Parse cursor
    if since:
        ts, seq = since.split('#')
        start_ts = datetime.fromisoformat(ts)
        start_seq = int(seq)
    else:
        start_ts = None
        start_seq = 0

    # Query logs
    logs = await fetch_logs(
        investigation_id=id,
        start_ts=start_ts,
        start_seq=start_seq,
        limit=limit,
        min_level=min_level
    )

    # Generate next cursor
    if logs:
        last_log = logs[-1]
        next_cursor = f"{last_log.ts}#{last_log.seq:03d}"
    else:
        next_cursor = since

    # ETag for 304 support
    etag = hashlib.md5(json.dumps([log.dict() for log in logs]).encode()).hexdigest()

    return {
        'items': logs,
        'next_cursor': next_cursor,
        'server_time': datetime.utcnow().isoformat()
    }, {'ETag': etag}
```

**Frontend Polling Strategy**:
```typescript
const startPolling = (investigationId: string) => {
  let cursor: string | null = null;
  let pollingInterval: NodeJS.Timer;

  const poll = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/investigations/${investigationId}/logs?since=${cursor || ''}&limit=100`,
        { headers: { 'If-None-Match': lastETag || '' } }
      );

      if (response.status === 304) {
        // No new logs
        return;
      }

      const data = await response.json();
      setLogs(prev => [...prev, ...data.items]);
      cursor = data.next_cursor;
      lastETag = response.headers.get('ETag');
    } catch (error) {
      console.error('Polling error:', error);
    }
  };

  // Poll every 5 seconds
  pollingInterval = setInterval(poll, 5000);
  poll();  // Initial poll

  return () => clearInterval(pollingInterval);
};
```

## Architecture Decisions

### Decision 1: SSE with Polling Fallback

**Options Considered**:
1. WebSocket only
2. SSE only
3. SSE + Polling fallback (chosen)
4. Long polling only

**Rationale**:
- SSE provides better compatibility with proxies/firewalls than WebSocket
- Automatic reconnection with Last-Event-ID is built into EventSource
- Polling fallback ensures reliability when SSE fails
- Lower implementation complexity than WebSocket
- No need for bidirectional communication

**Trade-offs**:
- SSE has 6 concurrent connection limit per domain (acceptable - users rarely view >6 investigations simultaneously)
- No binary data support (not needed for logs)

### Decision 2: In-Memory Log Buffer (Local Dev) + Cloud Stubs

**Options Considered**:
1. Database storage (PostgreSQL, MongoDB)
2. In-memory buffer (chosen for local dev)
3. File tailing (alternative for production)
4. Cloud logging services (Sentry, Datadog)

**Rationale for Local Dev**:
- Fast iteration during development
- No external dependencies required
- Simple to implement and debug
- Sufficient for development workload

**Production Strategy**:
- Provide stubs for cloud integrations (Sentry, Datadog, ELK, CloudWatch)
- Document extension points clearly
- Allow mixing: frontend→Sentry, backend→ELK

### Decision 3: Min-Heap Merge Algorithm

**Options Considered**:
1. Simple concatenate + sort (O(n log n))
2. Min-heap merge (chosen - O(n log k))
3. Sorted set merge (O(n))

**Rationale**:
- O(n log k) is optimal for merging k sorted streams
- Handles streaming data efficiently
- Memory-efficient (processes logs as they arrive)
- Clock skew tolerance can be added with buffering

### Decision 4: React Virtualization with react-window

**Options Considered**:
1. Render all logs (baseline)
2. react-window (chosen)
3. react-virtualized
4. Custom virtualization

**Rationale**:
- Dramatic performance improvement for large datasets
- Lightweight library (6.5kb)
- Simple API, easy to maintain
- Active development and community support

### Decision 5: Configuration-Driven Architecture

**All hardcoded values externalized**:
```typescript
// config/logstream-config.ts
export const LogStreamConfig = z.object({
  frontend: z.object({
    baseUrl: z.string().url(),
    port: z.number().int().positive()
  }),
  backend: z.object({
    baseUrl: z.string().url(),
    port: z.number().int().positive()
  }),
  logging: z.object({
    frontendMode: z.enum(['local', 'sentry', 'datadog']),
    backendMode: z.enum(['local', 'elk', 'cloudwatch']),
    filePath: z.string().optional(),
    minLevel: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']),
    bufferSize: z.number().int().positive(),
    clockSkewSeconds: z.number().int().positive()
  }),
  sse: z.object({
    heartbeatSeconds: z.number().int().positive(),
    retryMs: z.number().int().positive(),
    idleTimeoutSeconds: z.number().int().positive()
  }),
  rate_limits: z.object({
    perUser: z.number().int().positive(),
    perInvestigation: z.number().int().positive()
  })
});
```

## Integration Patterns

### FastAPI Integration

**Router Setup**:
```python
# app/router/log_stream_router.py
from fastapi import APIRouter, Depends
from app.services.log_aggregator import LogAggregatorService

router = APIRouter(prefix="/investigations", tags=["logs"])

@router.get("/{investigation_id}/logs/stream")
async def stream_logs(
    investigation_id: str,
    aggregator: LogAggregatorService = Depends()
):
    # ... implementation
```

**Service Structure**:
```
app/
├── services/
│   ├── log_aggregator.py          # Core aggregation logic
│   ├── log_providers/
│   │   ├── base.py                # LogProvider interface
│   │   ├── frontend_provider.py   # Frontend log provider
│   │   └── backend_provider.py    # Backend log provider
│   └── log_deduplicator.py        # Deduplication service
├── router/
│   └── log_stream_router.py       # SSE and polling endpoints
└── models/
    └── unified_log.py              # UnifiedLog Pydantic model
```

### React Integration

**Component Structure**:
```
olorin-front/src/
├── microservices/
│   └── investigation/
│       ├── components/
│       │   ├── LiveLogStream.tsx           # Main component
│       │   ├── LogEntry.tsx                # Individual log entry
│       │   ├── LogFilters.tsx              # Filter controls
│       │   └── LogStreamControls.tsx       # Pause/resume/autoscroll
│       ├── hooks/
│       │   ├── useLogStream.ts             # SSE connection hook
│       │   ├── useLogPolling.ts            # Polling fallback hook
│       │   └── useLogFilters.ts            # Filter state hook
│       └── services/
│           ├── logStreamService.ts         # API client
│           └── frontendLogger.ts           # Browser log capture
└── shared/
    └── types/
        └── unified-log.ts                  # TypeScript types
```

## Performance Benchmarks

### Target Performance Metrics

**Backend**:
- SSE connection establishment: <500ms
- Log merge latency: <100ms per log
- Deduplication lookup: <1ms
- Memory per connection: <5MB
- Concurrent connections: 1000+

**Frontend**:
- Initial render: <1s for 1000 logs
- Scroll FPS: 60fps with 10,000+ logs loaded
- Filter application: <100ms
- Search: <200ms for 10,000 entries
- Memory usage: <50MB for 10,000 logs

**Network**:
- SSE reconnect time: <3s
- Polling interval: 5s
- Heartbeat interval: 10s

## Risk Assessment

### High-Priority Risks

1. **Clock Skew Between Systems**
   - **Probability**: High
   - **Impact**: Medium (incorrect log ordering)
   - **Mitigation**: 5-10s skew window + sequence numbers

2. **SSE Connection Instability**
   - **Probability**: High (mobile networks, proxies)
   - **Impact**: High (users lose log visibility)
   - **Mitigation**: Automatic polling fallback, Last-Event-ID resume

3. **High Volume Log Bursts**
   - **Probability**: Medium
   - **Impact**: Medium (memory exhaustion, dropped logs)
   - **Mitigation**: Bounded buffers with overflow handling

### Medium-Priority Risks

4. **PII Exposure**
   - **Probability**: Medium
   - **Impact**: Critical (compliance violation)
   - **Mitigation**: Server-side redaction, audit logging

5. **Browser Memory Exhaustion**
   - **Probability**: Medium (long-running sessions)
   - **Impact**: High (tab crash)
   - **Mitigation**: Virtualized scrolling, circular buffer

## Dependencies and Prerequisites

### Backend Dependencies
```toml
# pyproject.toml
[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.104.0"
uvicorn = "^0.24.0"
pydantic = "^2.5.0"
structlog = "^23.2.0"
python-dateutil = "^2.8.2"
```

### Frontend Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-window": "^1.8.10",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/react-window": "^1.8.8"
  }
}
```

### Infrastructure Prerequisites
- FastAPI backend running on port 8090
- React frontend running on port 3000
- Investigation entity/system with investigation_id
- Existing authentication/authorization system

## Next Steps (Phase 1)

1. Create data model specification (data-model.md)
2. Define API contracts (contracts/)
3. Create quickstart guide (quickstart.md)
4. Proceed to Phase 2: Task breakdown (tasks.md)

## References

- **SSE Specification**: https://html.spec.whatwg.org/multipage/server-sent-events.html
- **FastAPI SSE**: https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse
- **EventSource API**: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- **react-window**: https://github.com/bvaughn/react-window
- **structlog**: https://www.structlog.org/
- **Feature Specification**: /Users/gklainert/Documents/olorin/specs/021-live-merged-logstream/spec.md
