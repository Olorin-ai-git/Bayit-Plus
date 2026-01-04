# Event Feed Service

**Feature**: 001-investigation-state-management
**Location**: `/app/service/event_feed_service.py`
**Status**: Production

## Service Purpose

Provides event feed pagination with cursor-based iteration. Handles event fetching with filtering, ordering, and pagination without database offsets.

## Public Methods

### get_events()

```python
def get_events(
    self,
    investigation_id: str,
    cursor: Optional[str] = None,
    limit: int = 50,
    filters: Optional[Dict[str, Any]] = None
) -> EventsFeedResponse:
    """Fetch events with cursor-based pagination."""
```

**Parameters**:
- `investigation_id` (str): Investigation ID to fetch events for
- `cursor` (str, optional): Cursor from previous response; if None, start from beginning
- `limit` (int): Max events to return (1-500, default 50)
- `filters` (dict, optional): Filters
  - `entity_type`: Filter by entity type (e.g., "anomaly")
  - `operation`: Filter by operation (e.g., "append")
  - `actor_type`: Filter by actor type (e.g., "system")
  - `start_time`: Filter events after timestamp
  - `end_time`: Filter events before timestamp

**Returns**: EventsFeedResponse
```python
{
    "investigation_id": "inv-123",
    "events": [InvestigationEvent, ...],
    "next_cursor": "1730668801000_000050",  # or None if no more
    "has_more": True,
    "count": 50,
    "total_count": 5000
}
```

**Usage Example**:
```python
from app.service.event_feed_service import EventFeedService

service = EventFeedService()

# Initial fetch
response = service.get_events("inv-123", limit=50)
print(f"Got {response.count} events")

# Fetch next page
if response.has_more:
    next_response = service.get_events(
        "inv-123",
        cursor=response.next_cursor,
        limit=50
    )
```

**Performance**: O(limit) operation; index-based pagination

---

### count_events()

```python
def count_events(
    self,
    investigation_id: str,
    filters: Optional[Dict[str, Any]] = None
) -> int:
    """Count total events matching filters."""
```

**Parameters**:
- `investigation_id` (str): Investigation ID
- `filters` (dict, optional): Same filters as get_events()

**Returns**: int - Total event count

**Usage Example**:
```python
total = service.count_events("inv-123")
print(f"Total events: {total}")
```

---

### get_events_by_type()

```python
def get_events_by_type(
    self,
    investigation_id: str,
    entity_type: str,
    cursor: Optional[str] = None,
    limit: int = 50
) -> EventsFeedResponse:
    """Fetch events filtered by entity type."""
```

**Parameters**:
- `investigation_id` (str): Investigation ID
- `entity_type` (str): Entity type to filter (e.g., "anomaly")
- `cursor` (str, optional): Pagination cursor
- `limit` (int): Max events

**Returns**: EventsFeedResponse (filtered)

**Usage Example**:
```python
anomaly_events = service.get_events_by_type(
    "inv-123",
    entity_type="anomaly",
    limit=100
)
```

---

## Configuration

**Environment Variables**:
```python
QUERY_TIMEOUT_MS = 30000          # Query timeout
DEFAULT_LIMIT = 50                # Default events per page
MAX_LIMIT = 500                   # Maximum events per page
CACHE_TTL_SECONDS = 300           # Cache duration
```

---

## Error Handling

### Invalid Cursor

```python
try:
    response = service.get_events("inv-123", cursor="invalid-cursor")
except ValueError as e:
    # Invalid cursor format
    raise HTTPException(status_code=400, detail="Invalid cursor format")
```

### Investigation Not Found

```python
try:
    response = service.get_events("non-existent-id")
except NotFoundError as e:
    raise HTTPException(status_code=404, detail="Investigation not found")
```

### Query Timeout

```python
try:
    response = service.get_events("inv-123", limit=10000)
except TimeoutError as e:
    raise HTTPException(status_code=504, detail="Query timeout")
```

---

## Performance Characteristics

- **Query Time**: ~10-50ms for typical pagination (50 events)
- **Memory**: ~1MB per 1000 events in response
- **Throughput**: 1000+ requests/second per instance
- **Database Load**: Index-based; no table scans

## Testing

```python
import pytest
from app.service.event_feed_service import EventFeedService

@pytest.fixture
def service():
    return EventFeedService()

def test_get_initial_events(service):
    response = service.get_events("inv-123", limit=50)
    assert response.investigation_id == "inv-123"
    assert len(response.events) <= 50
    assert response.count == len(response.events)

def test_pagination(service):
    # First page
    page1 = service.get_events("inv-123", limit=50)
    assert page1.has_more

    # Second page
    page2 = service.get_events("inv-123", cursor=page1.next_cursor, limit=50)
    assert page2.events[0].id > page1.events[-1].id

def test_filtering(service):
    response = service.get_events(
        "inv-123",
        filters={"entity_type": "anomaly"}
    )
    assert all(e.entity_type == "anomaly" for e in response.events)
```

---

## Related Services

- **cursor_utils.py**: Parses cursors for pagination
- **event_models.py**: Defines InvestigationEvent model
- **event_feed_service_enhanced.py**: Enhanced version with deduplication

---
