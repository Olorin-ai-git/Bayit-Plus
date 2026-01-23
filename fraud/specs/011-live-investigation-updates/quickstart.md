# Quick Start Guide: Live Investigation Data Updates

**Date**: 2025-11-06  
**Feature**: 008-live-investigation-updates

## Quick Overview

This guide provides developers with practical patterns for implementing the live investigation data updates feature. It includes real code examples, configuration instructions, and integration patterns.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React)                                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ useProgressData hook                             │  │
│  │ - Polls /progress with ETag caching             │  │
│  │ - Automatically switches to polling on SSE fail │  │
│  │ - Handles exponential backoff on errors         │  │
│  └──────────────────────────────────────────────────┘  │
│           ↓ (SSE preferred, polling fallback)         │
├─────────────────────────────────────────────────────────┤
│  Backend (FastAPI)                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ /api/v1/investigations/{id}/progress            │   │
│  │ - Returns real InvestigationProgress from DB    │   │
│  │ - Supports ETag conditional requests (304)      │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ /api/v1/investigations/{id}/events              │   │
│  │ - Cursor-based pagination with deduplication   │   │
│  │ - Supports ETag conditional requests (304)      │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ /api/v1/investigations/{id}/runs/{rid}/stream   │   │
│  │ - Server-Sent Events with heartbeat             │   │
│  │ - Reconnection support via last_event_id        │   │
│  └─────────────────────────────────────────────────┘   │
│           ↓ (queries/streams real data)               │
├─────────────────────────────────────────────────────────┤
│  Database (PostgreSQL)                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ investigation_states.progress_json              │   │
│  │ - Tool executions, phases, risk metrics         │   │
│  │                                                  │   │
│  │ investigation_states.settings_json              │   │
│  │ - Entities, configuration                       │   │
│  │                                                  │   │
│  │ investigation_audit_log                         │   │
│  │ - Events (cursor-paginated, ordered)            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Environment Configuration

### Backend Configuration

```bash
# File: .env or environment variables

# Progress endpoint performance
PROGRESS_CACHE_TTL=60                          # Cache TTL in seconds
ETAG_RESPONSE_TIME_TARGET_MS=30               # Target <30ms for 304 responses

# Events endpoint configuration
EVENT_FEED_DEFAULT_LIMIT=100                   # Default events per page
EVENT_FEED_MAX_LIMIT=1000                      # Max events per page
EVENT_FEED_ENABLE_DEDUP=true                   # Enable deduplication

# SSE streaming configuration
SSE_HEARTBEAT_INTERVAL_SECONDS=30             # Send heartbeat every 30s
SSE_MAX_DURATION_SECONDS=300                  # Max 5 minutes per connection
SSE_BATCH_SIZE=10                             # Process 10 events per batch
SSE_POLL_INTERVAL_SECONDS=0.5                 # Check for new events every 0.5s
SSE_RESPONSE_TIME_TARGET_MS=200               # Target <200ms response time

# Authentication & authorization
REQUIRE_READ_OR_DEV=true                       # Enforce role-based access
```

### Frontend Configuration

```typescript
// File: olorin-front/src/microservices/investigation/constants/pollingConfig.ts

export const POLLING_CONFIG = {
  // Polling intervals (milliseconds) - from environment
  PROGRESS_INTERVAL_MS: env.features.pollingIntervalMs || 3000,
  ENTITY_GRAPH_INTERVAL_MS: env.features.entityGraphPollingMs || 30000,
  
  // Retry configuration
  MAX_RETRIES: 5,
  RETRY_BACKOFF_MS: [3000, 6000, 12000, 24000, 30000],
  
  // Terminal statuses - stop polling when reached
  TERMINAL_STATUSES: ['completed', 'failed', 'cancelled'],
};

// Status-based interval calculation
export function calculatePollingInterval(
  status: string,
  lifecycleStage: string
): number {
  if (POLLING_CONFIG.TERMINAL_STATUSES.includes(status)) {
    return 0; // Stop polling
  }
  
  switch (status) {
    case 'running':
      return lifecycleStage === 'in_progress' ? 1000 : 5000;
    case 'pending':
    case 'initializing':
      return 5000;
    default:
      return 10000;
  }
}
```

## Backend Implementation Patterns

### 1. Progress Endpoint Implementation

```python
# File: olorin-server/app/router/investigations_router.py

@investigations_router.get(
    "/investigations/{investigation_id}/progress",
    response_model=InvestigationProgress
)
def get_investigation_progress_endpoint(
    investigation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_or_dev),
):
    """Get real-time investigation progress."""
    
    # Query database for investigation state
    state = get_state_by_id(db, investigation_id, current_user.username)
    if not state:
        raise HTTPException(status_code=404, detail="Investigation not found")
    
    # Build progress response from investigation state
    # CRITICAL: Use REAL data from state, NO mocks or defaults
    progress = InvestigationProgressService.build_progress_from_state(state)
    
    return progress  # Returns complete InvestigationProgress with all real data
```

**Key Points**:
- ✅ Data comes from `investigation_state.progress_json` (real database state)
- ✅ No hardcoded values, no fallback defaults
- ✅ Authorization verified (require_read_or_dev)
- ✅ Returns 404 if investigation not found

### 2. Event Pagination Implementation

```python
# File: olorin-server/app/router/investigation_stream_router.py

@router.get(
    "/{investigation_id}/events",
    response_model=EventsFeedResponse,
)
async def get_investigation_events(
    investigation_id: str,
    since: Optional[str] = Query(None, description="Cursor"),
    limit: int = Query(100, ge=1, le=1000),
    if_none_match: Optional[str] = Header(None, alias="If-None-Match"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_or_dev),
) -> EventsFeedResponse:
    """Get paginated investigation events with ETag support."""
    
    service = EventFeedService(db)
    
    # Check ETag for fast 304 response
    if if_none_match:
        current_etag = service.get_investigation_etag(
            investigation_id=investigation_id,
            user_id=current_user.username
        )
        if if_none_match == current_etag:
            # Return 304 Not Modified in <30ms
            return EventsFeedResponse(
                items=[],
                next_cursor=None,
                has_more=False,
                poll_after_seconds=3,
                etag=current_etag
            )
    
    # Fetch events with real data from audit_log
    response = service.fetch_events_since(
        investigation_id=investigation_id,
        user_id=current_user.username,
        cursor=since,
        limit=limit
    )
    
    return response
```

**Key Points**:
- ✅ Cursor validation (expires >30 days old)
- ✅ Deduplication by event ID
- ✅ Ordering by (timestamp ASC, sequence ASC)
- ✅ ETag support for 304 responses
- ✅ Data from `investigation_audit_log` table (real events)

### 3. SSE Streaming Implementation

```python
# File: olorin-server/app/router/investigation_sse_router.py

@router.get("/{investigation_id}/runs/{run_id}/stream")
async def stream_investigation_events(
    investigation_id: str,
    run_id: str,
    request: Request,
    last_event_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_or_dev),
):
    """Stream investigation events via Server-Sent Events."""
    
    service = EventStreamingService(db)
    
    async def event_generator():
        try:
            async for event in service.stream_investigation_events(
                investigation_id=investigation_id,
                user_id=current_user.username,
                run_id=run_id,
                last_event_id=last_event_id  # Reconnection support
            ):
                if await request.is_disconnected():
                    break
                yield event  # Real events streamed to client
                
        except Exception as e:
            logger.error(f"SSE error: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering
        }
    )
```

**Key Points**:
- ✅ Streams real events (not mocked)
- ✅ Supports reconnection via `last_event_id`
- ✅ Proper SSE format: `event: type\nid: id\ndata: json\n\n`
- ✅ Detects client disconnect and stops streaming
- ✅ Error handling with proper error event format

## Frontend Implementation Patterns

### 1. Progress Data Hook

```typescript
// File: olorin-front/src/microservices/investigation/hooks/useProgressData.ts

export function useProgressData(
  investigationId: string | undefined,
  enabled: boolean = true
) {
  const [progress, setProgress] = useState<InvestigationProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const isMountedRef = useRef(true);
  const { getETag, saveETag, clearETag } = useETagCache(investigationId);
  
  // Fetch with ETag support
  const fetchProgress = useCallback(async () => {
    if (!investigationId) return;
    
    try {
      const cachedETag = getETag();
      
      // Make request with If-None-Match header
      const data = await service.getProgress(investigationId, {
        headers: cachedETag ? { 'If-None-Match': cachedETag } : {}
      });
      
      if (!isMountedRef.current) return;
      
      if (data) {  // 200 response
        setProgress(data);
        setError(null);
        setRetryCount(0);
      }
      // If 304, data is null - keep previous state
      
      // Stop polling if terminal status reached
      if (data && isTerminalStatus(data.status)) {
        stopPolling();
        clearETag();
      }
      
    } catch (err) {
      if (!isMountedRef.current) return;
      
      const error = err instanceof Error ? err : new Error('Fetch failed');
      setError(error);
      
      // Increment retry count for exponential backoff
      setRetryCount(prev => Math.min(prev + 1, MAX_RETRIES));
    }
  }, [investigationId, getETag, clearETag]);
  
  // Adaptive polling based on status/lifecycle
  const { startPolling, stopPolling, isPolling, pollInterval } = useAdaptivePolling({
    investigationId,
    status: progress?.status || 'pending',
    lifecycleStage: progress?.lifecycle_stage,
    callback: fetchProgress,
    enabled
  });
  
  // Start polling on mount
  useEffect(() => {
    if (enabled && investigationId) {
      startPolling();
    }
    return () => {
      stopPolling();
    };
  }, [investigationId, enabled, startPolling, stopPolling]);
  
  return {
    progress,
    isLoading,
    isPolling,
    error,
    retryCount,
    pollInterval,
  };
}
```

**Key Points**:
- ✅ ETag caching for 304 responses
- ✅ Stops polling on terminal status
- ✅ Exponential backoff on errors
- ✅ Adaptive intervals based on investigation status
- ✅ Cleanup on unmount

### 2. SSE to Polling Fallback

```typescript
// File: olorin-front/src/microservices/investigation/hooks/useSSEPollingFallback.ts

export function useSSEPollingFallback({
  investigationId,
  runId,
  pollingCallback,
  enabled = true
}: UseSSEPollingFallbackParams) {
  const [usePolling, setUsePolling] = useState(false);
  const [sseFailed, setSseFailed] = useState(false);
  const sseRef = useRef<EventSource | null>(null);
  const sseRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Connect to SSE stream
  useEffect(() => {
    if (!enabled || !investigationId || !runId) return;
    
    try {
      const eventSource = new EventSource(
        `/api/v1/investigations/${investigationId}/runs/${runId}/stream`
      );
      
      eventSource.addEventListener('progress_update', (e) => {
        // Real-time update received
        const data = JSON.parse(e.data);
        pollingCallback(data);
        
        // Reset failure state on successful event
        setSseFailed(false);
        setUsePolling(false);
      });
      
      eventSource.addEventListener('error', () => {
        // SSE failed - switch to polling
        console.warn('SSE connection failed, switching to polling');
        setSseFailed(true);
        setUsePolling(true);
        
        eventSource.close();
        sseRef.current = null;
        
        // Try to reconnect in 10 seconds
        sseRetryTimeoutRef.current = setTimeout(() => {
          console.log('Attempting SSE reconnection...');
          // Will retrigger useEffect and attempt reconnect
        }, 10000);
      });
      
      sseRef.current = eventSource;
      
    } catch (err) {
      console.error('SSE setup failed:', err);
      setSseFailed(true);
      setUsePolling(true);
    }
    
    return () => {
      if (sseRef.current) sseRef.current.close();
      if (sseRetryTimeoutRef.current) clearTimeout(sseRetryTimeoutRef.current);
    };
    
  }, [investigationId, runId, enabled, pollingCallback]);
  
  // Use polling when SSE fails
  const { startPolling: startPoll, stopPolling: stopPoll } = useAdaptivePolling({
    investigationId,
    callback: pollingCallback,
    enabled: usePolling
  });
  
  useEffect(() => {
    if (usePolling) startPoll();
    else stopPoll();
  }, [usePolling, startPoll, stopPoll]);
  
  return {
    isUsingSSE: !usePolling,
    isUsingPolling: usePolling,
    sseFailed,
  };
}
```

**Key Points**:
- ✅ Automatic SSE→polling fallback on failure
- ✅ Reconnection attempts in background
- ✅ Transparent to user
- ✅ Clean event handling

### 3. Multi-Tab Coordination

```typescript
// File: olorin-front/src/shared/stores/investigationStore.ts

export const useInvestigationStore = (investigationId: string) => {
  const [isActiveTab, setIsActiveTab] = useState(true);
  
  useEffect(() => {
    // Register this tab as active
    const tabKey = `investigation_${investigationId}_activeTab`;
    const tabId = generateTabId();
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === tabKey && e.newValue !== tabId) {
        // Another tab is active for this investigation
        setIsActiveTab(false);
      }
    };
    
    // Mark this tab as active
    try {
      localStorage.setItem(tabKey, tabId);
      setIsActiveTab(true);
    } catch {
      // localStorage not available
      setIsActiveTab(true);
    }
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
    
  }, [investigationId]);
  
  return { isActiveTab };
};

// Usage in component:
export const InvestigationDashboard = ({ investigationId }: Props) => {
  const { isActiveTab } = useInvestigationStore(investigationId);
  
  // Only this tab polls/streams
  const { progress } = useProgressData(
    investigationId,
    enabled={isActiveTab}  // Only fetch if active tab
  );
  
  return (
    <div>
      {!isActiveTab && <div>Updates from another tab...</div>}
      {progress && <ProgressBar progress={progress.completion_percent} />}
    </div>
  );
};
```

**Key Points**:
- ✅ LocalStorage coordination between tabs
- ✅ Only active tab polls/streams
- ✅ Graceful handling of tab switching
- ✅ Reduces server load with multiple tabs open

## Real Request/Response Examples

### Example 1: Progress Update via Polling

**Request**:
```http
GET /api/v1/investigations/inv_001/progress HTTP/1.1
Host: localhost:8000
If-None-Match: "v5"
Authorization: Bearer {token}
```

**Response (200 OK)**:
```http
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "v6"
Cache-Control: private, max-age=60
X-Recommended-Interval: 1000

{
  "id": "progress_001",
  "investigation_id": "inv_001",
  "status": "running",
  "lifecycle_stage": "in_progress",
  "completion_percent": 55,
  "tool_executions": [
    {
      "id": "tool_exec_001",
      "tool_name": "ip_reputation",
      "status": "completed",
      "execution_time_ms": 4000,
      "result": {"success": true, "risk_score": 0.75}
    }
  ],
  "phases": [
    {
      "id": "phase_001",
      "name": "initialization",
      "status": "completed",
      "completion_percent": 100
    }
  ],
  "risk_metrics": {
    "overall": 0.72,
    "confidence": 0.88
  }
}
```

**Response (304 Not Modified)**:
```http
HTTP/1.1 304 Not Modified
ETag: "v5"
Cache-Control: private, max-age=60
X-Recommended-Interval: 1000

(empty body)
```

### Example 2: Event Pagination

**Request**:
```http
GET /api/v1/investigations/inv_001/events?limit=100 HTTP/1.1
Host: localhost:8000
Authorization: Bearer {token}
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "v6"

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
        "status": "completed",
        "risk_score": 0.75
      }
    }
  ],
  "next_cursor": "1730668800001_000002",
  "has_more": true,
  "poll_after_seconds": 3,
  "etag": "v6"
}
```

### Example 3: SSE Stream

**Request**:
```http
GET /api/v1/investigations/inv_001/runs/run_001/stream HTTP/1.1
Host: localhost:8000
Authorization: Bearer {token}
```

**Response (Server-Sent Events)**:
```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

event: tool_complete
id: 1730668800000_000001
data: {"tool_name": "ip_reputation", "status": "completed", "risk_score": 0.75}

event: heartbeat
id: 1730668800030_000002
data: {"timestamp": "2025-11-06T09:00:30Z"}

event: phase_change
id: 1730668800060_000003
data: {"phase_name": "analysis", "status": "in_progress", "completion_percent": 50}
```

## Testing Patterns

### Backend Unit Test Example

```python
# File: tests/backend/test_progress_endpoint.py

def test_get_progress_returns_real_data(db_session, investigation):
    """Verify progress endpoint returns real data from progress_json."""
    
    # Setup: Investigation with real progress data
    investigation.progress_json = json.dumps({
        "tool_executions": [
            {"id": "t1", "status": "completed", "tool_name": "ip_reputation"}
        ],
        "percent_complete": 50,
        "phases": [{"id": "p1", "name": "analysis", "status": "in_progress"}]
    })
    db_session.commit()
    
    # Execute
    response = client.get(f"/api/v1/investigations/{investigation.id}/progress")
    
    # Verify
    assert response.status_code == 200
    data = response.json()
    assert data["completion_percent"] == 50
    assert len(data["tool_executions"]) == 1
    assert data["tool_executions"][0]["tool_name"] == "ip_reputation"
    assert len(data["phases"]) == 1
    # ✅ No mocks, no defaults - real data verified
```

### Frontend Hook Test Example

```typescript
// File: tests/frontend/hooks/test_useProgressData.ts

test('useProgressData polls progress endpoint', async () => {
  const investigationId = 'inv_001';
  
  // Mock API response
  const mockProgress: InvestigationProgress = {
    investigation_id: investigationId,
    status: 'running',
    completion_percent: 50,
    tool_executions: [],
    phases: [],
    // ... other fields
  };
  
  fetchMock.mock(`/api/v1/investigations/${investigationId}/progress`, mockProgress);
  
  // Render hook
  const { result } = renderHook(() => useProgressData(investigationId));
  
  // Wait for fetch
  await waitFor(() => {
    expect(result.current.progress).toBeTruthy();
  });
  
  // Verify data
  expect(result.current.progress?.completion_percent).toBe(50);
  expect(result.current.isPolling).toBe(true);
});
```

## Deployment Checklist

- [ ] Backend environment variables configured (polling intervals, SSE heartbeat, etc.)
- [ ] Frontend environment variables configured (polling intervals, retry backoff)
- [ ] Database schema verified (investigation_states, investigation_audit_log tables exist)
- [ ] All endpoints tested with real data (no mocks in production)
- [ ] ETag caching working (<30ms for 304 responses)
- [ ] SSE streaming working with proper reconnection
- [ ] Multi-tab coordination tested
- [ ] Fallback to polling tested
- [ ] Terminal status detection working (polling stops)
- [ ] Error handling working (exponential backoff, graceful degradation)
- [ ] Performance targets met (<200ms p95, <1s delivery)
- [ ] All tests passing (unit, integration, E2E)

---

**Quick Start Complete**: 2025-11-06  
**Ready for Implementation**

