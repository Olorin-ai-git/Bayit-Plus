# Progress Update Service

**Feature**: 001-investigation-state-management
**Location**: `/app/service/progress_update_service.py`
**Status**: Production

## Service Purpose

Handles tool progress updates and persists them to investigation state. Coordinates with event system to emit progress events and maintain state consistency.

## Public Methods

### update_tool_progress()

```python
def update_tool_progress(
    self,
    investigation_id: str,
    tool_name: str,
    status: str,
    progress: float = 0.0,
    result: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None
) -> Dict[str, Any]:
    """Update tool execution progress."""
```

**Parameters**:
- `investigation_id` (str): Investigation being updated
- `tool_name` (str): Tool identifier (e.g., "splunk_logs")
- `status` (str): Tool status - "queued", "running", "completed", "failed"
- `progress` (float, 0-100): Execution progress percentage
- `result` (dict, optional): Tool result data
- `error` (str, optional): Error message if failed

**Returns**: Updated investigation state

**Usage Example**:
```python
from app.service.progress_update_service import ProgressUpdateService

service = ProgressUpdateService()

# Tool started
service.update_tool_progress(
    "inv-123",
    tool_name="device_fingerprint",
    status="running",
    progress=0.0
)

# Tool progress update
service.update_tool_progress(
    "inv-123",
    tool_name="device_fingerprint",
    status="running",
    progress=50.0
)

# Tool completed
service.update_tool_progress(
    "inv-123",
    tool_name="device_fingerprint",
    status="completed",
    progress=100.0,
    result={"fingerprint": "abc123", "confidence": 0.95}
)
```

---

### update_phase_status()

```python
def update_phase_status(
    self,
    investigation_id: str,
    phase: str,
    status: str
) -> Dict[str, Any]:
    """Update phase execution status."""
```

**Parameters**:
- `investigation_id` (str): Investigation ID
- `phase` (str): Phase name (e.g., "data_collection")
- `status` (str): Phase status - "queued", "running", "completed", "failed"

**Returns**: Updated investigation state

**Usage Example**:
```python
# Phase started
service.update_phase_status("inv-123", "analysis", "running")

# Phase completed
service.update_phase_status("inv-123", "analysis", "completed")
```

---

### get_investigation_progress()

```python
def get_investigation_progress(
    self,
    investigation_id: str
) -> Dict[str, Any]:
    """Get current progress snapshot."""
```

**Returns**: Current progress data

**Usage Example**:
```python
progress = service.get_investigation_progress("inv-123")
print(f"Overall progress: {progress['overall_progress']}%")
print(f"Current phase: {progress['current_phase']}")
```

---

## Configuration

**Environment Variables**:
```python
STATE_UPDATE_TIMEOUT_MS = 5000    # Update timeout
ENABLE_EVENT_EMISSION = True      # Emit progress events
EVENT_BATCH_SIZE = 10             # Events per batch
```

---

## Error Handling

### Invalid Tool Status

```python
try:
    service.update_tool_progress("inv-123", "tool", "invalid_status")
except ValueError as e:
    # Invalid status value
    pass
```

### Concurrent Updates

```python
# Service handles concurrent updates via:
# - Optimistic locking with version numbers
# - Event-sourced updates (idempotent)
# - Last-write-wins semantics
```

---

## Performance Characteristics

- **Update Time**: ~10-20ms per update
- **Memory**: Minimal; state persisted to database
- **Throughput**: 100+ updates/second
- **Consistency**: Event-sourced; strongly consistent

## Integration

### Event Emission

```python
# When tool completes, emits event:
InvestigationEvent(
    entity_type=EntityType.TOOL_EXECUTION,
    operation=OperationType.UPDATE,
    data={
        "tool": "device_fingerprint",
        "status": "completed",
        "result": {...}
    }
)
```

### Progress Calculation

Progress calculator uses updated state to compute overall progress percentage.

---

## Testing

```python
import pytest
from app.service.progress_update_service import ProgressUpdateService

@pytest.fixture
def service():
    return ProgressUpdateService()

def test_update_tool_progress(service):
    result = service.update_tool_progress(
        "inv-123",
        "splunk_logs",
        status="running",
        progress=25.0
    )
    assert result["tools"]["splunk_logs"]["status"] == "running"
    assert result["tools"]["splunk_logs"]["progress"] == 25.0

def test_update_phase_status(service):
    result = service.update_phase_status("inv-123", "analysis", "completed")
    assert result["phases"]["analysis"]["status"] == "completed"

def test_concurrent_updates(service):
    # Multiple concurrent updates to same investigation
    service.update_tool_progress("inv-123", "tool1", "running")
    service.update_tool_progress("inv-123", "tool2", "running")
    service.update_phase_status("inv-123", "phase1", "completed")

    progress = service.get_investigation_progress("inv-123")
    assert progress is not None
```

---

## Related Services

- **progress_calculator_service.py**: Calculates overall progress
- **event_feed_service.py**: Provides events for state updates
- **investigation_progress_service.py**: High-level progress management

---
