# Tool Execution Persistence & Progress API Integration Plan

**Author**: Gil Klainert
**Date**: 2025-11-03
**Status**: 🔄 PENDING IMPLEMENTATION

## Executive Summary

After comprehensive codebase analysis, the investigation system has the following components:
- ✅ Progress endpoint EXISTS at `/investigations/{investigation_id}/progress`
- ✅ State persistence EXISTS via InvestigationState model
- ✅ Tool executions ARE being logged via structured_investigation_logger
- ❌ **CRITICAL GAP**: Tool executions are NOT persisted to database
- ❌ **CRITICAL GAP**: Progress API returns empty tool_executions array

## Current State (FACTS)

### What EXISTS:
1. **Progress Endpoint** (`app/router/investigations_router.py:107-140`)
   - Endpoint: `GET /investigations/{investigation_id}/progress`
   - Returns: InvestigationProgress model
   - Uses: InvestigationProgressService.build_progress_from_state()

2. **State Persistence** (`app/models/investigation_state.py`)
   - Database table: investigation_states
   - Columns: investigation_id, status, settings_json, progress_json, results_json
   - Lifecycle: CREATED → SETTINGS → IN_PROGRESS → COMPLETED/ERROR/CANCELLED

3. **Tool Execution Logging** (`app/service/logging/structured_investigation_logger.py`)
   - Method: log_tool_execution()
   - Stores: In-memory and file logs
   - NOT persisted to database

### What's MISSING:
1. Tool executions are logged but never saved to database
2. Progress service returns hardcoded empty array for tool_executions
3. No connection between structured_investigation_logger and database persistence
4. State changes don't immediately update tool execution data

## Implementation Plan

### Phase 1: Database Schema Enhancement

**Option A: Use Existing progress_json Field (RECOMMENDED)**
```python
# Store tool executions in InvestigationState.progress_json
{
    "percent_complete": 45,
    "current_phase": "network_analysis",
    "tool_executions": [
        {
            "id": "exec-uuid-1",
            "agent_name": "device_agent",
            "tool_name": "fingerprint_analyzer",
            "status": "completed",
            "started_at": "2025-11-03T10:00:00Z",
            "completed_at": "2025-11-03T10:00:02Z",
            "duration_ms": 2000,
            "input_parameters": {...},
            "output_result": {...}
        }
    ]
}
```

**Option B: Create Separate Table**
```sql
CREATE TABLE tool_executions (
    id UUID PRIMARY KEY,
    investigation_id VARCHAR(255) NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    input_parameters JSON,
    output_result JSON,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigation_states(investigation_id)
);
CREATE INDEX idx_tool_exec_investigation ON tool_executions(investigation_id);
```

### Phase 2: Create Tool Execution Persistence Service

```python
# app/service/tool_execution_service.py
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import json
from sqlalchemy.orm import Session

class ToolExecutionService:
    """Service for persisting tool executions to database"""

    def __init__(self, db: Session):
        self.db = db

    def persist_tool_execution(
        self,
        investigation_id: str,
        agent_name: str,
        tool_name: str,
        status: str,
        input_parameters: Dict[str, Any],
        output_result: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        duration_ms: Optional[int] = None
    ) -> str:
        """
        Persist tool execution to database

        Returns:
            Tool execution ID
        """
        from app.models.investigation_state import InvestigationState
        import uuid

        # Get current investigation state
        state = self.db.query(InvestigationState).filter(
            InvestigationState.investigation_id == investigation_id
        ).first()

        if not state:
            raise ValueError(f"Investigation {investigation_id} not found")

        # Parse existing progress or create new
        progress_data = json.loads(state.progress_json) if state.progress_json else {}

        # Initialize tool_executions list if not exists
        if "tool_executions" not in progress_data:
            progress_data["tool_executions"] = []

        # Create new tool execution entry
        tool_exec_id = str(uuid.uuid4())
        tool_execution = {
            "id": tool_exec_id,
            "agent_name": agent_name,
            "tool_name": tool_name,
            "status": status,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat() if status == "completed" else None,
            "duration_ms": duration_ms,
            "input_parameters": input_parameters,
            "output_result": output_result,
            "error_message": error_message
        }

        # Append to tool executions
        progress_data["tool_executions"].append(tool_execution)

        # Update progress percentage based on completed tools
        total_tools = len(progress_data["tool_executions"])
        completed_tools = sum(1 for t in progress_data["tool_executions"] if t["status"] == "completed")
        progress_data["percent_complete"] = int((completed_tools / total_tools * 100) if total_tools > 0 else 0)

        # Save back to database
        state.progress_json = json.dumps(progress_data)
        state.updated_at = datetime.now(timezone.utc)
        self.db.commit()

        return tool_exec_id

    def get_tool_executions(self, investigation_id: str) -> List[Dict[str, Any]]:
        """Get all tool executions for an investigation"""
        from app.models.investigation_state import InvestigationState

        state = self.db.query(InvestigationState).filter(
            InvestigationState.investigation_id == investigation_id
        ).first()

        if not state or not state.progress_json:
            return []

        progress_data = json.loads(state.progress_json)
        return progress_data.get("tool_executions", [])
```

### Phase 3: Integrate with Structured Investigation Logger

```python
# Modify app/service/logging/structured_investigation_logger.py
def log_tool_execution(
    self,
    investigation_id: str,
    agent_name: str,
    tool_name: str,
    tool_parameters: Dict[str, Any],
    selection_reasoning: str,
    execution_result: Dict[str, Any],
    success: bool,
    execution_time_ms: int,
    error_message: Optional[str] = None
) -> str:
    """Log tool selection reasoning and execution results"""
    interaction_id = str(uuid.uuid4())

    # ... existing logging code ...

    # NEW: Persist to database
    try:
        from app.service.tool_execution_service import ToolExecutionService
        from app.persistence.database import get_db_session

        with get_db_session() as db:
            service = ToolExecutionService(db)
            service.persist_tool_execution(
                investigation_id=investigation_id,
                agent_name=agent_name,
                tool_name=tool_name,
                status="completed" if success else "failed",
                input_parameters=tool_parameters,
                output_result=execution_result,
                error_message=error_message,
                duration_ms=execution_time_ms
            )
    except Exception as e:
        logger.error(f"Failed to persist tool execution: {e}")

    return interaction_id
```

### Phase 4: Update Progress Service

```python
# Modify app/service/investigation_progress_service.py
@staticmethod
def build_progress_from_state(state: InvestigationState) -> InvestigationProgress:
    """Build complete progress response from database investigation state"""

    # ... existing code ...

    # Parse progress data to get tool executions
    progress_data = json.loads(state.progress_json) if state.progress_json else {}
    tool_executions_data = progress_data.get("tool_executions", [])

    # Convert to ToolExecution models
    tool_executions = []
    for te in tool_executions_data:
        tool_executions.append(
            ToolExecution(
                id=te.get("id"),
                agent_name=te.get("agent_name"),
                agent_type=te.get("agent_name", "").replace("_agent", ""),
                tool_name=te.get("tool_name"),
                tool_type=te.get("tool_name"),
                status=te.get("status", "pending"),
                input=ToolExecutionInput(
                    parameters=te.get("input_parameters", {}),
                    context={}
                ),
                output=te.get("output_result"),
                error_message=te.get("error_message"),
                started_at=datetime.fromisoformat(te["started_at"]) if te.get("started_at") else None,
                completed_at=datetime.fromisoformat(te["completed_at"]) if te.get("completed_at") else None,
                duration_ms=te.get("duration_ms", 0),
                tokens_used=te.get("tokens_used", 0),
                cost=te.get("cost", 0.0)
            )
        )

    # Calculate tool statistics
    completed_tools = sum(1 for t in tool_executions if t.status == "completed")
    running_tools = sum(1 for t in tool_executions if t.status == "running")
    failed_tools = sum(1 for t in tool_executions if t.status == "failed")

    return InvestigationProgress(
        # ... existing fields ...
        tool_executions=tool_executions,  # REAL DATA instead of empty array
        total_tools=len(tool_executions),
        completed_tools=completed_tools,
        running_tools=running_tools,
        failed_tools=failed_tools,
        # ... rest of fields ...
    )
```

### Phase 5: Real-time State Updates

```python
# Add to app/router/controllers/investigation_controller.py
def update_investigation_status(
    investigation_id: str,
    updates: Dict[str, Any]
) -> None:
    """Update investigation status with immediate database persistence"""
    from app.persistence.database import get_db_session
    from app.models.investigation_state import InvestigationState
    import json

    with get_db_session() as db:
        state = db.query(InvestigationState).filter(
            InvestigationState.investigation_id == investigation_id
        ).first()

        if not state:
            return

        # Update status
        if "status" in updates:
            # Map status to lifecycle stage
            status_to_lifecycle = {
                "in_progress": "IN_PROGRESS",
                "completed": "COMPLETED",
                "failed": "ERROR",
                "cancelled": "CANCELLED"
            }
            state.status = status_to_lifecycle.get(updates["status"], state.status)

        # Update progress data
        if "current_phase" in updates:
            progress_data = json.loads(state.progress_json) if state.progress_json else {}
            progress_data["current_phase"] = updates["current_phase"]
            state.progress_json = json.dumps(progress_data)

        # Update timestamp
        state.updated_at = datetime.now(timezone.utc)

        # Persist immediately
        db.commit()
```

## Testing Plan

1. **Unit Tests**
   ```python
   # test/unit/test_tool_execution_service.py
   def test_persist_tool_execution():
       # Test persisting tool execution to database
       pass

   def test_get_tool_executions():
       # Test retrieving tool executions
       pass
   ```

2. **Integration Tests**
   ```python
   # test/integration/test_progress_api.py
   def test_progress_endpoint_returns_tool_executions():
       # Test that progress endpoint includes real tool executions
       pass
   ```

3. **End-to-End Tests**
   ```python
   # test/e2e/test_investigation_flow.py
   def test_complete_investigation_with_tool_tracking():
       # Test full investigation flow with tool execution tracking
       pass
   ```

## Migration Strategy

1. **Phase 1**: Deploy database changes (no breaking changes)
2. **Phase 2**: Deploy service layer (backward compatible)
3. **Phase 3**: Update agents to use new persistence
4. **Phase 4**: Update frontend to consume tool execution data
5. **Phase 5**: Remove old logging-only code

## Success Criteria

- ✅ Tool executions are persisted to database in real-time
- ✅ Progress API returns actual tool execution data
- ✅ State changes are immediately reflected in API responses
- ✅ No data loss during investigation execution
- ✅ Performance impact < 100ms per tool execution
- ✅ 100% backward compatibility maintained

## Risk Mitigation

1. **Database Performance**: Use batch updates for high-frequency tool executions
2. **Data Loss**: Maintain file logging as backup during transition
3. **API Compatibility**: Version the API if breaking changes needed
4. **Rollback Plan**: Feature flag to disable new persistence if issues

## Timeline

- **Day 1**: Database schema changes and migrations
- **Day 2**: Tool execution service implementation
- **Day 3**: Integration with structured logger
- **Day 4**: Progress service updates
- **Day 5**: Testing and validation
- **Day 6**: Production deployment

---

**Next Steps**:
1. Review and approve this plan
2. Create feature branch
3. Implement Phase 1 (Database Schema)
4. Proceed with incremental implementation