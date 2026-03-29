"""
Generate BTTF1 demo assets for the private B2B demo page.

Produces:
- 15 lip-sync character response videos (fal.ai Aurora)
- 15 audio-only character response MP3s
- bttf-demo-manifest.json

Usage:
    cd backend
    poetry run python -m app.scripts.generate_bttf_demo_assets [--dry-run]
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
from app.services.vod_interaction.character_animator import (
    CharacterAnimatorService,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

BTTF1_IMDB_ID = "tt0088763"
GCS_DEMO_PREFIX = "gs://bayit-plus-media-new/demo"
CDN_BASE = "https://storage.googleapis.com/bayit-plus-media-new/demo"
FILM_URL = f"{CDN_BASE}/bttf-demo.mp4"

MOMENTS = [
    ("Doc Brown",
     "Twin Pines Mall parking lot, 1:15 AM. Doc reveals the DeLorean time machine. Excited, theatrical.",
     ["What is this machine?", "Is time travel dangerous?", "Why a DeLorean?"]),
    ("Doc Brown",
     "Doc explains the flux capacitor and 88 mph requirement. Demonstrating time circuits on dashboard.",
     ["How does the flux capacitor work?", "What happens at 88 miles per hour?", "Where did you get the plutonium?"]),
    ("Marty McFly",
     "1955. Marty sees the young versions of his parents for the first time. Confused and scared.",
     ["What's it like seeing your parents young?", "Are you scared of changing the future?", "Do you miss 1985?"]),
    ("Doc Brown",
     "1955 Doc Brown plans to harness lightning at the clock tower to send Marty home. Frantic intensity.",
     ["Can you really harness lightning?", "What if the plan fails?", "Do you believe in destiny?"]),
    ("Marty McFly",
     "DeLorean at the starting line, about to drive toward the clock tower lightning strike. Everything depends on timing.",
     ["Are you ready for this?", "What will you do first when you get home?", "Will you remember any of this?"]),
]

DEMO_TIMESTAMPS = [15.0, 45.0, 75.0, 105.0, 135.0]


async def run(dry_run: bool = False) -> None:
    uri = (
        getattr(settings, "MONGODB_URI", None)
        or getattr(settings, "MONGODB_URL", None)
    )
    client = AsyncIOMotorClient(uri)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(
        database=db,
        document_models=[Content, SubtitleTrackDoc],
        skip_indexes=True,
    )

    content = await Content.find_one({"imdb_id": BTTF1_IMDB_ID})
    if not content:
        logger.error(
            "BTTF1 Content not found (imdb_id=%s). "
            "Run content ingestion first.",
            BTTF1_IMDB_ID,
        )
        return

    content_id = str(content.id)
    logger.info("Found BTTF1: content_id=%s", content_id)

    char_map = {
        c.name: c for c in (content.interactive_characters or [])
    }
    if not char_map:
        logger.error(
            "No interactive_characters on BTTF1. "
            "Run character extraction first."
        )
        return

    logger.info(
        "Characters: %s",
        ", ".join(char_map.keys()),
    )

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
                    "response_text": f"[DRY RUN] {question}",
                    "video_url": f"{CDN_BASE}/bttf_m{i}_q{j}.mp4",
                    "audio_url": f"{CDN_BASE}/bttf_m{i}_q{j}.mp3",
                    "duration": 4.0,
                })
                continue

            resp = await ai_service.generate_response(
                character_name=char_name,
                scene_context=scene_context,
                user_message=question,
                conversation_history=[],
                character_description=char.description or "",
                movie_context=char.movie_context or "",
            )
            response_text = (
                resp.text if hasattr(resp, "text") else str(resp)
            )
            logger.info("    Response: %s...", response_text[:80])

            animated: AnimatedResponse = (
                await animator.animate_character_response(
                    character_name=char_name,
                    dialogue_text=response_text,
                    character_frame_url=char.frame_url or "",
                    voice_id=char.voice_id or "",
                )
            )

            moment_data["questions"].append({
                "text": question,
                "response_text": response_text,
                "video_url": animated.video_url or "",
                "audio_url": animated.audio_url or "",
                "duration": animated.duration or 4.0,
            })

        manifest_moments.append(moment_data)

    manifest = {
        "content_id": content_id,
        "film_title": "Back to the Future (1985)",
        "film_url": FILM_URL,
        "moments": manifest_moments,
    }

    manifest_path = "/tmp/bttf-demo-manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    logger.info("Wrote manifest to %s", manifest_path)

    if not dry_run:
        gcs_dest = f"{GCS_DEMO_PREFIX}/bttf-demo-manifest.json"
        subprocess.run(
            ["gsutil", "cp", manifest_path, gcs_dest],
            check=True,
        )
        logger.info("Uploaded manifest to %s", gcs_dest)

    total = sum(len(m["questions"]) for m in manifest_moments)
    logger.info(
        "Done: %d responses across %d moments", total, len(manifest_moments),
    )


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    asyncio.run(run(dry_run=dry_run))


if __name__ == "__main__":
    main()
