"""
Translate the full Haaretz podcast episode using multi-speaker translation.
Episode ID: 69729fac9d27d77a468d90b0
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings
from app.services.podcast_translation_service import PodcastTranslationService

async def translate_full_episode():
    """Translate the full Hebrew Haaretz episode to English."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    # Get the Haaretz episode
    episode_id = "69729fac9d27d77a468d90b0"
    print("=" * 80)
    print("TRANSLATING FULL HAARETZ EPISODE")
    print("=" * 80)
    print(f"Episode ID: {episode_id}")
    print()

    episode = await PodcastEpisode.get(episode_id)
    if not episode:
        print(f"❌ Episode {episode_id} not found")
        client.close()
        return

    print(f"Found episode:")
    print(f"  Title: {episode.title}")
    print(f"  Podcast: השבוע - פודקאסט הארץ (This Week - Haaretz)")
    print(f"  Original Language: {episode.original_language}")
    print(f"  Current Status: {episode.translation_status}")
    print()

    # Initialize translation service
    translation_service = PodcastTranslationService()

    print("Starting full episode translation...")
    print("Target Language: English")
    print("Features:")
    print("  ✓ Background sound preservation (music, effects)")
    print("  ✓ Multi-speaker detection (Google Cloud)")
    print("  ✓ Different voices for each speaker")
    print()
    print("NOTE: This will process the FULL episode (not trimmed)")
    print("Estimated time: 15-30 minutes depending on episode length")
    print("=" * 80)
    print()

    try:
        # Translate the full episode (Hebrew → English)
        # IMPORTANT: max_duration_seconds=None means NO trimming (full episode)
        await translation_service.translate_episode(
            episode=episode,
            target_lang_code="en",  # English
            max_duration_seconds=None,  # NO trimming - process FULL episode
            gender="male"  # Default gender (multi-speaker will use both male/female)
        )

        print()
        print("=" * 80)
        print("✅ TRANSLATION COMPLETE!")
        print("=" * 80)

        # Reload episode to see updated status
        episode = await PodcastEpisode.get(episode_id)
        print(f"Translation Status: {episode.translation_status}")
        print(f"Available Languages: {episode.available_languages}")
        print()
        print("The translated episode is now available in the system.")
        print("=" * 80)

    except Exception as e:
        print()
        print("=" * 80)
        print("❌ TRANSLATION FAILED")
        print("=" * 80)
        print(f"Error: {str(e)}")
        print()
        import traceback
        print("Full traceback:")
        print(traceback.format_exc())

    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(translate_full_episode())
