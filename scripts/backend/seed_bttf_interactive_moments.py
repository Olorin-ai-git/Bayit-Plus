#!/usr/bin/env python3
"""
Seed interactive moments for Back to the Future (1985).

Three scripted scenes where the child's avatar can interact
with movie characters during playback.

Usage:
    python scripts/seed_bttf_interactive_moments.py

Requires MONGODB_URI and MONGODB_DB_NAME in environment.
"""

import asyncio
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

BTTF_IMDB_ID = "tt0088763"


def build_bttf_moments(settings) -> list:
    """Build the 3 interactive moment documents for BTTF."""
    return [
        {
            "timestamp": 1630.0,
            "duration": 45.0,
            "scene_context": (
                "Twin Pines Mall parking lot, 1:15 AM. Doc Brown has just"
                " unveiled the DeLorean time machine to Marty. The flux"
                " capacitor glows inside the stainless steel body. Doc is"
                " excitedly explaining how he came up with the idea after"
                " hitting his head on the sink. Einstein the dog has just"
                " completed the first temporal displacement. Doc says:"
                " 'If my calculations are correct, when this baby hits"
                " 88 miles per hour, you're gonna see some serious...'"
            ),
            "character_name": "Doc Brown",
            "character_frame_url": None,
            "interaction_prompt": (
                "Doc Brown wants to show you his time machine!"
                " Ask him how it works."
            ),
            "voice_id": settings.CHARACTER_VOICE_DOC_BROWN,
            "dialogue_options": [
                "How does the time machine work?",
                "Can I travel to the future?",
                "What's the flux capacitor?",
            ],
        },
        {
            "timestamp": 2670.0,
            "duration": 40.0,
            "scene_context": (
                "Lou's Cafe, Hill Valley 1955. George McFly sits at the"
                " counter trying to write science fiction stories in his"
                " notebook. Biff Tannen has just left after bullying George."
                " George looks defeated and nervous. He tells Marty he's"
                " worried about rejection and doesn't think his stories"
                " are any good. The cafe has a 1950s soda fountain"
                " atmosphere with a jukebox playing in the background."
            ),
            "character_name": "George McFly",
            "character_frame_url": None,
            "interaction_prompt": (
                "George McFly looks like he could use some"
                " encouragement. Talk to him!"
            ),
            "voice_id": settings.CHARACTER_VOICE_GEORGE_MCFLY,
            "dialogue_options": [
                "Your stories sound really cool!",
                "Don't let Biff get you down.",
                "You should ask Lorraine to the dance!",
            ],
        },
        {
            "timestamp": 6360.0,
            "duration": 50.0,
            "scene_context": (
                "Hill Valley Courthouse, just after the lightning strike"
                " has sent Marty back to 1985. Doc Brown reads the letter"
                " Marty wrote warning him about the future. The DeLorean"
                " has vanished in a trail of fire. Doc looks at the camera"
                " with a mix of wonder and wisdom. He says: 'Roads? Where"
                " we're going, we don't need roads.' This is the final"
                " scene. Doc is reflective and philosophical about the"
                " nature of time and destiny."
            ),
            "character_name": "Doc Brown",
            "character_frame_url": None,
            "interaction_prompt": (
                "Doc Brown has a message about your future."
                " What would you like to ask him?"
            ),
            "voice_id": settings.CHARACTER_VOICE_DOC_BROWN,
            "dialogue_options": [
                "What does my future look like?",
                "Will we meet again?",
                "What's the most important thing about time?",
            ],
        },
    ]


async def main():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    content = await db.content.find_one({"imdb_id": BTTF_IMDB_ID})
    if not content:
        logger.error(
            "Back to the Future not found in database (imdb_id=%s)",
            BTTF_IMDB_ID,
        )
        client.close()
        sys.exit(1)

    content_id = str(content["_id"])
    logger.info(
        "Found Back to the Future: content_id=%s, title=%s",
        content_id,
        content.get("title"),
    )

    moments = build_bttf_moments(settings)

    result = await db.content.update_one(
        {"_id": content["_id"]},
        {
            "$set": {
                "interactive_moments": moments,
                "supports_avatar_interaction": True,
            }
        },
    )

    if result.modified_count == 1:
        logger.info(
            "Seeded %d interactive moments for Back to the Future",
            len(moments),
        )
        for i, m in enumerate(moments, 1):
            logger.info(
                "  Scene %d: %s at %.0fs (%s)",
                i,
                m["character_name"],
                m["timestamp"],
                m["interaction_prompt"][:50],
            )
    else:
        logger.warning(
            "Update matched but did not modify (moments may already exist)"
        )

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
