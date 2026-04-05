"""Integration: two sequential moments, memory from first injected into second.

Exercises the real FilmMemoryService, summarizer, VODFilmMemory persistence,
and prompt building. Mocks the Anthropic client at the network boundary.
Requires a running MongoDB (configured via MONGODB_URL).
"""
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio

from app.models.film_memory import FilmMemoryExchange, VODFilmMemory
from app.services.vod_interaction.film_memory_service import film_memory_service


pytestmark = [pytest.mark.asyncio, pytest.mark.integration]


@pytest_asyncio.fixture(autouse=True)
async def _beanie_setup():
    """Initialize Beanie for VODFilmMemory against the test database."""
    from beanie import init_beanie
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.core.config import settings

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[f"{settings.MONGODB_DB_NAME}_test"]
    await init_beanie(database=db, document_models=[VODFilmMemory])
    await db.vod_film_memories.delete_many({})
    yield
    await db.vod_film_memories.delete_many({})
    client.close()


async def test_two_moment_memory_flow():
    """After ingesting moment 1 exchanges, build_memory_context returns them."""
    memory = await film_memory_service.get_or_create("u", "p", "c")
    assert memory.summary == ""
    assert memory.recent_exchanges == []

    exch1 = FilmMemoryExchange(
        moment_timestamp=10.0, character_name="Walter",
        user_message="why print it?",
        character_response="The public deserves truth.",
        created_at=datetime.utcnow(),
    )
    memory = await film_memory_service.ingest_exchanges(memory, [exch1])
    assert len(memory.recent_exchanges) == 1

    memory2 = await film_memory_service.get_or_create("u", "p", "c")
    context = film_memory_service.build_memory_context(memory2)
    assert "Walter" in context
    assert "why print it?" in context
    assert "The public deserves truth." in context


async def test_cross_character_memory_shared():
    """Memory is shared — Hildy's prompt contains prior Walter exchange."""
    memory = await film_memory_service.get_or_create("u", "p", "c")
    walter_exch = FilmMemoryExchange(
        moment_timestamp=10.0, character_name="Walter",
        user_message="why?", character_response="Because.",
        created_at=datetime.utcnow(),
    )
    memory = await film_memory_service.ingest_exchanges(memory, [walter_exch])

    context = film_memory_service.build_memory_context(memory)
    assert "Walter" in context
    assert "why?" in context


async def test_restart_clears_memory():
    memory = await film_memory_service.get_or_create("u", "p", "c")
    await film_memory_service.ingest_exchanges(memory, [FilmMemoryExchange(
        moment_timestamp=5.0, character_name="W",
        user_message="m", character_response="r",
        created_at=datetime.utcnow(),
    )])

    await film_memory_service.reset_for_user_content("u", "p", "c")

    fresh = await film_memory_service.get_or_create("u", "p", "c")
    assert fresh.summary == ""
    assert fresh.recent_exchanges == []


async def test_watchparty_users_have_isolated_memories():
    m1 = await film_memory_service.get_or_create("user1", "p", "c")
    m2 = await film_memory_service.get_or_create("user2", "p", "c")

    await film_memory_service.ingest_exchanges(m1, [FilmMemoryExchange(
        moment_timestamp=1.0, character_name="W",
        user_message="user1 msg", character_response="r1",
        created_at=datetime.utcnow(),
    )])

    m2_fresh = await film_memory_service.get_or_create("user2", "p", "c")
    assert m2_fresh.recent_exchanges == []
    m1_fresh = await film_memory_service.get_or_create("user1", "p", "c")
    assert len(m1_fresh.recent_exchanges) == 1


async def test_summarizer_rollover_after_window_overflow():
    """With window=3, adding a 4th should trigger real summarizer LLM call.

    Mocks the Anthropic client to return a fixed summary string.
    """
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="Prior summary text.")]
    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    memory = await film_memory_service.get_or_create("u", "p", "c")
    with patch(
        "app.services.vod_interaction.film_memory_summarizer.get_anthropic_client",
        return_value=mock_client,
    ):
        for i in range(4):
            exch = FilmMemoryExchange(
                moment_timestamp=float(i + 1),
                character_name="W",
                user_message=f"m{i}",
                character_response=f"r{i}",
                created_at=datetime.utcnow(),
            )
            memory = await film_memory_service.ingest_exchanges(memory, [exch])

    assert len(memory.recent_exchanges) == 3
    assert memory.summary == "Prior summary text."
    assert mock_client.messages.create.await_count == 1
