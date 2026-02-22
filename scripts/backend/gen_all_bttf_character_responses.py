#!/usr/bin/env python3
"""
Generate character response videos for ALL BTTF movies (1, 2, 3).

For each interactive moment in each movie, generates:
  1. Claude AI in-character dialogue text
  2. ElevenLabs TTS audio (character's cloned voice)
  3. fal.ai Aurora lip-sync video (character face image + audio)
  4. Uploads both to GCS
  5. Updates MongoDB interactive_moments[].character_response_video_url

Skips moments that already have a valid character_response_video_url.

Usage:
    cd backend && poetry run python ../scripts/backend/gen_all_bttf_character_responses.py
    cd backend && poetry run python ../scripts/backend/gen_all_bttf_character_responses.py --movie 1
    cd backend && poetry run python ../scripts/backend/gen_all_bttf_character_responses.py --movie 2
    cd backend && poetry run python ../scripts/backend/gen_all_bttf_character_responses.py --movie 3
"""

import argparse
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

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MOVIES = {
    1: {
        "imdb_id": "tt0088763",
        "label": "Back to the Future",
        "movie_context": "Back to the Future (1985)",
    },
    2: {
        "imdb_id": "tt0096874",
        "label": "Back to the Future Part II",
        "movie_context": "Back to the Future Part II (1989)",
    },
    3: {
        "imdb_id": "tt0099088",
        "label": "Back to the Future Part III",
        "movie_context": "Back to the Future Part III (1990)",
    },
}


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def upload_to_gcs(local_path: str, gcs_path: str, bucket: str) -> str:
    """Upload file to GCS using gcloud CLI."""
    full_gcs = f"gs://{bucket}/{gcs_path}"
    result = subprocess.run(
        ["gcloud", "storage", "cp", local_path, full_gcs],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"GCS upload failed: {result.stderr}")
    return f"https://storage.googleapis.com/{bucket}/{gcs_path}"


async def generate_tts(
    text: str, voice_id: str, client: httpx.AsyncClient, api_key: str,
) -> bytes:
    """Generate TTS audio via ElevenLabs."""
    resp = await client.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        headers={
            "xi-api-key": api_key,
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


async def run_aurora_lipsync(
    image_url: str,
    audio_url: str,
    client: httpx.AsyncClient,
    fal_key: str,
    resolution: str,
) -> str:
    """Generate Aurora lip-sync video via fal.ai synchronous API."""
    headers = {
        "Authorization": f"Key {fal_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "image_url": image_url,
        "audio_url": audio_url,
        "resolution": resolution,
        "guidance_scale": 1,
        "audio_guidance_scale": 2,
    }

    logger.info("    Calling Aurora sync API (may take 2-5 min)...")
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

    logger.info("    Aurora complete: %s...", video_url[:80])
    return video_url


# ---------------------------------------------------------------------------
# Per-movie processing
# ---------------------------------------------------------------------------

async def process_movie(
    movie_num: int,
    db,
    http_client: httpx.AsyncClient,
    settings,
    gcs_bucket: str,
) -> dict:
    """Generate character response videos for all moments of one BTTF movie.

    Returns dict with counts: {"processed": N, "skipped": N, "failed": N}.
    """
    movie_info = MOVIES[movie_num]
    imdb_id = movie_info["imdb_id"]
    label = movie_info["label"]
    movie_context = movie_info["movie_context"]
    tag = f"bttf{movie_num}"

    content = await db.content.find_one({"imdb_id": imdb_id})
    if not content:
        logger.error("%s not found (imdb_id=%s)", label, imdb_id)
        return {"processed": 0, "skipped": 0, "failed": 0}

    moments = content.get("interactive_moments", [])
    logger.info("%s: found %d moments", label, len(moments))

    stats = {"processed": 0, "skipped": 0, "failed": 0}

    for idx, moment in enumerate(moments):
        char_name = moment.get("character_name", "unknown")

        existing = moment.get("character_response_video_url")
        if existing and existing.startswith("http"):
            logger.info(
                "%s moment %d (%s): already has response video, skipping",
                tag, idx, char_name,
            )
            stats["skipped"] += 1
            continue

        face_url = moment.get("character_frame_url")
        if not face_url:
            logger.warning(
                "%s moment %d (%s): no character_frame_url, skipping",
                tag, idx, char_name,
            )
            stats["skipped"] += 1
            continue

        safe_name = char_name.lower().replace(" ", "_")
        logger.info(
            "%s moment %d (%s): generating character response",
            tag, idx, char_name,
        )

        try:
            # Step 1: AI dialogue
            if not moment.get("character_response_text"):
                logger.info("  Generating AI dialogue...")
                ai_response = await character_ai_service.generate_response(
                    character_name=char_name,
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

            # Step 2: TTS
            voice_id = moment.get("voice_id", settings.CHARACTER_VOICE_DEFAULT)
            logger.info("  Generating TTS audio...")
            audio_data = await generate_tts(
                moment["character_response_text"],
                voice_id,
                http_client,
                settings.ELEVENLABS_API_KEY,
            )
            audio_hash = hashlib.md5(audio_data).hexdigest()[:12]

            with tempfile.NamedTemporaryFile(
                suffix=".mp3",
                delete=False,
                prefix=f"char_tts_{tag}_{safe_name}_",
            ) as f:
                f.write(audio_data)
                audio_local = f.name
            logger.info(
                "  TTS audio: %d bytes -> %s",
                len(audio_data), audio_local,
            )

            # Step 3: Upload audio to GCS
            audio_gcs_path = (
                f"vod-interactions/character-audio/"
                f"{tag}_{safe_name}_{audio_hash}.mp3"
            )
            audio_url = upload_to_gcs(audio_local, audio_gcs_path, gcs_bucket)
            logger.info("  Audio uploaded: %s", audio_url)

            # Step 4: Aurora lip-sync
            logger.info("  Generating Aurora lip-sync...")
            aurora_video_url = await run_aurora_lipsync(
                face_url,
                audio_url,
                http_client,
                settings.FAL_KEY,
                settings.FAL_AURORA_RESOLUTION,
            )

            # Step 5: Download and upload video to GCS
            logger.info("  Downloading Aurora video...")
            video_resp = await http_client.get(aurora_video_url, timeout=120)
            video_resp.raise_for_status()
            video_hash = hashlib.md5(video_resp.content).hexdigest()[:12]

            with tempfile.NamedTemporaryFile(
                suffix=".mp4",
                delete=False,
                prefix=f"char_aurora_{tag}_{safe_name}_",
            ) as f:
                f.write(video_resp.content)
                video_local = f.name

            video_gcs_path = (
                f"vod-interactions/aurora-lipsync/"
                f"{tag}_char_{safe_name}_{video_hash}.mp4"
            )
            video_gcs_url = upload_to_gcs(
                video_local, video_gcs_path, gcs_bucket,
            )
            logger.info("  Video uploaded: %s", video_gcs_url)

            # Step 6: Update moment in-memory
            moment["character_response_audio_url"] = audio_url
            moment["character_response_video_url"] = video_gcs_url
            stats["processed"] += 1
            logger.info(
                "  %s moment %d: character_response_video_url set", tag, idx,
            )

        except Exception as e:
            logger.error(
                "Failed for %s moment %d (%s): %s",
                tag, idx, char_name, e,
            )
            stats["failed"] += 1

    # Persist all moment updates to MongoDB
    await db.content.update_one(
        {"_id": content["_id"]},
        {"$set": {"interactive_moments": moments}},
    )
    logger.info("%s: MongoDB saved (%s)", label, stats)

    return stats


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main(movie_filter: int | None = None):
    settings = get_settings()

    if not settings.ELEVENLABS_API_KEY:
        logger.error("ELEVENLABS_API_KEY not configured")
        sys.exit(1)
    if not settings.FAL_KEY:
        logger.error("FAL_KEY not configured")
        sys.exit(1)

    gcs_bucket = settings.GCS_BUCKET_NAME or "bayit-plus-media-new"
    mongo = AsyncIOMotorClient(settings.MONGODB_URI)
    db = mongo[settings.MONGODB_DB_NAME]

    movies_to_process = (
        [movie_filter] if movie_filter else sorted(MOVIES.keys())
    )

    totals = {"processed": 0, "skipped": 0, "failed": 0}

    async with httpx.AsyncClient() as client:
        for movie_num in movies_to_process:
            label = MOVIES[movie_num]["label"]
            logger.info("=" * 60)
            logger.info("Processing %s", label)
            logger.info("=" * 60)

            stats = await process_movie(
                movie_num, db, client, settings, gcs_bucket,
            )
            for k in totals:
                totals[k] += stats[k]

    mongo.close()

    logger.info("=" * 60)
    logger.info(
        "All done. Processed: %d, Skipped: %d, Failed: %d",
        totals["processed"],
        totals["skipped"],
        totals["failed"],
    )
    logger.info("=" * 60)

    if totals["failed"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate character response videos for BTTF movies",
    )
    parser.add_argument(
        "--movie",
        type=int,
        choices=[1, 2, 3],
        default=None,
        help="Process only one movie (1, 2, or 3). Default: all three.",
    )
    args = parser.parse_args()
    asyncio.run(main(movie_filter=args.movie))
