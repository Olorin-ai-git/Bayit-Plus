"""Check what's actually stored for Avatar in the database"""
import asyncio
import os
import sys

from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.content import Content
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient


async def check_avatar():
    """Check Avatar's full data"""
    mongodb_uri = os.getenv("MONGODB_URI") or os.getenv(
        "MONGODB_URL", "mongodb://localhost:27017"
    )
    mongodb_db = os.getenv("MONGODB_DB") or os.getenv("MONGODB_DB_NAME", "bayit_plus")

    client = AsyncIOMotorClient(mongodb_uri)
    await init_beanie(database=client[mongodb_db], document_models=[Content])

    avatar = await Content.find_one(Content.title == "Avatar")

    if not avatar:
        print("❌ Avatar not found")
        return

    print(f"✅ Avatar found in database:")
    print(f"  ID: {avatar.id}")
    print(f"  Title: {avatar.title}")
    print(f"  Description: {avatar.description}")
    print(f"  thumbnail: {repr(avatar.thumbnail)}")
    print(f"  thumbnail_data: {'YES' if avatar.thumbnail_data else 'NO'}")
    print(f"  backdrop: {repr(avatar.backdrop)}")
    print(f"  backdrop_data: {'YES' if avatar.backdrop_data else 'NO'}")
    print(f"  poster_url: {repr(avatar.poster_url)}")
    print(f"  category_id: {avatar.category_id}")
    print(f"  category_name: {avatar.category_name}")
    print(f"  is_published: {avatar.is_published}")
    print(f"  is_featured: {avatar.is_featured}")


if __name__ == "__main__":
    asyncio.run(check_avatar())
