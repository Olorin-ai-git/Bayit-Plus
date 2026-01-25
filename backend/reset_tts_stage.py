"""Clear TTS stage to regenerate with correct Hebrew voice"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings

async def reset_tts_stage():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")
    
    # Remove tts_generated stage to force regeneration
    if "tts_generated" in episode.translation_stages:
        print(f"Removing TTS stage to regenerate with Hebrew voice (Rachel - 21m00Tcm4TlvDq8ikWAM)")
        print(f"Previous TTS path: {episode.translation_stages['tts_generated'].get('tts_path')}")
        
        await PodcastEpisode.find_one({"_id": episode.id}).update({
            "$unset": {"translation_stages.tts_generated": ""},
            "$set": {"translation_status": "pending"}
        })
        print("✅ TTS stage cleared. Ready for regeneration with Hebrew voice.")
    else:
        print("No TTS stage found to clear.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(reset_tts_stage())
