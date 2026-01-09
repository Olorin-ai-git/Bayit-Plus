from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection

# Import routers
from app.api.routes import (
    auth, content, live, radio, podcasts, subscriptions, chat, watchlist, history, admin, admin_uploads,
    party, websocket, zman, trending, chapters, subtitles, ritual, profiles, children, judaism, flows,
    device_pairing, onboarding, widgets,
    admin_content_vod_read, admin_content_vod_write, admin_categories, admin_live_channels,
    admin_radio_stations, admin_podcasts, admin_podcast_episodes, admin_content_importer, admin_widgets
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
