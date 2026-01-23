"""
Add Channel 12 to live channels and link widget
"""

import asyncio
from datetime import UTC, datetime

from app.core.config import settings
from app.models.content import LiveChannel
from app.models.widget import Widget, WidgetType
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient


async def main():
    print("[Setup] Connecting to MongoDB...")

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client[settings.MONGODB_DB_NAME]

    await init_beanie(database=database, document_models=[Widget, LiveChannel])

    # Check if Channel 12 already exists
    existing = await LiveChannel.find_one(
        {"name": {"$regex": "channel.*12|ערוץ.*12", "$options": "i"}}
    )

    if existing:
        print(f"[Setup] Channel 12 already exists: {existing.id}")
        channel = existing
    else:
        # Create Channel 12 - Israeli news/entertainment channel
        # Using a publicly available test stream as placeholder
        channel = LiveChannel(
            name="Channel 12",
            description="ערוץ 12 - חדשות ובידור",
            thumbnail="https://upload.wikimedia.org/wikipedia/he/thumb/6/67/Channel_12_Logo_2018.svg/200px-Channel_12_Logo_2018.svg.png",
            logo="https://upload.wikimedia.org/wikipedia/he/thumb/6/67/Channel_12_Logo_2018.svg/200px-Channel_12_Logo_2018.svg.png",
            # Placeholder stream - replace with actual Channel 12 stream URL
            stream_url="https://keshet-videopass-il.akamaized.net/keshet12/index.m3u8",
            stream_type="hls",
            is_drm_protected=False,
            epg_source=None,
            current_show="Live",
            next_show=None,
            is_active=True,
            order=0,
            requires_subscription="basic",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        await channel.insert()
        print(f"[Setup] Created Channel 12: {channel.id}")

    # Find and update the widget
    widget = await Widget.find_one(
        {"type": WidgetType.SYSTEM, "title": {"$regex": "channel.*12", "$options": "i"}}
    )

    if widget:
        widget.content.live_channel_id = str(channel.id)
        widget.updated_at = datetime.now(UTC)
        await widget.save()
        print(f"[Setup] Updated widget {widget.id} with channel {channel.id}")
    else:
        print("[Setup] Widget not found - run init_default_widgets.py first")

    print("[Setup] Done!")


if __name__ == "__main__":
    asyncio.run(main())
