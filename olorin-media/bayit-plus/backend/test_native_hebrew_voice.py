"""
Test with ElevenLabs native Hebrew voice instead of custom clone
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings
from app.services.podcast_translation_service import PodcastTranslationService

# ElevenLabs official multilingual voices that support Hebrew
NATIVE_HEBREW_VOICES = {
    "male": {
        "Adam": "pNInz6obpgDQGcFmaJgB",  # Pre-made, deep, middle-aged
        "Daniel": "onwK4e9ZLuTAKqWW03F9",  # Pre-made, deep, middle-aged
        "Antoni": "ErXwobaYiN019PkySvjV",  # Pre-made, well-rounded, young
    },
    "female": {
        "Rachel": "21m00Tcm4TlvDq8ikWAM",  # Pre-made, calm, young
        "Domi": "AZnzlk1XvdvUeBnXmlld",   # Pre-made, strong, young
    }
}

async def test_native_hebrew():
    """Test with ElevenLabs native multilingual voice that supports Hebrew"""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    # Get the Tucker Carlson episode
    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    print("=" * 80)
    print("TESTING WITH NATIVE HEBREW VOICE")
    print("=" * 80)
    print(f"Episode: {episode.title}")
    print(f"Testing with: Daniel (onwK4e9ZLuTAKqWW03F9) - Pre-made deep male voice")
    print(f"This voice should speak proper Hebrew, not Farsi")
    print("=" * 80)
    print()

    # Create translation service
    translation_service = PodcastTranslationService()

    # Override the Hebrew male voice with native ElevenLabs voice
    original_voice = settings.ELEVENLABS_HEBREW_MALE_VOICE_ID
    settings.ELEVENLABS_HEBREW_MALE_VOICE_ID = "onwK4e9ZLuTAKqWW03F9"  # Daniel

    try:
        # Run translation with native voice
        result = await translation_service.translate_episode(
            episode=episode,
            force=True,
            max_duration_seconds=600,  # 10 minutes
            gender="male"
        )

        print()
        print("=" * 80)
        print("✅ NATIVE HEBREW VOICE TEST COMPLETE!")
        print("=" * 80)

        # Show results
        he_translation = episode.translations.get("he")
        if he_translation:
            print(f"Audio URL: {he_translation.audio_url}")
            print(f"Voice ID: {he_translation.voice_id} (Daniel - native Hebrew)")
            print()
            print("First 500 characters of Hebrew translation:")
            print(he_translation.translated_text[:500])

        print()
        print("=" * 80)
        print("✅ Test complete - this should sound like proper Hebrew!")
        print("=" * 80)

    finally:
        # Restore original voice
        settings.ELEVENLABS_HEBREW_MALE_VOICE_ID = original_voice
        client.close()

if __name__ == "__main__":
    asyncio.run(test_native_hebrew())
