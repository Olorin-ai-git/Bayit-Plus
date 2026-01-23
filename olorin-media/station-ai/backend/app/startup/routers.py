"""Router registration for Station-AI."""

from fastapi import FastAPI

from app.routers import (
    content,
    schedule,
    playback,
    upload,
    agent,
    websocket,
    calendar,
    flows,
    settings as settings_router,
    admin,
    users,
    voices,
    campaigns
)


def register_routers(app: FastAPI) -> None:
    """Register all API routers with the FastAPI application."""
    app.include_router(content.router, prefix="/api/content", tags=["Content"])
    app.include_router(schedule.router, prefix="/api/schedule", tags=["Schedule"])
    app.include_router(playback.router, prefix="/api/playback", tags=["Playback"])
    app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
    app.include_router(agent.router, prefix="/api/agent", tags=["AI Agent"])
    app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])
    app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])
    app.include_router(flows.router, prefix="/api/flows", tags=["Auto Flows"])
    app.include_router(settings_router.router, prefix="/api/settings", tags=["Settings"])
    app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
    app.include_router(users.router, prefix="/api/users", tags=["Users"])
    app.include_router(voices.router, prefix="/api/voices", tags=["TTS Voices"])
    app.include_router(campaigns.router, prefix="/api/campaigns", tags=["Campaigns"])
