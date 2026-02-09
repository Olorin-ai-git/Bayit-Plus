"""
Fix missing widget posters by adding cover_url directly to widgets.

This script updates system widgets that are missing posters with appropriate cover images.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.widget import Widget
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Widget poster mappings (widget title -> cover_url)
WIDGET_POSTERS = {
    "Channel 11": "https://upload.wikimedia.org/wikipedia/he/thumb/5/58/Kan11Logo.svg/1200px-Kan11Logo.svg.png",
    "Channel 12 Live": "https://rcs.mako.co.il/images/headerV17/keshetLogoCut_150X72.jpg",
    "TLV Departures": "https://cdn-icons-png.flaticon.com/512/201/201623.png",
    "TLV Arrivals": "https://cdn-icons-png.flaticon.com/512/201/201623.png",
    "JFK - New York": "https://cdn-icons-png.flaticon.com/512/201/201623.png",
    "MIA - Miami": "https://cdn-icons-png.flaticon.com/512/201/201623.png",
    "LAX - Los Angeles": "https://cdn-icons-png.flaticon.com/512/201/201623.png",
    "EWR - Newark": "https://cdn-icons-png.flaticon.com/512/201/201623.png",
    "מבזקי Ynet": "https://www.ynet.co.il/Common/resources/images/logo_ynet_he.png",
    "103FM - Inon Magal & Ben Kaspit": "https://d203uamca1bsc4.cloudfront.net/AllFM/103fm.png",
    "103FM - בכר וקלינבוים - ארכיון פרקים": "https://d203uamca1bsc4.cloudfront.net/AllFM/103fm.png",
    "103FM - בן וינון, בקיצור - ארכיון פרקים": "https://d203uamca1bsc4.cloudfront.net/AllFM/103fm.png",
}


async def fix_widget_posters():
    """Update widgets with missing posters."""
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Widget]
    )

    logger.info("Starting widget poster fix...")

    updated_count = 0

    for title, cover_url in WIDGET_POSTERS.items():
        widget = await Widget.find_one({"title": title})

        if not widget:
            logger.warning(f"Widget '{title}' not found - skipping")
            continue

        if widget.cover_url:
            logger.info(f"Widget '{title}' already has cover_url - skipping")
            continue

        # Update widget with cover_url
        widget.cover_url = cover_url
        await widget.save()

        logger.info(f"✅ Updated '{title}' with poster: {cover_url}")
        updated_count += 1

    logger.info(f"\n🎉 Updated {updated_count} widgets with posters!")

    # Close connection
    client.close()


if __name__ == "__main__":
    asyncio.run(fix_widget_posters())
