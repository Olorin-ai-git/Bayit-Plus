"""
Add i24News Live Channels (English & Hebrew) to Bayit+

i24NEWS is a 24-hour international news channel broadcasting from Israel.
This script adds both English and Hebrew language channels with proper logos
and widgets for seamless bilingual viewing.

Usage:
    cd backend
    poetry run python -m scripts.add_i24news_channels
"""

import asyncio
from datetime import UTC, datetime

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


async def add_i24news_english():
    """Add i24News English channel."""
    existing = await LiveChannel.find_one(
        {"name": {"$regex": "i24.*news.*english|i24news.*en", "$options": "i"}}
    )

    if existing:
        print(f"[i24News] English channel already exists: {existing.id}")
        return existing

    channel = LiveChannel(
        name="i24News English",
        name_en="i24News English",
        name_es="i24News Inglés",
        description="International news from Israel and the Middle East - English",
        description_en="24/7 international news coverage from Israel and the Middle East",
        description_es="Noticias internacionales de Israel y Oriente Medio las 24 horas",
        thumbnail="https://cdn.brandfetch.io/idxvYMpvXo/w/800/h/571/theme/light/logo.png",
        logo="https://cdn.brandfetch.io/idxvYMpvXo/w/800/h/571/theme/light/logo.png",
        category="news",
        culture_id="israeli",
        # YouTube live stream URL - NOTE: This needs to be updated with actual HLS URL
        # YouTube live streams require extracting m3u8 URL from: https://www.youtube.com/@i24NEWS_EN/streams
        stream_url="https://www.youtube.com/@i24NEWS_EN/streams",
        stream_type="hls",
        is_drm_protected=False,
        epg_source=None,
        current_show="Live News",
        next_show=None,
        supports_live_subtitles=True,
        primary_language="en",
        available_translation_languages=["en", "he", "es", "ar", "ru", "fr"],
        supports_live_dubbing=False,
        is_active=True,
        order=10,
        requires_subscription="premium",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    await channel.insert()
    print(f"[i24News] Created English channel: {channel.id}")
    return channel


async def add_i24news_hebrew():
    """Add i24News Hebrew channel."""
    existing = await LiveChannel.find_one(
        {"name": {"$regex": "i24.*news.*hebrew|i24.*עברית", "$options": "i"}}
    )

    if existing:
        print(f"[i24News] Hebrew channel already exists: {existing.id}")
        return existing

    channel = LiveChannel(
        name="i24News עברית",
        name_en="i24News Hebrew",
        name_es="i24News Hebreo",
        description="חדשות בינלאומיות מישראל והמזרח התיכון - עברית",
        description_en="24/7 international news coverage from Israel and the Middle East in Hebrew",
        description_es="Noticias internacionales de Israel y Oriente Medio en hebreo",
        thumbnail="https://cdn.brandfetch.io/idxvYMpvXo/w/800/h/571/theme/light/logo.png",
        logo="https://cdn.brandfetch.io/idxvYMpvXo/w/800/h/571/theme/light/logo.png",
        category="news",
        culture_id="israeli",
        # YouTube live stream URL - NOTE: This needs to be updated with actual HLS URL
        # YouTube live streams require extracting m3u8 URL from: https://www.youtube.com/@i24news_he/streams
        stream_url="https://www.youtube.com/@i24news_he/streams",
        stream_type="hls",
        is_drm_protected=False,
        epg_source=None,
        current_show="חדשות חיות",
        next_show=None,
        supports_live_subtitles=True,
        primary_language="he",
        available_translation_languages=["he", "en", "es", "ar", "ru", "fr"],
        supports_live_dubbing=False,
        is_active=True,
        order=11,
        requires_subscription="premium",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    await channel.insert()
    print(f"[i24News] Created Hebrew channel: {channel.id}")
    return channel


async def create_widget(channel: LiveChannel, title: str, description: str, order: int):
    """Create widget for i24News channel."""
    existing = await Widget.find_one(
        {"type": WidgetType.SYSTEM, "title": title}
    )

    if existing:
        print(f"[i24News] Widget '{title}' already exists: {existing.id}")
        return existing

    widget = Widget(
        type=WidgetType.SYSTEM,
        title=title,
        description=description,
        icon="📰",
        cover_url=channel.logo,
        content=WidgetContent(
            content_type=WidgetContentType.LIVE_CHANNEL,
            live_channel_id=str(channel.id),
        ),
        position=WidgetPosition(
            x=20,
            y=100 + (order * 200),  # Stack widgets vertically
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
        visible_to_subscription_tiers=["premium", "family"],
        target_pages=[],  # Show on all pages
        order=order,
        created_by="system",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    await widget.insert()
    print(f"[i24News] Created widget '{title}': {widget.id}")
    return widget


async def main():
    """Main setup function."""
    print("[i24News] Connecting to MongoDB...")

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    database = client[settings.MONGODB_DB_NAME]

    await init_beanie(database=database, document_models=[LiveChannel, Widget])

    print("[i24News] Adding i24News channels...")

    # Add English channel
    en_channel = await add_i24news_english()
    en_widget = await create_widget(
        en_channel,
        "i24News English Live",
        "International news from Israel - English",
        10
    )

    # Add Hebrew channel
    he_channel = await add_i24news_hebrew()
    he_widget = await create_widget(
        he_channel,
        "i24News עברית Live",
        "חדשות בינלאומיות מישראל - עברית",
        11
    )

    print("\n[i24News] Setup Complete!")
    print(f"  English Channel: {en_channel.id}")
    print(f"  English Widget: {en_widget.id}")
    print(f"  Hebrew Channel: {he_channel.id}")
    print(f"  Hebrew Widget: {he_widget.id}")
    print("\n⚠️  IMPORTANT: Update stream URLs with actual HLS m3u8 URLs")
    print("  English: https://www.youtube.com/@i24NEWS_EN/streams")
    print("  Hebrew: https://www.youtube.com/@i24news_he/streams")


if __name__ == "__main__":
    asyncio.run(main())
