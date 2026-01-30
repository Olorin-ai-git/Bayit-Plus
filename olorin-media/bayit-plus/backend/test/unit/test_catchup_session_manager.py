"""Unit tests for CatchUpSessionManager."""

import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timedelta
from app.services.catchup.session_manager import CatchUpSessionManager
from app.services.catchup.transcript_service import TranscriptSegment


@pytest.fixture
def mock_transcript_service():
    """Mock ChannelTranscriptService."""
    service = AsyncMock()
    service.get_transcript = AsyncMock(return_value=[
        TranscriptSegment("First text", datetime.utcnow() - timedelta(minutes=10), "en"),
        TranscriptSegment("Second text", datetime.utcnow() - timedelta(minutes=5), "en")
    ])
    service.has_sufficient_data = AsyncMock(return_value=True)
    return service


@pytest.fixture
def mock_recap_service():
    """Mock RecapAgentService."""
    service = AsyncMock()
    service.generate_recap = AsyncMock(return_value={
        "summary": "AI summary", "key_points": ["Point 1", "Point 2"]
    })
    return service


@pytest.fixture
def mock_epg_service():
    """Mock EPG service."""
    service = AsyncMock()
    service.get_programs = AsyncMock(return_value=[{
        "title": "News Hour", "description": "News", "genre": "News", "duration": 3600
    }])
    return service


@pytest.fixture
def mock_settings():
    """Mock settings."""
    with patch('app.services.catchup.session_manager.settings') as settings:
        settings.olorin.catchup.window_quantization_seconds = 300
        settings.olorin.catchup.default_window_minutes = 15
        settings.olorin.catchup.cache_ttl_seconds = 300
        settings.olorin.catchup.max_summary_tokens = 500
        yield settings


class TestCacheKeyBuilding:
    """Tests for cache key generation."""

    def test_cache_key_quantization(self, mock_transcript_service, mock_settings):
        """Test cache key quantizes timestamps."""
        manager = CatchUpSessionManager(transcript_service=mock_transcript_service)
        start = datetime(2026, 1, 30, 10, 7, 30)
        end = datetime(2026, 1, 30, 10, 22, 45)
        key = manager._build_cache_key("ch-123", "en", start, end)
        assert "catchup:ch-123:en:" in key

    def test_cache_key_consistency(self, mock_transcript_service, mock_settings):
        """Test cache key consistent within quantization window."""
        manager = CatchUpSessionManager(transcript_service=mock_transcript_service)
        start1, start2 = datetime(2026, 1, 30, 10, 0, 0), datetime(2026, 1, 30, 10, 4, 59)
        end1, end2 = datetime(2026, 1, 30, 10, 15, 0), datetime(2026, 1, 30, 10, 19, 59)
        key1 = manager._build_cache_key("ch-123", "en", start1, end1)
        key2 = manager._build_cache_key("ch-123", "en", start2, end2)
        assert key1 == key2


class TestCacheManagement:
    """Tests for cache hit/miss and TTL."""

    @pytest.mark.asyncio
    async def test_cache_hit(self, mock_transcript_service, mock_recap_service, mock_settings):
        """Test cached summary returned on cache hit."""
        manager = CatchUpSessionManager(
            transcript_service=mock_transcript_service, recap_service=mock_recap_service
        )
        r1 = await manager.generate_summary("ch-123", "user-456", "en", 15)
        r2 = await manager.generate_summary("ch-123", "user-456", "en", 15)
        assert r1["cached"] is False
        assert r2["cached"] is True
        assert mock_recap_service.generate_recap.call_count == 1

    @pytest.mark.asyncio
    async def test_cache_miss_generates(self, mock_transcript_service, mock_recap_service, mock_settings):
        """Test new summary generated on cache miss."""
        manager = CatchUpSessionManager(
            transcript_service=mock_transcript_service, recap_service=mock_recap_service
        )
        result = await manager.generate_summary("ch-123", "user-456", "en", 15)
        assert result["cached"] is False
        assert result["summary"] == "AI summary"

    @pytest.mark.asyncio
    async def test_expired_cache_regenerates(self, mock_transcript_service, mock_recap_service, mock_settings):
        """Test expired cache triggers regeneration."""
        manager = CatchUpSessionManager(
            transcript_service=mock_transcript_service, recap_service=mock_recap_service
        )
        await manager.generate_summary("ch-123", "user-456", "en", 15)
        cache_key = list(manager._summary_cache.keys())[0]
        old_time = manager._summary_cache[cache_key][1] - timedelta(seconds=301)
        manager._summary_cache[cache_key] = (manager._summary_cache[cache_key][0], old_time)
        r2 = await manager.generate_summary("ch-123", "user-456", "en", 15)
        assert r2["cached"] is False
        assert mock_recap_service.generate_recap.call_count == 2


class TestEPGIntegration:
    """Tests for EPG context enrichment."""

    @pytest.mark.asyncio
    async def test_epg_context_enriches(
        self, mock_transcript_service, mock_recap_service, mock_epg_service, mock_settings
    ):
        """Test EPG context enriches summary."""
        manager = CatchUpSessionManager(
            transcript_service=mock_transcript_service,
            recap_service=mock_recap_service, epg_service=mock_epg_service
        )
        result = await manager.generate_summary("ch-123", "user-456", "en", 15)
        assert result["program_info"]["title"] == "News Hour"
        mock_epg_service.get_programs.assert_called_once()

    @pytest.mark.asyncio
    async def test_epg_unavailable_degrades(
        self, mock_transcript_service, mock_recap_service, mock_settings
    ):
        """Test graceful degradation without EPG."""
        manager = CatchUpSessionManager(
            transcript_service=mock_transcript_service, recap_service=mock_recap_service
        )
        result = await manager.generate_summary("ch-123", "user-456", "en", 15)
        assert result["program_info"] is None


class TestTranscriptHandling:
    """Tests for transcript window extraction."""

    @pytest.mark.asyncio
    async def test_no_transcript_empty_message(self, mock_transcript_service, mock_settings):
        """Test no transcript returns empty message."""
        mock_transcript_service.get_transcript.return_value = []
        manager = CatchUpSessionManager(transcript_service=mock_transcript_service)
        result = await manager.generate_summary("ch-123", "user-456", "en", 15)
        assert "No transcript data available" in result["summary"]

    @pytest.mark.asyncio
    async def test_fallback_without_recap(
        self, mock_transcript_service, mock_epg_service, mock_settings
    ):
        """Test fallback summarization without recap service."""
        manager = CatchUpSessionManager(
            transcript_service=mock_transcript_service, epg_service=mock_epg_service
        )
        result = await manager.generate_summary("ch-123", "user-456", "en", 15)
        assert result["summary"] is not None
        assert "[News Hour]" in result["summary"]


class TestAvailabilityCheck:
    """Tests for catchup availability."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("has_data,expected", [(True, True), (False, False)])
    async def test_availability(self, mock_transcript_service, has_data, expected):
        """Test availability check with various data states."""
        mock_transcript_service.has_sufficient_data.return_value = has_data
        manager = CatchUpSessionManager(transcript_service=mock_transcript_service)
        available = await manager.check_catchup_available("ch-123")
        assert available is expected
