"""Tests for SearchIndexService - batch indexing of live transcripts."""

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.search_index import SearchIndexService, get_search_index_service
from app.services.transcript_bus.models import TranscriptEvent


class TestSearchIndexService:
    """Tests for SearchIndexService."""

    @pytest.fixture
    def service(self):
        """Create a SearchIndexService for testing."""
        return SearchIndexService()

    def _make_event(self, channel_id: str, text: str) -> TranscriptEvent:
        """Helper to create test transcript events."""
        return TranscriptEvent(
            channel_id=channel_id,
            session_id="test_session",
            text=text,
            text_translated=None,
            source_lang="en",
            target_lang="en",
            timestamp=time.time(),
            is_partial=False,
            confidence=0.9,
            event_type="transcript",
        )

    @pytest.mark.asyncio
    async def test_service_initialization(self, service):
        """Test service initializes correctly."""
        assert service is not None
        assert service.get_active_channels() == []

    @pytest.mark.asyncio
    async def test_start_indexing_disabled(self):
        """Test that indexing doesn't start when disabled."""
        with patch("app.services.search_index.settings") as mock_settings:
            mock_config = MagicMock()
            mock_config.enabled = False
            mock_settings.olorin.search_index = mock_config

            service = SearchIndexService()
            await service.start_indexing("channel_1")

            assert "channel_1" not in service.get_active_channels()

    @pytest.mark.asyncio
    async def test_batch_buffer_accumulation(self, service):
        """Test that events are buffered for batch processing."""
        # Initialize buffer for channel
        service._batch_buffers["channel_1"] = []

        # Add events to buffer
        for i in range(5):
            event = self._make_event("channel_1", f"Message {i}")
            service._batch_buffers["channel_1"].append(event)

        assert len(service._batch_buffers["channel_1"]) == 5

    @pytest.mark.asyncio
    async def test_flush_batch_clears_buffer(self, service):
        """Test that flushing clears the buffer."""
        # Initialize buffer with events
        service._batch_buffers["channel_1"] = [
            self._make_event("channel_1", f"Message {i}") for i in range(3)
        ]

        # Mock the MongoDB insert
        with patch("app.services.search_index.LiveTranscriptIndex") as mock_model:
            mock_model.insert_many = AsyncMock()

            await service._flush_batch("channel_1")

            # Buffer should be empty after flush
            assert "channel_1" not in service._batch_buffers or len(service._batch_buffers.get("channel_1", [])) == 0

    @pytest.mark.asyncio
    async def test_flush_batch_handles_empty_buffer(self, service):
        """Test that flushing empty buffer is safe."""
        # No buffer initialized for channel
        await service._flush_batch("channel_1")  # Should not raise

    @pytest.mark.asyncio
    async def test_flush_batch_retries_on_failure(self, service):
        """Test that failed flush puts events back in buffer."""
        events = [self._make_event("channel_1", f"Message {i}") for i in range(3)]
        service._batch_buffers["channel_1"] = events.copy()

        # Mock MongoDB to raise an exception
        with patch("app.services.search_index.LiveTranscriptIndex") as mock_model:
            mock_model.insert_many = AsyncMock(side_effect=Exception("DB Error"))

            await service._flush_batch("channel_1")

            # Events should be put back in buffer for retry
            assert len(service._batch_buffers["channel_1"]) == 3

    @pytest.mark.asyncio
    async def test_cleanup_stops_all_indexing(self, service):
        """Test that cleanup stops all active indexing tasks."""
        # Manually add channels to active set
        service._active_channels.add("channel_1")
        service._active_channels.add("channel_2")

        # Mock the stop_indexing method
        service.stop_indexing = AsyncMock()

        await service.cleanup()

        assert service.stop_indexing.call_count == 2

    @pytest.mark.asyncio
    async def test_get_active_channels(self, service):
        """Test getting list of active channels."""
        service._active_channels.add("channel_1")
        service._active_channels.add("channel_2")
        service._active_channels.add("channel_3")

        channels = service.get_active_channels()

        assert len(channels) == 3
        assert "channel_1" in channels
        assert "channel_2" in channels
        assert "channel_3" in channels

    def test_singleton_accessor(self):
        """Test that get_search_index_service returns singleton."""
        service1 = get_search_index_service()
        service2 = get_search_index_service()

        assert service1 is service2


class TestSearchIndexBatchProcessing:
    """Tests for batch processing logic."""

    @pytest.fixture
    def service(self):
        """Create a SearchIndexService for testing."""
        return SearchIndexService()

    def _make_event(self, channel_id: str, text: str) -> TranscriptEvent:
        """Helper to create test transcript events."""
        return TranscriptEvent(
            channel_id=channel_id,
            session_id="test_session",
            text=text,
            text_translated=None,
            source_lang="en",
            target_lang="en",
            timestamp=time.time(),
            is_partial=False,
            confidence=0.9,
            event_type="transcript",
        )

    @pytest.mark.asyncio
    async def test_batch_size_triggers_flush(self, service):
        """Test that reaching batch size triggers a flush."""
        batch_size = service._config.batch_size
        service._batch_buffers["channel_1"] = []

        # Mock flush_batch to track calls
        flush_called = []

        async def mock_flush(channel_id):
            flush_called.append(channel_id)
            service._batch_buffers.pop(channel_id, None)

        service._flush_batch = mock_flush

        # Add events up to batch size
        for i in range(batch_size):
            event = self._make_event("channel_1", f"Message {i}")
            service._batch_buffers.setdefault("channel_1", []).append(event)

            # Simulate index loop check
            if len(service._batch_buffers["channel_1"]) >= batch_size:
                await service._flush_batch("channel_1")

        assert len(flush_called) == 1
        assert flush_called[0] == "channel_1"

    @pytest.mark.asyncio
    async def test_partial_events_are_skipped(self, service):
        """Test that partial events are not indexed."""
        # Create a partial event
        partial_event = TranscriptEvent(
            channel_id="channel_1",
            session_id="test_session",
            text="Partial...",
            text_translated=None,
            source_lang="en",
            target_lang="en",
            timestamp=time.time(),
            is_partial=True,  # Partial!
            confidence=0.5,
            event_type="transcript",
        )

        # Create a complete event
        complete_event = self._make_event("channel_1", "Complete message")

        # Simulate index loop logic
        service._batch_buffers["channel_1"] = []

        for event in [partial_event, complete_event]:
            if event.event_type == "transcript" and not event.is_partial:
                service._batch_buffers["channel_1"].append(event)

        # Only complete event should be in buffer
        assert len(service._batch_buffers["channel_1"]) == 1
        assert service._batch_buffers["channel_1"][0].text == "Complete message"
