"""Tests for SCORM media generator (TTS + lip-sync)."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.olorin.scorm_export.media_generator import (
    generate_tts_audio,
    generate_lipsync_video,
)


@pytest.mark.asyncio
async def test_generate_tts_audio_success():
    with patch(
        "app.services.olorin.scorm_export.media_generator._call_elevenlabs_tts",
        new_callable=AsyncMock,
        return_value=b"fake-audio-bytes",
    ), patch(
        "app.services.olorin.scorm_export.media_generator.storage_service",
    ) as mock_storage:
        mock_storage.upload_bytes = AsyncMock(
            return_value="https://storage.example.com/audio.mp3"
        )

        url = await generate_tts_audio(
            text="Hello, this is a test.",
            voice_id="voice_123",
            export_id="exp_1",
            filename="q01.mp3",
        )

    assert url == "https://storage.example.com/audio.mp3"


@pytest.mark.asyncio
async def test_generate_tts_audio_failure():
    with patch(
        "app.services.olorin.scorm_export.media_generator._call_elevenlabs_tts",
        new_callable=AsyncMock,
        return_value=None,
    ):
        url = await generate_tts_audio(
            text="Hello",
            voice_id="voice_123",
            export_id="exp_1",
            filename="q01.mp3",
        )

    assert url is None


@pytest.mark.asyncio
async def test_generate_lipsync_video_success():
    with patch(
        "app.services.olorin.scorm_export.media_generator.character_animator_service",
    ) as mock_animator:
        mock_result = MagicMock()
        mock_result.video_url = "https://storage.example.com/video.mp4"
        mock_animator.animate_character_response = AsyncMock(
            return_value=mock_result
        )

        url = await generate_lipsync_video(
            text="Hello, this is a test.",
            voice_id="voice_123",
            face_url="https://storage.example.com/face.jpg",
            export_id="exp_1",
            filename="q01.mp4",
        )

    assert url == "https://storage.example.com/video.mp4"


@pytest.mark.asyncio
async def test_generate_lipsync_video_no_face():
    url = await generate_lipsync_video(
        text="Hello",
        voice_id="voice_123",
        face_url="",
        export_id="exp_1",
        filename="q01.mp4",
    )
    assert url is None
