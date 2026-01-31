"""
Clean HTML entities from trivia facts in the database.

Fixes double-encoded characters like &#x27; (apostrophe) that were
previously HTML-escaped before being sent to React (which auto-escapes).

Run: poetry run python scripts/clean_trivia_html_entities.py
"""

import asyncio
import html
import logging
import re
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.trivia import ContentTrivia

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def decode_html_entities(text: str) -> str:
    """Decode HTML entities back to normal characters."""
    if not text:
        return text
    # Decode HTML entities like &#x27; -> '
    decoded = html.unescape(text)
    return decoded


async def clean_trivia_facts():
    """Clean HTML entities from all trivia facts in the database."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    await init_beanie(database=db, document_models=[ContentTrivia])

    logger.info("Scanning trivia facts for HTML entities...")

    # Pattern to detect HTML entities
    entity_pattern = re.compile(r"&#x?[0-9a-fA-F]+;|&\w+;")

    updated_count = 0
    total_facts_cleaned = 0

    async for trivia in ContentTrivia.find_all():
        needs_update = False
        cleaned_facts = []

        for fact in trivia.facts:
            fact_dict = fact.model_dump() if hasattr(fact, "model_dump") else dict(fact)
            fact_changed = False

            # Check and clean each text field
            for field in ["text", "text_en", "text_es"]:
                if field in fact_dict and fact_dict[field]:
                    original = fact_dict[field]
                    if entity_pattern.search(original):
                        fact_dict[field] = decode_html_entities(original)
                        fact_changed = True
                        logger.info(
                            f"Cleaned {field}: {original[:50]}... -> {fact_dict[field][:50]}..."
                        )

            if fact_changed:
                needs_update = True
                total_facts_cleaned += 1

            cleaned_facts.append(fact_dict)

        if needs_update:
            # Update the document
            collection = ContentTrivia.get_pymongo_collection()
            await collection.update_one(
                {"_id": trivia.id},
                {"$set": {"facts": cleaned_facts}},
            )
            updated_count += 1
            logger.info(f"Updated trivia for content_id: {trivia.content_id}")

    logger.info(f"Cleanup complete: {updated_count} documents updated, {total_facts_cleaned} facts cleaned")

    client.close()


if __name__ == "__main__":
    asyncio.run(clean_trivia_facts())
