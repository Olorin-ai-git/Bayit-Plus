"""
Check the Hebrew translation text in the database
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings
import json

async def check_translation():
    """Check what Hebrew text was generated"""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    print("=" * 80)
    print("TRANSLATION ANALYSIS")
    print("=" * 80)
    print()

    # Check translation stages
    if "transcribed" in episode.translation_stages:
        transcript = episode.translation_stages["transcribed"]["transcript"]
        detected_lang = episode.translation_stages["transcribed"]["detected_lang"]
        print("ORIGINAL ENGLISH TRANSCRIPT:")
        print("-" * 80)
        print(transcript)
        print()
        print(f"Detected Language: {detected_lang}")
        print(f"Character Count: {len(transcript)}")
        print()

    if "translated" in episode.translation_stages:
        translated = episode.translation_stages["translated"]["translated_text"]
        target_lang = episode.translation_stages["translated"]["target_lang"]
        print("HEBREW TRANSLATION:")
        print("-" * 80)
        print(translated)
        print()
        print(f"Target Language: {target_lang}")
        print(f"Character Count: {len(translated)}")
        print()

    # Check if there's a stored translation in translations field
    if episode.translations:
        print("STORED TRANSLATIONS:")
        print("-" * 80)
        for lang_code, trans_data in episode.translations.items():
            print(f"\nLanguage: {lang_code}")
            print(f"Voice ID: {trans_data.voice_id}")
            print(f"Audio URL: {trans_data.audio_url}")
            print(f"Original Transcript (first 200 chars): {trans_data.transcript[:200]}...")
            print(f"Translated Text (first 200 chars): {trans_data.translated_text[:200]}...")

    print("=" * 80)

    # Save full texts to files for analysis
    if "transcribed" in episode.translation_stages:
        with open("transcript_english.txt", "w", encoding="utf-8") as f:
            f.write(episode.translation_stages["transcribed"]["transcript"])
        print("✅ Saved English transcript to: transcript_english.txt")

    if "translated" in episode.translation_stages:
        with open("transcript_hebrew.txt", "w", encoding="utf-8") as f:
            f.write(episode.translation_stages["translated"]["translated_text"])
        print("✅ Saved Hebrew translation to: transcript_hebrew.txt")

    client.close()

if __name__ == "__main__":
    asyncio.run(check_translation())
