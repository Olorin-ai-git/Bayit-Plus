"""
Widget seeder module for initializing default system widgets.

This module handles the creation of default widgets on server startup.
Widgets are only created if they don't already exist (idempotent).
"""

import logging
from datetime import datetime

from app.models.content import LiveChannel
from app.models.widget import (Widget, WidgetContent, WidgetContentType,
                               WidgetPosition, WidgetType)
from app.services.startup.defaults import (CHANNEL_WIDGETS, FLIGHT_WIDGETS,
                                           GALEI_TZAHAL_WIDGET,
                                           PODCAST_WIDGETS, RADIO_103FM_WIDGET,
                                           YNET_WIDGET_CONFIG)

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


async def _create_galei_tzahal_widget() -> bool:
    """Create Galei Tzahal radio widget. Returns True if created."""
    from app.models.content import RadioStation

    config = GALEI_TZAHAL_WIDGET

    # Check if widget already exists
    existing = await Widget.find_one(
        {
            "type": WidgetType.SYSTEM,
            "title": config["title"],
        }
    )

    if existing:
        logger.info(f"Galei Tzahal widget already exists: {existing.id}")
        return False

    # Find Galei Tzahal station by name
    # NOTE: Query by 'name' field is not indexed on RadioStation collection.
    # This is acceptable for one-time startup seeding with small dataset (~33 stations).
    # Collection scan takes ~10-20ms. If this pattern is reused in frequently-called
    # code, consider using indexed field or adding a name index.
    station = await RadioStation.find_one({"name": config["station_name"]})

    if not station:
        logger.error("Galei Tzahal station (גלצ 96.6fm) not found in database")
        return False

    # Create widget with RADIO content type
    widget = Widget(
        type=WidgetType.SYSTEM,
        title=config["title"],
        description=config["description"],
        icon=config["icon"],
        content=WidgetContent(
            content_type=WidgetContentType.RADIO,
            station_id=str(station.id),  # Link to RadioStation
        ),
        position=WidgetPosition(
            x=config["position"]["x"],
            y=config["position"]["y"],
            width=config["position"]["width"],
            height=config["position"]["height"],
            z_index=100,
        ),
        is_active=True,
        is_muted=True,  # Default muted per widget standards
        is_visible=True,
        is_closable=True,
        is_draggable=True,
        visible_to_roles=["user", "admin", "premium"],
        visible_to_subscription_tiers=[],
        target_pages=[],  # Empty = visible on all pages
        order=config["order"],
        created_by="system",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    await widget.insert()
    logger.info(f"Created Galei Tzahal widget: {widget.id}")
    return True


async def _create_radio_103fm_widget() -> bool:
    """Create 103FM radio widget. Returns True if created."""
    from app.models.content import RadioStation

    config = RADIO_103FM_WIDGET

    # Check if widget already exists
    existing = await Widget.find_one(
        {
            "type": WidgetType.SYSTEM,
            "title": config["title"],
        }
    )

    if existing:
        logger.info(f"103FM radio widget already exists: {existing.id}")
        return False

    # Find 103FM station by name
    # NOTE: Query by 'name' field is not indexed on RadioStation collection.
    # This is acceptable for one-time startup seeding with small dataset (~33 stations).
    # Collection scan takes ~10-20ms. If this pattern is reused in frequently-called
    # code, consider using indexed field or adding a name index.
    station = await RadioStation.find_one({"name": config["station_name"]})

    if not station:
        logger.error(
            "103FM station (רדיו ללא הפסקה 103fm) not found in database"
        )
        return False

    # Create widget with RADIO content type
    widget = Widget(
        type=WidgetType.SYSTEM,
        title=config["title"],
        description=config["description"],
        icon=config["icon"],
        content=WidgetContent(
            content_type=WidgetContentType.RADIO,
            station_id=str(station.id),  # Link to RadioStation
        ),
        position=WidgetPosition(
            x=config["position"]["x"],
            y=config["position"]["y"],
            width=config["position"]["width"],
            height=config["position"]["height"],
            z_index=100,
        ),
        is_active=True,
        is_muted=True,  # Default muted per widget standards
        is_visible=True,
        is_closable=True,
        is_draggable=True,
        visible_to_roles=["user", "admin", "premium"],
        visible_to_subscription_tiers=[],
        target_pages=[],  # Empty = visible on all pages
        order=config["order"],
        created_by="system",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    await widget.insert()
    logger.info(f"Created 103FM radio widget: {widget.id}")
    return True


async def _create_podcast_widgets() -> int:
    """Create podcast widgets. Returns count of widgets created."""
    from app.models.content import Podcast

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

        # Look up podcast by title to get its ObjectId
        podcast = await Podcast.find_one({"title": config["podcast_title"]})
        if not podcast:
            logger.error(
                f"Podcast '{config['podcast_title']}' not found in database - "
                f"skipping widget '{config['title']}'"
            )
            continue

        widget = Widget(
            type=WidgetType.SYSTEM,
            title=config["title"],
            description=config["description"],
            icon=config["icon"],
            cover_url=config.get("cover_url"),
            content=WidgetContent(
                content_type=WidgetContentType.PODCAST,
                podcast_id=str(podcast.id),
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
            "galei_tzahal_widget": 1 if await _create_galei_tzahal_widget() else 0,
            "radio_103fm_widget": 1 if await _create_radio_103fm_widget() else 0,
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
