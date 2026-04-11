"""Shared helpers for training content endpoint guards and serialization."""

import logging

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

from app.models.content import Content, ProcessingState

logger = logging.getLogger(__name__)

_STATUS_DISPLAY_MAP = {
    "pending": "processing",
    "processing": "enriching",
    "completed": "ready",
    "partial": "ready",
    "failed": "failed",
}


def coerce_content_oid(content_id: str) -> PydanticObjectId:
    """Parse *content_id* into a PydanticObjectId or raise HTTP 404.

    Catches InvalidId, TypeError, and ValueError so callers never expose
    a 422/500 on a malformed ID string.
    """
    try:
        return PydanticObjectId(content_id)
    except (InvalidId, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )


async def load_content_for_partner(
    content_id: str,
    partner_id: str,
    *,
    user_role: str = "admin",
) -> Content:
    """Load and authorise a Content document for a given partner.

    Steps:
    1. Coerce *content_id* to an ObjectId (404 on bad format).
    2. Fetch from DB (404 if missing).
    3. Verify *partner_id* matches (404 on mismatch — no tenant leak).
    4. If *user_role* is not "admin" or "teacher", require
       ``processing_state == READY`` (404 otherwise — matches the list
       endpoint's trainee visibility rule).
    """
    oid = coerce_content_oid(content_id)
    content = await Content.get(oid)
    if not content or content.partner_id != partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )
    if user_role not in ("admin", "teacher"):
        if content.processing_state != ProcessingState.READY:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found",
            )
    return content


async def resolve_source_metadata(video_url: str) -> dict[str, str]:
    """Fetch oEmbed metadata for *video_url*, falling back to hostname/direct."""
    from urllib.parse import urlparse as _urlparse

    import httpx

    from app.utils.video_url_utils import get_oembed_url

    source_meta: dict[str, str] = {}
    oembed_endpoint = get_oembed_url(video_url)
    if oembed_endpoint:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(oembed_endpoint)
                if resp.status_code == 200:
                    data = resp.json()
                    source_meta = {
                        "provider_name": data.get("provider_name", ""),
                        "original_title": data.get("title", ""),
                        "author_name": data.get("author_name", ""),
                    }
        except Exception:
            logger.debug("oEmbed fetch failed", extra={"url": video_url})
    if not source_meta.get("provider_name"):
        parsed_host = _urlparse(video_url).hostname or ""
        source_meta["provider_name"] = (
            "Direct File"
            if any(video_url.lower().endswith(ext) for ext in (".mp4", ".webm", ".mov", ".avi", ".mkv"))
            else parsed_host
        )
    return source_meta


def _parse_duration_seconds(duration_str: str | None) -> int:
    """Parse 'H:MM:SS' or 'M:SS' duration string to total seconds."""
    if not duration_str:
        return 0
    parts = duration_str.split(":")
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
    except (ValueError, IndexError):
        pass
    return 0


def _compute_warnings(
    chapter_count: int,
    duration_str: str | None,
) -> list[dict[str, str]]:
    """Compute warning codes based on chapter count and video duration."""
    warnings: list[dict[str, str]] = []
    if chapter_count == 0:
        warnings.append({
            "code": "no_chapters",
            "message": (
                "This video produced no chapter markers. "
                "Chapter-dependent features (chapter navigation, "
                "chapter-locked progression, chapter-boundary quizzes) "
                "will be disabled for trainees."
            ),
        })
    elif chapter_count <= 2:
        duration_s = _parse_duration_seconds(duration_str)
        if duration_s > 600:  # > 10 minutes
            warnings.append({
                "code": "few_chapters",
                "message": (
                    "This video has very few chapter markers. "
                    "Some lesson formats may not work as designed."
                ),
            })
    return warnings


def _content_response(
    c: Content,
    status_map: dict[str, str] | None = None,
    chapter_count: int | None = None,
) -> dict:
    """Serialize a Content document for the training API."""
    resp = {
        "content_id": str(c.id),
        "title": c.title,
        "description": c.description or "",
        "tags": c.topic_tags,
        "stream_url": c.stream_url,
        "duration": c.duration,
        "has_subtitles": c.has_subtitles,
        "thumbnail": c.thumbnail or c.poster_url,
    }
    if status_map is not None:
        resp["status"] = _STATUS_DISPLAY_MAP.get(
            status_map.get(str(c.id), ""), "ready",
        )
    if chapter_count is not None:
        warnings = _compute_warnings(chapter_count, c.duration)
        if warnings:
            resp["warnings"] = warnings
    if c.source_metadata:
        resp["source_metadata"] = c.source_metadata
    return resp
