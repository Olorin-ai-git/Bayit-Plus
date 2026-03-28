"""
Generate all demo assets for the Olorin Interactive Demo Page.

Produces:
- 15 lip-sync character response videos (fal.ai Aurora)
- 15 audio-only character response MP3s
- demo-manifest.json

Usage:
    cd backend
    poetry run python -m app.scripts.generate_demo_assets [--dry-run]
"""

import asyncio
import json
import logging
import subprocess
import sys

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc
from app.models.vod_interaction import AnimatedResponse
from app.services.vod_interaction.character_ai import CharacterAIService
from app.services.vod_interaction.character_animator import CharacterAnimatorService

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

CONTENT_ID = "69c7d02add558ecad90e4e89"
GCS_DEMO_PREFIX = "gs://bayit-plus-media-new/demo"
CDN_BASE = "https://storage.googleapis.com/bayit-plus-media-new/demo"

# 5 moments: (character_name, scene_context, [3 questions])
MOMENTS = [
    (
        "Walter Burns",
        "Walter Burns sees his ex-wife Hildy Johnson walk into the newsroom. He is both surprised and scheming.",
        [
            "What are you planning, Walter?",
            "Do you still love Hildy?",
            "Why did you two divorce?",
        ],
    ),
    (
        "Walter Burns",
        "Hildy announces she is getting remarried to Bruce Baldwin. Walter is trying to talk her out of leaving journalism.",
        [
            "What do you think of Bruce?",
            "Can you let her go?",
            "Is journalism more important than love?",
        ],
    ),
    (
        "Hildy Johnson",
        "Hildy is in the press room covering the Earl Williams story. She is torn between journalism and leaving with Bruce.",
        [
            "Why can't you quit the newspaper business?",
            "Do you really love Bruce?",
            "What about this story hooked you?",
        ],
    ),
    (
        "Walter Burns",
        "The Earl Williams case is reaching its climax. Walter and Hildy are working together again, chasing the biggest story.",
        [
            "You two make a great team, right?",
            "Is this all a scheme to keep Hildy?",
            "What would you do without her?",
        ],
    ),
    (
        "Hildy Johnson",
        "Hildy has just made a crucial decision about her future. The story is breaking and she is at the center.",
        [
            "Are you staying or going?",
            "What does journalism mean to you?",
            "Was Walter right about you all along?",
        ],
    ),
]

# Timestamps in the trimmed demo clip (30s per segment, 5 segments)
# Each moment triggers at 15s into its segment
DEMO_TIMESTAMPS = [15.0, 45.0, 75.0, 105.0, 135.0]


def upload_to_gcs(source_url: str, gcs_dest: str) -> None:
    """Copy from URL to GCS. Non-blocking — logs and skips on failure."""
    try:
        result = subprocess.run(
            ["gsutil", "-q", "cp", source_url, gcs_dest],
            timeout=60,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            logger.warning("GCS copy failed: %s -> %s: %s", source_url, gcs_dest, result.stderr[:200])
    except subprocess.TimeoutExpired:
        logger.warning("GCS copy timed out: %s -> %s", source_url, gcs_dest)
    except Exception as e:
        logger.warning("GCS copy error: %s", str(e)[:200])


async def run(dry_run: bool = False) -> None:
    uri = getattr(settings, "MONGODB_URI", None) or getattr(settings, "MONGODB_URL", None)
    client = AsyncIOMotorClient(uri)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(
        database=db, document_models=[Content, SubtitleTrackDoc], skip_indexes=True
    )

    content = await Content.get(CONTENT_ID)
    if not content:
        logger.error("Content %s not found", CONTENT_ID)
        return

    char_map = {c.name: c for c in (content.interactive_characters or [])}
    ai_service = CharacterAIService()
    animator = CharacterAnimatorService()

    manifest_moments = []

    for i, (char_name, scene_context, questions) in enumerate(MOMENTS):
        char = char_map.get(char_name)
        if not char:
            logger.error("Character '%s' not found", char_name)
            continue

        logger.info("=== Moment %d: %s ===", i, char_name)

        moment_data = {
            "timestamp": DEMO_TIMESTAMPS[i],
            "character": char_name,
            "character_image": char.frame_url or "",
            "scene_context": scene_context,
            "questions": [],
        }

        for j, question in enumerate(questions):
            logger.info("  Q%d: %s", j, question)

            if dry_run:
                moment_data["questions"].append({
                    "text": question,
                    "response_text": f"[DRY RUN] Response for: {question}",
                    "video_url": f"{CDN_BASE}/moment_{i}_q{j}.mp4",
                    "audio_url": f"{CDN_BASE}/moment_{i}_q{j}.mp3",
                    "duration": 4.0,
                })
                continue

            # Generate AI response
            resp = await ai_service.generate_response(
                character_name=char_name,
                scene_context=scene_context,
                user_message=question,
                conversation_history=[],
                character_description=char.description or "",
                movie_context=char.movie_context or "",
            )
            response_text = resp.text if hasattr(resp, "text") else str(resp)
            logger.info("    Response: %s...", response_text[:80])

            # Generate lip-sync video (full animation)
            animated: AnimatedResponse = await animator.animate_character_response(
                character_name=char_name,
                dialogue_text=response_text,
                character_frame_url=char.frame_url or "",
                voice_id=char.voice_id or "",
            )

            video_url = animated.video_url or ""
            audio_url = animated.audio_url or ""
            duration = animated.duration or 4.0
            logger.info("    Video: %s", video_url[:80] if video_url else "NONE")
            logger.info("    Audio: %s", audio_url[:80] if audio_url else "NONE")
            logger.info("    Duration: %.1fs", duration)

            moment_data["questions"].append({
                "text": question,
                "response_text": response_text,
                "video_url": video_url,
                "audio_url": audio_url,
                "duration": duration,
            })

        manifest_moments.append(moment_data)

    # Write manifest
    manifest = {
        "content_id": CONTENT_ID,
        "film_title": "His Girl Friday (1940)",
        "film_url": "https://storage.googleapis.com/bayit-plus-media-new/movies/his-girl-friday-1940.mp4",
        "moments": manifest_moments,
    }

    manifest_path = "/tmp/demo-manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    logger.info("Wrote manifest to %s", manifest_path)

    if not dry_run:
        gcs_manifest = f"{GCS_DEMO_PREFIX}/demo-manifest.json"
        subprocess.run(["gsutil", "cp", manifest_path, gcs_manifest], check=True)
        logger.info("Uploaded manifest to %s", gcs_manifest)

    total = sum(len(m["questions"]) for m in manifest_moments)
    logger.info("Done: %d response videos across %d moments", total, len(manifest_moments))


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    asyncio.run(run(dry_run=dry_run))


if __name__ == "__main__":
    main()
