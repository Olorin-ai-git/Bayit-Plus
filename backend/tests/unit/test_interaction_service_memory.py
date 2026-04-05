"""Test VODInteractionService memory integration (load on process, ingest on complete)."""
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.film_memory import VODFilmMemory
from app.models.vod_interaction import DialogueExchange, VODInteractionSession
from app.services.vod_interaction.interaction_service import VODInteractionService


def _session(exchanges=None) -> VODInteractionSession:
    with patch.object(VODInteractionSession, "get_pymongo_collection", return_value=MagicMock()):
        return VODInteractionSession(
            user_id="u",
            profile_id="p",
            content_id="c",
            avatar_id=None,
            moment_timestamp=42.0,
            character_name="Walter",
            scene_context="Newsroom.",
            character_description="Cynical editor",
            character_voice_id="v1",
            character_frame_url=None,
            dialogue_exchanges=exchanges or [],
            status="active",
        )


@pytest.mark.asyncio
async def test_complete_session_ingests_exchanges_when_flag_on():
    svc = VODInteractionService()
    sess = _session(exchanges=[
        DialogueExchange(speaker="user", message_text="why?", timestamp=datetime.utcnow()),
        DialogueExchange(speaker="character", message_text="Because.", timestamp=datetime.utcnow()),
    ])
    with patch.object(VODFilmMemory, "get_pymongo_collection", return_value=MagicMock()):
        memory = VODFilmMemory(user_id="u", profile_id="p", content_id="c")

    mock_ingest = AsyncMock(return_value=memory)
    mock_get_or_create = AsyncMock(return_value=memory)

    with patch.object(VODInteractionSession, "get", new=AsyncMock(return_value=sess)), \
         patch.object(VODInteractionSession, "save", new=AsyncMock()), \
         patch(
             "app.services.vod_interaction.interaction_service.settings.VOD_FILM_MEMORY_ENABLED",
             True,
         ), \
         patch(
             "app.services.vod_interaction.interaction_service.film_memory_service.get_or_create",
             new=mock_get_or_create,
         ), \
         patch(
             "app.services.vod_interaction.interaction_service.film_memory_service.ingest_exchanges",
             new=mock_ingest,
         ):
        await svc.complete_session("sid")

    mock_get_or_create.assert_awaited_once_with("u", "p", "c")
    assert mock_ingest.await_count == 1
    call_args = mock_ingest.await_args
    film_exchanges = call_args.args[1]
    assert len(film_exchanges) == 1
    assert film_exchanges[0].user_message == "why?"
    assert film_exchanges[0].character_response == "Because."
    assert film_exchanges[0].character_name == "Walter"
    assert film_exchanges[0].moment_timestamp == 42.0


@pytest.mark.asyncio
async def test_complete_session_skips_ingest_when_flag_off():
    svc = VODInteractionService()
    sess = _session(exchanges=[
        DialogueExchange(speaker="user", message_text="m", timestamp=datetime.utcnow()),
        DialogueExchange(speaker="character", message_text="r", timestamp=datetime.utcnow()),
    ])
    mock_ingest = AsyncMock()
    with patch.object(VODInteractionSession, "get", new=AsyncMock(return_value=sess)), \
         patch.object(VODInteractionSession, "save", new=AsyncMock()), \
         patch(
             "app.services.vod_interaction.interaction_service.settings.VOD_FILM_MEMORY_ENABLED",
             False,
         ), \
         patch(
             "app.services.vod_interaction.interaction_service.film_memory_service.ingest_exchanges",
             new=mock_ingest,
         ):
        await svc.complete_session("sid")
    mock_ingest.assert_not_awaited()


@pytest.mark.asyncio
async def test_complete_session_skips_incomplete_pairs():
    svc = VODInteractionService()
    sess = _session(exchanges=[
        DialogueExchange(speaker="user", message_text="m1", timestamp=datetime.utcnow()),
        DialogueExchange(speaker="character", message_text="r1", timestamp=datetime.utcnow()),
        DialogueExchange(speaker="user", message_text="m2", timestamp=datetime.utcnow()),
    ])
    with patch.object(VODFilmMemory, "get_pymongo_collection", return_value=MagicMock()):
        stub_memory = VODFilmMemory(user_id="u", profile_id="p", content_id="c")
    mock_ingest = AsyncMock(return_value=stub_memory)

    with patch.object(VODInteractionSession, "get", new=AsyncMock(return_value=sess)), \
         patch.object(VODInteractionSession, "save", new=AsyncMock()), \
         patch(
             "app.services.vod_interaction.interaction_service.settings.VOD_FILM_MEMORY_ENABLED",
             True,
         ), \
         patch(
             "app.services.vod_interaction.interaction_service.film_memory_service.get_or_create",
             new=AsyncMock(return_value=stub_memory),
         ), \
         patch(
             "app.services.vod_interaction.interaction_service.film_memory_service.ingest_exchanges",
             new=mock_ingest,
         ):
        await svc.complete_session("sid")

    film_exchanges = mock_ingest.await_args.args[1]
    assert len(film_exchanges) == 1
