"""
Fix script to link Channel 11 widget to its live channel.

This script updates the Channel 11 system widget to reference
the correct live channel (כאן 11).
"""

import asyncio
import logging
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.widget import Widget, WidgetType
from app.models.content import LiveChannel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def fix_kan11_widget():
    """Link Channel 11 widget to the כאן 11 live channel."""

    # Initialize database
    client = AsyncIOMotorClient(settings.MONGODB_URI or settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    await init_beanie(
        database=db,
        document_models=[Widget, LiveChannel]
    )

    logger.info("=" * 80)
    logger.info("FIX KAN11 WIDGET")
    logger.info("=" * 80)

    # Find the Channel 11 widget
    logger.info("\n1. Finding Channel 11 widget...")
    widget = await Widget.find_one({
        "type": WidgetType.SYSTEM,
        "$or": [
            {"title": {"$regex": "channel.*11", "$options": "i"}},
            {"title": {"$regex": "11.*channel", "$options": "i"}},
        ]
    })

    if not widget:
        logger.error("❌ Channel 11 widget not found!")
        return

    logger.info(f"✅ Found widget: {widget.title} (ID: {widget.id})")
    logger.info(f"   Current live_channel_id: {widget.content.live_channel_id}")

    # Find the כאן 11 live channel
    logger.info("\n2. Finding כאן 11 live channel...")
    channel = await LiveChannel.find_one({
        "$or": [
            {"name": {"$regex": "כאן.*11", "$options": "i"}},
            {"name": {"$regex": "kan.*11", "$options": "i"}},
            {"name": "כאן 11"},
        ]
    })

    if not channel:
        logger.error("❌ כאן 11 live channel not found!")
        logger.info("\nSearching for any channel with '11'...")
        all_channels = await LiveChannel.find({"name": {"$regex": "11"}}).to_list()
        if all_channels:
            logger.info(f"Found {len(all_channels)} channels:")
            for ch in all_channels:
                logger.info(f"  - {ch.name} (ID: {ch.id})")
        return

    logger.info(f"✅ Found channel: {channel.name} (ID: {channel.id})")
    logger.info(f"   Is Active: {channel.is_active}")
    logger.info(f"   Stream URL: {channel.stream_url[:80] + '...' if channel.stream_url and len(channel.stream_url) > 80 else channel.stream_url or 'None'}")

    # Check if channel has stream_url
    if not channel.stream_url:
        logger.error("\n❌ WARNING: Channel has no stream_url!")
        logger.info("   The widget will be linked but still won't stream without a valid stream_url.")

    # Update widget
    logger.info(f"\n3. Linking widget to channel...")
    logger.info(f"   Setting widget.content.live_channel_id = {channel.id}")

    widget.content.live_channel_id = str(channel.id)
    await widget.save()

    logger.info("✅ Widget updated successfully!")

    # Verify the update
    logger.info("\n4. Verifying update...")
    updated_widget = await Widget.get(widget.id)
    if updated_widget and updated_widget.content.live_channel_id == str(channel.id):
        logger.info("✅ Verification passed!")
        logger.info(f"   Widget now references channel: {channel.name}")

        if channel.stream_url:
            logger.info("\n🎉 FIX COMPLETE!")
            logger.info("   The Channel 11 widget should now be streaming.")
            logger.info("   Refresh your browser to see the changes.")
        else:
            logger.warning("\n⚠️  FIX INCOMPLETE!")
            logger.warning("   Widget is linked but channel has no stream_url.")
            logger.info("   You need to add a stream_url to the channel to enable streaming.")
    else:
        logger.error("❌ Verification failed!")

    logger.info("=" * 80)


if __name__ == "__main__":
    asyncio.run(fix_kan11_widget())
