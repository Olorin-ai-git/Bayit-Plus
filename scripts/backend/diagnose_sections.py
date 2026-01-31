#!/usr/bin/env python3
"""
Diagnostic script to inspect content_sections collection.

Lists all sections with their slug, name_key, order, and content counts
to identify duplicate or misconfigured sections.
"""

import asyncio
import logging
import sys
from collections import Counter
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorDatabase

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


async def get_database() -> AsyncIOMotorDatabase:
    """Get MongoDB connection."""
    from app.core.database import connect_to_mongo, get_database

    try:
        return get_database()
    except Exception:
        await connect_to_mongo()
        return get_database()


async def diagnose_sections():
    """Inspect all content_sections documents."""
    try:
        db = await get_database()
        sections_col = db.get_collection("content_sections")
        content_col = db.get_collection("content")

        sections = await sections_col.find({}).sort("order", 1).to_list(None)

        logger.info("=" * 80)
        logger.info(f"TOTAL SECTIONS IN DATABASE: {len(sections)}")
        logger.info("=" * 80)

        name_key_counter = Counter()

        for section in sections:
            section_id = str(section["_id"])
            slug = section.get("slug", "N/A")
            name_key = section.get("name_key", "N/A")
            order = section.get("order", "N/A")
            is_active = section.get("is_active", "N/A")
            show_on_homepage = section.get("show_on_homepage", "N/A")
            show_on_nav = section.get("show_on_nav", "N/A")
            supports_subcategories = section.get("supports_subcategories", False)

            # Count content in this section
            content_count = await content_col.count_documents(
                {"section_ids": section_id, "is_published": True}
            )

            # Also check legacy category_id
            legacy_count = await content_col.count_documents(
                {"category_id": section_id}
            )

            name_key_counter[name_key] += 1

            logger.info(f"\n  ID:        {section_id}")
            logger.info(f"  slug:      {slug}")
            logger.info(f"  name_key:  {name_key}")
            logger.info(f"  order:     {order}")
            logger.info(f"  is_active: {is_active}")
            logger.info(f"  homepage:  {show_on_homepage}")
            logger.info(f"  nav:       {show_on_nav}")
            logger.info(f"  subcats:   {supports_subcategories}")
            logger.info(f"  content (section_ids): {content_count}")
            logger.info(f"  content (legacy category_id): {legacy_count}")
            logger.info("-" * 60)

        logger.info("\n" + "=" * 80)
        logger.info("DUPLICATE NAME_KEY ANALYSIS:")
        logger.info("=" * 80)
        for name_key, count in name_key_counter.most_common():
            status = " ** DUPLICATE **" if count > 1 else ""
            logger.info(f"  {name_key}: {count} sections{status}")

    except Exception as e:
        logger.error(f"Error diagnosing sections: {e}", exc_info=True)
    finally:
        from app.core.database import close_mongo_connection

        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(diagnose_sections())
