#!/usr/bin/env python3
"""
Seed the `characters` collection with all known VOD interaction characters.

Idempotent: uses update_one with upsert=True so re-running is safe.
Voice IDs that are not yet cloned (biblical characters, Lorraine) fall back
to the current default voice; update them in this script once real clones exist.

Usage:
    cd backend && poetry run python ../scripts/backend/seed_characters.py
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

GCS_FACE_BASE = (
    "https://storage.googleapis.com/bayit-plus-media-new/"
    "vod-interactions/character-faces"
)

JENNIFER_FACE_URL = (
    "https://static.wikia.nocookie.net/bttf/images/6/65/"
    "Jennifer-02.jpg/revision/latest"
)


def build_characters(settings) -> list:
    """Build the full character list with real voice IDs."""
    default_voice = settings.CHARACTER_VOICE_DEFAULT

    return [
        {
            "name": "Doc Brown",
            "voice_id": "a7toocJbPxci8Tmwnx4S",
            "face_url": f"{GCS_FACE_BASE}/doc_brown.jpg",
            "description": "Eccentric, brilliant inventor; enthusiastic and energetic",
            "franchise": "bttf",
            "actor_name": "Christopher Lloyd",
            "gender": "male",
        },
        {
            "name": "George McFly",
            "voice_id": "abQWz9Ie9T8HcynRj3mY",
            "face_url": f"{GCS_FACE_BASE}/george_mcfly.jpg",
            "description": "Timid, earnest aspiring sci-fi writer",
            "franchise": "bttf",
            "actor_name": "Crispin Glover",
            "gender": "male",
        },
        {
            "name": "Jennifer Parker",
            "voice_id": "cgSgspJ2msm6clMCkdW9",
            "face_url": JENNIFER_FACE_URL,
            "description": "Warm, supportive, caring girlfriend",
            "franchise": "bttf",
            "actor_name": "Claudia Wells",
            "gender": "female",
        },
        {
            "name": "Biff Tannen",
            "voice_id": "3FKcLNig9t6qJCE70Rwy",
            "face_url": f"{GCS_FACE_BASE}/biff_tannen.jpg",
            "description": "Aggressive bully; intimidating and confrontational",
            "franchise": "bttf",
            "actor_name": "Thomas F. Wilson",
            "gender": "male",
        },
        {
            "name": "Marty McFly",
            "voice_id": "LJWk4AXBOU61rdcIyKeH",
            "face_url": f"{GCS_FACE_BASE}/marty_mcfly.jpg",
            "description": "Energetic teenager; brave but impulsive",
            "franchise": "bttf",
            "actor_name": "Michael J. Fox",
            "gender": "male",
        },
        {
            "name": "Lorraine Baines",
            "voice_id": "fSopMTg5B663IwvAQsSf",
            "face_url": None,
            "description": "Warm, kind-hearted; young and romantic in 1955",
            "franchise": "bttf",
            "actor_name": "Lea Thompson",
            "gender": "female",
        },
        {
            "name": "Moshe Rabbenu",
            "voice_id": default_voice,
            "face_url": None,
            "description": "Wise, authoritative leader and prophet",
            "franchise": "torah",
            "actor_name": None,
            "gender": "male",
        },
        {
            "name": "David HaMelech",
            "voice_id": default_voice,
            "face_url": None,
            "description": "Strong, regal king and psalmist",
            "franchise": "torah",
            "actor_name": None,
            "gender": "male",
        },
        {
            "name": "Miriam",
            "voice_id": default_voice,
            "face_url": None,
            "description": "Warm, nurturing prophetess and leader",
            "franchise": "torah",
            "actor_name": None,
            "gender": "female",
        },
        {
            "name": "Esther",
            "voice_id": default_voice,
            "face_url": None,
            "description": "Graceful, confident queen who saved her people",
            "franchise": "torah",
            "actor_name": None,
            "gender": "female",
        },
    ]


async def main():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    characters = build_characters(settings)
    now = datetime.now(timezone.utc)

    upserted = 0
    updated = 0

    for char in characters:
        result = await db.characters.update_one(
            {"name": char["name"]},
            {
                "$set": {
                    "voice_id": char["voice_id"],
                    "face_url": char["face_url"],
                    "description": char["description"],
                    "franchise": char["franchise"],
                    "actor_name": char["actor_name"],
                    "gender": char["gender"],
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "created_at": now,
                },
            },
            upsert=True,
        )
        if result.upserted_id:
            upserted += 1
            logger.info("Inserted character: %s", char["name"])
        elif result.modified_count:
            updated += 1
            logger.info("Updated character: %s", char["name"])
        else:
            logger.info("Character unchanged: %s", char["name"])

    total = await db.characters.count_documents({})
    logger.info(
        "Seed complete: %d inserted, %d updated, %d total in collection",
        upserted,
        updated,
        total,
    )

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
