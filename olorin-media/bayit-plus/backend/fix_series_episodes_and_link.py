#!/usr/bin/env python3
"""
Fix series episodes by parsing titles and linking to parent series.

This script:
1. Parses episode information from titles (S01E01, etc.)
2. Populates season/episode fields if missing
3. Creates parent series if needed
4. Links episodes to parent series
"""
import asyncio
import re
from datetime import datetime
from typing import Optional, Tuple

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Episode patterns
EPISODE_PATTERNS = [
    r"[Ss](\d+)[Ee](\d+)",  # S01E01, s01e01
    r"[Ss](\d+)\s*[Ee](\d+)",  # S01 E01, s01 e01
    r"(\d+)x(\d+)",  # 1x01
    r"[Ss]eason\s*(\d+).*?[Ee]pisode\s*(\d+)",  # Season 1 Episode 01
]


def extract_season_episode(title: str) -> Optional[Tuple[int, int]]:
    """Extract season and episode numbers from title."""
    for pattern in EPISODE_PATTERNS:
        match = re.search(pattern, title, re.IGNORECASE)
        if match:
            season = int(match.group(1))
            episode = int(match.group(2))
            return (season, episode)
    return None


def extract_series_name(title: str) -> str:
    """Extract clean series name from title (remove episode info, quality tags, etc.)."""
    # Remove episode patterns
    clean_title = title
    for pattern in EPISODE_PATTERNS:
        clean_title = re.sub(pattern, "", clean_title, flags=re.IGNORECASE)

    # Remove common tags
    tags = [
        r"\d{4}",  # Year
        r"\d+p",  # Resolution (1080p, 720p)
        r"BluRay",
        r"WEB-?DL",
        r"HDTV",
        r"x264",
        r"x265",
        r"HEVC",
        r"AAC",
        r"AC3",
        r"DTS",
        r"\d+bit",
        r"Complete",
        r"Season \d+",
        r"Up To Season \d+",
        r"Extras",
        r"\(\d{4}\)",  # (2010)
        r"\+.*$",  # Everything after +
    ]

    for tag in tags:
        clean_title = re.sub(tag, "", clean_title, flags=re.IGNORECASE)

    # Clean up
    clean_title = re.sub(r"\s+", " ", clean_title)  # Multiple spaces
    clean_title = re.sub(r"[_\-]+", " ", clean_title)  # Underscores/dashes
    clean_title = clean_title.strip(" -_()")

    return clean_title


async def fix_and_link_series():
    """Main fix function."""
    logger.info("=" * 80)
    logger.info("Fixing Series Episodes and Linking")
    logger.info("=" * 80)

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    try:
        stats = {
            "episodes_parsed": 0,
            "parents_created": 0,
            "episodes_linked": 0,
            "errors": 0,
        }

        # Find all series content without series_id
        items = await db.content.find({
            "category_name": "Series",
            "$or": [
                {"series_id": None},
                {"series_id": ""},
                {"series_id": {"$exists": False}},
            ],
        }).to_list(length=None)

        logger.info(f"Found {len(items)} series items to process")
        logger.info("")

        # Group by series name
        series_groups = {}

        for item in items:
            title = item.get("title", "")

            # Try to extract episode info
            ep_info = extract_season_episode(title)

            if ep_info:
                # This is an episode
                season, episode = ep_info
                series_name = extract_series_name(title)

                # Update episode fields if not set
                if not item.get("season") or not item.get("episode"):
                    await db.content.update_one(
                        {"_id": item["_id"]},
                        {
                            "$set": {
                                "season": season,
                                "episode": episode,
                                "is_series": True,
                                "updated_at": datetime.utcnow(),
                            }
                        },
                    )
                    stats["episodes_parsed"] += 1
                    logger.info(
                        f"✅ Parsed: {title} → S{season:02d}E{episode:02d}",
                        extra={"series": series_name},
                    )

                # Group by series
                if series_name not in series_groups:
                    series_groups[series_name] = {"episodes": []}

                series_groups[series_name]["episodes"].append({
                    "id": item["_id"],
                    "title": title,
                    "season": season,
                    "episode": episode,
                })
            else:
                # This might be a parent series
                series_name = extract_series_name(title)

                if series_name not in series_groups:
                    series_groups[series_name] = {"episodes": []}

                if "parent" not in series_groups[series_name]:
                    series_groups[series_name]["parent"] = {
                        "id": item["_id"],
                        "title": item.get("title"),
                    }

        logger.info("")
        logger.info(f"Grouped into {len(series_groups)} series")
        logger.info("")

        # Process each series group
        for series_name, group in series_groups.items():
            logger.info(f"--- Processing: {series_name} ---")

            parent_id = None

            # Get or create parent
            if "parent" in group:
                parent_id = group["parent"]["id"]
                logger.info(f"Using existing parent: {group['parent']['title']}")
            elif group["episodes"]:
                # Create parent from first episode
                first_ep = group["episodes"][0]

                parent_doc = {
                    "title": series_name,
                    "category_name": "Series",
                    "is_series": True,
                    "stream_url": "",  # Empty for parent
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                }

                result = await db.content.insert_one(parent_doc)
                parent_id = result.inserted_id
                stats["parents_created"] += 1

                logger.info(f"✅ Created parent: {series_name}", extra={"parent_id": str(parent_id)})

            # Link episodes
            if parent_id and group["episodes"]:
                for ep in group["episodes"]:
                    await db.content.update_one(
                        {"_id": ep["id"]},
                        {
                            "$set": {
                                "series_id": str(parent_id),
                                "updated_at": datetime.utcnow(),
                            }
                        },
                    )
                    stats["episodes_linked"] += 1

                logger.info(f"✅ Linked {len(group['episodes'])} episodes to parent")

            logger.info("")

        # Summary
        logger.info("=" * 80)
        logger.info("Summary")
        logger.info("=" * 80)
        logger.info(
            "Fix completed",
            extra={
                "episodes_parsed": stats["episodes_parsed"],
                "parents_created": stats["parents_created"],
                "episodes_linked": stats["episodes_linked"],
                "errors": stats["errors"],
            },
        )
        logger.info("=" * 80)

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(fix_and_link_series())
