"""
Show what was transcribed and what Claude removed
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings

async def show_details():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    print("=" * 100)
    print("TRANSCRIPT ANALYSIS")
    print("=" * 100)
    print()

    if "transcribed" in episode.translation_stages:
        stage = episode.translation_stages["transcribed"]
        transcript = stage["transcript"]
        detected_lang = stage["detected_lang"]

        print(f"FULL TRANSCRIPT (Whisper detected: {detected_lang}):")
        print("-" * 100)
        print(transcript)
        print("-" * 100)
        print(f"Total: {len(transcript)} characters")
        print()

    if "commercials_removed" in episode.translation_stages:
        stage = episode.translation_stages["commercials_removed"]
        clean_transcript = stage["clean_transcript"]
        removed = stage["removed_commercials"]
        original_len = stage["original_length"]
        cleaned_len = stage["cleaned_length"]

        print("COMMERCIAL REMOVAL RESULTS:")
        print("-" * 100)
        print(f"Original length: {original_len} characters")
        print(f"Cleaned length: {cleaned_len} characters")
        print(f"Removed: {original_len - cleaned_len} characters ({len(removed)} segments)")
        print()

        if removed:
            print("REMOVED COMMERCIAL SEGMENTS:")
            for i, commercial in enumerate(removed, 1):
                print(f"\n--- Commercial {i} ---")
                print(commercial)
                print()

        print("CLEANED TRANSCRIPT (sent for translation):")
        print("-" * 100)
        print(clean_transcript)
        print("-" * 100)
        print()

    if "he" in episode.translations:
        trans = episode.translations["he"]
        print("HEBREW TRANSLATION:")
        print("-" * 100)
        print(trans.translated_text[:500] + "...")
        print("-" * 100)
        print(f"Total: {len(trans.translated_text)} characters")
        print()

    client.close()

if __name__ == "__main__":
    asyncio.run(show_details())
