"""
Phase E Verification Tests

Validates non-TMDB video ingestion pipeline:
E1: Speaker extraction service
E2: Video transcription service
E3: Unified character extractor
"""

import json
from dataclasses import dataclass
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


class TestE1SpeakerExtraction:
    """E1: Verify speaker extraction from transcripts."""

    def test_speaker_extraction_function_importable(self):
        from app.services.olorin.speaker_extraction import (
            extract_speakers_from_transcript,
        )
        assert callable(extract_speakers_from_transcript)

    def test_build_transcript_text(self):
        from app.services.olorin.speaker_extraction import _build_transcript_text
        from app.services.olorin.video_transcriber import TranscriptSegment

        segments = [
            TranscriptSegment(speaker="speaker_1", text="Hello everyone", start=0.0, end=1.5),
            TranscriptSegment(speaker="speaker_2", text="Welcome to the show", start=1.5, end=3.0),
        ]
        text = _build_transcript_text(segments)
        assert "[speaker_1] Hello everyone" in text
        assert "[speaker_2] Welcome to the show" in text

    def test_build_transcript_text_truncates(self):
        from app.services.olorin.speaker_extraction import _build_transcript_text
        from app.services.olorin.video_transcriber import TranscriptSegment

        segments = [
            TranscriptSegment(speaker="s1", text="x" * 500, start=0.0, end=1.0)
            for _ in range(30)
        ]
        text = _build_transcript_text(segments, max_chars=5000)
        assert "truncated" in text
        assert len(text) < 6000

    @pytest.mark.asyncio
    async def test_extract_speakers_empty_segments(self):
        from app.services.olorin.speaker_extraction import (
            extract_speakers_from_transcript,
        )
        result = await extract_speakers_from_transcript([], 0)
        assert result == []

    @pytest.mark.asyncio
    async def test_extract_speakers_returns_characters(self):
        from app.services.olorin.speaker_extraction import (
            extract_speakers_from_transcript,
        )
        from app.services.olorin.video_transcriber import TranscriptSegment

        mock_claude_response = json.dumps([
            {
                "name": "Dr. Chen",
                "gender": "female",
                "description": "Expert in AI research",
                "movie_context": "Discusses neural network advances",
                "suggested_questions": ["What is deep learning?", "How does AI work?", "Future of AI?"],
                "speaker_id": "speaker_1",
            },
        ])

        mock_msg = MagicMock()
        mock_msg.content = [MagicMock(text=mock_claude_response)]

        mock_client = AsyncMock()
        mock_client.messages.create = AsyncMock(return_value=mock_msg)

        segments = [
            TranscriptSegment(speaker="speaker_1", text="I'm Dr. Chen", start=0.0, end=2.0),
        ]

        with patch(
            "app.services.olorin.speaker_extraction.get_anthropic_client",
            return_value=mock_client,
        ):
            chars = await extract_speakers_from_transcript(segments, 1, "AI Talk")

        assert len(chars) == 1
        assert chars[0].name == "Dr. Chen"
        assert chars[0].gender == "female"
        assert len(chars[0].suggested_questions) == 3


class TestE2VideoTranscriber:
    """E2: Verify transcription pipeline components."""

    def test_transcribe_video_importable(self):
        from app.services.olorin.video_transcriber import transcribe_video
        assert callable(transcribe_video)

    def test_transcript_segment_dataclass(self):
        from app.services.olorin.video_transcriber import TranscriptSegment

        seg = TranscriptSegment(speaker="s1", text="hello", start=0.0, end=1.0)
        assert seg.speaker == "s1"
        assert seg.text == "hello"

    def test_parse_response_with_chunks(self):
        from app.services.olorin.video_transcriber import _parse_response

        data = {
            "text": "Hello world. How are you?",
            "language_code": "en",
            "duration": 5.0,
            "chunks": [
                {"speaker_id": "speaker_1", "text": "Hello world.", "start": 0.0, "end": 2.5},
                {"speaker_id": "speaker_2", "text": "How are you?", "start": 2.5, "end": 5.0},
            ],
        }
        result = _parse_response(data)
        assert result.full_text == "Hello world. How are you?"
        assert result.language == "en"
        assert result.duration_seconds == 5.0
        assert result.speakers_count == 2
        assert len(result.segments) == 2
        assert result.segments[0].speaker == "speaker_1"
        assert result.segments[1].speaker == "speaker_2"

    def test_parse_response_words_format(self):
        from app.services.olorin.video_transcriber import _parse_response

        data = {
            "text": "Hello world",
            "language_code": "eng",
            "words": [
                {"text": "Hello", "start": 0.1, "end": 0.4, "type": "word", "speaker_id": "speaker_0"},
                {"text": " ", "start": 0.4, "end": 0.5, "type": "spacing", "speaker_id": "speaker_0"},
                {"text": "world", "start": 0.5, "end": 1.0, "type": "word", "speaker_id": "speaker_1"},
            ],
        }
        result = _parse_response(data)
        assert result.full_text == "Hello world"
        assert result.speakers_count == 2
        assert len(result.segments) == 2
        assert result.segments[0].speaker == "speaker_0"
        assert result.segments[0].text == "Hello"
        assert result.segments[1].speaker == "speaker_1"
        assert result.segments[1].text == "world"

    def test_parse_response_empty(self):
        from app.services.olorin.video_transcriber import _parse_response

        result = _parse_response({})
        assert result.full_text == ""
        assert result.speakers_count == 0
        assert result.segments == []

    def test_parse_response_segments_fallback(self):
        from app.services.olorin.video_transcriber import _parse_response

        data = {
            "transcription": "Test",
            "language": "he",
            "duration": 2.0,
            "segments": [
                {"speaker": "Speaker 1", "text": "Test", "start": 0.0, "end": 2.0},
            ],
        }
        result = _parse_response(data)
        assert result.full_text == "Test"
        assert result.language == "he"
        assert result.segments[0].speaker == "Speaker 1"


class TestE3UnifiedExtractor:
    """E3: Verify unified extraction with TMDB + transcript fallback."""

    def test_extract_characters_importable(self):
        from app.services.olorin.unified_extractor import extract_characters
        assert callable(extract_characters)

    def test_content_model_has_transcript_fields(self):
        from app.models.content import Content

        fields = Content.model_fields
        assert "transcript" in fields
        assert "transcript_segments" in fields

    @pytest.mark.asyncio
    async def test_tmdb_path_used_when_tmdb_id_exists(self):
        from app.services.olorin.unified_extractor import extract_characters

        mock_content = MagicMock()
        mock_content.tmdb_id = 12345
        mock_content.id = "abc"
        mock_chars = [MagicMock()]

        with patch(
            "app.services.olorin.unified_extractor.character_extractor_service"
        ) as mock_svc:
            mock_svc.extract_characters = AsyncMock(return_value=mock_chars)
            result = await extract_characters(mock_content)

        assert result == mock_chars
        mock_svc.extract_characters.assert_called_once_with(mock_content)

    @pytest.mark.asyncio
    async def test_transcript_fallback_when_no_tmdb(self):
        from app.services.olorin.unified_extractor import extract_characters
        from app.services.olorin.video_transcriber import (
            TranscriptSegment,
            TranscriptionResult,
        )

        mock_content = MagicMock()
        mock_content.tmdb_id = None
        mock_content.id = "abc"
        mock_content.title = "Test Video"
        mock_content.save = AsyncMock()

        mock_transcription = TranscriptionResult(
            full_text="Hello from the speaker",
            segments=[TranscriptSegment("s1", "Hello from the speaker", 0.0, 2.0)],
            speakers_count=1,
            language="en",
            duration_seconds=2.0,
        )
        mock_chars = [MagicMock()]

        with patch(
            "app.services.olorin.unified_extractor.transcribe_video",
            new_callable=AsyncMock,
            return_value=mock_transcription,
        ), patch(
            "app.services.olorin.unified_extractor.extract_speakers_from_transcript",
            new_callable=AsyncMock,
            return_value=mock_chars,
        ):
            result = await extract_characters(
                mock_content, video_url="https://example.com/video.mp4"
            )

        assert result == mock_chars
        mock_content.save.assert_called_once()

    @pytest.mark.asyncio
    async def test_returns_empty_when_no_tmdb_and_no_url(self):
        from app.services.olorin.unified_extractor import extract_characters

        mock_content = MagicMock()
        mock_content.tmdb_id = None
        mock_content.id = "abc"

        result = await extract_characters(mock_content)
        assert result == []
