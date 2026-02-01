"""Tests for HighlightsService - highlight detection from live transcripts."""

import asyncio
import time
from collections import deque
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.highlights import HighlightsService, get_highlights_service
from app.services.highlights.detector import DetectedHighlight, HighlightDetector
from app.services.transcript_bus.models import TranscriptEvent


class TestHighlightDetector:
    """Tests for HighlightDetector algorithms."""

    @pytest.fixture
    def detector(self):
        """Create a HighlightDetector for testing."""
        return HighlightDetector()

    def _make_event(self, channel_id: str, text: str, timestamp: float = None) -> TranscriptEvent:
        """Helper to create test transcript events."""
        return TranscriptEvent(
            channel_id=channel_id,
            session_id="test_session",
            text=text,
            text_translated=None,
            source_lang="en",
            target_lang="en",
            timestamp=timestamp or time.time(),
            is_partial=False,
            confidence=0.9,
            event_type="transcript",
        )

    @pytest.mark.asyncio
    async def test_empty_window_returns_none(self, detector):
        """Test that empty window returns no highlight."""
        window = deque()
        result = await detector.analyze_window(window)
        assert result is None

    @pytest.mark.asyncio
    async def test_single_event_returns_none(self, detector):
        """Test that single event window returns no highlight."""
        window = deque([self._make_event("ch1", "Hello world")])
        result = await detector.analyze_window(window)
        assert result is None

    @pytest.mark.asyncio
    async def test_detect_emotional_exclamations(self, detector):
        """Test detection of emotional highlights via exclamations."""
        window = deque([
            self._make_event("ch1", "This is incredible!!!"),
            self._make_event("ch1", "I can't believe it!!!"),
            self._make_event("ch1", "What an amazing goal!!!"),
        ])

        result = await detector.analyze_window(window)

        assert result is not None
        assert result.highlight_type == "emotional"
        assert result.channel_id == "ch1"
        assert result.confidence >= 0.7

    @pytest.mark.asyncio
    async def test_detect_emotional_keywords(self, detector):
        """Test detection of emotional highlights via keywords."""
        window = deque([
            self._make_event("ch1", "This is absolutely incredible"),
            self._make_event("ch1", "What an amazing performance"),
            self._make_event("ch1", "Wow, that was unbelievable"),
        ])

        result = await detector.analyze_window(window)

        assert result is not None
        assert result.highlight_type in ["emotional", "keyword"]

    @pytest.mark.asyncio
    async def test_detect_dramatic_breaking_news(self, detector):
        """Test detection of dramatic highlights for breaking news."""
        window = deque([
            self._make_event("ch1", "We interrupt this program"),
            self._make_event("ch1", "Breaking news just in"),
            self._make_event("ch1", "Developing story ahead"),
        ])

        result = await detector.analyze_window(window)

        assert result is not None
        assert result.highlight_type == "dramatic"
        assert "breaking" in result.metadata.get("indicators", [])

    @pytest.mark.asyncio
    async def test_no_highlight_for_normal_content(self, detector):
        """Test that normal content doesn't trigger highlights."""
        window = deque([
            self._make_event("ch1", "The weather today is sunny"),
            self._make_event("ch1", "Temperatures around 25 degrees"),
        ])

        result = await detector.analyze_window(window)

        assert result is None

    @pytest.mark.asyncio
    async def test_highlight_includes_timestamps(self, detector):
        """Test that detected highlights include correct timestamps."""
        start_time = 1000.0
        end_time = 1005.0

        window = deque([
            self._make_event("ch1", "Incredible!!!", start_time),
            self._make_event("ch1", "Amazing!!!", end_time),
        ])

        result = await detector.analyze_window(window)

        if result:
            assert result.start_time == start_time
            assert result.end_time == end_time


class TestHighlightsService:
    """Tests for HighlightsService."""

    @pytest.fixture
    def service(self):
        """Create a HighlightsService for testing."""
        return HighlightsService()

    @pytest.mark.asyncio
    async def test_service_initialization(self, service):
        """Test service initializes correctly."""
        assert service is not None
        assert service.get_active_channels() == []

    @pytest.mark.asyncio
    async def test_start_detection_disabled(self):
        """Test that detection doesn't start when disabled."""
        with patch("app.services.highlights.settings") as mock_settings:
            mock_config = MagicMock()
            mock_config.enabled = False
            mock_settings.olorin.highlights = mock_config

            service = HighlightsService()
            await service.start_detection("channel_1")

            assert "channel_1" not in service.get_active_channels()

    @pytest.mark.asyncio
    async def test_rate_limit_resets_after_hour(self, service):
        """Test that rate limit counter resets after one hour."""
        from datetime import datetime, timedelta

        # Initialize rate limit state with datetime from over an hour ago (naive UTC)
        service._hourly_counts["channel_1"] = 19
        service._hour_starts["channel_1"] = datetime.utcnow() - timedelta(hours=1, minutes=2)

        # Should reset and return True
        result = service._check_rate_limit("channel_1")

        assert result is True
        assert service._hourly_counts["channel_1"] == 0

    @pytest.mark.asyncio
    async def test_rate_limit_blocks_at_max(self, service):
        """Test that rate limit blocks when max reached."""
        from datetime import datetime

        service._hourly_counts["channel_1"] = service._config.max_per_hour
        service._hour_starts["channel_1"] = datetime.utcnow()

        result = service._check_rate_limit("channel_1")

        assert result is False

    @pytest.mark.asyncio
    async def test_cleanup_stops_all_detection(self, service):
        """Test that cleanup stops all active detection tasks."""
        # Manually add a channel to active set
        service._active_channels.add("channel_1")
        service._active_channels.add("channel_2")

        # Mock the stop_detection method
        service.stop_detection = AsyncMock()

        await service.cleanup()

        assert service.stop_detection.call_count == 2

    def test_singleton_accessor(self):
        """Test that get_highlights_service returns singleton."""
        service1 = get_highlights_service()
        service2 = get_highlights_service()

        assert service1 is service2


class TestDetectedHighlight:
    """Tests for DetectedHighlight dataclass."""

    def test_create_detected_highlight(self):
        """Test creating a detected highlight."""
        highlight = DetectedHighlight(
            channel_id="channel_1",
            start_time=1000.0,
            end_time=1010.0,
            transcript_text="Amazing goal! Incredible!",
            highlight_type="emotional",
            confidence=0.85,
            metadata={"matched_keywords": ["amazing", "incredible"]},
        )

        assert highlight.channel_id == "channel_1"
        assert highlight.highlight_type == "emotional"
        assert highlight.confidence == 0.85
        assert len(highlight.metadata["matched_keywords"]) == 2
