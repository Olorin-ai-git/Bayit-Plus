#!/usr/bin/env python3
"""
Script to add Tagad series videos to VOD collection
"""
import asyncio
import os
from pathlib import Path
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import Content,
from app.models.content_taxonomy import ContentSection
from app.core.config import settings

# Use environment variable or default to project-relative path
project_root = os.getenv("PROJECT_ROOT", str(Path(__file__).parent.parent.parent.parent))
UPLOADS_DIR = Path(os.getenv("UPLOADS_VOD_DIR", f"{project_root}/backend/uploads/vod"))


async def add_tagad_series():
    """Add Tagad series videos to the database."""
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Content, Category],
    )

    try:
        print("Adding Tagad series to VOD collection...")

        # Find or create Tagad category
        tagad_category = await Category.find_one({"name": "סדרות"})
        if not tagad_category:
            tagad_category = Category(
                name="סדרות",
                name_en="Series",
                slug="series",
                description="סדרות ישראליות",
                is_active=True,
                order=7,
            )
            await tagad_category.insert()
            print(f"Created category: סדרות (ID: {tagad_category.id})")
        else:
            print(f"Using existing category: סדרות (ID: {tagad_category.id})")

        # Find or create the series document
        tagad_series = await Content.find_one({"title": "תאגד", "is_series": True, "series_id": None})
        if not tagad_series:
            tagad_series = Content(
                title="תאגד",
                description="סדרה דרמטית ישראלית",
                category_id=str(tagad_category.id),
                category_name="סדרות",
                is_series=True,
                is_published=True,
                is_featured=True,
                requires_subscription="basic",
                stream_url="",
                thumbnail="/uploads/vod/תאגד-cover.jpeg",
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            await tagad_series.insert()
            print(f"Created Tagad series (ID: {tagad_series.id})")
        else:
            print(f"Using existing series (ID: {tagad_series.id})")

        tagad_series_id = str(tagad_series.id)

        # Find all Tagad video files
        video_files = list(UPLOADS_DIR.glob("תאגד*.mp4")) + list(UPLOADS_DIR.glob("תאגד*.mkv"))
        print(f"\nFound {len(video_files)} video files")

        added = 0
        skipped = 0
        for video_path in video_files:
            filename = video_path.name

            # Parse episode number from filename
            import re
            match = re.search(r'פרק (\d+)', filename)
            if match:
                episode_num = int(match.group(1))
                episode_title = f"תאגד - עונה 2 פרק {episode_num}"
            else:
                print(f"  Skipping (can't parse): {filename}")
                continue

            # Check if episode already exists
            existing = await Content.find_one({
                "series_id": tagad_series_id,
                "episode": episode_num,
                "season": 2
            })

            if existing:
                skipped += 1
                continue

            # Create episode (is_series defaults to False for episodes)
            episode = Content(
                title=episode_title,
                description=f"תאגד עונה 2 פרק {episode_num}",
                category_id=str(tagad_category.id),
                category_name="סדרות",
                is_series=False,  # Episodes are NOT series - only parent series should have is_series=True
                season=2,
                episode=episode_num,
                series_id=tagad_series_id,
                stream_url=f"/uploads/vod/{filename}",
                stream_type="http",
                thumbnail="/uploads/vod/תאגד-cover.jpeg",
                is_published=True,
                is_featured=False,
                requires_subscription="basic",
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            await episode.insert()
            added += 1
            print(f"  Added: {episode_title}")

        print(f"\nDone! Added {added} episodes, skipped {skipped} existing")
        print(f"Series ID: {tagad_series_id}")

    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(add_tagad_series())
