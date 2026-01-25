"""
Show full Hebrew translation text
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings

async def show_translation():
    """Show full translation text"""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    if episode.translations and "he" in episode.translations:
        trans = episode.translations["he"]

        print("=" * 80)
        print("ORIGINAL ENGLISH TRANSCRIPT")
        print("=" * 80)
        print(trans.transcript)
        print()
        print("=" * 80)
        print("HEBREW TRANSLATION")
        print("=" * 80)
        print(trans.translated_text)
        print()
        print("=" * 80)
        print(f"English character count: {len(trans.transcript)}")
        print(f"Hebrew character count: {len(trans.translated_text)}")
        print("=" * 80)

        # Save to files
        with open("transcript_english_full.txt", "w", encoding="utf-8") as f:
            f.write(trans.transcript)
        print("\n✅ Saved to: transcript_english_full.txt")

        with open("transcript_hebrew_full.txt", "w", encoding="utf-8") as f:
            f.write(trans.translated_text)
        print("✅ Saved to: transcript_hebrew_full.txt")

    client.close()

if __name__ == "__main__":
    asyncio.run(show_translation())
