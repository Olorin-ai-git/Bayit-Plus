"""
Test translating Hebrew podcast to English using ElevenLabs
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings
from app.services.podcast_translation_service import PodcastTranslationService

async def test_hebrew_to_english():
    """Translate Hebrew podcast to English with ElevenLabs"""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    # Get the latest episode from "השבוע" podcast
    episode = await PodcastEpisode.get("69729fac9d27d77a468d90b0")

    print("=" * 80)
    print("HEBREW TO ENGLISH TRANSLATION TEST")
    print("=" * 80)
    print(f"Episode: {episode.title}")
    print(f"Podcast: השבוע - פודקאסט הארץ (This Week - Haaretz)")
    print(f"Duration: 3 minutes (180 seconds)")
    print(f"Source: Hebrew")
    print(f"Target: English")
    print(f"TTS: ElevenLabs (English male voice)")
    print("=" * 80)
    print()

    # Create translation service
    translation_service = PodcastTranslationService()

    # Translate Hebrew to English
    result = await translation_service.translate_episode(
        episode=episode,
        target_lang_code="en",  # Target is English
        force=True,
        max_duration_seconds=180,  # 3 minutes
        gender="male"  # Use male English voice
    )

    print()
    print("=" * 80)
    print("✅ TRANSLATION COMPLETE!")
    print("=" * 80)

    # Show results
    if "en" in episode.translations:
        en_translation = episode.translations["en"]
        print(f"Audio URL: {en_translation.audio_url}")
        print(f"Voice ID: {en_translation.voice_id}")
        print()

        # Get translation data from stages
        if hasattr(episode, 'translation_stages'):
            if 'transcribed' in episode.translation_stages:
                transcript = episode.translation_stages['transcribed'].get('transcript', '')
                detected_lang = episode.translation_stages['transcribed'].get('language', '')
                print(f"Detected source language: {detected_lang}")
                print(f"Hebrew transcript length: {len(transcript)} characters")
                print()
                print("First 500 characters of Hebrew transcript:")
                print(transcript[:500])
                print()

            if 'translated' in episode.translation_stages:
                translated_text = episode.translation_stages['translated'].get('translated_text', '')
                print(f"English translation length: {len(translated_text)} characters")
                print()
                print("First 500 characters of English translation:")
                print(translated_text[:500])
                print()

    print("=" * 80)
    print("✅ Test complete - Hebrew podcast translated to English with ElevenLabs!")
    print("=" * 80)

    client.close()

if __name__ == "__main__":
    asyncio.run(test_hebrew_to_english())
