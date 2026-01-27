"""
Seed script to create the Audiobooks content section.

This script creates a new ContentSection entry for audiobooks in the platform taxonomy.
Run this once during initial setup to make audiobooks discoverable.

Usage:
    poetry run python scripts/seed_audiobooks_section.py
"""

import asyncio
import logging

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.content_taxonomy import ContentSection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_audiobooks_section():
    """Create the Audiobooks content section if it doesn't exist."""
    try:
        await connect_to_mongo()

        existing = await ContentSection.find_one({"slug": "audiobooks"})
        if existing:
            logger.info("Audiobooks section already exists. Skipping creation.")
            return

        audiobooks_section = ContentSection(
            slug="audiobooks",
            name_key="taxonomy.sections.audiobooks",
            description_key="taxonomy.sections.audiobooks.description",
            icon="book-audio",
            color="#8B7355",
            order=5,
            is_active=True,
            show_on_homepage=True,
            show_on_nav=True,
            supports_subcategories=False,
            default_content_format="audiobook",
        )
        await audiobooks_section.insert()
        logger.info(f"Created Audiobooks section with ID: {audiobooks_section.id}")

    except Exception as e:
        logger.error(f"Error seeding audiobooks section: {e}")
        raise
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(seed_audiobooks_section())
