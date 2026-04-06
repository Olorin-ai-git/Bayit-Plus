"""Tests for persona-styled answer generation."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.scripts.speaker_qa.answer_generator import generate_answers
from app.scripts.speaker_qa.models import (
    DraftQuestion, MemoryDemoConfig, MomentDefinition,
    SpeakerConfig, StyleRules,
)


def _cfg() -> SpeakerConfig:
    return SpeakerConfig(
        speaker_id="s", content_id="c", character_name="Speaker",
        persona_mode="speaker", answer_style="themed_riff",
        voice_id="v", portrait_url="p", gcs_output_prefix="g/",
        manifest_path="m", persona_prompt="speak as test",
        style_rules=StyleRules(max_answer_words=90, anchor_to_scene=True, allow_extension=True, forbid_topics=[]),
        moments=[MomentDefinition(timestamp=10.0, scene_context="sc", interaction_prompt="p")],
        memory_demo=MemoryDemoConfig(seed_question="Q1", followup_hint="h2", third_question_hint="h3"),
    )


def _qs() -> list[DraftQuestion]:
    return [
        DraftQuestion(moment_timestamp=10.0, index_in_moment=0, text="A?"),
        DraftQuestion(moment_timestamp=10.0, index_in_moment=1, text="B?"),
        DraftQuestion(moment_timestamp=10.0, index_in_moment=2, text="C?"),
        DraftQuestion(moment_timestamp=None, index_in_moment=0, text="Q1", is_memory_demo=True),
        DraftQuestion(moment_timestamp=None, index_in_moment=1, text="Q2", is_memory_demo=True),
        DraftQuestion(moment_timestamp=None, index_in_moment=2, text="Q3", is_memory_demo=True),
    ]


@pytest.mark.asyncio
async def test_generates_answer_per_question():
    moment_response = MagicMock()
    moment_response.content = [MagicMock(text=json.dumps({"answers": ["answer A", "answer B", "answer C"]}))]
    memory_response = MagicMock()
    memory_response.content = [MagicMock(text=json.dumps({
        "exchanges": [
            {"answer": "first answer", "callback": None},
            {"answer": "callback to Q1", "callback": {"phrase": "first answer", "references_exchange": 0}},
            {"answer": "another callback", "callback": {"phrase": "answer", "references_exchange": 0}},
        ],
    }))]
    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(side_effect=[moment_response, memory_response])

    with patch("app.scripts.speaker_qa.answer_generator.get_anthropic_client", return_value=mock_client):
        answers = await generate_answers(_cfg(), _qs())

    assert len(answers) == 6
    assert all(a.callback is None for a in answers if not a.question.is_memory_demo)
    mem = [a for a in answers if a.question.is_memory_demo]
    assert mem[0].callback is None
    assert mem[1].callback is not None
    assert mem[1].callback.phrase == "first answer"
    assert mem[1].callback.references_exchange == 0
    assert mem[2].callback is not None


@pytest.mark.asyncio
async def test_one_llm_call_per_moment_plus_one_for_memory():
    cfg = _cfg()
    moments = list(cfg.moments) + [
        MomentDefinition(timestamp=20.0 + i * 10, scene_context=f"sc{i}", interaction_prompt=f"p{i}")
        for i in range(4)
    ]
    cfg_5 = SpeakerConfig(**{**cfg.__dict__, "moments": moments})

    all_qs = []
    for m in moments:
        for idx in range(3):
            all_qs.append(DraftQuestion(moment_timestamp=m.timestamp, index_in_moment=idx, text=f"q{m.timestamp}-{idx}"))
    all_qs += [DraftQuestion(moment_timestamp=None, index_in_moment=i, text=f"mq{i}", is_memory_demo=True) for i in range(3)]

    mock_moment = MagicMock()
    mock_moment.content = [MagicMock(text=json.dumps({"answers": ["a", "b", "c"]}))]
    mock_memory = MagicMock()
    mock_memory.content = [MagicMock(text=json.dumps({
        "exchanges": [
            {"answer": "x", "callback": None},
            {"answer": "y", "callback": {"phrase": "x", "references_exchange": 0}},
            {"answer": "z", "callback": {"phrase": "x", "references_exchange": 0}},
        ],
    }))]
    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(side_effect=[mock_moment] * 5 + [mock_memory])

    with patch("app.scripts.speaker_qa.answer_generator.get_anthropic_client", return_value=mock_client):
        answers = await generate_answers(cfg_5, all_qs)

    assert mock_client.messages.create.await_count == 6
    assert len(answers) == 18
