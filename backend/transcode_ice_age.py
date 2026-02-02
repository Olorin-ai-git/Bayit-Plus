"""
Transcode Ice Age to HLS with subtitle support
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.content import Content
from app.services.upload_service.hls import hls_service

async def main():
    # Connect to database
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Content]
    )

    # Find Ice Age movie
    movies = await Content.find({"title": {"$regex": "Ice Age", "$options": "i"}}).to_list()

    if not movies:
        print("No Ice Age movies found")
        return

    print(f"Found {len(movies)} Ice Age movie(s):")
    for i, movie in enumerate(movies):
        print(f"{i+1}. {movie.title} (ID: {movie.id})")
        print(f"   Stream URL: {movie.stream_url}")
        print(f"   Has Subtitles: {movie.has_subtitles}")

    # Use first one
    content = movies[0]
    print(f"\nTranscoding: {content.title}")

    # Check if already HLS
    if content.stream_url and ".m3u8" in content.stream_url:
        print("Already in HLS format!")
        return

    # Convert to HLS
    print("Converting to HLS (this will take a while)...")

    def on_progress(msg: str, progress: float):
        print(f"  {msg} ({progress:.0f}%)")

    hls_url = await hls_service.convert_and_upload(
        source_path=content.stream_url,
        content_title=content.title,
        content_type="movies",
        on_progress=on_progress
    )

    if hls_url:
        # Update content
        old_url = content.stream_url
        content.stream_url = hls_url

        if not content.metadata:
            content.metadata = {}
        content.metadata["original_stream_url"] = old_url
        content.metadata["hls_migrated_at"] = "2026-02-02"

        await content.save()

        print(f"\n✅ Successfully converted to HLS: {hls_url}")
        print(f"Content ID: {content.id}")
    else:
        print("\n❌ Conversion failed")

if __name__ == "__main__":
    asyncio.run(main())
