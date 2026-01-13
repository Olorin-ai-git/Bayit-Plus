#!/usr/bin/env python3
"""
Script to add all Palmach series videos to VOD collection
"""
import asyncio
from pathlib import Path
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import Content, Category
from app.core.config import settings

UPLOADS_DIR = Path("/Users/olorin/Documents/Bayit-Plus/backend/uploads/vod")


async def add_palmach_series():
    """Add Palmach series videos to the database."""
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Content, Category],
    )

    try:
        print("Adding Palmach series to VOD collection...")

        # Find or create Palmach category
        palmach_category = await Category.find_one({"name": "פלמח"})
        if not palmach_category:
            palmach_category = Category(
                name="פלמח",
                slug="palmach",
                description="סדרת פלמח - דרמה ישראלית",
                is_active=True,
                order=10,
            )
            await palmach_category.insert()
            print(f"Created category: פלמח (ID: {palmach_category.id})")
        else:
            print(f"Using existing category: פלמח (ID: {palmach_category.id})")

        # Find or create the series document
        palmach_series = await Content.find_one({"title": "פלמח", "is_series": True, "series_id": None})
        if not palmach_series:
            palmach_series = Content(
                title="פלמח",
                description="סדרה דרמטית ישראלית",
                category_id=str(palmach_category.id),
                category_name="פלמח",
                is_series=True,
                is_published=True,
                is_featured=False,
                requires_subscription="basic",
                stream_url="",
                thumbnail="/uploads/vod/Palmach-cover.jpg",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            await palmach_series.insert()
            print(f"Created Palmach series (ID: {palmach_series.id})")
        else:
            print(f"Using existing series (ID: {palmach_series.id})")

        palmach_series_id = str(palmach_series.id)

        # Find all video files
        video_files = sorted(UPLOADS_DIR.glob("Palmach_S01E*.mp4"))
        print(f"\nFound {len(video_files)} video files")

        added = 0
        skipped = 0
        for video_path in video_files:
            filename = video_path.name

            # Parse episode number
            if "E01-02" in filename:
                episode_nums = [1, 2]
                episode_title = "פלמח - עונה 1 פרקים 1-2"
                episode_num = 1
            else:
                import re
                match = re.search(r'E(\d+)', filename)
                if match:
                    episode_num = int(match.group(1))
                    episode_title = f"פלמח - עונה 1 פרק {episode_num}"
                else:
                    print(f"  Skipping (can't parse): {filename}")
                    continue

            # Check if episode already exists
            existing = await Content.find_one({
                "series_id": palmach_series_id,
                "episode": episode_num,
                "season": 1
            })

            if existing:
                skipped += 1
                continue

            # Create episode
            episode = Content(
                title=episode_title,
                description=f"פלמח עונה 1 פרק {episode_num}",
                category_id=str(palmach_category.id),
                category_name="פלמח",
                is_series=True,
                season=1,
                episode=episode_num,
                series_id=palmach_series_id,
                stream_url=f"/uploads/vod/{filename}",
                stream_type="http",
                thumbnail="/uploads/vod/Palmach-cover.jpg",
                is_published=True,
                is_featured=False,
                requires_subscription="basic",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            await episode.insert()
            added += 1
            print(f"  Added: {episode_title}")

        print(f"\nDone! Added {added} episodes, skipped {skipped} existing")
        print(f"Series ID: {palmach_series_id}")

    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(add_palmach_series())
