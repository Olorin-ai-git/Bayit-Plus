#!/usr/bin/env python3
"""Check featured/highlighted content."""

import asyncio
import os

from motor.motor_asyncio import AsyncIOMotorClient


async def check_featured():
    atlas_url = os.getenv("MONGODB_URI")
    if not atlas_url:
        raise RuntimeError("MONGODB_URI environment variable not set")

    client = AsyncIOMotorClient(atlas_url)
    db = client["bayit_plus"]
    content = db["content"]

    # Check for featured content
    featured = await content.count_documents({"is_featured": True})
    print(f"Featured content: {featured}")

    # Check for highlighted content
    highlighted = await content.count_documents({"is_highlighted": True})
    print(f"Highlighted content: {highlighted}")

    # Sample featured items
    if featured > 0:
        print("\nFeatured items:")
        cursor = content.find({"is_featured": True}).limit(5)
        async for item in cursor:
            print(
                f"  - {item.get('title')}: poster={item.get('poster_url', 'NO POSTER')}"
            )

    # Sample highlighted items
    if highlighted > 0:
        print("\nHighlighted items:")
        cursor = content.find({"is_highlighted": True}).limit(5)
        async for item in cursor:
            print(
                f"  - {item.get('title')}: poster={item.get('poster_url', 'NO POSTER')}"
            )

    client.close()


if __name__ == "__main__":
    asyncio.run(check_featured())
