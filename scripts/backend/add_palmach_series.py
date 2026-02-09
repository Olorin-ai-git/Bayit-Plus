#!/usr/bin/env python3
"""
Add Palmach series to the database.

Palmach (פלמ"ח) - Historical Israeli drama series about the Palmach,
the elite fighting force of the Haganah during the British Mandate of Palestine.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings


async def add_palmach_series():
    """Add Palmach series to the database."""
    settings = get_settings()

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db.content

    print("Adding Palmach series...")

    # Check if already exists
    existing = await collection.find_one({"title": "פלמ\"ח"})
    if existing:
        print(f"Palmach series already exists with ID: {existing['_id']}")
        client.close()
        return

    # Create Palmach series document
    palmach_doc = {
        # Source identification (required for unique index)
        "source_provider": "bayit",
        "source_id": "palmach-2022",
        # Titles
        "title": "פלמ\"ח",  # Hebrew title
        "title_en": "Palmach",
        "title_es": "Palmach",
        # Descriptions
        "description": "סדרת דרמה היסטורית ישראלית המתעדת את סיפורו של הפלמ\"ח, כוח המובחר של ההגנה בתקופת המנדט הבריטי",
        "description_en": "Historical Israeli drama series documenting the story of the Palmach, the elite fighting force of the Haganah during the British Mandate",
        "description_es": "Serie dramática histórica israelí que documenta la historia del Palmaj, la fuerza de combate de élite de la Haganá durante el Mandato Británico",
        # Taxonomy
        "section_ids": ["israeli-series"],
        "primary_section_id": "israeli-series",
        "content_format": "series",
        # Series metadata
        "total_seasons": 1,
        "total_episodes": 10,
        "year": 2022,
        # Genre
        "genre_ids": ["drama", "historical"],
        "genre": "דרמה היסטורית",
        "genre_en": "Historical Drama",
        "genre_es": "Drama Histórico",
        # Topics
        "topic_tags": ["israeli", "history", "military", "independence"],
        # Images (placeholder - replace with actual poster URL)
        "poster_url": "https://images.bayit.tv/series/palmach/poster.jpg",
        "thumbnail": "https://images.bayit.tv/series/palmach/thumbnail.jpg",
        "backdrop": "https://images.bayit.tv/series/palmach/backdrop.jpg",
        # Streaming (placeholder - will be updated when episodes are added)
        "stream_url": "https://cdn.bayit.tv/series/palmach/playlist.m3u8",
        "stream_type": "hls",
        # Metadata
        "rating": 8.5,
        "cast": [
            "עמית רהב",
            "יונתן בר גיורא",
            "עדי קניו",
            "מאור שוויצר",
        ],
        # Visibility
        "is_published": True,
        "is_featured": True,
        "requires_subscription": "basic",
        # Subtitles
        "has_subtitles": True,
        "available_subtitle_languages": ["he", "en", "es"],
    }

    result = await collection.insert_one(palmach_doc)
    print(f"Palmach series added successfully with ID: {result.inserted_id}")
    print(f"  Title: {palmach_doc['title']}")
    print(f"  English Title: {palmach_doc['title_en']}")
    print(f"  Total Episodes: {palmach_doc['total_episodes']}")
    print(f"  Year: {palmach_doc['year']}")

    client.close()


if __name__ == "__main__":
    asyncio.run(add_palmach_series())
