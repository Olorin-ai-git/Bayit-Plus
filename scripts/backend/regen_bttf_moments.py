#!/usr/bin/env python3
"""
One-shot script: Upload Biff face, generate Biff TTS, run Aurora lip-sync
for all 5 BTTF interactive moments, update MongoDB.
"""
import asyncio
import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.fal_aurora_client import fal_aurora_client
from app.core.logging_config import get_logger
from app.core.storage import storage_service

logger = get_logger(__name__)

BIFF_RESPONSE_TEXT = (
    "Hey, what are you looking at, butthead? You think you can just waltz in here "
    "and talk to me like that? Let me tell you something, nobody talks to Biff Tannen "
    "that way and gets away with it. Now why don't you make like a tree and get out of here!"
)

BIFF_VOICE_ID = "3FKcLNig9t6qJCE70Rwy"
BIFF_FACE_LOCAL = Path.home() / "Downloads" / "Biff.jpeg"

# Moments 0-3 already have TTS audio on GCS from last session
EXISTING_MOMENTS = [
    {
        "index": 0,
        "character": "Jennifer Parker",
        "voice_id": "cgSgspJ2msm6clMCkdW9",
        "face_url": "https://static.wikia.nocookie.net/bttf/images/6/65/Jennifer-02.jpg/revision/latest",
        "audio_url": "https://storage.googleapis.com/bayit-plus-media-new/vod-interactions/character-audio/jennifer_parker.mp3",
    },
    {
        "index": 1,
        "character": "Doc Brown",
        "voice_id": "a7toocJbPxci8Tmwnx4S",
        "face_url": "https://storage.googleapis.com/bayit-plus-media-new/vod-interactions/character-faces/doc_brown.jpg",
        "audio_url": "https://storage.googleapis.com/bayit-plus-media-new/vod-interactions/character-audio/doc_brown_1.mp3",
    },
    {
        "index": 2,
        "character": "George McFly",
        "voice_id": "abQWz9Ie9T8HcynRj3mY",
        "face_url": "https://storage.googleapis.com/bayit-plus-media-new/vod-interactions/character-faces/george_mcfly.jpg",
        "audio_url": "https://storage.googleapis.com/bayit-plus-media-new/vod-interactions/character-audio/george_mcfly.mp3",
    },
    {
        "index": 3,
        "character": "Doc Brown",
        "voice_id": "a7toocJbPxci8Tmwnx4S",
        "face_url": "https://storage.googleapis.com/bayit-plus-media-new/vod-interactions/character-faces/doc_brown.jpg",
        "audio_url": "https://storage.googleapis.com/bayit-plus-media-new/vod-interactions/character-audio/doc_brown_2.mp3",
    },
]


async def upload_biff_face() -> str:
    """Upload Biff's face from Downloads to GCS."""
    if not BIFF_FACE_LOCAL.exists():
        raise FileNotFoundError(f"Biff face not found: {BIFF_FACE_LOCAL}")

    data = BIFF_FACE_LOCAL.read_bytes()
    gcs_path = "vod-interactions/character-faces/biff_tannen.jpg"
    url = await storage_service.upload_bytes(data, gcs_path, content_type="image/jpeg")
    logger.info("Biff face uploaded: %s", url)
    return url


async def generate_tts(text: str, voice_id: str, char_name: str) -> str:
    """Generate TTS via ElevenLabs, upload to GCS."""
    settings = get_settings()
    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
        resp = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            json={
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
            },
            headers={
                "xi-api-key": settings.ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
            },
        )
        resp.raise_for_status()

    text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
    safe_name = char_name.replace(" ", "_").lower()
    gcs_path = f"vod-interactions/character-audio/{safe_name}_{text_hash}.mp3"
    url = await storage_service.upload_bytes(resp.content, gcs_path, content_type="audio/mpeg")
    logger.info("TTS uploaded for %s: %s", char_name, url)
    return url


async def run_aurora(image_url: str, audio_url: str, label: str) -> str:
    """Run Aurora lip-sync and return storage URL."""
    logger.info("Starting Aurora for %s (image=%s, audio=%s)", label, image_url[:60], audio_url[:60])
    video_url = await fal_aurora_client.create_lipsync(
        image_url=image_url, audio_url=audio_url,
    )
    logger.info("Aurora done for %s: %s", label, video_url[:80])
    return video_url


async def main():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    content = await db.content.find_one({"imdb_id": "tt0088763"})
    if not content:
        logger.error("BTTF content not found")
        return

    moments = content.get("interactive_moments", [])
    logger.info("Found %d existing moments", len(moments))

    # Step 1: Upload Biff face to GCS
    logger.info("=== Step 1: Upload Biff face ===")
    biff_face_url = await upload_biff_face()

    # Step 2: Generate Biff TTS
    logger.info("=== Step 2: Generate Biff TTS ===")
    biff_audio_url = await generate_tts(BIFF_RESPONSE_TEXT, BIFF_VOICE_ID, "Biff Tannen")

    # Step 3: Run Aurora lip-sync for all 5 moments
    logger.info("=== Step 3: Running Aurora lip-sync for all moments ===")

    results = []
    for m in EXISTING_MOMENTS:
        label = f"Moment {m['index']} ({m['character']})"
        video_url = await run_aurora(m["face_url"], m["audio_url"], label)
        results.append({
            "index": m["index"],
            "video_url": video_url,
            "audio_url": m["audio_url"],
            "voice_id": m["voice_id"],
            "face_url": m["face_url"],
        })

    # Biff moment (index 4)
    biff_video_url = await run_aurora(biff_face_url, biff_audio_url, "Moment 4 (Biff Tannen)")

    # Step 4: Update existing moments 0-3 in MongoDB
    logger.info("=== Step 4: Updating MongoDB ===")
    for r in results:
        idx = r["index"]
        moments[idx]["character_response_video_url"] = r["video_url"]
        moments[idx]["character_response_audio_url"] = r["audio_url"]
        moments[idx]["voice_id"] = r["voice_id"]
        moments[idx]["character_frame_url"] = r["face_url"]

    # Add Biff moment (index 4)
    biff_moment = {
        "character_name": "Biff Tannen",
        "timestamp_seconds": None,
        "trigger_text": "",
        "character_response_text": BIFF_RESPONSE_TEXT,
        "character_response_video_url": biff_video_url,
        "character_response_audio_url": biff_audio_url,
        "character_frame_url": biff_face_url,
        "voice_id": BIFF_VOICE_ID,
    }
    moments.append(biff_moment)

    # Also update interactive_characters with correct voice IDs
    chars = content.get("interactive_characters", [])
    voice_map = {
        "Biff Tannen": BIFF_VOICE_ID,
        "Jennifer Parker": "cgSgspJ2msm6clMCkdW9",
    }
    for char in chars:
        name = char.get("name", "")
        if name in voice_map:
            char["voice_id"] = voice_map[name]
        if name == "Biff Tannen":
            char["frame_url"] = biff_face_url

    await db.content.update_one(
        {"_id": content["_id"]},
        {"$set": {
            "interactive_moments": moments,
            "interactive_characters": chars,
        }},
    )

    logger.info("=== DONE ===")
    logger.info("Updated %d moments (4 existing + 1 new Biff)", len(results))
    for r in results:
        logger.info("  Moment %d: video=%s", r["index"], r["video_url"][:80])
    logger.info("  Moment 4 (Biff): video=%s", biff_video_url[:80])

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
