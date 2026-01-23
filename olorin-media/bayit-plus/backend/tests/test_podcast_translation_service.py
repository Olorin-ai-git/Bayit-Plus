"""
Unit and Integration Tests for Podcast Translation Service

Tests the complete podcast translation pipeline including:
- Audio download with SSRF protection
- Vocal separation
- Speech-to-text transcription
- Text translation
- Text-to-speech synthesis
- Audio mixing
- GCS upload
- MongoDB atomic updates
"""

from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch
from urllib.parse import urlparse

import pytest
from app.models.content import PodcastEpisode, PodcastEpisodeTranslation
from app.services.audio_processing_service import AudioProcessingService
from app.services.podcast_translation_service import PodcastTranslationService


class TestPodcastTranslationService:
    """Test cases for PodcastTranslationService."""

    @pytest.fixture
    def mock_episode(self):
        """Create a mock podcast episode."""
        episode = Mock(spec=PodcastEpisode)
        episode.id = "test_episode_123"
        episode.title = "Test Episode"
        episode.audio_url = "https://cdn.podcasts.com/episode.mp3"
        episode.original_language = "he"
        episode.translation_status = "pending"
        episode.translations = {}
        episode.available_languages = []
        episode.retry_count = 0
        return episode

    @pytest.fixture
    def translation_service(self):
        """Create a translation service instance with mocked dependencies."""
        mock_audio_processor = Mock(spec=AudioProcessingService)
        mock_translation = Mock()
        mock_tts = Mock()
        mock_stt = Mock()
        mock_storage = Mock()

        service = PodcastTranslationService(
            audio_processor=mock_audio_processor,
            translation_service=mock_translation,
            tts_service=mock_tts,
            stt_service=mock_stt,
            storage=mock_storage,
        )

        return service

    def test_initialization(self, translation_service):
        """Test service initialization with dependency injection."""
        assert translation_service.audio_processor is not None
        assert translation_service.translation_service is not None
        assert translation_service.tts_service is not None
        assert translation_service.stt_service is not None
        assert translation_service.storage is not None
        assert translation_service.temp_dir.exists()

    def test_get_voice_id_hebrew(self, translation_service):
        """Test getting Hebrew voice ID."""
        with patch("app.services.podcast_translation_service.settings") as mock_settings:
            mock_settings.ELEVENLABS_HEBREW_VOICE_ID = "hebrew_voice_123"
            voice_id = translation_service._get_voice_id("he")
            assert voice_id == "hebrew_voice_123"

    def test_get_voice_id_english(self, translation_service):
        """Test getting English voice ID."""
        with patch("app.services.podcast_translation_service.settings") as mock_settings:
            mock_settings.ELEVENLABS_ENGLISH_VOICE_ID = "english_voice_456"
            voice_id = translation_service._get_voice_id("en")
            assert voice_id == "english_voice_456"

    def test_get_voice_id_unsupported_language(self, translation_service):
        """Test getting voice ID for unsupported language returns default."""
        with patch("app.services.podcast_translation_service.settings") as mock_settings:
            mock_settings.ELEVENLABS_DEFAULT_VOICE_ID = "default_voice_789"
            voice_id = translation_service._get_voice_id("fr")
            assert voice_id == "default_voice_789"

    @pytest.mark.asyncio
    async def test_download_audio_ssrf_protection_no_whitelist(self, translation_service):
        """Test SSRF protection fails without configured whitelist."""
        with patch("app.services.podcast_translation_service.settings") as mock_settings:
            mock_settings.ALLOWED_AUDIO_DOMAINS = []

            with pytest.raises(ValueError) as exc_info:
                await translation_service._download_audio(
                    "https://podcasts.example.com/episode.mp3"
                )

            assert "ALLOWED_AUDIO_DOMAINS not configured" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_download_audio_ssrf_protection_domain_not_allowed(
        self, translation_service
    ):
        """Test SSRF protection blocks non-whitelisted domains."""
        with patch("app.services.podcast_translation_service.settings") as mock_settings:
            mock_settings.ALLOWED_AUDIO_DOMAINS = ["podcasts.com", "soundcloud.com"]

            with pytest.raises(ValueError) as exc_info:
                await translation_service._download_audio(
                    "https://evil-site.com/malware.mp3"
                )

            assert "not allowed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_download_audio_ssrf_protection_blocks_localhost(
        self, translation_service
    ):
        """Test SSRF protection blocks localhost."""
        with patch("app.services.podcast_translation_service.settings") as mock_settings:
            mock_settings.ALLOWED_AUDIO_DOMAINS = ["localhost"]

            with pytest.raises(ValueError) as exc_info:
                await translation_service._download_audio("https://localhost/file.mp3")

            assert "Cannot download from internal IP" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_download_audio_ssrf_protection_blocks_internal_ip(
        self, translation_service
    ):
        """Test SSRF protection blocks internal IPs."""
        with patch("app.services.podcast_translation_service.settings") as mock_settings:
            mock_settings.ALLOWED_AUDIO_DOMAINS = ["192.168.1.100"]

            with pytest.raises(ValueError) as exc_info:
                await translation_service._download_audio(
                    "https://192.168.1.100/file.mp3"
                )

            assert "Cannot download from internal IP" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_download_audio_success(self, translation_service, tmp_path):
        """Test successful audio download."""
        mock_response = Mock()
        mock_response.headers = {
            "content-type": "audio/mpeg",
            "content-length": "1024000",
        }
        mock_response.content = b"fake audio data"
        mock_response.raise_for_status = Mock()

        with patch("app.services.podcast_translation_service.settings") as mock_settings, patch(
            "app.services.podcast_translation_service.httpx.AsyncClient"
        ) as mock_client_class:

            mock_settings.ALLOWED_AUDIO_DOMAINS = ["podcasts.com"]
            translation_service.temp_dir = tmp_path

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )
            mock_client_class.return_value = mock_client

            filepath = await translation_service._download_audio(
                "https://podcasts.com/episode.mp3"
            )

            assert Path(filepath).exists()
            assert Path(filepath).read_bytes() == b"fake audio data"

    @pytest.mark.asyncio
    async def test_download_audio_invalid_content_type(self, translation_service):
        """Test download fails for invalid content type."""
        mock_response = Mock()
        mock_response.headers = {"content-type": "text/html", "content-length": "1024"}
        mock_response.raise_for_status = Mock()

        with patch("app.services.podcast_translation_service.settings") as mock_settings, patch(
            "app.services.podcast_translation_service.httpx.AsyncClient"
        ) as mock_client_class:

            mock_settings.ALLOWED_AUDIO_DOMAINS = ["podcasts.com"]

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )
            mock_client_class.return_value = mock_client

            with pytest.raises(ValueError) as exc_info:
                await translation_service._download_audio(
                    "https://podcasts.com/episode.mp3"
                )

            assert "Invalid content type" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_download_audio_file_too_large(self, translation_service):
        """Test download fails for files exceeding size limit."""
        mock_response = Mock()
        mock_response.headers = {
            "content-type": "audio/mpeg",
            "content-length": str(600 * 1024 * 1024),  # 600MB
        }
        mock_response.raise_for_status = Mock()

        with patch("app.services.podcast_translation_service.settings") as mock_settings, patch(
            "app.services.podcast_translation_service.httpx.AsyncClient"
        ) as mock_client_class:

            mock_settings.ALLOWED_AUDIO_DOMAINS = ["podcasts.com"]

            mock_client = AsyncMock()
            mock_client.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )
            mock_client_class.return_value = mock_client

            with pytest.raises(ValueError) as exc_info:
                await translation_service._download_audio(
                    "https://podcasts.com/episode.mp3"
                )

            assert "too large" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_transcribe_audio(self, translation_service, tmp_path):
        """Test audio transcription with language detection."""
        # Create a mock audio file
        audio_file = tmp_path / "test.mp3"
        audio_file.write_bytes(b"fake audio")

        # Mock Whisper transcription response
        mock_result = {
            "text": "זהו טקסט לדוגמה בעברית",
            "language": "he",
        }

        mock_model = Mock()
        mock_model.transcribe.return_value = mock_result

        with patch("app.services.podcast_translation_service.whisper") as mock_whisper, patch(
            "app.services.podcast_translation_service.torch"
        ) as mock_torch:

            mock_torch.cuda.is_available.return_value = False
            mock_whisper.load_model.return_value = mock_model

            transcript, detected_lang = await translation_service._transcribe_audio(
                str(audio_file)
            )

            assert transcript == "זהו טקסט לדוגמה בעברית"
            assert detected_lang == "he"
            mock_whisper.load_model.assert_called_once_with("large-v3", device="cpu")

    @pytest.mark.asyncio
    async def test_generate_tts(self, translation_service, tmp_path):
        """Test TTS generation with proper voice settings."""
        output_path = str(tmp_path / "output.mp3")

        mock_stream = AsyncMock()
        mock_stream.save = AsyncMock()
        mock_stream.__aenter__.return_value = mock_stream
        mock_stream.__aexit__.return_value = None

        translation_service.tts_service.stream_text_to_speech = Mock(
            return_value=mock_stream
        )

        with patch("app.services.podcast_translation_service.settings") as mock_settings:
            mock_settings.ELEVENLABS_STABILITY = 0.75
            mock_settings.ELEVENLABS_SIMILARITY_BOOST = 0.85
            mock_settings.ELEVENLABS_STYLE = 0.4
            mock_settings.ELEVENLABS_SPEAKER_BOOST = True
            mock_settings.ELEVENLABS_MODEL = "eleven_multilingual_v2"
            mock_settings.ELEVENLABS_HEBREW_VOICE_ID = "hebrew_voice_123"

            result_path = await translation_service._generate_tts(
                text="This is a test", language="he", output_path=output_path
            )

            assert result_path == output_path
            translation_service.tts_service.stream_text_to_speech.assert_called_once()

            # Verify voice settings were passed correctly
            call_kwargs = (
                translation_service.tts_service.stream_text_to_speech.call_args[1]
            )
            assert call_kwargs["voice_settings"]["stability"] == 0.75
            assert call_kwargs["voice_settings"]["similarity_boost"] == 0.85
            assert call_kwargs["voice_settings"]["style"] == 0.4
            assert call_kwargs["voice_settings"]["use_speaker_boost"] is True
            assert call_kwargs["model"] == "eleven_multilingual_v2"
            assert call_kwargs["output_format"] == "mp3_44100_128"

    @pytest.mark.asyncio
    async def test_translate_episode_atomic_update(
        self, translation_service, mock_episode
    ):
        """Test atomic MongoDB update prevents duplicate processing."""
        # Mock the find_one_and_update to return None (already being processed)
        mock_find_result = None

        with patch.object(
            PodcastEpisode, "find_one", return_value=Mock(update=AsyncMock(return_value=mock_find_result))
        ):
            with pytest.raises(ValueError) as exc_info:
                await translation_service.translate_episode(mock_episode, force=False)

            assert "already being processed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_translate_episode_increments_retry_on_failure(
        self, translation_service, mock_episode
    ):
        """Test retry counter is incremented on failure."""
        mock_episode.update = AsyncMock()

        # Mock successful atomic update
        mock_find_result = Mock()

        with patch.object(
            PodcastEpisode,
            "find_one",
            return_value=Mock(update=AsyncMock(return_value=mock_find_result)),
        ), patch.object(
            translation_service, "_download_audio", side_effect=Exception("Download failed")
        ):

            with pytest.raises(Exception):
                await translation_service.translate_episode(mock_episode)

            # Verify retry count was incremented
            mock_episode.update.assert_called()
            update_call = mock_episode.update.call_args[0][0]
            assert "$inc" in update_call
            assert update_call["$inc"]["retry_count"] == 1
            assert update_call["$set"]["translation_status"] == "failed"

    @pytest.mark.asyncio
    async def test_translate_episode_success_updates_status(
        self, translation_service, mock_episode, tmp_path
    ):
        """Test successful translation updates episode with completed status."""
        mock_episode.update = AsyncMock()

        # Mock all pipeline steps
        mock_find_result = Mock()
        audio_file = tmp_path / "audio.mp3"
        audio_file.write_bytes(b"audio")

        vocals_file = tmp_path / "vocals.mp3"
        vocals_file.write_bytes(b"vocals")

        background_file = tmp_path / "background.mp3"
        background_file.write_bytes(b"background")

        final_file = tmp_path / "final.mp3"
        final_file.write_bytes(b"final")

        with patch.object(
            PodcastEpisode,
            "find_one",
            return_value=Mock(update=AsyncMock(return_value=mock_find_result)),
        ), patch.object(
            translation_service, "_download_audio", return_value=str(audio_file)
        ), patch.object(
            translation_service.audio_processor,
            "separate_vocals",
            return_value=(str(vocals_file), str(background_file)),
        ), patch.object(
            translation_service,
            "_transcribe_audio",
            return_value=("זהו טקסט בעברית", "he"),
        ), patch.object(
            translation_service.translation_service,
            "translate",
            return_value="This is text in English",
        ), patch.object(
            translation_service, "_generate_tts", return_value=str(vocals_file)
        ), patch.object(
            translation_service.audio_processor,
            "mix_audio",
            return_value=str(final_file),
        ), patch.object(
            translation_service,
            "_upload_translated_audio",
            return_value="https://storage.googleapis.com/translated.mp3",
        ), patch.object(
            translation_service.audio_processor, "get_audio_duration", return_value=300.0
        ), patch.object(
            translation_service.audio_processor, "cleanup_temp_files", return_value=None
        ):

            result = await translation_service.translate_episode(mock_episode)

            # Verify result
            assert "en" in result
            assert result["en"] == "https://storage.googleapis.com/translated.mp3"

            # Verify episode was updated with completed status
            mock_episode.update.assert_called()
            update_call = mock_episode.update.call_args[0][0]
            assert update_call["$set"]["translation_status"] == "completed"
            assert "en" in update_call["$set"]["available_languages"]
            assert "translations.en" in update_call["$set"]
            assert update_call["$set"]["retry_count"] == 0


class TestPodcastTranslationIntegration:
    """Integration tests for complete translation workflow."""

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_full_translation_pipeline_hebrew_to_english(self):
        """
        Integration test for complete translation pipeline.

        Tests:
        1. Download audio
        2. Separate vocals
        3. Transcribe (Hebrew)
        4. Translate (Hebrew → English)
        5. Generate TTS
        6. Mix audio
        7. Upload to GCS
        8. Update MongoDB

        NOTE: This test requires:
        - Real API keys for ElevenLabs, OpenAI/Whisper
        - MongoDB connection
        - GCS bucket access
        - Audio file fixtures
        """
        # This is a placeholder for integration tests
        # Actual implementation would require test fixtures and real API access
        pytest.skip("Integration test requires real API keys and infrastructure")

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_translation_worker_processes_queue(self):
        """
        Integration test for background worker queue processing.

        Tests:
        - Worker polls for pending episodes
        - Processes episodes concurrently
        - Handles failures gracefully
        - Updates status atomically
        """
        pytest.skip("Integration test requires running worker and MongoDB")
