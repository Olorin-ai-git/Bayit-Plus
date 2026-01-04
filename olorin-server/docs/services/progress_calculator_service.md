# Progress Calculator Service

**Feature**: 001-investigation-state-management
**Location**: `/app/service/progress_calculator_service.py`
**Status**: Production

## Service Purpose

Calculates investigation progress based on phase and tool execution status. Uses weighted average across phases for overall progress percentage.

## Class: ProgressCalculatorService

Stateless service for progress calculations.

### Configuration

```python
class ProgressCalculatorService:
    # Number of investigation phases
    PHASE_COUNT = 5
```

---

## Public Methods

### calculate_investigation_progress()

```python
def calculate_investigation_progress(
    self, investigation_state: Dict[str, Any]
) -> Dict[str, Any]:
    """Calculate overall investigation progress from state data."""
```

**Parameters**:
- `investigation_state` (Dict): Investigation state with progress data
  - `investigation_id` (str): Investigation identifier
  - `progress` (dict): Phase and tool progress data
    - `phases` (dict): Phase status by phase name
    - `tools` (dict): Tool execution status

**Returns**: Dict with:
- `current_phase` (str | None): Currently executing phase
- `progress_percentage` (float): Overall progress 0-100
- `phase_progress` (dict): Progress by phase

**Algorithm**:
1. Extract progress data from state
2. Calculate phase progress (weighted by tool completion)
3. Aggregate to overall progress
4. Identify current phase

**Usage Example**:
```python
from app.service.progress_calculator_service import ProgressCalculatorService

service = ProgressCalculatorService()

investigation_state = {
    "investigation_id": "inv-123",
    "progress": {
        "phases": {
            "data_collection": {"status": "completed", "progress": 100},
            "analysis": {"status": "in_progress", "progress": 50},
            "verification": {"status": "queued", "progress": 0},
            "reporting": {"status": "queued", "progress": 0},
            "remediation": {"status": "queued", "progress": 0}
        },
        "tools": {
            "splunk_logs": {"status": "completed"},
            "device_fingerprint": {"status": "in_progress"},
            "network_analysis": {"status": "queued"}
        }
    }
}

result = service.calculate_investigation_progress(investigation_state)
# Returns:
# {
#     "current_phase": "analysis",
#     "progress_percentage": 30.0,  # (100 + 50 + 0 + 0 + 0) / 5
#     "phase_progress": {...}
# }
```

---

## Progress Calculation Formula

### Phase Progress

Each phase contributes equally to total progress:
- Phase weight = 1 / PHASE_COUNT (20% for 5 phases)
- Phase progress = sum(tool progress in phase) / tool count in phase

### Tool Progress

- Queued/Pending: 0%
- Running/In Progress: 50%
- Completed: 100%
- Failed: 100% (counts toward completion)

### Overall Progress

```
overall_progress = sum(phase_progress * phase_weight for phase in phases)
```

**Example**: 5-phase investigation with 2/5 phases completed
- Phases 1-2: 100% each = 40 points
- Phases 3-5: 0% each = 0 points
- Total: 40 / 100 = 40%

---

## Performance Characteristics

- **Time Complexity**: O(p + t) where p = phases, t = tools
- **Memory**: O(1) constant overhead
- **Calculation**: ~1ms for typical investigation

## Error Handling

### Missing Progress Data

```python
if not progress_data:
    return {
        "current_phase": None,
        "progress_percentage": 0.0,
        "phase_progress": {}
    }
```

### Invalid Phase Status

Handles unexpected status values gracefully:
- Unknown statuses treated as 0% progress
- Continues calculation with available data

### Logging

```python
logger.debug(
    "calculate_investigation_progress_started",
    extra={
        "investigation_id": investigation_id,
        "operation": "calculate_progress"
    }
)

logger.info(
    "progress_calculated",
    extra={
        "investigation_id": investigation_id,
        "progress_percentage": progress_percentage,
        "current_phase": current_phase
    }
)
```

---

## Configuration Options

**No direct configuration** - Calculation formula is algorithmic.

**Derived Configuration**:
- `PHASE_COUNT`: Adjustable constant (currently 5)
- Tool status mappings: Queued=0%, Running=50%, Completed=100%

---

## Integration Points

### With Frontend

Progress data sent to frontend via:
```python
{
    "investigation_id": "inv-123",
    "progress": 35.0,
    "current_phase": "analysis",
    "phase_progress": {
        "data_collection": 100,
        "analysis": 50,
        "verification": 0,
        "reporting": 0,
        "remediation": 0
    }
}
```

### With Event Feed

Progress updated from events:
```python
# When tool completes
event = InvestigationEvent(
    entity_type=EntityType.TOOL_EXECUTION,
    operation=OperationType.UPDATE,
    data={"tool": "splunk_logs", "status": "completed"}
)

# Progress calculator recomputes from updated state
```

### With Investigation State

Reads from investigation state document:
- Phase execution status
- Tool execution results
- Current lifecycle stage

---

## Testing

```python
import pytest
from app.service.progress_calculator_service import ProgressCalculatorService

def test_initial_progress():
    service = ProgressCalculatorService()
    state = {"investigation_id": "inv-1", "progress": {}}

    result = service.calculate_investigation_progress(state)

    assert result["progress_percentage"] == 0.0
    assert result["current_phase"] is None

def test_half_completed():
    service = ProgressCalculatorService()
    state = {
        "investigation_id": "inv-1",
        "progress": {
            "phases": {
                "phase1": {"progress": 100},
                "phase2": {"progress": 100},
                "phase3": {"progress": 0},
                "phase4": {"progress": 0},
                "phase5": {"progress": 0}
            }
        }
    }

    result = service.calculate_investigation_progress(state)

    assert result["progress_percentage"] == 40.0  # 2/5 * 100

def test_current_phase_detection():
    service = ProgressCalculatorService()
    state = {
        "investigation_id": "inv-1",
        "progress": {
            "phases": {
                "phase1": {"status": "completed", "progress": 100},
                "phase2": {"status": "in_progress", "progress": 50},
                "phase3": {"status": "queued", "progress": 0},
                "phase4": {"status": "queued", "progress": 0},
                "phase5": {"status": "queued", "progress": 0}
            }
        }
    }

    result = service.calculate_investigation_progress(state)

    assert result["current_phase"] == "phase2"
```

---

## Related Services

- **investigation_progress_service.py**: Higher-level progress management
- **progress_update_service.py**: Updates progress from tool results
- **event_feed_service.py**: Provides events that trigger progress updates

---
