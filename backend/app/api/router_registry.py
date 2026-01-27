"""
Router registry for Bayit+ Backend.

This module organizes and registers all API routers with the FastAPI application.
Routers are grouped by category for better organization and maintainability.
"""

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, RedirectResponse

from app.core.config import settings

logger = logging.getLogger(__name__)


def register_all_routers(app: FastAPI) -> None:
    """
    Register all API routers with the FastAPI application.

    Routers are organized by category:
    - Health: Health check endpoints
    - Auth: Authentication and authorization
    - Content: Content management and playback
    - Admin: Administration endpoints
    - WebSocket: Real-time communication
    - Features: Additional feature endpoints
    """
    prefix = settings.API_V1_PREFIX

    # Import all routers
    from app.api.endpoints import (analytics_router, tts_router, voice_router,
                                   wake_word_router)
    # Import search sub-routers
    from app.api.routes import (admin, admin_audiobooks, admin_categories,
                                admin_content_importer, admin_content_vod_read,
                                admin_content_vod_toggles,
                                admin_content_vod_write, admin_cultures,
                                admin_kids_content, admin_live_channels,
                                admin_podcast_episodes, admin_podcasts,
                                admin_radio_stations, admin_taxonomy,
                                admin_uploads, admin_widgets,
                                admin_youngsters_content, audiobooks, audible_integration,
                                auth, chapters, chat,
                                chess, children, content, content_taxonomy,
                                cultures, device_pairing, devices,
                                direct_messages, downloads, epg,
                                family_controls, favorites, friends, health,
                                history, jerusalem, judaism, librarian, live,
                                live_dubbing, live_quota, media_proxy, news, nlp,
                                notifications,
                                onboarding, party, password_reset,
                                playback_session, podcasts, profile_stats,
                                profiles, radio, recordings, ritual, search,
                                search_analytics, search_llm, search_scenes,
                                search_suggestions, stats, subscriptions,
                                subtitle_preferences, subtitles, support,
                                tel_aviv, trending, trivia,
                                user_system_widgets, users, verification,
                                watchlist, webauthn, websocket,
                                websocket_chess, websocket_dm,
                                websocket_live_dubbing,
                                websocket_live_subtitles, widgets, youngsters,
                                zman)
    from app.api.routes.admin.recordings import \
        router as admin_recordings_router
    from app.api.routes.olorin import legacy_router as olorin_legacy_router
    from app.api.routes.olorin import router as olorin_router

    # ============================================
    # Health Check Routes (no prefix)
    # ============================================
    app.include_router(health.router)
    logger.debug("Registered health routes")

    # ============================================
    # Proxy Service Endpoints (Backend-only credentials)
    # ============================================
    app.include_router(tts_router, tags=["tts-proxy"])
    app.include_router(wake_word_router, tags=["wake-word-proxy"])
    app.include_router(analytics_router, tags=["analytics-proxy"])
    app.include_router(voice_router, tags=["voice-proxy"])
    logger.debug("Registered proxy service endpoints")

    # ============================================
    # Authentication Routes
    # ============================================
    app.include_router(auth.router, prefix=f"{prefix}/auth", tags=["auth"])
    app.include_router(
        password_reset.router,
        prefix=f"{prefix}/auth/password-reset",
        tags=["password-reset"],
    )
    app.include_router(verification.router, prefix=prefix, tags=["verification"])
    app.include_router(
        device_pairing.router,
        prefix=f"{prefix}/auth/device-pairing",
        tags=["device-pairing"],
    )
    app.include_router(webauthn.router, prefix=f"{prefix}/webauthn", tags=["webauthn"])
    logger.debug("Registered auth routes")

    # ============================================
    # Content Routes
    # ============================================
    app.include_router(search.router, prefix=prefix, tags=["search"])
    app.include_router(
        search_analytics.router, prefix=prefix, tags=["search", "analytics"]
    )
    app.include_router(
        search_suggestions.router, prefix=prefix, tags=["search", "suggestions"]
    )
    app.include_router(search_scenes.router, prefix=prefix, tags=["search", "scenes"])
    app.include_router(search_llm.router, prefix=prefix, tags=["search", "llm"])
    app.include_router(content.router, prefix=f"{prefix}/content", tags=["content"])
    app.include_router(
        content_taxonomy.router, prefix=prefix, tags=["content-taxonomy"]
    )
    app.include_router(live.router, prefix=f"{prefix}/live", tags=["live"])
    app.include_router(live_quota.router, prefix=prefix, tags=["live-quota"])
    app.include_router(radio.router, prefix=f"{prefix}/radio", tags=["radio"])
    app.include_router(podcasts.router, prefix=f"{prefix}/podcasts", tags=["podcasts"])
    app.include_router(audiobooks.router, prefix=f"{prefix}/audiobooks", tags=["audiobooks"])
    app.include_router(epg.router, prefix=f"{prefix}/epg", tags=["epg"])
    app.include_router(chapters.router, prefix=f"{prefix}/chapters", tags=["chapters"])
    app.include_router(subtitles.router, prefix=prefix, tags=["subtitles"])
    app.include_router(
        subtitle_preferences.router,
        prefix=f"{prefix}/subtitles",
        tags=["subtitle-preferences"],
    )
    app.include_router(trending.router, prefix=f"{prefix}/trending", tags=["trending"])
    app.include_router(
        media_proxy.router, prefix="/api", tags=["media-proxy", "transcode"]
    )
    logger.debug("Registered content routes")

    # ============================================
    # User Routes
    # ============================================
    app.include_router(
        subscriptions.router, prefix=f"{prefix}/subscriptions", tags=["subscriptions"]
    )
    app.include_router(
        watchlist.router, prefix=f"{prefix}/watchlist", tags=["watchlist"]
    )
    app.include_router(
        favorites.router, prefix=f"{prefix}/favorites", tags=["favorites"]
    )
    app.include_router(
        downloads.router, prefix=f"{prefix}/downloads", tags=["downloads"]
    )
    app.include_router(history.router, prefix=f"{prefix}/history", tags=["history"])
    app.include_router(
        recordings.router, prefix=f"{prefix}/recordings", tags=["recordings"]
    )
    app.include_router(profiles.router, prefix=f"{prefix}/profiles", tags=["profiles"])
    app.include_router(children.router, prefix=f"{prefix}/children", tags=["children"])
    app.include_router(
        youngsters.router, prefix=f"{prefix}/youngsters", tags=["youngsters"]
    )
    app.include_router(
        family_controls.router, prefix=f"{prefix}/family", tags=["family-controls"]
    )
    app.include_router(users.router, prefix=f"{prefix}/users", tags=["users"])
    app.include_router(profile_stats.router, prefix=prefix, tags=["profile"])
    app.include_router(devices.router, prefix=f"{prefix}/devices", tags=["devices"])
    app.include_router(
        playback_session.router,
        prefix=f"{prefix}/playback/session",
        tags=["playback", "session"],
    )
    app.include_router(
        audible_integration.router,
        prefix=prefix,
        tags=["audible-integration"],
    )
    logger.debug("Registered user routes")

    # ============================================
    # Social Routes
    # ============================================
    app.include_router(chat.router, prefix=f"{prefix}/chat", tags=["chat"])
    app.include_router(friends.router, prefix=prefix, tags=["friends"])
    app.include_router(direct_messages.router, prefix=prefix, tags=["direct-messages"])
    app.include_router(stats.router, prefix=prefix, tags=["stats"])
    app.include_router(party.router, prefix=f"{prefix}/party", tags=["party"])
    app.include_router(chess.router, prefix=prefix, tags=["chess"])
    logger.debug("Registered social routes")

    # ============================================
    # Feature Routes
    # ============================================
    app.include_router(widgets.router, prefix=f"{prefix}/widgets", tags=["widgets"])
    app.include_router(
        user_system_widgets.router,
        prefix=f"{prefix}/widgets/system",
        tags=["user-system-widgets"],
    )
    app.include_router(zman.router, prefix=f"{prefix}/zman", tags=["zman"])
    app.include_router(ritual.router, prefix=prefix, tags=["ritual"])
    app.include_router(
        onboarding.router, prefix=f"{prefix}/onboarding/ai", tags=["ai-onboarding"]
    )
    app.include_router(news.router, prefix=f"{prefix}/news", tags=["news"])
    app.include_router(support.router, prefix=f"{prefix}/support", tags=["support"])
    app.include_router(trivia.router, prefix=f"{prefix}/trivia", tags=["trivia"])
    app.include_router(
        notifications.router, prefix=f"{prefix}/notifications", tags=["notifications"]
    )
    logger.debug("Registered feature routes")

    # ============================================
    # Judaism Routes
    # ============================================
    app.include_router(judaism.router, prefix=f"{prefix}/judaism", tags=["judaism"])
    logger.debug("Registered judaism routes")

    # ============================================
    # Location Content Routes
    # ============================================
    app.include_router(
        jerusalem.router, prefix=f"{prefix}/jerusalem", tags=["jerusalem"]
    )
    app.include_router(tel_aviv.router, prefix=f"{prefix}/tel-aviv", tags=["tel-aviv"])
    app.include_router(cultures.router, prefix=f"{prefix}/cultures", tags=["cultures"])
    logger.debug("Registered location content routes")

    # ============================================
    # Admin Routes
    # ============================================
    app.include_router(admin.router, prefix=f"{prefix}/admin", tags=["admin"])
    app.include_router(librarian.router, prefix=prefix, tags=["librarian"])
    app.include_router(
        admin_content_vod_read.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_content_vod_write.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_content_vod_toggles.router,
        prefix=f"{prefix}/admin",
        tags=["admin-content"],
    )
    app.include_router(
        admin_categories.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_live_channels.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_radio_stations.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_podcasts.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_podcast_episodes.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_audiobooks.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_content_importer.router, prefix=f"{prefix}/admin", tags=["admin-content"]
    )
    app.include_router(
        admin_widgets.router, prefix=f"{prefix}/admin", tags=["admin-widgets"]
    )
    app.include_router(
        admin_uploads.router, prefix=f"{prefix}/admin", tags=["admin-uploads"]
    )
    app.include_router(
        admin_recordings_router, prefix=f"{prefix}/admin", tags=["admin-recordings"]
    )
    app.include_router(
        admin_kids_content.router, prefix=f"{prefix}/admin", tags=["admin-kids-content"]
    )
    app.include_router(
        admin_youngsters_content.router,
        prefix=f"{prefix}/admin",
        tags=["admin-youngsters-content"],
    )
    app.include_router(
        admin_cultures.router,
        prefix=f"{prefix}/admin/cultures",
        tags=["admin-cultures"],
    )
    app.include_router(
        admin_taxonomy.router, prefix=f"{prefix}/admin", tags=["admin-taxonomy"]
    )
    logger.debug("Registered admin routes")

    # ============================================
    # WebSocket Routes
    # ============================================
    app.include_router(websocket.router, prefix=prefix, tags=["websocket"])
    app.include_router(
        websocket_live_subtitles.router,
        prefix=prefix,
        tags=["websocket", "live-subtitles"],
    )
    app.include_router(
        websocket_live_dubbing.router,
        prefix=prefix,
        tags=["websocket", "live-dubbing"],
    )
    app.include_router(
        websocket_chess.router, prefix=prefix, tags=["websocket", "chess"]
    )
    app.include_router(
        websocket_dm.router, prefix=prefix, tags=["websocket", "direct-messages"]
    )
    logger.debug("Registered websocket routes")

    # ============================================
    # Live Dubbing Routes (REST)
    # ============================================
    app.include_router(live_dubbing.router, prefix=prefix, tags=["live-dubbing"])
    logger.debug("Registered live dubbing routes")

    # ============================================
    # Olorin.ai Platform Routes
    # ============================================
    # Versioned routes: /api/v1/olorin/v1/* (main router already has /olorin/v1 prefix)
    app.include_router(olorin_router, prefix=prefix, tags=["olorin"])
    # Legacy redirect routes: /api/v1/olorin/* -> /api/v1/olorin/v1/*
    app.include_router(olorin_legacy_router, prefix=prefix, tags=["olorin-legacy"])
    logger.debug("Registered Olorin.ai platform routes (versioned + legacy redirects)")

    # ============================================
    # NLP Routes (Natural Language Processing for CLI)
    # ============================================
    app.include_router(nlp.router, prefix=prefix, tags=["nlp"])
    logger.debug("Registered NLP routes (intent parsing, agent execution, semantic search, voice commands)")

    logger.info(f"All API routers registered with prefix {prefix}")


def register_upload_serving(app: FastAPI) -> None:
    """
    Register the upload file serving endpoint.

    Serves uploaded files from local storage or redirects to GCS.
    """

    @app.api_route("/uploads/{path:path}", methods=["GET", "HEAD"])
    async def serve_uploads(path: str):
        """Serve uploaded files - local storage or GCS proxy."""
        from fastapi import HTTPException

        if settings.STORAGE_TYPE == "local":
            # Serve from local uploads directory
            file_path = Path(settings.UPLOAD_DIR) / path
            if file_path.exists() and file_path.is_file():
                # Determine content type
                content_type = "application/octet-stream"
                suffix = file_path.suffix.lower()
                content_types = {
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".png": "image/png",
                    ".gif": "image/gif",
                    ".webp": "image/webp",
                    ".mp4": "video/mp4",
                    ".webm": "video/webm",
                    ".m3u8": "application/vnd.apple.mpegurl",
                    ".ts": "video/mp2t",
                    ".vtt": "text/vtt",
                    ".srt": "application/x-subrip",
                }
                content_type = content_types.get(suffix, content_type)

                return FileResponse(
                    path=str(file_path),
                    media_type=content_type,
                    headers={"Cache-Control": "public, max-age=31536000"},
                )
            raise HTTPException(status_code=404, detail="File not found")

        # Proxy to GCS for cloud storage
        gcs_url = (
            f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/uploads/{path}"
        )
        return RedirectResponse(url=gcs_url, status_code=307)

    logger.debug("Registered upload serving endpoint")
