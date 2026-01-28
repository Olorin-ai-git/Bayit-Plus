#!/usr/bin/env python3
"""
Relink Orphan Episodes Script
Finds episodes with invalid series_id and relinks them to correct series parents by title matching.
"""

import asyncio
import re
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.core.config import get_settings
from app.core.logging_config import get_logger
from app.models.content import Content
from beanie import init_beanie
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

logger = get_logger(__name__)


def extract_series_name(title: str) -> str:
    """Extract series name from episode title."""
    # Remove S01E01 patterns
    clean = re.sub(r"\s*S\d+E\d+.*$", "", title, flags=re.IGNORECASE)
    # Remove trailing whitespace and common suffixes
    clean = clean.strip(" -_.")
    return clean


def normalize_title(title: str) -> str:
    """Normalize title for matching."""
    # Lowercase, remove special chars, collapse spaces
    normalized = title.lower()
    normalized = re.sub(r"[^\w\s]", "", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


async def relink_orphan_episodes(dry_run: bool = False):
    """Relink orphaned episodes to correct series parents."""
    settings = get_settings()

    logger.info("Connecting to MongoDB")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    await init_beanie(database=db, document_models=[Content])

    logger.info("Connected to database")

    # Build series parent lookup by normalized title
    series_parents = await Content.find(
        {
            "is_series": True,
            "$or": [
                {"series_id": None},
                {"series_id": {"$exists": False}},
            ],
        }
    ).to_list()

    # Create lookup dict (normalized_title -> series parent)
    series_lookup: dict[str, Content] = {}
    for parent in series_parents:
        norm = normalize_title(parent.title)
        # Keep the one with season/episode as None (true parent)
        if parent.season is None and parent.episode is None:
            series_lookup[norm] = parent

    logger.info(f"Found {len(series_lookup)} series parents for matching")

    # Find all episodes with series_id set
    all_episodes = await Content.find(
        {
            "series_id": {"$ne": None},
            "season": {"$ne": None},
            "episode": {"$ne": None},
        }
    ).to_list()

    logger.info(f"Found {len(all_episodes)} total episodes")

    # Check each episode
    relinked = 0
    already_valid = 0
    no_match = 0
    examples = []

    for ep in all_episodes:
        # Check if current series_id is valid
        try:
            parent = await Content.get(ep.series_id)
            if parent:
                already_valid += 1
                continue
        except Exception:
            pass

        # Episode is orphaned - try to find matching parent
        series_name = extract_series_name(ep.title)
        norm_name = normalize_title(series_name)

        if norm_name in series_lookup:
            new_parent = series_lookup[norm_name]
            old_series_id = ep.series_id

            if len(examples) < 10:
                examples.append({
                    "episode_title": ep.title,
                    "season": ep.season,
                    "episode": ep.episode,
                    "old_series_id": old_series_id,
                    "new_series_id": str(new_parent.id),
                    "parent_title": new_parent.title,
                })

            if not dry_run:
                ep.series_id = str(new_parent.id)
                await ep.save()

            relinked += 1
        else:
            no_match += 1
            logger.warning(
                "No matching series parent found",
                extra={
                    "episode_title": ep.title,
                    "extracted_name": series_name,
                    "normalized": norm_name,
                },
            )

    mode = "DRY RUN" if dry_run else "APPLIED"
    logger.info(
        f"Relink complete - {mode}",
        extra={
            "total_episodes": len(all_episodes),
            "already_valid": already_valid,
            "relinked": relinked,
            "no_match": no_match,
        },
    )

    if examples:
        print(f"\nExample relinks ({mode}):")
        print("-" * 70)
        for ex in examples:
            print(f"  Episode: {ex['episode_title']} (S{ex['season']}E{ex['episode']})")
            print(f"  Parent:  {ex['parent_title']}")
            print(f"  Old ID:  {ex['old_series_id']}")
            print(f"  New ID:  {ex['new_series_id']}")
            print()

    return {
        "total": len(all_episodes),
        "already_valid": already_valid,
        "relinked": relinked,
        "no_match": no_match,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Relink orphan episodes")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without applying them",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("Relink Orphan Episodes Script")
    print("=" * 60)

    if args.dry_run:
        print("MODE: DRY RUN (no changes will be made)")
    else:
        print("MODE: APPLY CHANGES")

    print()

    try:
        result = asyncio.run(relink_orphan_episodes(dry_run=args.dry_run))
        print("=" * 60)
        print(f"Total episodes: {result['total']}")
        print(f"Already valid: {result['already_valid']}")
        print(f"Relinked: {result['relinked']}")
        print(f"No match found: {result['no_match']}")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
