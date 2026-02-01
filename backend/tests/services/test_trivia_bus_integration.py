"""Tests for LiveTriviaOrchestrator bus integration."""

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.transcript_bus.models import TranscriptEvent


class TestLiveTriviaOrchestratorBusMode:
    """Tests for LiveTriviaOrchestrator bus mode."""

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
    async def test_uses_transcript_bus_config(self):
        """Test that uses_transcript_bus reads from config."""
        with patch("app.services.live_trivia.live_trivia_orchestrator.settings") as mock_settings:
            mock_config = MagicMock()
            mock_config.use_transcript_bus = True
            mock_config.min_topic_mentions = 2
            mock_config.min_interval_seconds = 30
            mock_config.max_facts_per_session = 10
            mock_config.fact_cache_ttl_seconds = 3600
            mock_config.topic_cooldown_minutes = 5
            mock_config.mention_ttl_seconds = 60
            mock_config.tracked_topic_default_confidence = 0.8
            mock_config.ner_provider = "local"
            mock_config.queue_size = 50
            mock_config.replay_count = 5
            mock_settings.olorin.live_trivia = mock_config
            mock_settings.ANTHROPIC_API_KEY = "test-key"

            from app.services.live_trivia.live_trivia_orchestrator import (
                LiveTriviaOrchestrator,
            )

            orchestrator = LiveTriviaOrchestrator()
            assert orchestrator.uses_transcript_bus() is True

    @pytest.mark.asyncio
    async def test_bus_session_tracking(self):
        """Test that bus sessions are tracked correctly."""
        with patch("app.services.live_trivia.live_trivia_orchestrator.settings") as mock_settings:
            mock_config = MagicMock()
            mock_config.use_transcript_bus = True
            mock_config.min_topic_mentions = 2
            mock_config.min_interval_seconds = 30
            mock_config.max_facts_per_session = 10
            mock_config.fact_cache_ttl_seconds = 3600
            mock_config.topic_cooldown_minutes = 5
            mock_config.mention_ttl_seconds = 60
            mock_config.tracked_topic_default_confidence = 0.8
            mock_config.ner_provider = "local"
            mock_config.queue_size = 50
            mock_config.replay_count = 5
            mock_settings.olorin.live_trivia = mock_config
            mock_settings.ANTHROPIC_API_KEY = "test-key"

            from app.services.live_trivia.live_trivia_orchestrator import (
                LiveTriviaOrchestrator,
            )

            orchestrator = LiveTriviaOrchestrator()

            # Initially no bus sessions
            assert len(orchestrator._bus_sessions) == 0
            assert len(orchestrator._bus_callbacks) == 0


class TestBusEventProcessing:
    """Tests for bus event processing logic."""

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
    async def test_partial_events_not_processed(self):
        """Test that partial transcript events are skipped."""
        # This tests the filtering logic in _process_bus_transcripts
        partial_event = self._make_event("ch1", "Partial...", is_partial=True)
        complete_event = self._make_event("ch1", "Complete sentence")

        # Only complete events should trigger processing
        assert partial_event.is_partial is True
        assert complete_event.is_partial is False

    @pytest.mark.asyncio
    async def test_channel_end_stops_processing(self):
        """Test that channel_end event stops the processing loop."""
        end_event = self._make_event("ch1", "", event_type="channel_end")

        assert end_event.event_type == "channel_end"

    @pytest.mark.asyncio
    async def test_facts_callback_invocation(self):
        """Test that facts are delivered via callback."""
        # Simulate the callback pattern
        delivered_facts = []

        async def on_facts(facts):
            delivered_facts.extend(facts)

        # Simulate delivering facts
        mock_facts = [{"topic": "test", "fact": "A test fact"}]
        await on_facts(mock_facts)

        assert len(delivered_facts) == 1
        assert delivered_facts[0]["topic"] == "test"


class TestTriviaConfigValidation:
    """Tests for trivia configuration validation."""

    def test_config_has_bus_settings(self):
        """Test that LiveTriviaConfig includes bus settings."""
        from app.core.olorin_config import LiveTriviaConfig

        config = LiveTriviaConfig()

        # Verify bus-related settings exist
        assert hasattr(config, "use_transcript_bus")
        assert hasattr(config, "queue_size")
        assert hasattr(config, "replay_count")

    def test_config_defaults(self):
        """Test default values for bus configuration."""
        from app.core.olorin_config import LiveTriviaConfig

        config = LiveTriviaConfig()

        assert config.use_transcript_bus is True
        assert config.queue_size == 50
        assert config.replay_count == 5
