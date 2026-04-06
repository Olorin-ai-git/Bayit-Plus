"""Tests for SCORM character enricher (face extraction + voice cloning)."""

import pytest
from unittest.mock import AsyncMock, patch

from app.models.vod_interaction import ContentCharacter
from app.models.scorm_export import CharacterExportStatus
from app.services.olorin.scorm_export.character_enricher import (
    enrich_character,
    _needs_face_extraction,
    _needs_voice_clone,
)


def _char_with_assets() -> ContentCharacter:
    return ContentCharacter(
        name="Doc Brown",
        voice_id="cloned_voice_abc",
        frame_url="https://storage.example.com/face.jpg",
        description="Eccentric inventor.",
        movie_context="Inventor of the DeLorean time machine.",
        voice_clone_status="cloned",
    )


def _char_without_assets() -> ContentCharacter:
    return ContentCharacter(
        name="Speaker 1",
        voice_id="default_male_voice",
        frame_url="",
        description="Conference presenter.",
        movie_context="Keynote speaker on AI.",
    )


def test_needs_face_extraction_empty_url():
    char = _char_without_assets()
    assert _needs_face_extraction(char) is True


def test_needs_face_extraction_has_url():
    char = _char_with_assets()
    assert _needs_face_extraction(char) is False


def test_needs_voice_clone_default_voice():
    char = _char_without_assets()
    default_voices = {"default_male_voice", "default_female_voice"}
    assert _needs_voice_clone(char, default_voices) is True


def test_needs_voice_clone_already_cloned():
    char = _char_with_assets()
    default_voices = {"default_male_voice", "default_female_voice"}
    assert _needs_voice_clone(char, default_voices) is False


@pytest.mark.asyncio
async def test_enrich_character_already_complete():
    char = _char_with_assets()
    status = CharacterExportStatus(name=char.name)

    result = await enrich_character(
        character=char,
        status=status,
        video_url="https://example.com/video.mp4",
        transcript_segments=[],
        export_id="exp_123",
        default_voices={"default_male_voice", "default_female_voice"},
    )

    assert result.face_extracted is False
    assert result.voice_cloned is False
    assert result.fallback_reason is None


@pytest.mark.asyncio
async def test_enrich_character_face_extraction_failure():
    char = _char_without_assets()
    status = CharacterExportStatus(name=char.name)

    with patch(
        "app.services.olorin.scorm_export.character_enricher._extract_face_still",
        new_callable=AsyncMock,
        return_value=None,
    ), patch(
        "app.services.olorin.scorm_export.character_enricher._clone_voice",
        new_callable=AsyncMock,
        return_value="cloned_voice_new",
    ):
        result = await enrich_character(
            character=char,
            status=status,
            video_url="https://example.com/video.mp4",
            transcript_segments=[],
            export_id="exp_123",
            default_voices={"default_male_voice"},
        )

    assert result.face_extracted is False
    assert "face" in (result.fallback_reason or "").lower()
