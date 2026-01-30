"""
Update i24News Stream URLs with actual HLS URLs

This script helps extract and update the actual HLS m3u8 URLs for i24News
YouTube live streams.

Prerequisites:
    pip install yt-dlp

Usage:
    cd backend
    poetry run python -m scripts.update_i24news_stream_urls
"""

import asyncio
import subprocess
from typing import Optional

from app.core.config import settings
from app.models.content import LiveChannel
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient


def get_youtube_hls_url(youtube_url: str) -> Optional[str]:
    """
    Extract HLS m3u8 URL from YouTube live stream using yt-dlp.

    Args:
        youtube_url: YouTube channel or live stream URL

    Returns:
        HLS m3u8 URL or None if extraction fails
    """
    try:
        print(f"  Extracting HLS URL from: {youtube_url}")
        result = subprocess.run(
            ["yt-dlp", "-f", "best", "-g", youtube_url],
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0:
            url = result.stdout.strip()
            if url and ".m3u8" in url:
                print(f"  ✓ Found HLS URL: {url[:100]}...")
                return url
            else:
                print(f"  ✗ No HLS URL found in output")
                return None
        else:
            print(f"  ✗ yt-dlp failed: {result.stderr}")
            return None

    except FileNotFoundError:
        print("  ✗ yt-dlp not found. Install with: pip install yt-dlp")
        return None
    except subprocess.TimeoutExpired:
        print("  ✗ Timeout while extracting URL")
        return None
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return None


async def update_channel_stream_url(channel: LiveChannel, youtube_url: str):
    """Update channel's stream URL with extracted HLS URL."""
    hls_url = get_youtube_hls_url(youtube_url)

    if hls_url:
        channel.stream_url = hls_url
        await channel.save()
        print(f"  ✓ Updated channel {channel.name}")
        return True
    else:
        print(f"  ✗ Failed to update channel {channel.name}")
        print(f"    Manual update required: {youtube_url}")
        return False


async def main():
    """Main update function."""
    print("[i24News] Connecting to MongoDB...")

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    database = client[settings.MONGODB_DB_NAME]

    await init_beanie(database=database, document_models=[LiveChannel])

    print("\n[i24News] Updating stream URLs...\n")

    # Find English channel
    en_channel = await LiveChannel.find_one(
        {"name": {"$regex": "i24.*news.*english|i24news.*en", "$options": "i"}}
    )

    if en_channel:
        print("English Channel:")
        await update_channel_stream_url(
            en_channel,
            "https://www.youtube.com/@i24NEWS_EN/streams"
        )
    else:
        print("✗ English channel not found")

    print()

    # Find Hebrew channel
    he_channel = await LiveChannel.find_one(
        {"name": {"$regex": "i24.*news.*hebrew|i24.*עברית", "$options": "i"}}
    )

    if he_channel:
        print("Hebrew Channel:")
        await update_channel_stream_url(
            he_channel,
            "https://www.youtube.com/@i24news_he/streams"
        )
    else:
        print("✗ Hebrew channel not found")

    print("\n[i24News] Update Complete!")
    print("\n⚠️  NOTE: YouTube live stream URLs expire after some time.")
    print("  You may need to run this script periodically to refresh URLs.")
    print("  Consider implementing automatic URL refresh in the backend.")


if __name__ == "__main__":
    asyncio.run(main())
