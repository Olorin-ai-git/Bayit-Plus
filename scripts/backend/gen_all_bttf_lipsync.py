#!/usr/bin/env python3
"""
Generate kid avatar lipsync videos for ALL BTTF movies (1, 2, 3).

For each interactive moment in each movie, generates:
  1. ElevenLabs TTS audio (kid's cloned voice asking a question)
  2. fal.ai Aurora lip-sync video (kid avatar image + audio)
  3. Uploads both to GCS
  4. Updates MongoDB interactive_moments[].lipsync_video_url

Skips moments that already have a valid lipsync_video_url.

Usage:
    cd backend && poetry run python ../scripts/backend/gen_all_bttf_lipsync.py
    cd backend && poetry run python ../scripts/backend/gen_all_bttf_lipsync.py --movie 1
    cd backend && poetry run python ../scripts/backend/gen_all_bttf_lipsync.py --movie 2
    cd backend && poetry run python ../scripts/backend/gen_all_bttf_lipsync.py --movie 3
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

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MOVIES = {
    1: {"imdb_id": "tt0088763", "label": "Back to the Future"},
    2: {"imdb_id": "tt0096874", "label": "Back to the Future Part II"},
    3: {"imdb_id": "tt0099088", "label": "Back to the Future Part III"},
}

KID_AVATAR_IMAGE = (
    "https://cdn.creatify.ai/creator/"
    "4045d05f-2dc5-4661-8121-733ecd3e8aec/st.png"
)
KID_VOICE_ID = "jQkT4jjvjt0UEM7lOGtL"

# Kid questions per movie, keyed by moment index.
# Each question is what the child avatar says to the character.
KID_QUESTIONS = {
    1: {
        0: (
            "Jennifer, Marty looks so sad about the audition."
            " How do you help someone who wants to give up?"
        ),
        1: (
            "Doc, you just sent Einstein through time!"
            " How does the flux capacitor actually work?"
        ),
        2: (
            "Lorraine, everything looks so different in the 1950s!"
            " What's your favorite thing about growing up here?"
        ),
        3: (
            "Doc, you just found out time travel really works!"
            " What's the first thing you want to know about the future?"
        ),
        4: (
            "George, don't listen to Biff!"
            " Your science fiction stories sound really cool."
        ),
        5: (
            "Biff, you just crashed into a manure truck!"
            " Maybe you should stop picking on people, huh?"
        ),
        6: (
            "Doc, you're going to use lightning to send Marty home?"
            " What if something goes wrong?"
        ),
        7: (
            "George, you look so nervous!"
            " Just be yourself and ask Lorraine to dance."
        ),
        8: (
            "Marty, that guitar solo was incredible!"
            " Do you play in a band back home?"
        ),
        9: (
            "Doc, Marty is going back to the future now."
            " What's the most important thing you've learned about time?"
        ),
    },
    2: {
        0: (
            "Doc, we just got to the future! What went wrong"
            " with Marty's kids that we need to fix?"
        ),
        1: (
            "Hey Marty! This cafe is so weird!"
            " What's the coolest thing you've seen in the future?"
        ),
        2: (
            "Doc, how does this hoverboard actually fly?"
            " Can it really go anywhere?"
        ),
        3: (
            "Jennifer, what was it like seeing your future self?"
            " That must have been so strange!"
        ),
        4: (
            "Hey Biff! Why did you steal the time machine?"
            " What are you planning to do with that book?"
        ),
        5: (
            "Doc, everything looks so different and scary!"
            " How did Biff mess up the whole timeline?"
        ),
        6: (
            "Biff, you cheated to get all this money!"
            " Don't you feel bad about that?"
        ),
        7: (
            "Doc, we have to go back to 1955 again?"
            " How are we going to find the almanac?"
        ),
        8: (
            "Marty, this is so tricky sneaking around the dance!"
            " How will you get the almanac from Biff?"
        ),
        9: (
            "Doc, you got sent to 1885 by lightning!"
            " Are you okay in the Wild West?"
        ),
    },
    3: {
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
    },
}


# ---------------------------------------------------------------------------
# Shared helpers (same pipeline as existing per-movie scripts)
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


async def generate_aurora_lipsync(
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
    """Generate lipsync for all moments of one BTTF movie.

    Returns dict with counts: {"processed": N, "skipped": N, "failed": N}.
    """
    movie_info = MOVIES[movie_num]
    imdb_id = movie_info["imdb_id"]
    label = movie_info["label"]
    tag = f"bttf{movie_num}"

    content = await db.content.find_one({"imdb_id": imdb_id})
    if not content:
        logger.error("%s not found (imdb_id=%s)", label, imdb_id)
        return {"processed": 0, "skipped": 0, "failed": 0}

    moments = content.get("interactive_moments", [])
    logger.info("%s: found %d moments", label, len(moments))

    questions = KID_QUESTIONS.get(movie_num, {})
    stats = {"processed": 0, "skipped": 0, "failed": 0}

    for idx, moment in enumerate(moments):
        char_name = moment.get("character_name", "unknown")

        existing = moment.get("lipsync_video_url")
        if existing and existing.startswith("http"):
            logger.info(
                "%s moment %d (%s): already has lipsync, skipping",
                tag, idx, char_name,
            )
            stats["skipped"] += 1
            continue

        question_text = questions.get(idx)
        if not question_text:
            logger.warning(
                "%s moment %d (%s): no kid question defined, skipping",
                tag, idx, char_name,
            )
            stats["skipped"] += 1
            continue

        safe_name = char_name.lower().replace(" ", "_")
        logger.info(
            "%s moment %d (%s): generating kid avatar lipsync",
            tag, idx, char_name,
        )
        logger.info("  Question: %s", question_text)

        try:
            # Step 1: TTS
            logger.info("  Generating TTS audio...")
            audio_data = await generate_tts(
                question_text,
                KID_VOICE_ID,
                http_client,
                settings.ELEVENLABS_API_KEY,
            )
            audio_hash = hashlib.md5(audio_data).hexdigest()[:12]

            with tempfile.NamedTemporaryFile(
                suffix=".mp3",
                delete=False,
                prefix=f"kid_tts_{tag}_{safe_name}_",
            ) as f:
                f.write(audio_data)
                audio_local = f.name
            logger.info(
                "  TTS audio: %d bytes -> %s",
                len(audio_data), audio_local,
            )

            # Step 2: Upload audio to GCS
            audio_gcs_path = (
                f"vod-interactions/kid-avatar-audio/"
                f"{tag}_kid_{safe_name}_{audio_hash}.mp3"
            )
            audio_url = upload_to_gcs(audio_local, audio_gcs_path, gcs_bucket)
            logger.info("  Audio uploaded: %s", audio_url)

            # Step 3: Aurora lip-sync
            logger.info("  Generating Aurora lip-sync...")
            aurora_video_url = await generate_aurora_lipsync(
                KID_AVATAR_IMAGE,
                audio_url,
                http_client,
                settings.FAL_KEY,
                settings.FAL_AURORA_RESOLUTION,
            )

            # Step 4: Download and upload video to GCS
            logger.info("  Downloading Aurora video...")
            video_resp = await http_client.get(aurora_video_url, timeout=120)
            video_resp.raise_for_status()
            video_hash = hashlib.md5(video_resp.content).hexdigest()[:12]

            with tempfile.NamedTemporaryFile(
                suffix=".mp4",
                delete=False,
                prefix=f"kid_aurora_{tag}_{safe_name}_",
            ) as f:
                f.write(video_resp.content)
                video_local = f.name

            video_gcs_path = (
                f"vod-interactions/kid-avatar-lipsync/"
                f"{tag}_kid_{safe_name}_{video_hash}.mp4"
            )
            video_gcs_url = upload_to_gcs(
                video_local, video_gcs_path, gcs_bucket,
            )
            logger.info("  Video uploaded: %s", video_gcs_url)

            # Step 5: Update moment in-memory
            moment["lipsync_video_url"] = video_gcs_url
            stats["processed"] += 1
            logger.info(
                "  %s moment %d: lipsync_video_url set", tag, idx,
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
        description="Generate kid avatar lipsync for BTTF movies",
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
