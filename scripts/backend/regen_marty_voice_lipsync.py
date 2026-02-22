#!/usr/bin/env python3
"""
Regenerate all Marty McFly lipsync across BTTF 1, 2, and 3.

1. Creates new ElevenLabs voice clone from provided audio samples
2. For moments without character_response_text: generates AI dialogue
3. Generates TTS with the new voice for all Marty moments
4. Uploads audio to GCS via gcloud CLI
5. Runs Aurora lip-sync (direct fal.ai HTTP) for each
6. Downloads and uploads lipsync video to GCS
7. Updates MongoDB with new audio/video URLs

Usage:
    cd backend && poetry run python ../scripts/backend/regen_marty_voice_lipsync.py
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

VOICE_SAMPLES = [
    Path.home() / "Downloads" / "Marty1.mp3",
    Path.home() / "Downloads" / "Marty2.mp3",
]

BTTF_MOVIES = [
    ("tt0088763", "bttf1", "Back to the Future (1985)"),
    ("tt0096874", "bttf2", "Back to the Future Part II (1989)"),
    ("tt0099088", "bttf3", "Back to the Future Part III (1990)"),
]

MARTY_FACE_URL = (
    "https://storage.googleapis.com/bayit-plus-media-new/"
    "vod-interactions/character-faces/marty_mcfly.jpg"
)

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


async def create_voice_clone(settings) -> str:
    """Create a new ElevenLabs voice from audio samples."""
    for sample in VOICE_SAMPLES:
        if not sample.exists():
            raise FileNotFoundError(f"Voice sample not found: {sample}")

    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
        files = [
            ("files", (s.name, s.read_bytes(), "audio/mpeg"))
            for s in VOICE_SAMPLES
        ]
        data = {
            "name": "Marty McFly",
            "description": "Marty McFly voice clone - energetic teenage character",
        }
        resp = await client.post(
            "https://api.elevenlabs.io/v1/voices/add",
            headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
            data=data,
            files=files,
        )
        resp.raise_for_status()
        result = resp.json()
        voice_id = result["voice_id"]
        logger.info("Created Marty voice clone: voice_id=%s", voice_id)
        return voice_id


async def generate_tts_audio(
    text: str, voice_id: str, gcs_prefix: str, settings,
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
    with tempfile.NamedTemporaryFile(
        suffix=".mp3", delete=False, prefix=f"marty_tts_{text_hash}_",
    ) as f:
        f.write(resp.content)
        audio_local = f.name

    gcs_path = (
        f"vod-interactions/character-audio/"
        f"{gcs_prefix}_marty_mcfly_{text_hash}.mp3"
    )
    url = upload_to_gcs(audio_local, gcs_path)
    logger.info("TTS uploaded: %s", url)
    return url


async def run_aurora_lipsync(
    image_url: str, audio_url: str, gcs_prefix: str, moment_idx: int, settings,
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

    logger.info("  Calling Aurora sync API (may take 2-5 min)...")
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

        # Download Aurora video
        logger.info("  Downloading Aurora video...")
        video_resp = await client.get(video_url, timeout=120)
        video_resp.raise_for_status()

    video_hash = hashlib.md5(video_resp.content).hexdigest()[:12]
    with tempfile.NamedTemporaryFile(
        suffix=".mp4", delete=False, prefix=f"marty_aurora_{gcs_prefix}_",
    ) as f:
        f.write(video_resp.content)
        video_local = f.name

    video_gcs_path = (
        f"vod-interactions/aurora-lipsync/"
        f"{gcs_prefix}_marty_moment_{moment_idx}_{video_hash}.mp4"
    )
    gcs_url = upload_to_gcs(video_local, video_gcs_path)
    logger.info("  Video uploaded: %s", gcs_url)
    return gcs_url


async def main():
    settings = get_settings()

    # Step 1: Create voice clone
    logger.info("=== Step 1: Creating Marty McFly voice clone ===")
    logger.info("Samples: %s", [str(s) for s in VOICE_SAMPLES])
    new_voice_id = await create_voice_clone(settings)
    logger.info(
        "New Marty voice ID: %s (update in characters collection)",
        new_voice_id,
    )

    # Step 2: Process all Marty moments across 3 movies
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    total_generated = 0

    for imdb_id, prefix, movie_context in BTTF_MOVIES:
        content = await db.content.find_one({"imdb_id": imdb_id})
        if not content:
            logger.warning("%s not found (imdb_id=%s)", prefix, imdb_id)
            continue

        moments = content.get("interactive_moments", [])
        logger.info(
            "=== Processing %s: %d total moments ===", prefix, len(moments),
        )

        movie_updated = False

        for idx, moment in enumerate(moments):
            if moment.get("character_name") != "Marty McFly":
                continue

            ts = moment["timestamp"]
            logger.info(
                "--- %s moment %d: Marty at %.0fs ---", prefix, idx, ts,
            )

            try:
                # Generate AI dialogue if missing
                if not moment.get("character_response_text"):
                    logger.info("  Generating AI dialogue...")
                    ai_response = await character_ai_service.generate_response(
                        character_name="Marty McFly",
                        scene_context=moment.get("scene_context", ""),
                        user_message=moment.get("interaction_prompt", ""),
                        conversation_history=[],
                        movie_context=movie_context,
                    )
                    moment["character_response_text"] = ai_response.text
                    logger.info(
                        "  AI dialogue (%d chars): %s...",
                        len(ai_response.text),
                        ai_response.text[:100],
                    )
                else:
                    logger.info(
                        "  Using existing dialogue: %s...",
                        moment["character_response_text"][:80],
                    )

                # Generate TTS with new voice
                logger.info(
                    "  Generating TTS with new voice %s...", new_voice_id,
                )
                audio_url = await generate_tts_audio(
                    moment["character_response_text"],
                    new_voice_id,
                    prefix,
                    settings,
                )
                moment["character_response_audio_url"] = audio_url
                moment["voice_id"] = new_voice_id

                # Ensure face URL is set
                if not moment.get("character_frame_url"):
                    moment["character_frame_url"] = MARTY_FACE_URL
                    logger.info(
                        "  Set character_frame_url to %s", MARTY_FACE_URL,
                    )

                # Run Aurora lip-sync
                video_url = await run_aurora_lipsync(
                    moment["character_frame_url"],
                    audio_url,
                    prefix,
                    idx,
                    settings,
                )
                moment["character_response_video_url"] = video_url

                movie_updated = True
                total_generated += 1

                logger.info(
                    "  %s moment %d complete: video=%s",
                    prefix, idx, video_url[:80],
                )

            except Exception as e:
                logger.error(
                    "  Failed for %s moment %d: %s", prefix, idx, e,
                )

        if movie_updated:
            result = await db.content.update_one(
                {"_id": content["_id"]},
                {"$set": {"interactive_moments": moments}},
            )
            logger.info(
                "%s: MongoDB updated (modified=%d)",
                prefix, result.modified_count,
            )

    logger.info(
        "=== DONE: Generated %d Marty lipsync videos ===", total_generated,
    )
    logger.info(
        "New voice ID: %s -- update in characters collection",
        new_voice_id,
    )

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
