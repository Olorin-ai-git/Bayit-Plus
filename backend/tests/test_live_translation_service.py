"""
Tests for Live Translation Service

These tests verify the LiveTranslationService functionality with
multiple STT and translation providers (Google, Whisper, ElevenLabs).
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def mock_google_available():
    """Mock Google Cloud availability."""
    with patch("app.services.live_translation_service.GOOGLE_AVAILABLE", True):
        yield


@pytest.fixture
def mock_openai_available():
    """Mock OpenAI availability."""
    with patch("app.services.live_translation_service.OPENAI_AVAILABLE", True):
        yield


@pytest.fixture
def mock_elevenlabs_available():
    """Mock ElevenLabs availability."""
    with patch("app.services.live_translation_service.ELEVENLABS_AVAILABLE", True):
        yield


@pytest.fixture
def mock_anthropic_available():
    """Mock Anthropic availability."""
    with patch("app.services.live_translation_service.ANTHROPIC_AVAILABLE", True):
        yield


@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    with patch("app.services.live_translation_service.settings") as mock:
        mock.SPEECH_TO_TEXT_PROVIDER = "google"
        mock.LIVE_TRANSLATION_PROVIDER = "google"
        mock.ELEVENLABS_API_KEY = "test-elevenlabs-key"
        mock.OPENAI_API_KEY = "test-openai-key"
        mock.ANTHROPIC_API_KEY = "test-anthropic-key"
        mock.CLAUDE_MODEL = "claude-sonnet-4-20250514"
        yield mock


class TestLiveTranslationServiceInit:
    """Test service initialization with different providers."""

    def test_init_google_stt_google_translate(
        self, mock_settings, mock_google_available
    ):
        """Test initialization with Google STT and Google Translate."""
        with patch("app.services.live_translation_service.speech") as mock_speech:
            with patch(
                "app.services.live_translation_service.translate"
            ) as mock_translate:
                mock_speech.SpeechClient.return_value = MagicMock()
                mock_translate.Client.return_value = MagicMock()

                from app.services.live_translation_service import LiveTranslationService

                service = LiveTranslationService(
                    provider="google", translation_provider="google"
                )

                assert service.provider == "google"
                assert service.translation_provider == "google"
                assert service.speech_client is not None
                assert service.translate_client is not None

    def test_init_whisper_stt_openai_translate(
        self, mock_settings, mock_openai_available
    ):
        """Test initialization with Whisper STT and OpenAI Translate."""
        # Import the module first so we can patch its internals
        import app.services.live_translation_service as live_service

        mock_whisper_service = MagicMock()
        mock_openai_client = MagicMock()

        with patch.object(
            live_service, "WhisperTranscriptionService", create=True
        ) as mock_whisper:
            with patch.object(live_service, "AsyncOpenAI") as mock_openai:
                mock_whisper.return_value = mock_whisper_service
                mock_openai.return_value = mock_openai_client

                service = live_service.LiveTranslationService(
                    provider="whisper", translation_provider="openai"
                )

                assert service.provider == "whisper"
                assert service.translation_provider == "openai"
                assert service.whisper_service is not None
                assert service.openai_client is not None

    def test_init_elevenlabs_stt_google_translate(
        self, mock_settings, mock_elevenlabs_available, mock_google_available
    ):
        """Test initialization with ElevenLabs STT and Google Translate."""
        with patch(
            "app.services.live_translation_service.ElevenLabsRealtimeService"
        ) as mock_elevenlabs:
            with patch(
                "app.services.live_translation_service.translate"
            ) as mock_translate:
                mock_elevenlabs.return_value = MagicMock()
                mock_translate.Client.return_value = MagicMock()

                from app.services.live_translation_service import LiveTranslationService

                service = LiveTranslationService(
                    provider="elevenlabs", translation_provider="google"
                )

                assert service.provider == "elevenlabs"
                assert service.translation_provider == "google"
                assert service.elevenlabs_service is not None
                assert service.translate_client is not None

    def test_init_elevenlabs_stt_claude_translate(
        self,
        mock_settings,
        mock_elevenlabs_available,
        mock_anthropic_available,
    ):
        """Test initialization with ElevenLabs STT and Claude Translate."""
        with patch(
            "app.services.live_translation_service.ElevenLabsRealtimeService"
        ) as mock_elevenlabs:
            with patch(
                "app.services.live_translation_service.AsyncAnthropic"
            ) as mock_anthropic:
                mock_elevenlabs.return_value = MagicMock()
                mock_anthropic.return_value = MagicMock()

                from app.services.live_translation_service import LiveTranslationService

                service = LiveTranslationService(
                    provider="elevenlabs", translation_provider="claude"
                )

                assert service.provider == "elevenlabs"
                assert service.translation_provider == "claude"
                assert service.elevenlabs_service is not None
                assert service.anthropic_client is not None

    def test_init_invalid_stt_provider(self, mock_settings):
        """Test initialization fails with invalid STT provider."""
        from app.services.live_translation_service import LiveTranslationService

        with pytest.raises(ValueError) as exc_info:
            LiveTranslationService(provider="invalid", translation_provider="google")

        assert "Invalid STT provider" in str(exc_info.value)

    def test_init_invalid_translation_provider(
        self, mock_settings, mock_elevenlabs_available
    ):
        """Test initialization fails with invalid translation provider."""
        with patch(
            "app.services.live_translation_service.ElevenLabsRealtimeService"
        ) as mock_elevenlabs:
            mock_elevenlabs.return_value = MagicMock()

            from app.services.live_translation_service import LiveTranslationService

            with pytest.raises(ValueError) as exc_info:
                LiveTranslationService(
                    provider="elevenlabs", translation_provider="invalid"
                )

            assert "Invalid translation provider" in str(exc_info.value)


class TestLiveTranslationServiceVerify:
    """Test service availability verification."""

    def test_verify_elevenlabs_openai(
        self, mock_settings, mock_elevenlabs_available, mock_openai_available
    ):
        """Test service verification with ElevenLabs + OpenAI."""
        with patch(
            "app.services.live_translation_service.ElevenLabsRealtimeService"
        ) as mock_elevenlabs:
            with patch(
                "app.services.live_translation_service.AsyncOpenAI"
            ) as mock_openai:
                mock_elevenlabs_instance = MagicMock()
                mock_elevenlabs_instance.verify_service_availability.return_value = True
                mock_elevenlabs.return_value = mock_elevenlabs_instance
                mock_openai.return_value = MagicMock()

                from app.services.live_translation_service import LiveTranslationService

                service = LiveTranslationService(
                    provider="elevenlabs", translation_provider="openai"
                )

                status = service.verify_service_availability()

                assert status["stt_provider"] == "elevenlabs"
                assert status["translation_provider"] == "openai"
                assert status["speech_to_text"] is True
                assert status["translate"] is True


class TestLiveTranslationServiceTranslate:
    """Test translation functionality."""

    @pytest.mark.asyncio
    async def test_translate_google(
        self, mock_settings, mock_elevenlabs_available, mock_google_available
    ):
        """Test translation with Google Translate."""
        with patch(
            "app.services.live_translation_service.ElevenLabsRealtimeService"
        ) as mock_elevenlabs:
            with patch(
                "app.services.live_translation_service.translate"
            ) as mock_translate:
                mock_elevenlabs.return_value = MagicMock()
                mock_translate_client = MagicMock()
                mock_translate_client.translate.return_value = {
                    "translatedText": "Hello"
                }
                mock_translate.Client.return_value = mock_translate_client

                from app.services.live_translation_service import LiveTranslationService

                service = LiveTranslationService(
                    provider="elevenlabs", translation_provider="google"
                )

                result = await service.translate_text("שלום", "he", "en")

                assert result == "Hello"
                mock_translate_client.translate.assert_called_once()

    @pytest.mark.asyncio
    async def test_translate_openai(
        self, mock_settings, mock_elevenlabs_available, mock_openai_available
    ):
        """Test translation with OpenAI GPT-4o-mini."""
        with patch(
            "app.services.live_translation_service.ElevenLabsRealtimeService"
        ) as mock_elevenlabs:
            with patch(
                "app.services.live_translation_service.AsyncOpenAI"
            ) as mock_openai:
                mock_elevenlabs.return_value = MagicMock()

                # Create mock response
                mock_message = MagicMock()
                mock_message.content = "Hello"
                mock_choice = MagicMock()
                mock_choice.message = mock_message
                mock_response = MagicMock()
                mock_response.choices = [mock_choice]

                mock_openai_instance = AsyncMock()
                mock_openai_instance.chat.completions.create = AsyncMock(
                    return_value=mock_response
                )
                mock_openai.return_value = mock_openai_instance

                from app.services.live_translation_service import LiveTranslationService

                service = LiveTranslationService(
                    provider="elevenlabs", translation_provider="openai"
                )

                result = await service.translate_text("שלום", "he", "en")

                assert result == "Hello"

    @pytest.mark.asyncio
    async def test_translate_claude(
        self,
        mock_settings,
        mock_elevenlabs_available,
        mock_anthropic_available,
    ):
        """Test translation with Claude."""
        with patch(
            "app.services.live_translation_service.ElevenLabsRealtimeService"
        ) as mock_elevenlabs:
            with patch(
                "app.services.live_translation_service.AsyncAnthropic"
            ) as mock_anthropic:
                mock_elevenlabs.return_value = MagicMock()

                # Create mock response
                mock_content = MagicMock()
                mock_content.text = "Hello"
                mock_response = MagicMock()
                mock_response.content = [mock_content]

                mock_anthropic_instance = AsyncMock()
                mock_anthropic_instance.messages.create = AsyncMock(
                    return_value=mock_response
                )
                mock_anthropic.return_value = mock_anthropic_instance

                from app.services.live_translation_service import LiveTranslationService

                service = LiveTranslationService(
                    provider="elevenlabs", translation_provider="claude"
                )

                result = await service.translate_text("שלום", "he", "en")

                assert result == "Hello"

    @pytest.mark.asyncio
    async def test_translate_error_returns_original(
        self, mock_settings, mock_elevenlabs_available, mock_google_available
    ):
        """Test that translation errors return original text."""
        with patch(
            "app.services.live_translation_service.ElevenLabsRealtimeService"
        ) as mock_elevenlabs:
            with patch(
                "app.services.live_translation_service.translate"
            ) as mock_translate:
                mock_elevenlabs.return_value = MagicMock()
                mock_translate_client = MagicMock()
                mock_translate_client.translate.side_effect = Exception("API error")
                mock_translate.Client.return_value = mock_translate_client

                from app.services.live_translation_service import LiveTranslationService

                service = LiveTranslationService(
                    provider="elevenlabs", translation_provider="google"
                )

                result = await service.translate_text("שלום", "he", "en")

                # On error, should return original text
                assert result == "שלום"
