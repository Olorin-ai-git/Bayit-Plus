# Quickstart Guide: Custom Investigation Log

## Overview

This guide provides a quick start for implementing and using the custom investigation logging system.

## Prerequisites

- Python 3.11+
- Existing `UnifiedLoggingCore` system
- Existing `InvestigationFolderManager` system
- Investigation folder structure: `logs/investigations/{MODE}_{INVESTIGATION_ID}_{TIMESTAMP}/`

## Installation

No additional dependencies required. Uses standard library (`logging`, `contextvars`) and existing dependencies.

## Basic Usage

### 1. Start Investigation Logging

When an investigation starts, initialize investigation logging:

```python
from app.service.logging.investigation_log_manager import InvestigationLogManager
from app.service.logging.unified_logging_core import UnifiedLoggingCore
from app.service.logging.investigation_folder_manager import get_folder_manager, InvestigationMode

# Get unified logging core
unified_core = UnifiedLoggingCore()

# Create investigation log manager
log_manager = InvestigationLogManager(unified_core)

# Get investigation folder
folder_manager = get_folder_manager()
investigation_folder, metadata = folder_manager.create_investigation_folder(
    investigation_id="inv-123",
    mode=InvestigationMode.LIVE,
    config={"entity_id": "user-456", "entity_type": "user_id"}
)

# Start investigation logging
handler = log_manager.start_investigation_logging(
    investigation_id="inv-123",
    metadata={
        "investigation_id": "inv-123",
        "entity_id": "user-456",
        "entity_type": "user_id",
        "investigation_type": "structured",
        "lifecycle_stage": "IN_PROGRESS",
        "status": "IN_PROGRESS"
    },
    investigation_folder=investigation_folder
)
```

### 2. Use Standard Logging

Once investigation logging is started, use standard Python logging. Logs will automatically include `[investigation_id]` prefix and be written to `investigation.log`:

```python
import logging

logger = logging.getLogger(__name__)

# These logs will automatically include [inv-123] prefix
logger.debug("Agent starting execution")
logger.info("Tool execution completed")
logger.warning("Retry attempt")
logger.error("Tool execution failed")
```

**Output in investigation.log**:
```
[inv-123] 2025-01-11 12:00:00 [DEBUG] app.service.agent: Agent starting execution
[inv-123] 2025-01-11 12:00:01 [INFO] app.service.agent: Tool execution completed
[inv-123] 2025-01-11 12:00:02 [WARNING] app.service.agent: Retry attempt
[inv-123] 2025-01-11 12:00:03 [ERROR] app.service.agent: Tool execution failed
```

### 3. Stop Investigation Logging

When investigation completes, stop logging:

```python
log_manager.stop_investigation_logging(
    investigation_id="inv-123",
    handler=handler
)
```

## Integration Examples

### Integration with Investigation Controller

**Already implemented** in `olorin-server/app/router/controllers/investigation_controller.py`:

```python
# In investigation_controller.py
from app.service.logging.investigation_log_manager import InvestigationLogManager
from app.service.logging.investigation_folder_manager import get_folder_manager, InvestigationMode
from app.service.logging.unified_logging_core import get_unified_logging_core

# Global manager instance (singleton pattern)
_investigation_log_manager: Optional[InvestigationLogManager] = None
_active_investigation_handlers: Dict[str, InvestigationLogHandler] = {}

def get_investigation_log_manager() -> InvestigationLogManager:
    """Get or create investigation log manager instance"""
    global _investigation_log_manager
    if _investigation_log_manager is None:
        _investigation_log_manager = InvestigationLogManager(get_unified_logging_core())
    return _investigation_log_manager

async def start_structured_investigation(
    request: StructuredInvestigationRequest,
    execute_investigation_callback
) -> StructuredInvestigationResponse:
    investigation_id = request.investigation_id or generate_id()
    
    # Create investigation folder
    folder_manager = get_folder_manager()
    investigation_folder, _ = folder_manager.create_investigation_folder(
        investigation_id=investigation_id,
        mode=InvestigationMode.LIVE,
        config=investigation_context
    )
    
    # Start investigation logging
    log_manager = get_investigation_log_manager()
    handler = log_manager.start_investigation_logging(
        investigation_id=investigation_id,
        metadata=metadata,
        investigation_folder=investigation_folder
    )
    
    # Store handler for cleanup
    if handler:
        _active_investigation_handlers[investigation_id] = handler
    
    # Continue with investigation execution
    # ...
    
    # Stop logging when investigation completes (in update_investigation_status)
    if investigation_completed and investigation_id in _active_investigation_handlers:
        log_manager.stop_investigation_logging(investigation_id, handler)
        del _active_investigation_handlers[investigation_id]
```

### Integration with Investigation Coordinator

**Already implemented** in `olorin-server/app/service/agent/orchestration/investigation_coordinator.py`:

```python
# In investigation_coordinator.py
from app.service.logging.investigation_log_context import set_investigation_context, get_investigation_id
import logging

logger = logging.getLogger(__name__)

async def start_investigation(state: MessagesState, config) -> dict:
    # Extract investigation_id and metadata
    investigation_id = extract_investigation_id(state, config)
    metadata = extract_metadata(state, config)
    
    # Set investigation context for logging (ensures context is available for all async operations)
    try:
        set_investigation_context(investigation_id, metadata)
        logger.info(f"Set investigation context for {investigation_id}")
    except Exception as e:
        logger.warning(f"Failed to set investigation context: {e}", exc_info=True)
        # Don't fail investigation if context setting fails
    
    # Logs will automatically include [investigation_id] prefix
    logger.info("Starting investigation")
    logger.debug(f"Investigation context: {get_investigation_id()}")
    
    # Continue investigation...
```

### Integration with Agent Execution

```python
# In agent execution code
import logging

logger = logging.getLogger(__name__)

async def execute_agent(agent_name: str, tool_name: str):
    # Logs automatically include [investigation_id] prefix
    logger.debug(f"Agent '{agent_name}' executing tool '{tool_name}'")
    
    try:
        result = await tool.execute()
        logger.info(f"Tool '{tool_name}' completed successfully")
        return result
    except Exception as e:
        logger.error(f"Tool '{tool_name}' failed: {e}")
        raise
```

## Log File Location

Investigation logs are written to:
```
logs/investigations/{MODE}_{INVESTIGATION_ID}_{TIMESTAMP}/investigation.log
```

**Example**:
```
logs/investigations/LIVE_inv-123_20250111_120000/investigation.log
```

## Log Format Examples

### Human Format (Default)

```
[inv-123] 2025-01-11 12:00:00 [DEBUG] app.service.agent: Agent starting execution
[inv-123] 2025-01-11 12:00:01 [INFO] app.service.agent: Tool execution completed
```

### JSON Format

```json
{"investigation_id": "inv-123", "timestamp": "2025-01-11T12:00:00", "level": "DEBUG", "logger": "app.service.agent", "message": "Agent starting execution"}
{"investigation_id": "inv-123", "timestamp": "2025-01-11T12:00:01", "level": "INFO", "logger": "app.service.agent", "message": "Tool execution completed"}
```

### Structured Format

```json
{"investigation_id": "inv-123", "timestamp": "2025-01-11T12:00:00", "level": "DEBUG", "logger": "app.service.agent", "message": "Agent starting execution", "module": "agent", "function": "execute", "line": 123}
```

## Configuration

### Log Level

Default log level is DEBUG. To change:

```python
handler = InvestigationLogHandler(
    investigation_id="inv-123",
    investigation_folder=investigation_folder,
    log_level=logging.INFO  # Change to INFO
)
```

### Log Format

Format is determined by UnifiedLoggingCore configuration. To override:

```python
handler = InvestigationLogHandler(
    investigation_id="inv-123",
    investigation_folder=investigation_folder,
    log_format=LogFormat.JSON  # Override format
)
```

## Troubleshooting

### Logs Not Appearing in investigation.log

**Check**:
1. Investigation logging started? (`start_investigation_logging()` called)
2. Investigation context set? (check `get_investigation_id()`)
3. Log level correct? (default is DEBUG)
4. File permissions? (check investigation folder is writable)

### Missing [investigation_id] Prefix

**Check**:
1. Investigation context set? (use `set_investigation_context()`)
2. Handler attached? (check handler is added to logger)
3. Formatter configured? (check InvestigationLogFormatter is used)

### Performance Issues

**Check**:
1. Performance metrics available? (use `handler.get_performance_metrics()`)
2. Average write time <10ms? (check metrics for slow writes)
3. Log file size? (automatic rotation at 50MB)
4. Concurrent investigations? (each has separate handler)

**Performance Monitoring**:
```python
# Get performance metrics for a handler
metrics = handler.get_performance_metrics()
print(f"Log entries: {metrics['log_entry_count']}")
print(f"Avg write time: {metrics['avg_write_time_ms']:.2f}ms")
```

## Best Practices

1. **Always start logging at investigation start**: Call `start_investigation_logging()` immediately after creating investigation folder

2. **Always stop logging at investigation end**: Call `stop_investigation_logging()` when investigation completes, fails, or is cancelled

3. **Use standard logging levels**: DEBUG for detailed info, INFO for important events, WARNING for issues, ERROR for failures

4. **Include context in log messages**: Log messages should be self-contained and include relevant context

5. **Handle errors gracefully**: Logging failures should not block investigation execution

6. **Clean up handlers**: Always remove handlers when investigation completes to prevent memory leaks

## Next Steps

- See [data-model.md](./data-model.md) for detailed data models
- See [contracts/](./contracts/) for API contracts
- See [spec.md](./spec.md) for full specification

