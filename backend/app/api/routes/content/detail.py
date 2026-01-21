"""
Content detail and streaming endpoints.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core.security import (get_current_active_user, get_optional_user,
                               get_passkey_session)
from app.models.content import Content
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


async def check_visibility_access(
    content: Content,
    request: Request,
    require_stream: bool = False,
) -> bool:
    """
    Check if the request has access to view/stream this content based on visibility_mode.

    Args:
        content: The content item to check
        request: The HTTP request (to check passkey session)
        require_stream: If True, checks for stream access (stricter for passkey_protected)

    Returns:
        True if access is allowed

    Raises:
        HTTPException if access is denied
    """
    visibility_mode = getattr(content, "visibility_mode", None) or "public"

    if visibility_mode == "public":
        return True

    if visibility_mode == "private":
        # Private content is only accessible via direct link and requires passkey for streaming
        if require_stream:
            passkey_session = await get_passkey_session(request)
            if not passkey_session:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Passkey authentication required to stream this content",
                )
        return True

    if visibility_mode == "passkey_protected":
        # Free content is always accessible
        if content.requires_subscription == "none":
            return True

        # Check for valid passkey session
        passkey_session = await get_passkey_session(request)
        if not passkey_session:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Passkey authentication required to access this content",
            )
        return True

    return True


@router.get("/{content_id}")
async def get_content(
    content_id: str,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get content details."""
    content = await Content.get(content_id)
    if not content or not content.is_published:
        raise HTTPException(status_code=404, detail="Content not found")

    # Check visibility access (doesn't require stream access for details)
    await check_visibility_access(content, request, require_stream=False)

    related = (
        await Content.find(
            Content.category_id == content.category_id,
            Content.id != content.id,
            Content.is_published == True,
        )
        .limit(6)
        .to_list()
    )

    response = {
        "id": str(content.id),
        "title": content.title,
        "description": content.description,
        "thumbnail": content.thumbnail,
        "backdrop": content.backdrop,
        "category": content.category_name,
        "duration": content.duration,
        "year": content.year,
        "rating": content.rating,
        "genre": content.genre,
        "cast": content.cast,
        "director": content.director,
        "is_series": content.is_series,
        "type": "series" if content.is_series else "movie",
        "available_subtitle_languages": content.available_subtitle_languages or [],
        "has_subtitles": bool(
            content.available_subtitle_languages
            and len(content.available_subtitle_languages) > 0
        ),
        "related": [
            {
                "id": str(item.id),
                "title": item.title,
                "thumbnail": item.thumbnail,
                "duration": item.duration,
                "year": item.year,
                "type": "series" if item.is_series else "movie",
            }
            for item in related
        ],
    }

    if current_user:
        response["stream_url"] = content.stream_url
        response["stream_type"] = content.stream_type
        response["preview_url"] = content.preview_url
        response["trailer_url"] = content.trailer_url

    return response


@router.get("/{content_id}/stream")
async def get_stream_url(
    content_id: str,
    request: Request,
    quality: Optional[str] = Query(
        None, description="Quality tier to request (4k, 1080p, 720p, 480p)"
    ),
    current_user: User = Depends(get_current_active_user),
):
    """Get stream URL for content (requires authentication). Supports quality selection."""
    content = await Content.get(content_id)
    if not content or not content.is_published:
        raise HTTPException(status_code=404, detail="Content not found")

    # Check visibility access (requires stream access for protected content)
    await check_visibility_access(content, request, require_stream=True)

    is_admin = current_user.role in ["super_admin", "admin"]

    if not is_admin:
        required_tier = content.requires_subscription or "basic"

        if required_tier != "none":
            user_tier = current_user.subscription_tier

            tier_levels = {"basic": 1, "premium": 2, "family": 3}
            if not user_tier or tier_levels.get(user_tier, 0) < tier_levels.get(
                required_tier, 1
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Subscription upgrade required",
                )

    available_qualities = []
    stream_url = content.stream_url
    current_quality = content.quality_tier

    if content.quality_variants:
        for variant in content.quality_variants:
            available_qualities.append(
                {
                    "quality": variant.get("quality_tier"),
                    "resolution_height": variant.get("resolution_height"),
                    "content_id": variant.get("content_id"),
                }
            )

        if quality:
            matching_variant = next(
                (
                    v
                    for v in content.quality_variants
                    if v.get("quality_tier") == quality
                ),
                None,
            )
            if matching_variant:
                stream_url = matching_variant.get("stream_url", content.stream_url)
                current_quality = matching_variant.get("quality_tier")

    elif content.primary_content_id:
        primary = await Content.get(content.primary_content_id)
        if primary and primary.quality_variants:
            for variant in primary.quality_variants:
                available_qualities.append(
                    {
                        "quality": variant.get("quality_tier"),
                        "resolution_height": variant.get("resolution_height"),
                        "content_id": variant.get("content_id"),
                    }
                )

            if quality:
                matching_variant = next(
                    (
                        v
                        for v in primary.quality_variants
                        if v.get("quality_tier") == quality
                    ),
                    None,
                )
                if matching_variant:
                    stream_url = matching_variant.get("stream_url", content.stream_url)
                    current_quality = matching_variant.get("quality_tier")

    if not available_qualities and content.video_metadata:
        height = content.video_metadata.get("height", 0)
        if height >= 2160:
            current_quality = "4k"
        elif height >= 1080:
            current_quality = "1080p"
        elif height >= 720:
            current_quality = "720p"
        elif height >= 480:
            current_quality = "480p"

        available_qualities.append(
            {
                "quality": current_quality,
                "resolution_height": height,
                "content_id": str(content.id),
            }
        )

    return {
        "url": stream_url,
        "type": content.stream_type,
        "quality": current_quality,
        "available_qualities": available_qualities,
        "is_drm_protected": content.is_drm_protected,
        "drm_key_id": content.drm_key_id if content.is_drm_protected else None,
    }


@router.get("/{content_id}/preview")
async def get_content_preview(content_id: str):
    """Get preview/trailer URL for content."""
    content = await Content.get(content_id)
    if not content or not content.is_published:
        raise HTTPException(status_code=404, detail="Content not found")

    return {
        "id": str(content.id),
        "preview_url": content.preview_url,
        "trailer_url": content.trailer_url,
        "thumbnail": content.thumbnail,
        "backdrop": content.backdrop,
    }
