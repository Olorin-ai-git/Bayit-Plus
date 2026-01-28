#!/usr/bin/env python3
"""
Create Missing Series Parents Script
Creates parent series records for orphaned episodes and links them.
"""

import asyncio
import re
import sys
from datetime import datetime
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.core.config import get_settings
from app.core.logging_config import get_logger
from app.models.content import Content
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

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

    await init_beanie(database=db, document_models=[Content])

    logger.info("Connected to database")

    # Find all orphaned episodes (series_id exists but parent doesn't)
    all_episodes = await Content.find(
        {
            "series_id": {"$ne": None},
            "season": {"$ne": None},
            "episode": {"$ne": None},
        }
    ).to_list()

    logger.info(f"Found {len(all_episodes)} total episodes")

    # Group orphaned episodes by series name
    orphan_groups: dict[str, list[Content]] = {}

    for ep in all_episodes:
        # Check if parent exists
        try:
            parent = await Content.get(ep.series_id)
            if parent:
                continue  # Valid parent, skip
        except Exception:
            pass

        # Orphaned - extract series name
        series_name = extract_series_name(ep.title)
        if not series_name:
            logger.warning(f"Could not extract series name from: {ep.title}")
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
        seasons = set(ep.season for ep in episodes)
        total_episodes = len(episodes)

        if len(examples) < 10:
            examples.append({
                "series_name": series_name,
                "episode_count": len(episodes),
                "seasons": sorted(seasons),
            })

        if not dry_run:
            # Create parent series record
            parent = Content(
                title=series_name,
                is_series=True,
                season=None,
                episode=None,
                series_id=None,
                total_seasons=len(seasons),
                total_episodes=total_episodes,
                # Copy metadata from sample episode
                stream_url=sample.stream_url,
                stream_type=sample.stream_type,
                is_published=sample.is_published,
                category_id=sample.category_id,
                section_ids=sample.section_ids,
                primary_section_id=sample.primary_section_id,
                content_format="series",
                thumbnail=sample.thumbnail,
                backdrop=sample.backdrop,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            await parent.insert()

            # Update all episodes to point to new parent
            for ep in episodes:
                ep.series_id = str(parent.id)
                await ep.save()
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
