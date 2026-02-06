#!/usr/bin/env python3
"""Diagnose featured content and section mappings."""
import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def diagnose():
    """Diagnose featured sections and content mappings."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    # Get all ContentSection documents
    sections_col = db["content_sections"]
    sections = await sections_col.find({
        "is_active": True,
        "show_on_homepage": True
    }).sort("order", 1).to_list(length=None)

    print("=" * 80)
    print("CONTENT SECTIONS (show_on_homepage=True, is_active=True)")
    print("=" * 80)
    for section in sections:
        print(f"\n📁 {section.get('slug')}")
        print(f"   ID: {section['_id']}")
        print(f"   Name Key: {section.get('name_key')}")
        print(f"   Order: {section.get('order')}")

    # Find HaBurganim parent series
    content_col = db["content"]
    burganim = await content_col.find_one({
        "title": {"$regex": "^הבורגנים$", "$options": "i"},
        "is_published": True,
        "$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
            {"series_id": ""}
        ]
    })

    print("\n" + "=" * 80)
    print("HABURGANIM SERIES")
    print("=" * 80)
    if burganim:
        print(f"\n📺 {burganim.get('title')}")
        print(f"   ID: {burganim['_id']}")
        print(f"   Category: {burganim.get('category_name')}")
        print(f"   Is Featured: {burganim.get('is_featured')}")
        print(f"   Featured Order: {burganim.get('featured_order', {})}")
    else:
        print("\n❌ No HaBurganim parent series found")

    # Find Music and Documentary content
    print("\n" + "=" * 80)
    print("MUSIC CONTENT")
    print("=" * 80)
    music_content = await content_col.find({
        "$or": [
            {"category_name": {"$in": ["Music", "מוזיקה"]}},
            {"genres": {"$in": ["Music"]}}
        ],
        "is_published": True,
        "is_featured": True,
    }).limit(5).to_list(length=5)

    if music_content:
        for item in music_content:
            print(f"\n🎵 {item.get('title')}")
            print(f"   ID: {item['_id']}")
            print(f"   Category: {item.get('category_name')}")
            print(f"   Genres: {item.get('genres', [])}")
            print(f"   Featured Order: {item.get('featured_order', {})}")
    else:
        print("\n❌ No music content found")

    print("\n" + "=" * 80)
    print("DOCUMENTARY CONTENT")
    print("=" * 80)
    doc_content = await content_col.find({
        "$or": [
            {"category_name": {"$in": ["Documentary", "דוקומנטרי"]}},
            {"genres": {"$in": ["Documentary"]}}
        ],
        "is_published": True,
        "is_featured": True,
    }).limit(5).to_list(length=5)

    if doc_content:
        for item in doc_content:
            print(f"\n🎬 {item.get('title')}")
            print(f"   ID: {item['_id']}")
            print(f"   Category: {item.get('category_name')}")
            print(f"   Genres: {item.get('genres', [])}")
            print(f"   Featured Order: {item.get('featured_order', {})}")
    else:
        print("\n❌ No documentary content found")


if __name__ == "__main__":
    asyncio.run(diagnose())
