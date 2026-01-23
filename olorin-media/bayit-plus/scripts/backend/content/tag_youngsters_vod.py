#!/usr/bin/env python3
"""
Tag Youngsters VOD Script

Automatically tags existing VOD content as youngsters content if it meets PG-13 criteria.
Excludes kids content and mature content, focuses on teen-appropriate ratings.

Usage:
    poetry run python scripts/content/tag_youngsters_vod.py --dry-run
    poetry run python scripts/content/tag_youngsters_vod.py --apply
    poetry run python scripts/content/tag_youngsters_vod.py --age-rating 14
"""

import argparse
import asyncio
import logging
import sys

# Add parent directory to path for imports
# Add parent directory to path for imports
from pathlib import Path
import os
project_root = os.getenv("PROJECT_ROOT", str(Path(__file__).parent.parent.parent.parent))
sys.path.insert(0, f"{project_root}/backend")

from datetime import datetime

from app.core.config import settings
from app.core.database import document_models
from app.models.content import Content
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# PG-13 and below content ratings (allowed for youngsters)
YOUNGSTERS_ALLOWED_RATINGS = ["G", "PG", "PG-13", "TV-G", "TV-PG", "TV-14"]

# Mature ratings (excluded from youngsters)
MATURE_RATINGS = ["R", "NC-17", "TV-MA", "Mature", "18+", "17+"]

# Teen-appropriate genres (higher relevance)
TEEN_GENRES = [
    "teen",
    "young adult",
    "coming of age",
    "high school",
    "college",
    "adventure",
    "sci-fi",
    "fantasy",
    "action",
    "mystery",
    "thriller",
    "comedy",
    "romance",
    "drama",
    "animation",
    "documentary",
]


def calculate_age_rating(content: Content) -> int:
    """
    Calculate appropriate age rating for youngsters content.

    Returns:
        12, 14, or 17 based on content rating
    """
    rating = content.rating or ""

    if rating in ["G", "TV-G"]:
        return 12  # General audiences
    elif rating in ["PG", "TV-PG"]:
        return 12  # Parental guidance suggested
    elif rating in ["PG-13", "TV-14"]:
        return 14  # Teens 13+
    else:
        return 17  # Default to highest youngsters age


async def tag_vod_content(dry_run: bool = True, age_rating: int = None):
    """
    Tag existing VOD content as youngsters content.

    Args:
        dry_run: If True, only show what would be tagged without making changes
        age_rating: If provided, only tag content for this age rating
    """
    # Build filter for candidate content
    content_filter = {
        "is_published": True,
        # Exclude kids content
        "is_kids_content": {"$ne": True},
        # Exclude already tagged youngsters content
        "is_youngsters_content": {"$ne": True},
        # Only VOD/movies/series (not live, radio, podcasts)
        "content_type": {"$in": ["movie", "vod", "series", "episode"]},
    }

    # Filter by PG-13 ratings
    content_filter["$or"] = [
        {"rating": {"$in": YOUNGSTERS_ALLOWED_RATINGS}},
        {"rating": None},  # Include unrated content for manual review
        {"rating": ""},
    ]

    # Exclude mature ratings explicitly
    content_filter["rating"] = {"$nin": MATURE_RATINGS}

    logger.info("Finding candidate VOD content for youngsters tagging...")
    candidates = await Content.find(content_filter).to_list()

    logger.info(f"Found {len(candidates)} candidate items")

    tagged_count = 0
    skipped_count = 0
    results = {
        "total_candidates": len(candidates),
        "tagged": 0,
        "skipped": 0,
        "by_age_rating": {
            "age_12": 0,
            "age_14": 0,
            "age_17": 0,
        },
        "dry_run": dry_run,
    }

    for content in candidates:
        calculated_age = calculate_age_rating(content)

        # Skip if age rating filter specified and doesn't match
        if age_rating and calculated_age != age_rating:
            skipped_count += 1
            continue

        logger.info(
            f"{'[DRY RUN] ' if dry_run else ''}Tagging: {content.title} (Rating: {content.rating}, Age: {calculated_age})"
        )

        if not dry_run:
            # Tag as youngsters content
            content.is_youngsters_content = True
            content.youngsters_age_rating = calculated_age
            content.youngsters_moderation_status = "pending"  # Requires manual review
            content.updated_at = datetime.utcnow()
            await content.save()

        tagged_count += 1
        results["tagged"] += 1

        # Track by age rating
        if calculated_age == 12:
            results["by_age_rating"]["age_12"] += 1
        elif calculated_age == 14:
            results["by_age_rating"]["age_14"] += 1
        elif calculated_age == 17:
            results["by_age_rating"]["age_17"] += 1

    results["skipped"] = skipped_count

    return results


async def main():
    parser = argparse.ArgumentParser(
        description="Tag VOD content as youngsters content"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be tagged without making changes",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually apply the tags (not a dry run)",
    )
    parser.add_argument(
        "--age-rating",
        type=int,
        choices=[12, 14, 17],
        help="Only tag content for specific age rating",
    )

    args = parser.parse_args()

    if not args.dry_run and not args.apply:
        logger.warning(
            "Neither --dry-run nor --apply specified. Defaulting to --dry-run for safety."
        )
        args.dry_run = True

    # Initialize database connection
    logger.info("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.DB_NAME], document_models=document_models
    )
    logger.info("Database initialized")

    try:
        logger.info("=" * 80)
        logger.info("YOUNGSTERS VOD TAGGING")
        logger.info("=" * 80)
        logger.info(
            f"Mode: {'DRY RUN (no changes)' if args.dry_run else 'APPLY CHANGES'}"
        )
        if args.age_rating:
            logger.info(f"Age Rating Filter: {args.age_rating}+")
        logger.info("=" * 80)

        results = await tag_vod_content(
            dry_run=args.dry_run,
            age_rating=args.age_rating,
        )

        logger.info("=" * 80)
        logger.info("TAGGING COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Total Candidates: {results['total_candidates']}")
        logger.info(f"Tagged: {results['tagged']}")
        logger.info(f"Skipped: {results['skipped']}")
        logger.info(f"Age 12+: {results['by_age_rating']['age_12']}")
        logger.info(f"Age 14+: {results['by_age_rating']['age_14']}")
        logger.info(f"Age 17+: {results['by_age_rating']['age_17']}")

        if args.dry_run:
            logger.info("")
            logger.info("This was a DRY RUN. No changes were made.")
            logger.info("Run with --apply to actually tag the content.")

    except Exception as e:
        logger.error(f"Error during tagging: {e}", exc_info=True)
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
