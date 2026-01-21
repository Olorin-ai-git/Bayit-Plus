# Agent Detail Modal - Backend Data Requirements

**Issue**: Agent Detail Modal displays incomplete data (N/A execution times, 0 findings, no AI analysis)

**Root Cause**: Backend `/investigation-state/{id}/progress` endpoint returns only tool **names** as strings instead of full tool **execution objects**.

## Current Backend Response

```json
{
  "investigation_id": "...",
  "tools_executed": ["network:database_query"],  // ❌ Just strings
  "status": "IN_PROGRESS"
}
```

## Required Backend Response

The backend needs to send `tool_executions` as an array of **objects** with full execution details:

```json
{
  "investigation_id": "...",
  "tool_executions": [  // ✅ Full objects
    {
      "id": "uuid-123",
      "tool_name": "network:database_query",
      "agent_type": "network",
      "agent_id": "network_agent_1",
      "status": "completed",
      "queued_at": "2025-01-15T10:00:00Z",
      "started_at": "2025-01-15T10:00:01Z",
      "completed_at": "2025-01-15T10:00:05Z",
      "execution_time_ms": 4000,
      "description": "Query network database for device connections",
      "risk_contribution": 15,

      // ⭐ CRITICAL: These fields are needed for modal display
      "findings": [
        {
          "type": "suspicious_connection",
          "description": "Multiple failed connection attempts from unusual location"
        }
      ],
      "llm_thoughts": "The agent detected suspicious network patterns...",

      "result": { /* tool output */ },
      "error": null,
      "retry_count": 0,
      "max_retries": 3
    }
  ],
  "status": "IN_PROGRESS"
}
```

## Frontend Mapping

The frontend `mapToolExecutions()` function already handles mapping from backend format:

- `tool_executions` → `toolExecutions` (array of objects) ✅
- `tools_executed` → fallback to minimal objects ⚠️ (current behavior)

## Fields Used by Agent Detail Modal

### ToolExecutionsList Component
- `executionTime` / `execution_time_ms` - Shows execution duration
- `findings` / `results` - Array of findings detected
- `llm_thoughts` / `thoughts` / `analysis` - AI analysis text
- `risk_contribution` - Risk impact score
- `description` - Tool description

### AgentMetricsGrid Component
- `executionTime` - Average execution time calculation

### AgentAIAnalysisSection Component
- Agent-level `llm_thoughts` / `thoughts` / `analysis`

## Backend API Changes Required

### Endpoint: `GET /investigation-state/{id}/progress`

**Change**: Replace `tools_executed` (string array) with `tool_executions` (object array)

**Python Backend Example**:
```python
# ❌ Current (incomplete)
progress_data = {
    "tools_executed": [tool.name for tool in executions]
}

# ✅ Required (complete)
progress_data = {
    "tool_executions": [
        {
            "id": str(tool.id),
            "tool_name": tool.name,
            "agent_type": tool.agent.type,
            "agent_id": str(tool.agent.id),
            "status": tool.status,
            "queued_at": tool.queued_at.isoformat(),
            "started_at": tool.started_at.isoformat() if tool.started_at else None,
            "completed_at": tool.completed_at.isoformat() if tool.completed_at else None,
            "execution_time_ms": tool.execution_time_ms,
            "description": tool.description,
            "risk_contribution": tool.risk_score,
            "findings": [
                {
                    "type": f.type,
                    "description": f.description
                }
                for f in tool.findings
            ],
            "llm_thoughts": tool.llm_analysis,
            "result": tool.result_data,
            "error": tool.error_message,
            "retry_count": tool.retry_count,
            "max_retries": tool.max_retries
        }
        for tool in executions
    ]
}
```

## Testing

After backend changes:

1. Run investigation
2. Open Agent Detail Modal
3. Verify displays:
   - ✅ Execution times (not "N/A")
   - ✅ Findings count and list (not "0 detected")
   - ✅ Risk Impact score (not "0/100")
   - ✅ AI Analysis section (if LLM thoughts available)

## Status

- **Frontend**: ✅ Ready (data mapping implemented)
- **Backend**: ❌ Needs update (send full tool execution objects)
- **Priority**: High (impacts agent analysis visibility)

## Related Files

**Frontend**:
- `/src/microservices/investigation/services/dataAdapters/progressMappers.ts` - Data mapping
- `/src/microservices/investigation/components/AgentDetailModal/` - Modal components
- `/src/shared/types/AgentRiskGauges.ts` - Type definitions

**Backend** (needs update):
- Investigation state/progress endpoint
- Tool execution data serialization
- LLM analysis persistence

---

**Created**: 2025-01-15
**Author**: Claude Code (Frontend Implementation)
**Next Action**: Backend team to implement full tool_executions response
