#!/usr/bin/env python3
"""
Create Missing Series Parents Script
Creates parent series records for orphaned episodes and links them.
Uses raw motor client to avoid Beanie index conflicts.
"""

import asyncio
import re
import sys
from datetime import datetime
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


def extract_series_name(title: str) -> str:
    """Extract series name from episode title."""
    # Remove S01E01 patterns and everything after
    clean = re.sub(r"\s*S\d+E\d+.*$", "", title, flags=re.IGNORECASE)
    # Also handle "S01 E01" format with space
    clean = re.sub(r"\s*S\d+\s+E\d+.*$", "", clean, flags=re.IGNORECASE)
    clean = clean.strip(" -_.")
    return clean


async def create_missing_series_parents(dry_run: bool = False):
    """Create parent series for orphaned episodes."""
    settings = get_settings()

    logger.info("Connecting to MongoDB")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db.content

    logger.info("Connected to database (raw motor, no Beanie init)")

    # Find all episodes (have series_id, season, episode)
    all_episodes = await collection.find(
        {
            "series_id": {"$ne": None},
            "season": {"$ne": None},
            "episode": {"$ne": None},
        }
    ).to_list(length=None)

    logger.info(f"Found {len(all_episodes)} total episodes")

    # Group orphaned episodes by series name
    orphan_groups: dict[str, list[dict]] = {}

    for ep in all_episodes:
        # Check if parent exists
        series_id = ep.get("series_id")
        try:
            parent = await collection.find_one({"_id": ObjectId(series_id)})
            if parent:
                continue  # Valid parent, skip
        except Exception:
            pass

        # Orphaned - extract series name
        title = ep.get("title", "")
        series_name = extract_series_name(title)
        if not series_name:
            logger.warning(f"Could not extract series name from: {title}")
            continue

        if series_name not in orphan_groups:
            orphan_groups[series_name] = []
        orphan_groups[series_name].append(ep)

    logger.info(f"Found {len(orphan_groups)} unique orphan series")

    # Create parent for each group
    created_parents = 0
    linked_episodes = 0
    examples = []

    for series_name, episodes in orphan_groups.items():
        # Get a sample episode to copy metadata from
        sample = episodes[0]

        # Calculate total seasons/episodes
        seasons = set(ep.get("season") for ep in episodes)
        total_episodes = len(episodes)

        if len(examples) < 10:
            examples.append({
                "series_name": series_name,
                "episode_count": len(episodes),
                "seasons": sorted(s for s in seasons if s is not None),
            })

        if not dry_run:
            now = datetime.utcnow()
            # Create parent series document
            parent_doc = {
                "title": series_name,
                "is_series": True,
                "season": None,
                "episode": None,
                "series_id": None,
                "total_seasons": len(seasons),
                "total_episodes": total_episodes,
                # Copy metadata from sample episode
                "stream_url": sample.get("stream_url"),
                "stream_type": sample.get("stream_type"),
                "is_published": sample.get("is_published", False),
                "category_id": sample.get("category_id"),
                "section_ids": sample.get("section_ids", []),
                "primary_section_id": sample.get("primary_section_id"),
                "content_format": "series",
                "thumbnail": sample.get("thumbnail"),
                "backdrop": sample.get("backdrop"),
                "created_at": now,
                "updated_at": now,
            }
            result = await collection.insert_one(parent_doc)
            parent_id = str(result.inserted_id)

            # Update all episodes to point to new parent
            for ep in episodes:
                await collection.update_one(
                    {"_id": ep["_id"]},
                    {"$set": {"series_id": parent_id}},
                )
                linked_episodes += 1

        created_parents += 1

    mode = "DRY RUN" if dry_run else "APPLIED"
    logger.info(
        f"Create parents complete - {mode}",
        extra={
            "orphan_series": len(orphan_groups),
            "parents_created": created_parents,
            "episodes_linked": linked_episodes if not dry_run else sum(len(eps) for eps in orphan_groups.values()),
        },
    )

    if examples:
        print(f"\nSeries to create ({mode}):")
        print("-" * 60)
        for ex in examples:
            print(f"  Series: {ex['series_name']}")
            print(f"  Episodes: {ex['episode_count']}")
            print(f"  Seasons: {ex['seasons']}")
            print()

    client.close()

    return {
        "orphan_series": len(orphan_groups),
        "parents_created": created_parents,
        "episodes_linked": linked_episodes if not dry_run else sum(len(eps) for eps in orphan_groups.values()),
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Create missing series parents")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without applying them",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("Create Missing Series Parents Script")
    print("=" * 60)

    if args.dry_run:
        print("MODE: DRY RUN (no changes will be made)")
    else:
        print("MODE: APPLY CHANGES")

    print()

    try:
        result = asyncio.run(create_missing_series_parents(dry_run=args.dry_run))
        print("=" * 60)
        print(f"Orphan series found: {result['orphan_series']}")
        print(f"Parents created: {result['parents_created']}")
        print(f"Episodes linked: {result['episodes_linked']}")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
