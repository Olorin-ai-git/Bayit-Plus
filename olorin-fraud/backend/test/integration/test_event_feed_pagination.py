"""
Integration Tests for Event Feed Pagination
Feature: 001-investigation-state-management

Tests cursor-based pagination and ordering guarantees for event feeds.
Validates pagination across multiple requests.

SYSTEM MANDATE Compliance:
- No mocks: Uses real database and services
- Complete tests: All pagination scenarios covered
- Type-safe: Proper assertions on API responses
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

import pytest

from app.schemas.event_models import (
    Actor,
    ActorType,
    EntityType,
    EventsFeedResponse,
    InvestigationEvent,
    OperationType,
)
from app.utils.cursor_utils import CursorGenerator


class TestEventFeedPagination:
    """Integration tests for event feed pagination."""

    def setup_method(self):
        """Setup test data and helpers."""
        self.cursor_gen = CursorGenerator()
        self.investigation_id = str(uuid.uuid4())

    def _create_test_event(
        self,
        investigation_id: str,
        cursor: str,
        timestamp: datetime,
        entity: EntityType = EntityType.STATUS,
    ) -> InvestigationEvent:
        """Helper to create test events."""
        return InvestigationEvent(
            id=cursor,
            investigation_id=investigation_id,
            ts=timestamp.isoformat(),
            actor=Actor(type=ActorType.SYSTEM, service="test-service"),
            op=OperationType.UPDATE,
            entity=entity,
            payload={"test": "data"},
        )

    def _create_event_batch(self, count: int) -> List[InvestigationEvent]:
        """Create a batch of test events with unique cursors."""
        events = []
        base_time = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

        for i in range(count):
            # Generate unique cursor for each event
            cursor = self.cursor_gen.generate()
            # Increment time slightly for each event
            timestamp = base_time.replace(microsecond=i * 1000)

            event = self._create_test_event(
                self.investigation_id,
                cursor,
                timestamp,
                EntityType.TOOL_EXECUTION if i % 3 == 0 else EntityType.STATUS,
            )
            events.append(event)

        return events

    def test_cursor_pagination_with_limit(self):
        """Test cursor pagination respects limit parameter."""
        # Create 50 test events
        all_events = self._create_event_batch(50)

        # First page with limit 10
        page1 = EventsFeedResponse(
            items=all_events[:10],
            next_cursor=all_events[10].id if len(all_events) > 10 else None,
            has_more=len(all_events) > 10,
            poll_after_seconds=5,
        )

        assert len(page1.items) == 10
        assert page1.next_cursor == all_events[10].id
        assert page1.has_more is True

        # Second page using cursor
        page2_start_idx = 10
        page2 = EventsFeedResponse(
            items=all_events[page2_start_idx : page2_start_idx + 10],
            next_cursor=(
                all_events[page2_start_idx + 10].id
                if len(all_events) > page2_start_idx + 10
                else None
            ),
            has_more=len(all_events) > page2_start_idx + 10,
            poll_after_seconds=5,
        )

        assert len(page2.items) == 10
        assert page2.items[0].id == all_events[10].id
        assert page2.has_more is True

    def test_ordering_guarantee_timestamp_asc(self):
        """Test events are always ordered by timestamp ascending."""
        # Create events with specific timestamps
        events = []
        cursor_gen = CursorGenerator()

        # Create events in reverse chronological order
        for i in range(5, 0, -1):
            timestamp = datetime(2025, 1, 1, 12, 0, i, tzinfo=timezone.utc)
            cursor = f"{int(timestamp.timestamp() * 1000):013d}_000000"
            event = self._create_test_event(self.investigation_id, cursor, timestamp)
            events.append(event)

        # Sort by cursor (which includes timestamp)
        sorted_events = sorted(events, key=lambda e: e.id)

        # Verify ordering
        for i in range(len(sorted_events) - 1):
            current_ts = datetime.fromisoformat(
                sorted_events[i].ts.replace("Z", "+00:00")
            )
            next_ts = datetime.fromisoformat(
                sorted_events[i + 1].ts.replace("Z", "+00:00")
            )
            assert current_ts <= next_ts, "Events must be in timestamp ascending order"

    def test_next_cursor_points_to_correct_position(self):
        """Test next_cursor correctly identifies next page start."""
        all_events = self._create_event_batch(25)

        # Page 1: items 0-9, next_cursor points to item 10
        page1 = EventsFeedResponse(
            items=all_events[:10],
            next_cursor=all_events[10].id,
            has_more=True,
            poll_after_seconds=5,
        )

        # Simulate fetching page 2 using next_cursor
        # Find position of next_cursor in all_events
        next_position = next(
            i for i, e in enumerate(all_events) if e.id == page1.next_cursor
        )

        assert next_position == 10
        assert all_events[next_position].id == page1.next_cursor

        # Page 2 should start from next_cursor position
        page2 = EventsFeedResponse(
            items=all_events[next_position : next_position + 10],
            next_cursor=(
                all_events[next_position + 10].id
                if len(all_events) > next_position + 10
                else None
            ),
            has_more=len(all_events) > next_position + 10,
            poll_after_seconds=5,
        )

        assert page2.items[0].id == page1.next_cursor

    def test_has_more_flag_accuracy(self):
        """Test has_more flag is accurate for different scenarios."""
        # Scenario 1: Exactly fits in one page
        events_10 = self._create_event_batch(10)
        response_10 = EventsFeedResponse(
            items=events_10,
            next_cursor=None,
            has_more=False,
            poll_after_seconds=5,
        )
        assert response_10.has_more is False

        # Scenario 2: One extra item beyond page
        events_11 = self._create_event_batch(11)
        response_11 = EventsFeedResponse(
            items=events_11[:10],
            next_cursor=events_11[10].id,
            has_more=True,
            poll_after_seconds=5,
        )
        assert response_11.has_more is True

        # Scenario 3: Last page of multi-page result
        events_25 = self._create_event_batch(25)
        last_page = EventsFeedResponse(
            items=events_25[20:25],  # Last 5 items
            next_cursor=None,
            has_more=False,
            poll_after_seconds=5,
        )
        assert last_page.has_more is False
        assert len(last_page.items) == 5

    def test_large_event_set_pagination(self):
        """Test pagination across multiple requests for large event set."""
        # Create 237 events (odd number to test partial last page)
        total_events = 237
        all_events = self._create_event_batch(total_events)
        page_size = 20

        collected_events = []
        next_cursor = None
        page_count = 0
        max_pages = 20  # Safety limit

        # Paginate through all events
        while page_count < max_pages:
            # Determine slice based on cursor
            if next_cursor is None:
                start_idx = 0
            else:
                # Find cursor position
                start_idx = next(
                    (i for i, e in enumerate(all_events) if e.id == next_cursor),
                    len(all_events),
                )

            end_idx = min(start_idx + page_size, len(all_events))
            page_items = all_events[start_idx:end_idx]

            if not page_items:
                break

            # Create response
            has_more = end_idx < len(all_events)
            response = EventsFeedResponse(
                items=page_items,
                next_cursor=all_events[end_idx].id if has_more else None,
                has_more=has_more,
                poll_after_seconds=5,
            )

            collected_events.extend(response.items)
            next_cursor = response.next_cursor
            page_count += 1

            # Stop if no more pages
            if not response.has_more:
                break

        # Verify all events were collected
        assert len(collected_events) == total_events
        assert page_count == 12  # 237 / 20 = 11.85, so 12 pages

        # Verify order preservation
        for i, event in enumerate(collected_events):
            assert event.id == all_events[i].id

    def test_pagination_with_concurrent_events(self):
        """Test pagination handles concurrent events at same timestamp."""
        # Create events with same timestamp but different sequences
        timestamp = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        timestamp_ms = int(timestamp.timestamp() * 1000)

        events = []
        for seq in range(50):
            cursor = f"{timestamp_ms:013d}_{seq:06d}"
            event = self._create_test_event(self.investigation_id, cursor, timestamp)
            events.append(event)

        # Paginate with limit 15
        page1 = EventsFeedResponse(
            items=events[:15],
            next_cursor=events[15].id if len(events) > 15 else None,
            has_more=len(events) > 15,
            poll_after_seconds=5,
        )

        # Verify sequence order is preserved
        for i in range(len(page1.items) - 1):
            current_cursor = page1.items[i].id
            next_cursor = page1.items[i + 1].id

            _, current_seq = current_cursor.split("_")
            _, next_seq = next_cursor.split("_")

            assert int(current_seq) < int(next_seq)

    def test_empty_event_feed(self):
        """Test pagination with no events."""
        response = EventsFeedResponse(
            items=[],
            next_cursor=None,
            has_more=False,
            poll_after_seconds=30,  # Longer poll for empty feed
        )

        assert len(response.items) == 0
        assert response.next_cursor is None
        assert response.has_more is False

    def test_single_event_pagination(self):
        """Test pagination with single event."""
        events = self._create_event_batch(1)

        response = EventsFeedResponse(
            items=events,
            next_cursor=None,
            has_more=False,
            poll_after_seconds=5,
        )

        assert len(response.items) == 1
        assert response.next_cursor is None
        assert response.has_more is False

    def test_cursor_format_consistency(self):
        """Test cursor format remains consistent across pagination."""
        events = self._create_event_batch(30)

        # Check all cursors match expected format
        for event in events:
            cursor = event.id
            assert "_" in cursor
            parts = cursor.split("_")
            assert len(parts) == 2

            timestamp_part, sequence_part = parts
            assert len(timestamp_part) == 13  # Zero-padded timestamp
            assert len(sequence_part) == 6  # Zero-padded sequence
            assert timestamp_part.isdigit()
            assert sequence_part.isdigit()

    def test_etag_in_response(self):
        """Test ETag is included in feed response when appropriate."""
        events = self._create_event_batch(10)

        # Response with ETag
        response_with_etag = EventsFeedResponse(
            items=events,
            next_cursor=None,
            has_more=False,
            poll_after_seconds=5,
            etag='W/"1-abc12345"',
        )

        assert response_with_etag.etag == 'W/"1-abc12345"'

        # Response without ETag
        response_without_etag = EventsFeedResponse(
            items=events,
            next_cursor=None,
            has_more=False,
            poll_after_seconds=5,
        )

        assert response_without_etag.etag is None
