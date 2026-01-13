"""Quick script to check Avatar's thumbnail data in MongoDB"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.content import Content
from app.core.config import settings


async def check_avatar():
    """Check Avatar's thumbnail data"""
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(database=client[settings.MONGODB_DB], document_models=[Content])

    # Find Avatar
    avatar = await Content.find_one(Content.title == "Avatar")

    if not avatar:
        print("❌ Avatar not found in database")
        return

    print(f"✅ Avatar found!")
    print(f"  ID: {avatar.id}")
    print(f"  Title: {avatar.title}")
    print(f"  thumbnail (URL): {avatar.thumbnail}")
    print(f"  thumbnail_data (base64): {'YES' if avatar.thumbnail_data else 'NO'}")
    if avatar.thumbnail_data:
        print(f"    - Size: {len(avatar.thumbnail_data)} characters")
        print(f"    - Preview: {avatar.thumbnail_data[:80]}...")
    print(f"  poster_url: {avatar.poster_url}")
    print(f"  backdrop (URL): {avatar.backdrop}")
    print(f"  backdrop_data (base64): {'YES' if avatar.backdrop_data else 'NO'}")

    # If there's a URL but no data, we can download it
    if avatar.thumbnail and not avatar.thumbnail_data:
        print(f"\n💡 Avatar has thumbnail URL but no base64 data stored.")
        print(f"   URL: {avatar.thumbnail}")
        print(f"   To fix: Update Avatar through Admin panel or run download script")


if __name__ == "__main__":
    asyncio.run(check_avatar())
