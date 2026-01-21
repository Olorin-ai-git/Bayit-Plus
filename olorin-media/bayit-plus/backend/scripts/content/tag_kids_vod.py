#!/usr/bin/env python3
"""
Tag Kids VOD Content Script

Reviews existing VOD library and tags family-friendly content as kids content.
Sets is_kids_content: true, assigns age_rating, and adds educational_tags.

Usage:
    poetry run python scripts/content/tag_kids_vod.py --dry-run
    poetry run python scripts/content/tag_kids_vod.py --execute
    poetry run python scripts/content/tag_kids_vod.py --category-id <id> --execute
"""

import asyncio
import argparse
import logging
import sys
from datetime import datetime
from typing import List, Dict, Any, Optional

# Add parent directory to path for imports
sys.path.insert(0, "/Users/olorin/Documents/olorin/backend")

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Content
from app.models.content_taxonomy import ContentSection

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# Keywords that indicate kids-friendly content
KIDS_KEYWORDS = {
    # Hebrew
    "ילדים", "ילדות", "משפחה", "סרט מצויר", "אנימציה", "חינוכי",
    "לימודי", "שירי ילדים", "סיפורים לילדים", "עברית לילדים",
    # English
    "kids", "children", "family", "animated", "cartoon", "educational",
    "learning", "nursery", "preschool", "toddler", "child-friendly",
    # Spanish
    "ninos", "infantil", "familia", "educativo", "animado",
}

# Content ratings that are kid-appropriate
KIDS_RATINGS = {"G", "TV-G", "TV-Y", "TV-Y7", "PG", "TV-PG", "U", "0+", "3+", "7+"}

# Genres that are typically kid-friendly
KIDS_GENRES = {
    "animation", "family", "children", "educational", "musical",
    "אנימציה", "משפחה", "ילדים", "חינוכי",
}


def determine_age_rating(content: Content) -> int:
    """
    Determine appropriate age rating based on content metadata.

    Returns:
        Minimum age (3, 5, 7, 10, or 12).
    """
    rating = str(content.content_rating or content.rating or "").upper()

    # Map content ratings to age ratings
    if rating in {"G", "TV-G", "TV-Y", "0+", "U"}:
        return 3
    if rating in {"TV-Y7", "7+"}:
        return 7
    if rating in {"PG", "TV-PG"}:
        return 10
    if rating in {"PG-13", "TV-14", "12+", "12A"}:
        return 12

    # Default to age 7 if rating unclear
    return 7


def extract_educational_tags(content: Content) -> List[str]:
    """
    Extract educational tags from content metadata.

    Returns:
        List of educational tags.
    """
    tags = set()
    text = f"{content.title or ''} {content.description or ''} {content.genre or ''}".lower()

    # Language tags
    if any(word in text for word in ["hebrew", "עברית", "hebreo"]):
        tags.add("hebrew")
    if any(word in text for word in ["english", "אנגלית", "ingles"]):
        tags.add("english")
    if any(word in text for word in ["spanish", "ספרדית", "espanol"]):
        tags.add("spanish")

    # Subject tags
    if any(word in text for word in ["math", "מתמטיקה", "number", "מספר"]):
        tags.add("math")
    if any(word in text for word in ["science", "מדע", "ciencia"]):
        tags.add("science")
    if any(word in text for word in ["music", "מוזיקה", "musica", "song", "שיר"]):
        tags.add("music")
    if any(word in text for word in ["story", "סיפור", "cuento", "tale"]):
        tags.add("stories")
    if any(word in text for word in ["animal", "חיה", "animal", "zoo"]):
        tags.add("animals")
    if any(word in text for word in ["alphabet", "alef", "אלף", "abc"]):
        tags.add("alphabet")

    # Jewish/cultural tags
    if any(word in text for word in ["jewish", "יהודי", "judio", "torah", "תורה"]):
        tags.add("jewish")
    if any(word in text for word in ["shabbat", "שבת", "sabbath"]):
        tags.add("shabbat")
    if any(word in text for word in ["holiday", "חג", "purim", "chanukah", "חנוכה"]):
        tags.add("holidays")

    return list(tags)


def is_kids_content(content: Content) -> bool:
    """
    Determine if content is appropriate for kids section.

    Returns:
        True if content should be tagged as kids content.
    """
    # Check content rating
    rating = str(content.content_rating or content.rating or "").upper()
    if rating in KIDS_RATINGS:
        return True

    # Check genres
    genre = str(content.genre or "").lower()
    if any(g in genre for g in KIDS_GENRES):
        return True

    # Check title and description for kids keywords
    text = f"{content.title or ''} {content.description or ''}".lower()
    if any(keyword in text for keyword in KIDS_KEYWORDS):
        return True

    return False


async def tag_content(
    content: Content,
    dry_run: bool = True,
) -> Dict[str, Any]:
    """
    Tag a single content item as kids content if appropriate.

    Returns:
        Dict with tagging results.
    """
    if not is_kids_content(content):
        return {
            "id": str(content.id),
            "title": content.title[:50],
            "action": "skipped",
            "reason": "Not identified as kids content",
        }

    if content.is_kids_content:
        return {
            "id": str(content.id),
            "title": content.title[:50],
            "action": "skipped",
            "reason": "Already tagged as kids content",
        }

    age_rating = determine_age_rating(content)
    educational_tags = extract_educational_tags(content)

    if not dry_run:
        content.is_kids_content = True
        content.age_rating = age_rating
        content.content_rating = content.content_rating or "G"
        content.educational_tags = educational_tags
        content.updated_at = datetime.utcnow()
        await content.save()

    return {
        "id": str(content.id),
        "title": content.title[:50],
        "action": "tagged" if not dry_run else "would_tag",
        "age_rating": age_rating,
        "educational_tags": educational_tags,
    }


async def tag_kids_vod_content(
    category_id: Optional[str] = None,
    dry_run: bool = True,
    limit: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Tag existing VOD content as kids content.

    Args:
        category_id: Optionally filter by category
        dry_run: If True, only report what would be done
        limit: Maximum number of items to process

    Returns:
        Summary of tagging operation.
    """
    query = {"is_kids_content": False}
    if category_id:
        query["category_id"] = category_id

    # Get content to process
    content_cursor = Content.find(query)
    if limit:
        content_cursor = content_cursor.limit(limit)

    content_items = await content_cursor.to_list()

    tagged_count = 0
    skipped_count = 0
    results = []

    logger.info(f"Processing {len(content_items)} content items...")

    for content in content_items:
        result = await tag_content(content, dry_run)
        results.append(result)

        if result["action"] in ("tagged", "would_tag"):
            tagged_count += 1
        else:
            skipped_count += 1

    return {
        "message": "Kids VOD tagging completed" if not dry_run else "Kids VOD tagging dry run",
        "dry_run": dry_run,
        "total_processed": len(content_items),
        "tagged": tagged_count,
        "skipped": skipped_count,
        "results": results[:50],  # Limit results in response
    }


async def main():
    """Main entry point for the tagging script."""
    parser = argparse.ArgumentParser(description="Tag existing VOD content as kids content")
    parser.add_argument("--dry-run", action="store_true", help="Only report what would be done")
    parser.add_argument("--execute", action="store_true", help="Actually tag the content")
    parser.add_argument("--category-id", type=str, help="Filter by category ID")
    parser.add_argument("--limit", type=int, help="Maximum number of items to process")

    args = parser.parse_args()

    if not args.dry_run and not args.execute:
        logger.error("Must specify --dry-run or --execute")
        sys.exit(1)

    dry_run = not args.execute

    # Initialize database
    logger.info("Connecting to database...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Content, Category],
    )

    logger.info(f"Starting kids VOD tagging (dry_run={dry_run})...")

    result = await tag_kids_vod_content(
        category_id=args.category_id,
        dry_run=dry_run,
        limit=args.limit,
    )

    logger.info(f"Results: {result['message']}")
    logger.info(f"  Total processed: {result['total_processed']}")
    logger.info(f"  Tagged: {result['tagged']}")
    logger.info(f"  Skipped: {result['skipped']}")

    if dry_run:
        logger.info("\nThis was a dry run. Use --execute to apply changes.")

    # Show sample results
    if result["results"]:
        logger.info("\nSample results:")
        for r in result["results"][:10]:
            logger.info(f"  [{r['action']}] {r['title']}")


if __name__ == "__main__":
    asyncio.run(main())
