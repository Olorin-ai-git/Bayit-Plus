"""
Integration Tests for Live Translation Service

These tests verify the end-to-end flow of the live translation system
with mocked external services.
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class MockWebSocket:
    """Mock WebSocket for testing audio streaming."""

    def __init__(self, transcripts: list[str]):
        self.transcripts = transcripts
        self.sent_audio = []
        self.closed = False
        self._transcript_index = 0

    async def send(self, data: bytes) -> None:
        """Record sent audio data."""
        self.sent_audio.append(data)

    async def __aiter__(self):
        """Iterate through mock transcripts."""
        import json
        for transcript in self.transcripts:
            yield json.dumps({
                "type": "transcript",
                "text": transcript
            })

    async def close(self) -> None:
        """Mark connection as closed."""
        self.closed = True


@pytest.fixture
def mock_elevenlabs_settings():
    """Mock settings for ElevenLabs."""
    with patch("app.services.elevenlabs_realtime_service.settings") as mock:
        mock.ELEVENLABS_API_KEY = "test-elevenlabs-key"
        yield mock


@pytest.fixture
def mock_translation_settings():
    """Mock settings for LiveTranslationService."""
    with patch("app.services.live_translation_service.settings") as mock:
        mock.SPEECH_TO_TEXT_PROVIDER = "elevenlabs"
        mock.LIVE_TRANSLATION_PROVIDER = "google"
        mock.ELEVENLABS_API_KEY = "test-elevenlabs-key"
        mock.OPENAI_API_KEY = "test-openai-key"
        mock.ANTHROPIC_API_KEY = "test-anthropic-key"
        mock.CLAUDE_MODEL = "claude-sonnet-4-20250514"
        yield mock


class TestLiveTranslationIntegration:
    """Integration tests for the live translation pipeline."""

    @pytest.mark.asyncio
    async def test_elevenlabs_transcription_to_translation_flow(
        self, mock_elevenlabs_settings, mock_translation_settings
    ):
        """Test the full flow: audio -> ElevenLabs STT -> Google Translate -> subtitles."""
        # Mock transcripts that ElevenLabs would return
        mock_transcripts = ["שלום", "מה שלומך", "תודה רבה"]
        mock_translations = ["Hello", "How are you", "Thank you very much"]

        with patch(
            "app.services.live_translation_service.ELEVENLABS_AVAILABLE", True
        ):
            with patch(
                "app.services.live_translation_service.GOOGLE_AVAILABLE", True
            ):
                with patch(
                    "app.services.live_translation_service.ElevenLabsRealtimeService"
                ) as mock_elevenlabs:
                    with patch(
                        "app.services.live_translation_service.translate"
                    ) as mock_translate:
                        # Setup ElevenLabs mock
                        mock_elevenlabs_instance = MagicMock()

                        async def mock_transcribe_stream(audio_stream, source_lang):
                            for transcript in mock_transcripts:
                                yield transcript

                        mock_elevenlabs_instance.transcribe_audio_stream = (
                            mock_transcribe_stream
                        )
                        mock_elevenlabs_instance.verify_service_availability.return_value = (
                            True
                        )
                        mock_elevenlabs.return_value = mock_elevenlabs_instance

                        # Setup Google Translate mock
                        mock_translate_client = MagicMock()
                        translation_map = dict(zip(mock_transcripts, mock_translations))

                        def translate_text(text, source_language, target_language):
                            return {"translatedText": translation_map.get(text, text)}

                        mock_translate_client.translate = translate_text
                        mock_translate.Client.return_value = mock_translate_client

                        # Import and create service
                        from app.services.live_translation_service import (
                            LiveTranslationService,
                        )

                        service = LiveTranslationService(
                            provider="elevenlabs", translation_provider="google"
                        )

                        # Simulate audio stream
                        async def audio_generator():
                            for i in range(3):
                                yield b"\x00" * 1600  # 100ms of 16kHz mono audio

                        # Run the translation pipeline
                        subtitles = []
                        async for subtitle in service.process_live_audio_to_subtitles(
                            audio_generator(),
                            source_lang="he",
                            target_lang="en"
                        ):
                            subtitles.append(subtitle)

                        # Verify we got translated subtitles
                        assert len(subtitles) == 3
                        # Subtitles are returned as dicts with 'text' field
                        subtitle_texts = [s["text"] for s in subtitles]
                        assert subtitle_texts == mock_translations

    @pytest.mark.asyncio
    async def test_provider_status_reporting(
        self, mock_elevenlabs_settings, mock_translation_settings
    ):
        """Test that service status correctly reports both providers."""
        with patch(
            "app.services.live_translation_service.ELEVENLABS_AVAILABLE", True
        ):
            with patch(
                "app.services.live_translation_service.OPENAI_AVAILABLE", True
            ):
                with patch(
                    "app.services.live_translation_service.ElevenLabsRealtimeService"
                ) as mock_elevenlabs:
                    with patch(
                        "app.services.live_translation_service.AsyncOpenAI"
                    ) as mock_openai:
                        mock_elevenlabs_instance = MagicMock()
                        mock_elevenlabs_instance.verify_service_availability.return_value = (
                            True
                        )
                        mock_elevenlabs.return_value = mock_elevenlabs_instance
                        mock_openai.return_value = MagicMock()

                        from app.services.live_translation_service import (
                            LiveTranslationService,
                        )

                        service = LiveTranslationService(
                            provider="elevenlabs", translation_provider="openai"
                        )

                        status = service.verify_service_availability()

                        assert status["stt_provider"] == "elevenlabs"
                        assert status["translation_provider"] == "openai"
                        assert status["speech_to_text"] is True
                        assert status["translate"] is True

    @pytest.mark.asyncio
    async def test_translation_fallback_on_error(
        self, mock_elevenlabs_settings, mock_translation_settings
    ):
        """Test that translation errors return original text gracefully."""
        with patch(
            "app.services.live_translation_service.ELEVENLABS_AVAILABLE", True
        ):
            with patch(
                "app.services.live_translation_service.GOOGLE_AVAILABLE", True
            ):
                with patch(
                    "app.services.live_translation_service.ElevenLabsRealtimeService"
                ) as mock_elevenlabs:
                    with patch(
                        "app.services.live_translation_service.translate"
                    ) as mock_translate:
                        mock_elevenlabs_instance = MagicMock()
                        mock_elevenlabs_instance.verify_service_availability.return_value = (
                            True
                        )
                        mock_elevenlabs.return_value = mock_elevenlabs_instance

                        # Setup translate to raise an error
                        mock_translate_client = MagicMock()
                        mock_translate_client.translate.side_effect = Exception(
                            "API rate limit exceeded"
                        )
                        mock_translate.Client.return_value = mock_translate_client

                        from app.services.live_translation_service import (
                            LiveTranslationService,
                        )

                        service = LiveTranslationService(
                            provider="elevenlabs", translation_provider="google"
                        )

                        # Translation should return original text on error
                        result = await service.translate_text("שלום", "he", "en")
                        assert result == "שלום"  # Original text returned


class TestElevenLabsReconnection:
    """Test ElevenLabs reconnection behavior."""

    @pytest.mark.asyncio
    async def test_reconnection_preserves_audio_buffer(self):
        """Test that audio buffer is preserved during reconnection."""
        with patch("app.services.elevenlabs_realtime_service.settings") as mock_settings:
            with patch(
                "app.services.elevenlabs_realtime_service.WEBSOCKETS_AVAILABLE", True
            ):
                mock_settings.ELEVENLABS_API_KEY = "test-key"

                from app.services.elevenlabs_realtime_service import (
                    ElevenLabsRealtimeService,
                )

                service = ElevenLabsRealtimeService()

                # Add audio to buffer
                test_audio = [b"\x00" * 100 for _ in range(10)]
                for chunk in test_audio:
                    await service.send_audio_chunk(chunk)

                # Verify buffer has audio
                assert len(service._audio_buffer) == 10

                # Simulate disconnection
                service._connected = False

                # Add more audio while disconnected
                await service.send_audio_chunk(b"\x01" * 100)

                # Buffer should still grow
                assert len(service._audio_buffer) == 11

    @pytest.mark.asyncio
    async def test_buffer_rolling_prevents_memory_growth(self):
        """Test that buffer rolls to prevent unbounded memory growth."""
        with patch("app.services.elevenlabs_realtime_service.settings") as mock_settings:
            with patch(
                "app.services.elevenlabs_realtime_service.WEBSOCKETS_AVAILABLE", True
            ):
                mock_settings.ELEVENLABS_API_KEY = "test-key"

                from app.services.elevenlabs_realtime_service import (
                    ElevenLabsRealtimeService,
                )

                service = ElevenLabsRealtimeService()
                service._connected = False  # Don't try to send

                # Add more than 100 chunks
                for i in range(150):
                    await service.send_audio_chunk(bytes([i % 256]))

                # Buffer should cap at 100
                assert len(service._audio_buffer) == 100

                # First chunk should be the 51st one added (0-indexed: 50)
                assert service._audio_buffer[0] == bytes([50])


class TestMultiProviderConfiguration:
    """Test various provider combinations."""

    @pytest.mark.asyncio
    async def test_elevenlabs_with_claude_translation(
        self, mock_translation_settings
    ):
        """Test ElevenLabs STT with Claude translation."""
        with patch(
            "app.services.live_translation_service.ELEVENLABS_AVAILABLE", True
        ):
            with patch(
                "app.services.live_translation_service.ANTHROPIC_AVAILABLE", True
            ):
                with patch(
                    "app.services.live_translation_service.ElevenLabsRealtimeService"
                ) as mock_elevenlabs:
                    with patch(
                        "app.services.live_translation_service.AsyncAnthropic"
                    ) as mock_anthropic:
                        mock_elevenlabs_instance = MagicMock()
                        mock_elevenlabs_instance.verify_service_availability.return_value = (
                            True
                        )
                        mock_elevenlabs.return_value = mock_elevenlabs_instance

                        # Setup Claude mock
                        mock_content = MagicMock()
                        mock_content.text = "Hello"
                        mock_response = MagicMock()
                        mock_response.content = [mock_content]

                        mock_anthropic_instance = AsyncMock()
                        mock_anthropic_instance.messages.create = AsyncMock(
                            return_value=mock_response
                        )
                        mock_anthropic.return_value = mock_anthropic_instance

                        from app.services.live_translation_service import (
                            LiveTranslationService,
                        )

                        service = LiveTranslationService(
                            provider="elevenlabs", translation_provider="claude"
                        )

                        result = await service.translate_text("שלום", "he", "en")

                        assert result == "Hello"
                        mock_anthropic_instance.messages.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_all_supported_language_codes(self, mock_translation_settings):
        """Test that all supported languages have proper codes."""
        from app.services.elevenlabs_realtime_service import ELEVENLABS_LANGUAGE_CODES

        expected_languages = ["he", "en", "ar", "es", "ru", "fr", "de", "it", "pt", "yi"]

        for lang in expected_languages:
            assert lang in ELEVENLABS_LANGUAGE_CODES
            assert ELEVENLABS_LANGUAGE_CODES[lang] == lang
