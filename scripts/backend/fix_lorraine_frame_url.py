#!/usr/bin/env python3
"""
Fix Lorraine Baines frame_url in Back to the Future interactive_characters.

The frame_url was stored as a relative path (/uploads/...) instead of a full
GCS URL. This script updates it to the correct URL from the characters
collection.

Usage:
    cd backend && poetry run python scripts/fix_lorraine_frame_url.py
"""

import asyncio
import sys
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

BTTF_IMDB_ID = "tt0088763"
CHARACTER_NAME = "Lorraine Baines"


async def main():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    # Get the correct URL from the characters collection
    char_doc = await db.characters.find_one({"name": CHARACTER_NAME})
    if not char_doc or not char_doc.get("face_url"):
        logger.error(
            "Character record or face_url not found for %s", CHARACTER_NAME
        )
        client.close()
        sys.exit(1)

    correct_url = char_doc["face_url"]
    logger.info("Correct face_url for %s: %s", CHARACTER_NAME, correct_url)

    # Find the BTTF content document
    content = await db.content.find_one({"imdb_id": BTTF_IMDB_ID})
    if not content:
        logger.error("Back to the Future not found (imdb_id=%s)", BTTF_IMDB_ID)
        client.close()
        sys.exit(1)

    content_id = str(content["_id"])
    chars = content.get("interactive_characters", [])

    # Find and fix Lorraine's entry
    updated = False
    for char in chars:
        if char.get("name") == CHARACTER_NAME:
            old_url = char.get("frame_url", "")
            if old_url == correct_url:
                logger.info(
                    "%s frame_url is already correct, no update needed",
                    CHARACTER_NAME,
                )
                client.close()
                return

            logger.info("Old frame_url: %s", old_url)
            logger.info("New frame_url: %s", correct_url)
            char["frame_url"] = correct_url
            updated = True
            break

    if not updated:
        logger.error(
            "%s not found in interactive_characters for content %s",
            CHARACTER_NAME,
            content_id,
        )
        client.close()
        sys.exit(1)

    result = await db.content.update_one(
        {"_id": content["_id"]},
        {"$set": {"interactive_characters": chars}},
    )

    if result.modified_count == 1:
        logger.info(
            "Fixed %s frame_url in content %s (modified_count=%d)",
            CHARACTER_NAME,
            content_id,
            result.modified_count,
        )
    else:
        logger.warning(
            "Update matched but did not modify (modified_count=%d)",
            result.modified_count,
        )

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
