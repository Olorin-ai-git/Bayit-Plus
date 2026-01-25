"""
Check what Hebrew text is actually in the database and being sent to TTS
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings

async def check_text():
    """Check the Hebrew text in database"""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    print("=" * 80)
    print("CHECKING HEBREW TEXT IN DATABASE")
    print("=" * 80)

    # Check if Hebrew translation exists
    if "he" in episode.translations:
        he_trans = episode.translations["he"]

        print(f"Hebrew translation exists")
        print(f"Voice ID: {he_trans.voice_id}")
        print(f"Language: {he_trans.language}")
        print()

        # Check the translated text
        translated_text = he_trans.translated_text
        print(f"Translated text length: {len(translated_text)} characters")
        print()

        # Show first 500 characters
        print("First 500 characters:")
        print(translated_text[:500])
        print()

        # Check if it's actually Hebrew characters
        hebrew_chars = sum(1 for char in translated_text if '\u0590' <= char <= '\u05FF')
        print(f"Hebrew characters count: {hebrew_chars} / {len(translated_text)}")
        print(f"Percentage Hebrew: {(hebrew_chars/len(translated_text)*100):.1f}%")
        print()

        # Check character encoding
        first_chars = translated_text[:100]
        print("Character codes of first 100 characters:")
        for i, char in enumerate(first_chars[:20]):
            print(f"  {i}: '{char}' = U+{ord(char):04X}")

    else:
        print("❌ No Hebrew translation found!")

    # Also check translation stages
    if hasattr(episode, 'translation_stages') and episode.translation_stages:
        if 'translated' in episode.translation_stages:
            stage = episode.translation_stages['translated']
            stage_text = stage.get('translated_text', '')
            print()
            print("=" * 80)
            print("TRANSLATION STAGE TEXT")
            print("=" * 80)
            print(f"Length: {len(stage_text)}")
            print(f"First 500 chars:")
            print(stage_text[:500])

    print()
    print("=" * 80)

    client.close()

if __name__ == "__main__":
    asyncio.run(check_text())
