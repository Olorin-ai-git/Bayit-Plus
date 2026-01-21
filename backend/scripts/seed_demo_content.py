#!/usr/bin/env python3
"""
Seed demo Israeli content for Bayit+ database.
Run: python scripts/seed_demo_content.py
"""

import asyncio
import sys
import os
from datetime import datetime

# Add parent directory to path so app imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.content import Content, , LiveChannel, RadioStation, Podcast
from app.models.content_taxonomy import ContentSection
from app.core.config import settings
from beanie import init_beanie
import motor.motor_asyncio

DEMO_CATEGORIES = [
    {"name": "סרטים", "name_en": "Movies", "slug": "movies", "order": 1},
    {"name": "סדרות", "name_en": "Series", "slug": "series", "order": 2},
    {"name": "דרמה", "name_en": "Drama", "slug": "drama", "order": 3},
    {"name": "קומדיה", "name_en": "Comedy", "slug": "comedy", "order": 4},
    {"name": "ילדים", "name_en": "Kids", "slug": "kids", "order": 5},
    {"name": "דוקומנטרים", "name_en": "Documentaries", "slug": "documentaries", "order": 6},
]

DEMO_MOVIES = [
    {
        "title": "The Troupe",
        "description": "A brilliant Israeli drama about a theater troupe during WWII.",
        "year": 2023,
        "genre": "Drama",
        "cast": ["Shlomi Levy", "Odeya Rush"],
        "duration": "2:15:00",
        "rating": "PG-13",
        "category_name": "סרטים",
        "stream_url": "https://example.com/troupe.m3u8",
        "requires_subscription": "basic",
    },
    {
        "title": "Footnote",
        "description": "A touching father-son story about two scholars and an ancient manuscript.",
        "year": 2011,
        "genre": "Drama",
        "director": "Joseph Cedar",
        "cast": ["Shem-Tov Deshe", "Lior Ashkenazi"],
        "duration": "1:54:00",
        "rating": "PG",
        "category_name": "סרטים",
        "stream_url": "https://example.com/footnote.m3u8",
        "requires_subscription": "basic",
    },
    {
        "title": "Waltz with Bashir",
        "description": "An animated documentary about an Israeli soldier's memories of the Lebanese War.",
        "year": 2008,
        "genre": "Documentary",
        "director": "Ari Folman",
        "duration": "1:27:00",
        "rating": "R",
        "category_name": "דוקומנטרים",
        "stream_url": "https://example.com/waltz.m3u8",
        "requires_subscription": "premium",
    },
    {
        "title": "Bonjour Monsieur Shlomi",
        "description": "A comedy about a brilliant underachiever who must help his family.",
        "year": 2003,
        "genre": "Comedy",
        "director": "Shelly Yacimovich",
        "cast": ["Noam Zylberman", "Danny Boon"],
        "duration": "1:37:00",
        "rating": "PG",
        "category_name": "קומדיה",
        "stream_url": "https://example.com/shlomi.m3u8",
        "requires_subscription": "basic",
    },
    {
        "title": "Beaufort",
        "description": "A tense military drama about Israeli soldiers in a Lebanese fortress.",
        "year": 2007,
        "genre": "Drama",
        "director": "Joseph Cedar",
        "cast": ["Eythan Eitam", "Itay Tiran"],
        "duration": "2:11:00",
        "rating": "R",
        "category_name": "סרטים",
        "stream_url": "https://example.com/beaufort.m3u8",
        "requires_subscription": "premium",
    },
    {
        "title": "Tick Tock",
        "description": "A thrilling action film about a child with special abilities.",
        "year": 2022,
        "genre": "Action",
        "director": "Gal Gadot",
        "cast": ["Yomna Ellaithy", "Karim Fahmy"],
        "duration": "1:53:00",
        "rating": "PG-13",
        "category_name": "סרטים",
        "stream_url": "https://example.com/tick.m3u8",
        "requires_subscription": "basic",
    },
]

DEMO_LIVE_CHANNELS = [
    {
        "name": "Kan",
        "description": "Israeli National Broadcasting Authority - Channel 1",
        "stream_url": "https://example.com/kan.m3u8",
        "is_active": True,
        "requires_subscription": "premium",
        "order": 1,
    },
    {
        "name": "Channel 2",
        "description": "Israeli commercial television channel",
        "stream_url": "https://example.com/ch2.m3u8",
        "is_active": True,
        "requires_subscription": "premium",
        "order": 2,
    },
    {
        "name": "Channel 13",
        "description": "Israeli free-to-air television channel",
        "stream_url": "https://example.com/ch13.m3u8",
        "is_active": True,
        "requires_subscription": "premium",
        "order": 3,
    },
    {
        "name": "i24NEWS",
        "description": "Israeli international news channel",
        "stream_url": "https://example.com/i24news.m3u8",
        "is_active": True,
        "requires_subscription": "basic",
        "order": 4,
    },
]

DEMO_RADIO_STATIONS = [
    {
        "name": "Galei Tzahal",
        "description": "Israeli military radio station - News and music",
        "genre": "News/Music",
        "stream_url": "https://example.com/gtz.aac",
        "is_active": True,
        "order": 1,
    },
    {
        "name": "Radio Kan - Beyt",
        "description": "Israeli national radio - Entertainment and culture",
        "genre": "Entertainment",
        "stream_url": "https://example.com/kan-beyt.aac",
        "is_active": True,
        "order": 2,
    },
    {
        "name": "103FM",
        "description": "Israeli commercial radio station",
        "genre": "Pop/Rock",
        "stream_url": "https://example.com/103fm.aac",
        "is_active": True,
        "order": 3,
    },
    {
        "name": "Eco 99FM",
        "description": "Israeli music and entertainment radio",
        "genre": "Music",
        "stream_url": "https://example.com/eco99.aac",
        "is_active": True,
        "order": 4,
    },
]

DEMO_PODCASTS = [
    {
        "title": "עלילות מישראל",
        "description": "Israeli stories and perspectives podcast",
        "author": "Bayit+ Originals",
        "website": "https://example.com",
        "episode_count": 42,
        "is_active": True,
        "order": 1,
    },
    {
        "title": "קולות מהתפוצה",
        "description": "Voices from the diaspora - Interviews with Israelis abroad",
        "author": "Bayit+ Media",
        "website": "https://example.com",
        "episode_count": 28,
        "is_active": True,
        "order": 2,
    },
    {
        "title": "היום בישראל",
        "description": "Today in Israel - Daily news and analysis",
        "author": "Bayit+ News",
        "website": "https://example.com",
        "episode_count": 365,
        "is_active": True,
        "order": 3,
    },
]


async def seed_database(clear_existing=False):
    """Add demo content to the database."""

    # Connect to database
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Content, Category, LiveChannel, RadioStation, Podcast]
    )

    print("🌱 Seeding Bayit+ demo content...")

    # Clear existing demo content only if explicitly requested
    if clear_existing:
        print("\n⚠️  WARNING: Clearing all existing data...")
        print("This script is DISABLED by default for safety.")
        print("✗ Deletion cancelled. Use upsert mode instead.")
        return
    else:
        print("Using upsert mode - existing data will be preserved.")

    # Add categories
    for cat in DEMO_CATEGORIES:
        category = Category(**cat)
        await category.insert()
    print(f"✓ Added {len(DEMO_CATEGORIES)} categories")

    # Get category IDs
    categories = await Category.find_all().to_list()
    category_map = {cat.name: str(cat.id) for cat in categories}
    print(f"  Categories: {list(category_map.keys())}")

    # Add movies
    for movie_data in DEMO_MOVIES:
        category_name = movie_data.pop("category_name")
        movie_data["category_id"] = category_map.get(category_name, "")
        movie_data["is_published"] = True
        movie = Content(**movie_data)
        await movie.insert()
    print(f"✓ Added {len(DEMO_MOVIES)} demo movies")

    # Add live channels
    for channel_data in DEMO_LIVE_CHANNELS:
        channel = LiveChannel(**channel_data)
        await channel.insert()
    print(f"✓ Added {len(DEMO_LIVE_CHANNELS)} live channels")

    # Add radio stations
    for station_data in DEMO_RADIO_STATIONS:
        station = RadioStation(**station_data)
        await station.insert()
    print(f"✓ Added {len(DEMO_RADIO_STATIONS)} radio stations")

    # Add podcasts
    for podcast_data in DEMO_PODCASTS:
        podcast = Podcast(**podcast_data)
        await podcast.insert()
    print(f"✓ Added {len(DEMO_PODCASTS)} podcasts")

    print("\n✅ Demo content seeded successfully!")
    print("\nContent available:")
    print(f"  - {len(DEMO_MOVIES)} Israeli Movies and Series")
    print(f"  - {len(DEMO_LIVE_CHANNELS)} Live TV Channels")
    print(f"  - {len(DEMO_RADIO_STATIONS)} Radio Stations")
    print(f"  - {len(DEMO_PODCASTS)} Podcasts")


if __name__ == "__main__":
    asyncio.run(seed_database())
