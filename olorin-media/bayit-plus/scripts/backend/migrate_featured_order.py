#!/usr/bin/env python3
"""
Migration script to populate featured_order field from existing featured content.

This script:
1. Finds all featured content (is_featured=True)
2. Groups by primary section
3. Assigns order within each section
4. Populates featured_order dictionary

The script is idempotent - safe to run multiple times.
"""

import asyncio
import logging
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


async def get_database() -> AsyncIOMotorDatabase:
    """Get MongoDB connection."""
    from app.core.database import get_database
    return get_database()


async def migrate_featured_order():
    """Migrate featured_order field for all featured content."""
    try:
        db = await get_database()
        content_collection = db.get_collection("content")
        sections_collection = db.get_collection("content_sections")

        logger.info("Starting featured_order migration...")

        # Get all active homepage sections
        sections = await sections_collection.find(
            {"is_active": True, "show_on_homepage": True}
        ).sort("order", 1).to_list(None)

        section_map = {str(s["_id"]): s for s in sections}
        logger.info(f"Found {len(section_map)} active homepage sections")

        # Get all featured content sorted by creation date
        featured_content = await content_collection.find(
            {"is_featured": True}
        ).sort("created_at", 1).to_list(None)

        logger.info(f"Found {len(featured_content)} featured content items")

        # Group by primary_section_id or category_id
        section_content = {}
        for content in featured_content:
            section_id = content.get("primary_section_id") or content.get("category_id")
            if not section_id:
                logger.warning(f"Content {content['_id']} has no section, skipping")
                continue

            if section_id not in section_content:
                section_content[section_id] = []
            section_content[section_id].append(content)

        logger.info(f"Grouped content into {len(section_content)} sections")

        # Assign order within each section
        total_updated = 0
        for section_id, contents in section_content.items():
            for order, content in enumerate(contents):
                featured_order = content.get("featured_order", {})
                featured_order[section_id] = order

                result = await content_collection.update_one(
                    {"_id": content["_id"]},
                    {
                        "$set": {
                            "featured_order": featured_order,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )

                if result.modified_count > 0:
                    total_updated += 1
                    if (total_updated % 10) == 0:
                        logger.info(f"Updated {total_updated} documents...")

        logger.info(f"Migration complete! Updated {total_updated} content items")

        # Verify migration
        with_order = await content_collection.count_documents({
            "is_featured": True,
            "featured_order": {"$exists": True, "$ne": {}}
        })
        logger.info(f"Verification: {with_order} featured items now have featured_order")

        return {
            "success": True,
            "total_updated": total_updated,
            "sections": len(section_content),
            "verified_count": with_order
        }

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }


async def main():
    """Run migration."""
    result = await migrate_featured_order()
    logger.info(f"Migration result: {result}")
    return result


if __name__ == "__main__":
    asyncio.run(main())
