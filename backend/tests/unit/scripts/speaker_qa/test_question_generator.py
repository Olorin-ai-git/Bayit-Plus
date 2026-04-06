"""Tests for LLM-driven draft question generation."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.scripts.speaker_qa.models import (
    MemoryDemoConfig, MomentDefinition, SpeakerConfig, StyleRules,
)
from app.scripts.speaker_qa.question_generator import generate_draft_questions


def _make_config() -> SpeakerConfig:
    return SpeakerConfig(
        speaker_id="test-speaker", content_id="abc", character_name="Test Speaker",
        persona_mode="speaker", answer_style="themed_riff", voice_id="v1",
        portrait_url="http://x", gcs_output_prefix="demo/test/", manifest_path="m.json",
        persona_prompt="speak as test",
        style_rules=StyleRules(max_answer_words=90, anchor_to_scene=True, allow_extension=True, forbid_topics=["politics"]),
        moments=[
            MomentDefinition(timestamp=10.0, scene_context="sc1", interaction_prompt="p1"),
            MomentDefinition(timestamp=20.0, scene_context="sc2", interaction_prompt="p2"),
        ],
        memory_demo=MemoryDemoConfig(seed_question="What is X?", followup_hint="callback X", third_question_hint="extend X"),
    )


@pytest.mark.asyncio
async def test_generates_expected_question_counts():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps({
        "moment_questions": [
            {"timestamp": 10.0, "questions": ["q1a", "q1b", "q1c"]},
            {"timestamp": 20.0, "questions": ["q2a", "q2b", "q2c"]},
        ],
        "memory_demo_questions": ["What is X?", "Does it hold?", "Change over time?"],
    }))]
    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch("app.scripts.speaker_qa.question_generator.get_anthropic_client", return_value=mock_client):
        drafts = await generate_draft_questions(_make_config())

    static = [d for d in drafts if not d.is_memory_demo]
    memory = [d for d in drafts if d.is_memory_demo]
    assert len(static) == 6
    assert len(memory) == 3
    assert static[0].moment_timestamp == 10.0
    assert static[0].text == "q1a"
    assert memory[0].text == "What is X?"
    assert memory[0].moment_timestamp is None


@pytest.mark.asyncio
async def test_seed_question_used_verbatim_as_memory_demo_first():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps({
        "moment_questions": [
            {"timestamp": 10.0, "questions": ["q1", "q2", "q3"]},
            {"timestamp": 20.0, "questions": ["q4", "q5", "q6"]},
        ],
        "memory_demo_questions": ["wrong seed", "q2", "q3"],
    }))]
    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch("app.scripts.speaker_qa.question_generator.get_anthropic_client", return_value=mock_client):
        drafts = await generate_draft_questions(_make_config())

    memory = [d for d in drafts if d.is_memory_demo]
    assert memory[0].text == "What is X?"


@pytest.mark.asyncio
async def test_strips_markdown_fences_from_response():
    wrapped = "```json\n" + json.dumps({
        "moment_questions": [
            {"timestamp": 10.0, "questions": ["a", "b", "c"]},
            {"timestamp": 20.0, "questions": ["d", "e", "f"]},
        ],
        "memory_demo_questions": ["m1", "m2", "m3"],
    }) + "\n```"
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=wrapped)]
    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch("app.scripts.speaker_qa.question_generator.get_anthropic_client", return_value=mock_client):
        drafts = await generate_draft_questions(_make_config())

    assert len(drafts) == 9
