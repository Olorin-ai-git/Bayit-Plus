"""
Enable live dubbing for all live channels.

This script updates all LiveChannel documents to support live dubbing
by setting supports_live_dubbing=True and configuring default dubbing parameters.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import LiveChannel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def enable_dubbing_for_all_channels():
    """Enable live dubbing for all channels with default configuration."""

    # Initialize database connection
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[LiveChannel],
    )

    logger.info("Connected to MongoDB")

    # Get all live channels
    channels = await LiveChannel.find_all().to_list()
    logger.info(f"Found {len(channels)} live channels")

    # Default dubbing configuration
    default_config = {
        "supports_live_dubbing": True,
        "dubbing_source_language": "he",  # Hebrew source for most Israeli channels
        "available_dubbing_languages": ["en", "es", "ar", "ru", "fr", "de"],
        "dubbing_sync_delay_ms": 600,
        # default_dubbing_voice_id will use service default if not set
    }

    updated_count = 0

    for channel in channels:
        # Only update if dubbing is not already enabled
        if not channel.supports_live_dubbing:
            logger.info(f"Enabling dubbing for channel: {channel.name} ({channel.id})")

            # Update channel with dubbing config
            channel.supports_live_dubbing = True
            channel.dubbing_source_language = default_config["dubbing_source_language"]
            channel.available_dubbing_languages = default_config["available_dubbing_languages"]
            channel.dubbing_sync_delay_ms = default_config["dubbing_sync_delay_ms"]

            await channel.save()
            updated_count += 1
        else:
            logger.info(f"Dubbing already enabled for: {channel.name}")

    logger.info(f"\n✅ Enabled dubbing for {updated_count} channels")
    logger.info(f"📊 Total channels: {len(channels)}")
    logger.info(f"🎙️  Already enabled: {len(channels) - updated_count}")


async def main():
    """Main entry point."""
    try:
        await enable_dubbing_for_all_channels()
    except Exception as e:
        logger.error(f"❌ Error enabling dubbing: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
