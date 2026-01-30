"""
Update i24News channels with official Brightcove/Akamai HLS streams

Official stream URLs discovered from iptv-org public repository.
These are more stable than YouTube streams and don't require periodic refresh.

Source: https://github.com/iptv-org/iptv

Usage:
    cd backend
    poetry run python -m scripts.update_i24news_official_streams
"""

import asyncio
from datetime import UTC, datetime

from app.core.config import settings
from app.models.content import LiveChannel
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

# Official i24News HLS streams from Brightcove/Akamai CDN
OFFICIAL_STREAMS = {
    "english": {
        "name": "i24News English",
        "url": "https://bcovlive-a.akamaihd.net/ecf224f43f3b43e69471a7b626481af0/eu-central-1/5377161796001/playlist.m3u8",
        "quality": "720p",
        "provider": "Brightcove/Akamai CDN"
    },
    "hebrew": {
        "name": "i24News Hebrew",
        "url": "https://bcovlive-a.akamaihd.net/d89ede8094c741b7924120b27764153c/eu-central-1/5377161796001/playlist.m3u8",
        "quality": "720p",
        "provider": "Brightcove/Akamai CDN"
    },
    "french": {
        "name": "i24News French",
        "url": "https://bcovlive-a.akamaihd.net/41814196d97e433fb401c5e632d985e9/eu-central-1/5377161796001/playlist.m3u8",
        "quality": "720p",
        "provider": "Brightcove/Akamai CDN"
    },
    "arabic": {
        "name": "i24News Arabic",
        "url": "https://bcovlive-a.akamaihd.net/95116e8d79524d87bf3ac20ba04241e3/eu-central-1/5377161796001/playlist.m3u8",
        "quality": "720p",
        "provider": "Brightcove/Akamai CDN"
    }
}


async def update_channel(channel: LiveChannel, stream_config: dict) -> bool:
    """Update channel with official stream URL."""
    old_url = channel.stream_url
    new_url = stream_config["url"]

    if old_url == new_url:
        print(f"  ✓ {channel.name} already has correct stream URL")
        return False

    channel.stream_url = new_url
    channel.stream_type = "hls"
    channel.updated_at = datetime.now(UTC)
    await channel.save()

    print(f"  ✓ Updated {channel.name}")
    print(f"    Old: {old_url[:80]}...")
    print(f"    New: {new_url[:80]}...")
    print(f"    Provider: {stream_config['provider']}")
    print(f"    Quality: {stream_config['quality']}")
    return True


async def main():
    """Update i24News channels with official streams."""
    print("[i24News] Connecting to MongoDB...")

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    database = client[settings.MONGODB_DB_NAME]

    await init_beanie(database=database, document_models=[LiveChannel])

    print("\n[i24News] Updating channels with official Brightcove/Akamai streams...\n")

    updated_count = 0

    # Update English channel
    en_channel = await LiveChannel.find_one(
        {"name": {"$regex": "i24.*news.*english|i24news.*en", "$options": "i"}}
    )
    if en_channel:
        print("English Channel:")
        if await update_channel(en_channel, OFFICIAL_STREAMS["english"]):
            updated_count += 1
    else:
        print("✗ English channel not found")

    print()

    # Update Hebrew channel
    he_channel = await LiveChannel.find_one(
        {"name": {"$regex": "i24.*news.*hebrew|i24.*עברית", "$options": "i"}}
    )
    if he_channel:
        print("Hebrew Channel:")
        if await update_channel(he_channel, OFFICIAL_STREAMS["hebrew"]):
            updated_count += 1
    else:
        print("✗ Hebrew channel not found")

    print()
    print(f"[i24News] Update Complete! {updated_count} channel(s) updated.")
    print("\n✓ Benefits of official streams:")
    print("  • More reliable than YouTube streams")
    print("  • No expiration issues")
    print("  • Better quality (720p)")
    print("  • Direct CDN delivery (Akamai)")
    print("  • No need for periodic URL refresh")
    print("\n📝 Source: https://github.com/iptv-org/iptv")


if __name__ == "__main__":
    asyncio.run(main())
