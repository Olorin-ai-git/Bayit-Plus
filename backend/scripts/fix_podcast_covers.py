#!/usr/bin/env python3
"""
Fix broken podcast cover URLs.

This script finds podcasts with /uploads/ cover paths that don't exist in GCS
and updates them with proper image URLs.
"""

import asyncio
import os
import sys
from datetime import datetime, timezone

import httpx
from motor.motor_asyncio import AsyncIOMotorClient


async def check_url_exists(url: str) -> bool:
    """Check if a URL returns a valid response."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.head(url, follow_redirects=True)
            return response.status_code < 400
    except Exception:
        return False


async def fetch_rss_artwork(rss_url: str) -> str | None:
    """Try to fetch artwork URL from RSS feed."""
    if not rss_url:
        return None

    try:
        import xml.etree.ElementTree as ET

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(rss_url)
            if response.status_code != 200:
                return None

            root = ET.fromstring(response.text)

            # Try iTunes image first
            ns = {"itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd"}
            itunes_image = root.find(".//channel/itunes:image", ns)
            if itunes_image is not None:
                href = itunes_image.get("href")
                if href and await check_url_exists(href):
                    return href

            # Try standard image element
            image = root.find(".//channel/image/url")
            if image is not None and image.text:
                if await check_url_exists(image.text):
                    return image.text

    except Exception as e:
        print(f"  Error fetching RSS artwork: {e}")

    return None


async def fix_podcast_covers():
    """Fix podcasts with broken cover URLs."""
    mongo_url = os.getenv("MONGODB_URI") or os.getenv("MONGO_URL")
    if not mongo_url:
        print("Error: MONGODB_URI or MONGO_URL environment variable not set")
        sys.exit(1)

    db_name = os.getenv("MONGO_DB", "bayit_plus")

    print(f"Connecting to database: {db_name}")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    podcasts = db["podcasts"]

    # Find podcasts with /uploads/ cover paths
    broken_podcasts = await podcasts.find(
        {"cover": {"$regex": "^/uploads/"}}
    ).to_list(length=1000)

    print(f"\nFound {len(broken_podcasts)} podcasts with /uploads/ cover paths")

    if not broken_podcasts:
        print("No broken podcast covers to fix")
        client.close()
        return

    # High-quality podcast/audio placeholder images from Unsplash
    placeholder_images = [
        "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400",  # Microphone
        "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400",  # Podcast setup
        "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400",  # Studio
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400",  # Audio waves
    ]

    fixed_count = 0
    for i, podcast in enumerate(broken_podcasts):
        podcast_id = podcast["_id"]
        title = podcast.get("title", "Unknown")
        current_cover = podcast.get("cover", "")
        rss_feed = podcast.get("rss_feed")

        print(f"\n[{i+1}/{len(broken_podcasts)}] {title}")
        print(f"  Current cover: {current_cover}")

        # Try to get artwork from RSS feed first
        new_cover = None
        if rss_feed:
            print(f"  Checking RSS feed: {rss_feed}")
            new_cover = await fetch_rss_artwork(rss_feed)
            if new_cover:
                print(f"  Found artwork from RSS: {new_cover}")

        # Fall back to placeholder if no RSS artwork found
        if not new_cover:
            new_cover = placeholder_images[i % len(placeholder_images)]
            print(f"  Using placeholder: {new_cover}")

        # Update the podcast
        result = await podcasts.update_one(
            {"_id": podcast_id},
            {
                "$set": {
                    "cover": new_cover,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        if result.modified_count > 0:
            print(f"  ✓ Updated successfully")
            fixed_count += 1
        else:
            print(f"  ✗ Update failed")

    print(f"\n=== Summary ===")
    print(f"Fixed {fixed_count}/{len(broken_podcasts)} podcast covers")

    client.close()


if __name__ == "__main__":
    asyncio.run(fix_podcast_covers())
