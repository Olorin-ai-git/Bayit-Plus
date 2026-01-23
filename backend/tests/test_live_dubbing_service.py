"""
Tests for Live Dubbing Service

Comprehensive tests for the LiveDubbingService that orchestrates
real-time audio dubbing: STT → Translation → TTS pipeline.
"""

import asyncio
import base64
from datetime import datetime
from typing import AsyncIterator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio


# ============================================
# Mock Providers
# ============================================


class MockSTTProvider:
    """Mock STT provider for testing."""

    def __init__(self):
        self._connected = False
        self._audio_chunks: list[bytes] = []
        self._transcripts: list[tuple[str, str]] = []

    async def connect(self, source_lang: str) -> None:
        self._connected = True
        self._source_lang = source_lang

    async def send_audio_chunk(self, audio_data: bytes) -> None:
        if not self._connected:
            raise RuntimeError("Not connected")
        self._audio_chunks.append(audio_data)

    async def receive_transcripts(self) -> AsyncIterator[tuple[str, str]]:
        for transcript, lang in self._transcripts:
            yield transcript, lang
            await asyncio.sleep(0.01)

    async def close(self) -> None:
        self._connected = False

    @property
    def is_connected(self) -> bool:
        return self._connected

    def add_transcript(self, text: str, lang: str = "he") -> None:
        """Add a mock transcript for testing."""
        self._transcripts.append((text, lang))


class MockTTSProvider:
    """Mock TTS provider for testing."""

    def __init__(self):
        self._connected = False
        self._audio_data = b"mock_audio_data_mp3"
        self._text_chunks: list[str] = []

    async def connect(self, voice_id: str | None = None) -> None:
        self._connected = True
        self._voice_id = voice_id

    async def send_text_chunk(self, text: str, flush: bool = False) -> None:
        if not self._connected:
            raise RuntimeError("Not connected")
        self._text_chunks.append(text)

    async def finish_stream(self) -> None:
        pass

    async def receive_audio(self) -> AsyncIterator[bytes]:
        # Return mock audio data
        yield self._audio_data

    async def close(self) -> None:
        self._connected = False

    @property
    def is_connected(self) -> bool:
        return self._connected


class MockTranslationProvider:
    """Mock translation provider for testing."""

    def __init__(self, translation_map: dict | None = None):
        self._translation_map = translation_map or {}

    async def translate_text(
        self, text: str, source_lang: str, target_lang: str
    ) -> str:
        # Return from map if available, otherwise add prefix
        if text in self._translation_map:
            return self._translation_map[text]
        return f"[{target_lang}] {text}"


# ============================================
# Fixtures
# ============================================


@pytest.fixture
def mock_channel():
    """Create mock LiveChannel."""
    channel = MagicMock()
    channel.id = "test-channel-123"
    channel.supports_live_dubbing = True
    channel.dubbing_source_language = "he"
    channel.available_dubbing_languages = ["en", "es", "ar", "ru"]
    channel.default_dubbing_voice_id = None
    channel.dubbing_sync_delay_ms = 600
    return channel


@pytest.fixture
def mock_user():
    """Create mock User."""
    user = MagicMock()
    user.id = "test-user-456"
    user.subscription_tier = "premium"
    return user


@pytest.fixture
def mock_stt_provider():
    """Create mock STT provider."""
    return MockSTTProvider()


@pytest.fixture
def mock_tts_provider():
    """Create mock TTS provider."""
    return MockTTSProvider()


@pytest.fixture
def mock_translation_provider():
    """Create mock translation provider."""
    return MockTranslationProvider({
        "שלום": "Hello",
        "בוקר טוב": "Good morning",
        "להתראות": "Goodbye",
    })


@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    with patch("app.services.live_dubbing_service.settings") as mock:
        mock.ELEVENLABS_API_KEY = "test-api-key"
        mock.ELEVENLABS_DEFAULT_VOICE_ID = "test-voice-id"
        mock.olorin = MagicMock()
        mock.olorin.dubbing.live_dubbing_default_sync_delay_ms = 600
        yield mock


# ============================================
# Service Initialization Tests
# ============================================


class TestLiveDubbingServiceInit:
    """Test service initialization."""

    def test_init_with_defaults(
        self, mock_channel, mock_user, mock_settings,
        mock_stt_provider, mock_tts_provider, mock_translation_provider
    ):
        """Test initialization with default values."""
        from app.services.live_dubbing_service import LiveDubbingService

        service = LiveDubbingService(
            channel=mock_channel,
            user=mock_user,
            target_language="en",
            stt_provider=mock_stt_provider,
            tts_provider=mock_tts_provider,
            translation_provider=mock_translation_provider,
        )

        assert service.channel == mock_channel
        assert service.user == mock_user
        assert service.target_language == "en"
        assert service.source_language == "he"
        assert service.sync_delay_ms == 600
        assert service.session_id.startswith("live_dub_")
        assert not service.is_running

    def test_init_with_custom_voice(
        self, mock_channel, mock_user, mock_settings,
        mock_stt_provider, mock_tts_provider, mock_translation_provider
    ):
        """Test initialization with custom voice ID."""
        from app.services.live_dubbing_service import LiveDubbingService

        service = LiveDubbingService(
            channel=mock_channel,
            user=mock_user,
            target_language="es",
            voice_id="custom-voice-id",
            stt_provider=mock_stt_provider,
            tts_provider=mock_tts_provider,
            translation_provider=mock_translation_provider,
        )

        assert service.voice_id == "custom-voice-id"
        assert service.target_language == "es"

    def test_init_with_platform(
        self, mock_channel, mock_user, mock_settings,
        mock_stt_provider, mock_tts_provider, mock_translation_provider
    ):
        """Test initialization with platform parameter."""
        from app.services.live_dubbing_service import LiveDubbingService

        service = LiveDubbingService(
            channel=mock_channel,
            user=mock_user,
            target_language="en",
            platform="ios",
            stt_provider=mock_stt_provider,
            tts_provider=mock_tts_provider,
            translation_provider=mock_translation_provider,
        )

        assert service.platform == "ios"


# ============================================
# Session Lifecycle Tests
# ============================================


def create_mock_session():
    """Create a mock LiveDubbingSession that doesn't require MongoDB."""
    mock_session = MagicMock()
    mock_session.insert = AsyncMock()
    mock_session.save = AsyncMock()
    mock_session.session_id = None
    mock_session.status = "active"
    mock_session.metrics = MagicMock()
    mock_session.last_error = None
    mock_session.last_error_at = None
    mock_session.ended_at = None
    return mock_session


class TestSessionLifecycle:
    """Test session start/stop functionality."""

    @pytest.mark.asyncio
    async def test_start_session(
        self, mock_channel, mock_user, mock_settings,
        mock_stt_provider, mock_tts_provider, mock_translation_provider
    ):
        """Test starting a dubbing session."""
        from app.services.live_dubbing_service import LiveDubbingService

        # Mock the entire LiveDubbingSession class to avoid Beanie initialization
        mock_session = create_mock_session()
        with patch(
            "app.services.live_dubbing_service.LiveDubbingSession",
            return_value=mock_session
        ):
            service = LiveDubbingService(
                channel=mock_channel,
                user=mock_user,
                target_language="en",
                stt_provider=mock_stt_provider,
                tts_provider=mock_tts_provider,
                translation_provider=mock_translation_provider,
            )

            result = await service.start()

            assert result["type"] == "connected"
            assert "session_id" in result
            assert result["source_lang"] == "he"
            assert result["target_lang"] == "en"
            assert result["sync_delay_ms"] == 600
            assert service.is_running
            assert mock_stt_provider.is_connected
            assert mock_tts_provider.is_connected
            mock_session.insert.assert_called_once()

    @pytest.mark.asyncio
    async def test_stop_session(
        self, mock_channel, mock_user, mock_settings,
        mock_stt_provider, mock_tts_provider, mock_translation_provider
    ):
        """Test stopping a dubbing session."""
        from app.services.live_dubbing_service import LiveDubbingService

        mock_session = create_mock_session()
        with patch(
            "app.services.live_dubbing_service.LiveDubbingSession",
            return_value=mock_session
        ):
            service = LiveDubbingService(
                channel=mock_channel,
                user=mock_user,
                target_language="en",
                stt_provider=mock_stt_provider,
                tts_provider=mock_tts_provider,
                translation_provider=mock_translation_provider,
            )

            await service.start()
            assert service.is_running

            result = await service.stop()

            assert result["status"] == "completed"
            assert "metrics" in result
            assert not service.is_running
            mock_session.save.assert_called()

    @pytest.mark.asyncio
    async def test_start_already_running(
        self, mock_channel, mock_user, mock_settings,
        mock_stt_provider, mock_tts_provider, mock_translation_provider
    ):
        """Test starting an already running session returns same info."""
        from app.services.live_dubbing_service import LiveDubbingService

        mock_session = create_mock_session()
        with patch(
            "app.services.live_dubbing_service.LiveDubbingSession",
            return_value=mock_session
        ):
            service = LiveDubbingService(
                channel=mock_channel,
                user=mock_user,
                target_language="en",
                stt_provider=mock_stt_provider,
                tts_provider=mock_tts_provider,
                translation_provider=mock_translation_provider,
            )

            result1 = await service.start()
            result2 = await service.start()

            assert result1["session_id"] == result2["session_id"]
            # insert should only be called once
            mock_session.insert.assert_called_once()


# ============================================
# Audio Processing Tests
# ============================================


class TestAudioProcessing:
    """Test audio chunk processing."""

    @pytest.mark.asyncio
    async def test_process_audio_chunk(
        self, mock_channel, mock_user, mock_settings,
        mock_stt_provider, mock_tts_provider, mock_translation_provider
    ):
        """Test processing an audio chunk."""
        from app.services.live_dubbing_service import LiveDubbingService

        mock_session = create_mock_session()
        with patch(
            "app.services.live_dubbing_service.LiveDubbingSession",
            return_value=mock_session
        ):
            service = LiveDubbingService(
                channel=mock_channel,
                user=mock_user,
                target_language="en",
                stt_provider=mock_stt_provider,
                tts_provider=mock_tts_provider,
                translation_provider=mock_translation_provider,
            )

            await service.start()

            # Process some audio
            audio_data = b"\x00" * 3200  # 100ms of 16kHz, 16-bit audio
            await service.process_audio_chunk(audio_data)

            # Verify audio was sent to STT
            assert len(mock_stt_provider._audio_chunks) == 1
            assert mock_stt_provider._audio_chunks[0] == audio_data

    @pytest.mark.asyncio
    async def test_process_audio_not_running(
        self, mock_channel, mock_user, mock_settings,
        mock_stt_provider, mock_tts_provider, mock_translation_provider
    ):
        """Test that audio is ignored when session not running."""
        from app.services.live_dubbing_service import LiveDubbingService

        service = LiveDubbingService(
            channel=mock_channel,
            user=mock_user,
            target_language="en",
            stt_provider=mock_stt_provider,
            tts_provider=mock_tts_provider,
            translation_provider=mock_translation_provider,
        )

        # Don't start the session
        audio_data = b"\x00" * 3200
        await service.process_audio_chunk(audio_data)

        # Audio should be ignored
        assert len(mock_stt_provider._audio_chunks) == 0


# ============================================
# Pipeline Tests
# ============================================


class TestDubbingPipeline:
    """Test the dubbing pipeline."""

    @pytest.mark.asyncio
    async def test_pipeline_processes_transcript(
        self, mock_channel, mock_user, mock_settings,
        mock_stt_provider, mock_tts_provider, mock_translation_provider
    ):
        """Test pipeline processes transcript through translation and TTS."""
        from app.services.live_dubbing_service import LiveDubbingService

        # Add a transcript to process
        mock_stt_provider.add_transcript("שלום", "he")

        mock_session = create_mock_session()
        with patch(
            "app.services.live_dubbing_service.LiveDubbingSession",
            return_value=mock_session
        ):
            service = LiveDubbingService(
                channel=mock_channel,
                user=mock_user,
                target_language="en",
                stt_provider=mock_stt_provider,
                tts_provider=mock_tts_provider,
                translation_provider=mock_translation_provider,
            )

            await service.start()

            # Run pipeline in background
            pipeline_task = asyncio.create_task(service.run_pipeline())

            # Collect messages
            messages = []
            async for message in service.receive_messages():
                messages.append(message)
                if len(messages) >= 1:
                    break

            # Stop service
            await service.stop()

            try:
                await pipeline_task
            except asyncio.CancelledError:
                pass

            # Verify output
            assert len(messages) == 1
            assert messages[0].type == "dubbed_audio"
            assert messages[0].data["original_text"] == "שלום"
            assert messages[0].data["translated_text"] == "Hello"
            assert "data" in messages[0].data  # Base64 audio

    @pytest.mark.asyncio
    async def test_pipeline_same_language_no_translation(
        self, mock_channel, mock_user, mock_settings,
        mock_stt_provider, mock_tts_provider, mock_translation_provider
    ):
        """Test that same source/target language skips translation."""
        from app.services.live_dubbing_service import LiveDubbingService

        # Set channel source to English
        mock_channel.dubbing_source_language = "en"
        mock_stt_provider.add_transcript("Hello world", "en")

        mock_session = create_mock_session()
        with patch(
            "app.services.live_dubbing_service.LiveDubbingSession",
            return_value=mock_session
        ):
            service = LiveDubbingService(
                channel=mock_channel,
                user=mock_user,
                target_language="en",
                stt_provider=mock_stt_provider,
                tts_provider=mock_tts_provider,
                translation_provider=mock_translation_provider,
            )

            await service.start()

            pipeline_task = asyncio.create_task(service.run_pipeline())

            messages = []
            async for message in service.receive_messages():
                messages.append(message)
                if len(messages) >= 1:
                    break

            await service.stop()

            try:
                await pipeline_task
            except asyncio.CancelledError:
                pass

            # Verify text wasn't translated (same language)
            assert messages[0].data["original_text"] == "Hello world"
            assert messages[0].data["translated_text"] == "Hello world"


# ============================================
# Latency Report Tests
# ============================================


class TestLatencyReport:
    """Test latency reporting."""

    def test_initial_latency_report(
        self, mock_channel, mock_user, mock_settings,
        mock_stt_provider, mock_tts_provider, mock_translation_provider
    ):
        """Test initial latency report has zero values."""
        from app.services.live_dubbing_service import LiveDubbingService

        service = LiveDubbingService(
            channel=mock_channel,
            user=mock_user,
            target_language="en",
            stt_provider=mock_stt_provider,
            tts_provider=mock_tts_provider,
            translation_provider=mock_translation_provider,
        )

        report = service.get_latency_report()

        assert report.avg_stt_ms == 0
        assert report.avg_translation_ms == 0
        assert report.avg_tts_ms == 0
        assert report.avg_total_ms == 0
        assert report.segments_processed == 0

    def test_latency_metrics_update(
        self, mock_channel, mock_user, mock_settings,
        mock_stt_provider, mock_tts_provider, mock_translation_provider
    ):
        """Test latency metrics are updated correctly."""
        from app.services.live_dubbing_service import LiveDubbingService

        service = LiveDubbingService(
            channel=mock_channel,
            user=mock_user,
            target_language="en",
            stt_provider=mock_stt_provider,
            tts_provider=mock_tts_provider,
            translation_provider=mock_translation_provider,
        )

        # Manually update metrics
        service._update_latency_metrics(100, 150, 200)
        service._update_latency_metrics(120, 160, 220)

        report = service.get_latency_report()

        # Average of two samples
        assert report.avg_stt_ms == 110  # (100 + 120) / 2
        assert report.avg_translation_ms == 155  # (150 + 160) / 2
        assert report.avg_tts_ms == 210  # (200 + 220) / 2
        assert report.avg_total_ms == 475  # 110 + 155 + 210


# ============================================
# Connection Info Tests
# ============================================


class TestConnectionInfo:
    """Test connection info generation."""

    def test_connection_info_format(
        self, mock_channel, mock_user, mock_settings,
        mock_stt_provider, mock_tts_provider, mock_translation_provider
    ):
        """Test connection info has correct format."""
        from app.services.live_dubbing_service import LiveDubbingService

        service = LiveDubbingService(
            channel=mock_channel,
            user=mock_user,
            target_language="en",
            voice_id="test-voice",
            stt_provider=mock_stt_provider,
            tts_provider=mock_tts_provider,
            translation_provider=mock_translation_provider,
        )

        info = service._get_connection_info()

        assert info["type"] == "connected"
        assert info["session_id"] == service.session_id
        assert info["source_lang"] == "he"
        assert info["target_lang"] == "en"
        assert info["voice_id"] == "test-voice"
        assert info["sync_delay_ms"] == 600
