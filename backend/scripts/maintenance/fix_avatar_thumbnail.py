"""Script to manually trigger Avatar thumbnail download with fixed headers"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.content import Content
from app.core.config import settings
from app.services.image_storage import download_and_encode_image


async def fix_avatar_thumbnail():
    """Download and store Avatar's thumbnail"""
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(database=client[settings.MONGODB_DB], document_models=[Content])

    # Find Avatar
    avatar = await Content.find_one(Content.title == "Avatar")

    if not avatar:
        print("❌ Avatar not found in database")
        return

    print(f"✅ Found Avatar: {avatar.id}")
    print(f"   Current thumbnail URL: {avatar.thumbnail}")
    print(f"   Current thumbnail_data: {'YES' if avatar.thumbnail_data else 'NO'}")

    # Use the thumbnail URL that's already in the database, or the Wikipedia one
    thumbnail_url = avatar.thumbnail or "https://upload.wikimedia.org/wikipedia/en/d/d6/Avatar_%282009_film%29_poster.jpg"

    print(f"\n📥 Downloading image from: {thumbnail_url}")

    # Download and encode the image
    thumbnail_data = await download_and_encode_image(thumbnail_url, max_size=(800, 1200))

    if thumbnail_data:
        print(f"✅ Successfully downloaded and encoded image!")
        print(f"   Size: {len(thumbnail_data)} characters")
        print(f"   Preview: {thumbnail_data[:80]}...")

        # Save to database
        avatar.thumbnail = thumbnail_url
        avatar.thumbnail_data = thumbnail_data
        await avatar.save()

        print(f"\n💾 Saved to database!")
        print(f"   Avatar now has thumbnail_data stored")
    else:
        print(f"❌ Failed to download image from {thumbnail_url}")


if __name__ == "__main__":
    asyncio.run(fix_avatar_thumbnail())
