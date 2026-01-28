#!/usr/bin/env python3
"""
Episode Title Cleanup Script
Cleans episode titles to consistent format: "{SeriesTitle}-Season{N}-Episode{N}"

Examples:
  - "Game of Thrones" series, season 1, episode 3:
    "Game Of Thrones-Season1-Episode3"
"""

import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.core.config import get_settings
from app.core.logging_config import get_logger
from app.models.content import Content
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

logger = get_logger(__name__)


def format_episode_title(series_title: str, season: int, episode: int) -> str:
    """Format episode title as: SeriesTitle-Season{N}-Episode{N}"""
    clean_series = series_title.strip()
    return f"{clean_series}-Season{season}-Episode{episode}"


async def clean_episode_titles(dry_run: bool = False):
    """Clean all episode titles to consistent format."""
    settings = get_settings()

    logger.info("Connecting to MongoDB", extra={"url": settings.MONGODB_URL})
    client = AsyncIOMotorClient(settings.MONGODB_URL)

    await init_beanie(
        database=client[settings.MONGODB_DB_NAME], document_models=[Content]
    )

    logger.info("Connected to database")

    # Find all episodes (have series_id, season, and episode set)
    episodes = await Content.find(
        {
            "series_id": {"$ne": None},
            "season": {"$ne": None},
            "episode": {"$ne": None},
        }
    ).to_list()

    logger.info("Found episodes to process", extra={"count": len(episodes)})

    # Cache series parents to avoid repeated lookups
    series_cache: dict[str, Content] = {}

    updated_count = 0
    skipped_count = 0
    error_count = 0
    examples = []

    for ep in episodes:
        try:
            # Get parent series (from cache or fetch)
            series_id = ep.series_id
            if series_id not in series_cache:
                parent = await Content.get(series_id)
                if parent:
                    series_cache[series_id] = parent
                else:
                    logger.warning(
                        "Parent series not found",
                        extra={"episode_id": str(ep.id), "series_id": series_id},
                    )
                    error_count += 1
                    continue

            parent = series_cache[series_id]

            # Generate clean title
            new_title = format_episode_title(parent.title, ep.season, ep.episode)

            # Check if title already correct
            if ep.title == new_title:
                skipped_count += 1
                continue

            # Save example
            if len(examples) < 15:
                examples.append(
                    {
                        "id": str(ep.id),
                        "original": ep.title,
                        "new": new_title,
                        "series": parent.title,
                        "season": ep.season,
                        "episode": ep.episode,
                    }
                )

            if not dry_run:
                ep.title = new_title
                await ep.save()

            updated_count += 1

            if updated_count % 50 == 0:
                logger.info("Progress update", extra={"updated": updated_count})

        except Exception as e:
            logger.error(
                "Error processing episode",
                extra={"episode_id": str(ep.id), "error": str(e)},
            )
            error_count += 1

    # Summary
    mode = "DRY RUN" if dry_run else "APPLIED"
    logger.info(
        f"Episode title cleanup complete - {mode}",
        extra={
            "total_episodes": len(episodes),
            "updated": updated_count,
            "skipped_already_correct": skipped_count,
            "errors": error_count,
        },
    )

    # Print examples
    if examples:
        print(f"\nExample transformations ({mode}):")
        print("-" * 60)
        for ex in examples:
            print(f"  Series: {ex['series']}")
            print(f"  Original: {ex['original']}")
            print(f"  New:      {ex['new']}")
            print()

    return {
        "total": len(episodes),
        "updated": updated_count,
        "skipped": skipped_count,
        "errors": error_count,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Clean episode titles")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without applying them",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("Episode Title Cleanup Script")
    print("Format: {SeriesTitle}-Season{N}-Episode{N}")
    print("=" * 60)

    if args.dry_run:
        print("MODE: DRY RUN (no changes will be made)")
    else:
        print("MODE: APPLY CHANGES")

    print()

    try:
        result = asyncio.run(clean_episode_titles(dry_run=args.dry_run))
        print("=" * 60)
        print(f"Total episodes: {result['total']}")
        print(f"Updated: {result['updated']}")
        print(f"Already correct: {result['skipped']}")
        print(f"Errors: {result['errors']}")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
