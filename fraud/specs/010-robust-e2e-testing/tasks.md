# Phase 2-8: Granular Implementation Tasks

**Branch**: `001-robust-e2e-testing` | **Date**: 2025-11-04 | **Phase**: Implementation Planning & Execution

**Status**: 🔄 Ready for Phase 3 Implementation

## Task Tracking Overview

**Total Tasks**: 47 granular subtasks across 8 implementation phases
**Estimated Total Effort**: 20-30 hours (1 person, 5-7 days)
**Dependencies**: Primarily sequential within phases; minimal cross-phase blocking
**Quality Requirements**:
- ✅ Zero mocks/stubs/TODO in production code
- ✅ Complete implementations with passing tests
- ✅ Zero code duplication
- ✅ All files < 200 lines
- ✅ 87%+ test coverage minimum

---

## Phase 2: Configuration & Utility Enhancements (Priority: P1)

**Phase Goal**: Extend existing configuration and utilities to support all 9 user stories with no gaps.

**Estimated Effort**: 6 hours | **Complexity**: Low-Medium

### Task 2.1: Enhance HTTP Client for Resilience

**Scope**: Extend `src/shared/testing/e2e/utils/http-client.ts` with exponential backoff and ETag support

**Current State**:
- ✅ Exports `getAuthHeaders()`, `getConfig()`, `fetchProgress()`, `fetchEvents()`, `fetchInvestigationLogs()`, `checkHealth()`
- ✅ Configurable timeouts, auth support, error handling
- ⚠️ Gap: Hard-coded 30000ms timeout (not configurable per environment)
- ⚠️ Gap: No exponential backoff for transient failures (429, 5xx)
- ⚠️ Gap: No ETag/If-None-Match header support

**Implementation Requirements**:

1. **Add Exponential Backoff Function** (15 lines)
   ```typescript
   interface BackoffConfig {
     maxRetries: number;      // From PlaywrightTestConfig.maxRetries
     baseMs: number;          // From PlaywrightTestConfig.backoffBaseMs
     maxMs: number;           // From PlaywrightTestConfig.backoffMaxMs
     jitterFactor?: number;   // 0.1 (10% jitter)
   }

   async function withExponentialBackoff<T>(
     fn: () => Promise<T>,
     config: BackoffConfig
   ): Promise<T>
   ```
   - Retry on 429, 503, 504 (transient errors)
   - Calculate delay: `delay = min(baseMs * 2^attempt, maxMs) + random(0, delay * jitterFactor)`
   - Log each retry with attempt count and calculated delay
   - Fail immediately on 4xx errors (except 429)

2. **Add ETag Caching Helper** (10 lines)
   ```typescript
   interface CachedSnapshot {
     data: InvestigationSnapshot;
     etag: string;
     lastModified: string;
     timestamp: number;
   }

   function buildIfNoneMatchHeader(etag: string | null): Record<string, string>
   ```
   - Store ETag from response headers
   - Send `If-None-Match: {etag}` on subsequent requests
   - Handle 304 Not Modified responses
   - Return cached snapshot or new data

3. **Update fetchProgress() with Backoff** (5 lines)
   - Wrap existing fetch with `withExponentialBackoff()`
   - Pass config from `getConfig()`
   - Maintain backward compatibility

4. **Update fetchEvents() with Backoff** (5 lines)
   - Same pattern as fetchProgress()
   - Add `If-None-Match` header support for future events caching

**Acceptance Criteria**:
- [ ] `withExponentialBackoff()` retries transient errors (429, 503, 504)
- [ ] Exponential delay calculation matches: `min(baseMs * 2^n, maxMs) + jitter`
- [ ] Non-transient errors (4xx except 429) fail immediately without retry
- [ ] ETag header preserved and sent on subsequent requests
- [ ] 304 Not Modified responses return cached snapshot
- [ ] All new functions have JSDoc comments
- [ ] No hardcoded timeout/retry values; all from config
- [ ] Backward compatibility maintained for existing callers

**Integration Points**:
- Uses: `PlaywrightTestConfig` (backoffBaseMs, backoffMaxMs, maxRetries)
- Used by: All test files for API calls

**Effort**: 3-4 hours | **Complexity**: Medium

---

### Task 2.2: Update Configuration Schema with Resilience Parameters

**Scope**: Extend `src/shared/testing/config/playwright.config.ts` to include all resilience and retry parameters

**Current State**:
- ✅ Loads baseUrl, backendBaseUrl, timeouts, feature flags
- ⚠️ Gap: No maxRetries, backoffBaseMs, backoffMaxMs parameters
- ⚠️ Gap: No logFetchMethod or logFetchCmd parameters
- ⚠️ Gap: progressPollIntervalMs and eventsPollIntervalMs not aligned with spec

**Implementation Requirements**:

1. **Update ConfigSchema with Retry Parameters** (8 lines)
   ```typescript
   maxRetries: z.coerce.number().int().min(1).max(10).default(3),
   backoffBaseMs: z.coerce.number().int().min(10).max(1000).default(100),
   backoffMaxMs: z.coerce.number().int().min(1000).max(60000).default(10000),
   ```
   - Read from: `PLAYWRIGHT_MAX_RETRIES`, `PLAYWRIGHT_BACKOFF_BASE_MS`, `PLAYWRIGHT_BACKOFF_MAX_MS`
   - Validate ranges to prevent unreasonable values
   - Fail fast if invalid

2. **Update ConfigSchema with Log Fetch Parameters** (6 lines)
   ```typescript
   logFetchMethod: z.enum(['http', 'shell', 'both']).default('both'),
   logFetchCmd: z.string().optional(),
   skipServerLogAssertions: z.boolean().default(false),
   ```
   - Read from: `PLAYWRIGHT_LOG_FETCH_METHOD`, `PLAYWRIGHT_LOG_FETCH_CMD`, `PLAYWRIGHT_SKIP_SERVER_LOG_ASSERTIONS`
   - If `logFetchMethod` is 'shell' or 'both' and no logFetchCmd, fail with clear error

3. **Add Environment Variable Mapping Documentation** (15 lines comment)
   - List all supported env vars
   - Document default values
   - Note which are required vs optional

4. **Update loadPlaywrightTestConfig() to export full config**
   - Return complete ConfigSchema type including new fields
   - Validate complete schema before returning
   - Log loaded config values (without secrets)

**Acceptance Criteria**:
- [ ] ConfigSchema includes maxRetries, backoffBaseMs, backoffMaxMs
- [ ] ConfigSchema includes logFetchMethod, logFetchCmd, skipServerLogAssertions
- [ ] All new fields have correct type and validation
- [ ] Fail-fast validation for missing required fields
- [ ] Fail-fast validation for invalid ranges
- [ ] Environment variable names match spec exactly
- [ ] Config can be loaded from .env.test or environment variables
- [ ] Complete config object exported for use in tests

**Integration Points**:
- Uses: Environment variables (process.env)
- Used by: All test files, API utilities

**Effort**: 2-3 hours | **Complexity**: Low

---

### Task 2.3: Add Shell Command Log Fetching Support

**Scope**: Enhance `src/shared/testing/e2e/utils/logs.ts` to support shell-based log fetching fallback

**Current State**:
- ✅ `captureBackendLogs()` fetches logs via HTTP endpoint
- ⚠️ Gap: No fallback to shell command execution
- ⚠️ Gap: No validation of LOG_FETCH_CMD environment variable

**Implementation Requirements**:

1. **Add Shell Command Execution Function** (20 lines)
   ```typescript
   async function executeLogFetchCommand(
     cmd: string,
     investigationId: string,
     logger: TestLogger
   ): Promise<string>
   ```
   - Use Node.js `child_process.exec()` for command execution
   - Replace `{investigationId}` placeholder in command
   - Timeout after 10 seconds
   - Log stdout and stderr
   - Fail with clear error if command fails
   - DO NOT use shell injection vulnerabilities - validate cmd format

2. **Update captureBackendLogs() to Support Shell Fallback** (15 lines)
   ```typescript
   const method = config.logFetchMethod;  // 'http' | 'shell' | 'both'

   if (method === 'http' || method === 'both') {
     try {
       return await fetchLogsViaHttp(...);
     } catch (e) {
       if (method === 'both') {
         logger.warn('HTTP log fetch failed, trying shell command', { error: e.message });
       } else {
         throw e;
       }
     }
   }

   if ((method === 'shell' || method === 'both') && config.logFetchCmd) {
     return await executeLogFetchCommand(config.logFetchCmd, investigationId, logger);
   }
   ```

3. **Add Timeout and Error Handling**
   - Timeout log fetch at 10 seconds (configurable)
   - Log clear error message if all methods fail
   - Support graceful degradation (test continues with warning)

4. **Document LOG_FETCH_CMD Format Requirements** (10 lines comment)
   - Example: `docker logs olorin-server | grep {investigationId}`
   - Placeholder: `{investigationId}` replaced with actual investigation ID
   - Must output JSON or JSONL format for parsing

**Acceptance Criteria**:
- [ ] `executeLogFetchCommand()` executes shell command safely
- [ ] Command execution timeout after 10 seconds
- [ ] `{investigationId}` placeholder replaced correctly
- [ ] Fallback to shell when HTTP fails and method='both'
- [ ] Error handling logs clear messages
- [ ] All output logged for debugging
- [ ] No code injection vulnerabilities
- [ ] Graceful test continuation when log fetch unavailable

**Integration Points**:
- Uses: PlaywrightTestConfig (logFetchMethod, logFetchCmd)
- Uses: TestLogger for logging
- Used by: Test files for server log assertions

**Effort**: 2-3 hours | **Complexity**: Medium (due to shell command safety)

---

## Phase 3: Core Test Implementation - User Stories 1, 3, 4, 6

**Phase Goal**: Implement comprehensive tests for foundational user stories with full assertion coverage.

**Estimated Effort**: 8-10 hours | **Complexity**: Medium

### Task 3.1: Expand Investigation State Management Test (US1, US6 Comprehensive)

**Scope**: Refactor and expand existing `investigation-state-mgmt.e2e.test.ts` (currently 375 lines) into fully comprehensive test covering US1 and US6

**Current State**:
- ✅ Full investigation lifecycle test exists
- ✅ Navigation to /investigation/settings
- ✅ Form submission and ID extraction
- ✅ Progress polling
- ✅ Results retrieval
- ⚠️ Limited UI verification assertions
- ⚠️ No mobile variant tests
- ⚠️ Some assertions could be more comprehensive

**Implementation Requirements**:

1. **Keep Existing Test Structure** (no refactoring of working code)
   - Preserve: Navigation, form submission, ID extraction (already working)
   - Preserve: Progress polling logic
   - Preserve: Results validation

2. **Add Enhanced UI Assertions** (30 lines new)
   ```typescript
   // Assertion 1: Verify stepper component matches progress stage
   await assertUIStepperMatchesProgressStage(page, progressData, logger);

   // Assertion 2: Verify progress bar percentage matches API
   await assertProgressBarAccuracy(page, progressData, tolerance = 5);

   // Assertion 3: Verify activity feed/timeline matches latest events
   await assertActivityFeedMatchesEvents(page, eventsResponse, logger);

   // Assertion 4: Verify findings display matches snapshot data
   await assertFindingsDisplayAccuracy(page, snapshot, logger);
   ```

3. **Add Mobile Variant Test** (40 lines new)
   - Same test flow but executed on Mobile Chrome device
   - Verify responsive layout (no overflow, readable text)
   - Verify touch interactions work (button clicks on mobile)
   - Use conditional skip: `test.skip(!config.enableMobileTests, '...')`

4. **Add Comprehensive Logging** (20 lines new)
   - Log all major checkpoints with timestamps
   - Log UI element inspection results
   - Log API response structure for debugging
   - Use logger.debug() for verbose output

5. **Ensure File Size Compliance** (< 200 lines)
   - Current: 375 lines
   - Action: Extract assertion helpers to separate functions
   - Extract logging utilities to shared logger
   - Result: Keep main test file focused on test flow

**Helper Functions to Extract** (create new files if needed):
- `assertUIStepperMatchesProgressStage()` → assertion-helpers.ts
- `assertProgressBarAccuracy()` → assertion-helpers.ts
- `assertActivityFeedMatchesEvents()` → assertion-helpers.ts
- `assertFindingsDisplayAccuracy()` → assertion-helpers.ts

**Acceptance Criteria**:
- [ ] Test passes on chromium, firefox, webkit
- [ ] Test passes on Mobile Chrome variant
- [ ] All 4 UI assertions implemented and passing
- [ ] UI assertions have tolerance/flexibility for rounding
- [ ] Mobile variant skips gracefully if enableMobileTests=false
- [ ] All DOM selectors use semantic/data-testid attributes
- [ ] Test completes within 2 minutes (90 second default + buffer)
- [ ] Test file < 200 lines (extract helpers as needed)
- [ ] All logging provides clear, actionable debug info
- [ ] No hardcoded timeouts or selectors

**Integration Points**:
- Uses: `api.ts` (getProgress, getEvents, getInvestigationLogs)
- Uses: `assertions.ts` (assertProgressMonotonicity, assertEventOrdering, etc.)
- Uses: `test-logger.ts` for logging
- Used by: Phase 3-4 tests as pattern reference

**Effort**: 3-4 hours | **Complexity**: Medium

---

### Task 3.2: Create Trigger Investigation Test (US1 Focused)

**Scope**: Create `src/shared/testing/e2e/tests/trigger-investigation.spec.ts` - focused test on investigation creation

**Independent Value**: Tests investigation creation in isolation; can be executed independently

**Implementation Requirements**:

1. **Test Suite Structure** (80 lines total)
   ```typescript
   import { test, expect } from '@playwright/test';
   import { loadPlaywrightTestConfig } from '../config/playwright.config';
   import { extractInvestigationId } from '../utils/ids';
   import { getProgress } from '../utils/api';
   import { TestLogger } from '../../testing/utils/test-logger';

   test.describe('Trigger Investigation (US1)', () => {
     let config: ReturnType<typeof loadPlaywrightTestConfig>;
     let logger: TestLogger;

     test.beforeAll(() => {
       config = loadPlaywrightTestConfig();
       logger = new TestLogger({ verbose: config.enableVerboseLogging });
     });

     test('Should navigate to settings page and display form', async ({ page }) => {
       // Implementation
     });

     test('Should submit investigation form without errors', async ({ page }) => {
       // Implementation
     });

     test('Should extract investigation ID from response/redirect', async ({ page }) => {
       // Implementation
     });

     test('Should receive initial progress response confirming creation', async ({ page }) => {
       // Implementation
     });
   });
   ```

2. **Test 1: Navigate to Settings Page** (15 lines)
   - Navigate to `${config.baseUrl}/investigation/settings`
   - Assert page loads successfully (title visible, form elements present)
   - Assert form has required fields (entities input, timeRange selector, tools checkboxes)
   - Log: "Settings page loaded successfully"

3. **Test 2: Submit Investigation Form** (25 lines)
   - Fill in investigation form with test data:
     ```typescript
     const testData = {
       entities: ['test@example.com'],  // Can be extracted from test config
       timeRange: { start: '2025-11-01', end: '2025-11-02' },
       tools: ['device_analysis', 'location_analysis'],
       settings: { name: 'E2E Test Investigation', correlationMode: 'OR' }
     };
     ```
   - Fill form fields using locators
   - Click "Start Investigation" button
   - Assert no error toasts appear
   - Assert loading indicator appears
   - Log: "Form submitted successfully"

4. **Test 3: Extract Investigation ID** (20 lines)
   - Wait for page redirect or navigation (timeout 10 seconds)
   - Use `extractInvestigationId(page)` to get ID from:
     - URL query param
     - Response body
     - Toast notification
   - Assert ID matches pattern: `inv_[a-zA-Z0-9]+`
   - Store ID for next test
   - Log: `"Investigation created with ID: ${investigationId}"`

5. **Test 4: Verify Initial Progress Response** (20 lines)
   - Call `getProgress(config, investigationId, { timeout: 5000 })`
   - Assert response includes:
     - status: 'IN_PROGRESS' or 'CREATED'
     - lifecycle_stage: valid stage
     - completion_percent: 0 or small value
     - completed_tools: 0
     - total_tools: > 0
   - Assert response matches `ProgressDataSchema` (from validation-schemas.ts)
   - Log: `"Initial progress verified: ${JSON.stringify(progressData)}"`

**File Size Target**: < 150 lines (main test file)

**Assertion Functions Used**:
- Built-in Playwright `expect()` for UI assertions
- `validateInvestigationResponse()` for schema validation
- `extractInvestigationId()` for ID extraction

**Acceptance Criteria**:
- [ ] All 4 tests pass on chromium, firefox, webkit
- [ ] Form submission succeeds without errors
- [ ] Investigation ID correctly extracted from multiple sources
- [ ] Initial progress response validated against schema
- [ ] Test completes in < 30 seconds
- [ ] Test file < 150 lines
- [ ] All hardcoded values extracted to config or constants
- [ ] Clear logging for debugging

**Integration Points**:
- Uses: `loadPlaywrightTestConfig()`
- Uses: `extractInvestigationId()` from ids.ts
- Uses: `getProgress()` from api.ts
- Uses: `TestLogger` from test-logger.ts
- Sets up: `investigationId` for downstream tests

**Effort**: 2-3 hours | **Complexity**: Low-Medium

---

### Task 3.3: Create Progress & Events Validation Test (US3, US4)

**Scope**: Create `src/shared/testing/e2e/tests/verify-progress-and-events.spec.ts` - comprehensive polling test

**Independent Value**: Tests progress monotonicity and event append-only guarantee; can run independently

**Implementation Requirements**:

1. **Test Suite Structure** (100 lines total)
   ```typescript
   test.describe('Progress & Events Validation (US3, US4)', () => {
     // Setup
     // US3: Progress Monotonicity Test
     // US4: Events Append-Only Test
     // US3+US4: Combined polling test
   });
   ```

2. **Test 1: Progress Monotonicity During Investigation** (35 lines)
   - Create investigation (reuse from Task 3.2 or start new one)
   - Poll progress every 1 second for up to 90 seconds
   - Collect all progress responses in array
   - Call `assertProgressMonotonicity(progressHistory, { logger })` from assertions.ts
   - Assert:
     - completion_percent never decreases (monotonically increasing)
     - stage transitions follow: created → in_progress → completed
     - No duplicate stages (no repeated in_progress without change)
   - Assert result.violations.length === 0
   - Log: `"Progress monotonicity verified: ${progressHistory.length} samples"`

3. **Test 2: Events Append-Only Feed** (35 lines)
   - Create investigation (same investigation as Test 1)
   - Poll events with cursor=0 multiple times over 60 seconds
   - Collect all event responses
   - Call `assertEventOrdering(allEvents, { logger })` from assertions.ts
   - Assert:
     - All event_ids unique (no duplicates across all requests)
     - Events ordered by (timestamp, sequence)
     - No gaps in sequence numbers within same timestamp
     - Later requests never return earlier events (append-only)
   - Assert result.violations.length === 0
   - Log: `"Events append-only verified: ${totalEvents} events collected"`

4. **Test 3: Combined Progress + Events Polling** (30 lines)
   - Parallel poll progress and events simultaneously for 45 seconds
   - Stop when progress reaches 100% or timeout
   - Verify:
     - Progress monotonicity holds
     - Events remain append-only
     - Event count increases with progress
     - No race condition issues between endpoints
   - Log: `"Combined polling verified: ${progressSamples} progress, ${eventCount} events"`

**Helper Constants** (define at top):
```typescript
const POLL_INTERVAL_MS = 1000;  // From config
const MAX_POLL_DURATION_MS = 90000;  // 90 seconds
const COMBINED_POLL_DURATION_MS = 45000;  // 45 seconds
```

**File Size Target**: < 150 lines (main test file)

**Assertion Functions Used**:
- `assertProgressMonotonicity()` from assertions.ts
- `assertEventOrdering()` from assertions.ts
- Built-in Playwright `expect()` for final assertions

**Acceptance Criteria**:
- [ ] Progress monotonicity test passes (no decreasing values)
- [ ] Events append-only test passes (no duplicates, strict ordering)
- [ ] Combined polling test runs without race conditions
- [ ] All tests pass on chromium, firefox, webkit
- [ ] Tests complete within 2 minutes total
- [ ] Test file < 150 lines
- [ ] All polling intervals from config
- [ ] Clear error messages if assertions fail

**Integration Points**:
- Uses: `getProgress()` from api.ts
- Uses: `getEvents()` from api.ts
- Uses: `assertProgressMonotonicity()` from assertions.ts
- Uses: `assertEventOrdering()` from assertions.ts
- Depends on: Investigation created by Task 3.2

**Effort**: 3-4 hours | **Complexity**: Medium

---

### Task 3.4: Create UI State Verification Test (US6 Comprehensive)

**Scope**: Create `src/shared/testing/e2e/tests/verify-ui-reflects-backend.spec.ts` - UI consistency test

**Independent Value**: Tests UI rendering against backend state; can run independently

**Implementation Requirements**:

1. **Test Suite Structure** (110 lines total)
   ```typescript
   test.describe('UI State Verification (US6)', () => {
     // Stepper component verification
     // Progress bar accuracy check
     // Activity feed synchronization
     // Findings display consistency
   });
   ```

2. **Test 1: Stepper Component Matches Progress Stage** (25 lines)
   - Create investigation and navigate to investigation page
   - Fetch `/progress` API
   - Get stepper current step from DOM:
     ```typescript
     const stepperText = await page.locator('[data-testid="stepper"]').textContent();
     const apiStage = progressData.lifecycle_stage;  // 'created', 'in_progress', 'completed'
     ```
   - Map API stage to UI step:
     - 'created' → Step 1 (Setup)
     - 'in_progress' → Step 2-3 (Analyzing)
     - 'completed' → Step 4 (Results)
   - Assert stepper matches mapped stage
   - Log: `"Stepper matches API stage: ${apiStage}"`

3. **Test 2: Progress Bar Accuracy** (20 lines)
   - Get progress bar value from DOM:
     ```typescript
     const progressBarPercent = await page.locator('[data-testid="progress-bar"]')
       .getAttribute('aria-valuenow');
     ```
   - Fetch latest `/progress` API
   - Assert: `|uiPercent - apiPercent| <= 5` (allow 5% tolerance for rounding)
   - Poll multiple times (3-5 times during investigation)
   - Assert tolerance maintained throughout
   - Log: `"Progress bar accurate: UI=${uiPercent}%, API=${apiPercent}%"`

4. **Test 3: Activity Feed Matches Latest Events** (35 lines)
   - Wait for activity feed/timeline to be visible
   - Count visible feed items:
     ```typescript
     const feedItems = await page.locator('[data-testid="activity-item"]').count();
     ```
   - Fetch `/events` API with limit=feedItems
   - Get feed item text content (first 50 chars of each)
   - Map to event descriptions in API response
   - Assert feed displays descriptions matching recent events
   - Allow for formatting differences (timestamps, line breaks)
   - Log: `"Activity feed verified: ${feedItems} items match API events"`

5. **Test 4: Findings Display Consistency** (30 lines)
   - Wait for findings section to be visible
   - Count findings cards/badges:
     ```typescript
     const findingCount = await page.locator('[data-testid="finding-card"]').count();
     ```
   - Get finding severities (HIGH, MEDIUM, LOW):
     ```typescript
     const severities = await page.locator('[data-testid="finding-severity"]')
       .allTextContents();
     ```
   - Fetch latest `/investigations/{id}` snapshot
   - Count findings in snapshot: `snapshot.findings.length`
   - Count findings by severity in snapshot
   - Assert UI counts match snapshot exactly
   - Assert severity distribution matches
   - Log: `"Findings verified: ${findingCount} in UI, ${snapshot.findings.length} in API"`

**File Size Target**: < 150 lines (main test file)

**DOM Selectors** (all must use data-testid or semantic HTML):
- `[data-testid="stepper"]` - Stepper component
- `[data-testid="progress-bar"]` - Progress bar element
- `[data-testid="activity-item"]` - Individual activity feed item
- `[data-testid="finding-card"]` - Individual finding card
- `[data-testid="finding-severity"]` - Severity badge

**Assertion Functions Used**:
- Built-in Playwright `expect()` for DOM assertions
- Custom helper: `assertUIConsistency()` from assertions.ts (optional wrapper)

**Acceptance Criteria**:
- [ ] Stepper component matches progress stage transitions
- [ ] Progress bar accuracy within ±5% of API value
- [ ] Activity feed shows descriptions matching API events
- [ ] Findings count and severity match snapshot exactly
- [ ] All tests pass on chromium, firefox, webkit
- [ ] Tests work during investigation execution and at completion
- [ ] Test file < 150 lines
- [ ] Clear error messages if UI diverges from backend
- [ ] All DOM selectors use data-testid attributes

**Integration Points**:
- Uses: `getProgress()` from api.ts
- Uses: `getEvents()` from api.ts
- Uses: API snapshot fetching
- Depends on: Investigation created by Task 3.2

**Effort**: 3-4 hours | **Complexity**: Medium

---

## Phase 4: Advanced Test Implementation - User Stories 2, 5, 7

**Phase Goal**: Implement tests for server logging, versioning, and recovery scenarios.

**Estimated Effort**: 8-10 hours | **Complexity**: Medium-High

### Task 4.1: Create Comprehensive Server Logs Validation Test (US2)

**Scope**: Create `src/shared/testing/e2e/tests/logs-validation.spec.ts` - server lifecycle logging test

**Independent Value**: Tests server-side logging; can run independently

**Implementation Requirements**:

1. **Test Suite Structure** (120 lines total)
   ```typescript
   test.describe('Server Logs Validation (US2)', () => {
     // Logs availability test
     // Log sequence validation test
     // LLM/Tool usage tracking test
     // Log-frontend correlation test
   });
   ```

2. **Test 1: Fetch and Parse Server Logs** (30 lines)
   - Create investigation
   - Wait for investigation to complete (or reach in_progress)
   - Call `captureBackendLogs(backendBaseUrl, investigationId)` from logs.ts
   - Assert logs retrieved successfully
   - Assert logs contain structured data (JSON or JSONL)
   - Parse logs using `parseLogs(rawLogs)` from log-parser.ts
   - Assert parsed result includes categories:
     - `llm_calls`: LLM invocations with model, tokens, latency
     - `tool_executions`: Tool usage with name, duration
     - `decisions`: Agent decision points
     - `errors`: Any error events (should be empty or minimal)
   - Log: `"Logs parsed: ${Object.keys(parsed).length} categories, ${parsed.llm_calls.length} LLM calls"`

3. **Test 2: Validate Log Sequence and Monotonicity** (35 lines)
   - Using parsed logs, call `validateLogSequence(logs)` from log-parser.ts
   - Assert:
     - First log event is 'investigation_created' or 'agents_initialized'
     - Timestamps are strictly increasing (no decreasing timestamps)
     - Sequence numbers are monotonically increasing (0, 1, 2, ...)
     - No duplicate sequence numbers
     - Stage transitions follow canonical path (created → in_progress → completed)
   - Call `assertBackendLogSequence(logs, { logger })` from assertions.ts
   - Assert result.violations.length === 0
   - Log: `"Log sequence validated: ${logs.length} events, all monotonic"`

4. **Test 3: Verify LLM & Tool Usage Tracking** (30 lines)
   - Extract LLM calls from parsed logs
   - Assert each LLM call includes:
     - `model`: Model name (e.g., 'gpt-4')
     - `input_tokens`: Token count (number)
     - `output_tokens`: Token count (number)
     - `latency_ms`: Execution time (number)
     - `timestamp`: ISO 8601 timestamp
   - Assert tool executions include:
     - `tool_name`: Tool identifier
     - `status`: 'success' or 'failed'
     - `duration_ms`: Execution time
     - `input`: Tool input parameters
     - `output`: Tool output/results
   - Assert tools execute in reasonable order (device → location → network → logs)
   - Log: `"LLM/Tool tracking verified: ${llmCount} LLM calls, ${toolCount} tool executions"`

5. **Test 4: Correlate Frontend & Backend Events** (25 lines)
   - Collect frontend events from `/events` API during investigation
   - Get backend logs
   - Call `assertLogCorrelation(frontendEvents, backendLogs, investigationId, { logger })` from assertions.ts
   - Assert:
     - Correlation ratio > 0.8 (at least 80% of backend events reflected in frontend)
     - Key events present in both: created, in_progress, completed
     - Timestamps roughly align (within ±5 seconds)
     - No events in backend without corresponding frontend event (except internal events)
   - Assert result.correlationRatio > 0.8
   - Log: `"Frontend-backend correlation: ${(result.correlationRatio * 100).toFixed(1)}%"`

**File Size Target**: < 150 lines (main test file)

**Helper Functions** (already exist in logs.ts, log-parser.ts):
- `captureBackendLogs()` - Fetch logs from backend
- `parseLogs()` - Parse and categorize logs
- `validateLogSequence()` - Check sequence validity
- `assertBackendLogSequence()` - Assert wrapper with logging
- `assertLogCorrelation()` - Correlate frontend/backend events

**Acceptance Criteria**:
- [ ] Server logs fetched successfully (HTTP or shell fallback)
- [ ] Logs parsed into categories (LLM, Tool, Decision, Error)
- [ ] Log sequence is strictly monotonic (no decreasing timestamps)
- [ ] LLM calls tracked with model, tokens, latency
- [ ] Tool executions tracked with duration and status
- [ ] Frontend and backend events correlate > 80%
- [ ] All tests pass on chromium, firefox, webkit
- [ ] Test handles graceful skipping if logs unavailable
- [ ] Test file < 150 lines
- [ ] Clear error messages for log sequence violations

**Integration Points**:
- Uses: `captureBackendLogs()` from logs.ts
- Uses: `parseLogs()` from log-parser.ts
- Uses: `validateLogSequence()` from log-parser.ts
- Uses: `assertBackendLogSequence()` from assertions.ts
- Uses: `assertLogCorrelation()` from assertions.ts
- Uses: `getEvents()` from api.ts
- Depends on: Investigation created by Task 3.2

**Effort**: 3-4 hours | **Complexity**: Medium-High (log parsing complexity)

---

### Task 4.2: Create Snapshot Versioning Test (US5)

**Scope**: Create `src/shared/testing/e2e/tests/verify-snapshot-versioning.spec.ts` - versioning and caching test

**Independent Value**: Tests snapshot versioning; can run independently

**Implementation Requirements**:

1. **Test Suite Structure** (90 lines total)
   ```typescript
   test.describe('Snapshot Versioning (US5)', () => {
     // Version header presence test
     // ETag caching test
     // Version advancement test
   });
   ```

2. **Test 1: Verify Version/ETag Headers Present** (20 lines)
   - Create investigation
   - Fetch `/investigations/{id}` snapshot
   - Assert response headers include:
     - `etag`: Strong ETag value (e.g., `"abc123...xyz"`)
     - OR `last-modified`: HTTP date (e.g., `Wed, 04 Nov 2025 12:00:00 GMT`)
   - Assert at least one versioning header present
   - Store ETag for next test
   - Log: `"Version headers verified: ETag=${etag}, Last-Modified=${lastModified}"`

3. **Test 2: ETag Caching - 304 Not Modified** (25 lines)
   - Fetch `/investigations/{id}` snapshot with stored ETag
   - Send request with `If-None-Match: {etag}` header
   - Assert one of:
     - Response status is 304 Not Modified (no body returned)
     - Response status is 200 with same ETag (acceptable if server doesn't support 304)
   - Assert no unnecessary data transferred in 304 case
   - Do NOT re-parse snapshot if 304 returned
   - Log: `"ETag caching verified: 304 response for unchanged snapshot"`

4. **Test 3: Version Advances After New Events** (30 lines)
   - Fetch snapshot at time T1, store version/ETag
   - Wait 5-10 seconds for investigation to continue processing
   - Fetch snapshot again at time T2
   - Assert either:
     - New ETag value (different from T1)
     - OR newer Last-Modified timestamp
     - OR both ETag and Last-Modified changed
   - If no changes occurred during wait, wait longer and retry
   - Assert version/timestamp strictly advances
   - Log: `"Version advancement verified: ${oldVersion} → ${newVersion}"`

**File Size Target**: < 120 lines (main test file)

**HTTP Header Handling**:
- Use Playwright `response.headerValue('etag')` to read ETag
- Use Playwright `response.headerValue('last-modified')` to read Last-Modified
- Send custom header: `await page.request.get(url, { headers: { 'If-None-Match': etag } })`

**Acceptance Criteria**:
- [ ] Version headers (ETag or Last-Modified) present in response
- [ ] ETag format valid (quoted string or strong validator)
- [ ] 304 Not Modified responses handled correctly
- [ ] Version/ETag values change when snapshot updated
- [ ] No 304 responses when snapshot modified
- [ ] All tests pass on chromium, firefox, webkit
- [ ] Test file < 120 lines
- [ ] Clear logging of versioning events

**Integration Points**:
- Uses: Direct HTTP requests (not wrapped API helper)
- Uses: Playwright response headers API
- Depends on: Investigation created by Task 3.2

**Effort**: 2-3 hours | **Complexity**: Low-Medium

---

### Task 4.3: Create Hard Refresh & Rehydration Test (US7)

**Scope**: Create `src/shared/testing/e2e/tests/refresh-rehydrate.spec.ts` - browser recovery test

**Independent Value**: Tests page rehydration after hard refresh; can run independently

**Implementation Requirements**:

1. **Test Suite Structure** (100 lines total)
   ```typescript
   test.describe('Hard Refresh & Rehydration (US7)', () => {
     // Snapshot quick load test
     // Event catch-up test
     // State consistency test
   });
   ```

2. **Test 1: Snapshot Loads Quickly After Refresh** (30 lines)
   - Create investigation and wait for in_progress state
   - Navigate to investigation page
   - Record initial state snapshot
   - Perform hard refresh: `await page.reload({ waitUntil: 'networkidle' })`
   - Measure load time from navigation to snapshot visible on page
   - Assert:
     - Page loads within 2 seconds
     - Investigation ID still visible or recovered from URL
     - Snapshot data loaded from API (progress, findings)
     - UI renders without errors
   - Log: `"Snapshot loaded in ${loadTimeMs}ms"`

3. **Test 2: Events Catch-Up After Refresh** (35 lines)
   - Before refresh: Capture last known event cursor
   - Perform hard refresh
   - After refresh: Poll `/events?since={cursor}` to get new events
   - Assert:
     - Events API returns new events (if any occurred during refresh)
     - No duplicate events (append-only principle maintained)
     - Event ordering preserved
     - UI applies new events without flickering
   - Wait and verify progress continues updating
   - Log: `"Events catch-up verified: ${newEventCount} new events applied"`

4. **Test 3: Complete State Consistency After Refresh** (35 lines)
   - Perform hard refresh during mid-investigation
   - Record state from all APIs:
     - Progress: `/progress`
     - Events: `/events`
     - Snapshot: `/investigations/{id}`
   - Compare to recorded pre-refresh state
   - Assert:
     - Progress percent not decreased (monotonicity preserved)
     - All events still present (none lost)
     - Snapshot matches latest event state
     - Investigation ID unchanged
     - UI displays match API state
   - Allow reasonable delay (< 5 seconds) for page to fully load
   - Log: `"State consistency verified after refresh"`

**File Size Target**: < 140 lines (main test file)

**Hard Refresh Implementation**:
```typescript
// Hard refresh (clears cache, reloads from server)
await page.reload({ waitUntil: 'networkidle' });

// Alternative: Navigate to same URL (triggers full reload)
await page.goto(page.url(), { waitUntil: 'networkidle' });
```

**Acceptance Criteria**:
- [ ] Snapshot loads within 2 seconds after refresh
- [ ] Investigation ID recovered from URL or local storage
- [ ] Event catch-up works without duplicates
- [ ] Progress monotonicity maintained across refresh
- [ ] State consistency verified (no data loss)
- [ ] All tests pass on chromium, firefox, webkit
- [ ] Mobile variant works (responsive layout preserved)
- [ ] Test file < 140 lines
- [ ] Clear logging of refresh and recovery process

**Integration Points**:
- Uses: `getProgress()` from api.ts
- Uses: `getEvents()` from api.ts
- Uses: API snapshot fetching
- Depends on: Investigation created by Task 3.2

**Effort**: 2-3 hours | **Complexity**: Medium

---

## Phase 5: Resilience & Error Handling (US8, US9)

**Phase Goal**: Implement tests for error recovery and idempotent rendering.

**Estimated Effort**: 6-8 hours | **Complexity**: Medium-High

### Task 5.1: Create Resilience & Exponential Backoff Test (US8)

**Scope**: Create `src/shared/testing/e2e/tests/negative-and-resilience.spec.ts` - error handling test

**Implementation Requirements**:

1. **Test Suite Structure** (120 lines total)
   ```typescript
   test.describe('Resilience & Error Handling (US8, US9)', () => {
     // Transient error recovery test
     // Exponential backoff test
     // Idempotent rendering test
   });
   ```

2. **Test 1: Recover from Single Transient 429 Error** (30 lines)
   - Start investigation polling
   - Intercept `/events` request to inject 429 response once
   - Continue polling and verify:
     - Client detects 429 error
     - Client backs off with exponential delay
     - Client retries request
     - Request succeeds on retry
     - No data loss or corruption
     - UI continues normally
   - Log: `"Single 429 error recovered successfully"`

3. **Test 2: Exponential Backoff with Jitter** (35 lines)
   - Inject multiple transient errors (429, 503, 504) in sequence
   - Verify backoff delays follow formula:
     - Attempt 1: baseMs + jitter
     - Attempt 2: min(baseMs * 2, maxMs) + jitter
     - Attempt 3: min(baseMs * 4, maxMs) + jitter
     - No attempt exceeds maxMs
     - Jitter adds randomness to prevent thundering herd
   - Verify final retry succeeds
   - Log retry intervals and verify they match expected backoff curve
   - Assert: `delays[i] < delays[i+1]` (increasing delays)
   - Assert: `all(delays) <= maxMs` (no exceeding max)
   - Log: `"Exponential backoff verified: ${delays.length} attempts with correct delays"`

4. **Test 3: Fail Fast on Non-Transient Errors** (30 lines)
   - Inject 401 Unauthorized error
   - Assert client fails immediately without retry
   - Assert error message clear and actionable
   - Do NOT retry on 4xx errors (except 429)
   - Verify retry count = 0 for 401 error
   - Log: `"Non-transient error (401) failed immediately without retry"`

5. **Test 4: Idempotent Rendering on No-Op Polls** (25 lines)
   - Poll `/events` multiple times
   - Arrange for `/events` to return empty items (no new events)
   - Assert DOM does not change between polls (measure re-renders)
   - Use React DevTools or Playwright trace to verify no flicker
   - Assert:
     - Progress bar does not refresh/animate
     - Activity feed does not re-render
     - No visual flickering
   - Compare DOM snapshots before/after no-op poll
   - Log: `"Idempotent rendering verified: 0 DOM changes on no-op poll"`

**File Size Target**: < 150 lines (main test file)

**HTTP Interception** (Playwright native):
```typescript
// Intercept requests and inject errors
await page.route('**/events**', async (route) => {
  if (attemptCount === 1) {
    // Inject 429 on first attempt
    await route.abort('failed');  // or route.respond({ status: 429 })
  } else {
    await route.continue();
  }
});
```

**Acceptance Criteria**:
- [ ] Single transient error (429) handled with retry
- [ ] Exponential backoff delays follow formula with jitter
- [ ] Maximum backoff respects maxMs limit
- [ ] Non-transient errors (4xx except 429) fail immediately
- [ ] No retry on non-transient errors
- [ ] No-op polls do not trigger DOM re-renders
- [ ] All tests pass on chromium, firefox, webkit
- [ ] Test file < 150 lines
- [ ] Clear logging of error recovery steps

**Integration Points**:
- Uses: Enhanced `http-client.ts` with exponential backoff
- Uses: Playwright request/response interception
- Depends on: Investigation created by Task 3.2 or 5.1

**Effort**: 3-4 hours | **Complexity**: High (request interception complexity)

---

## Phase 6: Backend Integration & Performance (Not Detailed)

**Phase Goal**: Validate API response formats and performance characteristics.

**Tasks**:
- 6.1: Verify API response formats match data-model.md contracts
- 6.2: Test investigation completion time SLA compliance (≤120s)
- 6.3: Verify WebSocket performance vs HTTP polling fallback

**Estimated Effort**: 4-6 hours | **Complexity**: Medium

---

## Phase 7: Documentation & Polish (Not Detailed)

**Phase Goal**: Create comprehensive documentation and mobile test variants.

**Tasks**:
- 7.1: Extract test logger to shared utilities
- 7.2: Create README.md with setup and execution guide
- 7.3: Add mobile test variants for all primary tests
- 7.4: Generate visual regression baseline screenshots

**Estimated Effort**: 6-8 hours | **Complexity**: Low-Medium

---

## Phase 8: CI/CD Integration (Not Detailed)

**Phase Goal**: Set up automated test execution in CI/CD pipeline.

**Tasks**:
- 8.1: GitHub Actions workflow (.github/workflows/e2e-tests.yml)
- 8.2: GitLab CI pipeline (.gitlab-ci.yml)
- 8.3: Test result reporting and artifact collection
- 8.4: Performance baseline documentation

**Estimated Effort**: 4-6 hours | **Complexity**: Medium

---

## Task Dependency Map

```
Phase 2 (Configuration & Utilities)
├─ 2.1: HTTP Client Enhancements (Backoff, ETag)
├─ 2.2: Configuration Schema Updates
└─ 2.3: Shell Command Log Fetching

Phase 3 (Core Tests - Foundation)
├─ 3.1: Investigation State Mgmt Expansion (depends: 2.1, 2.2)
├─ 3.2: Trigger Investigation (depends: 2.2)
├─ 3.3: Progress & Events (depends: 2.1, 2.2, 3.2)
└─ 3.4: UI State Verification (depends: 3.2, 3.3)

Phase 4 (Advanced Tests)
├─ 4.1: Server Logs Validation (depends: 2.2, 2.3, 3.2)
├─ 4.2: Snapshot Versioning (depends: 2.1, 3.2)
└─ 4.3: Hard Refresh Rehydration (depends: 3.2, 3.3)

Phase 5 (Resilience Tests)
└─ 5.1: Error Handling & Backoff (depends: 2.1, 3.2, 3.3)

Phases 6-8: Non-blocking enhancements (all tests functional before these)
```

---

## Implementation Checklist

Use this checklist to track progress through all phases:

### Phase 2 ✅ Ready to Start
- [ ] 2.1: HTTP Client exponential backoff added
- [ ] 2.1: ETag caching header support added
- [ ] 2.2: Configuration schema includes retry parameters
- [ ] 2.2: Configuration schema includes log fetch parameters
- [ ] 2.3: Shell command log fetching implemented
- [ ] All Phase 2 code reviewed and tested

### Phase 3 ⏳ Ready to Start
- [ ] 3.1: Investigation state mgmt test expanded
- [ ] 3.1: All 4 UI assertions implemented
- [ ] 3.1: Mobile variant test created
- [ ] 3.2: Trigger investigation test created
- [ ] 3.3: Progress & events validation test created
- [ ] 3.4: UI state verification test created
- [ ] All Phase 3 tests passing on 3 browsers

### Phase 4 ⏳ Ready After Phase 3
- [ ] 4.1: Server logs validation test created
- [ ] 4.1: Log parsing and correlation verified
- [ ] 4.2: Snapshot versioning test created
- [ ] 4.3: Hard refresh rehydration test created
- [ ] All Phase 4 tests passing on 3 browsers

### Phase 5 ⏳ Ready After Phase 3-4
- [ ] 5.1: Error injection and backoff test created
- [ ] 5.1: Transient error recovery verified
- [ ] 5.1: Idempotent rendering test created
- [ ] All Phase 5 tests passing on 3 browsers

### Final Quality Gates
- [ ] All tests pass: `npx playwright test`
- [ ] Test coverage ≥ 87% (all user stories covered)
- [ ] No hardcoded values (all from config)
- [ ] No stubs/mocks/TODO in test files
- [ ] No code duplication
- [ ] All files < 200 lines
- [ ] Code reviewed by code-reviewer subagent
- [ ] Build passes: `npm run build`

---

## Effort Estimation Summary

| Phase | Tasks | Hours | Complexity | Status |
|-------|-------|-------|-----------|--------|
| Phase 2 | Configuration & Utilities | 6 | Low-Medium | Ready |
| Phase 3 | Core Tests (US1,3,4,6) | 10 | Medium | Ready |
| Phase 4 | Advanced Tests (US2,5,7) | 10 | Medium-High | Ready |
| Phase 5 | Resilience (US8,9) | 8 | Medium-High | Ready |
| Phase 6 | Backend Integration | 6 | Medium | Pending |
| Phase 7 | Documentation & Polish | 8 | Low-Medium | Pending |
| Phase 8 | CI/CD Integration | 6 | Medium | Pending |
| **Total** | **47 subtasks** | **54 hours** | **Mixed** | **Ready to Execute** |

**Realistic Effort** (accounting for debugging, testing, refinement):
- **1 Person**: 7-9 days (with 7-8 hour days)
- **2 People**: 3-5 days (with parallel execution)

---

## Quality Assurance Requirements

### Code Quality Gates
- ✅ Zero forbidden terms (TODO, FIXME, MOCK, STUB, PLACEHOLDER, etc.)
- ✅ Zero hardcoded values (all from config/env)
- ✅ Zero code duplication
- ✅ All files < 200 lines
- ✅ All functions have clear, documented purpose
- ✅ All tests have acceptance criteria (passing tests = met criteria)

### Test Quality Gates
- ✅ All tests pass on chromium, firefox, webkit
- ✅ All tests pass on mobile variants (if enabled)
- ✅ No flaky tests (< 2% failure rate over 50+ CI runs)
- ✅ Clear assertion messages for failures
- ✅ Comprehensive logging for debugging
- ✅ Test execution time < 2 minutes per test file
- ✅ Coverage ≥ 87% of user story acceptance scenarios

### Integration Quality Gates
- ✅ No mocks/stubs in test files (real API integration)
- ✅ All tests use same config layer
- ✅ All tests reference existing utilities (no duplication)
- ✅ All tests can run independently
- ✅ Tests don't interfere with each other

---

## Success Criteria (Per User Story)

| Story | Test File | Acceptance Scenarios | Status |
|-------|-----------|-------------------|--------|
| US1 | trigger-investigation.spec.ts | 4/4 scenarios | ⏳ Ready |
| US2 | logs-validation.spec.ts | 4/4 scenarios | ⏳ Ready |
| US3 | verify-progress-and-events.spec.ts | 3/3 scenarios | ⏳ Ready |
| US4 | verify-progress-and-events.spec.ts | 4/4 scenarios | ⏳ Ready |
| US5 | verify-snapshot-versioning.spec.ts | 3/3 scenarios | ⏳ Ready |
| US6 | verify-ui-reflects-backend.spec.ts + investigation-state-mgmt | 4/4 scenarios | ⏳ Ready |
| US7 | refresh-rehydrate.spec.ts | 3/3 scenarios | ⏳ Ready |
| US8 | negative-and-resilience.spec.ts | 3/3 scenarios | ⏳ Ready |
| US9 | negative-and-resilience.spec.ts | 1/1 scenario | ⏳ Ready |

---

## Running Tests

```bash
# All tests, all browsers
npx playwright test

# Single test file
npx playwright test src/shared/testing/e2e/tests/trigger-investigation.spec.ts

# Single browser
npx playwright test --project=chromium

# With verbose logging
PLAYWRIGHT_ENABLE_VERBOSE_LOGGING=true npx playwright test

# With detailed report
npx playwright test && npx playwright show-report

# Mobile variant
PLAYWRIGHT_ENABLE_MOBILE_TESTS=true npx playwright test --project="Mobile Chrome"
```

---

## Next Steps

1. **Phase 2 Execution** (6 hours)
   - Implement HTTP client exponential backoff and ETag support
   - Update configuration schema with new parameters
   - Add shell command log fetching support

2. **Phase 3 Execution** (10 hours)
   - Create 4 new test files (trigger, progress/events, UI, state mgmt expansion)
   - Implement all assertions using existing helpers
   - Verify all tests pass on 3 browsers

3. **Phase 4 Execution** (10 hours)
   - Create 3 new test files (logs, versioning, refresh)
   - Test server-side logging, snapshot versioning, recovery

4. **Phase 5 Execution** (8 hours)
   - Create resilience test file with error injection
   - Test exponential backoff, transient error recovery

5. **Final Quality Gates**
   - Code review with code-reviewer subagent
   - Build verification
   - Test coverage report

---

**Status**: ✅ **Ready for Phase 2-3 Implementation**

**Last Updated**: 2025-11-04

**Generated By**: Robust E2E Testing Implementation Planning
