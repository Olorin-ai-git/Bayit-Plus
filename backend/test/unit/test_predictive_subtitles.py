"""
Unit tests for predictive subtitles feature.
Tests partial subtitle emission before final translated subtitle.
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.live_translation_service import LiveTranslationService


class TestPredictiveSubtitles:
    """Test suite for predictive subtitles."""

    @pytest.fixture
    def service(self):
        """Create LiveTranslationService with mocked dependencies."""
        with patch("app.services.live_translation_service.GOOGLE_AVAILABLE", True):
            service = LiveTranslationService()
            service.translate_client = MagicMock()
            service.speech_client = None  # Not needed for this test
            yield service

    async def mock_audio_stream(self):
        """Mock audio stream that yields one chunk."""
        yield b"fake_audio_chunk"

    @pytest.mark.asyncio
    async def test_partial_subtitle_emitted_before_translation(self, service):
        """Test that partial subtitle is emitted immediately after STT."""
        # Mock transcription
        async def mock_transcribe(audio_stream, source_lang):
            yield "שלום עולם"

        service.transcribe_audio_stream = mock_transcribe

        # Mock translation (slower)
        async def mock_translate(text, source, target, **kwargs):
            await asyncio.sleep(0.08)  # Simulate 80ms translation
            return "Hello World"

        service.translate_text = mock_translate

        # Collect all subtitle cues
        subtitles = []
        async for cue in service.process_live_audio_to_subtitles(
            self.mock_audio_stream(),
            source_lang="he",
            target_lang="en",
            enable_predictive_subtitles=True,
        ):
            subtitles.append(cue)

        # Should have 2 subtitles: partial + final
        assert len(subtitles) == 2

        # First subtitle should be partial (original language)
        partial = subtitles[0]
        assert partial["subtitle_type"] == "partial"
        assert partial["is_partial"] is True
        assert partial["text"] == "שלום עולם"
        assert partial["target_lang"] == "he"  # Same as source (not translated yet)

        # Second subtitle should be final (translated)
        final = subtitles[1]
        assert final["subtitle_type"] == "final"
        assert final["is_partial"] is False
        assert final["text"] == "Hello World"
        assert final["target_lang"] == "en"

    @pytest.mark.asyncio
    async def test_predictive_disabled_only_final_subtitle(self, service):
        """Test that disabling predictive only emits final subtitle."""
        # Mock transcription
        async def mock_transcribe(audio_stream, source_lang):
            yield "שלום עולם"

        service.transcribe_audio_stream = mock_transcribe

        # Mock translation
        service.translate_text = AsyncMock(return_value="Hello World")

        # Collect all subtitle cues
        subtitles = []
        async for cue in service.process_live_audio_to_subtitles(
            self.mock_audio_stream(),
            source_lang="he",
            target_lang="en",
            enable_predictive_subtitles=False,
        ):
            subtitles.append(cue)

        # Should have only 1 subtitle (final)
        assert len(subtitles) == 1

        final = subtitles[0]
        assert final["subtitle_type"] == "final"
        assert final["text"] == "Hello World"

    @pytest.mark.asyncio
    async def test_same_language_no_partial_subtitle(self, service):
        """Test that same source/target language skips partial subtitle."""
        # Mock transcription
        async def mock_transcribe(audio_stream, source_lang):
            yield "Hello World"

        service.transcribe_audio_stream = mock_transcribe

        # Collect all subtitle cues
        subtitles = []
        async for cue in service.process_live_audio_to_subtitles(
            self.mock_audio_stream(),
            source_lang="en",
            target_lang="en",
            enable_predictive_subtitles=True,
        ):
            subtitles.append(cue)

        # Should have only 1 subtitle (no translation needed)
        assert len(subtitles) == 1

        subtitle = subtitles[0]
        assert subtitle["subtitle_type"] == "final"
        assert subtitle["text"] == "Hello World"
        assert subtitle["is_partial"] is False

    @pytest.mark.asyncio
    async def test_chunking_preserves_partial_final_order(self, service):
        """Test that long text chunking maintains partial/final order."""
        # Long text that will be chunked
        long_text = "This is a very long sentence that should be split into multiple subtitle chunks for better readability on screen."

        async def mock_transcribe(audio_stream, source_lang):
            yield long_text

        service.transcribe_audio_stream = mock_transcribe
        service.translate_text = AsyncMock(return_value=long_text)  # Same text

        subtitles = []
        async for cue in service.process_live_audio_to_subtitles(
            self.mock_audio_stream(),
            source_lang="en",
            target_lang="es",
            enable_predictive_subtitles=True,
        ):
            subtitles.append(cue)

        # Should have partial chunks followed by final chunks
        partial_count = sum(1 for s in subtitles if s["is_partial"])
        final_count = sum(1 for s in subtitles if not s["is_partial"])

        # Both partial and final should be chunked
        assert partial_count > 1
        assert final_count > 1
        assert partial_count == final_count  # Same number of chunks
