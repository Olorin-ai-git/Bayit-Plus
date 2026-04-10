"""Tests for CharacterVoiceClonerService.clone_single_character.

Uses model_construct() + object.__setattr__ to bypass Beanie Document init.
All external collaborators (find_subtitle_track, dialogue_mapper_service,
_clone_single, content.save) are mocked so no MongoDB / ElevenLabs / FFmpeg
is required.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.pipeline_stage import StageStatus
from app.services.vod_interaction.voice_cloner import (
    CharacterVoiceClonerService,
    VoiceCloneResult,
)


def _make_character(name: str, voice_id: str = None):
    char = MagicMock()
    char.name = name
    char.voice_id = voice_id
    char.voice_clone_status = None
    char.voice_clone_audio_url = None
    return char


def _make_content(characters=None):
    """Build a minimal Content-like object without Beanie."""
    content = MagicMock()
    content.id = "content-abc"
    content.title = "Test Movie"
    content.interactive_characters = characters or []
    content.stream_url = "https://example.com/video.mp4"
    content.save = AsyncMock()
    return content


def _make_track(cues=None):
    track = MagicMock()
    track.cues = cues or []
    return track


@pytest.mark.asyncio
async def test_clone_single_character_raises_value_error_on_unknown_name():
    """Passing a character name not present in content raises ValueError."""
    svc = CharacterVoiceClonerService()
    content = _make_content(characters=[_make_character("Alice")])

    with pytest.raises(ValueError, match="Bob"):
        await svc.clone_single_character(content, "Bob")


@pytest.mark.asyncio
async def test_clone_single_character_returns_result_from_inner_method():
    """Happy path: delegates to _clone_single and returns its result."""
    svc = CharacterVoiceClonerService()
    char = _make_character("Alice")
    content = _make_content(characters=[char])

    expected_result = VoiceCloneResult(
        character_name="Alice",
        status="cloned",
        voice_id="el-voice-123",
        audio_duration_sec=12.5,
        cue_count=3,
    )

    fake_cue = MagicMock()
    fake_track = _make_track(cues=[fake_cue])
    fake_cue_map = {"Alice": [fake_cue]}

    with (
        patch(
            "app.services.vod_interaction.voice_cloner.find_subtitle_track",
            new=AsyncMock(return_value=fake_track),
        ) as mock_find,
        patch.object(
            svc._clone_single.__self__.__class__,
            "_clone_single",
            new=AsyncMock(return_value=expected_result),
        ) if False else patch.object(
            svc, "_clone_single", new=AsyncMock(return_value=expected_result),
        ) as mock_inner,
        patch(
            "app.services.vod_interaction.voice_cloner.dialogue_mapper_service"
            ".map_dialogue_to_characters",
            new=AsyncMock(return_value=fake_cue_map),
        ) as mock_mapper,
    ):
        result = await svc.clone_single_character(content, "Alice")

    assert result is expected_result
    mock_find.assert_awaited_once_with("content-abc")
    mock_mapper.assert_awaited_once()
    # _clone_single called with the correct character object
    call_args = mock_inner.call_args
    assert call_args.args[1] is char  # content is args[0], char is args[1]
    assert call_args.args[2] == [fake_cue]  # cues
    # content.save was called after
    content.save.assert_awaited_once()


@pytest.mark.asyncio
async def test_clone_single_character_uses_empty_cues_when_no_track():
    """When find_subtitle_track returns None, _clone_single receives empty cues."""
    svc = CharacterVoiceClonerService()
    char = _make_character("Bob")
    content = _make_content(characters=[char])

    skip_result = VoiceCloneResult(
        character_name="Bob",
        status="skipped",
        reason="No dialogue cues mapped",
    )

    with (
        patch(
            "app.services.vod_interaction.voice_cloner.find_subtitle_track",
            new=AsyncMock(return_value=None),
        ),
        patch.object(
            svc, "_clone_single", new=AsyncMock(return_value=skip_result),
        ) as mock_inner,
    ):
        result = await svc.clone_single_character(content, "Bob")

    assert result.status == "skipped"
    # Empty cue list passed when no track
    call_args = mock_inner.call_args
    assert call_args.args[2] == []
