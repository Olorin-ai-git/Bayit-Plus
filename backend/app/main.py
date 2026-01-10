from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection

logger = logging.getLogger(__name__)

# Import routers
from app.api.routes import (
    auth, content, live, radio, podcasts, subscriptions, chat, watchlist, history, admin, admin_uploads,
    party, websocket, zman, trending, chapters, subtitles, ritual, profiles, children, judaism, flows,
    device_pairing, onboarding, widgets,
    admin_content_vod_read, admin_content_vod_write, admin_categories, admin_live_channels,
    admin_radio_stations, admin_podcasts, admin_podcast_episodes, admin_content_importer, admin_widgets
)


async def sync_podcast_rss_feeds():
    """Sync podcast episodes from RSS feeds on startup."""
    try:
        from app.services.podcast_sync import sync_all_podcasts
        await sync_all_podcasts(max_episodes=3)
    except Exception as e:
        logger.warning(f"Failed to sync podcast RSS feeds: {e}")


async def init_default_data():
    """Initialize default data on startup."""
    from app.models.widget import Widget, WidgetType, WidgetContentType, WidgetContent, WidgetPosition
    from app.models.content import LiveChannel
    from datetime import datetime

    # Default widgets to create
    default_widgets = [
        {
            "channel_num": "11",
            "title": "Channel 11",
            "description": "ערוץ 11 שידור חי",
            "icon": "📺",
            "order": 0,
            "position": {"x": 20, "y": 100},
        },
        {
            "channel_num": "12",
            "title": "Channel 12 Live",
            "description": "ערוץ 12 שידור חי",
            "icon": "📺",
            "order": 1,
            "position": {"x": 360, "y": 100},
        },
    ]

    for widget_config in default_widgets:
        channel_num = widget_config["channel_num"]

        # Check if widget already exists
        existing = await Widget.find_one({
            "type": WidgetType.SYSTEM,
            "title": {"$regex": f"channel.*{channel_num}", "$options": "i"}
        })

        if existing:
            logger.info(f"Default Channel {channel_num} widget already exists: {existing.id}")
            continue

        # Try to find the channel in live channels
        channel = await LiveChannel.find_one(
            {"$or": [
                {"name": {"$regex": f"channel.*{channel_num}", "$options": "i"}},
                {"name": {"$regex": f"ערוץ.*{channel_num}", "$options": "i"}},
                {"name": {"$regex": f"{channel_num}.*channel", "$options": "i"}},
            ]}
        )

        # Create the widget
        widget = Widget(
            type=WidgetType.SYSTEM,
            title=widget_config["title"],
            description=widget_config["description"],
            icon=widget_config["icon"],
            content=WidgetContent(
                content_type=WidgetContentType.LIVE_CHANNEL,
                live_channel_id=str(channel.id) if channel else None,
            ),
            position=WidgetPosition(
                x=widget_config["position"]["x"],
                y=widget_config["position"]["y"],
                width=350,
                height=197,
                z_index=100
            ),
            is_active=True,
            is_muted=True,
            is_visible=True,
            is_closable=True,
            is_draggable=True,
            visible_to_roles=["user", "admin", "premium"],
            visible_to_subscription_tiers=[],
            target_pages=[],
            order=widget_config["order"],
            created_by="system",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        await widget.insert()
        logger.info(f"Created default Channel {channel_num} widget: {widget.id}")
        if channel:
            logger.info(f"Linked to live channel: {channel.name}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    try:
        await init_default_data()
    except Exception as e:
        logger.warning(f"Failed to initialize default data: {e}")
    try:
        await sync_podcast_rss_feeds()
    except Exception as e:
        logger.warning(f"Failed to sync podcast RSS feeds: {e}")
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}


# API routes
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["auth"])
app.include_router(content.router, prefix=f"{settings.API_V1_PREFIX}/content", tags=["content"])
app.include_router(live.router, prefix=f"{settings.API_V1_PREFIX}/live", tags=["live"])
app.include_router(radio.router, prefix=f"{settings.API_V1_PREFIX}/radio", tags=["radio"])
app.include_router(podcasts.router, prefix=f"{settings.API_V1_PREFIX}/podcasts", tags=["podcasts"])
app.include_router(subscriptions.router, prefix=f"{settings.API_V1_PREFIX}/subscriptions", tags=["subscriptions"])
app.include_router(chat.router, prefix=f"{settings.API_V1_PREFIX}/chat", tags=["chat"])
app.include_router(watchlist.router, prefix=f"{settings.API_V1_PREFIX}/watchlist", tags=["watchlist"])
app.include_router(history.router, prefix=f"{settings.API_V1_PREFIX}/history", tags=["history"])
app.include_router(admin.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin"])
app.include_router(admin_content_vod_read.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_content_vod_write.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_categories.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_live_channels.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_radio_stations.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_podcasts.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_podcast_episodes.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_content_importer.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_widgets.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-widgets"])
app.include_router(admin_uploads.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-uploads"])
app.include_router(widgets.router, prefix=f"{settings.API_V1_PREFIX}/widgets", tags=["widgets"])
app.include_router(party.router, prefix=f"{settings.API_V1_PREFIX}/party", tags=["party"])
app.include_router(websocket.router, prefix=f"{settings.API_V1_PREFIX}", tags=["websocket"])
app.include_router(zman.router, prefix=f"{settings.API_V1_PREFIX}/zman", tags=["zman"])
app.include_router(trending.router, prefix=f"{settings.API_V1_PREFIX}/trending", tags=["trending"])
app.include_router(chapters.router, prefix=f"{settings.API_V1_PREFIX}/chapters", tags=["chapters"])
app.include_router(subtitles.router, prefix=f"{settings.API_V1_PREFIX}", tags=["subtitles"])
app.include_router(ritual.router, prefix=f"{settings.API_V1_PREFIX}", tags=["ritual"])
app.include_router(profiles.router, prefix=f"{settings.API_V1_PREFIX}/profiles", tags=["profiles"])
app.include_router(children.router, prefix=f"{settings.API_V1_PREFIX}/children", tags=["children"])
app.include_router(judaism.router, prefix=f"{settings.API_V1_PREFIX}/judaism", tags=["judaism"])
app.include_router(flows.router, prefix=f"{settings.API_V1_PREFIX}/flows", tags=["flows"])
app.include_router(device_pairing.router, prefix=f"{settings.API_V1_PREFIX}/auth/device-pairing", tags=["device-pairing"])
app.include_router(onboarding.router, prefix=f"{settings.API_V1_PREFIX}/onboarding/ai", tags=["ai-onboarding"])

# Mount static files for uploads
uploads_dir = Path(__file__).parent.parent / "uploads"
if uploads_dir.exists():
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
