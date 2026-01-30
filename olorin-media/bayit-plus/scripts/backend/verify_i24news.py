"""Verify i24News channels and widgets in database."""

import asyncio

from app.core.config import settings
from app.models.content import LiveChannel
from app.models.widget import Widget, WidgetType
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient


async def main():
    """Verify i24News setup."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[LiveChannel, Widget])

    print("\n=== i24News Channels ===\n")
    channels = await LiveChannel.find({"name": {"$regex": "i24", "$options": "i"}}).to_list()
    print(f"Found {len(channels)} i24News channels:\n")
    for ch in channels:
        print(f"  • {ch.name} ({ch.name_en})")
        print(f"    ID: {ch.id}")
        print(f"    Language: {ch.primary_language}")
        print(f"    Stream: {ch.stream_url[:80]}...")
        print(f"    Active: {ch.is_active}")
        print(f"    Order: {ch.order}")
        print()

    print("\n=== i24News Widgets ===\n")
    widgets = await Widget.find(
        {"type": WidgetType.SYSTEM, "title": {"$regex": "i24", "$options": "i"}}
    ).to_list()
    print(f"Found {len(widgets)} i24News widgets:\n")
    for w in widgets:
        print(f"  • {w.title}")
        print(f"    ID: {w.id}")
        print(f"    Channel ID: {w.content.live_channel_id}")
        print(f"    Active: {w.is_active}")
        print(f"    Order: {w.order}")
        print(f"    Position: ({w.position.x}, {w.position.y})")
        print()


if __name__ == "__main__":
    asyncio.run(main())
