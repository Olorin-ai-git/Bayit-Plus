"""
Migration Script: Podcast Episode Translation Fields

This script adds translation-related fields to all existing podcast episodes.
New fields include: translations, available_languages, original_language,
translation_status, retry_count, and updated_at.

Usage:
    poetry run python scripts/migrate_podcast_episodes_translation.py [--dry-run]

Options:
    --dry-run    Show what would be changed without making modifications
"""

import asyncio
import sys
from datetime import datetime
from typing import Optional

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

# Add parent directory to path for imports
sys.path.insert(0, str(__file__).rsplit("/", 2)[0])

from app.core.config import settings
from app.models.content import PodcastEpisode


async def migrate_podcast_episodes(dry_run: bool = False) -> dict:
    """
    Migrate existing podcast episodes to have translation fields.

    Args:
        dry_run: If True, only report what would be changed without modifying data

    Returns:
        Dictionary with migration statistics
    """
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    # Initialize Beanie with PodcastEpisode model
    await init_beanie(database=db, document_models=[PodcastEpisode])

    stats = {
        "total_episodes": 0,
        "already_migrated": 0,
        "needs_migration": 0,
        "updated": 0,
        "errors": 0,
        "dry_run": dry_run,
        "started_at": datetime.utcnow().isoformat(),
    }

    # Count total episodes
    stats["total_episodes"] = await PodcastEpisode.count()
    print(f"📻 Total podcast episodes: {stats['total_episodes']}")

    # Find episodes without translation fields
    episodes_to_update = await PodcastEpisode.find(
        {
            "$or": [
                {"translations": {"$exists": False}},
                {"available_languages": {"$exists": False}},
                {"original_language": {"$exists": False}},
                {"translation_status": {"$exists": False}},
                {"retry_count": {"$exists": False}},
            ]
        }
    ).to_list()

    stats["already_migrated"] = stats["total_episodes"] - len(episodes_to_update)
    stats["needs_migration"] = len(episodes_to_update)

    print(f"✅ Episodes already migrated: {stats['already_migrated']}")
    print(f"🔄 Episodes needing migration: {stats['needs_migration']}")

    if dry_run:
        print("\n[DRY RUN] No changes will be made.")
        print(f"Would update {len(episodes_to_update)} episodes with translation fields:")
        print(f"  - translations: {{}}")
        print(f"  - available_languages: []")
        print(
            f"  - original_language: {settings.PODCAST_DEFAULT_ORIGINAL_LANGUAGE}"
        )
        print(f"  - translation_status: 'pending'")
        print(f"  - retry_count: 0")
        print(f"  - updated_at: <current timestamp>")
        return stats

    # Update episodes in batches
    batch_size = 100
    for i in range(0, len(episodes_to_update), batch_size):
        batch = episodes_to_update[i : i + batch_size]
        for episode in batch:
            try:
                # Add translation fields with defaults
                if not hasattr(episode, "translations") or episode.translations is None:
                    episode.translations = {}

                if (
                    not hasattr(episode, "available_languages")
                    or episode.available_languages is None
                ):
                    episode.available_languages = []

                if (
                    not hasattr(episode, "original_language")
                    or not episode.original_language
                ):
                    episode.original_language = (
                        settings.PODCAST_DEFAULT_ORIGINAL_LANGUAGE
                    )

                if (
                    not hasattr(episode, "translation_status")
                    or not episode.translation_status
                ):
                    episode.translation_status = "pending"

                if not hasattr(episode, "retry_count"):
                    episode.retry_count = 0

                # Update timestamp
                episode.updated_at = datetime.utcnow()

                # Save changes
                await episode.save()
                stats["updated"] += 1

            except Exception as e:
                print(f"❌ Error updating episode {episode.id} ({episode.title}): {e}")
                stats["errors"] += 1

        # Progress indicator
        progress = min(i + batch_size, len(episodes_to_update))
        print(
            f"📊 Progress: {progress}/{len(episodes_to_update)} ({(progress/len(episodes_to_update)*100):.1f}%)"
        )

    stats["completed_at"] = datetime.utcnow().isoformat()

    # Print summary
    print(f"\n{'='*60}")
    print(f"🎉 Migration completed!")
    print(f"{'='*60}")
    print(f"  Total episodes: {stats['total_episodes']}")
    print(f"  Already migrated: {stats['already_migrated']}")
    print(f"  Newly updated: {stats['updated']}")
    print(f"  Errors: {stats['errors']}")
    print(f"  Duration: {stats['started_at']} → {stats['completed_at']}")
    print(f"{'='*60}")

    if stats["errors"] > 0:
        print(f"\n⚠️  Warning: {stats['errors']} episodes failed to migrate")
        print(f"   Check error messages above for details")

    # Close database connection
    client.close()

    return stats


async def main():
    """Main entry point with argument parsing."""
    dry_run = "--dry-run" in sys.argv

    if dry_run:
        print("🔍 Running in DRY RUN mode - no changes will be made\n")
    else:
        print("⚡ Running in LIVE mode - will modify database\n")
        print("   Press Ctrl+C within 3 seconds to cancel...")
        try:
            await asyncio.sleep(3)
        except KeyboardInterrupt:
            print("\n\n❌ Migration cancelled by user")
            return

    # Run migration
    stats = await migrate_podcast_episodes(dry_run=dry_run)

    # Exit with error code if there were errors
    if stats["errors"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
