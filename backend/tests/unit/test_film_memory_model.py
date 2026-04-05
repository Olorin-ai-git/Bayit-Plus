"""Unit tests for VODFilmMemory and FilmMemoryExchange pydantic/Beanie models."""
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from app.models.film_memory import FilmMemoryExchange, VODFilmMemory


def test_film_memory_exchange_requires_all_fields():
    exchange = FilmMemoryExchange(
        moment_timestamp=42.5,
        character_name="Walter Burns",
        user_message="Why are you printing the story?",
        character_response="Because the public deserves the truth.",
        created_at=datetime.utcnow(),
    )
    assert exchange.character_name == "Walter Burns"
    assert exchange.moment_timestamp == 42.5


def test_vod_film_memory_defaults():
    with patch.object(VODFilmMemory, "get_pymongo_collection", return_value=MagicMock()):
        memory = VODFilmMemory(
            user_id="u1",
            profile_id="p1",
            content_id="c1",
        )
    assert memory.summary == ""
    assert memory.recent_exchanges == []
    assert memory.exchange_count == 0
    assert memory.last_moment_timestamp == 0.0
    assert memory.version == 0


def test_vod_film_memory_settings_collection_name():
    assert VODFilmMemory.Settings.name == "vod_film_memories"
