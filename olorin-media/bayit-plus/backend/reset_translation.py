"""Reset translation to regenerate with correct Hebrew voice"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings

async def reset_translation():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")
    
    print("=" * 80)
    print(f"Resetting translation for: {episode.title}")
    print(f"Current voice ID: {episode.translations['he'].voice_id if episode.translations else 'None'}")
    print(f"New voice ID: 21m00Tcm4TlvDq8ikWAM (Rachel - Hebrew)")
    print(f"New model: eleven_multilingual_v3")
    print("=" * 80)
    
    # Keep the first 4 stages (download, vocals, transcript, translation)
    # Only regenerate TTS, mixing, and upload
    stages_to_keep = {}
    for stage in ['downloaded', 'vocals_separated', 'transcribed', 'translated']:
        if stage in episode.translation_stages:
            stages_to_keep[stage] = episode.translation_stages[stage]
    
    await PodcastEpisode.find_one({"_id": episode.id}).update({
        "$set": {
            "translation_status": "pending",
            "translation_stages": stages_to_keep,
            "retry_count": 0
        },
        "$unset": {"translations": ""}
    })
    
    print("\n✅ Translation reset. Stages preserved:")
    for stage in stages_to_keep.keys():
        print(f"   - {stage}")
    print("\nStages to regenerate:")
    print("   - tts_generated (with Hebrew voice)")
    print("   - mixing")
    print("   - upload")
    print("\nReady to run translation with Hebrew voice.")
    print("=" * 80)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(reset_translation())
