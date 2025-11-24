# Phase 1: Technical Design - Data Models & API Contracts

**Branch**: `001-robust-e2e-testing` | **Date**: 2025-11-04 | **Phase**: Technical Design

## Project Structure & Technical Context

### Language/Version
- **Frontend**: TypeScript 5.x, React 18.x
- **Testing Framework**: Playwright 1.40+
- **Node.js**: 18+ (LTS)

### Primary Dependencies
- `@playwright/test` - E2E testing framework
- `zod` - Schema validation (already in codebase)
- Custom utility modules (e2e/utils)

### Testing Framework
- **Runner**: Playwright Test (npx playwright test)
- **Assertion Library**: Playwright's built-in expect + custom assertion helpers
- **Configuration**: `playwright.config.ts` with 11 projects (chromium, firefox, webkit, mobile, performance, accessibility)

### Target Platforms
- Desktop: Chrome, Firefox, Safari
- Mobile: iPhone 12, Pixel 5
- Tablet: iPad Pro

### Performance Goals
- Investigation completion: ≤120 seconds (configurable via TIME_BUDGET_MS)
- Progress polling: ≤1000ms response time (configurable)
- Event polling: ≤2000ms response time
- UI update latency: ≤2 seconds from event to UI

### Constraints
- No mocks/stubs (real API integration only)
- All environment-dependent values from config
- Configuration validation with fail-fast
- Graceful test skipping if optional APIs unavailable
- Maximum test-specific timeout: 5 minutes (Playwright global)

### Scale/Scope
- **Test Suite Size**: 7 primary test files + utilities
- **Coverage Target**: 50+ assertions across all user stories
- **Investigation Scenarios**: Single-entity, multi-entity, with/without templates
- **Parallel Execution**: Configurable (CI: 1 worker, Local: unlimited)

---

## Data Models & Schemas

### 1. Test Configuration Schema

**Purpose**: Validate all environment-dependent configuration at test startup

**TypeScript Type**:
```typescript
interface PlaywrightTestConfig {
  // URLs
  baseUrl: string;              // Frontend base URL (http://localhost:3000)
  backendBaseUrl: string;       // Backend API URL (http://localhost:8090)

  // Timeouts (in milliseconds)
  pageLoadTimeoutMs: number;           // Page load wait (default: 2000ms)
  elementVisibilityTimeoutMs: number;  // Element visibility (default: 5000ms)
  investigationCompletionTimeoutMs: number; // Investigation lifecycle (default: 120000ms)
  progressPollIntervalMs: number;      // Progress polling interval (default: 1000ms)
  eventsPollIntervalMs: number;        // Events polling interval (default: 1000ms)

  // Feature Flags
  enableVerboseLogging: boolean;       // Debug logging (default: false)
  enableMobileTests: boolean;          // Mobile test execution (default: false)
  skipServerLogAssertions: boolean;    // Skip log assertions if unavailable (default: false)

  // Retry & Backoff
  maxRetries: number;                  // Max API retry attempts (default: 3)
  backoffBaseMs: number;               // Initial backoff delay (default: 100ms)
  backoffMaxMs: number;                // Maximum backoff delay (default: 10000ms)

  // Log Fetching
  logFetchMethod: 'http' | 'shell' | 'both';  // Log fetch strategy (default: 'both')
  logFetchCmd?: string;                       // Shell command for logs (optional)

  // Debug & Reporting
  maxButtonsToDebug: number;           // Buttons to log during debugging (default: 10)
  maxFindingsToLog: number;            // Findings to log (default: 5)
  maxTextTruncateLength: number;       // Character truncation for logs (default: 100)
}
```

**Zod Schema**:
```typescript
import { z } from 'zod';

export const PlaywrightTestConfigSchema = z.object({
  baseUrl: z.string().url('Invalid frontend URL'),
  backendBaseUrl: z.string().url('Invalid backend URL'),

  pageLoadTimeoutMs: z.number().int().positive(),
  elementVisibilityTimeoutMs: z.number().int().positive(),
  investigationCompletionTimeoutMs: z.number().int().positive(),
  progressPollIntervalMs: z.number().int().positive(),
  eventsPollIntervalMs: z.number().int().positive(),

  enableVerboseLogging: z.boolean(),
  enableMobileTests: z.boolean(),
  skipServerLogAssertions: z.boolean(),

  maxRetries: z.number().int().nonnegative(),
  backoffBaseMs: z.number().int().positive(),
  backoffMaxMs: z.number().int().positive(),

  logFetchMethod: z.enum(['http', 'shell', 'both']),
  logFetchCmd: z.string().optional(),

  maxButtonsToDebug: z.number().int().positive(),
  maxFindingsToLog: z.number().int().positive(),
  maxTextTruncateLength: z.number().int().positive(),
});

export type PlaywrightTestConfig = z.infer<typeof PlaywrightTestConfigSchema>;
```

**Environment Variable Mapping**:
```env
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
PLAYWRIGHT_BACKEND_BASE_URL=http://localhost:8090
PLAYWRIGHT_ENABLE_VERBOSE_LOGGING=false
PLAYWRIGHT_ENABLE_MOBILE_TESTS=false
PLAYWRIGHT_INVESTIGATION_COMPLETION_TIMEOUT_MS=120000
PLAYWRIGHT_PROGRESS_POLL_INTERVAL_MS=1000
PLAYWRIGHT_EVENTS_POLL_INTERVAL_MS=1000
PLAYWRIGHT_MAX_RETRIES=3
PLAYWRIGHT_BACKOFF_BASE_MS=100
PLAYWRIGHT_BACKOFF_MAX_MS=10000
PLAYWRIGHT_LOG_FETCH_METHOD=both
PLAYWRIGHT_LOG_FETCH_CMD=docker logs olorin-server  # optional
PLAYWRIGHT_SKIP_SERVER_LOG_ASSERTIONS=false
```

---

### 2. Investigation Lifecycle Models

**Progress API Response**:
```typescript
interface ProgressData {
  // Investigation Identity
  investigation_id: string;          // UUID identifying the investigation

  // Status Fields
  status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  lifecycle_stage: 'created' | 'in_progress' | 'completed';

  // Progress Metrics
  completion_percent: number;        // 0-100, monotonically increasing
  completed_tools: number;           // Count of completed tools
  total_tools: number;               // Total tools to execute
  failed_tools: number;              // Count of failed tools

  // Current Phase
  current_phase: string;             // e.g., "tool_execution", "llm_analysis"
  phase_duration_ms?: number;        // Time spent in current phase

  // Risk Metrics
  risk_metrics: {
    overall: number;                 // 0-100 risk score
    confidence: number;              // 0-100 confidence in score
  };

  // Temporal
  updated_at: string;                // ISO 8601 timestamp
  started_at?: string;               // ISO 8601 timestamp
  completed_at?: string;             // ISO 8601 timestamp

  // Error Information (if failed)
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

**Event Stream API Response**:
```typescript
interface EventsResponse {
  // Event Items
  items: EventData[];                // Array of events

  // Pagination
  next_cursor?: string | null;       // Cursor for next page (null if no more)
  has_more: boolean;                 // True if more events available

  // Polling Guidance
  poll_after_seconds: number;        // Recommended poll interval
  server_time: string;               // ISO 8601 server timestamp
}

interface EventData {
  // Event Identity
  event_id: string;                  // Unique event UUID
  investigation_id: string;          // Parent investigation UUID

  // Ordering
  timestamp: string;                 // ISO 8601 (strict ordering key #1)
  sequence: number;                  // Monotonic counter (strict ordering key #2)

  // Content
  type: string;                      // Event type (e.g., "investigation_created", "tool_execution:started")
  op: string;                        // Operation (alternative naming)

  // Actor
  actor: {
    type: 'SYSTEM' | 'USER' | 'AGENT';
    id?: string;
    name?: string;
  };

  // Event Payload (type-dependent)
  payload: {
    // For lifecycle events
    new_lifecycle_stage?: string;
    old_lifecycle_stage?: string;

    // For tool execution
    tool_name?: string;
    tool_status?: 'STARTED' | 'COMPLETED' | 'FAILED';
    execution_time_ms?: number;

    // For LLM calls
    model?: string;
    tokens_in?: number;
    tokens_out?: number;
    latency_ms?: number;

    // Generic data
    [key: string]: unknown;
  };

  // Metadata
  correlation_id?: string;           // Trace ID for distributed tracing
  tags?: Record<string, string>;     // Custom metadata
}
```

**Investigation Snapshot (Results)**:
```typescript
interface InvestigationSnapshot {
  // Identity
  investigation_id: string;          // UUID

  // Metadata
  created_at: string;                // ISO 8601
  completed_at: string;              // ISO 8601
  total_execution_time_ms: number;   // Milliseconds

  // Status
  lifecycle_stage: 'completed' | 'failed';
  status: 'COMPLETED' | 'FAILED';

  // Risk Assessment (Final)
  final_risk_score: number;          // 0-100
  risk_metrics: {
    overall: number;
    confidence: number;
    breakdown?: {
      device_risk?: number;
      location_risk?: number;
      network_risk?: number;
      behavioral_risk?: number;
    };
  };

  // Results
  findings: Array<{
    id: string;
    category: string;                // e.g., "device_anomaly", "location_mismatch"
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    evidence?: unknown;
    recommendations?: string[];
  }>;

  // Tool Results
  tool_results: Array<{
    tool_name: string;
    status: 'SUCCESS' | 'FAILED';
    execution_time_ms: number;
    error?: string;
    output?: unknown;
  }>;

  // Versioning
  version: number;                   // Monotonic version counter
  etag?: string;                     // Cache validation token (if supported)
  last_modified?: string;            // ISO 8601 (if supported)
}
```

**Snapshot Response Headers** (for caching):
```typescript
interface SnapshotHeaders {
  'Content-Type': 'application/json';
  'Version': string;                 // Numeric version
  'Last-Modified'?: string;          // RFC 2822 timestamp
  'ETag'?: string;                   // Weak or strong ETag
  'Cache-Control': 'no-cache';       // Validation required
}
```

---

### 3. Server Logs Model

**Logs API Response** (via `GET /admin/logs` or `GET /investigations/{id}/logs`):
```typescript
interface InvestigationLogs {
  investigation_id: string;
  logs: LogEntry[];
  format: 'json' | 'jsonl' | 'text';
}

interface LogEntry {
  // Temporal
  timestamp: string;                 // ISO 8601 (ordering key #1)
  sequence: number;                  // Monotonic (ordering key #2)

  // Identity
  investigation_id: string;          // Parent investigation
  log_id: string;                    // Unique log entry ID

  // Classification
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  event_type: string;                // e.g., "investigation_created", "agent:tool_execution"
  component: string;                 // e.g., "InvestigationService", "DeviceAnalysisAgent"

  // Content
  message: string;                   // Human-readable message

  // Structured Context
  context: {
    agent_name?: string;             // If agent-related
    tool_name?: string;              // If tool execution
    model?: string;                  // If LLM-related
    phase?: string;                  // Investigation phase
    duration_ms?: number;            // Operation duration
    error?: {
      code: string;
      message: string;
      stack?: string;
    };
  };

  // Tracing
  trace_id?: string;                 // Distributed tracing ID
  parent_span_id?: string;           // Parent span reference

  // Raw Data (context-specific)
  data?: Record<string, unknown>;
}
```

**Expected Log Sequence** (Complete Investigation Lifecycle):
```
1. investigation_created     - Investigation initialized
2. agents_initialized        - Agent system started
3. tools_configured          - Tools registered
4. agent:started             - Agent execution started
5. agent:tool_execution      - Tool invoked by agent
6. tool_execution:completed  - Tool returned results
7. agent:llm_call            - LLM API called
8. agent:llm_response        - LLM response received
9. agent:completed           - Agent execution finished
10. snapshot_persisted       - Results saved
11. investigation_completed  - Lifecycle terminal state
```

---

### 4. Test Assertion Models

**Assertion Result Structure**:
```typescript
interface AssertionResult {
  passed: boolean;                   // Overall test status
  violations: AssertionViolation[];  // List of failures
  details?: Record<string, unknown>; // Additional context
  timestamp: string;                 // ISO 8601
}

interface AssertionViolation {
  type: string;                      // e.g., "monotonicity_violation", "ordering_violation"
  description: string;               // Human-readable explanation
  evidence: {
    expected: unknown;               // Expected value/pattern
    actual: unknown;                 // Actual value/pattern
    context?: unknown;               // Additional context
  };
  severity: 'WARN' | 'ERROR';        // Warning or failure
}
```

**Monotonicity Validation**:
```typescript
interface MonotonicityCheck {
  violations: Array<{
    index: number;                   // Position in sequence
    previousValue: number;           // Previous value
    currentValue: number;            // Current value (decreased!)
    gap: number;                     // Regression amount
  }>;
}
```

**Event Ordering Validation**:
```typescript
interface EventOrderingCheck {
  violations: Array<{
    eventIndex: number;              // Position in event list
    eventId: string;
    previousEvent: { timestamp: string; sequence: number };
    currentEvent: { timestamp: string; sequence: number };
    violation: 'timestamp_not_increasing' | 'sequence_not_increasing' | 'out_of_order';
  }>;
}
```

**Log Sequence Validation**:
```typescript
interface LogSequenceCheck {
  violations: Array<{
    logIndex: number;
    eventType: string;
    expectedOrder: number;
    actualOrder: number;
    missingEvents: string[];
  }>;
  eventCounts: {
    expected: Record<string, number>;
    actual: Record<string, number>;
  };
}
```

---

## API Contracts & HTTP Specifications

### 1. Investigation Wizard Form Submission

**User Story 1: Execute Full Investigation Lifecycle**

**HTTP Request**:
```http
POST /api/investigations/create
Content-Type: application/json

{
  "settings": {
    "name": "Test Investigation",
    "description": "E2E test investigation"
  },
  "entities": [
    {
      "type": "email",
      "value": "test@example.com"
    }
  ],
  "timeRange": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-01-02T00:00:00Z"
  },
  "tools": [
    {
      "tool_name": "device_analysis",
      "enabled": true
    }
  ],
  "settings": {
    "correlationMode": "OR",
    "executionMode": "PARALLEL",
    "riskThreshold": 50
  }
}
```

**Expected Response** (201 Created):
```json
{
  "investigation_id": "inv_abc123def456",
  "status": "CREATED",
  "created_at": "2025-11-04T10:00:00Z"
}
```

**Alternative Response** (Redirect):
```http
HTTP/1.1 302 Found
Location: /investigation/progress?id=inv_abc123def456
```

---

### 2. Progress Polling

**User Story 3: Verify Progress API Returns Monotonic State**

**HTTP Request**:
```http
GET /api/investigations/{investigation_id}/progress
Accept: application/json
```

**Response** (200 OK):
```json
{
  "investigation_id": "inv_abc123def456",
  "status": "IN_PROGRESS",
  "lifecycle_stage": "in_progress",
  "completion_percent": 45,
  "completed_tools": 2,
  "total_tools": 5,
  "failed_tools": 0,
  "current_phase": "tool_execution",
  "risk_metrics": {
    "overall": 35,
    "confidence": 65
  },
  "updated_at": "2025-11-04T10:00:30Z"
}
```

**Polling Strategy** (for test):
- Initial: Immediate
- Interval: 1000ms (configurable)
- Max Duration: 120000ms (configurable)
- Success Condition: `lifecycle_stage === 'completed'`

**Monotonicity Requirements**:
- `completion_percent` must never decrease
- `completed_tools` must never decrease
- `failed_tools` must never decrease
- Timestamps must never go backwards

---

### 3. Event Stream Polling

**User Story 4: Verify Events API Returns Append-Only Feed**

**HTTP Request** (First Call):
```http
GET /api/investigations/{investigation_id}/events?since=0&limit=50
Accept: application/json
```

**HTTP Request** (Subsequent Calls):
```http
GET /api/investigations/{investigation_id}/events?since={next_cursor}&limit=50
Accept: application/json
```

**Response** (200 OK):
```json
{
  "items": [
    {
      "event_id": "evt_001",
      "investigation_id": "inv_abc123def456",
      "timestamp": "2025-11-04T10:00:00.000Z",
      "sequence": 1,
      "type": "investigation_created",
      "op": "investigation:created",
      "actor": {
        "type": "USER",
        "id": "user_123"
      },
      "payload": {
        "new_lifecycle_stage": "created"
      }
    },
    {
      "event_id": "evt_002",
      "investigation_id": "inv_abc123def456",
      "timestamp": "2025-11-04T10:00:01.000Z",
      "sequence": 2,
      "type": "agents_initialized",
      "op": "agents:initialized",
      "actor": {
        "type": "SYSTEM"
      },
      "payload": {
        "agent_count": 4
      }
    }
  ],
  "next_cursor": "evt_002",
  "has_more": true,
  "poll_after_seconds": 2,
  "server_time": "2025-11-04T10:00:05.000Z"
}
```

**Append-Only Guarantee**:
- All `event_id` values must be unique across responses
- No event should appear in earlier responses but disappear later
- Event order must be strictly increasing by `(timestamp, sequence)`
- `next_cursor` should advance monotonically

---

### 4. Snapshot Versioning

**User Story 5: Verify Snapshot Versioning and Updates**

**HTTP Request**:
```http
GET /api/investigations/{investigation_id}
Accept: application/json
```

**Response** (200 OK, with versioning headers):
```http
HTTP/1.1 200 OK
Content-Type: application/json
Version: 5
Last-Modified: Mon, 04 Nov 2025 10:00:30 GMT
ETag: "abc123def456"

{
  "investigation_id": "inv_abc123def456",
  "lifecycle_stage": "completed",
  "final_risk_score": 72,
  "findings": [...],
  "version": 5,
  "etag": "abc123def456",
  "last_modified": "2025-11-04T10:00:30Z"
}
```

**Conditional Request** (If-None-Match):
```http
GET /api/investigations/{investigation_id}
If-None-Match: "abc123def456"
```

**Response** (304 Not Modified - No Changes):
```http
HTTP/1.1 304 Not Modified
Version: 5
ETag: "abc123def456"
```

**Versioning Contracts**:
- `version` field must increase with each change
- `Last-Modified` must not go backwards
- `ETag` must change when content changes
- 304 response only if ETag/version matches AND no new events

---

### 5. Server Logs Retrieval

**User Story 2: Validate Server-Side Lifecycle Logging**

**HTTP Endpoint** (Primary):
```http
GET /api/investigations/{investigation_id}/logs?format=json
Accept: application/json
```

**HTTP Endpoint** (Alternative):
```http
GET /admin/logs?investigationId={investigation_id}&format=json
Accept: application/json
```

**Response** (200 OK):
```json
{
  "investigation_id": "inv_abc123def456",
  "logs": [
    {
      "timestamp": "2025-11-04T10:00:00.000Z",
      "sequence": 1,
      "investigation_id": "inv_abc123def456",
      "level": "INFO",
      "event_type": "investigation_created",
      "component": "InvestigationService",
      "message": "Investigation created successfully",
      "context": {
        "phase": "initialization"
      }
    }
  ],
  "format": "json"
}
```

**Shell Command Fallback** (if HTTP unavailable):
```bash
LOG_FETCH_CMD="docker logs olorin-server | grep inv_abc123def456"
```

**Log Sequence Requirements**:
- Events must appear in canonical order (per spec)
- Timestamps must be monotonic (never backwards)
- Sequence numbers must be unique and increasing
- All expected event types must be present

---

## UI Element Identification

### Selectors for Investigation Wizard

**Primary Selectors**:
```typescript
{
  startButton: 'button:has-text("Start Investigation")',
  progressBar: '[data-testid="investigation-progress"]',
  progressPercent: '[data-testid="progress-percent"]',
  lifecycleStage: '[data-testid="lifecycle-stage"]',
  activityLog: '[data-testid="activity-log"]',
  toolStatusList: '[data-testid="tool-execution-status"]',
  riskScore: '[data-testid="risk-score"]',
  riskGauge: '[data-testid="risk-gauge"]',
  findingsList: '[data-testid="findings-list"]'
}
```

**Fallback Selectors** (Semantic):
```typescript
{
  startButton: 'button:has-text("Start")',  // Less specific
  progressBar: '[role="progressbar"]',
  lifecycleStage: 'text=/created|progress|completed/i',
  activityLog: '[role="region"]',  // Live region
  toolStatusList: 'ul:has-text("Tool")',
  riskScore: 'text=/risk|score/i'
}
```

---

## Configuration Defaults

**Environment-Based Defaults**:

```env
# Local Development
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
PLAYWRIGHT_BACKEND_BASE_URL=http://localhost:8090
PLAYWRIGHT_INVESTIGATION_COMPLETION_TIMEOUT_MS=120000
PLAYWRIGHT_PROGRESS_POLL_INTERVAL_MS=1000
PLAYWRIGHT_ENABLE_VERBOSE_LOGGING=true
PLAYWRIGHT_MAX_RETRIES=3

# CI/CD
PLAYWRIGHT_TEST_BASE_URL=https://staging.app.example.com
PLAYWRIGHT_BACKEND_BASE_URL=https://api.staging.example.com
PLAYWRIGHT_INVESTIGATION_COMPLETION_TIMEOUT_MS=180000
PLAYWRIGHT_PROGRESS_POLL_INTERVAL_MS=2000
PLAYWRIGHT_ENABLE_VERBOSE_LOGGING=false
PLAYWRIGHT_MAX_RETRIES=5

# Production Validation
PLAYWRIGHT_TEST_BASE_URL=https://app.example.com
PLAYWRIGHT_BACKEND_BASE_URL=https://api.example.com
PLAYWRIGHT_INVESTIGATION_COMPLETION_TIMEOUT_MS=300000
PLAYWRIGHT_PROGRESS_POLL_INTERVAL_MS=5000
PLAYWRIGHT_ENABLE_VERBOSE_LOGGING=false
PLAYWRIGHT_MAX_RETRIES=7
```

---

## Summary

**Data Models Defined**: ✅
- Configuration schema with Zod validation
- Progress data model
- Event stream model
- Snapshot versioning model
- Server logs model
- Assertion result models

**API Contracts Specified**: ✅
- 5 critical HTTP contracts
- Request/response examples
- Header specifications
- Polling strategies
- Error handling patterns

**Quality Gates Passed**: ✅
- All models have TypeScript types
- Configuration has Zod validation
- API contracts include HTTP specifications
- Selectors documented (primary + fallback)
- No hardcoded values (all config-driven)

**Readiness for Phase 2**: ✅ Yes
