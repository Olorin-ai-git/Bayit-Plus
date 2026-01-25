"""
Populate cover_url for all widgets from their linked content.

This script updates widgets with cover images from:
- Live channels → thumbnail or logo
- Podcasts → cover
- Radio stations → logo
- VOD content → thumbnail or backdrop
"""

import asyncio
import logging
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.widget import Widget, WidgetContentType
from app.models.content import LiveChannel, Podcast, RadioStation, Content

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def populate_widget_covers():
    """Populate cover_url for all widgets from their linked content."""

    # Initialize database
    client = AsyncIOMotorClient(settings.MONGODB_URI or settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    await init_beanie(
        database=db,
        document_models=[Widget, LiveChannel, Podcast, RadioStation, Content]
    )

    logger.info("=" * 80)
    logger.info("POPULATE WIDGET COVERS")
    logger.info("=" * 80)

    # Get all widgets
    logger.info("\nFetching all widgets...")
    widgets = await Widget.find_all().to_list()
    logger.info(f"Found {len(widgets)} widgets")

    updated_count = 0
    skipped_count = 0
    error_count = 0

    for widget in widgets:
        widget_type = widget.content.content_type
        logger.info(f"\nProcessing: {widget.title} ({widget_type})")

        try:
            cover_url = None

            # Get cover based on content type
            if widget_type == WidgetContentType.LIVE_CHANNEL or widget_type == WidgetContentType.LIVE:
                if widget.content.live_channel_id:
                    channel = await LiveChannel.get(widget.content.live_channel_id)
                    if channel:
                        cover_url = channel.thumbnail or channel.logo
                        logger.info(f"  Found channel: {channel.name}")
                        logger.info(f"  Cover URL: {cover_url}")
                    else:
                        logger.warning(f"  ⚠️  Channel not found: {widget.content.live_channel_id}")
                else:
                    logger.warning(f"  ⚠️  No live_channel_id set")

            elif widget_type == WidgetContentType.PODCAST:
                if widget.content.podcast_id:
                    podcast = await Podcast.get(widget.content.podcast_id)
                    if podcast:
                        cover_url = podcast.cover
                        logger.info(f"  Found podcast: {podcast.title}")
                        logger.info(f"  Cover URL: {cover_url}")
                    else:
                        logger.warning(f"  ⚠️  Podcast not found: {widget.content.podcast_id}")
                else:
                    logger.warning(f"  ⚠️  No podcast_id set")

            elif widget_type == WidgetContentType.RADIO:
                if widget.content.station_id:
                    station = await RadioStation.get(widget.content.station_id)
                    if station:
                        cover_url = station.logo
                        logger.info(f"  Found station: {station.name}")
                        logger.info(f"  Cover URL: {cover_url}")
                    else:
                        logger.warning(f"  ⚠️  Station not found: {widget.content.station_id}")
                else:
                    logger.warning(f"  ⚠️  No station_id set")

            elif widget_type == WidgetContentType.VOD:
                if widget.content.content_id:
                    content = await Content.get(widget.content.content_id)
                    if content:
                        cover_url = content.thumbnail or content.backdrop
                        logger.info(f"  Found content: {content.title}")
                        logger.info(f"  Cover URL: {cover_url}")
                    else:
                        logger.warning(f"  ⚠️  Content not found: {widget.content.content_id}")
                else:
                    logger.warning(f"  ⚠️  No content_id set")

            elif widget_type == WidgetContentType.IFRAME:
                logger.info(f"  Skipping iframe widget (no cover)")
                skipped_count += 1
                continue

            elif widget_type == WidgetContentType.CUSTOM:
                logger.info(f"  Skipping custom widget (no cover)")
                skipped_count += 1
                continue

            # Update widget if cover_url found
            if cover_url:
                widget.cover_url = cover_url
                await widget.save()
                logger.info(f"  ✅ Updated widget with cover_url")
                updated_count += 1
            else:
                logger.warning(f"  ⚠️  No cover URL found")
                skipped_count += 1

        except Exception as e:
            logger.error(f"  ❌ Error processing widget: {e}")
            error_count += 1

    # Summary
    logger.info("\n" + "=" * 80)
    logger.info("SUMMARY")
    logger.info("=" * 80)
    logger.info(f"Total widgets: {len(widgets)}")
    logger.info(f"✅ Updated: {updated_count}")
    logger.info(f"⚠️  Skipped: {skipped_count}")
    logger.info(f"❌ Errors: {error_count}")
    logger.info("=" * 80)

    if updated_count > 0:
        logger.info("\n🎉 Widget covers populated successfully!")
        logger.info("   Refresh the admin widgets page to see the changes.")


if __name__ == "__main__":
    asyncio.run(populate_widget_covers())
