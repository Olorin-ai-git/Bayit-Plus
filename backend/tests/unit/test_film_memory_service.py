"""Unit tests for FilmMemoryService."""
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.film_memory import FilmMemoryExchange, VODFilmMemory
from app.services.vod_interaction.film_memory_service import FilmMemoryService
from app.services.vod_interaction.film_memory_summarizer import SummarizerFailure


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_memory(**kwargs) -> VODFilmMemory:
    """Construct a VODFilmMemory without Beanie collection init."""
    with patch.object(VODFilmMemory, "get_pymongo_collection", return_value=MagicMock()):
        return VODFilmMemory(user_id="u", profile_id="p", content_id="c", **kwargs)


def _exchange(
    timestamp: float = 12.0,
    character: str = "Walter",
    user_msg: str = "why?",
    char_resp: str = "Because.",
) -> FilmMemoryExchange:
    return FilmMemoryExchange(
        moment_timestamp=timestamp,
        character_name=character,
        user_message=user_msg,
        character_response=char_resp,
        created_at=datetime.utcnow(),
    )


# ---------------------------------------------------------------------------
# Fake query factory (accepts and discards Beanie filter expressions)
# ---------------------------------------------------------------------------

def _fake_find_returning(doc):
    """Return a find-callable that ignores filter args and returns doc."""
    class _Query:
        async def first_or_none(self):
            return doc
    def _find(*args, **kwargs):  # noqa: ANN001
        return _Query()
    return _find


# ---------------------------------------------------------------------------
# Task 5: get_or_create
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_or_create_returns_existing():
    existing = _make_memory()
    service = FilmMemoryService()
    with patch.object(VODFilmMemory, "find", new=_fake_find_returning(existing)):
        result = await service.get_or_create("u1", "p1", "c1")
    assert result is existing


@pytest.mark.asyncio
async def test_get_or_create_creates_when_absent():
    service = FilmMemoryService()
    with patch.object(VODFilmMemory, "find", new=_fake_find_returning(None)), \
         patch.object(VODFilmMemory, "get_pymongo_collection", return_value=MagicMock()), \
         patch.object(VODFilmMemory, "insert", new=AsyncMock()) as mock_insert:
        result = await service.get_or_create("u2", "p2", "c2")
    assert result.user_id == "u2"
    assert result.profile_id == "p2"
    assert result.content_id == "c2"
    assert result.summary == ""
    assert result.recent_exchanges == []
    mock_insert.assert_awaited_once()


# ---------------------------------------------------------------------------
# Task 6: build_memory_context
# ---------------------------------------------------------------------------

def test_build_memory_context_empty_returns_empty_string():
    service = FilmMemoryService()
    memory = _make_memory()
    assert service.build_memory_context(memory) == ""


def test_build_memory_context_formats_summary_and_exchanges():
    service = FilmMemoryService()
    memory = _make_memory(
        summary="Student asked Walter about motivations.",
        recent_exchanges=[
            _exchange(timestamp=10.0, character="Walter", user_msg="why?"),
            _exchange(timestamp=45.0, character="Hildy", user_msg="leaving?"),
        ],
    )
    context = service.build_memory_context(memory)
    assert "<memory>" in context
    assert "</memory>" in context
    assert "Student asked Walter about motivations." in context
    assert "At 10.0s, speaking to Walter" in context
    assert "At 45.0s, speaking to Hildy" in context
    assert "Student: why?" in context
    assert "Student: leaving?" in context


def test_build_memory_context_summary_only_no_exchanges():
    service = FilmMemoryService()
    memory = _make_memory(summary="Something happened earlier.")
    context = service.build_memory_context(memory)
    assert "Something happened earlier." in context
    assert "Most recent exchanges" not in context


def test_build_memory_context_exchanges_only_no_summary():
    service = FilmMemoryService()
    memory = _make_memory(recent_exchanges=[_exchange()])
    context = service.build_memory_context(memory)
    assert "What's happened between you" not in context
    assert "Most recent exchanges" in context
