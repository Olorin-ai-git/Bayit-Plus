# Contract: Investigation Log Manager

## Purpose

Defines the interface for managing investigation-specific logging lifecycle.

## Module

`app.service.logging.investigation_log_manager`

## Class

`InvestigationLogManager`

## Constructor

```python
def __init__(self, unified_logging_core: UnifiedLoggingCore) -> None
```

**Parameters**:
- `unified_logging_core` (UnifiedLoggingCore): Instance of unified logging core

**Behavior**:
- Stores reference to unified logging core
- Maintains registry of active investigation handlers
- Thread-safe handler management

## Methods

### `start_investigation_logging(investigation_id: str, metadata: Dict[str, Any], investigation_folder: Path) -> InvestigationLogHandler`

Start logging for an investigation.

**Parameters**:
- `investigation_id` (str): Investigation identifier (required)
- `metadata` (Dict[str, Any]): Investigation metadata from frontend (required)
- `investigation_folder` (Path): Path to investigation folder (required)

**Returns**: InvestigationLogHandler instance

**Raises**:
- `ValueError`: If investigation_id is empty or investigation_folder is invalid
- `OSError`: If log file cannot be created

**Behavior**:
1. Validates investigation_id and investigation_folder
2. Sets investigation context using contextvars
3. Creates InvestigationLogHandler
4. Configures handler with unified logging format
5. Adds handler to UnifiedLoggingCore
6. Logs initial metadata as first entry
7. Registers handler in manager's registry
8. Returns handler instance

**Example**:
```python
from app.service.logging.investigation_log_manager import InvestigationLogManager
from app.service.logging.unified_logging_core import UnifiedLoggingCore

manager = InvestigationLogManager(UnifiedLoggingCore())
handler = manager.start_investigation_logging(
    investigation_id="inv-123",
    metadata={
        "entity_id": "user-456",
        "entity_type": "user_id",
        "investigation_type": "structured"
    },
    investigation_folder=investigation_folder
)
```

### `stop_investigation_logging(investigation_id: str, handler: InvestigationLogHandler) -> None`

Stop logging for an investigation.

**Parameters**:
- `investigation_id` (str): Investigation identifier
- `handler` (InvestigationLogHandler): Handler instance to stop

**Returns**: None

**Behavior**:
1. Removes handler from UnifiedLoggingCore
2. Closes handler and flushes logs
3. Clears investigation context
4. Removes handler from registry

**Example**:
```python
manager.stop_investigation_logging("inv-123", handler)
```

### `log_initial_metadata(investigation_id: str, metadata: Dict[str, Any]) -> None`

Log initial investigation metadata as first entry in investigation.log.

**Parameters**:
- `investigation_id` (str): Investigation identifier
- `metadata` (Dict[str, Any]): Investigation metadata from frontend

**Returns**: None

**Behavior**:
- Creates log entry with level INFO
- Includes all metadata fields
- Formats according to unified logging format
- Writes to investigation.log file

**Log Entry Structure**:
```json
{
  "investigation_id": "inv-123",
  "timestamp": "2025-01-11T12:00:00Z",
  "level": "INFO",
  "logger": "app.service.logging.investigation_log_manager",
  "message": "Investigation started",
  "metadata": {
    "investigation_id": "inv-123",
    "entity_id": "user-456",
    "entity_type": "user_id",
    "investigation_type": "structured",
    "lifecycle_stage": "IN_PROGRESS",
    "status": "IN_PROGRESS",
    ...
  }
}
```

## Integration Points

### With InvestigationFolderManager

```python
from app.service.logging.investigation_folder_manager import get_folder_manager

folder_manager = get_folder_manager()
investigation_folder, _ = folder_manager.create_investigation_folder(
    investigation_id=investigation_id,
    mode=InvestigationMode.LIVE,
    config=config
)

manager.start_investigation_logging(
    investigation_id=investigation_id,
    metadata=metadata,
    investigation_folder=investigation_folder
)
```

### With Investigation Controller

```python
# In investigation_controller.py
from app.service.logging.investigation_log_manager import InvestigationLogManager
from app.service.logging.unified_logging_core import UnifiedLoggingCore

manager = InvestigationLogManager(UnifiedLoggingCore())

# At investigation start
handler = manager.start_investigation_logging(
    investigation_id=investigation_id,
    metadata=request.metadata or {},
    investigation_folder=investigation_folder
)

# Store handler for cleanup
active_handlers[investigation_id] = handler

# At investigation end
if investigation_id in active_handlers:
    manager.stop_investigation_logging(
        investigation_id,
        active_handlers[investigation_id]
    )
    del active_handlers[investigation_id]
```

## Error Handling

- Log file creation failures are logged and handler creation returns None
- Investigation execution continues even if logging fails
- Handler errors are caught and logged to unified logging system

## Thread Safety

- Handler registry is thread-safe
- Multiple investigations can be started/stopped concurrently
- Context management is thread-safe (contextvars)

## Performance

- Handler creation: <100ms (SC-002)
- Log entry overhead: <10ms per entry (SC-007)
- Non-blocking operations

