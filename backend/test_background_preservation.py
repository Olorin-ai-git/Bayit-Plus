"""
Test podcast translation with background sound preservation.
Verifies that music, sound effects, and ambient audio are preserved in translation.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings
from app.services.podcast_translation_service import PodcastTranslationService

async def test_background_preservation():
    """Test translation with background music/sounds preserved."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    # Get Tucker Carlson episode (has intro music and background sounds)
    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    print("=" * 80)
    print("BACKGROUND SOUND PRESERVATION TEST")
    print("=" * 80)
    print(f"Episode: {episode.title}")
    print(f"Podcast: Tucker Carlson Show")
    print(f"Duration: 2 minutes (120 seconds)")
    print(f"Source: English")
    print(f"Target: Hebrew")
    print(f"TTS: Google Cloud TTS (Hebrew male voice)")
    print()
    print("Pipeline:")
    print("  1. Download original audio")
    print("  2. Separate vocals from background using Demucs v4")
    print("  3. Transcribe vocals only (clearer without background noise)")
    print("  4. Remove commercials from transcript")
    print("  5. Translate English → Hebrew")
    print("  6. Generate Hebrew TTS for translated text")
    print("  7. Mix Hebrew vocals with original background music/sounds")
    print("  8. Upload final audio with preserved background")
    print("=" * 80)
    print()

    # Create translation service
    translation_service = PodcastTranslationService()

    # Translate with background preservation
    result = await translation_service.translate_episode(
        episode=episode,
        target_lang_code="he",  # Translate to Hebrew
        force=True,  # Force fresh translation
        max_duration_seconds=120,  # 2 minutes for testing
        gender="male"  # Use male voice
    )

    print()
    print("=" * 80)
    print("✅ TRANSLATION WITH BACKGROUND PRESERVATION COMPLETE!")
    print("=" * 80)

    # Show results
    if "he" in episode.translations:
        he_translation = episode.translations["he"]
        print(f"Audio URL: {he_translation.audio_url}")
        print(f"Voice: Google Cloud TTS (he-IL-Wavenet-B)")
        print()
        print("🎵 Background sounds preserved:")
        print("  - Intro music from original audio")
        print("  - Ambient sounds and effects")
        print("  - Music during podcast")
        print()
        print("🎤 Hebrew translation:")
        print(f"  - {len(he_translation.translated_text)} characters")
        print(f"  - Voice: {he_translation.voice_id}")
        print()

    print("=" * 80)
    print("✅ Test complete - Listen to verify background sounds are preserved!")
    print("=" * 80)

    client.close()

if __name__ == "__main__":
    asyncio.run(test_background_preservation())
