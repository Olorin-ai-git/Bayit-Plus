"""
Avatar Movie Studio API Routes

Provides endpoints for managing interactive moments across VOD content library.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from beanie import PydanticObjectId

from app.core.security import get_current_admin_user
from app.models.user import User
from app.models.content import Content
from app.services.content_service import ContentService

router = APIRouter(prefix="/avatar-studio", tags=["avatar-studio"])


@router.get("/movies")
async def get_movies_with_moments(
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user),
) -> List[dict]:
    """
    Get all VOD content with interactive moment status.

    Returns list with:
    - Movie metadata
    - Interactive moments count
    - Status (ready/in_progress/not_started)
    """
    content_service = ContentService()

    query = {"content_type": {"$in": ["movie", "series", "documentary"]}}

    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    content_items = await Content.find(query).to_list()

    result = []
    for item in content_items:
        moments = item.interactive_moments or []
        moment_count = len(moments)

        if moment_count == 0:
            moment_status = "not_started"
        elif all(m.get("character_frame_url") for m in moments):
            moment_status = "ready"
        else:
            moment_status = "in_progress"

        if status_filter and moment_status != status_filter:
            continue

        result.append({
            "id": str(item.id),
            "title": item.title,
            "poster_url": item.poster_url,
            "year": item.year,
            "content_type": item.content_type,
            "video_url": item.video_url,
            "moment_count": moment_count,
            "status": moment_status,
        })

    return result


@router.get("/movies/{content_id}/moments")
async def get_movie_moments(
    content_id: str,
    current_user: User = Depends(get_current_admin_user),
) -> dict:
    """Get all interactive moments for a specific movie."""
    content = await Content.get(PydanticObjectId(content_id))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )

    return {
        "content_id": str(content.id),
        "title": content.title,
        "video_url": content.video_url,
        "moments": content.interactive_moments or [],
    }


@router.post("/movies/{content_id}/moments")
async def create_moment(
    content_id: str,
    moment_data: dict,
    current_user: User = Depends(get_current_admin_user),
) -> dict:
    """Create a new interactive moment for a movie."""
    content = await Content.get(PydanticObjectId(content_id))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )

    if not content.interactive_moments:
        content.interactive_moments = []

    new_moment = {
        "id": str(PydanticObjectId()),
        "timestamp": moment_data.get("timestamp", 0),
        "character_name": moment_data.get("character_name", ""),
        "interaction_prompt": moment_data.get("interaction_prompt", ""),
        "character_frame_url": moment_data.get("character_frame_url"),
        "voice_id": moment_data.get("voice_id"),
        "context": moment_data.get("context", ""),
        "max_duration": moment_data.get("max_duration", 60),
        "auto_generate_reel": moment_data.get("auto_generate_reel", True),
    }

    content.interactive_moments.append(new_moment)
    await content.save()

    return new_moment


@router.patch("/moments/{moment_id}")
async def update_moment(
    moment_id: str,
    content_id: str,
    moment_data: dict,
    current_user: User = Depends(get_current_admin_user),
) -> dict:
    """Update an existing interactive moment."""
    content = await Content.get(PydanticObjectId(content_id))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )

    moments = content.interactive_moments or []
    moment_index = next(
        (i for i, m in enumerate(moments) if m.get("id") == moment_id),
        None
    )

    if moment_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Moment not found"
        )

    moments[moment_index].update(moment_data)
    content.interactive_moments = moments
    await content.save()

    return moments[moment_index]


@router.delete("/moments/{moment_id}")
async def delete_moment(
    moment_id: str,
    content_id: str,
    current_user: User = Depends(get_current_admin_user),
) -> dict:
    """Delete an interactive moment."""
    content = await Content.get(PydanticObjectId(content_id))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )

    moments = content.interactive_moments or []
    updated_moments = [m for m in moments if m.get("id") != moment_id]

    if len(updated_moments) == len(moments):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Moment not found"
        )

    content.interactive_moments = updated_moments
    await content.save()

    return {"success": True, "deleted_id": moment_id}
