"""
Router registry for Bayit+ Admin Service.

Registers all admin-only API routers (~170 endpoints) with the same
prefixes and tags as the monolith, ensuring identical URL paths.
"""

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, RedirectResponse

from app.core.config import settings

from app.api.service_models import SERVICE_MODELS  # noqa: F401 (re-exported)

logger = logging.getLogger(__name__)


def register_routes(app: FastAPI) -> None:
    """Register all admin API routers with their monolith-identical prefixes and tags."""
    prefix = settings.API_V1_PREFIX

    from app.api.routes import (
        admin, diagnostics, librarian,
        admin_content_vod_read, admin_content_vod_write,
        admin_content_vod_toggles,
        admin_categories, admin_live_channels, admin_radio_stations,
        admin_podcasts, admin_podcast_episodes, admin_audiobooks,
        admin_content_importer, admin_widgets, admin_uploads,
        admin_kids_content, admin_youngsters_content,
        admin_cultures, admin_taxonomy,
        admin_documentary_import, admin_subtitle_sync,
        admin_trailer_extraction, avatar_studio,
        admin_interactive_moments, admin_voice_cloning,
        admin_voice_clone_preview, vod_interaction_admin,
    )
    from app.api.routes.admin.recordings import router as admin_recordings_router

    app.include_router(admin.router, prefix=f"{prefix}/admin", tags=["admin"])
    app.include_router(diagnostics.router, prefix=prefix, tags=["diagnostics"])
    app.include_router(librarian.router, prefix=prefix, tags=["librarian"])
    app.include_router(
        admin_content_vod_read.router, prefix=f"{prefix}/admin", tags=["admin-content"],
    )
    app.include_router(
        admin_content_vod_write.router, prefix=f"{prefix}/admin", tags=["admin-content"],
    )
    app.include_router(
        admin_content_vod_toggles.router, prefix=f"{prefix}/admin",
        tags=["admin-content"],
    )
    app.include_router(
        admin_categories.router, prefix=f"{prefix}/admin", tags=["admin-content"],
    )
    app.include_router(
        admin_live_channels.router, prefix=f"{prefix}/admin", tags=["admin-content"],
    )
    app.include_router(
        admin_radio_stations.router, prefix=f"{prefix}/admin", tags=["admin-content"],
    )
    app.include_router(
        admin_podcasts.router, prefix=f"{prefix}/admin", tags=["admin-content"],
    )
    app.include_router(
        admin_podcast_episodes.router, prefix=f"{prefix}/admin", tags=["admin-content"],
    )
    app.include_router(
        admin_audiobooks.router, prefix=f"{prefix}/admin", tags=["admin-content"],
    )
    app.include_router(
        admin_content_importer.router, prefix=f"{prefix}/admin", tags=["admin-content"],
    )
    app.include_router(
        admin_widgets.router, prefix=f"{prefix}/admin", tags=["admin-widgets"],
    )
    app.include_router(
        admin_uploads.router, prefix=f"{prefix}/admin", tags=["admin-uploads"],
    )
    app.include_router(
        admin_recordings_router, prefix=f"{prefix}/admin", tags=["admin-recordings"],
    )
    app.include_router(
        admin_kids_content.router, prefix=f"{prefix}/admin",
        tags=["admin-kids-content"],
    )
    app.include_router(
        admin_youngsters_content.router, prefix=f"{prefix}/admin",
        tags=["admin-youngsters-content"],
    )
    app.include_router(
        admin_cultures.router, prefix=f"{prefix}/admin/cultures",
        tags=["admin-cultures"],
    )
    app.include_router(
        admin_taxonomy.router, prefix=f"{prefix}/admin", tags=["admin-taxonomy"],
    )
    app.include_router(
        admin_documentary_import.router, prefix=f"{prefix}/admin",
        tags=["admin-documentary-import"],
    )
    app.include_router(
        admin_subtitle_sync.router, prefix=prefix, tags=["admin-subtitles"],
    )
    app.include_router(
        admin_trailer_extraction.router, prefix=f"{prefix}/admin",
        tags=["admin-trailer-extraction"],
    )
    app.include_router(
        avatar_studio.router, prefix=f"{prefix}/admin", tags=["admin-avatar-studio"],
    )
    app.include_router(
        admin_interactive_moments.router, prefix=prefix,
        tags=["admin-interactive-moments"],
    )
    app.include_router(
        admin_voice_cloning.router, prefix=prefix, tags=["admin-voice-cloning"],
    )
    app.include_router(
        admin_voice_clone_preview.router, prefix=prefix,
        tags=["admin-voice-clone-preview"],
    )
    app.include_router(
        vod_interaction_admin.router, prefix=prefix, tags=["vod-interaction-admin"],
    )
    logger.info("Admin routes registered (%s routers)", 27)


def register_upload_serving(app: FastAPI) -> None:
    """Serve uploaded files from local storage or redirect to GCS."""

    @app.api_route("/uploads/{path:path}", methods=["GET", "HEAD"])
    async def serve_uploads(path: str):
        """Serve uploaded files - local storage or GCS proxy."""
        from fastapi import HTTPException

        if settings.STORAGE_TYPE == "local":
            file_path = Path(settings.UPLOAD_DIR) / path
            if file_path.exists() and file_path.is_file():
                content_types = {
                    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                    ".png": "image/png", ".gif": "image/gif",
                    ".webp": "image/webp", ".mp4": "video/mp4",
                    ".webm": "video/webm",
                    ".m3u8": "application/vnd.apple.mpegurl",
                    ".ts": "video/mp2t", ".vtt": "text/vtt",
                    ".srt": "application/x-subrip",
                }
                content_type = content_types.get(
                    file_path.suffix.lower(), "application/octet-stream",
                )
                return FileResponse(
                    path=str(file_path), media_type=content_type,
                    headers={"Cache-Control": "public, max-age=31536000"},
                )
            raise HTTPException(status_code=404, detail="File not found")

        gcs_url = (
            f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/uploads/{path}"
        )
        return RedirectResponse(url=gcs_url, status_code=307)

    logger.debug("Registered upload serving endpoint")
