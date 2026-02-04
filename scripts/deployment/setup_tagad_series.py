#!/usr/bin/env python3
"""
Setup script to create the תאגד series and episodes in the VOD database.
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.content import Content, Category


async def setup_tagad_series():
    """Create the תאגד series and episodes."""

    # Initialize database
    await connect_to_mongo()

    print("🎬 Setting up תאגד series...")

    # Step 1: Create or get the category
    print("\n📁 Checking for TV Series category...")
    category = await Category.find_one(Category.slug == "tv-series")

    if not category:
        print("   Creating TV Series category...")
        category = Category(
            name="סדרות טלוויזיה",
            name_en="TV Series",
            slug="tv-series",
            description="סדרות טלוויזיה ישראליות",
            is_active=True,
            order=1
        )
        await category.insert()
        category_id = str(category.id)
        print(f"   ✅ Created category: {category_id}")
    else:
        category_id = str(category.id)
        print(f"   ✅ Found category: {category_id}")

    # Step 2: Create the series
    print("\n📺 Creating series 'תאגד'...")

    cover_url = "/uploads/vod/תאגד-cover.jpeg"

    series = Content(
        title="תאגד",
        description="סדרה דרמתית ישראלית",
        thumbnail=cover_url,
        backdrop=cover_url,
        category_id=category_id,
        category_name="סדרות טלוויזיה",
        is_series=True,
        is_published=True,
        stream_url="",  # Series parent doesn't have stream URL
        stream_type="hls",
        requires_subscription="basic",
        genre="Drama",
        year=2020
    )
    await series.insert()
    series_id = str(series.id)
    print(f"   ✅ Created series: {series_id}")

    # Step 3: Create episodes
    episodes_data = [
        {
            "episode_num": 1,
            "season": 2,
            "episode": 1,
            "filename": "תאגד עונה 2 פרק 1.mp4",
            "duration": "45:00"
        },
        {
            "episode_num": 2,
            "season": 2,
            "episode": 4,
            "filename": "תאגד עונה 2 פרק 4.mkv",
            "duration": "45:00"
        },
        {
            "episode_num": 3,
            "season": 2,
            "episode": 8,
            "filename": "תאגד עונה 2 פרק 8.mp4",
            "duration": "45:00"
        },
        {
            "episode_num": 4,
            "season": 2,
            "episode": 32,
            "filename": "תאגד עונה 2 פרק 32.mp4",
            "duration": "45:00"
        }
    ]

    print("\n🎥 Creating episodes...")

    for ep_data in episodes_data:
        episode = Content(
            title=f"עונה {ep_data['season']} פרק {ep_data['episode']}",
            description=f"תאגד - עונה {ep_data['season']}, פרק {ep_data['episode']}",
            thumbnail=cover_url,
            backdrop=cover_url,
            category_id=category_id,
            category_name="סדרות טלוויזיה",
            is_series=True,
            series_id=series_id,
            season=ep_data['season'],
            episode=ep_data['episode'],
            stream_url=f"/uploads/vod/{ep_data['filename']}",
            stream_type="hls",
            is_published=True,
            requires_subscription="basic",
            duration=ep_data['duration'],
            genre="Drama",
            year=2020
        )
        await episode.insert()
        episode_id = str(episode.id)
        print(f"   ✅ Created episode {ep_data['episode_num']}: S{ep_data['season']}E{ep_data['episode']} - {episode_id}")

    print("\n✨ Series setup complete!")
    print(f"   Series ID: {series_id}")
    print(f"   Category ID: {category_id}")
    print(f"   Episodes created: {len(episodes_data)}")

    # Close connection
    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(setup_tagad_series())
