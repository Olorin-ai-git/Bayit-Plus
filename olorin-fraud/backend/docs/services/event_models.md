# Event Models Service

**Feature**: 001-investigation-state-management
**Location**: `/app/schemas/event_models.py`
**Status**: Production

## Service Purpose

Provides Pydantic models for investigation events, event feeds, and summaries. Supports cursor-based pagination and real-time event streaming with comprehensive validation.

## Core Models

### ActorType (Enum)

```python
class ActorType(str, Enum):
    SYSTEM = "system"      # Automated system operations
    USER = "user"          # User-initiated actions
    WEBHOOK = "webhook"    # Webhook integrations
    POLLING = "polling"    # Polling-based updates
```

### OperationType (Enum)

```python
class OperationType(str, Enum):
    APPEND = "append"      # Add new data
    UPDATE = "update"      # Modify existing data
    DELETE = "delete"      # Remove data
```

### EntityType (Enum)

```python
class EntityType(str, Enum):
    ANOMALY = "anomaly"
    RELATIONSHIP = "relationship"
    NOTE = "note"
    STATUS = "status"
    PHASE = "phase"
    TOOL_EXECUTION = "tool_execution"
    LIFECYCLE_STAGE = "lifecycle_stage"
    SETTINGS = "settings"
    PROGRESS = "progress"
    RESULTS = "results"
```

### Actor Model

```python
class Actor(BaseModel):
    """Actor information for event source attribution."""

    type: ActorType
        # Description: Type of actor generating the event
        # Validation: Required, one of ActorType enum values

    user_id: Optional[str] = None
        # Description: User ID if actor type is 'user'
        # Validation: 1-255 characters, required when type='user'

    service: Optional[str] = None
        # Description: Service name if actor type is 'system' or 'webhook'
        # Validation: 1-100 characters, required when type in ['system', 'webhook']
```

**Field Validators**:
- `validate_user_id`: Ensures user_id provided when type is 'user'
- `validate_service`: Ensures service provided when type is 'system' or 'webhook'

**Usage Example**:
```python
# User-initiated action
user_actor = Actor(
    type=ActorType.USER,
    user_id="user-123"
)

# System-initiated action
system_actor = Actor(
    type=ActorType.SYSTEM,
    service="progress_service"
)
```

### InvestigationEvent Model

```python
class InvestigationEvent(BaseModel):
    """Event representing a change in investigation state."""

    id: str
        # Description: Event cursor ID in format {timestamp_ms}_{sequence}
        # Pattern: ^\d{13}_\d{6}$
        # Example: "1730668800000_000127"
        # Usage: Unique identifier and pagination cursor

    investigation_id: str
        # Description: Investigation ID this event belongs to
        # Validation: 1-255 characters, required

    type: str
        # Description: Event type (e.g., 'state_change', 'progress_update')
        # Validation: 1-100 characters

    actor: Actor
        # Description: Information about event originator
        # Validation: Required, nested Actor model

    entity_type: EntityType
        # Description: Type of entity being modified
        # Validation: Required, one of EntityType enum values

    operation: OperationType
        # Description: Type of operation on entity
        # Validation: Required, one of OperationType enum values

    data: Dict[str, Any]
        # Description: Event-specific data payload
        # Validation: Required, arbitrary JSON-serializable data

    timestamp: str
        # Description: ISO 8601 timestamp when event occurred
        # Format: "2024-11-04T12:34:56.789Z"
        # Validation: Valid ISO 8601 datetime string

    metadata: Optional[Dict[str, Any]] = None
        # Description: Additional event metadata
        # Validation: Optional, arbitrary JSON-serializable data
```

**Usage Example**:
```python
event = InvestigationEvent(
    id="1730668800000_000001",
    investigation_id="inv-123",
    type="anomaly_detected",
    actor=Actor(type=ActorType.SYSTEM, service="fraud_detection_agent"),
    entity_type=EntityType.ANOMALY,
    operation=OperationType.APPEND,
    data={
        "anomaly_id": "anom-456",
        "risk_score": 85,
        "description": "Unusual transaction pattern detected"
    },
    timestamp="2024-11-04T12:34:56.789Z"
)
```

### EventsFeedResponse Model

```python
class EventsFeedResponse(BaseModel):
    """Response from events feed API endpoint."""

    investigation_id: str
        # Description: Investigation ID requested
        # Validation: 1-255 characters

    events: List[InvestigationEvent]
        # Description: List of events in this batch
        # Validation: Required, may be empty for completed investigations

    next_cursor: Optional[str] = None
        # Description: Cursor for next batch of events
        # Validation: None if no more events available
        # Example: "1730668801000_000050"

    has_more: bool
        # Description: Whether more events are available after next_cursor
        # Validation: False if next_cursor is None

    count: int
        # Description: Number of events in this response
        # Validation: Non-negative integer

    total_count: Optional[int] = None
        # Description: Total events for investigation (if available)
        # Validation: Optional, non-negative integer
```

**Usage Example**:
```python
response = EventsFeedResponse(
    investigation_id="inv-123",
    events=[event1, event2, event3],
    next_cursor="1730668801000_000050",
    has_more=True,
    count=3,
    total_count=250
)
```

### SummaryResponse Model

```python
class SummaryResponse(BaseModel):
    """Summary of investigation state."""

    investigation_id: str
        # Description: Investigation identifier
        # Validation: 1-255 characters

    status: str
        # Description: Current investigation status
        # Values: 'pending', 'initializing', 'running', 'paused', 'completed', 'failed', 'cancelled'

    progress: float
        # Description: Completion percentage (0-100)
        # Validation: 0.0 <= progress <= 100.0

    current_phase: Optional[str] = None
        # Description: Current execution phase
        # Validation: Optional, phase name

    event_count: int
        # Description: Total number of events generated
        # Validation: Non-negative integer

    anomalies_found: int
        # Description: Number of anomalies detected
        # Validation: Non-negative integer

    relationships_found: int
        # Description: Number of relationships discovered
        # Validation: Non-negative integer

    started_at: str
        # Description: When investigation started
        # Format: ISO 8601 datetime

    updated_at: str
        # Description: When investigation last updated
        # Format: ISO 8601 datetime

    completed_at: Optional[str] = None
        # Description: When investigation completed (if completed)
        # Format: ISO 8601 datetime, None if still running
```

**Usage Example**:
```python
summary = SummaryResponse(
    investigation_id="inv-123",
    status="completed",
    progress=100.0,
    current_phase="results",
    event_count=547,
    anomalies_found=12,
    relationships_found=34,
    started_at="2024-11-04T10:00:00Z",
    updated_at="2024-11-04T12:45:30Z",
    completed_at="2024-11-04T12:45:30Z"
)
```

## Public Methods

### Validation

All models use Pydantic validators for:
- Type checking (enforced at instantiation)
- Pattern matching (e.g., event ID format)
- Cross-field validation (e.g., actor type and user_id consistency)
- Required field enforcement (fail-fast on missing required fields)

### Serialization

```python
# Convert to JSON (for API responses)
event_json = event.model_dump_json()

# Convert to dict
event_dict = event.model_dump()

# Parse from JSON
event = InvestigationEvent.model_validate_json(json_string)

# Parse from dict
event = InvestigationEvent.model_validate(data_dict)
```

### JSON Schema

```python
# Get JSON Schema for model
schema = InvestigationEvent.model_json_schema()

# Schema includes field types, validators, descriptions
# Useful for API documentation and frontend validation
```

## Configuration Options

**No configuration required** - Models are stateless and use only Pydantic validation.

## Error Handling

### Validation Errors

```python
from pydantic import ValidationError

try:
    event = InvestigationEvent(
        id="invalid-format",  # Does not match pattern
        investigation_id="inv-123",
        ...
    )
except ValidationError as e:
    # e.errors() provides detailed validation error information
    for error in e.errors():
        print(f"Field: {error['loc']}, Error: {error['msg']}")
```

### Common Validation Failures

1. **Invalid Event ID Format**: Must be `{13-digit-timestamp}_{6-digit-sequence}`
2. **Missing Actor Type**: When actor is provided, type is required
3. **Actor Validation**: user_id required for USER type, service required for SYSTEM/WEBHOOK
4. **Invalid Entity Type**: Must be one of EntityType enum values
5. **Invalid Operation Type**: Must be one of OperationType enum values

## Performance Characteristics

- **Memory**: Models are lightweight; no database queries
- **Serialization**: ~1ms for typical event serialization
- **Validation**: ~0.5ms for event validation
- **JSON Schema**: ~100ms to generate schema (cached at startup)

## Integration Points

### With Event Feed Service
- `EventsFeedResponse` returned by `/api/v1/investigations/{id}/events`
- `InvestigationEvent` items streamed or paginated
- Cursor values from event IDs used for pagination

### With Frontend
- Models serialized to JSON for API responses
- TypeScript interfaces generated from Pydantic models
- Event data structure drives state management

### With Progress Calculator
- Event operations applied to update progress
- Event data drives phase and tool execution updates
- Summary generated from aggregated events

## Testing

```python
import pytest
from app.schemas.event_models import (
    InvestigationEvent, Actor, ActorType, EntityType, OperationType
)

def test_valid_event_creation():
    event = InvestigationEvent(
        id="1730668800000_000001",
        investigation_id="inv-123",
        type="test",
        actor=Actor(type=ActorType.SYSTEM, service="test"),
        entity_type=EntityType.ANOMALY,
        operation=OperationType.APPEND,
        data={},
        timestamp="2024-11-04T12:34:56Z"
    )
    assert event.id == "1730668800000_000001"

def test_invalid_event_id_format():
    with pytest.raises(ValidationError):
        InvestigationEvent(
            id="invalid-id",  # Wrong format
            investigation_id="inv-123",
            ...
        )

def test_actor_validation():
    # USER type requires user_id
    with pytest.raises(ValidationError):
        Actor(type=ActorType.USER)  # Missing user_id

    # Valid user actor
    actor = Actor(type=ActorType.USER, user_id="user-123")
    assert actor.user_id == "user-123"
```

## Related Services

- **cursor_utils.py**: Parses event IDs (cursors) for pagination
- **event_feed_service.py**: Uses models to fetch events with pagination
- **progress_calculator_service.py**: Processes event data to calculate progress
- **event_streaming_service.py**: Streams events as SSE responses

## File Organization

```
app/
├── schemas/
│   └── event_models.py          # This file
├── service/
│   ├── event_feed_service.py    # Uses EventsFeedResponse
│   ├── event_streaming_service.py  # Streams InvestigationEvent
│   └── progress_calculator_service.py  # Processes event data
└── utils/
    └── cursor_utils.py          # Parses event IDs
```

---
