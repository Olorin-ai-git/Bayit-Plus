"""Unit tests for FilmMemorySummarizer."""
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.film_memory import FilmMemoryExchange
from app.services.vod_interaction.film_memory_summarizer import (
    FilmMemorySummarizer,
    SummarizerFailure,
)


def _exchange(character: str = "Walter", msg: str = "why?") -> FilmMemoryExchange:
    return FilmMemoryExchange(
        moment_timestamp=10.0,
        character_name=character,
        user_message=msg,
        character_response="Because.",
        created_at=datetime.utcnow(),
    )


@pytest.mark.asyncio
async def test_summarize_returns_llm_text():
    summarizer = FilmMemorySummarizer()
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="The student asked Walter why.")]
    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch(
        "app.services.vod_interaction.film_memory_summarizer.get_anthropic_client",
        return_value=mock_client,
    ):
        result = await summarizer.summarize(
            existing_summary="", new_exchanges=[_exchange()],
        )
    assert result == "The student asked Walter why."


@pytest.mark.asyncio
async def test_summarize_truncates_at_sentence_boundary():
    summarizer = FilmMemorySummarizer()
    long_text = "A. " * 2000  # 6000 chars
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=long_text)]
    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch(
        "app.services.vod_interaction.film_memory_summarizer.get_anthropic_client",
        return_value=mock_client,
    ):
        result = await summarizer.summarize(
            existing_summary="", new_exchanges=[_exchange()],
        )
    assert len(result) <= 2000
    assert result.endswith(".")


@pytest.mark.asyncio
async def test_summarize_raises_summarizer_failure_on_llm_error():
    summarizer = FilmMemorySummarizer()
    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(side_effect=RuntimeError("api down"))

    with patch(
        "app.services.vod_interaction.film_memory_summarizer.get_anthropic_client",
        return_value=mock_client,
    ):
        with pytest.raises(SummarizerFailure):
            await summarizer.summarize(
                existing_summary="", new_exchanges=[_exchange()],
            )


def test_build_prompt_includes_existing_summary_and_exchanges():
    summarizer = FilmMemorySummarizer()
    prompt = summarizer._build_prompt(
        existing_summary="Prior summary here.",
        new_exchanges=[_exchange(character="Hildy", msg="Should I go?")],
    )
    assert "Prior summary here." in prompt
    assert "Hildy" in prompt
    assert "Should I go?" in prompt
    assert "past tense" in prompt.lower()
