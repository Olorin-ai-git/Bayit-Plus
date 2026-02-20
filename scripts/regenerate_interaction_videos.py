#!/usr/bin/env python3
"""
Regenerate avatar interaction videos with correct per-character voices.

Replaces old Creatify stock persona + default voice videos with:
- Per-character cloned voice IDs from Content.interactive_characters
- Per-character face images (frame_url) via Aurora lip-sync (fal.ai)

Works for any content item that has interactive_characters configured.

Usage:
    cd backend && poetry run python ../scripts/regenerate_interaction_videos.py --imdb-id tt0088763
    cd backend && poetry run python ../scripts/regenerate_interaction_videos.py --imdb-id tt0088763 --dry-run
    cd backend && poetry run python ../scripts/regenerate_interaction_videos.py --imdb-id tt0088763 --moments-only
    cd backend && poetry run python ../scripts/regenerate_interaction_videos.py --imdb-id tt0088763 --sessions-only
"""

import argparse
import asyncio
import hashlib
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

import httpx
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.fal_aurora_client import fal_aurora_client
from app.core.logging_config import get_logger
from app.core.storage import storage_service

logger = get_logger(__name__)


def build_character_lookup(content: dict) -> dict:
    """Build character_name -> {voice_id, frame_url} from interactive_characters."""
    lookup = {}
    for char in content.get("interactive_characters", []):
        name = char.get("name", "")
        frame_url = char.get("frame_url", "")
        voice_id = char.get("voice_id", "")
        if name and frame_url and voice_id:
            lookup[name] = {"voice_id": voice_id, "frame_url": frame_url}
    return lookup


async def generate_tts_audio(
    text: str, voice_id: str, character_name: str, api_key: str,
) -> str:
    """Generate TTS audio via ElevenLabs, upload to storage, return URL."""
    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
        response = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            json={
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
            },
            headers={
                "xi-api-key": api_key,
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()

    text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
    safe_name = character_name.replace(" ", "_").lower()
    gcs_path = f"vod-interactions/character-audio/{safe_name}_{text_hash}.mp3"

    audio_url = await storage_service.upload_bytes(
        response.content, gcs_path, content_type="audio/mpeg",
    )
    logger.info("TTS audio uploaded", extra={"audio_url": audio_url})
    return audio_url


async def ensure_public_url(url: str) -> str:
    """Ensure a URL is publicly accessible for external APIs (fal.ai)."""
    if url.startswith("http"):
        return url

    settings = get_settings()
    local_path = Path(settings.UPLOAD_DIR) / url.removeprefix("/uploads/")
    if not local_path.exists():
        raise FileNotFoundError(f"Local file not found: {local_path}")

    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
        files = {"file": (local_path.name, local_path.read_bytes())}
        resp = await client.post(settings.TEMP_FILE_HOST_URL, files=files)
        resp.raise_for_status()
        page_url = resp.json()["data"]["url"]
        parts = page_url.split("tmpfiles.org/", 1)
        return f"https://tmpfiles.org/dl/{parts[1]}"


async def regenerate_aurora_video(
    image_url: str, audio_url: str,
) -> str:
    """Generate Aurora lip-sync video from image + audio."""
    public_image = await ensure_public_url(image_url)
    public_audio = await ensure_public_url(audio_url)
    return await fal_aurora_client.create_lipsync(
        image_url=public_image, audio_url=public_audio,
    )


async def regenerate_moments(
    db, content: dict, char_lookup: dict, settings, dry_run: bool,
) -> int:
    """Regenerate interactive moment response videos. Returns count."""
    moments = content.get("interactive_moments", [])
    regenerated = 0

    for idx, moment in enumerate(moments):
        char_name = moment.get("character_name", "")
        response_text = moment.get("character_response_text", "")

        if not response_text:
            logger.info(
                "Moment %d (%s): no response text, skipping", idx, char_name,
            )
            continue

        char_data = char_lookup.get(char_name)
        if not char_data:
            voice_id = moment.get("voice_id", "")
            frame_url = moment.get("character_frame_url", "")
            if not voice_id or not frame_url:
                logger.info(
                    "Moment %d (%s): no character data found, skipping",
                    idx, char_name,
                )
                continue
            char_data = {"voice_id": voice_id, "frame_url": frame_url}

        if dry_run:
            logger.info(
                "[DRY RUN] Would regenerate moment %d: %s "
                "(voice=%s, frame=%s)",
                idx, char_name,
                char_data["voice_id"][:12],
                char_data["frame_url"][:60],
            )
            regenerated += 1
            continue

        logger.info(
            "=== Regenerating moment %d: %s ===", idx, char_name,
        )

        audio_url = await generate_tts_audio(
            response_text,
            char_data["voice_id"],
            char_name,
            settings.ELEVENLABS_API_KEY,
        )
        video_url = await regenerate_aurora_video(
            char_data["frame_url"], audio_url,
        )

        moment["character_response_audio_url"] = audio_url
        moment["character_response_video_url"] = video_url
        moment["voice_id"] = char_data["voice_id"]
        regenerated += 1

        logger.info(
            "Moment %d (%s) regenerated: video=%s",
            idx, char_name, video_url[:80],
        )

    if regenerated > 0 and not dry_run:
        await db.content.update_one(
            {"_id": content["_id"]},
            {"$set": {"interactive_moments": moments}},
        )
        logger.info("Updated %d moments in MongoDB", regenerated)

    return regenerated


async def regenerate_sessions(
    db, content_id: str, char_lookup: dict, settings, dry_run: bool,
) -> int:
    """Regenerate live session dialogue exchange videos. Returns count."""
    cursor = db.vod_interaction_sessions.find({"content_id": content_id})
    regenerated = 0

    async for session in cursor:
        exchanges = session.get("dialogue_exchanges", [])
        session_char = session.get("character_name", "")
        session_updated = False

        for ex_idx, exchange in enumerate(exchanges):
            if exchange.get("speaker") != "character":
                continue
            if not exchange.get("animated_video_url"):
                continue

            ex_char = exchange.get("character_name") or session_char
            char_data = char_lookup.get(ex_char)
            if not char_data:
                fallback_voice = session.get("character_voice_id", "")
                fallback_frame = session.get("character_frame_url", "")
                if not fallback_voice or not fallback_frame:
                    continue
                char_data = {
                    "voice_id": fallback_voice,
                    "frame_url": fallback_frame,
                }

            message_text = exchange.get("message_text", "")
            if not message_text:
                continue

            if dry_run:
                logger.info(
                    "[DRY RUN] Would regenerate session %s exchange %d: "
                    "%s (voice=%s)",
                    str(session["_id"])[:8], ex_idx, ex_char,
                    char_data["voice_id"][:12],
                )
                regenerated += 1
                continue

            logger.info(
                "Regenerating session %s exchange %d: %s",
                str(session["_id"])[:8], ex_idx, ex_char,
            )

            audio_url = await generate_tts_audio(
                message_text,
                char_data["voice_id"],
                ex_char,
                settings.ELEVENLABS_API_KEY,
            )
            video_url = await regenerate_aurora_video(
                char_data["frame_url"], audio_url,
            )

            exchange["audio_url"] = audio_url
            exchange["animated_video_url"] = video_url
            session_updated = True
            regenerated += 1

        if session_updated and not dry_run:
            await db.vod_interaction_sessions.update_one(
                {"_id": session["_id"]},
                {"$set": {"dialogue_exchanges": exchanges}},
            )

    if regenerated > 0:
        logger.info("Regenerated %d session exchanges", regenerated)

    return regenerated


async def main():
    parser = argparse.ArgumentParser(
        description="Regenerate avatar interaction videos with correct voices",
    )
    parser.add_argument(
        "--imdb-id", required=True,
        help="IMDB ID of the content to regenerate (e.g. tt0088763)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Scan and report without calling APIs",
    )
    parser.add_argument(
        "--moments-only", action="store_true",
        help="Only regenerate interactive moments",
    )
    parser.add_argument(
        "--sessions-only", action="store_true",
        help="Only regenerate live session exchanges",
    )
    args = parser.parse_args()

    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    content = await db.content.find_one({"imdb_id": args.imdb_id})
    if not content:
        logger.error("Content not found (imdb_id=%s)", args.imdb_id)
        client.close()
        sys.exit(1)

    title = content.get("title", args.imdb_id)
    logger.info("Found content: %s (imdb_id=%s)", title, args.imdb_id)

    char_lookup = build_character_lookup(content)
    logger.info(
        "Character lookup for %s: %s",
        title,
        ", ".join(
            f"{k} (voice={v['voice_id'][:12]})"
            for k, v in char_lookup.items()
        ),
    )

    if not char_lookup:
        logger.error(
            "No interactive_characters with frame_url found for %s", title,
        )
        client.close()
        sys.exit(1)

    moment_count = 0
    session_count = 0
    content_id = str(content["_id"])

    if not args.sessions_only:
        moment_count = await regenerate_moments(
            db, content, char_lookup, settings, args.dry_run,
        )

    if not args.moments_only:
        session_count = await regenerate_sessions(
            db, content_id, char_lookup, settings, args.dry_run,
        )

    prefix = "[DRY RUN] " if args.dry_run else ""
    logger.info(
        "%sSummary for %s: %d moments, %d session exchanges regenerated",
        prefix, title, moment_count, session_count,
    )

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
