# Data Model: Custom Investigation Log

## Overview

This document defines the data models, structures, and interfaces for the custom investigation logging system.

## Core Data Models

### InvestigationLogContext

**Purpose**: Stores investigation context using Python's `contextvars` for async propagation.

**Location**: `olorin-server/app/service/logging/investigation_log_context.py`

```python
from contextvars import ContextVar
from typing import Optional, Dict, Any

# Context variable for investigation ID
investigation_id_var: ContextVar[Optional[str]] = ContextVar('investigation_id', default=None)

# Context variable for investigation metadata
investigation_metadata_var: ContextVar[Optional[Dict[str, Any]]] = ContextVar('investigation_metadata', default=None)
```

**Methods**:
- `set_investigation_context(investigation_id: str, metadata: Dict[str, Any])`: Set investigation context
- `get_investigation_id() -> Optional[str]`: Get current investigation ID
- `get_investigation_metadata() -> Optional[Dict[str, Any]]`: Get current investigation metadata
- `clear_investigation_context()`: Clear investigation context

**Usage**:
```python
from app.service.logging.investigation_log_context import set_investigation_context

# At investigation start
set_investigation_context(
    investigation_id="inv-123",
    metadata={"entity_id": "user-456", "entity_type": "user_id", ...}
)

# In any async function
from app.service.logging.investigation_log_context import get_investigation_id
investigation_id = get_investigation_id()  # Returns "inv-123"
```

### InvestigationLogHandler

**Purpose**: Custom logging handler that writes investigation logs to `investigation.log` file.

**Location**: `olorin-server/app/service/logging/investigation_log_handler.py`

**Class Structure**:
```python
class InvestigationLogHandler(logging.Handler):
    """
    Custom log handler for investigation-specific logging.
    
    Writes logs to investigation.log file in the investigation folder
    with [investigation_id] prefix. Integrates with UnifiedLoggingCore.
    """
    
    def __init__(
        self,
        investigation_id: str,
        investigation_folder: Path,
        log_format: LogFormat = LogFormat.HUMAN,
        log_level: int = logging.DEBUG
    ):
        """
        Initialize investigation log handler.
        
        Args:
            investigation_id: Investigation identifier
            investigation_folder: Path to investigation folder
            log_format: Log format (HUMAN, JSON, STRUCTURED)
            log_level: Log level (default: DEBUG)
        """
    
    def emit(self, record: logging.LogRecord) -> None:
        """Emit log record to investigation.log file"""
    
    def close(self) -> None:
        """Close handler and flush logs"""
```

**Key Features**:
- Creates `investigation.log` file in investigation folder
- Uses investigation-specific formatter with `[investigation_id]` prefix
- Respects unified logging format configuration
- Non-blocking file writes
- Thread-safe operations

### InvestigationLogFormatter

**Purpose**: Custom formatter that adds `[investigation_id]` prefix to log messages.

**Location**: `olorin-server/app/service/logging/investigation_log_formatter.py`

**Class Structure**:
```python
class InvestigationLogFormatter(logging.Formatter):
    """
    Custom formatter that adds [investigation_id] prefix to log messages.
    
    Checks contextvars for investigation_id and adds prefix if present.
    """
    
    def __init__(
        self,
        base_formatter: logging.Formatter,
        include_prefix: bool = True
    ):
        """
        Initialize investigation log formatter.
        
        Args:
            base_formatter: Base formatter (from UnifiedLoggingCore)
            include_prefix: Whether to include [investigation_id] prefix
        """
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record with investigation_id prefix"""
```

**Format Examples**:

**Human Format**:
```
[inv-123] 2025-01-11 12:00:00 [DEBUG] app.service.agent: Agent 'DeviceAnalysisAgent' executing tool 'device_analysis'
```

**JSON Format**:
```json
{"investigation_id": "inv-123", "timestamp": "2025-01-11T12:00:00", "level": "DEBUG", "logger": "app.service.agent", "message": "Agent 'DeviceAnalysisAgent' executing tool 'device_analysis'"}
```

**Structured Format**:
```json
{"investigation_id": "inv-123", "timestamp": "2025-01-11T12:00:00", "level": "DEBUG", "logger": "app.service.agent", "message": "Agent 'DeviceAnalysisAgent' executing tool 'device_analysis'", "module": "agent", "function": "execute_tool", "line": 123}
```

### InvestigationLogManager

**Purpose**: Manages investigation log handlers and integration with UnifiedLoggingCore.

**Location**: `olorin-server/app/service/logging/investigation_log_manager.py`

**Class Structure**:
```python
class InvestigationLogManager:
    """
    Manages investigation-specific logging.
    
    Integrates with UnifiedLoggingCore to add investigation log handlers
    and manage investigation log files.
    """
    
    def __init__(self, unified_logging_core: UnifiedLoggingCore):
        """Initialize investigation log manager"""
    
    def start_investigation_logging(
        self,
        investigation_id: str,
        metadata: Dict[str, Any],
        investigation_folder: Path
    ) -> InvestigationLogHandler:
        """
        Start logging for an investigation.
        
        Args:
            investigation_id: Investigation identifier
            metadata: Investigation metadata from frontend
            investigation_folder: Path to investigation folder
            
        Returns:
            InvestigationLogHandler instance
        """
    
    def stop_investigation_logging(
        self,
        investigation_id: str,
        handler: InvestigationLogHandler
    ) -> None:
        """
        Stop logging for an investigation.
        
        Args:
            investigation_id: Investigation identifier
            handler: InvestigationLogHandler instance
        """
    
    def log_initial_metadata(
        self,
        investigation_id: str,
        metadata: Dict[str, Any]
    ) -> None:
        """
        Log initial investigation metadata.
        
        Args:
            investigation_id: Investigation identifier
            metadata: Investigation metadata from frontend
        """
```

## Integration Points

### UnifiedLoggingCore Extension

**Method to Add**:
```python
def add_investigation_handler(
    self,
    investigation_id: str,
    investigation_folder: Path
) -> InvestigationLogHandler:
    """
    Add investigation-specific log handler.
    
    Args:
        investigation_id: Investigation identifier
        investigation_folder: Path to investigation folder
        
    Returns:
        InvestigationLogHandler instance
    """
```

### InvestigationFolderManager Integration

**Usage**:
```python
from app.service.logging.investigation_folder_manager import get_folder_manager

folder_manager = get_folder_manager()
investigation_folder, metadata = folder_manager.create_investigation_folder(
    investigation_id=investigation_id,
    mode=InvestigationMode.LIVE,
    config=investigation_config
)

# Get log file path
log_file_paths = folder_manager.get_log_file_paths(investigation_id)
investigation_log_path = log_file_paths["main_log"]  # investigation.log
```

## Data Flow

### Investigation Start Flow

1. **Frontend** sends investigation request with metadata
2. **Backend** receives request and extracts investigation_id and metadata
3. **InvestigationFolderManager** creates investigation folder
4. **InvestigationLogManager** starts investigation logging:
   - Sets investigation context using contextvars
   - Creates InvestigationLogHandler
   - Adds handler to UnifiedLoggingCore
   - Logs initial metadata
5. **Investigation execution** proceeds with logging context active

### Log Entry Flow

1. **Code** calls `logger.debug("message")` or similar
2. **UnifiedLoggingCore** routes log to all handlers
3. **InvestigationLogHandler** checks contextvars for investigation_id
4. **If investigation_id present**:
   - InvestigationLogFormatter adds `[investigation_id]` prefix
   - Log written to `investigation.log` file
5. **Log also written** to unified logging outputs (console, file, etc.)

### Investigation End Flow

1. **Investigation completes** (success, failure, or cancellation)
2. **InvestigationLogManager** stops investigation logging:
   - Removes handler from UnifiedLoggingCore
   - Closes handler and flushes logs
   - Clears investigation context
3. **Investigation folder** remains with complete log file

## Metadata Structure

### Initial Metadata Log Entry

**Format**: First entry in `investigation.log` file

**Structure**:
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
    "investigation_mode": "entity",
    "time_range": {
      "start_time": "2025-01-01T00:00:00Z",
      "end_time": "2025-01-11T23:59:59Z"
    },
    "tools": [
      {"tool_id": "device_analysis", "parameters": {}}
    ],
    "lifecycle_stage": "IN_PROGRESS",
    "status": "IN_PROGRESS",
    "created_at": "2025-01-11T12:00:00Z"
  }
}
```

## Error Handling

### Log File Creation Failure

**Scenario**: Investigation folder cannot be created or log file cannot be written

**Handling**:
- Log error to unified logging system
- Continue investigation execution (logging failure should not block investigation)
- Return None from `start_investigation_logging()` to indicate failure

### Context Missing

**Scenario**: Log entry generated without investigation context

**Handling**:
- Log entry written to unified logging outputs only
- No prefix added
- No entry in investigation.log

### Concurrent Investigations

**Scenario**: Multiple investigations running simultaneously

**Handling**:
- Each investigation has separate InvestigationLogHandler
- Contextvars ensure correct investigation_id per async context
- Separate log files per investigation

## Performance Considerations

### Log Entry Overhead

**Target**: <10ms per log entry (SC-007)

**Optimization Strategies**:
- Async file writes using `asyncio` or thread pool
- Buffering log entries before writing
- Non-blocking queue-based approach
- Lazy file handle creation

### File Handle Management

**Strategy**:
- One file handle per investigation
- Handle stored in InvestigationLogHandler
- Closed when investigation completes
- Handle rotation for large files (future enhancement)

### Memory Management

**Strategy**:
- Stream writes (no buffering of entire log file)
- Limit buffer size for async writes
- Flush periodically (every N entries or M seconds)

