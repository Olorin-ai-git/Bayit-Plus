"""
Initialize Default Widgets

Creates the default Channel 12 live stream widget on first run.
Run this script manually or integrate into startup:

    python -m scripts.init_default_widgets

Or integrate into main.py startup event.
"""

import asyncio
from datetime import datetime

from app.core.config import settings
from app.models.content import LiveChannel
from app.models.widget import (
    Widget,
    WidgetContent,
    WidgetContentType,
    WidgetPosition,
    WidgetType,
)
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient


async def find_channel_12():
    """Find Channel 12 in the live channels collection."""
    # Try to find by name patterns
    channel = await LiveChannel.find_one(
        {
            "$or": [
                {"name": {"$regex": "channel.*12", "$options": "i"}},
                {"name": {"$regex": "ערוץ.*12", "$options": "i"}},
                {"name": {"$regex": "12.*channel", "$options": "i"}},
            ]
        }
    )
    return channel


async def create_default_channel_12_widget():
    """Create the default Channel 12 widget if it doesn't exist."""

    # Check if widget already exists
    existing = await Widget.find_one(
        {"type": WidgetType.SYSTEM, "title": {"$regex": "channel.*12", "$options": "i"}}
    )

    if existing:
        print(f"[Widgets] Channel 12 widget already exists: {existing.id}")
        return existing

    # Find Channel 12 in live channels
    channel = await find_channel_12()

    if not channel:
        print(
            "[Widgets] Channel 12 not found in live channels. Creating widget without channel reference."
        )
        print(
            "[Widgets] You can manually update the widget with the correct channel ID later."
        )

    # Create the widget
    widget = Widget(
        type=WidgetType.SYSTEM,
        title="Channel 12 Live",
        description="ערוץ 12 שידור חי",
        icon="📺",
        content=WidgetContent(
            content_type=WidgetContentType.LIVE_CHANNEL,
            live_channel_id=str(channel.id) if channel else None,
        ),
        position=WidgetPosition(
            x=20,
            y=100,
            width=320,
            height=180,
            z_index=100,
        ),
        is_active=True,
        is_muted=True,
        is_visible=True,
        is_closable=True,
        is_draggable=True,
        visible_to_roles=["user", "admin", "premium"],
        visible_to_subscription_tiers=[],
        target_pages=[],  # Show on all pages
        order=0,
        created_by="system",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    await widget.insert()
    print(f"[Widgets] Created default Channel 12 widget: {widget.id}")

    if channel:
        print(f"[Widgets] Linked to live channel: {channel.name} ({channel.id})")
    else:
        print(
            "[Widgets] Widget created but not linked to a channel. Update manually when Channel 12 is added."
        )

    return widget


async def main():
    """Initialize database and create default widgets."""
    print("[Widgets] Connecting to MongoDB...")

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    database = client[settings.MONGODB_DB_NAME]

    # Initialize Beanie
    await init_beanie(database=database, document_models=[Widget, LiveChannel])

    print("[Widgets] Creating default widgets...")
    await create_default_channel_12_widget()

    print("[Widgets] Done!")


if __name__ == "__main__":
    asyncio.run(main())
