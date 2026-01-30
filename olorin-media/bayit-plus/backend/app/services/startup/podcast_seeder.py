"""
Podcast seeder module for initializing default podcasts.

This module handles the creation of default podcasts on server startup.
Podcasts are only created if they don't already exist (idempotent).
"""

import logging

from app.models.content import Podcast
from app.services.startup.defaults.podcasts import DEFAULT_PODCASTS

logger = logging.getLogger(__name__)


async def init_default_podcasts() -> int:
    """
    Initialize default podcasts on startup.

    Checks each podcast by title. Creates only those that don't exist.
    Returns the count of podcasts created.
    """
    created_count = 0

    try:
        for config in DEFAULT_PODCASTS:
            existing = await Podcast.find_one(
                {"title": config["title"]}
            )

            if existing:
                logger.info(
                    f"Podcast '{config['title']}' already exists: {existing.id}"
                )
                continue

            podcast = Podcast(
                title=config["title"],
                title_en=config.get("title_en"),
                description=config.get("description"),
                description_en=config.get("description_en"),
                author=config.get("author"),
                author_en=config.get("author_en"),
                cover=config.get("cover"),
                category=config.get("category"),
                category_en=config.get("category_en"),
                culture_id=config.get("culture_id", "israeli"),
                rss_feed=config.get("rss_feed"),
                is_featured=config.get("is_featured", False),
                order=config.get("order", 0),
                is_active=True,
            )

            await podcast.insert()
            logger.info(
                f"Created podcast '{config['title']}': {podcast.id}"
            )
            created_count += 1

        if created_count > 0:
            logger.info(
                f"Podcast seeding complete: {created_count} podcasts created"
            )
        else:
            logger.info("Podcast seeding complete: all podcasts already exist")

    except Exception as e:
        logger.error(
            f"Error initializing default podcasts: {e}", exc_info=True
        )
        raise

    return created_count
