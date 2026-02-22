#!/usr/bin/env python3
"""
Generate kid avatar lipsync videos for all BTTF Part III moments.

Uses ElevenLabs TTS (Etai's cloned voice) + fal.ai Aurora lip-sync
+ GCS upload + MongoDB update.

Usage:
    cd backend && poetry run python ../scripts/backend/gen_kid_avatar_lipsync_bttf3.py
"""

import asyncio
import hashlib
import subprocess
import tempfile
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

import httpx
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

BTTF3_IMDB_ID = "tt0099088"
KID_AVATAR_IMAGE = (
    "https://cdn.creatify.ai/creator/"
    "4045d05f-2dc5-4661-8121-733ecd3e8aec/st.png"
)
KID_VOICE_ID = "jQkT4jjvjt0UEM7lOGtL"
GCS_BUCKET = "bayit-plus-media-new"

KID_QUESTIONS = {
    0: (
        "Doc, you hid the DeLorean in a mine for 70 years!"
        " How did you make sure it would still work?"
    ),
    1: (
        "Marty, you're in the real Wild West!"
        " Is it as cool as it looks in the movies?"
    ),
    2: (
        "Doc, you're a blacksmith now!"
        " Do you like living in the Old West better than the future?"
    ),
    3: (
        "Mad Dog, why are you so angry at Doc Brown?"
        " Eighty dollars doesn't seem worth fighting over!"
    ),
    4: (
        "Doc, you just met Clara and you look so happy!"
        " Do you think she's the one?"
    ),
    5: (
        "Marty, people keep calling you chicken!"
        " Why does that make you so mad?"
    ),
    6: (
        "Doc, you look so sad about leaving Clara."
        " Can't you find a way to be together?"
    ),
    7: (
        "Mad Dog, do you really think you can beat Marty"
        " in the showdown? He's tougher than he looks!"
    ),
    8: (
        "Doc, you want to push the DeLorean with a train?"
        " That sounds really dangerous but also really cool!"
    ),
    9: (
        "Doc, you came back with a time-traveling train!"
        " What's the most important lesson you learned?"
    ),
}


def upload_to_gcs(local_path: str, gcs_path: str) -> str:
    """Upload file to GCS using gcloud CLI."""
    full_gcs = f"gs://{GCS_BUCKET}/{gcs_path}"
    result = subprocess.run(
        ["gcloud", "storage", "cp", local_path, full_gcs],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"GCS upload failed: {result.stderr}")
    return f"https://storage.googleapis.com/{GCS_BUCKET}/{gcs_path}"


async def generate_tts(
    text: str, voice_id: str, client: httpx.AsyncClient, settings,
) -> bytes:
    """Generate TTS audio via ElevenLabs."""
    resp = await client.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        headers={
            "xi-api-key": settings.ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
        },
        timeout=60,
    )
    resp.raise_for_status()
    return resp.content


async def generate_aurora_lipsync(
    image_url: str, audio_url: str, client: httpx.AsyncClient, settings,
) -> str:
    """Generate Aurora lip-sync video via fal.ai synchronous API."""
    headers = {
        "Authorization": f"Key {settings.FAL_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "image_url": image_url,
        "audio_url": audio_url,
        "resolution": settings.FAL_AURORA_RESOLUTION,
        "guidance_scale": 1,
        "audio_guidance_scale": 2,
    }

    logger.info("Calling Aurora sync API (may take 2-5 min)...")
    resp = await client.post(
        "https://fal.run/fal-ai/creatify/aurora",
        headers=headers,
        json=payload,
        timeout=600,
    )
    resp.raise_for_status()
    result_data = resp.json()
    video_url = result_data.get("video", {}).get("url")
    if not video_url:
        raise RuntimeError(f"No video URL in Aurora result: {result_data}")

    logger.info("Aurora complete: %s...", video_url[:80])
    return video_url


async def main():
    settings = get_settings()
    mongo = AsyncIOMotorClient(settings.MONGODB_URI)
    db = mongo[settings.MONGODB_DB_NAME]

    content = await db.content.find_one({"imdb_id": BTTF3_IMDB_ID})
    if not content:
        logger.error("BTTF Part III not found (imdb_id=%s)", BTTF3_IMDB_ID)
        mongo.close()
        sys.exit(1)

    moments = content.get("interactive_moments", [])
    logger.info("Found %d moments for BTTF3", len(moments))

    async with httpx.AsyncClient() as client:
        for idx, moment in enumerate(moments):
            char_name = moment.get("character_name", "")

            existing_lipsync = moment.get("lipsync_video_url")
            if existing_lipsync and existing_lipsync.startswith("http"):
                logger.info(
                    "Moment %d (%s): already has lipsync, skipping",
                    idx, char_name,
                )
                continue

            question_text = KID_QUESTIONS.get(idx)
            if not question_text:
                logger.info("Moment %d: no question defined, skipping", idx)
                continue

            safe_name = char_name.lower().replace(" ", "_")
            logger.info(
                "Moment %d (%s): generating kid avatar lipsync",
                idx, char_name,
            )
            logger.info("  Question: %s", question_text)

            try:
                logger.info("  Generating TTS audio...")
                audio_data = await generate_tts(
                    question_text, KID_VOICE_ID, client, settings,
                )
                audio_hash = hashlib.md5(audio_data).hexdigest()[:12]

                with tempfile.NamedTemporaryFile(
                    suffix=".mp3",
                    delete=False,
                    prefix=f"kid_tts_bttf3_{safe_name}_",
                ) as f:
                    f.write(audio_data)
                    audio_local = f.name
                logger.info(
                    "  TTS audio: %d bytes -> %s",
                    len(audio_data), audio_local,
                )

                audio_gcs_path = (
                    f"vod-interactions/kid-avatar-audio/"
                    f"bttf3_kid_{safe_name}_{audio_hash}.mp3"
                )
                audio_url = upload_to_gcs(audio_local, audio_gcs_path)
                logger.info("  Audio uploaded: %s", audio_url)

                logger.info("  Generating Aurora lip-sync...")
                aurora_video_url = await generate_aurora_lipsync(
                    KID_AVATAR_IMAGE, audio_url, client, settings,
                )

                logger.info("  Downloading Aurora video...")
                video_resp = await client.get(aurora_video_url, timeout=120)
                video_resp.raise_for_status()
                video_hash = hashlib.md5(video_resp.content).hexdigest()[:12]

                with tempfile.NamedTemporaryFile(
                    suffix=".mp4",
                    delete=False,
                    prefix=f"kid_aurora_bttf3_{safe_name}_",
                ) as f:
                    f.write(video_resp.content)
                    video_local = f.name

                video_gcs_path = (
                    f"vod-interactions/kid-avatar-lipsync/"
                    f"bttf3_kid_{safe_name}_{video_hash}.mp4"
                )
                video_gcs_url = upload_to_gcs(video_local, video_gcs_path)
                logger.info("  Video uploaded: %s", video_gcs_url)

                moment["lipsync_video_url"] = video_gcs_url
                logger.info(
                    "  Moment %d updated with lipsync_video_url", idx,
                )

            except Exception as e:
                logger.error(
                    "Failed for moment %d (%s): %s", idx, char_name, e,
                )

        await db.content.update_one(
            {"_id": content["_id"]},
            {"$set": {"interactive_moments": moments}},
        )
        logger.info("MongoDB saved successfully")

    mongo.close()
    logger.info("Done generating kid avatar lipsync for BTTF3")


if __name__ == "__main__":
    asyncio.run(main())
