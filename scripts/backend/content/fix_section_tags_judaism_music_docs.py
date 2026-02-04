#!/usr/bin/env python3
"""
Fix Section Tags: Judaism, Music, Documentaries

Removes incorrect section_ids for judaism/music/documentaries from all content,
then re-tags only content that actually matches each section based on metadata.

Usage:
    poetry run python scripts/backend/content/fix_section_tags_judaism_music_docs.py --dry-run
    poetry run python scripts/backend/content/fix_section_tags_judaism_music_docs.py --execute
"""

import argparse
import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

project_root = os.getenv("PROJECT_ROOT", str(Path(__file__).parent.parent.parent.parent))
sys.path.insert(0, f"{project_root}/backend")

from app.core.config import settings
from app.models.content import Content
from app.models.content_taxonomy import ContentSection

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

SECTION_MATCH_CRITERIA: Dict[str, Dict[str, Any]] = {
    "judaism": {
        "category_names": ["יהדות", "תורה", "שיעורים", "תפילה", "Judaism", "judaism"],
        "topic_tags": ["jewish", "jewish-life"],
        "genres": ["יהדות", "judaism", "Judaism"],
    },
    "music": {
        "category_names": ["מוזיקה", "music", "Music", "שירים"],
        "content_formats": ["music"],
        "genres": ["מוזיקה", "music", "Music"],
    },
    "documentaries": {
        "category_names": ["דוקומנטרי", "documentary", "Documentaries", "documentaries", "דוקומנטרים"],
        "content_formats": ["documentary"],
        "genres": ["דוקומנטרי", "documentary", "Documentary"],
    },
}


def build_match_query(criteria: Dict[str, Any]) -> Dict:
    """Build a MongoDB $or query from section match criteria."""
    or_conditions: List[Dict] = []
    for field, key in [("category_name", "category_names"), ("topic_tags", "topic_tags"),
                       ("genre", "genres"), ("content_format", "content_formats")]:
        values = criteria.get(key, [])
        if values:
            or_conditions.append({field: {"$in": values}})

    if not or_conditions:
        return {}
    return {"$and": [{"is_published": True}, {"$or": or_conditions}]}


async def process_section(slug: str, criteria: Dict[str, Any],
                          content_collection: Any, dry_run: bool) -> Dict[str, Any]:
    """Remove stale section tags and re-apply to matching content for one section."""
    sections = await ContentSection.find(
        ContentSection.slug == slug, ContentSection.is_active == True,
    ).to_list()

    if not sections:
        logger.info(f"No active section found for slug '{slug}', skipping")
        return {"error": "section not found"}

    section_ids = [str(s.id) for s in sections]
    logger.info(f"Section '{slug}' IDs: {section_ids}")

    # Step 1: Remove section IDs from all content
    current_count = await content_collection.count_documents({"section_ids": {"$in": section_ids}})
    logger.info(f"  {current_count} items currently tagged with '{slug}'")

    if not dry_run:
        pull_result = await content_collection.update_many(
            {"section_ids": {"$in": section_ids}},
            {"$pull": {"section_ids": {"$in": section_ids}}},
        )
        logger.info(f"  Removed from {pull_result.modified_count} items")
    else:
        logger.info(f"  [DRY RUN] Would remove from up to {current_count} items")

    # Step 2: Re-tag content matching criteria
    match_query = build_match_query(criteria)
    if not match_query:
        return {"removed_from": current_count, "added_to": 0}

    matching_count = await content_collection.count_documents(match_query)
    logger.info(f"  {matching_count} items match '{slug}' criteria")

    samples = await content_collection.find(
        match_query, {"title": 1, "category_name": 1}
    ).limit(5).to_list(length=5)
    for s in samples:
        logger.info(f"    Match: '{s.get('title', 'N/A')}' (category: {s.get('category_name', 'N/A')})")

    primary_section_id = section_ids[0]
    if not dry_run:
        add_result = await content_collection.update_many(
            match_query, {"$addToSet": {"section_ids": primary_section_id}},
        )
        logger.info(f"  Added to {add_result.modified_count} items")
        added_count = add_result.modified_count
    else:
        logger.info(f"  [DRY RUN] Would add to {matching_count} items")
        added_count = matching_count

    return {
        "removed_from": current_count,
        "added_to": added_count,
        "sample_titles": [s.get("title", "N/A") for s in samples],
    }


async def fix_section_tags(dry_run: bool = True) -> Dict[str, Any]:
    """Fix section tags for judaism, music, and documentaries."""
    collection = Content.get_settings().pymongo_collection
    results: Dict[str, Any] = {}
    for slug, criteria in SECTION_MATCH_CRITERIA.items():
        logger.info(f"--- Processing section: {slug} ---")
        results[slug] = await process_section(slug, criteria, collection, dry_run)
    return results


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Fix section tags for Judaism, Music, Documentaries")
    parser.add_argument("--dry-run", action="store_true", help="Only report what would be done")
    parser.add_argument("--execute", action="store_true", help="Actually apply the changes")
    args = parser.parse_args()

    if not args.dry_run and not args.execute:
        logger.error("Must specify --dry-run or --execute")
        sys.exit(1)

    dry_run = not args.execute
    logger.info("Connecting to database...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Content, ContentSection],
        skip_indexes=True,
    )

    logger.info(f"Starting section tag fix (dry_run={dry_run})...")
    results = await fix_section_tags(dry_run=dry_run)

    logger.info("=== Summary ===")
    for slug, data in results.items():
        if "error" in data:
            logger.info(f"  {slug}: {data['error']}")
        else:
            logger.info(f"  {slug}: removed from {data['removed_from']}, added to {data['added_to']}")

    if dry_run:
        logger.info("\nThis was a dry run. Use --execute to apply changes.")


if __name__ == "__main__":
    asyncio.run(main())
