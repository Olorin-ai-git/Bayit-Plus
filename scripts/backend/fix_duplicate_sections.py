#!/usr/bin/env python3
"""
Fix duplicate content_sections in MongoDB.

Problem:
  Multiple ContentSection documents exist with the same slug (e.g., 5x "movies",
  7x "series"). The slug field lacks a unique constraint, and repeated seed/admin
  operations created duplicates. Some duplicates have content linked via the
  legacy category_id field.

Fix:
  1. For each slug, keep the oldest document as canonical
  2. Migrate legacy category_id content from duplicates to canonical section_ids
  3. Set proper name_key on canonical sections that are missing it
  4. Delete duplicate sections
  5. Create a unique index on slug to prevent recurrence

This script is idempotent and safe to run multiple times.
"""

import asyncio
import logging
import sys
from collections import defaultdict
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

# Expected name_keys for each slug
EXPECTED_NAME_KEYS = {
    "movies": "taxonomy.sections.movies",
    "series": "taxonomy.sections.series",
    "kids": "taxonomy.sections.kids",
    "youngsters": "taxonomy.sections.youngsters",
    "music": "taxonomy.sections.music",
    "documentaries": "taxonomy.sections.documentaries",
    "podcasts": "taxonomy.sections.podcasts",
    "live": "taxonomy.sections.live",
    "audiobooks": "taxonomy.sections.audiobooks",
    "judaism": "taxonomy.sections.judaism",
    "israeli-cities": "taxonomy.sections.israeli-cities",
}


async def get_database() -> AsyncIOMotorDatabase:
    """Get MongoDB connection."""
    from app.core.database import connect_to_mongo, get_database

    try:
        return get_database()
    except Exception:
        await connect_to_mongo()
        return get_database()


async def fix_duplicate_sections(dry_run: bool = False):
    """Fix duplicate content_sections."""
    try:
        db = await get_database()
        sections_col = db.get_collection("content_sections")
        content_col = db.get_collection("content")

        # Group all sections by slug
        all_sections = await sections_col.find({}).sort("_id", 1).to_list(None)
        slug_groups = defaultdict(list)
        for section in all_sections:
            slug_groups[section["slug"]].append(section)

        total_duplicates_removed = 0
        total_content_migrated = 0

        for slug, sections in slug_groups.items():
            if len(sections) == 1:
                # No duplicates for this slug
                canonical = sections[0]
                canonical_id = str(canonical["_id"])

                # Still check/fix name_key
                current_name_key = canonical.get("name_key")
                expected_name_key = EXPECTED_NAME_KEYS.get(slug)

                if expected_name_key and (
                    not current_name_key or current_name_key == "N/A"
                ):
                    logger.info(
                        f"[{slug}] Fixing name_key: {current_name_key!r} -> {expected_name_key!r}"
                    )
                    if not dry_run:
                        await sections_col.update_one(
                            {"_id": canonical["_id"]},
                            {"$set": {"name_key": expected_name_key}},
                        )
                continue

            # Multiple sections with same slug - keep oldest as canonical
            canonical = sections[0]
            duplicates = sections[1:]
            canonical_id = str(canonical["_id"])

            logger.info(
                f"\n[{slug}] Found {len(sections)} sections "
                f"(1 canonical + {len(duplicates)} duplicates)"
            )
            logger.info(f"  Canonical: {canonical_id}")

            # Fix name_key on canonical
            current_name_key = canonical.get("name_key")
            expected_name_key = EXPECTED_NAME_KEYS.get(slug)
            if expected_name_key and (
                not current_name_key or current_name_key == "N/A"
            ):
                logger.info(
                    f"  Fixing canonical name_key: {current_name_key!r} -> {expected_name_key!r}"
                )
                if not dry_run:
                    await sections_col.update_one(
                        {"_id": canonical["_id"]},
                        {"$set": {"name_key": expected_name_key}},
                    )

            # Process each duplicate
            for dup in duplicates:
                dup_id = str(dup["_id"])

                # Find content referencing this duplicate via legacy category_id
                legacy_content = await content_col.find(
                    {"category_id": dup_id}
                ).to_list(None)

                legacy_count = len(legacy_content)
                logger.info(
                    f"  Duplicate {dup_id}: {legacy_count} legacy content items"
                )

                if legacy_count > 0:
                    # Migrate: add canonical section ID to section_ids,
                    # update category_id to canonical, set primary_section_id
                    migrated = 0
                    for item in legacy_content:
                        content_id = item["_id"]
                        current_section_ids = item.get("section_ids", [])

                        # Add canonical ID to section_ids if not already present
                        if canonical_id not in current_section_ids:
                            current_section_ids.append(canonical_id)

                        update_fields = {
                            "section_ids": current_section_ids,
                            "category_id": canonical_id,
                        }

                        # Set primary_section_id if not already set
                        if not item.get("primary_section_id"):
                            update_fields["primary_section_id"] = canonical_id

                        if not dry_run:
                            await content_col.update_one(
                                {"_id": content_id},
                                {"$set": update_fields},
                            )
                        migrated += 1

                    logger.info(
                        f"    Migrated {migrated} content items to canonical {canonical_id}"
                    )
                    total_content_migrated += migrated

                # Also check for section_ids references (shouldn't exist but be safe)
                section_ids_content = await content_col.count_documents(
                    {"section_ids": dup_id}
                )
                if section_ids_content > 0:
                    logger.info(
                        f"    Also found {section_ids_content} items with "
                        f"section_ids referencing duplicate"
                    )
                    if not dry_run:
                        # Replace duplicate ID with canonical in section_ids arrays
                        await content_col.update_many(
                            {"section_ids": dup_id},
                            {
                                "$addToSet": {"section_ids": canonical_id},
                            },
                        )
                        await content_col.update_many(
                            {"section_ids": dup_id},
                            {
                                "$pull": {"section_ids": dup_id},
                            },
                        )
                    total_content_migrated += section_ids_content

                # Delete the duplicate section
                if not dry_run:
                    await sections_col.delete_one({"_id": dup["_id"]})
                logger.info(f"    Deleted duplicate section {dup_id}")
                total_duplicates_removed += 1

        # Create unique index on slug to prevent recurrence
        logger.info("\nCreating unique index on slug field...")
        if not dry_run:
            # Drop existing non-unique slug index if present
            existing_indexes = await sections_col.index_information()
            for idx_name, idx_info in existing_indexes.items():
                if idx_info.get("key") == [("slug", 1)] and not idx_info.get(
                    "unique", False
                ):
                    logger.info(f"  Dropping non-unique slug index: {idx_name}")
                    await sections_col.drop_index(idx_name)

            await sections_col.create_index("slug", unique=True, name="slug_unique")
            logger.info("  Created unique index: slug_unique")

        # Summary
        logger.info("\n" + "=" * 80)
        logger.info("SUMMARY")
        logger.info("=" * 80)
        logger.info(f"  Duplicates removed: {total_duplicates_removed}")
        logger.info(f"  Content items migrated: {total_content_migrated}")
        logger.info(f"  Mode: {'DRY RUN' if dry_run else 'APPLIED'}")

        # Verify final state
        if not dry_run:
            final_sections = await sections_col.find({}).sort("order", 1).to_list(None)
            logger.info(f"\n  Final section count: {len(final_sections)}")
            for section in final_sections:
                content_count = await content_col.count_documents(
                    {"section_ids": str(section["_id"]), "is_published": True}
                )
                legacy_count = await content_col.count_documents(
                    {"category_id": str(section["_id"])}
                )
                logger.info(
                    f"    {section['slug']}: name_key={section.get('name_key', 'N/A')}, "
                    f"section_ids_content={content_count}, legacy_content={legacy_count}"
                )

    except Exception as e:
        logger.error(f"Error fixing sections: {e}", exc_info=True)
    finally:
        from app.core.database import close_mongo_connection

        await close_mongo_connection()


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        logger.info("Running in DRY RUN mode - no changes will be made")
    asyncio.run(fix_duplicate_sections(dry_run=dry_run))
