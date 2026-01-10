#!/usr/bin/env python3
"""
Script to add Palmach series videos to VOD collection
"""
import asyncio
import shutil
from pathlib import Path
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import Content, Category
from app.core.config import settings

# Video file paths
VIDEO_FILES = [
    "/Users/olorin/Downloads/פלמ_ח של סרטים וסדרות בדרייב/פלמח עונה 1 פרק 34.mp4",
    "/Users/olorin/Downloads/פלמ_ח של סרטים וסדרות בדרייב/פלמח עונה 1 פרק 35.mp4",
    "/Users/olorin/Downloads/פלמ_ח של סרטים וסדרות בדרייב/פלמח עונה 1 פרק 50.mp4",
]

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
        print("🎬 Adding Palmach series to VOD collection...")

        # Create uploads directory if it doesn't exist
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        print(f"✅ Uploads directory ready: {UPLOADS_DIR}")

        # Find or create Palmach category
        palmach_category = await Category.find_one({"name": "פלמח"})
        if not palmach_category:
            palmach_category = Category(
                name="פלמח",
                slug="palmach",
                description="סדרת פלמח - הפלוגה ההנדסית",
                is_active=True,
                order=10,
            )
            await palmach_category.insert()
            print(f"✅ Created category: פלמח (ID: {palmach_category.id})")
        else:
            print(f"✅ Using existing category: פלמח (ID: {palmach_category.id})")

        # Create a series document for Palmach
        palmach_series = Content(
            title="פלמח",
            description="סדרה דרמטית על הפלוגה ההנדסית של הצבא הישראלי",
            category_id=str(palmach_category.id),
            category_name="פלמח",
            is_series=True,
            is_published=True,
            is_featured=False,
            requires_subscription="basic",
            stream_url="",  # Series parent has no stream URL
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await palmach_series.insert()
        palmach_series_id = str(palmach_series.id)
        print(f"✅ Created Palmach series (ID: {palmach_series_id})")

        # Episode data: extract episode numbers from filenames
        episodes_data = [
            {"file": VIDEO_FILES[0], "episode": 34},
            {"file": VIDEO_FILES[1], "episode": 35},
            {"file": VIDEO_FILES[2], "episode": 50},
        ]

        # Add each episode
        for ep_data in episodes_data:
            video_path = ep_data["file"]
            episode_num = ep_data["episode"]

            # Check if source file exists
            if not Path(video_path).exists():
                print(f"❌ Source file not found: {video_path}")
                continue

            # Copy video to uploads folder
            filename = f"Palmach_S01E{episode_num:02d}.mp4"
            dest_path = UPLOADS_DIR / filename
            shutil.copy2(video_path, dest_path)
            print(f"📁 Copied: {filename}")

            # Create content record for episode
            episode_title = f"פלמח - עונה 1 פרק {episode_num}"
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
                stream_type="http",  # Direct HTTP stream from local file
                is_published=True,
                is_featured=False,
                requires_subscription="basic",
                duration="45:00",  # Approximate
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            await episode.insert()
            print(f"✅ Added episode: {episode_title} (ID: {episode.id})")

        print("\n🎉 Successfully added Palmach series with 3 episodes!")
        print(f"📍 Series ID: {palmach_series_id}")
        print(f"📺 Category: פלמח")
        print(f"📂 Videos stored in: {UPLOADS_DIR}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(add_palmach_series())
