"""
Tests for ElevenLabs Realtime Speech-to-Text Service

These tests verify the ElevenLabs realtime STT service functionality,
including initialization, connection management, and transcription flow.
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    with patch("app.services.elevenlabs_realtime_service.settings") as mock:
        mock.ELEVENLABS_API_KEY = "test-api-key"
        yield mock


@pytest.fixture
def mock_websockets():
    """Mock websockets library."""
    with patch("app.services.elevenlabs_realtime_service.WEBSOCKETS_AVAILABLE", True):
        with patch("app.services.elevenlabs_realtime_service.websockets") as mock:
            yield mock


class TestElevenLabsRealtimeServiceInit:
    """Test service initialization."""

    def test_init_without_websockets(self, mock_settings):
        """Test initialization fails when websockets not available."""
        with patch(
            "app.services.elevenlabs_realtime_service.WEBSOCKETS_AVAILABLE", False
        ):
            from app.services.elevenlabs_realtime_service import (
                ElevenLabsRealtimeService,
            )

            with pytest.raises(ImportError) as exc_info:
                ElevenLabsRealtimeService()

            assert "websockets" in str(exc_info.value)

    def test_init_without_api_key(self, mock_websockets):
        """Test initialization fails when API key not configured."""
        with patch("app.services.elevenlabs_realtime_service.settings") as mock:
            mock.ELEVENLABS_API_KEY = ""

            from app.services.elevenlabs_realtime_service import (
                ElevenLabsRealtimeService,
            )

            with pytest.raises(ValueError) as exc_info:
                ElevenLabsRealtimeService()

            assert "ELEVENLABS_API_KEY" in str(exc_info.value)

    def test_init_success(self, mock_settings, mock_websockets):
        """Test successful initialization."""
        from app.services.elevenlabs_realtime_service import ElevenLabsRealtimeService

        service = ElevenLabsRealtimeService()

        assert service.api_key == "test-api-key"
        assert service.websocket is None
        assert not service._connected
        assert not service._running
        assert service._reconnect_attempts == 0


class TestElevenLabsRealtimeServiceConnect:
    """Test WebSocket connection management."""

    @pytest.mark.asyncio
    async def test_connect_success(self, mock_settings, mock_websockets):
        """Test successful WebSocket connection with session confirmation."""
        mock_ws = AsyncMock()
        mock_websockets.connect = AsyncMock(return_value=mock_ws)

        from app.services.elevenlabs_realtime_service import ElevenLabsRealtimeService

        service = ElevenLabsRealtimeService()

        # Mock the receive loop to simulate session_started message
        async def mock_receive_loop():
            # Simulate session confirmation
            service._session_confirmed = True
            service._session_event.set()

        with patch.object(service, "_receive_loop", mock_receive_loop):
            await service.connect("he", timeout=1.0)

        assert service._connected
        assert service._session_confirmed
        assert service._running
        assert service.websocket == mock_ws
        assert service._reconnect_attempts == 0

    @pytest.mark.asyncio
    async def test_connect_already_connected(self, mock_settings, mock_websockets):
        """Test that connecting when already connected logs warning."""
        from app.services.elevenlabs_realtime_service import ElevenLabsRealtimeService

        service = ElevenLabsRealtimeService()
        service._connected = True
        service._session_confirmed = True

        with patch("app.services.elevenlabs_realtime_service.logger") as mock_logger:
            await service.connect("he")
            mock_logger.warning.assert_called_once()

    @pytest.mark.asyncio
    async def test_connect_failure(self, mock_settings, mock_websockets):
        """Test connection failure handling."""
        mock_websockets.connect = AsyncMock(side_effect=Exception("Connection failed"))

        from app.services.elevenlabs_realtime_service import ElevenLabsRealtimeService

        service = ElevenLabsRealtimeService()

        with pytest.raises(Exception) as exc_info:
            await service.connect("he")

        assert "Connection failed" in str(exc_info.value)
        assert not service._connected


class TestElevenLabsRealtimeServiceReconnect:
    """Test reconnection logic."""

    @pytest.mark.asyncio
    async def test_reconnect_max_attempts_exceeded(
        self, mock_settings, mock_websockets
    ):
        """Test that reconnection stops after max attempts."""
        from app.services.elevenlabs_realtime_service import (
            MAX_RECONNECT_ATTEMPTS,
            ElevenLabsRealtimeService,
        )

        service = ElevenLabsRealtimeService()
        service._reconnect_attempts = MAX_RECONNECT_ATTEMPTS

        result = await service._attempt_reconnect()

        assert result is False
        assert service._reconnect_attempts == MAX_RECONNECT_ATTEMPTS

    @pytest.mark.asyncio
    async def test_reconnect_exponential_backoff(self, mock_settings, mock_websockets):
        """Test reconnection uses exponential backoff."""
        mock_ws = AsyncMock()
        mock_websockets.connect = AsyncMock(return_value=mock_ws)

        from app.services.elevenlabs_realtime_service import (
            INITIAL_RECONNECT_DELAY_SEC,
            RECONNECT_BACKOFF_MULTIPLIER,
            ElevenLabsRealtimeService,
        )

        service = ElevenLabsRealtimeService()
        service._source_lang = "he"
        service._reconnect_attempts = 1

        # Mock the receive loop to simulate session_started message
        async def mock_receive_loop():
            service._session_confirmed = True
            service._session_event.set()

        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            with patch.object(service, "_receive_loop", mock_receive_loop):
                await service._attempt_reconnect()

            # Second attempt should have delay of INITIAL * BACKOFF^1
            expected_delay = INITIAL_RECONNECT_DELAY_SEC * RECONNECT_BACKOFF_MULTIPLIER
            mock_sleep.assert_called_once()
            actual_delay = mock_sleep.call_args[0][0]
            assert actual_delay == pytest.approx(expected_delay)


class TestElevenLabsRealtimeServiceAudio:
    """Test audio handling."""

    @pytest.mark.asyncio
    async def test_send_audio_chunk_connected(self, mock_settings, mock_websockets):
        """Test sending audio when connected with session confirmed."""
        mock_ws = AsyncMock()

        from app.services.elevenlabs_realtime_service import ElevenLabsRealtimeService

        service = ElevenLabsRealtimeService()
        service._connected = True
        service._session_confirmed = True
        service.websocket = mock_ws

        audio_data = b"\x00\x01\x02\x03"
        await service.send_audio_chunk(audio_data)

        # Verify the websocket.send was called (with JSON message containing base64 audio)
        mock_ws.send.assert_called_once()
        assert audio_data in service._audio_buffer

    @pytest.mark.asyncio
    async def test_send_audio_chunk_disconnected(self, mock_settings, mock_websockets):
        """Test sending audio when disconnected buffers it."""
        from app.services.elevenlabs_realtime_service import ElevenLabsRealtimeService

        service = ElevenLabsRealtimeService()
        service._connected = False

        audio_data = b"\x00\x01\x02\x03"
        await service.send_audio_chunk(audio_data)

        # Audio should be buffered even when disconnected
        assert audio_data in service._audio_buffer

    @pytest.mark.asyncio
    async def test_audio_buffer_rolling(self, mock_settings, mock_websockets):
        """Test that audio buffer rolls to prevent memory growth."""
        from app.services.elevenlabs_realtime_service import ElevenLabsRealtimeService

        service = ElevenLabsRealtimeService()
        service._connected = False

        # Add more than 100 chunks
        for i in range(150):
            await service.send_audio_chunk(bytes([i]))

        # Buffer should only keep last 100
        assert len(service._audio_buffer) == 100


class TestElevenLabsRealtimeServiceClose:
    """Test connection close and cleanup."""

    @pytest.mark.asyncio
    async def test_close_cleanup(self, mock_settings, mock_websockets):
        """Test that close properly cleans up resources."""
        mock_ws = AsyncMock()

        # Create a proper task mock that can be awaited
        async def mock_coro():
            raise asyncio.CancelledError()

        mock_task = asyncio.create_task(mock_coro())

        from app.services.elevenlabs_realtime_service import ElevenLabsRealtimeService

        service = ElevenLabsRealtimeService()
        service._connected = True
        service._running = True
        service.websocket = mock_ws
        service._receive_task = mock_task
        service._audio_buffer = [b"test"]

        await service.close()

        assert not service._running
        assert not service._connected
        assert service.websocket is None
        assert service._receive_task is None
        assert len(service._audio_buffer) == 0
        mock_ws.close.assert_called_once()


class TestElevenLabsRealtimeServiceVerify:
    """Test service availability verification."""

    def test_verify_service_available(self, mock_settings, mock_websockets):
        """Test service verification when everything is available."""
        from app.services.elevenlabs_realtime_service import ElevenLabsRealtimeService

        service = ElevenLabsRealtimeService()
        result = service.verify_service_availability()

        assert result is True

    def test_verify_service_no_api_key(self, mock_websockets):
        """Test service verification when API key is missing."""
        with patch("app.services.elevenlabs_realtime_service.settings") as mock:
            mock.ELEVENLABS_API_KEY = "test-key"  # For init
            from app.services.elevenlabs_realtime_service import (
                ElevenLabsRealtimeService,
            )

            service = ElevenLabsRealtimeService()

            # Now remove the key
            mock.ELEVENLABS_API_KEY = ""

            result = service.verify_service_availability()
            assert result is False


class TestElevenLabsRealtimeServiceProperties:
    """Test service properties."""

    def test_is_connected_property(self, mock_settings, mock_websockets):
        """Test is_connected property requires both connected and session confirmed."""
        from app.services.elevenlabs_realtime_service import ElevenLabsRealtimeService

        service = ElevenLabsRealtimeService()

        # Initially both are False
        assert service.is_connected is False

        # Only _connected is True - should still be False
        service._connected = True
        assert service.is_connected is False

        # Only _session_confirmed is True - should still be False
        service._connected = False
        service._session_confirmed = True
        assert service.is_connected is False

        # Both True - should be True
        service._connected = True
        service._session_confirmed = True
        assert service.is_connected is True

    def test_reconnect_attempts_property(self, mock_settings, mock_websockets):
        """Test reconnect_attempts property."""
        from app.services.elevenlabs_realtime_service import ElevenLabsRealtimeService

        service = ElevenLabsRealtimeService()

        assert service.reconnect_attempts == 0

        service._reconnect_attempts = 3
        assert service.reconnect_attempts == 3
