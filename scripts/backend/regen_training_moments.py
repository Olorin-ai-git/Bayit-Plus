"""
Regenerate lip-sync videos for all training manifest interactive moments.

Reads the current manifest, generates TTS + Aurora lip-sync for each
question's full response_text, and writes an updated manifest.

Usage:
    cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/backend
    poetry run python scripts/regen_training_moments.py
"""

import asyncio
import json
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings  # noqa: E402
from app.services.vod_interaction.character_animator import (  # noqa: E402
    CharacterAnimatorService,
)
from app.core.logging_config import get_logger  # noqa: E402

logger = get_logger(__name__)

MANIFEST_PATH = Path("/Users/olorin/Documents/Projects/olorin/olorin-portals/packages/portal-demo/public/training-manifest.json")
PORTRAIT_URL = "https://cdn.bayit.tv/demo/female-instructor-avatar.jpg"
CHARACTER_NAME = "Safety Instructor"


async def regenerate():
    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)

    animator = CharacterAnimatorService()
    voice_id = getattr(settings, "SPEAKER_VOICE_ARCHETYPE_FEMALE", None) or "pFZP5JQG7iQjIQuC4Bku"

    total = sum(len(m["questions"]) for m in manifest["moments"])
    done = 0

    for mi, moment in enumerate(manifest["moments"]):
        for qi, question in enumerate(moment["questions"]):
            done += 1
            label = f"[{done}/{total}] M{mi + 1}Q{qi + 1}"
            response_text = question["response_text"]
            logger.info(f"{label} Generating: {response_text[:60]}...")

            try:
                result = await animator.animate_character_response(
                    character_name=CHARACTER_NAME,
                    dialogue_text=response_text,
                    character_frame_url=PORTRAIT_URL,
                    voice_id=voice_id,
                )

                question["video_url"] = result.video_url
                question["audio_url"] = result.audio_url
                question["duration"] = round(result.duration, 1)

                logger.info(
                    f"{label} Done: {result.duration:.1f}s video={result.video_url[-20:]}"
                )
            except Exception as e:
                logger.error(f"{label} FAILED: {e}")
                continue

    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write("\n")

    logger.info(f"Manifest updated at {MANIFEST_PATH}")


if __name__ == "__main__":
    asyncio.run(regenerate())
