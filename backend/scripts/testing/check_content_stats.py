"""Check content statistics and image URLs"""
import asyncio
import sys
import os
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import Content


async def check_stats():
    """Check content statistics"""
    mongodb_uri = os.getenv("MONGODB_URI") or os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    mongodb_db = os.getenv("MONGODB_DB") or os.getenv("MONGODB_DB_NAME", "bayit_plus")

    client = AsyncIOMotorClient(mongodb_uri)
    await init_beanie(database=client[mongodb_db], document_models=[Content])

    # Total content
    total = await Content.find().count()
    print(f"📊 Total Content Items: {total}\n")

    # Items with thumbnail URL
    with_thumbnail = await Content.find(
        {"thumbnail": {"$ne": None, "$exists": True}}
    ).count()
    print(f"  - With thumbnail URL: {with_thumbnail}")

    # Items with poster_url
    with_poster = await Content.find(
        {"poster_url": {"$ne": None, "$exists": True}}
    ).count()
    print(f"  - With poster_url: {with_poster}")

    # Items with thumbnail_data
    with_thumbnail_data = await Content.find(
        {"thumbnail_data": {"$ne": None, "$exists": True}}
    ).count()
    print(f"  - With thumbnail_data (stored): {with_thumbnail_data}")

    # Items with TMDB ID
    with_tmdb = await Content.find(
        {"tmdb_id": {"$ne": None, "$exists": True}}
    ).count()
    print(f"  - With TMDB ID: {with_tmdb}")

    # Published content
    published = await Content.find(
        {"is_published": True}
    ).count()
    print(f"  - Published: {published}")

    # Sample some items
    print(f"\n📋 Sample content (first 5):")
    sample = await Content.find().limit(5).to_list()
    for item in sample:
        print(f"\n  - {item.title}")
        print(f"    thumbnail: {bool(item.thumbnail)}")
        print(f"    poster_url: {bool(item.poster_url)}")
        print(f"    thumbnail_data: {bool(item.thumbnail_data)}")
        print(f"    tmdb_id: {item.tmdb_id}")


if __name__ == "__main__":
    asyncio.run(check_stats())
