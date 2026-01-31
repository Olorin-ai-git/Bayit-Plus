#!/usr/bin/env python3
"""
Diagnostic script to check ALL category sources across the platform.

Checks:
1. content_sections (VOD page) - already fixed
2. section_subcategories (Kids, Youngsters pages)
3. podcasts collection category field (Podcasts page)
4. live_channels collection (Live TV page)
"""

import asyncio
import logging
import sys
from collections import Counter, defaultdict
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


async def check_content_sections(db):
    """Check content_sections for duplicates (should be clean after fix)."""
    col = db.get_collection("content_sections")
    sections = await col.find({}).sort("order", 1).to_list(None)

    slug_counter = Counter(s["slug"] for s in sections)
    duplicates = {k: v for k, v in slug_counter.items() if v > 1}

    logger.info(f"\n{'='*60}")
    logger.info("1. CONTENT SECTIONS (VOD page)")
    logger.info(f"{'='*60}")
    logger.info(f"   Total: {len(sections)}")
    for s in sections:
        name_key = s.get("name_key", "MISSING")
        logger.info(f"   - {s['slug']}: name_key={name_key}, order={s.get('order')}")
    if duplicates:
        logger.info(f"   DUPLICATES FOUND: {duplicates}")
    else:
        logger.info("   No duplicates found")


async def check_section_subcategories(db):
    """Check section_subcategories for duplicates."""
    col = db.get_collection("section_subcategories")
    subcats = await col.find({}).sort("order", 1).to_list(None)

    # Group by section_id + slug
    key_counter = Counter(
        (s.get("section_id", "?"), s["slug"]) for s in subcats
    )
    duplicates = {k: v for k, v in key_counter.items() if v > 1}

    # Group by section for display
    by_section = defaultdict(list)
    for s in subcats:
        by_section[s.get("section_id", "?")].append(s)

    logger.info(f"\n{'='*60}")
    logger.info("2. SECTION SUBCATEGORIES (Kids, Youngsters pages)")
    logger.info(f"{'='*60}")
    logger.info(f"   Total: {len(subcats)}")

    sections_col = db.get_collection("content_sections")
    for section_id, items in by_section.items():
        # Resolve section name
        from bson import ObjectId

        try:
            section = await sections_col.find_one({"_id": ObjectId(section_id)})
            section_name = section["slug"] if section else "UNKNOWN"
        except Exception:
            section_name = "UNKNOWN"

        logger.info(f"\n   Section: {section_name} ({section_id})")
        slug_count = Counter(s["slug"] for s in items)
        for s in items:
            dup_marker = " ** DUPLICATE **" if slug_count[s["slug"]] > 1 else ""
            name_key = s.get("name_key", "MISSING")
            logger.info(
                f"     - {s['slug']}: name_key={name_key}, "
                f"active={s.get('is_active', '?')}{dup_marker}"
            )

    if duplicates:
        logger.info(f"\n   DUPLICATES FOUND: {dict(duplicates)}")
    else:
        logger.info("\n   No duplicates found")


async def check_podcast_categories(db):
    """Check podcast category field for inconsistencies."""
    col = db.get_collection("podcasts")
    podcasts = await col.find({"is_active": True}).to_list(None)

    # Collect all category values
    category_counter = Counter()
    category_en_map = {}
    no_category = 0

    for p in podcasts:
        cat = p.get("category")
        if not cat:
            no_category += 1
            continue
        category_counter[cat] += 1
        cat_en = p.get("category_en")
        if cat_en and cat not in category_en_map:
            category_en_map[cat] = cat_en

    logger.info(f"\n{'='*60}")
    logger.info("3. PODCAST CATEGORIES (Podcasts page)")
    logger.info(f"{'='*60}")
    logger.info(f"   Total active podcasts: {len(podcasts)}")
    logger.info(f"   Podcasts without category: {no_category}")
    logger.info(f"   Unique categories: {len(category_counter)}")

    for cat, count in category_counter.most_common():
        en_name = category_en_map.get(cat, "N/A")
        logger.info(f"   - '{cat}' (EN: '{en_name}'): {count} podcasts")

    # Check for near-duplicates (case/whitespace)
    normalized = defaultdict(list)
    for cat in category_counter:
        normalized[cat.strip().lower()].append(cat)
    near_dups = {k: v for k, v in normalized.items() if len(v) > 1}
    if near_dups:
        logger.info(f"\n   NEAR-DUPLICATES (case/whitespace): {dict(near_dups)}")
    else:
        logger.info("   No near-duplicates found")


async def check_live_channels(db):
    """Check live channel categories."""
    col = db.get_collection("live_channels")
    channels = await col.find({}).to_list(None)

    if not channels:
        logger.info(f"\n{'='*60}")
        logger.info("4. LIVE CHANNELS (Live TV page)")
        logger.info(f"{'='*60}")
        logger.info("   No live_channels collection or no documents")
        return

    category_counter = Counter()
    for ch in channels:
        cat = ch.get("category", ch.get("genre", "uncategorized"))
        category_counter[cat] += 1

    logger.info(f"\n{'='*60}")
    logger.info("4. LIVE CHANNELS (Live TV page)")
    logger.info(f"{'='*60}")
    logger.info(f"   Total channels: {len(channels)}")
    logger.info(f"   Unique categories: {len(category_counter)}")

    for cat, count in category_counter.most_common():
        logger.info(f"   - '{cat}': {count} channels")


async def main():
    """Run all diagnostics."""
    try:
        db = await get_database()
        await check_content_sections(db)
        await check_section_subcategories(db)
        await check_podcast_categories(db)
        await check_live_channels(db)

        logger.info(f"\n{'='*60}")
        logger.info("DIAGNOSTIC COMPLETE")
        logger.info(f"{'='*60}")
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
    finally:
        from app.core.database import close_mongo_connection

        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
