# Contract: Investigation Log Handler

## Purpose

Defines the interface for investigation-specific log handler that writes to `investigation.log` file.

## Module

`app.service.logging.investigation_log_handler`

## Class

`InvestigationLogHandler(logging.Handler)`

## Constructor

```python
def __init__(
    self,
    investigation_id: str,
    investigation_folder: Path,
    log_format: LogFormat = LogFormat.HUMAN,
    log_level: int = logging.DEBUG
) -> None
```

**Parameters**:
- `investigation_id` (str): Investigation identifier (required)
- `investigation_folder` (Path): Path to investigation folder (required)
- `log_format` (LogFormat): Log format - HUMAN, JSON, or STRUCTURED (default: HUMAN)
- `log_level` (int): Log level (default: logging.DEBUG)

**Raises**:
- `ValueError`: If investigation_id is empty or investigation_folder is invalid
- `OSError`: If log file cannot be created (permissions, disk space)

**Behavior**:
- Creates `investigation.log` file in investigation_folder
- Sets handler level to log_level (default: DEBUG)
- Configures formatter based on log_format
- File is created immediately (not lazy)

## Methods

### `emit(record: logging.LogRecord) -> None`

Emit log record to investigation.log file.

**Parameters**:
- `record` (logging.LogRecord): Log record to emit

**Behavior**:
- Checks if record level >= handler level
- Formats record with investigation_id prefix
- Writes to investigation.log file
- Non-blocking write (uses async or thread pool if configured)
- Handles errors gracefully (does not raise exceptions)

**Format Examples**:

Human format:
```
[inv-123] 2025-01-11 12:00:00 [DEBUG] logger_name: message
```

JSON format:
```json
{"investigation_id": "inv-123", "timestamp": "2025-01-11T12:00:00", "level": "DEBUG", "logger": "logger_name", "message": "message"}
```

### `close() -> None`

Close handler and flush logs.

**Behavior**:
- Flushes any buffered log entries
- Closes file handle
- Removes handler from logger if attached
- Safe to call multiple times (idempotent)

## Integration

### With UnifiedLoggingCore

```python
from app.service.logging.unified_logging_core import UnifiedLoggingCore
from app.service.logging.investigation_log_handler import InvestigationLogHandler

unified_core = UnifiedLoggingCore()
handler = InvestigationLogHandler(
    investigation_id="inv-123",
    investigation_folder=investigation_folder,
    log_format=unified_core.get_format()
)

# Add to root logger or specific logger
logging.getLogger().addHandler(handler)
```

### With InvestigationFolderManager

```python
from app.service.logging.investigation_folder_manager import get_folder_manager

folder_manager = get_folder_manager()
investigation_folder = folder_manager.get_investigation_folder("inv-123")

handler = InvestigationLogHandler(
    investigation_id="inv-123",
    investigation_folder=investigation_folder
)
```

## Thread Safety

- File writes are thread-safe (Python's logging handlers are thread-safe)
- Multiple handlers for different investigations can run concurrently
- Each handler manages its own file handle

## Error Handling

- File write errors are logged to unified logging system (not raised)
- Handler continues to function even if individual writes fail
- Handler is removed if file becomes inaccessible

## Performance

- Non-blocking writes (target: <10ms overhead per entry)
- Buffering support for high-volume logging
- File handle reuse (not created per log entry)

