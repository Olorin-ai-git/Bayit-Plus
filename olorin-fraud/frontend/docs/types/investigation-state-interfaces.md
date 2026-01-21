# Investigation State Management TypeScript Interfaces

**Feature**: 001-investigation-state-management
**Phase**: Phase 10 - Documentation (T090)
**Last Updated**: 2024-11-04

Comprehensive TypeScript interface definitions for the investigation state management system. These interfaces provide type safety across all frontend hooks and components.

---

## API Data Models

### Actor

Source information for investigation events.

```typescript
interface Actor {
  /**
   * Type of actor generating the event
   * Values: 'system', 'user', 'webhook', 'polling'
   */
  type: 'system' | 'user' | 'webhook' | 'polling';

  /**
   * User ID if actor type is 'user'
   * Optional for system/webhook actors
   */
  user_id?: string;

  /**
   * Service name if actor type is 'system' or 'webhook'
   * Optional for user actors
   */
  service?: string;
}

// Usage
const userActor: Actor = {
  type: 'user',
  user_id: 'user-123'
};

const systemActor: Actor = {
  type: 'system',
  service: 'fraud_detection_agent'
};
```

**Related Interfaces**: InvestigationEvent

---

### InvestigationEvent

Single event in the investigation event stream.

```typescript
interface InvestigationEvent {
  /**
   * Event cursor ID for pagination
   * Format: {13-digit-timestamp-ms}_{6-digit-sequence}
   * Example: "1730668800000_000127"
   * Usage: Use as cursor in next API request
   */
  id: string;

  /**
   * Investigation ID this event belongs to
   * Used for filtering and scoping
   */
  investigation_id: string;

  /**
   * Event type descriptor
   * Examples: 'anomaly_detected', 'phase_completed', 'tool_started'
   */
  type: string;

  /**
   * Event originator information
   * Identifies who/what created this event
   */
  actor: Actor;

  /**
   * Type of entity being modified
   * Values: 'anomaly', 'relationship', 'note', 'status', 'phase',
   *         'tool_execution', 'lifecycle_stage', 'settings', 'progress', 'results'
   */
  entity_type:
    | 'anomaly'
    | 'relationship'
    | 'note'
    | 'status'
    | 'phase'
    | 'tool_execution'
    | 'lifecycle_stage'
    | 'settings'
    | 'progress'
    | 'results';

  /**
   * Operation performed on entity
   * Values: 'append' (add new), 'update' (modify), 'delete' (remove)
   */
  operation: 'append' | 'update' | 'delete';

  /**
   * Event-specific payload data
   * Structure depends on entity_type and operation
   */
  data: Record<string, unknown>;

  /**
   * ISO 8601 timestamp when event occurred
   * Format: "2024-11-04T12:34:56.789Z"
   */
  timestamp: string;

  /**
   * Optional metadata for advanced use cases
   */
  metadata?: Record<string, unknown>;
}

// Usage
const anomalyEvent: InvestigationEvent = {
  id: "1730668800000_000001",
  investigation_id: "inv-123",
  type: "anomaly_detected",
  actor: { type: 'system', service: 'fraud_detection_agent' },
  entity_type: 'anomaly',
  operation: 'append',
  data: {
    anomaly_id: "anom-456",
    risk_score: 85,
    description: "Unusual transaction pattern"
  },
  timestamp: "2024-11-04T12:34:56.789Z"
};
```

**Related Interfaces**: Actor, EventsFeedResponse

---

### EventsFeedResponse

API response for event pagination requests.

```typescript
interface EventsFeedResponse {
  /**
   * Investigation ID that was requested
   */
  investigation_id: string;

  /**
   * List of events in this batch
   * May be empty if investigation has no events
   */
  events: InvestigationEvent[];

  /**
   * Cursor for fetching next batch
   * Pass as ?cursor={next_cursor} to API
   * Null if no more events available
   */
  next_cursor: string | null;

  /**
   * Whether more events exist after next_cursor
   * False if next_cursor is null
   */
  has_more: boolean;

  /**
   * Number of events in this response
   * Will be <= requested limit
   */
  count: number;

  /**
   * Total events available for investigation (if known)
   * May be null if exact count is expensive
   */
  total_count?: number;
}

// Usage
async function fetchEvents(investigationId: string, cursor?: string) {
  const url = `/api/v1/investigations/${investigationId}/events`;
  const params = new URLSearchParams();
  if (cursor) params.append('cursor', cursor);

  const response: EventsFeedResponse = await fetch(`${url}?${params}`).then(r => r.json());

  // Process events
  response.events.forEach(event => {
    console.log(`Event: ${event.type}`);
  });

  // Fetch next page if available
  if (response.has_more) {
    const nextPage = await fetchEvents(investigationId, response.next_cursor!);
  }
}
```

**Related Interfaces**: InvestigationEvent

---

### SummaryResponse

Investigation summary with progress metrics.

```typescript
interface SummaryResponse {
  /**
   * Investigation identifier
   */
  investigation_id: string;

  /**
   * Current investigation status
   */
  status: 'pending' | 'initializing' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

  /**
   * Completion percentage (0-100)
   */
  progress: number;

  /**
   * Current execution phase
   * Examples: 'data_collection', 'analysis', 'verification'
   */
  current_phase?: string;

  /**
   * Total number of events generated
   */
  event_count: number;

  /**
   * Number of anomalies detected
   */
  anomalies_found: number;

  /**
   * Number of relationships discovered
   */
  relationships_found: number;

  /**
   * When investigation started
   */
  started_at: string;

  /**
   * When investigation last updated
   */
  updated_at: string;

  /**
   * When investigation completed
   * null if still running
   */
  completed_at: string | null;
}
```

---

## Hook Return Types

### useInvestigationSnapshot

Result from `useInvestigationSnapshot` hook.

```typescript
interface UseInvestigationSnapshotResult {
  /**
   * Loading state
   * True while fetching snapshot
   */
  loading: boolean;

  /**
   * Snapshot data
   * null while loading or on error
   */
  snapshot: InvestigationSnapshot | null;

  /**
   * Error if fetch failed
   * null on success or while loading
   */
  error: Error | null;

  /**
   * Manually refetch snapshot
   * Useful for refresh buttons
   */
  refetch: () => Promise<void>;
}

interface InvestigationSnapshot {
  id: string;
  status: InvestigationStatus;
  progress: number;  // 0-100
  version: number;
  updatedAt: string;
}

type InvestigationStatus = 'pending' | 'initializing' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

// Usage
const { loading, snapshot, error, refetch } = useInvestigationSnapshot(investigationId);
```

---

### useCursorStorage

Result from `useCursorStorage` hook.

```typescript
interface UseCursorStorageResult {
  /**
   * Saved cursor from localStorage
   * null if no cursor saved or localStorage unavailable
   */
  cursor: string | null;

  /**
   * Save cursor to localStorage
   * Safe to call even if localStorage unavailable
   */
  saveCursor: (newCursor: string) => void;

  /**
   * Clear cursor from localStorage
   * Safe to call even if localStorage unavailable
   */
  clearCursor: () => void;
}

// Usage
const { cursor, saveCursor, clearCursor } = useCursorStorage(investigationId);
```

---

### useEventFetch

Result from `useEventFetch` hook.

```typescript
interface UseEventFetchResult {
  /**
   * Fetched events
   * Empty array if no events yet
   */
  events: InvestigationEvent[];

  /**
   * Loading state
   * True while fetching
   */
  loading: boolean;

  /**
   * Error if fetch failed
   */
  error: Error | null;

  /**
   * Whether more events available
   * False if at end of stream
   */
  hasMore: boolean;

  /**
   * Fetch more events
   * Pass next cursor to continue pagination
   */
  fetchMore: (nextCursor: string) => Promise<void>;
}

// Usage
const { events, hasMore, fetchMore, error } = useEventFetch(investigationId, cursor);
```

---

### useProgressData

Result from `useProgressData` hook.

```typescript
interface UseProgressDataResult {
  /**
   * Progress data
   * null while loading or on error
   */
  data: ProgressData | null;

  /**
   * Loading state
   */
  loading: boolean;

  /**
   * Error if fetch failed
   */
  error: Error | null;

  /**
   * Manually refetch progress
   */
  refetch: () => Promise<void>;
}

interface ProgressData {
  investigation_id: string;
  status: InvestigationStatus;
  progress: number;  // 0-100
  current_phase: string;
  phase_progress: Record<string, number>;  // phase -> progress%
  tools: ToolExecution[];
  created_at: string;
  updated_at: string;
}

interface ToolExecution {
  name: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;  // 0-100
  started_at?: string;
  completed_at?: string;
  result?: Record<string, unknown>;
  error?: string;
}

// Usage
const { data, loading, error } = useProgressData(investigationId, {
  enablePolling: true,
  enableETag: true
});
```

---

### useAdaptivePolling

Result from `useAdaptivePolling` hook.

```typescript
interface UseAdaptivePollingResult {
  /**
   * Currently polling
   */
  isPolling: boolean;

  /**
   * Current polling interval in ms
   * Updates based on investigation status
   */
  interval: number;

  /**
   * Pause polling
   */
  pause: () => void;

  /**
   * Resume polling
   */
  resume: () => void;
}

interface UseAdaptivePollingParams {
  investigationId: string | undefined;
  status: InvestigationStatus;
  lifecycleStage?: LifecycleStage;
  callback: () => void | Promise<void>;
  enabled?: boolean;
}

type LifecycleStage = 'draft' | 'submitted' | 'in_progress' | 'completed' | 'failed';

// Usage
const { isPolling, interval, pause, resume } = useAdaptivePolling({
  investigationId,
  status,
  callback: async () => {
    const data = await fetchProgressData(investigationId);
  }
});
```

---

### useEventDeduplication

Result from `useEventDeduplication` hook.

```typescript
interface UseEventDeduplicationResult {
  /**
   * Deduplicated events
   * Duplicates removed by ID
   */
  deduplicated: InvestigationEvent[];

  /**
   * Number of duplicates removed
   */
  duplicateCount: number;

  /**
   * Set of seen event IDs
   * For manual dedup checking
   */
  seen: Set<string>;
}

// Usage
const { deduplicated, duplicateCount } = useEventDeduplication(events);
```

---

### useOptimisticUpdate

Generic result from `useOptimisticUpdate` hook.

```typescript
interface UseOptimisticUpdateResult<T> {
  /**
   * Current data (optimistically updated)
   */
  data: T;

  /**
   * Apply optimistic update
   * Returns promise that resolves when synced
   */
  apply: (changes: Partial<T>) => Promise<void>;

  /**
   * Error if sync failed
   */
  error: Error | null;

  /**
   * Sync pending
   * True while request in flight
   */
  isPending: boolean;
}

// Usage
const { data, apply, error, isPending } = useOptimisticUpdate(
  anomaly,
  async (updated) => {
    const response = await updateAnomalyAPI(updated);
    return response.data;
  }
);
```

---

### usePerformanceMonitoring

Result from `usePerformanceMonitoring` hook.

```typescript
interface UsePerformanceMonitoringResult {
  /**
   * Current performance metrics
   */
  metrics: PerformanceMetrics;

  /**
   * Mark start of operation
   */
  markStart: (label: string) => void;

  /**
   * Mark end of operation
   * Calculates duration
   */
  markEnd: (label: string) => void;

  /**
   * Record custom metric
   */
  recordMetric: (name: string, value: number) => void;
}

interface PerformanceMetrics {
  renderTime: number;        // milliseconds
  dataFetchTime: number;     // milliseconds
  updateTime: number;        // milliseconds
  customMetrics: Record<string, number>;
}

// Usage
const { metrics, markStart, markEnd } = usePerformanceMonitoring('Dashboard');

markStart('data-fetch');
const data = await fetchData();
markEnd('data-fetch');
```

---

### useBroadcastCoordination

Result from `useBroadcastCoordination` hook.

```typescript
interface UseBroadcastCoordinationResult {
  /**
   * Broadcast event to other tabs
   */
  broadcast: (event: CoordinatedEvent) => void;

  /**
   * Whether coordination is enabled
   * False if BroadcastChannel unavailable
   */
  synchronized: boolean;
}

interface CoordinatedEvent {
  /**
   * Event type
   */
  type: string;

  /**
   * Event data
   */
  payload: Record<string, unknown>;

  /**
   * When event was created
   */
  timestamp: number;

  /**
   * Source of event
   */
  source: string;
}

// Usage
const { broadcast, synchronized } = useBroadcastCoordination(
  investigationId,
  (event) => {
    if (event.type === 'STATE_UPDATE') {
      setAppState(event.payload);
    }
  }
);
```

---

### useWebSocketFallback & useSSEPollingFallback

Results for real-time connection hooks.

```typescript
interface UseWebSocketFallbackResult {
  /**
   * Connected to server
   */
  connected: boolean;

  /**
   * Currently using fallback polling
   * (WebSocket unavailable)
   */
  isUsingFallback: boolean;

  /**
   * Close connection
   */
  close: () => void;
}

interface UseSSEPollingFallbackResult {
  /**
   * Connected to server
   */
  connected: boolean;

  /**
   * Currently using polling fallback
   * (SSE unavailable)
   */
  isUsingPolling: boolean;

  /**
   * Close connection
   */
  close: () => void;
}

// Usage - WebSocket
const { connected, isUsingFallback } = useWebSocketFallback({
  url: `wss://${host}/ws/investigation/${investigationId}`,
  onMessage: (data) => updateProgress(data)
});

// Usage - SSE
const { connected, isUsingPolling } = useSSEPollingFallback({
  url: `/api/v1/investigations/${investigationId}/logs/stream`,
  onMessage: (logEntry) => addLog(logEntry)
});
```

---

### useRateLimitBackoff

Result from `useRateLimitBackoff` hook.

```typescript
interface UseRateLimitBackoffResult {
  /**
   * Retry function with exponential backoff
   */
  retry: <T>(fn: () => Promise<T>) => Promise<T>;

  /**
   * Currently backing off
   */
  isBackingOff: boolean;

  /**
   * Milliseconds until next retry
   */
  nextRetryIn: number;
}

// Usage
const { retry, isBackingOff, nextRetryIn } = useRateLimitBackoff({
  maxRetries: 3,
  baseDelayMs: 1000
});

const data = await retry(() => fetch('/api/data'));
```

---

## Supporting Interfaces

### Error Boundary State

```typescript
interface ErrorBoundaryState {
  /**
   * Error that occurred
   */
  error: Error | null;

  /**
   * Error message for display
   */
  message: string;

  /**
   * Can retry operation
   */
  canRetry: boolean;

  /**
   * Reset error state
   */
  reset: () => void;
}
```

---

### Skeleton Loader Props

```typescript
interface SkeletonLoaderProps {
  /**
   * Width of skeleton
   * CSS values: '100%', '200px', etc.
   */
  width?: string;

  /**
   * Height of skeleton
   */
  height?: string;

  /**
   * Number of lines
   */
  lines?: number;

  /**
   * Animation style
   * 'pulse', 'shimmer', or 'wave'
   */
  animation?: 'pulse' | 'shimmer' | 'wave';

  /**
   * CSS class for styling
   */
  className?: string;
}
```

---

## Type Guards

Helper functions for runtime type checking.

```typescript
/**
 * Check if event is anomaly event
 */
function isAnomalyEvent(event: InvestigationEvent): boolean {
  return event.entity_type === 'anomaly';
}

/**
 * Check if investigation is completed
 */
function isInvestigationComplete(snapshot: InvestigationSnapshot): boolean {
  return snapshot.status === 'completed' || snapshot.status === 'failed';
}

/**
 * Check if progress data is available
 */
function isProgressDataValid(data: ProgressData | null): data is ProgressData {
  return data !== null && typeof data === 'object';
}

// Usage
if (isAnomalyEvent(event)) {
  const anomalyId = event.data.anomaly_id;
}
```

---

## Event Type Examples

### Anomaly Events

```typescript
// Anomaly detected
const anomalyEvent: InvestigationEvent = {
  entity_type: 'anomaly',
  operation: 'append',
  data: {
    anomaly_id: 'anom-123',
    risk_score: 85,
    type: 'transaction_pattern'
  }
};

// Anomaly risk updated
const anomalyUpdate: InvestigationEvent = {
  entity_type: 'anomaly',
  operation: 'update',
  data: {
    anomaly_id: 'anom-123',
    risk_score: 92
  }
};
```

### Tool Execution Events

```typescript
// Tool started
const toolStart: InvestigationEvent = {
  entity_type: 'tool_execution',
  operation: 'append',
  data: {
    tool: 'device_fingerprint',
    status: 'running'
  }
};

// Tool completed
const toolComplete: InvestigationEvent = {
  entity_type: 'tool_execution',
  operation: 'update',
  data: {
    tool: 'device_fingerprint',
    status: 'completed',
    result: { fingerprint: 'abc123', confidence: 0.95 }
  }
};
```

### Phase Events

```typescript
// Phase started
const phaseStart: InvestigationEvent = {
  entity_type: 'phase',
  operation: 'append',
  data: {
    phase: 'analysis',
    status: 'running'
  }
};
```

---

## Usage Examples

### Complete Page Load Flow

```typescript
function ProgressPage() {
  const { investigationId } = useParams<{ investigationId: string }>();

  // 1. Load snapshot
  const { snapshot, loading: snapshotLoading } = useInvestigationSnapshot(investigationId);

  // 2. Restore cursor
  const { cursor, saveCursor } = useCursorStorage(investigationId);

  // 3. Fetch events
  const { events, hasMore, fetchMore } = useEventFetch(investigationId, cursor);

  // 4. Apply events
  const baseState = { anomalies: [], relationships: [] };
  const { state: uiState } = useEventApplication(events, baseState);

  // 5. Fetch progress
  const { data: progressData, loading: progressLoading } = useProgressData(investigationId);

  if (snapshotLoading || progressLoading) return <Skeleton />;

  return (
    <div>
      <progress value={progressData?.progress || 0} />
      <AnomalyList anomalies={uiState.anomalies} />
      {hasMore && <button onClick={() => fetchMore(events[events.length - 1].id)}>Load More</button>}
    </div>
  );
}
```

---

## Related Documentation

- **Backend Services**: [../../olorin-server/docs/services/SERVICE_INDEX.md](../../olorin-server/docs/services/SERVICE_INDEX.md)
- **Frontend Hooks**: [../README.md#investigation-state-management-hooks](../README.md#investigation-state-management-hooks)
- **Specification**: [../../specs/001-investigation-state-management/spec.md](../../specs/001-investigation-state-management/spec.md)

---
