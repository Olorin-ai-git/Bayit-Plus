# WebSocket Removal Plan

**Feature Branch**: `006-websocket-removal`
**Created**: 2025-10-15
**Author**: Gil Klainert
**Status**: Awaiting Approval
**Related Specification**: `005-polling-and-persistence`

## Executive Summary

This plan outlines the complete removal of WebSocket infrastructure from the Olorin platform (both backend and frontend) and replacement with polling-based real-time updates as specified in feature `005-polling-and-persistence`. The WebSocket code is being removed in favor of a more reliable, simpler polling mechanism that works in restrictive network environments and provides better state management for the investigation wizard.

### Rationale for Removal

1. **Polling Alternative Implemented**: Specification 005 provides comprehensive polling infrastructure as WebSocket alternative
2. **Network Compatibility**: Polling works in environments where WebSocket connections are blocked
3. **Simplified State Management**: Polling integrates better with wizard state persistence
4. **Reduced Complexity**: Eliminates WebSocket connection management, authentication, and error handling complexity
5. **Better Debugging**: Polling provides clearer request/response patterns for troubleshooting

## Scope of Changes

### Backend Files to Remove (9 files)

1. **`olorin-server/app/router/websocket_router.py`** (116 lines)
   - Main WebSocket router with 2 endpoints: `/ws/{investigation_id}` and `/ws/rag/{investigation_id}`
   - WebSocket authentication logic
   - Connection management

2. **`olorin-server/app/service/websocket_manager.py`** (103 lines)
   - WebSocketManager class with connection pooling
   - Progress broadcast functionality
   - Agent result broadcasting

3. **`olorin-server/app/service/agent/websocket_streaming_service.py`**
   - Agent streaming via WebSocket
   - Real-time agent progress updates

4. **`olorin-server/app/service/agent/websocket_auth_fix.py`**
   - WebSocket authentication fixes
   - Token validation logic

5. **`olorin-server/app/service/rag_websocket_manager.py`**
   - RAG-specific WebSocket manager
   - RAG event broadcasting

6. **`olorin-server/app/service/rag_websocket_integration.py`**
   - RAG WebSocket integration layer
   - Event routing to WebSocket connections

7. **`olorin-server/app/service/rag_websocket_hooks.py`**
   - RAG WebSocket lifecycle hooks
   - Connection event handlers

8. **`olorin-server/app/router/handlers/websocket_handler.py`**
   - Generic WebSocket handler utilities
   - Connection state management

9. **`olorin-server/app/router/handlers/orchestrator_websocket.py`**
   - Orchestrator-specific WebSocket handler
   - Multi-agent coordination via WebSocket

### Frontend Files to Remove/Modify (5+ files)

1. **`olorin-front/src/shared/hooks/useInvestigationWebSocket.ts`** (205 lines)
   - Custom React hook for WebSocket connection
   - Message handling and auto-reconnection
   - **Action**: DELETE (functionality replaced by polling hook)

2. **`olorin-front/src/shared/services/websocketManager.ts`**
   - WebSocket connection manager
   - Connection pooling and lifecycle management
   - **Action**: DELETE

3. **`olorin-front/src/shared/events/websocket-manager.ts`**
   - Event system WebSocket manager
   - Event routing through WebSocket
   - **Action**: DELETE

4. **`olorin-front/src/microservices/shared/services/WebSocketService.tsx`**
   - Shared WebSocket service for microservices
   - Cross-service WebSocket communication
   - **Action**: DELETE

5. **`olorin-front/src/microservices/rag-intelligence/services/websocketService.ts`**
   - RAG-specific WebSocket service
   - RAG event subscriptions
   - **Action**: DELETE

### Backend Files to Modify (10+ files)

1. **Agent Services** - Remove WebSocket broadcasting:
   - `app/service/agent/risk_agent.py`
   - `app/service/agent/device_agent.py`
   - `app/service/agent/location_agent.py`
   - `app/service/agent/network_agent.py`
   - `app/service/agent/logs_agent.py`
   - `app/service/agent/authentication_agent.py`

2. **Orchestration Services** - Remove WebSocket updates:
   - `app/service/agent/orchestration/investigation_coordinator.py`
   - `app/service/agent/orchestration/enhanced_tool_executor.py`
   - `app/service/agent/orchestration/assistant.py`
   - `app/service/agent/structured_orchestrator.py`

3. **Router Configuration**:
   - `app/service/router/router_config.py` - Remove WebSocket router registration
   - `app/main.py` - Remove WebSocket middleware and imports

4. **Investigation Controllers**:
   - `app/router/controllers/investigation_executor_core.py` - Remove WebSocket progress updates
   - `app/router/controllers/investigation_phases.py` - Remove WebSocket event emissions
   - `app/router/controllers/investigation_completion.py` - Remove WebSocket completion notifications

### Frontend Files to Modify (15+ files)

1. **Progress Pages** - Replace WebSocket with polling:
   - `olorin-front/src/microservices/investigation/pages/ProgressPage.tsx`
   - Update to use polling hook instead of WebSocket hook

2. **Core UI Components** - Remove WebSocket dependencies:
   - `olorin-front/src/microservices/core-ui/CoreUIApp.tsx`
   - `olorin-front/src/microservices/core-ui/components/SystemStatus.tsx`
   - `olorin-front/src/microservices/core-ui/components/NotificationSystem.tsx`

3. **Event System** - Remove WebSocket adapters:
   - `olorin-front/src/shared/events/service-adapters.ts`
   - `olorin-front/src/shared/events/event-routing.ts`
   - `olorin-front/src/shared/events/index.ts`
   - `olorin-front/src/shared/events/eventBus.ts`

4. **Service Files** - Remove WebSocket integration:
   - `olorin-front/src/microservices/investigation/services/investigationService.ts`
   - `olorin-front/src/microservices/agent-analytics/services/agentAnalyticsService.ts`
   - `olorin-front/src/microservices/rag-intelligence/services/index.ts`
   - `olorin-front/src/microservices/visualization/services/visualizationService.ts`
   - `olorin-front/src/microservices/reporting/services/reportingService.ts`

5. **Hooks** - Remove WebSocket hook exports:
   - `olorin-front/src/shared/hooks/index.ts`
   - Remove `useInvestigationWebSocket` export

### Configuration Changes

1. **Backend Environment Variables** - Remove:
   ```bash
   # REMOVE these variables
   WEBSOCKET_AUTH_REQUIRED=true
   WEBSOCKET_HEARTBEAT_INTERVAL=30
   WEBSOCKET_MAX_CONNECTIONS_PER_INVESTIGATION=10
   ```

2. **Frontend Environment Variables** - Remove:
   ```bash
   # REMOVE these variables
   REACT_APP_WS_URL=wss://api.olorin.com
   REACT_APP_WS_BASE_URL=wss://localhost:8090
   REACT_APP_FEATURE_ENABLE_WEBSOCKET=true
   REACT_APP_WS_RECONNECT_INTERVAL=3000
   REACT_APP_WS_MAX_RECONNECT_ATTEMPTS=5
   ```

3. **Add Polling Configuration** (per spec 005):
   ```bash
   # Backend polling configuration
   WIZARD_POLLING_FAST_INTERVAL_MS=500
   WIZARD_POLLING_NORMAL_INTERVAL_MS=2000
   WIZARD_POLLING_SLOW_INTERVAL_MS=5000
   WIZARD_POLLING_MAX_RETRIES=3

   # Frontend polling configuration
   REACT_APP_POLLING_FAST_INTERVAL_MS=500
   REACT_APP_POLLING_NORMAL_INTERVAL_MS=2000
   REACT_APP_POLLING_SLOW_INTERVAL_MS=5000
   REACT_APP_FEATURE_ENABLE_POLLING=true
   ```

### Tests to Remove/Modify (10+ files)

1. **Backend WebSocket Tests** - REMOVE:
   - `tests/endpoints/test_websocket_endpoints.py`
   - `test/integration/test_orchestrator_integration.py` (WebSocket test sections)
   - `scripts/testing/websocket_auth_patch.py`

2. **Frontend WebSocket Tests** - REMOVE:
   - `tests/contract/test_websocket_events.ts`
   - `tests/contract/test_websocket_connection.ts`
   - `src/shared/testing/integration-setup.ts` (WebSocket mock sections)

3. **Integration Tests** - MODIFY to use polling:
   - `olorin-front/src/microservices/investigation/__tests__/integration/WizardFlow.integration.test.tsx`
   - `olorin-front/src/microservices/investigation/__tests__/integration/ProgressPage.integration.test.tsx`

### Documentation Updates (30+ files)

1. **API Documentation** - Remove WebSocket endpoints:
   - `docs/api/OLORIN_API_Documentation.md`
   - `olorin-server/docs/api/websocket_example_responses.md` - DELETE
   - `olorin-server/docs/api/OLORIN_API_Documentation.md`

2. **Architecture Documentation** - Update diagrams:
   - `docs/architecture/olorin-architecture.md`
   - `docs/architecture/olorin-front-architecture.md`
   - Remove WebSocket components from architecture diagrams

3. **Frontend Documentation**:
   - `docs/frontend/FRONTEND_POLLING_SPECIFICATION.md` - Already exists! ✓
   - `olorin-front/CLAUDE.md` - Remove WebSocket references
   - Update with polling-only approach

4. **Specification Documents**:
   - `specs/001-refactoring-the-frontend/contracts/websocket-events.yaml` - DELETE
   - `specs/002-verify-and-plan/contracts/websocket-events.ts` - DELETE
   - `specs/004-new-olorin-frontend/spec.md` - Remove WebSocket sections
   - `specs/005-polling-and-persistence/spec.md` - Already covers polling! ✓

5. **Cleanup Status Documents**:
   - `olorin-front/LEGACY_CLEANUP_STATUS.md` - Update to note WebSocket removal
   - `olorin-front/PHASE2_EVENT_SYSTEM_CLEANUP_COMPLETE.md` - Update for WebSocket removal
   - `olorin-front/LEGACY_RETIREMENT.md` - Document WebSocket as retired

## Replacement Strategy: Polling-Based Updates

Per specification `005-polling-and-persistence`, polling will replace WebSocket for all real-time updates:

### Backend Polling Endpoints (Already Specified in 005)

```python
# Investigation state polling
GET /api/v1/wizard/{investigation_id}/poll
  - Returns: Current investigation state with incremental updates
  - Adaptive interval: 500ms (active) → 2000ms (normal) → 5000ms (idle)
  - Includes: phase, progress, logs, agent status, results

# Investigation status polling
GET /api/v1/wizard/{investigation_id}/status
  - Returns: High-level status for lightweight polling
  - Used for: Connection health checks, status bar updates
```

### Frontend Polling Hook (To Be Implemented)

```typescript
// Replace useInvestigationWebSocket with useInvestigationPolling
export const useInvestigationPolling = (
  investigationId: string | null,
  interval: 'fast' | 'normal' | 'slow' = 'normal'
): InvestigationPollingResult => {
  // Polling logic with adaptive intervals
  // Exponential backoff on errors
  // Automatic transition between polling speeds
  // State synchronization with wizard store
};
```

### Migration Path: WebSocket → Polling

1. **Progress Updates**:
   - **Before**: WebSocket event `progress_update` with phase/progress
   - **After**: Polling endpoint returns `{ phase, progress, message }`

2. **Log Entries**:
   - **Before**: WebSocket event `log_entry` with level/message/timestamp
   - **After**: Polling endpoint returns `logs: [{ level, message, timestamp }]` (incremental)

3. **Tool Execution**:
   - **Before**: WebSocket events `tool_execution_started` / `tool_execution_completed`
   - **After**: Polling endpoint returns `tools: [{ name, status, startTime, endTime }]`

4. **Investigation Completion**:
   - **Before**: WebSocket event `investigation_completed` with results
   - **After**: Polling detects `status: 'completed'` and fetches results

5. **Error Handling**:
   - **Before**: WebSocket event `investigation_failed` with error
   - **After**: Polling detects `status: 'failed'` with error details

## Implementation Phases

### Phase 1: Backend Infrastructure Cleanup (3-4 hours)

**Tasks:**
1. Remove WebSocket router from FastAPI application
2. Delete WebSocket manager services
3. Remove WebSocket imports from agent services
4. Remove WebSocket broadcasting calls from orchestrators
5. Remove WebSocket authentication middleware
6. Update router configuration
7. Run backend tests to ensure no breakage

**Validation:**
- Backend starts without errors
- All API endpoints functional (non-WebSocket)
- Agent services execute without WebSocket dependencies
- No WebSocket-related imports remain

### Phase 2: Frontend WebSocket Removal (2-3 hours)

**Tasks:**
1. Delete WebSocket hook (`useInvestigationWebSocket.ts`)
2. Delete WebSocket services and managers
3. Remove WebSocket event adapters from event system
4. Remove WebSocket integration from microservices
5. Update component imports to remove WebSocket dependencies
6. Run frontend build to catch import errors

**Validation:**
- Frontend builds successfully
- No WebSocket-related imports
- Components compile without WebSocket dependencies
- TypeScript type checking passes

### Phase 3: Configuration Updates (1 hour)

**Tasks:**
1. Remove WebSocket environment variables from `.env` files
2. Add polling configuration variables
3. Update `env.config.ts` to remove WebSocket config
4. Update Webpack configuration to remove WebSocket URLs
5. Update Pydantic configuration schemas

**Validation:**
- Configuration validation passes on startup
- No WebSocket environment variables referenced
- Polling configuration properly loaded

### Phase 4: Test Suite Updates (2-3 hours)

**Tasks:**
1. Delete WebSocket-specific test files
2. Update integration tests to remove WebSocket mocks
3. Remove WebSocket test setup code
4. Update test documentation
5. Run full test suite

**Validation:**
- All tests pass (excluding removed WebSocket tests)
- No WebSocket test fixtures remain
- Test coverage maintained for polling functionality

### Phase 5: Documentation Updates (2-3 hours)

**Tasks:**
1. Remove WebSocket endpoint documentation
2. Update architecture diagrams (remove WebSocket components)
3. Delete WebSocket contract specifications
4. Update CLAUDE.md files to remove WebSocket references
5. Update specification documents
6. Create migration guide for users/developers

**Validation:**
- No WebSocket references in documentation
- Architecture diagrams reflect polling architecture
- Migration guide complete and accurate

### Phase 6: Code Review & Quality Assurance (1-2 hours)

**Tasks:**
1. Run code-reviewer subagent on all changes
2. Verify no hardcoded values introduced
3. Ensure configuration-driven approach maintained
4. Check for any missed WebSocket references
5. Validate SYSTEM MANDATE compliance

**Validation:**
- Code review passes all checks
- No SYSTEM MANDATE violations
- All configuration externalized
- No WebSocket code remains

## Rollback Strategy

If issues arise during or after WebSocket removal:

1. **Immediate Rollback**: Revert to pre-removal commit on feature branch
2. **Partial Rollback**: Cherry-pick specific fixes while keeping WebSocket removed
3. **Polling Issues**: Fix polling implementation without restoring WebSocket
4. **Documentation Rollback**: Restore WebSocket documentation if needed for reference

**Rollback Commands:**
```bash
# Revert entire feature branch
git checkout main
git branch -D 006-websocket-removal

# Partial rollback (revert specific commits)
git revert <commit-hash>

# Restore specific file
git checkout HEAD~1 -- path/to/file
```

## Risk Assessment

### High Risk Areas

1. **Real-Time Updates**: Investigation progress updates must work seamlessly with polling
   - **Mitigation**: Thorough testing of polling hook with various scenarios
   - **Fallback**: Polling intervals configurable for fine-tuning

2. **Performance**: Polling may increase server load compared to WebSocket
   - **Mitigation**: Adaptive polling intervals reduce load during idle periods
   - **Monitoring**: Track API response times and server CPU usage

3. **User Experience**: Users accustomed to instant WebSocket updates
   - **Mitigation**: Fast polling (500ms) provides near-real-time experience
   - **Communication**: Update user documentation about polling-based updates

### Medium Risk Areas

1. **Multi-tab Synchronization**: Polling from multiple tabs increases requests
   - **Mitigation**: Browser tab coordination via shared workers or local storage
   - **Limit**: Max 5 concurrent polling connections per user

2. **Network Reliability**: Polling requires stable HTTP connections
   - **Mitigation**: Exponential backoff and retry logic handles network issues
   - **Monitoring**: Track polling error rates

### Low Risk Areas

1. **Backend API Changes**: Polling endpoints already specified in 005
2. **Frontend Architecture**: Polling hook structure mirrors WebSocket hook
3. **Configuration**: All configuration externalized per SYSTEM MANDATE

## Success Criteria

### Functional Requirements

- ✅ All WebSocket code removed from backend (0 WebSocket imports)
- ✅ All WebSocket code removed from frontend (0 WebSocket imports)
- ✅ Investigation progress updates work via polling with <2s latency
- ✅ Log streaming functional with polling-based updates
- ✅ Agent status updates display correctly via polling
- ✅ Investigation completion detected via polling
- ✅ Error states handled properly with polling
- ✅ Configuration fully externalized (no hardcoded values)

### Performance Requirements

- ✅ Polling latency <2 seconds for active investigations
- ✅ Server handles 1000 concurrent polling connections per server
- ✅ Polling adapts correctly: fast (500ms) → normal (2s) → slow (5s)
- ✅ CPU usage increase <10% compared to WebSocket baseline

### Quality Requirements

- ✅ All tests pass (excluding removed WebSocket tests)
- ✅ Build succeeds without errors or warnings
- ✅ TypeScript type checking passes
- ✅ Code review passes all checks
- ✅ SYSTEM MANDATE compliance verified
- ✅ No TODO/FIXME/MOCK/STUB patterns introduced

### Documentation Requirements

- ✅ All WebSocket references removed from documentation
- ✅ Architecture diagrams updated to reflect polling
- ✅ API documentation current with polling endpoints
- ✅ Migration guide created for developers
- ✅ User documentation updated

## Timeline Estimate

- **Phase 1** (Backend): 3-4 hours
- **Phase 2** (Frontend): 2-3 hours
- **Phase 3** (Configuration): 1 hour
- **Phase 4** (Tests): 2-3 hours
- **Phase 5** (Documentation): 2-3 hours
- **Phase 6** (Review): 1-2 hours

**Total Estimated Time**: 11-16 hours (1.5-2 working days)

## Dependencies

1. **Specification 005**: Polling infrastructure must be in place before WebSocket removal
2. **Polling Endpoints**: Backend polling endpoints must be implemented and tested
3. **Polling Hook**: Frontend polling hook must be implemented as WebSocket replacement
4. **Feature Flags**: Configuration must support polling feature flags

## Open Questions

1. ✅ **Polling specification complete?** YES - Specification 005 provides complete polling design
2. ❓ **Polling endpoints implemented?** UNKNOWN - Need to verify backend implementation status
3. ❓ **Frontend polling hook exists?** UNKNOWN - Need to check for existing implementation
4. ❓ **Backward compatibility needed?** UNKNOWN - Clarify with user if gradual migration required
5. ❓ **Timeline for removal?** UNKNOWN - Awaiting user approval and scheduling

## Next Steps

1. **USER APPROVAL REQUIRED**: This plan must be approved before implementation
2. **Create feature branch**: `006-websocket-removal` via git-expert subagent
3. **Verify polling infrastructure**: Check status of spec 005 implementation
4. **Begin Phase 1**: Backend WebSocket removal after approval
5. **Incremental commits**: Commit after each phase with clear messages

---

**Status**: ⏳ AWAITING USER APPROVAL

**Approval Checklist**:
- [ ] Plan reviewed and approved by user
- [ ] Timeline acceptable
- [ ] Risk mitigation strategies approved
- [ ] Rollback strategy understood
- [ ] Ready to create feature branch

**Once approved, the following command will be executed:**
```bash
# Via git-expert subagent
git checkout -b 006-websocket-removal
```
