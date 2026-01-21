#!/usr/bin/env python3
"""Check how images are stored in Atlas."""

import asyncio
import os

from motor.motor_asyncio import AsyncIOMotorClient


async def check_images():
    atlas_url = os.getenv("MONGODB_URI")
    if not atlas_url:
        raise RuntimeError("MONGODB_URI environment variable not set")

    client = AsyncIOMotorClient(atlas_url)
    db = client["bayit_plus"]

    print("=== USER AVATARS ===")
    users = db["users"]
    cursor = users.find({}).limit(3)
    async for user in cursor:
        avatar = user.get("avatar_url", "NO AVATAR")
        print(f"User {user.get('email')}: avatar_url = {avatar}")

    print("\n=== PODCAST IMAGES ===")
    podcasts = db["podcasts"]
    cursor = podcasts.find({}).limit(3)
    async for podcast in cursor:
        image = podcast.get("image_url", "NO IMAGE")
        print(f"Podcast {podcast.get('name')}: image_url = {image}")

    print("\n=== CONTENT POSTERS ===")
    content = db["content"]
    cursor = content.find({}).limit(3)
    async for item in cursor:
        poster = item.get("poster_url", "NO POSTER")
        print(f"Content {item.get('title')}: poster_url = {poster}")

    client.close()


if __name__ == "__main__":
    asyncio.run(check_images())
