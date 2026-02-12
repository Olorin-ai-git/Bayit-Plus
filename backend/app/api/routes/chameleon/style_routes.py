"""Chameleon Engine REST API endpoints for style transfer."""

from app.core.logging_config import get_logger

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.security import get_current_user
from app.models.avatar_style_cache import AvatarStyleCache, StyleCacheStatus
from app.models.user import User
from app.services.chameleon.orchestrator import chameleon_orchestrator

logger = get_logger(__name__)
router = APIRouter(prefix="/chameleon", tags=["chameleon"])


class PrepareRequest(BaseModel):
    avatar_id: str
    show_content_id: str


def _cache_response(cache: AvatarStyleCache) -> dict:
    """Convert style cache to API response dict."""
    return {
        "id": str(cache.id),
        "avatar_id": cache.avatar_id,
        "show_content_id": cache.show_content_id,
        "status": cache.status.value,
        "clip_similarity_score": cache.clip_similarity_score,
        "poses_count": len(cache.poses),
        "style_descriptor": (
            cache.style_descriptor.model_dump()
            if cache.style_descriptor
            else None
        ),
        "poses": [
            {
                "pose_name": p.pose_name,
                "gcs_path": p.gcs_path,
                "width": p.width,
                "height": p.height,
            }
            for p in cache.poses
        ],
        "created_at": cache.created_at.isoformat(),
    }


@router.post("/prepare")
async def prepare_style(
    request: PrepareRequest,
    user: User = Depends(get_current_user),
):
    """Trigger background style transfer for an avatar and show."""
    try:
        cache = await chameleon_orchestrator.prepare_avatar_for_show(
            avatar_id=request.avatar_id,
            show_content_id=request.show_content_id,
        )
        return _cache_response(cache)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status/{cache_id}")
async def get_status(
    cache_id: str,
    user: User = Depends(get_current_user),
):
    """Poll preparation progress for a style transfer."""
    cache = await AvatarStyleCache.get(cache_id)
    if not cache:
        raise HTTPException(
            status_code=404, detail="Style cache not found"
        )
    return _cache_response(cache)


@router.get("/cached")
async def check_cached(
    avatar_id: str = Query(...),
    show_content_id: str = Query(...),
    user: User = Depends(get_current_user),
):
    """Check if a style-matched avatar already exists in cache."""
    cache = await chameleon_orchestrator.get_cached_style(
        avatar_id=avatar_id,
        show_content_id=show_content_id,
    )

    if not cache:
        return {"cached": False, "cache": None}

    return {"cached": True, "cache": _cache_response(cache)}
