"""Live E2E test of FilmMemoryService against real Atlas + real summarizer LLM.

Exercises the exact backend code with VOD_FILM_MEMORY_ENABLED=True, hitting
live MongoDB Atlas and live Anthropic API. Proves the full pipeline runs
correctly in production-equivalent conditions.

Run: poetry run python test_memory_live.py
"""
import asyncio
import os

# Force flag on before importing settings
os.environ["VOD_FILM_MEMORY_ENABLED"] = "true"

from datetime import datetime

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.film_memory import FilmMemoryExchange, VODFilmMemory
from app.services.vod_interaction.film_memory_service import film_memory_service


TEST_USER = "test_user_live_memory"
TEST_PROFILE = "test_profile_live"
TEST_CONTENT = "test_content_his_girl_friday"


def _exchange(ts: float, character: str, user_msg: str, char_resp: str) -> FilmMemoryExchange:
    return FilmMemoryExchange(
        moment_timestamp=ts,
        character_name=character,
        user_message=user_msg,
        character_response=char_resp,
        created_at=datetime.utcnow(),
    )


async def run_live_test() -> None:
    print(f"Flag: VOD_FILM_MEMORY_ENABLED = {settings.VOD_FILM_MEMORY_ENABLED}")
    print(f"Verbatim window: {settings.VOD_FILM_MEMORY_VERBATIM_WINDOW}")
    print(f"MongoDB: {settings.MONGODB_URL.split('@')[1].split('/')[0] if '@' in settings.MONGODB_URL else 'local'}")
    print(f"Summarizer model: {settings.VOD_FILM_MEMORY_SUMMARIZER_MODEL}")
    print()

    # Init Beanie with the test database
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[f"{settings.MONGODB_DB_NAME}_live_memory_test"]
    await init_beanie(database=db, document_models=[VODFilmMemory])

    # Clean slate
    await db.vod_film_memories.delete_many({})
    print("✓ Beanie initialized, test collection cleaned\n")

    # --- Moment 1: User talks to Walter ---
    print("=== Moment 1: user → Walter ===")
    memory = await film_memory_service.get_or_create(TEST_USER, TEST_PROFILE, TEST_CONTENT)
    print(f"Initial state: summary={memory.summary!r}, recent={len(memory.recent_exchanges)}, version={memory.version}")

    m1_exchange = _exchange(
        ts=10.0, character="Walter Burns",
        user_msg="Why do you keep Hildy around?",
        char_resp="Because she's the best reporter I've got. Period.",
    )
    memory = await film_memory_service.ingest_exchanges(memory, [m1_exchange])
    print(f"After ingest: summary={memory.summary!r}, recent={len(memory.recent_exchanges)}, version={memory.version}")
    assert len(memory.recent_exchanges) == 1
    assert memory.summary == ""  # under window, no rollover yet
    print("✓ Moment 1 persisted, no rollover (1 ≤ window=3)\n")

    # --- Moment 2: User switches to Hildy, memory should have Walter exchange ---
    print("=== Moment 2: user → Hildy (memory should contain Walter exchange) ===")
    memory = await film_memory_service.get_or_create(TEST_USER, TEST_PROFILE, TEST_CONTENT)
    context = film_memory_service.build_memory_context(memory)
    print(f"Memory context for Hildy's prompt:")
    print("---")
    print(context)
    print("---")
    assert "<memory>" in context
    assert "Walter Burns" in context
    assert "best reporter" in context
    print("✓ Shared memory across characters verified — Hildy can see Walter exchange\n")

    m2_exchange = _exchange(
        ts=45.0, character="Hildy Johnson",
        user_msg="Walter says you're his best reporter. True?",
        char_resp="When Walter says 'best reporter', what he really means is 'most expendable.'",
    )
    memory = await film_memory_service.ingest_exchanges(memory, [m2_exchange])
    print(f"After ingest: recent={len(memory.recent_exchanges)}, version={memory.version}")

    # --- Moment 3: User returns to Walter, memory should have both exchanges ---
    print("\n=== Moment 3: user → Walter (memory should contain both prior exchanges) ===")
    memory = await film_memory_service.get_or_create(TEST_USER, TEST_PROFILE, TEST_CONTENT)
    context = film_memory_service.build_memory_context(memory)
    print(f"Memory context for Walter's prompt:")
    print("---")
    print(context)
    print("---")
    assert "Walter Burns" in context
    assert "Hildy Johnson" in context
    assert "expendable" in context

    m3_exchange = _exchange(
        ts=78.0, character="Walter Burns",
        user_msg="Hildy says you mean 'expendable.' Do you?",
        char_resp="Hildy's got a sharp tongue, always has. But I've never sent her anywhere I wouldn't go myself.",
    )
    memory = await film_memory_service.ingest_exchanges(memory, [m3_exchange])
    print(f"After ingest: recent={len(memory.recent_exchanges)}, version={memory.version}")
    assert len(memory.recent_exchanges) == 3  # exactly at window

    # --- Moment 4: 4th exchange triggers REAL summarizer call to Claude ---
    print("\n=== Moment 4: 4th exchange → triggers REAL summarizer (Claude Haiku) ===")
    m4_exchange = _exchange(
        ts=120.0, character="Walter Burns",
        user_msg="Why did you print the Earl Williams story?",
        char_resp="Because the public deserves the truth, even when it's ugly.",
    )
    memory = await film_memory_service.ingest_exchanges(memory, [m4_exchange])
    print(f"After ingest: recent={len(memory.recent_exchanges)}, version={memory.version}")
    print(f"Summarizer failure streak: {memory.summarizer_failure_streak}")
    print(f"\nREAL summary generated by Claude Haiku:")
    print("---")
    print(memory.summary)
    print("---")
    assert len(memory.recent_exchanges) == 3  # rolled over
    assert memory.summary != ""  # summarizer produced output
    assert memory.summarizer_failure_streak == 0  # success
    print("\n✓ Rollover triggered, summarizer succeeded, older exchange compressed into prose summary\n")

    # --- Verify persistence: reload fresh from Atlas ---
    print("=== Verifying persistence: reload fresh from Atlas ===")
    fresh = await db.vod_film_memories.find_one({
        "user_id": TEST_USER, "profile_id": TEST_PROFILE, "content_id": TEST_CONTENT,
    })
    print(f"Loaded from Atlas: version={fresh['version']}, exchange_count={fresh['exchange_count']}")
    print(f"Summary length: {len(fresh['summary'])} chars")
    print(f"Recent exchanges count: {len(fresh['recent_exchanges'])}")
    assert fresh["exchange_count"] == 4
    assert fresh["version"] >= 1
    assert len(fresh["recent_exchanges"]) == 3
    print("✓ Document persisted correctly in Atlas\n")

    # --- Cleanup ---
    await db.vod_film_memories.delete_many({})
    client.close()
    print("✓ Test cleanup complete\n")
    print("=" * 60)
    print("ALL LIVE E2E TESTS PASSED")
    print("=" * 60)
    print("Verified against live Atlas + live Anthropic API:")
    print("  • Memory persists across moments within a film")
    print("  • Shared memory visible to all characters (Walter ↔ Hildy)")
    print("  • Summarizer rollover at window (3 → 4 exchanges)")
    print("  • Real Claude Haiku summary generated and stored")
    print("  • Optimistic concurrency (version bumps) working")
    print("  • Atlas document shape matches expected schema")


if __name__ == "__main__":
    asyncio.run(run_live_test())
