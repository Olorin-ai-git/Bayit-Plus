"""Tests for the asset generator (mocks character_animator + GCS)."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.scripts.speaker_qa.asset_generator import generate_assets
from app.scripts.speaker_qa.models import (
    DraftAnswer,
    DraftQuestion,
    MemoryDemoConfig,
    MomentDefinition,
    SpeakerConfig,
    StyleRules,
)


def _cfg() -> SpeakerConfig:
    return SpeakerConfig(
        speaker_id="jobs-stanford-2005",
        content_id="c",
        character_name="Steve Jobs",
        persona_mode="speaker",
        answer_style="themed_riff",
        voice_id="voice_abc",
        portrait_url="http://portrait.jpg",
        gcs_output_prefix="demo/jobs/qa/",
        manifest_path="m.json",
        persona_prompt="p",
        style_rules=StyleRules(
            max_answer_words=90,
            anchor_to_scene=True,
            allow_extension=True,
            forbid_topics=[],
        ),
        moments=[
            MomentDefinition(
                timestamp=1.0,
                scene_context="s",
                interaction_prompt="i",
            )
        ],
        memory_demo=MemoryDemoConfig(
            seed_question="q",
            followup_hint="f",
            third_question_hint="t",
        ),
    )


def _make_answer(text: str) -> DraftAnswer:
    return DraftAnswer(
        question=DraftQuestion(
            moment_timestamp=1.0,
            index_in_moment=0,
            text=text,
        ),
        response_text=f"answer to {text}",
    )


@pytest.mark.asyncio
async def test_generates_one_asset_per_answer_when_no_existing():
    answers = [_make_answer("q1"), _make_answer("q2")]
    mock_resp = SimpleNamespace(audio_url="a.mp3", video_url="v.mp4", duration=5.0)

    with patch(
        "app.scripts.speaker_qa.asset_generator.character_animator_service"
    ) as mock_svc, patch(
        "app.scripts.speaker_qa.asset_generator._asset_exists_in_gcs",
        return_value=False,
    ):
        mock_svc.animate_character_response = AsyncMock(return_value=mock_resp)
        results = await generate_assets(_cfg(), answers, force=False)

    assert len(results) == 2
    assert mock_svc.animate_character_response.await_count == 2
    assert results[0].audio_url == "a.mp3"
    assert results[0].video_url == "v.mp4"
    assert results[0].duration == 5.0
    assert len(results[0].content_hash) == 12


@pytest.mark.asyncio
async def test_skips_existing_assets_when_not_forced():
    answers = [_make_answer("q1")]

    with patch(
        "app.scripts.speaker_qa.asset_generator.character_animator_service"
    ) as mock_svc, patch(
        "app.scripts.speaker_qa.asset_generator._asset_exists_in_gcs",
        return_value=True,
    ), patch(
        "app.scripts.speaker_qa.asset_generator._gcs_public_url",
        side_effect=lambda path: f"https://storage.googleapis.com/bucket/{path}",
    ):
        mock_svc.animate_character_response = AsyncMock()
        results = await generate_assets(_cfg(), answers, force=False)

    mock_svc.animate_character_response.assert_not_called()
    assert len(results) == 1
    assert "demo/jobs/qa/" in results[0].audio_url
    assert results[0].audio_url.endswith(".mp3")
    assert results[0].video_url.endswith(".mp4")


@pytest.mark.asyncio
async def test_force_regenerates_even_when_assets_exist():
    answers = [_make_answer("q1")]
    mock_resp = SimpleNamespace(audio_url="new_a.mp3", video_url="new_v.mp4", duration=6.0)

    with patch(
        "app.scripts.speaker_qa.asset_generator.character_animator_service"
    ) as mock_svc, patch(
        "app.scripts.speaker_qa.asset_generator._asset_exists_in_gcs",
        return_value=True,
    ):
        mock_svc.animate_character_response = AsyncMock(return_value=mock_resp)
        results = await generate_assets(_cfg(), answers, force=True)

    mock_svc.animate_character_response.assert_called_once()
    assert results[0].audio_url == "new_a.mp3"
