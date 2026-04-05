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


# ---------------------------------------------------------------------------
# Task 7: ingest_exchanges
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ingest_exchanges_appends_under_window():
    service = FilmMemoryService()
    memory = _make_memory()
    mock_save = AsyncMock()
    with patch.object(VODFilmMemory, "save", mock_save):
        result = await service.ingest_exchanges(memory, [_exchange()])
    assert len(result.recent_exchanges) == 1
    assert result.exchange_count == 1
    assert result.summary == ""
    mock_save.assert_awaited_once()


@pytest.mark.asyncio
async def test_ingest_exchanges_rolls_over_when_exceeding_window():
    service = FilmMemoryService()
    memory = _make_memory(
        recent_exchanges=[
            _exchange(timestamp=1.0, user_msg="m1"),
            _exchange(timestamp=2.0, user_msg="m2"),
            _exchange(timestamp=3.0, user_msg="m3"),
        ],
        exchange_count=3,
    )
    mock_summarize = AsyncMock(return_value="Summary text.")
    with patch.object(VODFilmMemory, "save", new=AsyncMock()), \
         patch(
             "app.services.vod_interaction.film_memory_service.film_memory_summarizer.summarize",
             new=mock_summarize,
         ):
        result = await service.ingest_exchanges(
            memory, [_exchange(timestamp=4.0, user_msg="m4")],
        )
    assert len(result.recent_exchanges) == 3
    assert result.recent_exchanges[-1].user_message == "m4"
    assert result.recent_exchanges[0].user_message == "m2"
    assert result.summary == "Summary text."
    assert result.exchange_count == 4
    call_args = mock_summarize.await_args
    assert call_args.kwargs["existing_summary"] == ""
    assert len(call_args.kwargs["new_exchanges"]) == 1
    assert call_args.kwargs["new_exchanges"][0].user_message == "m1"


@pytest.mark.asyncio
async def test_ingest_exchanges_summarizer_failure_keeps_verbatim_no_rollover():
    service = FilmMemoryService()
    memory = _make_memory(
        recent_exchanges=[
            _exchange(timestamp=1.0, user_msg="m1"),
            _exchange(timestamp=2.0, user_msg="m2"),
            _exchange(timestamp=3.0, user_msg="m3"),
        ],
        exchange_count=3,
        summarizer_failure_streak=0,
    )
    mock_summarize = AsyncMock(side_effect=SummarizerFailure("boom"))
    with patch.object(VODFilmMemory, "save", new=AsyncMock()), \
         patch(
             "app.services.vod_interaction.film_memory_service.film_memory_summarizer.summarize",
             new=mock_summarize,
         ):
        result = await service.ingest_exchanges(
            memory, [_exchange(timestamp=4.0, user_msg="m4")],
        )
    assert len(result.recent_exchanges) == 4
    assert result.summary == ""
    assert result.summarizer_failure_streak == 1


@pytest.mark.asyncio
async def test_ingest_exchanges_circuit_breaker_skips_summarizer_after_threshold():
    service = FilmMemoryService()
    memory = _make_memory(
        recent_exchanges=[
            _exchange(timestamp=1.0, user_msg="m1"),
            _exchange(timestamp=2.0, user_msg="m2"),
            _exchange(timestamp=3.0, user_msg="m3"),
        ],
        summarizer_failure_streak=3,
    )
    mock_summarize = AsyncMock(return_value="unused")
    with patch.object(VODFilmMemory, "save", new=AsyncMock()), \
         patch(
             "app.services.vod_interaction.film_memory_service.film_memory_summarizer.summarize",
             new=mock_summarize,
         ):
        result = await service.ingest_exchanges(
            memory, [_exchange(timestamp=4.0, user_msg="m4")],
        )
    mock_summarize.assert_not_awaited()
    assert len(result.recent_exchanges) == 4


@pytest.mark.asyncio
async def test_ingest_exchanges_hard_cap_drops_oldest_past_limit():
    service = FilmMemoryService()
    memory = _make_memory(
        recent_exchanges=[
            _exchange(timestamp=float(i), user_msg=f"m{i}") for i in range(10)
        ],
        summarizer_failure_streak=3,
    )
    with patch.object(VODFilmMemory, "save", new=AsyncMock()):
        result = await service.ingest_exchanges(
            memory, [_exchange(timestamp=99.0, user_msg="m99")],
        )
    assert len(result.recent_exchanges) == 10
    assert result.recent_exchanges[-1].user_message == "m99"
    assert result.recent_exchanges[0].user_message == "m1"


@pytest.mark.asyncio
async def test_ingest_exchanges_resets_failure_streak_on_success():
    service = FilmMemoryService()
    memory = _make_memory(
        recent_exchanges=[
            _exchange(timestamp=1.0, user_msg="m1"),
            _exchange(timestamp=2.0, user_msg="m2"),
            _exchange(timestamp=3.0, user_msg="m3"),
        ],
        summarizer_failure_streak=2,
    )
    mock_summarize = AsyncMock(return_value="Summary.")
    with patch.object(VODFilmMemory, "save", new=AsyncMock()), \
         patch(
             "app.services.vod_interaction.film_memory_service.film_memory_summarizer.summarize",
             new=mock_summarize,
         ):
        result = await service.ingest_exchanges(
            memory, [_exchange(timestamp=4.0, user_msg="m4")],
        )
    assert result.summarizer_failure_streak == 0
    assert result.summary == "Summary."


# ---------------------------------------------------------------------------
# Task 8: reset_for_user_content
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_reset_for_user_content_deletes_memory_when_present():
    mock_doc = AsyncMock()
    service = FilmMemoryService()
    with patch.object(VODFilmMemory, "find", new=_fake_find_returning(mock_doc)):
        await service.reset_for_user_content("u", "p", "c")
    mock_doc.delete.assert_awaited_once()


@pytest.mark.asyncio
async def test_reset_for_user_content_noop_when_absent():
    service = FilmMemoryService()
    with patch.object(VODFilmMemory, "find", new=_fake_find_returning(None)):
        await service.reset_for_user_content("u", "p", "c")
