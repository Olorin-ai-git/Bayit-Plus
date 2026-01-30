"""
Check i24News Stream Health

Manual script to check the health of all i24News live channel streams.
Useful for troubleshooting and verification.

Usage:
    cd backend
    poetry run python -m scripts.check_i24news_health
"""

import asyncio
from datetime import UTC, datetime

import aiohttp
from app.core.config import settings
from app.models.content import LiveChannel
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient


async def check_stream(url: str, timeout: int = 10) -> dict:
    """Check if a stream URL is accessible."""
    try:
        timeout_obj = aiohttp.ClientTimeout(total=timeout)
        async with aiohttp.ClientSession(timeout=timeout_obj) as session:
            start_time = datetime.now(UTC)
            async with session.head(url) as response:
                elapsed = (datetime.now(UTC) - start_time).total_seconds()

                return {
                    "accessible": response.status == 200,
                    "status_code": response.status,
                    "response_time": elapsed,
                    "headers": dict(response.headers),
                    "error": None
                }

    except asyncio.TimeoutError:
        return {
            "accessible": False,
            "status_code": None,
            "response_time": timeout,
            "headers": {},
            "error": "Timeout"
        }
    except Exception as e:
        return {
            "accessible": False,
            "status_code": None,
            "response_time": None,
            "headers": {},
            "error": str(e)
        }


async def main():
    """Check health of all i24News channels."""
    print("\n=== i24News Stream Health Check ===\n")

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[LiveChannel])

    # Find all i24News channels
    channels = await LiveChannel.find(
        {"name": {"$regex": "i24", "$options": "i"}}
    ).to_list()

    if not channels:
        print("✗ No i24News channels found in database")
        return

    print(f"Found {len(channels)} i24News channel(s):\n")

    for channel in channels:
        print(f"📺 {channel.name} ({channel.primary_language})")
        print(f"   ID: {channel.id}")
        print(f"   Stream: {channel.stream_url[:100]}...")
        print(f"   Active: {channel.is_active}")

        # Check stream health
        print(f"   Checking stream health...")
        health = await check_stream(channel.stream_url)

        if health["accessible"]:
            print(f"   ✓ HEALTHY")
            print(f"     Status: {health['status_code']}")
            print(f"     Response Time: {health['response_time']:.2f}s")
            if "content-type" in health["headers"]:
                print(f"     Content-Type: {health['headers']['content-type']}")
        else:
            print(f"   ✗ UNHEALTHY")
            if health["status_code"]:
                print(f"     Status: {health['status_code']}")
            if health["error"]:
                print(f"     Error: {health['error']}")

        print()

    print("=== Official Stream URLs (for reference) ===\n")
    print("English: https://bcovlive-a.akamaihd.net/ecf224f43f3b43e69471a7b626481af0/eu-central-1/5377161796001/playlist.m3u8")
    print("Hebrew:  https://bcovlive-a.akamaihd.net/d89ede8094c741b7924120b27764153c/eu-central-1/5377161796001/playlist.m3u8")
    print("French:  https://bcovlive-a.akamaihd.net/41814196d97e433fb401c5e632d985e9/eu-central-1/5377161796001/playlist.m3u8")
    print("Arabic:  https://bcovlive-a.akamaihd.net/95116e8d79524d87bf3ac20ba04241e3/eu-central-1/5377161796001/playlist.m3u8")
    print()


if __name__ == "__main__":
    asyncio.run(main())
