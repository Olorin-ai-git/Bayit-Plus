# E2E Testing Integration Map

**Visual Reference for Implementation**

---

## File Structure & Dependencies

```
olorin/
├── olorin-front/
│   ├── playwright.config.ts (MODIFY: add LOG_FETCH_CMD, TIME_BUDGET_MS)
│   ├── .env.playwright.example (MODIFY: add new env vars)
│   ├── src/
│   │   └── shared/
│   │       ├── testing/
│   │       │   ├── utils/
│   │       │   │   ├── test-logger.ts (EXISTING - REUSE)
│   │       │   │   ├── investigation-schemas.ts (EXISTING - REUSE)
│   │       │   │   │
│   │       │   │   └── NEW UTILITIES:
│   │       │   │       ├── api.ts (NEW - 90 lines)
│   │       │   │       ├── logs.ts (NEW - 150 lines)
│   │       │   │       ├── assertions.ts (NEW - 120 lines)
│   │       │   │       └── ids.ts (NEW - 40 lines)
│   │       │   │
│   │       │   ├── e2e/
│   │       │   │   ├── investigation-state-mgmt.e2e.test.ts (ENHANCE)
│   │       │   │   │
│   │       │   │   └── investigations/ (NEW DIRECTORY)
│   │       │   │       ├── trigger-investigation.spec.ts
│   │       │   │       ├── verify-progress-and-events.spec.ts
│   │       │   │       ├── verify-ui-reflects-backend.spec.ts
│   │       │   │       ├── verify-snapshot-versioning.spec.ts
│   │       │   │       ├── refresh-rehydrate.spec.ts
│   │       │   │       └── negative-and-resilience.spec.ts
│   │       │   │
│   │       │   └── config/
│   │       │       └── playwright.config.ts (EXISTING - REUSE)
│   │       │
│   │       └── components/
│   │           └── LogStream.tsx (EXISTING - OPTIONAL USE)
│   │
│   └── e2e/
│       └── README.md (NEW - 100+ lines)
│
└── olorin-server/
    ├── app/
    │   ├── service/
    │   │   └── logging/
    │   │       ├── unified_logging_core.py (EXISTING - BACKEND SYSTEM)
    │   │       ├── structured_investigation_logger.py (EXISTING - BACKEND SYSTEM)
    │   │       ├── investigation_instrumentation.py (EXISTING - BACKEND SYSTEM)
    │   │       ├── llm_callback_handler.py (EXISTING - BACKEND SYSTEM)
    │   │       └── investigation_data_models.py (EXISTING - TYPE DEFS)
    │   │
    │   └── router/
    │       └── logs_router.py (EXISTING - API ENDPOINT)
    │
    └── test/ (EXISTING - NO CHANGES)
```

---

## Dependency Graph

### Frontend Utilities Dependency Chain

```
┌─────────────────────────────────────────────────┐
│ Existing Infrastructure                          │
├─────────────────────────────────────────────────┤
│ • TestLogger (src/shared/testing/utils/)       │
│ • Playwright Config                            │
│ • investigation-state-mgmt.e2e.test.ts         │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│ NEW: e2e/utils/ids.ts                           │
│ ├─ extractInvestigationId()                     │
│ ├─ getInvestigationIdFromUrl()                  │
│ └─ getInvestigationIdFromResponse()             │
│                                                 │
│ Dependencies: Playwright types only             │
│ Usage: All tests + api.ts                       │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│ NEW: e2e/utils/api.ts                           │
│ ├─ getAuthHeaders()                             │
│ ├─ getSnapshot()                                │
│ ├─ getProgress(logger?)                         │
│ ├─ getEvents(logger?)                           │
│ ├─ getInvestigationLogs(logger?)                │
│ ├─ waitForProgress(logger?)                     │
│ └─ waitForEvent(logger?)                        │
│                                                 │
│ Dependencies: TestLogger, ids.ts (optional)     │
│ Integrates: GET /logs endpoint                  │
│ Usage: All tests                                │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│ NEW: e2e/utils/logs.ts                          │
│ ├─ E2ETestLogger extends TestLogger             │
│ ├─ getBackendLogs()                             │
│ ├─ validateBackendLogSequence()                 │
│ ├─ correlateLogs()                              │
│ └─ Type definitions (LLM, Tool, Agent, etc.)    │
│                                                 │
│ Dependencies: TestLogger, api.ts                │
│ Integrates: Backend logging systems             │
│ Usage: Tests needing backend log validation     │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│ NEW: e2e/utils/assertions.ts                    │
│ ├─ assertBackendLogSequence(logs, logger?)      │
│ ├─ assertProgressMonotonicity(progress, logger?)│
│ ├─ assertSnapshotVersioning(snap1, snap2)       │
│ ├─ assertUIConsistency(ui, api, logger?)        │
│ └─ assertLogCorrelation(frontend, backend)      │
│                                                 │
│ Dependencies: logs.ts, api.ts                   │
│ Usage: All tests for validation                 │
└─────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────┐
│ Test Files (6 total)                            │
│ ├─ trigger-investigation.spec.ts                │
│ ├─ verify-progress-and-events.spec.ts           │
│ ├─ verify-ui-reflects-backend.spec.ts           │
│ ├─ verify-snapshot-versioning.spec.ts           │
│ ├─ refresh-rehydrate.spec.ts                    │
│ └─ negative-and-resilience.spec.ts              │
│                                                 │
│ All use: api.ts, logs.ts, assertions.ts, ids.ts │
└─────────────────────────────────────────────────┘
```

### Backend System Integration

```
┌──────────────────────────────────────────────────┐
│ Investigation Execution (Backend)                │
├──────────────────────────────────────────────────┤
│                                                  │
│ POST /api/investigations → starts investigation  │
│        ↓                                          │
│ UnifiedLoggingCore creates log entry            │
│        ↓                                          │
│ StructuredInvestigationLogger tracks:           │
│   • LLM calls (model, tokens, latency)          │
│   • Tool executions (name, params, result)      │
│   • Agent decisions (reasoning, confidence)     │
│   • Progress updates (stage, %)                 │
│   • Errors (context, stack)                     │
│        ↓                                          │
│ InvestigationInstrumentationLogger              │
│   → Saves to investigation_logs/{id}/           │
│   → Creates JSON summary                        │
│        ↓                                          │
│ LLM Callback Handler hooks LangChain            │
│   → Instruments all model calls                 │
│        ↓                                          │
│ GET /logs/{investigationId} → Returns parsed    │
│        logs from all systems                    │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Data Flow: Test → Backend → Logs

```
E2E Test Execution
│
├─ Initialize E2ETestLogger
│  ├─ logger.info("Test started", { investigationId })
│  └─ Logs via TestLogger
│
├─ POST /api/investigations (via api.ts)
│  └─ logger.info("Investigation created", { id })
│
├─ Poll /progress (via api.ts + logger)
│  ├─ logger.debug("Fetching progress", { stage, % })
│  └─ Backend: UnifiedLoggingCore logs progress calculation
│
├─ Poll /events (via api.ts + logger)
│  ├─ logger.info("Events retrieved", { count })
│  └─ Backend: StructuredInvestigationLogger logs events
│
├─ Get backend logs (via logs.ts)
│  ├─ GET /logs/{investigationId}
│  ├─ StructuredInvestigationLogger returns parsed logs
│  └─ logger.info("Backend logs captured", { count })
│
├─ Validate sequence (via assertions.ts)
│  ├─ assertBackendLogSequence(logs, logger)
│  ├─ Check: investigation_created → ... → investigation_completed
│  ├─ Check: Monotonic timestamps
│  └─ logger.success("Log sequence valid")
│
├─ Correlate logs (via logs.ts)
│  ├─ correlateLogs(frontend, backend, investigationId)
│  ├─ Match by timestamp ±100ms and investigationId
│  └─ Create unified timeline
│
└─ Generate report
   └─ logger.generateFullReport()
      ├─ Frontend log entries
      ├─ Backend log entries
      ├─ Correlated events
      └─ Full timeline
```

---

## Integration Points Matrix

| Component | Integrates With | Integration Type | Code Location |
|-----------|-----------------|------------------|---------------|
| **api.ts** | TestLogger | Parameter (optional) | Every function has `logger?` |
| **api.ts** | GET /logs endpoint | HTTP call | `getInvestigationLogs()` |
| **logs.ts** | TestLogger | Extension (E2ETestLogger) | `class E2ETestLogger extends TestLogger` |
| **logs.ts** | api.ts | Function call | `getBackendLogs()` calls api endpoints |
| **logs.ts** | StructuredInvestigationLogger | Via GET /logs API | Response type definitions |
| **assertions.ts** | logs.ts | Type import | Uses log types for validation |
| **assertions.ts** | api.ts | No direct integration | Validates api.ts output |
| **assertions.ts** | TestLogger | Optional logging | `logger?` parameter in functions |
| **ids.ts** | Playwright | Types only | Page, Response types |
| **Test files** | All utilities | Imports | All 6 test files import utilities |
| **Test files** | E2ETestLogger | Usage | Instantiate and use for logging |
| **Test files** | backend logging | Via /logs API | Captured by logs.ts |

---

## No-Duplication Verification

### What We Create (NEW)
```
✅ e2e/utils/api.ts           - API call wrappers (NEW)
✅ e2e/utils/logs.ts          - E2ETestLogger extension (NEW)
✅ e2e/utils/assertions.ts    - Validation functions (NEW)
✅ e2e/utils/ids.ts           - ID extraction helpers (NEW)
✅ 6 test spec files          - Test implementations (NEW)
```

### What We Reuse (EXISTING)
```
✅ TestLogger                  - Extends in logs.ts (NO DUPLICATION)
✅ Playwright Config           - Updates, no refactoring (NO DUPLICATION)
✅ investigation-state-mgmt    - Enhances with utilities (NO DUPLICATION)
✅ UnifiedLoggingCore          - Call via GET /logs (NO DUPLICATION)
✅ StructuredInvestigationLogger - Via /logs endpoint (NO DUPLICATION)
✅ LLM Callback Handler        - Already instrumenting (NO DUPLICATION)
✅ Tool Instrumentation        - Already tracking (NO DUPLICATION)
```

### What We DON'T Create (Prevent Duplication)
```
❌ New logger implementation   - Use existing TestLogger
❌ New log format parsers      - Use GET /logs endpoint
❌ New event type definitions  - Use backend types
❌ New log storage system      - Use investigation_logs/
❌ New API endpoints           - Use existing /logs endpoint
❌ New test runner             - Use existing Playwright
❌ New config system           - Use existing .env.playwright
```

---

## Implementation Checklist by Phase

### Phase 1: Utilities (Days 1-2)
- [ ] Create `e2e/utils/api.ts` (90 lines)
  - [ ] Implement getAuthHeaders()
  - [ ] Implement getSnapshot()
  - [ ] Implement getProgress() with logging
  - [ ] Implement getEvents() with logging
  - [ ] Implement getInvestigationLogs()
  - [ ] Implement waitForProgress()
  - [ ] Implement waitForEvent()

- [ ] Create `e2e/utils/logs.ts` (150 lines)
  - [ ] Create E2ETestLogger class extending TestLogger
  - [ ] Implement getBackendLogs() function
  - [ ] Implement validateBackendLogSequence()
  - [ ] Implement correlateLogs()
  - [ ] Define all type interfaces

- [ ] Create `e2e/utils/assertions.ts` (120 lines)
  - [ ] Implement assertBackendLogSequence()
  - [ ] Implement assertProgressMonotonicity()
  - [ ] Implement assertSnapshotVersioning()
  - [ ] Implement assertUIConsistency()
  - [ ] Implement assertLogCorrelation()

- [ ] Create `e2e/utils/ids.ts` (40 lines)
  - [ ] Implement extractInvestigationId()
  - [ ] Implement getInvestigationIdFromUrl()
  - [ ] Implement getInvestigationIdFromResponse()

### Phase 2: Test Files (Days 2-4)
- [ ] Create `verify-snapshot-versioning.spec.ts`
- [ ] Create `negative-and-resilience.spec.ts`
- [ ] Create `refresh-rehydrate.spec.ts`
- [ ] Create `verify-ui-reflects-backend.spec.ts`
- [ ] Create `verify-progress-and-events.spec.ts`
- [ ] Create `trigger-investigation.spec.ts` (optional)

### Phase 3: Enhancement (Day 3)
- [ ] Update `investigation-state-mgmt.e2e.test.ts`
  - [ ] Add imports for utilities
  - [ ] Replace fetch with api.ts functions
  - [ ] Add backend log capture
  - [ ] Add log correlation
  - [ ] Add validation assertions

### Phase 4: Config & Docs (Days 3-4)
- [ ] Update `playwright.config.ts`
- [ ] Update `.env.playwright.example`
- [ ] Create `e2e/README.md`

### Phase 5: Validation (Days 4-5)
- [ ] Run automated scanning (forbidden tokens)
- [ ] Run all tests locally
- [ ] Verify file sizes < 200 lines
- [ ] Code review validation
- [ ] Build verification
- [ ] Create PR

---

## Key Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Utility files created | 4 | ⏳ Pending |
| Total utility lines | ~400 | ⏳ Pending |
| Test files created | 5-6 | ⏳ Pending |
| Total test lines | ~900 | ⏳ Pending |
| Reused components | 8+ | ✅ Identified |
| Duplication score | 0% | ✅ Planned |
| File size compliance | < 200 lines each | ✅ Enforced |
| Test coverage | 85%+ | ✅ Target |
| Flake rate | < 2% | ✅ Target |
| Forbidden patterns | 0 | ✅ Scanned |

---

## Critical Success Factors

✅ **ZERO DUPLICATION**
- Every utility extends or wraps existing code
- No copy-paste of logging logic
- All API calls centralized in api.ts
- All assertions in assertions.ts

✅ **REAL E2E (NO MOCKS)**
- Uses real GET /logs API endpoint
- Uses real TestLogger from codebase
- Uses real StructuredInvestigationLogger events
- All APIs are actual HTTP calls

✅ **CONFIGURATION-DRIVEN**
- All URLs from env vars
- All timeouts configurable
- Graceful degradation when logs unavailable
- No hardcoded values

✅ **PRODUCTION-READY**
- All files < 200 lines
- No TODO/FIXME/MOCK/STUB
- Comprehensive type definitions
- Clear error handling

---

## Ready to Implement?

**YES** ✅

- All analysis complete
- All dependencies identified
- All integration points mapped
- No duplication risks
- Complete documentation provided
- 21 implementation tasks ready

**Proceed to Phase 1: Create Utilities**

