"""Tests for TranscriptEventBus - channel-routed transcript distribution."""

import asyncio
import time
import pytest

from app.services.transcript_bus import TranscriptEventBus, TranscriptEvent, get_transcript_bus


class TestTranscriptEvent:
    """Tests for TranscriptEvent dataclass."""

    def test_create_transcript_event(self):
        """Test creating a transcript event."""
        event = TranscriptEvent(
            channel_id="channel_1",
            session_id="session_1",
            text="Hello world",
            text_translated="Shalom olam",
            source_lang="en",
            target_lang="he",
            timestamp=1234567890.0,
            is_partial=False,
            confidence=0.95,
        )

        assert event.channel_id == "channel_1"
        assert event.text == "Hello world"
        assert event.event_type == "transcript"
        assert event.confidence == 0.95

    def test_event_is_frozen(self):
        """Test that event is immutable (frozen dataclass)."""
        event = TranscriptEvent(
            channel_id="channel_1",
            session_id="session_1",
            text="Test",
            text_translated=None,
            source_lang="en",
            target_lang="en",
            timestamp=time.time(),
            is_partial=False,
            confidence=1.0,
        )

        with pytest.raises(AttributeError):
            event.text = "Modified"


class TestTranscriptEventBus:
    """Tests for TranscriptEventBus."""

    @pytest.fixture
    def bus(self):
        """Create a fresh TranscriptEventBus for each test."""
        return TranscriptEventBus()

    def _make_event(self, channel_id: str, text: str, is_partial: bool = False) -> TranscriptEvent:
        """Helper to create test events."""
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
            event_type="transcript",
        )

    @pytest.mark.asyncio
    async def test_create_channel(self, bus):
        """Test channel creation."""
        await bus.create_channel("channel_1")

        assert "channel_1" in bus.get_active_channels()
        stats = bus.get_stats()
        assert stats["total_channels"] == 1

    @pytest.mark.asyncio
    async def test_create_channel_idempotent(self, bus):
        """Test that creating the same channel twice is safe."""
        await bus.create_channel("channel_1")
        await bus.create_channel("channel_1")

        assert len(bus.get_active_channels()) == 1

    @pytest.mark.asyncio
    async def test_subscribe_creates_channel(self, bus):
        """Test that subscribing auto-creates channel if needed."""
        queue = await bus.subscribe("channel_1", "consumer_1")

        assert "channel_1" in bus.get_active_channels()
        assert queue is not None

    @pytest.mark.asyncio
    async def test_publish_to_subscriber(self, bus):
        """Test publishing events to subscribers."""
        # Create channel first
        await bus.create_channel("channel_1")

        # Subscribe
        queue = await bus.subscribe("channel_1", "consumer_1")

        # Publish a transcript event
        event = self._make_event("channel_1", "Hello world")
        delivered = bus.publish_nowait("channel_1", event)

        assert delivered == 1

        # Verify event received
        received = await asyncio.wait_for(queue.get(), timeout=1.0)
        assert received.text == "Hello world"
        assert received.event_type == "transcript"

    @pytest.mark.asyncio
    async def test_publish_to_multiple_subscribers(self, bus):
        """Test publishing to multiple subscribers."""
        await bus.create_channel("channel_1")

        queue1 = await bus.subscribe("channel_1", "consumer_1")
        queue2 = await bus.subscribe("channel_1", "consumer_2")
        queue3 = await bus.subscribe("channel_1", "consumer_3")

        event = self._make_event("channel_1", "Broadcast message")
        delivered = bus.publish_nowait("channel_1", event)

        assert delivered == 3

        # All queues should receive the event
        for queue in [queue1, queue2, queue3]:
            received = await asyncio.wait_for(queue.get(), timeout=1.0)
            assert received.text == "Broadcast message"

    @pytest.mark.asyncio
    async def test_unsubscribe(self, bus):
        """Test unsubscribing from a channel."""
        await bus.create_channel("channel_1")

        queue = await bus.subscribe("channel_1", "consumer_1")
        assert bus.get_subscriber_count("channel_1") == 1

        await bus.unsubscribe("channel_1", "consumer_1")
        assert bus.get_subscriber_count("channel_1") == 0

    @pytest.mark.asyncio
    async def test_channel_end_event(self, bus):
        """Test that channel_end event is delivered to subscribers."""
        await bus.create_channel("channel_1")
        queue = await bus.subscribe("channel_1", "consumer_1")

        # End the channel
        await bus.end_channel("channel_1")

        # Should receive channel_end event
        received = await asyncio.wait_for(queue.get(), timeout=1.0)
        assert received.event_type == "channel_end"
        assert received.channel_id == "channel_1"

        # Channel should be cleaned up
        assert "channel_1" not in bus.get_active_channels()

    @pytest.mark.asyncio
    async def test_replay_buffer(self, bus):
        """Test replay buffer for late subscribers."""
        await bus.create_channel("channel_1")

        # First subscriber (will receive live events)
        queue1 = await bus.subscribe("channel_1", "consumer_1")

        # Publish some events
        for i in range(5):
            event = self._make_event("channel_1", f"Message {i}")
            bus.publish_nowait("channel_1", event)

        # Drain queue1
        for _ in range(5):
            await asyncio.wait_for(queue1.get(), timeout=1.0)

        # Late subscriber with replay
        queue2 = await bus.subscribe("channel_1", "consumer_2", with_replay=3)

        # Should receive the last 3 events from replay buffer
        replayed = []
        while not queue2.empty():
            replayed.append(queue2.get_nowait())

        assert len(replayed) == 3
        assert replayed[0].text == "Message 2"
        assert replayed[1].text == "Message 3"
        assert replayed[2].text == "Message 4"

    @pytest.mark.asyncio
    async def test_channel_isolation(self, bus):
        """Test that channels are isolated from each other."""
        await bus.create_channel("channel_1")
        await bus.create_channel("channel_2")

        queue1 = await bus.subscribe("channel_1", "consumer_1")
        queue2 = await bus.subscribe("channel_2", "consumer_2")

        # Publish to channel_1 only
        event = self._make_event("channel_1", "Channel 1 message")
        bus.publish_nowait("channel_1", event)

        # queue1 should receive it
        received = await asyncio.wait_for(queue1.get(), timeout=1.0)
        assert received.text == "Channel 1 message"

        # queue2 should be empty
        assert queue2.empty()

    @pytest.mark.asyncio
    async def test_publish_to_nonexistent_channel(self, bus):
        """Test publishing to a channel that doesn't exist."""
        event = self._make_event("nonexistent", "Test message")
        delivered = bus.publish_nowait("nonexistent", event)

        assert delivered == 0

    @pytest.mark.asyncio
    async def test_get_stats(self, bus):
        """Test getting bus statistics."""
        await bus.create_channel("channel_1")
        await bus.create_channel("channel_2")

        await bus.subscribe("channel_1", "consumer_1")
        await bus.subscribe("channel_1", "consumer_2")
        await bus.subscribe("channel_2", "consumer_3")

        stats = bus.get_stats()

        assert stats["total_channels"] == 2
        assert stats["channels"]["channel_1"]["subscribers"] == 2
        assert stats["channels"]["channel_2"]["subscribers"] == 1

    @pytest.mark.asyncio
    async def test_singleton_accessor(self):
        """Test that get_transcript_bus returns singleton."""
        bus1 = get_transcript_bus()
        bus2 = get_transcript_bus()

        assert bus1 is bus2


class TestAsyncEventBusBase:
    """Tests for the base AsyncEventBus."""

    @pytest.mark.asyncio
    async def test_subscribe_and_publish(self):
        """Test basic subscribe and publish."""
        from app.services.event_bus.base import AsyncEventBus

        bus = AsyncEventBus[str](name="test_bus", default_queue_size=10)

        queue = await bus.subscribe("sub_1")
        bus.publish_nowait("Hello")

        received = await asyncio.wait_for(queue.get(), timeout=1.0)
        assert received == "Hello"

    @pytest.mark.asyncio
    async def test_backpressure_handling(self):
        """Test that full queues don't block publishing."""
        from app.services.event_bus.base import AsyncEventBus

        bus = AsyncEventBus[str](name="test_bus", default_queue_size=2)

        queue = await bus.subscribe("sub_1")

        # Publish more than queue can hold
        bus.publish_nowait("Event 1")
        bus.publish_nowait("Event 2")
        bus.publish_nowait("Event 3")  # Should be dropped

        # Queue should have first 2 events
        event1 = queue.get_nowait()
        event2 = queue.get_nowait()

        assert event1 == "Event 1"
        assert event2 == "Event 2"
        assert queue.empty()

    @pytest.mark.asyncio
    async def test_cleanup_dead_subscribers(self):
        """Test cleaning up dead subscribers."""
        from app.services.event_bus.base import AsyncEventBus

        bus = AsyncEventBus[str](name="test_bus")

        await bus.subscribe("sub_1")
        await bus.subscribe("sub_2")
        await bus.subscribe("sub_3")

        assert bus.get_subscriber_count() == 3

        await bus.cleanup_dead_subscribers(["sub_1", "sub_2"])

        assert bus.get_subscriber_count() == 1
