#!/usr/bin/env python3
"""
Migration Script: Fix Subtitle Language Names
==============================================

This script updates all subtitle tracks in the database to use the correct
language_name from the centralized language mapping.

Background:
-----------
Previously, subtitle tracks were created with incomplete language mappings,
causing some languages to display as codes (DA, DE, ET) instead of full names.

This script:
1. Queries all SubtitleTrackDoc documents
2. Compares language_name with the correct value from get_language_name()
3. Updates any documents with incorrect language_name values

Usage:
------
    poetry run python scripts/fix_subtitle_language_names.py

Options:
    --dry-run    Show what would be updated without making changes
    --verbose    Show detailed progress

Example:
--------
    # Preview changes without updating
    poetry run python scripts/fix_subtitle_language_names.py --dry-run

    # Apply changes
    poetry run python scripts/fix_subtitle_language_names.py

Author: Olorin AI
Date: 2026-01-31
"""

import argparse
import asyncio
import sys
from datetime import datetime
from typing import List, Tuple

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.subtitles import SubtitleTrackDoc, get_language_name

logger = get_logger(__name__)


async def init_db():
    """Initialize database connection"""
    client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(
        database=client[settings.mongodb_database],
        document_models=[SubtitleTrackDoc],
    )
    logger.info("Database initialized", extra={"database": settings.mongodb_database})


async def find_tracks_with_incorrect_names(verbose: bool = False) -> List[Tuple[SubtitleTrackDoc, str, str]]:
    """
    Find all subtitle tracks with incorrect language_name values.

    Returns:
        List of tuples: (track, current_name, correct_name)
    """
    tracks = await SubtitleTrackDoc.find_all().to_list()
    incorrect_tracks = []

    for track in tracks:
        correct_name = get_language_name(track.language)

        if track.language_name != correct_name:
            incorrect_tracks.append((track, track.language_name, correct_name))

            if verbose:
                logger.info(
                    "Found incorrect language name",
                    extra={
                        "track_id": str(track.id),
                        "content_id": track.content_id,
                        "language": track.language,
                        "current_name": track.language_name,
                        "correct_name": correct_name,
                    },
                )

    return incorrect_tracks


async def fix_language_names(dry_run: bool = False, verbose: bool = False) -> Tuple[int, int]:
    """
    Update subtitle tracks with incorrect language_name values.

    Args:
        dry_run: If True, only show what would be updated without making changes
        verbose: If True, show detailed progress

    Returns:
        Tuple of (total_checked, total_updated)
    """
    logger.info("Starting language name migration", extra={"dry_run": dry_run})

    # Find tracks with incorrect names
    incorrect_tracks = await find_tracks_with_incorrect_names(verbose=verbose)
    total_checked = await SubtitleTrackDoc.count()
    total_to_update = len(incorrect_tracks)

    logger.info(
        "Migration scan complete",
        extra={
            "total_tracks": total_checked,
            "tracks_to_update": total_to_update,
            "dry_run": dry_run,
        },
    )

    if total_to_update == 0:
        logger.info("No tracks need updating")
        return total_checked, 0

    # Update tracks
    updated_count = 0

    for track, current_name, correct_name in incorrect_tracks:
        if verbose or dry_run:
            logger.info(
                f"{'[DRY RUN] Would update' if dry_run else 'Updating'} track",
                extra={
                    "track_id": str(track.id),
                    "content_id": track.content_id,
                    "language": track.language,
                    "from": current_name,
                    "to": correct_name,
                },
            )

        if not dry_run:
            track.language_name = correct_name
            track.updated_at = datetime.utcnow()
            await track.save()
            updated_count += 1

    if dry_run:
        logger.info(
            "[DRY RUN] Migration simulation complete",
            extra={"would_update": total_to_update},
        )
    else:
        logger.info(
            "Migration complete",
            extra={
                "total_checked": total_checked,
                "total_updated": updated_count,
            },
        )

    return total_checked, updated_count if not dry_run else total_to_update


async def main(dry_run: bool = False, verbose: bool = False):
    """Main migration function"""
    try:
        await init_db()
        total_checked, total_updated = await fix_language_names(dry_run=dry_run, verbose=verbose)

        print("\n" + "=" * 70)
        print("SUBTITLE LANGUAGE NAME MIGRATION SUMMARY")
        print("=" * 70)
        print(f"Total tracks checked:  {total_checked}")
        print(f"Tracks updated:        {total_updated}")

        if dry_run:
            print("\n[DRY RUN MODE] No changes were made to the database.")
            print("Run without --dry-run to apply these changes.")
        else:
            print("\nMigration completed successfully!")

        print("=" * 70 + "\n")

    except Exception as e:
        logger.error("Migration failed", extra={"error": str(e)})
        print(f"\nERROR: Migration failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Fix subtitle language names in database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Preview changes
  %(prog)s --dry-run

  # Apply changes with verbose output
  %(prog)s --verbose

  # Preview with verbose output
  %(prog)s --dry-run --verbose
        """,
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be updated without making changes",
    )

    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Show detailed progress for each track",
    )

    args = parser.parse_args()

    asyncio.run(main(dry_run=args.dry_run, verbose=args.verbose))
