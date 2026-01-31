#!/usr/bin/env python3
"""
Fix missing name_key on section_subcategories.

All 23 subcategories have name_key=None. Set them to the proper
i18n translation key pattern: taxonomy.subcategories.{slug}
"""

import asyncio
import logging
import sys
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorDatabase

backend_dir = Path(__file__).parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)


async def get_database() -> AsyncIOMotorDatabase:
    """Get MongoDB connection."""
    from app.core.database import connect_to_mongo, get_database

    try:
        return get_database()
    except Exception:
        await connect_to_mongo()
        return get_database()


async def fix_subcategory_name_keys(dry_run: bool = False):
    """Set name_key on all subcategories that are missing it."""
    try:
        db = await get_database()
        col = db.get_collection("section_subcategories")

        subcats = await col.find({}).to_list(None)
        fixed = 0

        for sub in subcats:
            slug = sub["slug"]
            current_key = sub.get("name_key")

            if not current_key:
                expected_key = f"taxonomy.subcategories.{slug}"
                logger.info(f"  Setting name_key on '{slug}': {expected_key}")
                if not dry_run:
                    await col.update_one(
                        {"_id": sub["_id"]},
                        {"$set": {"name_key": expected_key}},
                    )
                fixed += 1

        logger.info(f"\nFixed {fixed} subcategories ({'DRY RUN' if dry_run else 'APPLIED'})")

    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
    finally:
        from app.core.database import close_mongo_connection

        await close_mongo_connection()


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    asyncio.run(fix_subcategory_name_keys(dry_run=dry_run))
