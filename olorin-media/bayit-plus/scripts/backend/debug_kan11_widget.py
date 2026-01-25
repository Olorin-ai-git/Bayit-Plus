"""
Debug script to check kan11 system widget configuration.

This script:
1. Finds the Channel 11 system widget
2. Checks if it has a live_channel_id
3. Verifies the live channel exists
4. Checks if the channel has a valid stream_url
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


async def debug_kan11_widget():
    """Debug the kan11 system widget and its live channel."""

    # Initialize database
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    await init_beanie(
        database=db,
        document_models=[Widget, LiveChannel]
    )

    logger.info("=" * 80)
    logger.info("KAN11 WIDGET DIAGNOSTIC")
    logger.info("=" * 80)

    # 1. Find the Channel 11 system widget
    logger.info("\n1. Searching for Channel 11 system widget...")
    widget = await Widget.find_one({
        "type": WidgetType.SYSTEM,
        "$or": [
            {"title": {"$regex": "channel.*11", "$options": "i"}},
            {"title": {"$regex": "11.*channel", "$options": "i"}},
            {"title": {"$regex": "kan.*11", "$options": "i"}},
        ]
    })

    if not widget:
        logger.error("❌ Channel 11 system widget NOT FOUND!")
        logger.info("\nSearching for all channel widgets...")
        all_channel_widgets = await Widget.find({
            "type": WidgetType.SYSTEM,
            "title": {"$regex": "channel", "$options": "i"}
        }).to_list()

        if all_channel_widgets:
            logger.info(f"\nFound {len(all_channel_widgets)} channel widgets:")
            for w in all_channel_widgets:
                logger.info(f"  - {w.title} (ID: {w.id}, channel_id: {w.content.live_channel_id})")
        else:
            logger.info("No channel widgets found at all!")

        return

    logger.info(f"✅ Found widget: {widget.title}")
    logger.info(f"   Widget ID: {widget.id}")
    logger.info(f"   Description: {widget.description}")
    logger.info(f"   Content Type: {widget.content.content_type}")
    logger.info(f"   Live Channel ID: {widget.content.live_channel_id}")
    logger.info(f"   Is Active: {widget.is_active}")

    # 2. Check if live_channel_id exists
    logger.info("\n2. Checking live_channel_id...")
    if not widget.content.live_channel_id:
        logger.error("❌ Widget has NO live_channel_id!")
        logger.info("\nSearching for Channel 11 in live channels...")

        channel = await LiveChannel.find_one({
            "$or": [
                {"name": {"$regex": "channel.*11", "$options": "i"}},
                {"name": {"$regex": "ערוץ.*11", "$options": "i"}},
                {"name": {"$regex": "11.*channel", "$options": "i"}},
                {"name": {"$regex": "kan.*11", "$options": "i"}},
            ]
        })

        if channel:
            logger.info(f"✅ Found live channel: {channel.name} (ID: {channel.id})")
            logger.info(f"   SOLUTION: Update widget's live_channel_id to: {channel.id}")
            logger.info(f"   Stream URL: {channel.stream_url[:50] + '...' if channel.stream_url and len(channel.stream_url) > 50 else channel.stream_url}")
        else:
            logger.error("❌ No Channel 11 found in live channels!")
            logger.info("\nSearching for all channels with '11' in name...")
            all_11_channels = await LiveChannel.find({
                "name": {"$regex": "11", "$options": "i"}
            }).to_list()

            if all_11_channels:
                logger.info(f"\nFound {len(all_11_channels)} channels with '11':")
                for ch in all_11_channels:
                    logger.info(f"  - {ch.name} (ID: {ch.id}, active: {ch.is_active})")
            else:
                logger.info("No channels with '11' in name found!")

        return

    logger.info(f"✅ Widget has live_channel_id: {widget.content.live_channel_id}")

    # 3. Verify the live channel exists
    logger.info("\n3. Verifying live channel exists...")
    channel = await LiveChannel.get(widget.content.live_channel_id)

    if not channel:
        logger.error(f"❌ Live channel NOT FOUND with ID: {widget.content.live_channel_id}")
        logger.info("\n   The widget references a channel that doesn't exist!")
        logger.info("   SOLUTION: Either:")
        logger.info("   1. Create the missing channel, OR")
        logger.info("   2. Update the widget to reference an existing channel")
        return

    logger.info(f"✅ Found live channel: {channel.name}")
    logger.info(f"   Channel ID: {channel.id}")
    logger.info(f"   Is Active: {channel.is_active}")
    logger.info(f"   Stream Type: {channel.stream_type}")
    logger.info(f"   Category: {channel.category}")
    logger.info(f"   Logo: {channel.logo}")
    logger.info(f"   Thumbnail: {channel.thumbnail}")

    # 4. Check stream_url
    logger.info("\n4. Checking stream_url...")
    if not channel.stream_url:
        logger.error("❌ Live channel has NO stream_url!")
        logger.info("\n   SOLUTION: Add stream_url to the live channel document")
        logger.info("   Example: channel.stream_url = 'https://kan11.media.kan.org.il/hls/live/2105694/2105694/master.m3u8'")
    else:
        logger.info(f"✅ Channel has stream_url: {channel.stream_url[:80] + '...' if len(channel.stream_url) > 80 else channel.stream_url}")

        # Check if stream_url looks valid
        if channel.stream_url.startswith(('http://', 'https://')):
            logger.info("✅ Stream URL format looks valid (HTTP/HTTPS)")
        else:
            logger.warning(f"⚠️  Stream URL doesn't start with http:// or https://")

    # Summary
    logger.info("\n" + "=" * 80)
    logger.info("DIAGNOSTIC SUMMARY")
    logger.info("=" * 80)

    has_widget = widget is not None
    has_channel_id = widget.content.live_channel_id is not None if widget else False
    channel_exists = channel is not None if has_channel_id else False
    has_stream_url = channel.stream_url is not None if channel_exists else False

    logger.info(f"✅ Widget exists: {has_widget}")
    logger.info(f"{'✅' if has_channel_id else '❌'} Widget has live_channel_id: {has_channel_id}")
    logger.info(f"{'✅' if channel_exists else '❌'} Live channel exists: {channel_exists}")
    logger.info(f"{'✅' if has_stream_url else '❌'} Channel has stream_url: {has_stream_url}")

    if has_widget and has_channel_id and channel_exists and has_stream_url:
        logger.info("\n🎉 DIAGNOSIS: All checks passed! Widget should be streaming.")
        logger.info("   If it's still not working, check:")
        logger.info("   1. Browser console for errors")
        logger.info("   2. Network tab for failed requests")
        logger.info("   3. Stream URL accessibility (try opening in VLC)")
    elif not has_stream_url and channel_exists:
        logger.error("\n❌ DIAGNOSIS: Channel exists but missing stream_url")
        logger.info(f"   FIX: Update channel {channel.id} with a valid stream_url")
    elif not channel_exists and has_channel_id:
        logger.error("\n❌ DIAGNOSIS: Widget references non-existent channel")
        logger.info("   FIX: Update widget's live_channel_id to an existing channel")
    elif not has_channel_id:
        logger.error("\n❌ DIAGNOSIS: Widget missing live_channel_id")
        logger.info("   FIX: Set widget's content.live_channel_id to a valid channel ID")

    logger.info("=" * 80)


if __name__ == "__main__":
    asyncio.run(debug_kan11_widget())
