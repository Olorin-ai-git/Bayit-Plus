"""Find Ice Age movie"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb+srv://bayitadmin:OxQLqFhDe3aSEW8i@bayit-cluster.dpqfmvn.mongodb.net/")
    db = client["bayit_plus"]

    movies = await db.content.find({"title": {"$regex": "Ice Age", "$options": "i"}}).to_list(length=10)

    if not movies:
        print("No Ice Age movies found")
        return

    print(f"Found {len(movies)} Ice Age movie(s):\n")
    for movie in movies:
        print(f"ID: {movie['_id']}")
        print(f"Title: {movie.get('title')}")
        print(f"Stream URL: {movie.get('stream_url', 'N/A')}")
        print(f"Has Subtitles: {movie.get('has_subtitles', False)}")
        print("---")

asyncio.run(main())
