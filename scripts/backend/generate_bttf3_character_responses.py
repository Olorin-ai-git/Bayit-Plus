#!/usr/bin/env python3
"""
Generate character response videos for BTTF Part III interactive moments.

For each moment: AI dialogue -> ElevenLabs TTS -> GCS upload (gcloud) ->
Aurora lip-sync (direct fal.ai HTTP) -> GCS upload -> updates MongoDB.

Usage:
    cd backend && poetry run python ../scripts/backend/generate_bttf3_character_responses.py
"""

import asyncio
import hashlib
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

import httpx
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.logging_config import get_logger
from app.services.vod_interaction.character_ai import character_ai_service

logger = get_logger(__name__)

BTTF3_IMDB_ID = "tt0099088"
GCS_BUCKET = "bayit-plus-media-new"


def upload_to_gcs(local_path: str, gcs_path: str) -> str:
    """Upload file to GCS using gcloud CLI, return public URL."""
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


async def generate_tts_audio(
    text: str, voice_id: str, character_name: str, settings,
) -> str:
    """Generate TTS audio via ElevenLabs, upload to GCS via gcloud."""
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
    safe_name = character_name.replace(" ", "_").lower()

    with tempfile.NamedTemporaryFile(
        suffix=".mp3", delete=False, prefix=f"tts_bttf3_{safe_name}_",
    ) as f:
        f.write(resp.content)
        audio_local = f.name

    gcs_path = (
        f"vod-interactions/character-audio/bttf3_{safe_name}_{text_hash}.mp3"
    )
    url = upload_to_gcs(audio_local, gcs_path)
    logger.info("TTS uploaded for %s: %s", character_name, url)
    return url


async def run_aurora_lipsync(
    image_url: str, audio_url: str, label: str, moment_idx: int, settings,
) -> str:
    """Run Aurora lip-sync via direct fal.ai HTTP, upload result to GCS."""
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

    logger.info("  Starting Aurora for %s (may take 2-5 min)...", label)
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(600.0, connect=15.0), follow_redirects=True,
    ) as client:
        resp = await client.post(
            "https://fal.run/fal-ai/creatify/aurora",
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()
        result_data = resp.json()
        video_url = result_data.get("video", {}).get("url")
        if not video_url:
            raise RuntimeError(f"No video URL in Aurora result: {result_data}")

        logger.info("  Aurora complete: %s...", video_url[:80])

        logger.info("  Downloading Aurora video...")
        video_resp = await client.get(video_url, timeout=120)
        video_resp.raise_for_status()

    video_hash = hashlib.md5(video_resp.content).hexdigest()[:12]
    with tempfile.NamedTemporaryFile(
        suffix=".mp4", delete=False, prefix=f"aurora_bttf3_{moment_idx}_",
    ) as f:
        f.write(video_resp.content)
        video_local = f.name

    video_gcs_path = (
        f"vod-interactions/aurora-lipsync/"
        f"bttf3_moment_{moment_idx}_{video_hash}.mp4"
    )
    gcs_url = upload_to_gcs(video_local, video_gcs_path)
    logger.info("  Video uploaded: %s", gcs_url)
    return gcs_url


async def main():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    content = await db.content.find_one({"imdb_id": BTTF3_IMDB_ID})
    if not content:
        logger.error("BTTF Part III not found (imdb_id=%s)", BTTF3_IMDB_ID)
        client.close()
        sys.exit(1)

    moments = content.get("interactive_moments", [])
    logger.info("Found %d interactive moments for BTTF3", len(moments))

    generated_count = 0

    for idx, moment in enumerate(moments):
        char_name = moment["character_name"]
        ts = moment["timestamp"]

        if moment.get("character_response_video_url"):
            logger.info(
                "Moment %d (%s): already has response video, skipping",
                idx, char_name,
            )
            continue
        if not moment.get("character_frame_url"):
            logger.info(
                "Moment %d (%s): no character_frame_url, skipping",
                idx, char_name,
            )
            continue

        logger.info(
            "=== Generating response for moment %d: %s at %.0fs ===",
            idx, char_name, ts,
        )

        try:
            if not moment.get("character_response_text"):
                ai_response = await character_ai_service.generate_response(
                    character_name=char_name,
                    scene_context=moment.get("scene_context", ""),
                    user_message=moment.get("interaction_prompt", ""),
                    conversation_history=[],
                    movie_context="Back to the Future Part III (1990)",
                )
                moment["character_response_text"] = ai_response.text
                logger.info(
                    "AI dialogue generated (%d chars): %s...",
                    len(ai_response.text),
                    ai_response.text[:100],
                )
            else:
                logger.info(
                    "Using existing dialogue: %s...",
                    moment["character_response_text"][:80],
                )

            voice_id = moment.get("voice_id", settings.CHARACTER_VOICE_DEFAULT)
            audio_url = await generate_tts_audio(
                moment["character_response_text"],
                voice_id, char_name, settings,
            )

            label = f"bttf3_moment_{idx}_{char_name}"
            video_url = await run_aurora_lipsync(
                moment["character_frame_url"], audio_url,
                label, idx, settings,
            )

            moment["character_response_audio_url"] = audio_url
            moment["character_response_video_url"] = video_url
            generated_count += 1

            logger.info(
                "Moment %d (%s) complete: video=%s",
                idx, char_name, video_url[:80],
            )

        except Exception as e:
            logger.error(
                "Failed for moment %d (%s at %.0fs): %s",
                idx, char_name, ts, e,
            )

    if generated_count > 0:
        result = await db.content.update_one(
            {"_id": content["_id"]},
            {"$set": {"interactive_moments": moments}},
        )
        logger.info(
            "Updated %d moments in MongoDB (modified=%d)",
            generated_count,
            result.modified_count,
        )
    else:
        logger.info("No moments needed response generation")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
