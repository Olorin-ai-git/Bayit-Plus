"""
Show the Hebrew audio file path from database
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings

async def show_path():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    print("=" * 100)
    print("HEBREW AUDIO FILE PATHS")
    print("=" * 100)
    print()

    if episode.translations:
        print("All translations in database:")
        for lang_code, trans in episode.translations.items():
            print(f"\n{lang_code.upper()}:")
            print(f"  Audio URL: {trans.audio_url}")
            print(f"  Voice ID: {trans.voice_id}")
            print(f"  Created: {trans.created_at}")
            if hasattr(trans, 'file_size'):
                print(f"  File size: {trans.file_size} bytes")
            if hasattr(trans, 'duration'):
                print(f"  Duration: {trans.duration}")
    else:
        print("No translations found")

    print()
    print("=" * 100)
    print("LATEST TRANSLATION STAGES")
    print("=" * 100)
    print()

    if episode.translation_stages:
        for stage_name, stage_data in episode.translation_stages.items():
            print(f"\n{stage_name}:")
            for key, value in stage_data.items():
                if key not in ['transcript', 'clean_transcript', 'translated_text', 'removed_commercials']:
                    print(f"  {key}: {value}")
                elif key == 'removed_commercials':
                    print(f"  {key}: {len(value)} segments")
    else:
        print("No translation stages found")

    client.close()

if __name__ == "__main__":
    asyncio.run(show_path())
