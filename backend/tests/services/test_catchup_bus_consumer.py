"""Tests for CatchupBusConsumer - transcript accumulation from bus."""

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.catchup.bus_consumer import CatchupBusConsumer, get_catchup_consumer
from app.services.transcript_bus.models import TranscriptEvent


class TestCatchupBusConsumer:
    """Tests for CatchupBusConsumer."""

    @pytest.fixture
    def consumer(self):
        """Create a CatchupBusConsumer for testing."""
        return CatchupBusConsumer()

    def _make_event(
        self, channel_id: str, text: str, event_type: str = "transcript"
    ) -> TranscriptEvent:
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
            event_type=event_type,
        )

    @pytest.mark.asyncio
    async def test_consumer_initialization(self, consumer):
        """Test consumer initializes correctly."""
        assert consumer is not None
        assert consumer.get_active_channels() == []

    @pytest.mark.asyncio
    async def test_get_active_channels(self, consumer):
        """Test getting list of active channels."""
        # Manually add tasks
        consumer._active_tasks["channel_1"] = MagicMock()
        consumer._active_tasks["channel_2"] = MagicMock()

        channels = consumer.get_active_channels()

        assert len(channels) == 2
        assert "channel_1" in channels
        assert "channel_2" in channels

    @pytest.mark.asyncio
    async def test_cleanup_stops_all_tasks(self, consumer):
        """Test that cleanup cancels all active tasks."""

        async def dummy_coro():
            """Dummy coroutine that waits forever."""
            try:
                await asyncio.sleep(3600)
            except asyncio.CancelledError:
                pass

        # Create real tasks
        task1 = asyncio.create_task(dummy_coro())
        task2 = asyncio.create_task(dummy_coro())

        consumer._active_tasks["channel_1"] = task1
        consumer._active_tasks["channel_2"] = task2

        await consumer.cleanup()

        assert len(consumer._active_tasks) == 0
        assert task1.cancelled() or task1.done()
        assert task2.cancelled() or task2.done()

    @pytest.mark.asyncio
    async def test_stop_accumulating_nonexistent_channel(self, consumer):
        """Test stopping accumulation for non-existent channel is safe."""
        await consumer.stop_accumulating("nonexistent")  # Should not raise

    def test_singleton_accessor(self):
        """Test that get_catchup_consumer returns singleton."""
        consumer1 = get_catchup_consumer()
        consumer2 = get_catchup_consumer()

        assert consumer1 is consumer2


class TestCatchupAccumulationLogic:
    """Tests for accumulation loop logic."""

    def _make_event(
        self,
        channel_id: str,
        text: str,
        is_partial: bool = False,
        event_type: str = "transcript",
    ) -> TranscriptEvent:
        """Helper to create test transcript events."""
        return TranscriptEvent(
            channel_id=channel_id,
            session_id="test_session",
            text=text,
            text_translated=None,
            source_lang="en",
            target_lang="en",
            timestamp=time.time(),
            is_partial=is_partial,
            confidence=0.9,
            event_type=event_type,
        )

    @pytest.mark.asyncio
    async def test_accumulation_skips_partial_events(self):
        """Test that partial events are not accumulated."""
        consumer = CatchupBusConsumer()

        # Create a queue with mixed events
        queue = asyncio.Queue()
        queue.put_nowait(self._make_event("ch1", "Partial...", is_partial=True))
        queue.put_nowait(self._make_event("ch1", "Complete"))
        queue.put_nowait(self._make_event("ch1", "", event_type="channel_end"))

        # Mock transcript service
        mock_transcript_service = AsyncMock()
        mock_transcript_service.add_transcript = AsyncMock()

        await consumer._accumulate_loop("ch1", queue, mock_transcript_service)

        # Should only call add_transcript once (for the complete event)
        assert mock_transcript_service.add_transcript.call_count == 1

    @pytest.mark.asyncio
    async def test_accumulation_stops_on_channel_end(self):
        """Test that accumulation stops when channel_end is received."""
        consumer = CatchupBusConsumer()

        queue = asyncio.Queue()
        queue.put_nowait(self._make_event("ch1", "Message 1"))
        queue.put_nowait(self._make_event("ch1", "Message 2"))
        queue.put_nowait(self._make_event("ch1", "", event_type="channel_end"))
        queue.put_nowait(self._make_event("ch1", "Should not process"))

        mock_transcript_service = AsyncMock()
        mock_transcript_service.add_transcript = AsyncMock()

        await consumer._accumulate_loop("ch1", queue, mock_transcript_service)

        # Should only process 2 messages before channel_end
        assert mock_transcript_service.add_transcript.call_count == 2

    @pytest.mark.asyncio
    async def test_accumulation_creates_transcript_segment(self):
        """Test that events are converted to TranscriptSegment correctly."""
        consumer = CatchupBusConsumer()

        event = self._make_event("ch1", "Test message")
        queue = asyncio.Queue()
        queue.put_nowait(event)
        queue.put_nowait(self._make_event("ch1", "", event_type="channel_end"))

        mock_transcript_service = AsyncMock()
        mock_transcript_service.add_transcript = AsyncMock()

        await consumer._accumulate_loop("ch1", queue, mock_transcript_service)

        # Verify the segment was created with correct data
        call_args = mock_transcript_service.add_transcript.call_args
        channel_id, segment = call_args[0]

        assert channel_id == "ch1"
        assert segment.text == "Test message"
        assert segment.language == "en"
