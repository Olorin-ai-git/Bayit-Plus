#!/usr/bin/env python3
"""
Generate character response videos for Back to the Future interactive moments.

Generates AI dialogue -> ElevenLabs TTS -> uploads audio to GCS via gsutil ->
Creatify lip-sync animation -> uploads video to GCS -> updates MongoDB.

Usage:
    cd backend && poetry run python scripts/generate_bttf_character_responses.py
"""

import asyncio
import hashlib
import os
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

BTTF_IMDB_ID = "tt0088763"
GCS_BUCKET = "bayit-plus-media-new"

CREATIFY_PERSONA_MALE = "0251876f-0da4-4c61-8320-8955d8be1f98"
CREATIFY_PERSONA_FEMALE = "009f502d-3649-4624-a438-80b126f1fa30"
FEMALE_CHARACTERS = {"Jennifer Parker", "Lorraine Baines"}


def upload_to_gcs(local_path: str, gcs_path: str) -> str:
    """Upload file to GCS using gsutil, return public URL."""
    gcs_uri = f"gs://{GCS_BUCKET}/{gcs_path}"
    cmd = ["gsutil", "cp", local_path, gcs_uri]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(f"gsutil upload failed: {result.stderr[:200]}")
    return f"https://storage.googleapis.com/{GCS_BUCKET}/{gcs_path}"


async def generate_tts_audio(
    text: str, voice_id: str, character_name: str, settings
) -> str:
    """Generate TTS audio via ElevenLabs, upload to GCS, return public URL."""
    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
        headers = {
            "xi-api-key": settings.ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
        }
        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
        }
        response = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        audio_bytes = response.content

    text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
    safe_name = character_name.replace(" ", "_").lower()
    with tempfile.NamedTemporaryFile(
        suffix=".mp3", delete=False, prefix=f"tts_{text_hash}_"
    ) as tmp:
        tmp.write(audio_bytes)
        audio_path = tmp.name

    gcs_path = f"vod-interactions/character-audio/{safe_name}_{text_hash}.mp3"
    audio_url = upload_to_gcs(audio_path, gcs_path)
    os.unlink(audio_path)

    logger.info("TTS audio uploaded: %s", audio_url)
    return audio_url


async def create_creatify_lipsync(
    audio_url: str, character_name: str, settings
) -> str:
    """Create lip-sync video via Creatify, poll for completion, upload to GCS."""
    persona_id = (
        CREATIFY_PERSONA_FEMALE
        if character_name in FEMALE_CHARACTERS
        else CREATIFY_PERSONA_MALE
    )

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(120.0, connect=10.0), follow_redirects=True
    ) as client:
        headers = {
            "X-API-ID": settings.CREATIFY_API_ID,
            "X-API-KEY": settings.CREATIFY_API_KEY,
            "Content-Type": "application/json",
        }

        payload = {
            "audio": audio_url,
            "creator": persona_id,
            "aspect_ratio": "1x1",
            "model_version": "aurora_v1",
            "green_screen": True,
            "no_caption": True,
            "no_music": True,
        }

        logger.info(
            "Creating Creatify lipsync job: persona=%s, audio=%s",
            persona_id,
            audio_url[:80],
        )

        resp = await client.post(
            f"{settings.CREATIFY_API_URL}/api/lipsyncs/",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        job = resp.json()
        lipsync_id = job["id"]
        logger.info("Creatify job created: %s", lipsync_id)

        video_url = await _poll_creatify(lipsync_id, client, headers, settings)

        resp = await client.get(video_url)
        resp.raise_for_status()
        video_bytes = resp.content

    with tempfile.NamedTemporaryFile(
        suffix=".mp4", delete=False, prefix=f"creatify_{lipsync_id[:8]}_"
    ) as tmp:
        tmp.write(video_bytes)
        video_path = tmp.name

    gcs_path = f"vod-interactions/character-animations/{lipsync_id}.mp4"
    gcs_url = upload_to_gcs(video_path, gcs_path)
    os.unlink(video_path)

    logger.info("Creatify video uploaded: %s", gcs_url)
    return gcs_url


async def _poll_creatify(
    lipsync_id: str, client: httpx.AsyncClient, headers: dict, settings
) -> str:
    """Poll Creatify for job completion, return video URL."""
    max_attempts = 120
    poll_interval = 5

    for attempt in range(max_attempts):
        resp = await client.get(
            f"{settings.CREATIFY_API_URL}/api/lipsyncs/{lipsync_id}",
            headers=headers,
        )
        resp.raise_for_status()
        result = resp.json()
        status = result.get("status")

        if status == "done":
            video_url = result.get("output")
            logger.info(
                "Creatify job %s completed after %ds",
                lipsync_id,
                attempt * poll_interval,
            )
            return video_url
        elif status == "failed":
            reason = result.get("failed_reason", "Unknown")
            raise RuntimeError(f"Creatify job {lipsync_id} failed: {reason}")

        if attempt % 6 == 0:
            logger.info(
                "Creatify job %s: status=%s, progress=%s (attempt %d/%d)",
                lipsync_id,
                status,
                result.get("progress", "?"),
                attempt,
                max_attempts,
            )

        await asyncio.sleep(poll_interval)

    raise TimeoutError(
        f"Creatify job {lipsync_id} timed out after {max_attempts * poll_interval}s"
    )


async def main():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    content = await db.content.find_one({"imdb_id": BTTF_IMDB_ID})
    if not content:
        logger.error("BTTF not found (imdb_id=%s)", BTTF_IMDB_ID)
        client.close()
        sys.exit(1)

    moments = content.get("interactive_moments", [])
    logger.info("Found %d interactive moments", len(moments))

    generated_count = 0

    for idx, moment in enumerate(moments):
        ts = moment["timestamp"]
        char_name = moment["character_name"]

        if not moment.get("lipsync_video_url"):
            logger.info("Moment %d (%s): no lipsync_video_url, skipping", idx, char_name)
            continue
        if moment.get("character_response_video_url"):
            logger.info("Moment %d (%s): already has response video, skipping", idx, char_name)
            continue
        if not moment.get("character_frame_url"):
            logger.info("Moment %d (%s): no character_frame_url, skipping", idx, char_name)
            continue

        logger.info(
            "=== Generating response for moment %d: %s at %.0fs ===",
            idx, char_name, ts,
        )

        try:
            ai_response = await character_ai_service.generate_response(
                character_name=char_name,
                scene_context=moment.get("scene_context", ""),
                user_message=moment.get("interaction_prompt", ""),
                conversation_history=[],
            )
            logger.info(
                "AI dialogue generated (%d chars): %s...",
                len(ai_response.text),
                ai_response.text[:100],
            )

            voice_id = moment.get("voice_id", settings.CHARACTER_VOICE_DEFAULT)
            audio_url = await generate_tts_audio(
                ai_response.text, voice_id, char_name, settings
            )

            video_url = await create_creatify_lipsync(
                audio_url, char_name, settings
            )

            moment["character_response_text"] = ai_response.text
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
