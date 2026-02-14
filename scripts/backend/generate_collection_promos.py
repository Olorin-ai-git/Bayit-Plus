#!/usr/bin/env python3
"""
Script: Generate AI promotional text for all collections
Generates promotional text in all 10 languages for each collection
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import connect_to_mongo
from app.core.logging_config import get_logger
from app.models.content import Content
from app.services.collection_promo_service import collection_promo_service

logger = get_logger(__name__)

# All supported languages
LANGUAGES = {
    "he": "promo_text",
    "en": "promo_text_en",
    "es": "promo_text_es",
    "fr": "promo_text_fr",
    "it": "promo_text_it",
    "hi": "promo_text_hi",
    "ta": "promo_text_ta",
    "bn": "promo_text_bn",
    "ja": "promo_text_ja",
    "zh": "promo_text_zh",
}


async def generate_all_promos():
    """Generate promotional text for all collections"""
    logger.info("=" * 60)
    logger.info("AI PROMOTIONAL TEXT GENERATION")
    logger.info("=" * 60)

    # Connect to database
    logger.info("Connecting to MongoDB...")
    await connect_to_mongo()
    logger.info("Connected to MongoDB")

    # Find all collection parent documents
    collections = await Content.find({"is_collection_parent": True}).to_list()
    logger.info(f"Found {len(collections)} collections")

    if not collections:
        logger.warning("No collections found")
        return

    generated_count = 0
    skipped_count = 0
    error_count = 0

    for idx, collection in enumerate(collections, 1):
        collection_name = collection.title or "Unknown Collection"
        logger.info(f"[{idx}/{len(collections)}] Processing: {collection_name}")

        # Get movies in this collection
        movies = await Content.find(
            {
                "collection_parent_id": str(collection.id),
            }
        ).to_list()

        if not movies:
            logger.warning(f"  ⚠️  No movies found for collection")
            skipped_count += 1
            continue

        # Extract movie titles and genres
        movie_titles = [m.title for m in movies if m.title]
        genres = []
        for movie in movies:
            if movie.genres:
                genres.extend(movie.genres)
        genres = list(set(genres))  # Remove duplicates

        if not movie_titles:
            logger.warning(f"  ⚠️  No movie titles found")
            skipped_count += 1
            continue

        # Generate promotional text for each language
        promo_updates = {}
        lang_success = 0
        lang_errors = 0

        for lang_code, field_name in LANGUAGES.items():
            # Skip if already has promo text
            current_value = getattr(collection, field_name, None)
            if current_value:
                logger.info(f"  ✓ {lang_code}: Already has promo text")
                continue

            try:
                promo_text = await collection_promo_service.generate_promo(
                    collection_name=collection_name,
                    movie_titles=movie_titles,
                    genres=genres,
                    language=lang_code,
                    use_cache=True,
                )

                promo_updates[field_name] = promo_text
                lang_success += 1
                logger.info(f"  ✓ {lang_code}: {promo_text[:80]}...")

            except Exception as e:
                lang_errors += 1
                logger.error(
                    f"  ✗ {lang_code}: Error - {e}",
                    exc_info=False,
                )

        # Update collection with all generated promos
        if promo_updates:
            try:
                await collection.set(promo_updates)
                generated_count += 1
                logger.info(
                    f"  ✅ Updated {len(promo_updates)} languages "
                    f"(success: {lang_success}, errors: {lang_errors})"
                )
            except Exception as e:
                error_count += 1
                logger.error(f"  ✗ Failed to save promo text: {e}")
        else:
            logger.info(f"  - Already complete, skipping")
            skipped_count += 1

    # Display results
    logger.info("=" * 60)
    logger.info("GENERATION COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Collections processed:   {len(collections)}")
    logger.info(f"Promos generated:        {generated_count}")
    logger.info(f"Skipped (already done):  {skipped_count}")
    logger.info(f"Errors:                  {error_count}")
    logger.info("=" * 60)

    return {
        "total_collections": len(collections),
        "generated": generated_count,
        "skipped": skipped_count,
        "errors": error_count,
    }


if __name__ == "__main__":
    asyncio.run(generate_all_promos())
