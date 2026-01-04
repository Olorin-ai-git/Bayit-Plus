# Contract: Investigation Log Context

## Purpose

Defines the interface for investigation context management using Python's `contextvars` module.

## Module

`app.service.logging.investigation_log_context`

## Public API

### Context Variables

```python
investigation_id_var: ContextVar[Optional[str]]
investigation_metadata_var: ContextVar[Optional[Dict[str, Any]]]
```

### Functions

#### `set_investigation_context(investigation_id: str, metadata: Dict[str, Any]) -> None`

Set investigation context for current async context.

**Parameters**:
- `investigation_id` (str): Investigation identifier
- `metadata` (Dict[str, Any]): Investigation metadata from frontend

**Returns**: None

**Raises**:
- `ValueError`: If investigation_id is empty or None
- `TypeError`: If metadata is not a dictionary

**Example**:
```python
from app.service.logging.investigation_log_context import set_investigation_context

set_investigation_context(
    investigation_id="inv-123",
    metadata={
        "entity_id": "user-456",
        "entity_type": "user_id",
        "investigation_type": "structured",
        "lifecycle_stage": "IN_PROGRESS"
    }
)
```

#### `get_investigation_id() -> Optional[str]`

Get current investigation ID from context.

**Returns**: Investigation ID if set, None otherwise

**Example**:
```python
from app.service.logging.investigation_log_context import get_investigation_id

investigation_id = get_investigation_id()
if investigation_id:
    print(f"Current investigation: {investigation_id}")
```

#### `get_investigation_metadata() -> Optional[Dict[str, Any]]`

Get current investigation metadata from context.

**Returns**: Investigation metadata dictionary if set, None otherwise

**Example**:
```python
from app.service.logging.investigation_log_context import get_investigation_metadata

metadata = get_investigation_metadata()
if metadata:
    entity_id = metadata.get("entity_id")
```

#### `clear_investigation_context() -> None`

Clear investigation context from current async context.

**Returns**: None

**Example**:
```python
from app.service.logging.investigation_log_context import clear_investigation_context

clear_investigation_context()
```

## Context Propagation

The context variables automatically propagate across:
- `async`/`await` boundaries
- `asyncio` tasks
- Thread boundaries (when using `contextvars.copy_context()`)

## Thread Safety

All operations are thread-safe. Context variables are isolated per async context.

## Usage Pattern

```python
# At investigation start
set_investigation_context(investigation_id, metadata)

# During investigation execution (any async function)
investigation_id = get_investigation_id()  # Automatically available

# At investigation end
clear_investigation_context()
```

