# Cursor Utilities Service

**Feature**: 001-investigation-state-management
**Location**: `/app/utils/cursor_utils.py`
**Status**: Production

## Service Purpose

Provides cursor parsing and generation for event stream pagination. Ensures monotonic ordering through timestamp + sequence combination, enabling reliable cursor-based pagination without database offset limitations.

## Functions

### parse_cursor(cursor: str) -> Tuple[int, int]

Parses cursor string into timestamp and sequence components.

**Signature**:
```python
def parse_cursor(cursor: str) -> Tuple[int, int]:
    """Parse cursor string into timestamp and sequence components."""
```

**Parameters**:
- `cursor` (str): Cursor string in format `{timestamp_ms}_{sequence}`
  - Example: `"1730668800000_000127"`
  - Must contain exactly one underscore
  - Timestamp: 13-digit millisecond Unix timestamp
  - Sequence: 6-digit zero-padded sequence number

**Returns**: Tuple[int, int]
- First element: Timestamp in milliseconds (int)
- Second element: Sequence number (int)

**Raises**:
- `ValueError`: If cursor format is invalid, empty, or components are not integers
  - "Cursor cannot be empty"
  - "Invalid cursor format: {cursor}. Expected format: {timestamp_ms}_{sequence}"
  - "Invalid cursor format: {cursor}. Must have exactly one underscore"
  - "Timestamp cannot be negative: {timestamp}"
  - "Sequence cannot be negative: {sequence}"

**Usage Example**:
```python
from app.utils.cursor_utils import parse_cursor

# Parse a cursor
timestamp_ms, sequence = parse_cursor("1730668800000_000127")
assert timestamp_ms == 1730668800000
assert sequence == 127

# Use in pagination
try:
    ts, seq = parse_cursor(cursor_from_client)
    # Fetch events after this cursor
except ValueError as e:
    # Handle invalid cursor format
    print(f"Invalid cursor: {e}")
```

**Performance**: O(1) operation; simple string split and integer conversion

**Error Handling**: Fail-fast on invalid format; detailed error messages for debugging

---

### CursorGenerator Class

Thread-safe cursor generator ensuring monotonic ordering.

**Constructor**:
```python
def __init__(self):
    """Initialize cursor generator with zero state."""
    self.last_timestamp_ms: int = 0
    self.sequence: int = 0
```

**Attributes**:
- `last_timestamp_ms` (int): Last generated timestamp in milliseconds
- `sequence` (int): Current sequence number for same timestamp

#### generate() -> str

Generates next monotonic cursor.

**Signature**:
```python
def generate(self) -> str:
    """Generate next monotonic cursor."""
```

**Returns**: str
- Format: `{timestamp_ms:013d}_{sequence:06d}`
- Example: `"1730668800000_000000"`
- Zero-padded to ensure string sorting equals value ordering

**Algorithm**:
1. Get current time in milliseconds (UTC)
2. If same millisecond as last: increment sequence
3. If new millisecond: reset sequence to 0
4. Format with zero-padding: 13 digits for timestamp, 6 digits for sequence

**Properties**:
- **Monotonic**: Each generated cursor > previous cursor
- **No collisions**: Sequence handles up to 1 million events per millisecond
- **Timestamp Coverage**: 13-digit format covers until year 2286
- **Sortable**: String sort order matches cursor order

**Usage Example**:
```python
from app.utils.cursor_utils import CursorGenerator

# Create generator instance (typically singleton)
gen = CursorGenerator()

# Generate first cursor
cursor1 = gen.generate()  # "1730668800000_000000"

# Generate more cursors in same millisecond
cursor2 = gen.generate()  # "1730668800000_000001"
cursor3 = gen.generate()  # "1730668800000_000002"

# Generate cursor in next millisecond (after time advances)
# (wait 1ms)
cursor4 = gen.generate()  # "1730668800001_000000"

# Verify monotonic ordering
assert cursor1 < cursor2 < cursor3 < cursor4
```

**Performance**: O(1) generation; millisecond precision

#### reset()

Resets generator state.

**Signature**:
```python
def reset(self):
    """Reset generator state (useful for testing)."""
```

**Usage**:
```python
# Reset for testing
gen.reset()
cursor = gen.generate()  # Will start from current time again
```

---

## Integration with Event Feed Service

### Event ID Assignment

```python
# In event_feed_service.py
cursor_gen = CursorGenerator()

def create_event(investigation_id: str, data: dict):
    event = InvestigationEvent(
        id=cursor_gen.generate(),  # Unique, monotonic ID
        investigation_id=investigation_id,
        ...
    )
    return event
```

### Event Pagination

```python
# Client request: GET /api/v1/investigations/{id}/events?cursor=1730668800000_000050
cursor = "1730668800000_000050"
timestamp_ms, sequence = parse_cursor(cursor)

# Fetch events > this cursor
events = db.query(InvestigationEvent).filter(
    InvestigationEvent.id > cursor
).limit(50)
```

---

## Configuration Options

**No configuration required** - Cursor format is algorithmic and immutable.

**Format Constants** (from code):
```python
# 13 digits for timestamp (covers until year 2286)
TIMESTAMP_DIGITS = 13

# 6 digits for sequence (1 million events per millisecond)
SEQUENCE_DIGITS = 6

# Separator between timestamp and sequence
SEPARATOR = "_"
```

---

## Error Handling Strategy

### Invalid Cursor Format

```python
from app.utils.cursor_utils import parse_cursor

try:
    ts, seq = parse_cursor("invalid")
except ValueError as e:
    logger.error(f"Invalid cursor format: {e}")
    # Return 400 Bad Request to client
```

### Handling Client Errors

```python
# In API endpoint
@router.get("/investigations/{id}/events")
def get_events(id: str, cursor: Optional[str] = None):
    if cursor:
        try:
            parse_cursor(cursor)  # Validate before use
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid cursor format"
            )

    # Fetch events...
```

---

## Performance Characteristics

- **Generation**: ~0.1ms per cursor
- **Parsing**: ~0.05ms per cursor
- **Memory**: ~56 bytes per CursorGenerator instance
- **Sorting**: Native string sort works correctly for cursor ordering

## Testing

```python
import pytest
from app.utils.cursor_utils import parse_cursor, CursorGenerator

def test_parse_cursor_valid():
    ts, seq = parse_cursor("1730668800000_000127")
    assert ts == 1730668800000
    assert seq == 127

def test_parse_cursor_invalid_format():
    with pytest.raises(ValueError):
        parse_cursor("invalid-format")

def test_parse_cursor_negative_values():
    with pytest.raises(ValueError):
        parse_cursor("-1_000000")

def test_cursor_generator_monotonic():
    gen = CursorGenerator()
    cursor1 = gen.generate()
    cursor2 = gen.generate()
    cursor3 = gen.generate()

    assert cursor1 < cursor2 < cursor3

def test_cursor_generator_sequence():
    gen = CursorGenerator()
    cursor1 = gen.generate()
    cursor2 = gen.generate()

    ts1, seq1 = parse_cursor(cursor1)
    ts2, seq2 = parse_cursor(cursor2)

    # Same timestamp
    assert ts1 == ts2
    # Sequence incremented
    assert seq2 == seq1 + 1

def test_cursor_generator_reset():
    gen = CursorGenerator()
    cursor1 = gen.generate()
    gen.reset()
    cursor2 = gen.generate()

    # After reset, generates new cursor
    assert cursor1 != cursor2
```

---

## Related Services

- **event_models.py**: InvestigationEvent uses cursor as ID
- **event_feed_service.py**: Uses cursors for pagination
- **event_feed_service_enhanced.py**: Enhanced pagination with deduplication
- **event_streaming_service.py**: Streams events with cursor ordering

## Deployment Considerations

### Timestamp Synchronization

- Relies on system clock (UTC)
- Multiple servers must have synchronized clocks
- NTP recommended for production

### Sequence Overflow Protection

- Sequence supports 1 million events per millisecond
- Highly unlikely in practice; would need 1M concurrent event producers
- If exceeded: wraps to next millisecond

---
