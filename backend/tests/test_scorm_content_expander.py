"""Tests for SCORM content expander (Claude Q&A generation)."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.vod_interaction import ContentCharacter
from app.services.olorin.scorm_export.content_expander import (
    expand_character_qa,
    ScormQAPair,
    ScormFollowUpChain,
)


def _make_character(name: str = "Doc Brown") -> ContentCharacter:
    return ContentCharacter(
        name=name,
        voice_id="voice_123",
        frame_url="https://storage.example.com/face.jpg",
        description="Eccentric inventor and time travel pioneer.",
        movie_context="Doc Brown invented the time machine from a DeLorean.",
        actor_name="Christopher Lloyd",
        gender="male",
        suggested_questions=[
            "How does the flux capacitor work?",
            "Why a DeLorean?",
            "What's 1.21 gigawatts?",
        ],
    )


MOCK_QA_RESPONSE = json.dumps({
    "qa_pairs": [
        {
            "question": "How does the flux capacitor work?",
            "response_text": "The flux capacitor is what makes time travel possible.",
            "topic": "expertise",
            "difficulty": "basic",
        },
        {
            "question": "Why did you choose a DeLorean?",
            "response_text": "The stainless steel body made an excellent conductor.",
            "topic": "background",
            "difficulty": "intermediate",
        },
    ],
    "follow_up_chains": [
        {
            "exchanges": [
                {
                    "question": "Tell me about plutonium.",
                    "response_text": "I acquired it from Libyan nationalists.",
                },
                {
                    "question": "Wasn't that dangerous?",
                    "response_text": "Extremely. But science requires sacrifice.",
                },
            ],
            "callback": {"phrase": "Libyan nationalists", "references_exchange": 0},
        }
    ],
})


@pytest.mark.asyncio
async def test_expand_character_qa_parses_response():
    character = _make_character()
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=MOCK_QA_RESPONSE)]

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch(
        "app.services.olorin.scorm_export.content_expander.get_anthropic_client",
        return_value=mock_client,
    ):
        qa_pairs, chains = await expand_character_qa(
            character=character,
            content_title="Back to the Future",
            num_pairs=2,
            num_chains=1,
            chain_length=2,
        )

    assert len(qa_pairs) == 2
    assert isinstance(qa_pairs[0], ScormQAPair)
    assert qa_pairs[0].question == "How does the flux capacitor work?"
    assert qa_pairs[0].topic == "expertise"
    assert qa_pairs[0].difficulty == "basic"

    assert len(chains) == 1
    assert isinstance(chains[0], ScormFollowUpChain)
    assert len(chains[0].exchanges) == 2
    assert chains[0].callback.phrase == "Libyan nationalists"


@pytest.mark.asyncio
async def test_expand_character_qa_handles_invalid_json():
    character = _make_character()
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="not valid json")]

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch(
        "app.services.olorin.scorm_export.content_expander.get_anthropic_client",
        return_value=mock_client,
    ):
        qa_pairs, chains = await expand_character_qa(
            character=character,
            content_title="Test Movie",
            num_pairs=5,
            num_chains=2,
            chain_length=3,
        )

    assert qa_pairs == []
    assert chains == []


@pytest.mark.asyncio
async def test_expand_character_qa_handles_api_error():
    character = _make_character()
    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(
        side_effect=Exception("API rate limited")
    )

    with patch(
        "app.services.olorin.scorm_export.content_expander.get_anthropic_client",
        return_value=mock_client,
    ):
        qa_pairs, chains = await expand_character_qa(
            character=character,
            content_title="Test Movie",
            num_pairs=5,
            num_chains=2,
            chain_length=3,
        )

    assert qa_pairs == []
    assert chains == []
