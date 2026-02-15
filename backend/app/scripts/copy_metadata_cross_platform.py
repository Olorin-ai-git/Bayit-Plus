"""
Cross-Platform Metadata Copying Script

Copies posters and metadata from items that have them to items that don't.

This script:
1. Groups content by title/ID to find duplicate entries
2. Identifies the most complete version of each item
3. Copies missing metadata from complete versions to incomplete ones
4. Enriches radio station descriptions with genre-based defaults

Usage:
    python -m app.scripts.copy_metadata_cross_platform [--dry-run]
"""

import asyncio
import logging
from collections import defaultdict
from typing import Dict, List

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Podcast, RadioStation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Radio station descriptions by genre
RADIO_DESCRIPTIONS = {
    "news": "Stay informed with the latest news and current affairs coverage",
    "music": "Your soundtrack for every moment with great music selection",
    "pop": "Hit music and contemporary pop favorites",
    "oldies": "Classic hits and nostalgic favorites from past decades",
    "mixed": "Diverse programming with music, talk, and entertainment",
    "russian": "Russian-language programming and music",
    "religious": "Spiritual content and religious programming",
    "culture": "Cultural programming, arts, and intellectual discussion",
    "ambient": "Relaxing background music and atmospheric sounds",
    "hip-hop": "Hip-hop, rap, and urban music",
    "arabic": "Arabic-language programming and Middle Eastern music",
    "lifestyle": "Lifestyle, wellness, and personal development content",
    "alternative": "Alternative music and independent artists",
}


class MetadataCopier:
    """Copies metadata across platforms and enriches missing data."""

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.stats = {"copied": 0, "enriched": 0, "skipped": 0}
        self.db = None

    async def initialize(self):
        """Initialize database connection."""
        logger.info("Connecting to MongoDB...")
        client = AsyncIOMotorClient(
            settings.MONGODB_URI if hasattr(settings, "MONGODB_URI") else settings.MONGODB_URL
        )
        self.db = client[settings.MONGODB_DB_NAME]

        # Initialize Beanie for RadioStation and Podcast
        await init_beanie(
            database=self.db,
            document_models=[RadioStation, Podcast],
        )
        logger.info("✓ Connected to database")

    async def enrich_radio_descriptions(self):
        """Add descriptions to radio stations based on genre."""
        logger.info("=" * 80)
        logger.info("ENRICHING RADIO STATION DESCRIPTIONS")
        logger.info("=" * 80)

        stations = await RadioStation.find({"is_active": True}).to_list()
        updated = 0

        for station in stations:
            if not station.description and station.genre:
                # Generate description based on genre
                genre_desc = RADIO_DESCRIPTIONS.get(station.genre, "Quality radio programming")
                description = f"{station.name} - {genre_desc}"

                logger.info(f"  • {station.name}")
                logger.info(f"    Adding: {description}")

                if not self.dry_run:
                    station.description = description
                    station.description_en = description
                    await station.save()

                updated += 1
                self.stats["enriched"] += 1

        logger.info(f"\nEnriched {updated} radio stations")

    async def copy_audiobook_metadata(self):
        """Copy metadata between audiobook entries with same titles."""
        logger.info("=" * 80)
        logger.info("COPYING AUDIOBOOK METADATA")
        logger.info("=" * 80)

        # Get all audiobooks
        audiobooks_cursor = self.db.content.find({
            "$or": [
                {"content_format": "audiobook"},
                {"section_ids": "audiobooks"}
            ]
        })
        audiobooks = await audiobooks_cursor.to_list(length=None)

        # Group by base title (removing chapter info)
        by_title = defaultdict(list)
        for book in audiobooks:
            title = book.get("title", "")
            # Remove chapter info to group related items
            base_title = title.split(" - Chapter")[0].split(" - Issues")[0]
            by_title[base_title].append(book)

        # Process each group
        copied = 0
        for base_title, books in by_title.items():
            if len(books) < 2:
                continue

            # Find the most complete version
            complete_book = max(books, key=lambda b: (
                bool(b.get("description")),
                bool(b.get("duration")),
                bool(b.get("author")),
                bool(b.get("thumbnail") or b.get("poster_url"))
            ))

            # Copy to incomplete versions
            for book in books:
                if book["_id"] == complete_book["_id"]:
                    continue

                update_doc = {}

                if not book.get("description") and complete_book.get("description"):
                    update_doc["description"] = complete_book["description"]

                if not book.get("author") and complete_book.get("author"):
                    update_doc["author"] = complete_book["author"]

                if not book.get("thumbnail") and complete_book.get("thumbnail"):
                    update_doc["thumbnail"] = complete_book["thumbnail"]

                if not book.get("poster_url") and complete_book.get("poster_url"):
                    update_doc["poster_url"] = complete_book["poster_url"]

                if update_doc:
                    logger.info(f"  • {book.get('title')}")
                    logger.info(f"    Copying: {', '.join(update_doc.keys())}")

                    if not self.dry_run:
                        await self.db.content.update_one(
                            {"_id": book["_id"]},
                            {"$set": update_doc}
                        )

                    copied += 1
                    self.stats["copied"] += 1

        logger.info(f"\nCopied metadata to {copied} audiobooks")

    async def run(self):
        """Run the copying process."""
        await self.initialize()

        logger.info(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE'}")
        logger.info("")

        await self.enrich_radio_descriptions()
        await self.copy_audiobook_metadata()

        # Summary
        logger.info("")
        logger.info("=" * 80)
        logger.info("SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Enriched: {self.stats['enriched']}")
        logger.info(f"Copied:   {self.stats['copied']}")
        logger.info(f"Skipped:  {self.stats['skipped']}")
        logger.info("=" * 80)


async def main():
    """Entry point."""
    import sys

    dry_run = "--dry-run" in sys.argv
    copier = MetadataCopier(dry_run=dry_run)
    await copier.run()


if __name__ == "__main__":
    asyncio.run(main())
