"""
Widget seeder module for initializing default system widgets.

This module handles the creation of default widgets on server startup.
Widgets are only created if they don't already exist (idempotent).
"""

import logging
from datetime import datetime

from app.models.content import LiveChannel
from app.models.widget import (
    Widget,
    WidgetContent,
    WidgetContentType,
    WidgetPosition,
    WidgetType,
)
from app.services.startup.defaults import (
    CHANNEL_WIDGETS,
    FLIGHT_WIDGETS,
    PODCAST_WIDGETS,
    YNET_WIDGET_CONFIG,
)

logger = logging.getLogger(__name__)


async def _create_flight_widgets() -> int:
    """Create flight status widgets. Returns count of widgets created."""
    created_count = 0

    for config in FLIGHT_WIDGETS:
        existing = await Widget.find_one(
            {
                "type": WidgetType.SYSTEM,
                "title": config["title"],
            }
        )

        if existing:
            logger.info(
                f"Flight widget '{config['title']}' already exists: {existing.id}"
            )
            continue

        widget = Widget(
            type=WidgetType.SYSTEM,
            title=config["title"],
            description=config["description"],
            icon=config["icon"],
            content=WidgetContent(
                content_type=WidgetContentType.IFRAME,
                iframe_url=config["iframe_url"],
                iframe_title=config["title"],
            ),
            position=WidgetPosition(
                x=config["position"]["x"],
                y=config["position"]["y"],
                width=config["position"]["width"],
                height=config["position"]["height"],
                z_index=100,
            ),
            is_active=True,
            is_muted=True,
            is_visible=True,
            is_closable=True,
            is_draggable=True,
            visible_to_roles=["user", "admin", "premium"],
            visible_to_subscription_tiers=[],
            target_pages=[],
            order=config["order"],
            created_by="system",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        await widget.insert()
        logger.info(f"Created flight widget '{config['title']}': {widget.id}")
        created_count += 1

    return created_count


async def _create_ynet_widget() -> bool:
    """Create or update Ynet mivzakim widget. Returns True if created/updated."""
    config = YNET_WIDGET_CONFIG

    existing = await Widget.find_one(
        {
            "type": WidgetType.SYSTEM,
            "title": config["title"],
        }
    )

    if existing:
        # Update existing widget to use CUSTOM type if it was IFRAME
        if existing.content.content_type == WidgetContentType.IFRAME:
            existing.content.content_type = WidgetContentType.CUSTOM
            existing.content.component_name = config["component_name"]
            existing.content.iframe_url = None
            existing.content.iframe_title = None
            await existing.save()
            logger.info(f"Updated Ynet widget to use custom component: {existing.id}")
            return True
        logger.info(f"Ynet mivzakim widget already exists: {existing.id}")
        return False

    widget = Widget(
        type=WidgetType.SYSTEM,
        title=config["title"],
        description=config["description"],
        icon=config["icon"],
        content=WidgetContent(
            content_type=WidgetContentType.CUSTOM,
            component_name=config["component_name"],
        ),
        position=WidgetPosition(
            x=config["position"]["x"],
            y=config["position"]["y"],
            width=config["position"]["width"],
            height=config["position"]["height"],
            z_index=100,
        ),
        is_active=True,
        is_muted=True,
        is_visible=True,
        is_closable=True,
        is_draggable=True,
        visible_to_roles=["user", "admin", "premium"],
        visible_to_subscription_tiers=[],
        target_pages=[],
        order=config["order"],
        created_by="system",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    await widget.insert()
    logger.info(f"Created Ynet mivzakim widget: {widget.id}")
    return True


async def _create_podcast_widgets() -> int:
    """Create podcast widgets. Returns count of widgets created."""
    created_count = 0

    for config in PODCAST_WIDGETS:
        existing = await Widget.find_one(
            {
                "type": WidgetType.SYSTEM,
                "title": config["title"],
            }
        )

        if existing:
            logger.info(
                f"Default podcast widget '{config['title']}' already exists: {existing.id}"
            )
            continue

        widget = Widget(
            type=WidgetType.SYSTEM,
            title=config["title"],
            description=config["description"],
            icon=config["icon"],
            content=WidgetContent(
                content_type=WidgetContentType.PODCAST,
                podcast_id=config["podcast_id"],
            ),
            position=WidgetPosition(
                x=config["position"]["x"],
                y=config["position"]["y"],
                width=350,
                height=197,
                z_index=100,
            ),
            is_active=True,
            is_muted=True,
            is_visible=True,
            is_closable=True,
            is_draggable=True,
            visible_to_roles=["user", "admin", "premium"],
            visible_to_subscription_tiers=[],
            target_pages=[],
            order=config["order"],
            created_by="system",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        await widget.insert()
        logger.info(f"Created default podcast widget '{config['title']}': {widget.id}")
        created_count += 1

    return created_count


async def _create_channel_widgets() -> int:
    """Create live channel widgets. Returns count of widgets created."""
    created_count = 0

    for config in CHANNEL_WIDGETS:
        channel_num = config["channel_num"]

        # Check if widget already exists
        existing = await Widget.find_one(
            {
                "type": WidgetType.SYSTEM,
                "title": {"$regex": f"channel.*{channel_num}", "$options": "i"},
            }
        )

        if existing:
            logger.info(
                f"Default Channel {channel_num} widget already exists: {existing.id}"
            )
            continue

        # Try to find the channel in live channels
        channel = await LiveChannel.find_one(
            {
                "$or": [
                    {"name": {"$regex": f"channel.*{channel_num}", "$options": "i"}},
                    {"name": {"$regex": f"ערוץ.*{channel_num}", "$options": "i"}},
                    {"name": {"$regex": f"{channel_num}.*channel", "$options": "i"}},
                ]
            }
        )

        widget = Widget(
            type=WidgetType.SYSTEM,
            title=config["title"],
            description=config["description"],
            icon=config["icon"],
            content=WidgetContent(
                content_type=WidgetContentType.LIVE_CHANNEL,
                live_channel_id=str(channel.id) if channel else None,
            ),
            position=WidgetPosition(
                x=config["position"]["x"],
                y=config["position"]["y"],
                width=350,
                height=197,
                z_index=100,
            ),
            is_active=True,
            is_muted=True,
            is_visible=True,
            is_closable=True,
            is_draggable=True,
            visible_to_roles=["user", "admin", "premium"],
            visible_to_subscription_tiers=[],
            target_pages=[],
            order=config["order"],
            created_by="system",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        await widget.insert()
        logger.info(f"Created default Channel {channel_num} widget: {widget.id}")
        if channel:
            logger.info(f"Linked to live channel: {channel.name}")
        created_count += 1

    return created_count


async def init_default_widgets() -> dict[str, int]:
    """
    Initialize all default widgets on startup.

    Returns a dict with counts of widgets created per category.
    """
    try:
        results = {
            "flight_widgets": await _create_flight_widgets(),
            "ynet_widget": 1 if await _create_ynet_widget() else 0,
            "podcast_widgets": await _create_podcast_widgets(),
            "channel_widgets": await _create_channel_widgets(),
        }

        total = sum(results.values())
        if total > 0:
            logger.info(f"Widget seeding complete: {total} widgets created/updated")
        else:
            logger.info("Widget seeding complete: all widgets already exist")

        return results

    except Exception as e:
        logger.error(f"Error initializing default widgets: {e}", exc_info=True)
        raise
