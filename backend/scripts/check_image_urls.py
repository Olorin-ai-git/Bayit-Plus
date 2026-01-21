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
    user = await users.find_one({"avatar_url": {"$exists": True, "$ne": None}})
    if user:
        print(f"Sample user avatar_url: {user.get('avatar_url')}")
        print(f"Full user doc: {user.get('email')}")

    print("\n=== PODCAST IMAGES ===")
    podcasts = db["podcasts"]
    podcast = await podcasts.find_one({"image_url": {"$exists": True, "$ne": None}})
    if podcast:
        print(f"Sample podcast image_url: {podcast.get('image_url')}")
        print(f"Podcast name: {podcast.get('name')}")

    print("\n=== CONTENT POSTERS ===")
    content = db["content"]
    movie = await content.find_one({"poster_url": {"$exists": True, "$ne": None}})
    if movie:
        print(f"Sample content poster_url: {movie.get('poster_url')}")
        print(f"Content title: {movie.get('title')}")

    client.close()


if __name__ == "__main__":
    asyncio.run(check_images())
