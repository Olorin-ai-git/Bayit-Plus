# E2E Test Fixes - Full Investigation Flow

## Issues Found and Fixed

### 1. **Risk-Based Investigation Execution Not Triggered**
**Problem**: Risk-based investigations with `entity_type: null, entity_value: null` were not triggering execution because `extract_structured_request()` returned `None` when entity values were null.

**Fix**: Modified `investigation_trigger_service.py` to handle risk-based investigations by using placeholder entity values (`entity_id: "risk-based-auto-select", entity_type: "auto"`) so execution can be triggered.

**Files Changed**:
- `olorin-server/app/service/investigation_trigger_service.py` (lines 93-112)
- `olorin-server/app/service/investigation_state_service.py` (lines 106-162)

### 2. **Investigation ID Not Passed to Graph Execution**
**Problem**: `investigation_id` wasn't being passed in `config.configurable` to graph execution, preventing tool execution persistence.

**Fix**: Updated all graph execution endpoints to always include `investigation_id` in `config.configurable`.

**Files Changed**:
- `olorin-server/app/router/controllers/investigation_executor_core.py`
- `olorin-server/app/router/agent_router.py` (2 locations)
- `olorin-server/app/service/agent/orchestration/enhanced_tool_executor.py` (enhanced extraction logic)

### 3. **Progress JSON Not Initialized**
**Problem**: `progress_json` was NULL for IN_PROGRESS investigations, preventing tool execution persistence.

**Fix**: 
- `ToolExecutionService.persist_tool_execution()` now initializes `progress_json` if NULL
- `InvestigationTriggerService.update_state_to_in_progress()` initializes `progress_json` when transitioning to IN_PROGRESS

**Files Changed**:
- `olorin-server/app/service/tool_execution_service.py` (lines 77-93)
- `olorin-server/app/service/investigation_trigger_service.py` (lines 205-219)

### 4. **Playwright Test API Calls**
**Problem**: Test was using `fetch()` which doesn't work in Playwright context.

**Fix**: Updated test to use `page.request.get()` for all backend API calls.

**Files Changed**:
- `olorin-front/src/shared/testing/e2e/full-investigation-flow.e2e.test.ts`

## Next Steps

1. **Restart Backend Server** to pick up changes
2. **Run New Investigation** from UI
3. **Monitor Progress Updates** - verify:
   - Investigation execution starts
   - Tool executions are persisted
   - Progress updates are reflected in UI
   - Events are generated
   - Counters update correctly

## Test Status

- ✅ Investigation creation works
- ✅ Navigation to progress page works
- ⚠️ Investigation execution not triggering (FIXED - needs server restart)
- ⚠️ Progress updates not occurring (FIXED - needs server restart)
- ⚠️ Tool executions not persisting (FIXED - needs server restart)

