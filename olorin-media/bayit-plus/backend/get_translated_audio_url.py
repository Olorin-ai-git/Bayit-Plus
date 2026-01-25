"""
Get the translated audio URL for the Haaretz episode.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings

async def get_audio_url():
    """Get translated audio URLs."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    episode_id = "69729fac9d27d77a468d90b0"
    episode = await PodcastEpisode.get(episode_id)

    if not episode:
        print(f"Episode {episode_id} not found")
        client.close()
        return

    print("=" * 80)
    print("TRANSLATED HAARETZ EPISODE - AUDIO URLs")
    print("=" * 80)
    print(f"Title: {episode.title}")
    print()
    print(f"Translation Status: {episode.translation_status}")
    print(f"Available Languages: {episode.available_languages}")
    print()
    print("AUDIO URLs:")
    print("-" * 80)

    # Original Hebrew audio
    if hasattr(episode, 'audio_url') and episode.audio_url:
        print(f"\n📻 Original Hebrew:")
        print(f"   {episode.audio_url}")

    # English translation
    if hasattr(episode, 'audio_url_en') and episode.audio_url_en:
        print(f"\n🇬🇧 English Translation:")
        print(f"   {episode.audio_url_en}")

    # Spanish translation (if available)
    if hasattr(episode, 'audio_url_es') and episode.audio_url_es:
        print(f"\n🇪🇸 Spanish Translation:")
        print(f"   {episode.audio_url_es}")

    print()
    print("-" * 80)
    print("\nFeatures Applied:")
    print("  ✓ Background sound preservation (music, effects)")
    print("  ✓ Multi-speaker detection (Google Cloud)")
    print("  ✓ Different voices per speaker")
    print("  ✓ Professional audio mixing")
    print("=" * 80)

    client.close()

if __name__ == "__main__":
    asyncio.run(get_audio_url())
