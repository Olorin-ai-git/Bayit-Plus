"""
Radio Stream Testing and Cleanup Script

Tests all radio station streams and marks broken/inaccessible ones as inactive.

This script:
1. Fetches all active radio stations
2. Tests stream URL accessibility (with 15s timeout)
3. Marks broken streams as inactive
4. Reports detailed results

Usage:
    python -m app.scripts.test_radio_streams
"""

import asyncio
import logging

import aiohttp
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import RadioStation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def validate_stream_url(url: str, timeout: int = 15) -> bool:
    """
    Validate that a stream URL is accessible.

    Args:
        url: Stream URL to validate
        timeout: Connection timeout in seconds (default 15)

    Returns:
        True if stream is accessible, False otherwise
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.head(
                url,
                timeout=aiohttp.ClientTimeout(total=timeout),
                allow_redirects=True,
                ssl=False
            ) as response:
                # Accept 200-299 (success) and 206 (partial content for streaming)
                is_valid = response.status in range(200, 300) or response.status == 206
                return is_valid
    except asyncio.TimeoutError:
        logger.warning(f"Stream timeout: {url}")
        return False
    except aiohttp.ClientError as e:
        logger.warning(f"Stream error: {url} - {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {url} - {str(e)}")
        return False


async def test_all_radio_streams():
    """Test all radio station streams and mark broken ones as inactive."""
    logger.info("=" * 80)
    logger.info("RADIO STREAM TESTING")
    logger.info("=" * 80)

    # Initialize database connection
    logger.info("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[RadioStation]
    )
    logger.info("[OK] Connected to database")
    logger.info("")

    # Fetch all radio stations (both active and inactive)
    all_stations = await RadioStation.find().sort("order").to_list()
    logger.info(f"Found {len(all_stations)} total stations in database")

    # Separate active and inactive
    active_stations = [s for s in all_stations if s.is_active]
    inactive_stations = [s for s in all_stations if not s.is_active]

    logger.info(f"Active: {len(active_stations)}, Inactive: {len(inactive_stations)}")
    logger.info("")

    # Test active stations
    working = []
    broken = []

    logger.info("Testing active stations...")
    logger.info("-" * 80)

    for idx, station in enumerate(active_stations, 1):
        logger.info(f"[{idx}/{len(active_stations)}] Testing: {station.name} ({station.name_en})")
        logger.info(f"    URL: {station.stream_url}")

        is_accessible = await validate_stream_url(station.stream_url, timeout=15)

        if is_accessible:
            logger.info(f"[OK] WORKING")
            working.append(station)
        else:
            logger.error(f"[FAIL] BROKEN - Marking as inactive")
            station.is_active = False
            await station.save()
            broken.append(station)

        logger.info("")

    # Summary report
    logger.info("=" * 80)
    logger.info("SUMMARY")
    logger.info("=" * 80)
    logger.info(f"Total stations:    {len(all_stations)}")
    logger.info(f"Previously active: {len(active_stations)}")
    logger.info(f"Working: {len(working)} [OK]")
    logger.info(f"Broken: {len(broken)} [FAIL]")
    logger.info(f"Now active:        {len(working)}")
    logger.info("")

    if broken:
        logger.info("BROKEN STATIONS (marked inactive):")
        logger.info("-" * 80)
        for station in broken:
            logger.info(f"  • {station.name} ({station.name_en})")
            logger.info(f"    Genre: {station.genre}")
            logger.info(f"    URL: {station.stream_url}")
        logger.info("")

    if working:
        logger.info("WORKING STATIONS:")
        logger.info("-" * 80)
        for station in working:
            logger.info(f"  • {station.name} ({station.name_en}) - {station.genre}")

    logger.info("=" * 80)


def main():
    """Entry point"""
    asyncio.run(test_all_radio_streams())


if __name__ == "__main__":
    main()
