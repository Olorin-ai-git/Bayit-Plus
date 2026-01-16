from contextlib import asynccontextmanager
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.core.logging_config import setup_logging

# Initialize structured logging for Cloud Run
setup_logging(debug=settings.DEBUG)
logger = logging.getLogger(__name__)

# Import routers
from app.api.routes import (
    auth, content, live, radio, podcasts, subscriptions, chat, watchlist, history, admin, admin_uploads,
    party, websocket, websocket_live_subtitles, websocket_chess, zman, trending, chapters, subtitles, subtitle_preferences, ritual, profiles, children, judaism, flows,
    device_pairing, onboarding, widgets, favorites, downloads, user_system_widgets, news, librarian,
    admin_content_vod_read, admin_content_vod_write, admin_content_vod_toggles, admin_categories, admin_live_channels,
    admin_radio_stations, admin_podcasts, admin_podcast_episodes, admin_content_importer, admin_widgets, verification,
    recordings, epg, password_reset, chess
)
from app.api.routes.admin.recordings import router as admin_recordings_router


async def sync_podcast_rss_feeds():
    """
    Periodic background task to sync podcast episodes from RSS feeds.
    Runs every 6 hours to keep podcast episodes up-to-date.
    """
    import asyncio
    from app.services.podcast_sync import sync_all_podcasts

    # Wait for server to initialize
    await asyncio.sleep(30)

    while True:
        try:
            logger.info("🔄 Starting scheduled podcast sync (background task)...")
            await sync_all_podcasts(max_episodes=20)
            logger.info("✅ Scheduled podcast sync completed")
        except Exception as e:
            logger.error(f"⚠️ Scheduled podcast sync failed: {e}", exc_info=True)

        # Wait 6 hours before next sync
        await asyncio.sleep(6 * 60 * 60)


async def scan_monitored_folders_task():
    """Periodically scan monitored folders for new content."""
    import asyncio
    from app.services.folder_monitor_service import folder_monitor_service
    
    # Wait for server to initialize
    await asyncio.sleep(10)
    
    # Initialize default folders from config
    try:
        await folder_monitor_service.initialize_from_config()
        logger.info("✅ Monitored folders initialized from config")
    except Exception as e:
        logger.warning(f"⚠️ Failed to initialize monitored folders: {e}")
    
    # Run periodic scans
    while True:
        try:
            if settings.UPLOAD_MONITOR_ENABLED:
                logger.info("🔍 Scanning monitored folders for new content...")
                stats = await folder_monitor_service.scan_and_enqueue()
                logger.info(f"✅ Folder scan complete: {stats}")
            
            # Wait for next scan interval
            await asyncio.sleep(settings.UPLOAD_MONITOR_INTERVAL)
            
        except Exception as e:
            logger.error(f"❌ Folder monitoring task error: {e}", exc_info=True)
            # Wait before retrying on error
            await asyncio.sleep(60)


def validate_configuration():
    """Validate critical configuration on startup."""
    warnings = []

    # Check TMDB API key
    if not settings.TMDB_API_KEY:
        warnings.append("⚠️  TMDB_API_KEY not configured - metadata fetching will not work")

    # Check GCS bucket configuration
    if not settings.GCS_BUCKET_NAME:
        warnings.append("⚠️  GCS_BUCKET_NAME not configured - storage operations may fail")

    # Check Google OAuth if needed
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        warnings.append("⚠️  Google OAuth not fully configured (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET)")

    # Check SendGrid if email is needed
    if hasattr(settings, 'SENDGRID_API_KEY') and not settings.SENDGRID_API_KEY:
        warnings.append("⚠️  SENDGRID_API_KEY not configured - email notifications will not work")

    # Log all warnings
    if warnings:
        logger.warning("\n" + "="*60)
        logger.warning("CONFIGURATION WARNINGS:")
        for warning in warnings:
            logger.warning(f"  {warning}")
        logger.warning("="*60 + "\n")
    else:
        logger.info("✅ All critical configuration validated")


async def init_default_data():
    """Initialize default data on startup."""
    try:
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
            {
                "podcast_id": "69618106c3cadc264da3effd",
                "title": "סג\"ל וברקו - הפודקאסט",
                "description": "פודקאסט מ-103FM",
                "icon": "🎙️",
                "order": 2,
                "position": {"x": 700, "y": 100},
            },
        ]

        # Flight status widgets (iFrame)
        flight_widgets = [
            {
                "title": "TLV Departures",
                "description": "טיסות יוצאות מנתב\"ג",
                "icon": "✈️",
                "iframe_url": "https://www.avionio.com/widget/en/TLV/departures?autoheight=1",
                "order": 10,
                "position": {"x": 20, "y": 300, "width": 400, "height": 400},
            },
            {
                "title": "TLV Arrivals",
                "description": "טיסות נוחתות בנתב\"ג",
                "icon": "🛬",
                "iframe_url": "https://www.avionio.com/widget/en/TLV/arrivals?autoheight=1",
                "order": 11,
                "position": {"x": 440, "y": 300, "width": 400, "height": 400},
            },
            {
                "title": "JFK - New York",
                "description": "טיסות מ/אל JFK ניו יורק",
                "icon": "🗽",
                "iframe_url": "https://www.avionio.com/widget/en/JFK?autoheight=1",
                "order": 12,
                "position": {"x": 20, "y": 300, "width": 400, "height": 400},
            },
            {
                "title": "MIA - Miami",
                "description": "טיסות מ/אל MIA מיאמי",
                "icon": "🌴",
                "iframe_url": "https://www.avionio.com/widget/en/MIA?autoheight=1",
                "order": 13,
                "position": {"x": 20, "y": 300, "width": 400, "height": 400},
            },
            {
                "title": "LAX - Los Angeles",
                "description": "טיסות מ/אל LAX לוס אנג'לס",
                "icon": "🌅",
                "iframe_url": "https://www.avionio.com/widget/en/LAX?autoheight=1",
                "order": 14,
                "position": {"x": 20, "y": 300, "width": 400, "height": 400},
            },
            {
                "title": "EWR - Newark",
                "description": "טיסות מ/אל EWR נוארק",
                "icon": "🏙️",
                "iframe_url": "https://www.avionio.com/widget/en/EWR?autoheight=1",
                "order": 15,
                "position": {"x": 20, "y": 300, "width": 400, "height": 400},
            },
        ]

        # Create flight widgets
        for widget_config in flight_widgets:
            existing = await Widget.find_one({
                "type": WidgetType.SYSTEM,
                "title": widget_config["title"]
            })

            if existing:
                logger.info(f"Flight widget '{widget_config['title']}' already exists: {existing.id}")
                continue

            widget = Widget(
                type=WidgetType.SYSTEM,
                title=widget_config["title"],
                description=widget_config["description"],
                icon=widget_config["icon"],
                content=WidgetContent(
                    content_type=WidgetContentType.IFRAME,
                    iframe_url=widget_config["iframe_url"],
                    iframe_title=widget_config["title"],
                ),
                position=WidgetPosition(
                    x=widget_config["position"]["x"],
                    y=widget_config["position"]["y"],
                    width=widget_config["position"].get("width", 400),
                    height=widget_config["position"].get("height", 400),
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
            logger.info(f"Created flight widget '{widget_config['title']}': {widget.id}")

        # Ynet Mivzakim (Breaking News) widget - uses custom React component
        ynet_widget_config = {
            "title": "מבזקי Ynet",
            "description": "מבזקי חדשות בזמן אמת מ-Ynet",
            "icon": "📰",
            "component_name": "ynet_mivzakim",
            "order": 20,
            "position": {"x": 20, "y": 300, "width": 380, "height": 450},
        }

        existing = await Widget.find_one({
            "type": WidgetType.SYSTEM,
            "title": ynet_widget_config["title"]
        })

        if not existing:
            widget = Widget(
                type=WidgetType.SYSTEM,
                title=ynet_widget_config["title"],
                description=ynet_widget_config["description"],
                icon=ynet_widget_config["icon"],
                content=WidgetContent(
                    content_type=WidgetContentType.CUSTOM,
                    component_name=ynet_widget_config["component_name"],
                ),
                position=WidgetPosition(
                    x=ynet_widget_config["position"]["x"],
                    y=ynet_widget_config["position"]["y"],
                    width=ynet_widget_config["position"]["width"],
                    height=ynet_widget_config["position"]["height"],
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
                order=ynet_widget_config["order"],
                created_by="system",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            await widget.insert()
            logger.info(f"Created Ynet mivzakim widget: {widget.id}")
        else:
            # Update existing widget to use CUSTOM type if it was IFRAME
            if existing.content.content_type == WidgetContentType.IFRAME:
                existing.content.content_type = WidgetContentType.CUSTOM
                existing.content.component_name = ynet_widget_config["component_name"]
                existing.content.iframe_url = None
                existing.content.iframe_title = None
                await existing.save()
                logger.info(f"Updated Ynet widget to use custom component: {existing.id}")
            else:
                logger.info(f"Ynet mivzakim widget already exists: {existing.id}")

        for widget_config in default_widgets:
            # Check if it's a podcast or channel widget
            is_podcast = "podcast_id" in widget_config

            if is_podcast:
                podcast_id = widget_config["podcast_id"]

                # Check if widget already exists
                existing = await Widget.find_one({
                    "type": WidgetType.SYSTEM,
                    "title": widget_config["title"]
                })

                if existing:
                    logger.info(f"Default podcast widget '{widget_config['title']}' already exists: {existing.id}")
                    continue

                # Create podcast widget
                widget = Widget(
                    type=WidgetType.SYSTEM,
                    title=widget_config["title"],
                    description=widget_config["description"],
                    icon=widget_config["icon"],
                    content=WidgetContent(
                        content_type=WidgetContentType.PODCAST,
                        podcast_id=podcast_id,
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
                logger.info(f"Created default podcast widget '{widget_config['title']}': {widget.id}")
            else:
                # Channel widget logic
                channel_num = widget_config.get("channel_num")
                if not channel_num:
                    logger.warning(f"Widget config missing channel_num: {widget_config}")
                    continue

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
    except Exception as e:
        logger.error(f"Error initializing default widgets: {e}", exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting Bayit+ Backend Server...")
    validate_configuration()
    await connect_to_mongo()
    try:
        await init_default_data()
    except Exception as e:
        logger.warning(f"Failed to initialize default data: {e}")
    # Run podcast sync in background (scheduled every 6 hours)
    asyncio.create_task(sync_podcast_rss_feeds())
    logger.info("📻 Started podcast RSS background sync task (every 6 hours)")
    # Run folder monitoring in background (non-blocking)
    if settings.UPLOAD_MONITOR_ENABLED:
        asyncio.create_task(scan_monitored_folders_task())
        logger.info("📂 Started folder monitoring background task")
    
    # Upload queue processor is now manual-only (triggered from UI)
    # Automatic processing disabled to prevent server overload
    from app.services.upload_service import upload_service
    # asyncio.create_task(upload_service.process_queue())
    logger.info("📤 Upload queue processor ready (manual trigger only)")
    
    logger.info("✅ Server startup complete - Ready to accept connections")
    yield
    # Shutdown
    logger.info("👋 Shutting down server...")
    await close_mongo_connection()


app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# Security middleware
from app.middleware.input_sanitization import InputSanitizationMiddleware
app.add_middleware(InputSanitizationMiddleware, enable_logging=True)
logger.info("🔒 Input sanitization middleware enabled")

# CORS middleware
cors_origins = settings.parsed_cors_origins
logger.info(f"🌐 CORS Origins configured: {cors_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # Use parsed property for Secret Manager compatibility
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
app.include_router(password_reset.router, prefix=f"{settings.API_V1_PREFIX}/auth/password-reset", tags=["password-reset"])
app.include_router(verification.router, prefix=f"{settings.API_V1_PREFIX}", tags=["verification"])
app.include_router(content.router, prefix=f"{settings.API_V1_PREFIX}/content", tags=["content"])
app.include_router(live.router, prefix=f"{settings.API_V1_PREFIX}/live", tags=["live"])
app.include_router(radio.router, prefix=f"{settings.API_V1_PREFIX}/radio", tags=["radio"])
app.include_router(podcasts.router, prefix=f"{settings.API_V1_PREFIX}/podcasts", tags=["podcasts"])
app.include_router(subscriptions.router, prefix=f"{settings.API_V1_PREFIX}/subscriptions", tags=["subscriptions"])
app.include_router(chat.router, prefix=f"{settings.API_V1_PREFIX}/chat", tags=["chat"])
app.include_router(watchlist.router, prefix=f"{settings.API_V1_PREFIX}/watchlist", tags=["watchlist"])
app.include_router(favorites.router, prefix=f"{settings.API_V1_PREFIX}/favorites", tags=["favorites"])
app.include_router(downloads.router, prefix=f"{settings.API_V1_PREFIX}/downloads", tags=["downloads"])
app.include_router(history.router, prefix=f"{settings.API_V1_PREFIX}/history", tags=["history"])
app.include_router(recordings.router, prefix=f"{settings.API_V1_PREFIX}/recordings", tags=["recordings"])
app.include_router(epg.router, prefix=f"{settings.API_V1_PREFIX}/epg", tags=["epg"])
app.include_router(admin.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin"])
app.include_router(librarian.router, prefix=f"{settings.API_V1_PREFIX}", tags=["librarian"])
app.include_router(admin_content_vod_read.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_content_vod_write.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_content_vod_toggles.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_categories.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_live_channels.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_radio_stations.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_podcasts.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_podcast_episodes.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_content_importer.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-content"])
app.include_router(admin_widgets.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-widgets"])
app.include_router(admin_uploads.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-uploads"])
app.include_router(admin_recordings_router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["admin-recordings"])
app.include_router(widgets.router, prefix=f"{settings.API_V1_PREFIX}/widgets", tags=["widgets"])
app.include_router(user_system_widgets.router, prefix=f"{settings.API_V1_PREFIX}/widgets/system", tags=["user-system-widgets"])
app.include_router(party.router, prefix=f"{settings.API_V1_PREFIX}/party", tags=["party"])
app.include_router(websocket.router, prefix=f"{settings.API_V1_PREFIX}", tags=["websocket"])
app.include_router(websocket_live_subtitles.router, prefix=f"{settings.API_V1_PREFIX}", tags=["websocket", "live-subtitles"])
app.include_router(zman.router, prefix=f"{settings.API_V1_PREFIX}/zman", tags=["zman"])
app.include_router(trending.router, prefix=f"{settings.API_V1_PREFIX}/trending", tags=["trending"])
app.include_router(chapters.router, prefix=f"{settings.API_V1_PREFIX}/chapters", tags=["chapters"])
app.include_router(subtitles.router, prefix=f"{settings.API_V1_PREFIX}", tags=["subtitles"])
app.include_router(subtitle_preferences.router, prefix=f"{settings.API_V1_PREFIX}/subtitles", tags=["subtitle-preferences"])
app.include_router(ritual.router, prefix=f"{settings.API_V1_PREFIX}", tags=["ritual"])
app.include_router(profiles.router, prefix=f"{settings.API_V1_PREFIX}/profiles", tags=["profiles"])
app.include_router(children.router, prefix=f"{settings.API_V1_PREFIX}/children", tags=["children"])
app.include_router(judaism.router, prefix=f"{settings.API_V1_PREFIX}/judaism", tags=["judaism"])
app.include_router(flows.router, prefix=f"{settings.API_V1_PREFIX}/flows", tags=["flows"])
app.include_router(device_pairing.router, prefix=f"{settings.API_V1_PREFIX}/auth/device-pairing", tags=["device-pairing"])
app.include_router(onboarding.router, prefix=f"{settings.API_V1_PREFIX}/onboarding/ai", tags=["ai-onboarding"])
app.include_router(news.router, prefix=f"{settings.API_V1_PREFIX}/news", tags=["news"])
app.include_router(chess.router, prefix=f"{settings.API_V1_PREFIX}", tags=["chess"])
app.include_router(websocket_chess.router, prefix=f"{settings.API_V1_PREFIX}", tags=["websocket", "chess"])

# Proxy uploads from GCS
@app.api_route("/uploads/{path:path}", methods=["GET", "HEAD"])
async def proxy_uploads(path: str):
    """Proxy upload requests to GCS bucket"""
    from fastapi.responses import RedirectResponse
    gcs_url = f"https://storage.googleapis.com/bayit-plus-media-new/uploads/{path}"
    return RedirectResponse(url=gcs_url, status_code=307)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
