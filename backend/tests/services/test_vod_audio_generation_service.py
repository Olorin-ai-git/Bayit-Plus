"""
Unit tests for VOD Audio Generation Service.

Tests the audio generation pipeline:
- TTS generation with ElevenLabs
- Silence padding and timing
- FFmpeg audio processing
- Text deduplication optimization
"""

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.audio_tracks import AudioTrackDoc
from app.models.subtitles import SubtitleCueModel, SubtitleTrackDoc
from app.services.vod_audio_generation_service import VodAudioGenerationService


@pytest.fixture
def mock_subtitle_track():
    """Create mock subtitle track with variant texts."""
    return SubtitleTrackDoc(
        content_id="test-content-123",
        content_type="vod",
        language="he",
        language_name="עברית",
        cues=[
            SubtitleCueModel(
                index=0,
                start_time=0.0,
                end_time=2.5,
                text="שלום",
                text_heblish="Shalom Hello",
                text_slang_synthesis="שלום חברים",
                text_grammar_flip="Hello Shalom",
                text_engrew="שלום מאן",
            ),
            SubtitleCueModel(
                index=1,
                start_time=2.5,
                end_time=5.0,
                text="מה נשמע",
                text_heblish="Ma What's up nishma",
                text_slang_synthesis="מה הענים",
                text_grammar_flip="What's up ma",
                text_engrew="מה אפ",
            ),
            SubtitleCueModel(
                index=2,
                start_time=5.0,
                end_time=7.0,
                text="טוב",
                text_heblish="Tov Good",
                text_slang_synthesis="טוב חבר",
                text_grammar_flip="Good tov",
                text_engrew="גוד",
            ),
        ],
    )


@pytest.fixture
def mock_audio_track():
    """Create mock audio track document."""
    return AudioTrackDoc(
        content_id="test-content-123",
        variant_type="heblish",
        variant_display_name="Heblish Audio",
        language="multilingual",
        language_name="English + עברית",
    )


@pytest.fixture
def service():
    """Create VodAudioGenerationService instance."""
    with patch("app.services.vod_audio_generation_service.ElevenLabsTTSStreamingService"):
        with patch("app.services.vod_audio_generation_service.StorageService"):
            return VodAudioGenerationService()


class TestVodAudioGenerationService:
    """Test suite for VodAudioGenerationService."""

    @pytest.mark.asyncio
    async def test_generate_audio_chunk_creates_file(self, service, tmp_path):
        """Test that TTS audio generation creates output file."""
        # Mock TTS service
        service.tts_service.text_to_speech = AsyncMock(return_value=b"fake audio data")

        # Generate audio
        output_path = await service._generate_tts_audio(
            text="Test text",
            voice_id="test-voice-id",
            work_dir=tmp_path,
            chunk_index=1,
        )

        # Verify file was created
        assert output_path.exists()
        assert output_path.name == "speech_0001.mp3"
        assert output_path.read_bytes() == b"fake audio data"

    @pytest.mark.asyncio
    async def test_create_silence_chunk(self, service, tmp_path):
        """Test silence chunk generation."""
        # Mock FFmpeg command
        mock_process = MagicMock()
        mock_process.returncode = 0
        mock_process.communicate = AsyncMock(return_value=(b"", b""))

        with patch("asyncio.create_subprocess_exec", return_value=mock_process):
            output_path = await service._create_silence_chunk(
                duration=2.5,
                work_dir=tmp_path,
                chunk_index=1,
            )

            # Verify output path
            assert output_path == tmp_path / "chunk_0001_final.mp3"

    @pytest.mark.asyncio
    async def test_add_silence_padding(self, service, tmp_path):
        """Test adding silence padding to match target duration."""
        # Create fake speech audio file
        speech_audio = tmp_path / "speech_0001.mp3"
        speech_audio.write_bytes(b"fake speech audio")

        # Mock get_audio_duration to return 1.5 seconds
        service._get_audio_duration = AsyncMock(return_value=1.5)

        # Mock FFmpeg commands
        mock_process = MagicMock()
        mock_process.returncode = 0
        mock_process.communicate = AsyncMock(return_value=(b"", b""))

        with patch("asyncio.create_subprocess_exec", return_value=mock_process):
            output_path = await service._add_silence_padding(
                speech_audio=speech_audio,
                target_duration=3.0,  # Need 1.5 seconds of silence
                work_dir=tmp_path,
                chunk_index=1,
            )

            # Verify output path
            assert output_path == tmp_path / "chunk_0001_final.mp3"

    @pytest.mark.asyncio
    async def test_concatenate_audio_chunks(self, service, tmp_path):
        """Test concatenating multiple audio chunks."""
        # Create fake audio chunks
        chunks = [
            tmp_path / "chunk_0001_final.mp3",
            tmp_path / "chunk_0002_final.mp3",
            tmp_path / "chunk_0003_final.mp3",
        ]
        for chunk in chunks:
            chunk.write_bytes(b"fake audio")

        # Mock FFmpeg command
        mock_process = MagicMock()
        mock_process.returncode = 0
        mock_process.communicate = AsyncMock(return_value=(b"", b""))

        with patch("asyncio.create_subprocess_exec", return_value=mock_process):
            output_path = await service._concatenate_audio_chunks(
                chunks=chunks,
                work_dir=tmp_path,
            )

            # Verify output path
            assert output_path == tmp_path / "final_audio.m4a"

    @pytest.mark.asyncio
    async def test_get_audio_duration(self, service):
        """Test getting audio file duration via FFprobe."""
        mock_process = MagicMock()
        mock_process.returncode = 0
        mock_process.communicate = AsyncMock(return_value=(b"5.234\n", b""))

        with patch("asyncio.create_subprocess_exec", return_value=mock_process):
            duration = await service._get_audio_duration(Path("/fake/audio.mp3"))

            # Verify duration parsing
            assert duration == 5.234

    @pytest.mark.asyncio
    async def test_text_deduplication(self, service, mock_subtitle_track, mock_audio_track):
        """Test that duplicate texts are only processed once."""
        # Add duplicate text to subtitle track
        mock_subtitle_track.cues.append(
            SubtitleCueModel(
                index=3,
                start_time=7.0,
                end_time=9.0,
                text="שלום",  # Duplicate of cue 0
                text_heblish="Shalom Hello",  # Same as cue 0
            )
        )

        # Mock save operations
        mock_audio_track.save = AsyncMock()

        # Mock TTS service to track unique texts
        unique_texts_generated = []

        async def mock_tts(text, **kwargs):
            unique_texts_generated.append(text)
            return b"fake audio"

        service.tts_service.text_to_speech = mock_tts

        # Mock other operations
        service._get_audio_duration = AsyncMock(return_value=1.0)
        service._add_silence_padding = AsyncMock(
            side_effect=lambda **kwargs: Path(f"/fake/chunk_{kwargs['chunk_index']:04d}_final.mp3")
        )
        service._concatenate_audio_chunks = AsyncMock(return_value=Path("/fake/final_audio.m4a"))
        service.storage_service.upload_file = AsyncMock(return_value="https://fake-url.com/audio.m4a")
        service._cleanup_work_dir = AsyncMock()

        # Mock Path operations
        with patch("pathlib.Path.mkdir"), \
             patch("pathlib.Path.exists", return_value=False), \
             patch("pathlib.Path.stat") as mock_stat, \
             patch("pathlib.Path.write_text"), \
             patch("pathlib.Path.read_text", return_value='{"completed_cues": []}'):

            mock_stat.return_value = MagicMock(st_size=1024000)

            # Generate audio
            await service.generate_audio_track(mock_audio_track, mock_subtitle_track)

        # Verify deduplication: should only generate TTS for unique texts
        # 4 cues total, but 1 duplicate = 3 unique texts
        assert len(unique_texts_generated) == 3
        assert "Shalom Hello" in unique_texts_generated
        assert len([t for t in unique_texts_generated if t == "Shalom Hello"]) == 1

    @pytest.mark.asyncio
    async def test_get_voice_id_hebrew(self, service):
        """Test voice ID selection for Hebrew."""
        from app.core.config import settings

        voice_id = service._get_voice_id("he")
        assert voice_id == settings.ELEVENLABS_HEBREW_VOICE_ID

    @pytest.mark.asyncio
    async def test_get_voice_id_multilingual(self, service):
        """Test voice ID selection for multilingual."""
        from app.core.config import settings

        voice_id = service._get_voice_id("multilingual")
        assert voice_id == settings.ELEVENLABS_DEFAULT_VOICE_ID

    @pytest.mark.asyncio
    async def test_ffmpeg_error_handling(self, service, tmp_path):
        """Test FFmpeg error handling."""
        # Mock FFmpeg failure
        mock_process = MagicMock()
        mock_process.returncode = 1
        mock_process.communicate = AsyncMock(return_value=(b"", b"FFmpeg error: file not found"))

        with patch("asyncio.create_subprocess_exec", return_value=mock_process):
            with pytest.raises(RuntimeError, match="FFmpeg.*failed"):
                await service._create_silence_chunk(
                    duration=1.0,
                    work_dir=tmp_path,
                    chunk_index=1,
                )

    @pytest.mark.asyncio
    async def test_cleanup_work_dir(self, service, tmp_path):
        """Test cleanup of work directory."""
        work_dir = tmp_path / "audio_test"
        work_dir.mkdir()

        # Create some files
        (work_dir / "file1.mp3").write_bytes(b"data")
        (work_dir / "file2.mp3").write_bytes(b"data")

        # Cleanup
        await service._cleanup_work_dir(work_dir)

        # Verify directory is removed
        assert not work_dir.exists()

    @pytest.mark.asyncio
    async def test_generate_audio_track_updates_status(self, service, mock_subtitle_track, mock_audio_track):
        """Test that audio track status is updated during generation."""
        # Mock save operations
        mock_audio_track.save = AsyncMock()

        # Mock all operations to succeed quickly
        service.tts_service.text_to_speech = AsyncMock(return_value=b"fake audio")
        service._get_audio_duration = AsyncMock(return_value=1.0)
        service._add_silence_padding = AsyncMock(
            side_effect=lambda **kwargs: Path(f"/fake/chunk_{kwargs['chunk_index']:04d}_final.mp3")
        )
        service._concatenate_audio_chunks = AsyncMock(return_value=Path("/fake/final_audio.m4a"))
        service.storage_service.upload_file = AsyncMock(return_value="https://fake-url.com/audio.m4a")
        service._cleanup_work_dir = AsyncMock()

        # Mock Path operations
        with patch("pathlib.Path.mkdir"), \
             patch("pathlib.Path.exists", return_value=False), \
             patch("pathlib.Path.stat") as mock_stat, \
             patch("pathlib.Path.write_text"), \
             patch("pathlib.Path.read_text", return_value='{"completed_cues": []}'):

            mock_stat.return_value = MagicMock(st_size=1024000)

            # Generate audio
            result = await service.generate_audio_track(mock_audio_track, mock_subtitle_track)

        # Verify success
        assert result is True
        assert mock_audio_track.generation_status == "completed"
        assert mock_audio_track.generation_progress == 100
        assert mock_audio_track.audio_url == "https://fake-url.com/audio.m4a"

    @pytest.mark.asyncio
    async def test_generate_audio_track_handles_failure(self, service, mock_subtitle_track, mock_audio_track):
        """Test that audio track status is updated on failure."""
        # Mock save operations
        mock_audio_track.save = AsyncMock()

        # Mock TTS to fail
        service.tts_service.text_to_speech = AsyncMock(side_effect=Exception("TTS API error"))

        # Mock Path operations
        with patch("pathlib.Path.mkdir"), \
             patch("pathlib.Path.exists", return_value=False), \
             patch("pathlib.Path.write_text"), \
             patch("pathlib.Path.read_text", return_value='{"completed_cues": []}'):

            # Generate audio (should fail)
            result = await service.generate_audio_track(mock_audio_track, mock_subtitle_track)

        # Verify failure handling
        assert result is False
        assert mock_audio_track.generation_status == "failed"
        assert mock_audio_track.generation_error is not None
