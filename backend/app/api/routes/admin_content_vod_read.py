"""
Admin VOD Content Read Endpoints
GET operations for VOD content
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query

from app.models.user import User
from app.models.content import Content
from app.models.admin import Permission
from .admin_content_utils import has_permission

router = APIRouter()


@router.get("/content")
async def get_content(
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    is_featured: Optional[bool] = None,
    is_published: Optional[bool] = None,
    is_kids_content: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.CONTENT_READ))
):
    """Get paginated list of VOD content with filters."""
    query = Content.find()
    if search:
        query = query.find({"$or": [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]})
    if category_id:
        query = query.find(Content.category_id == category_id)
    if is_featured is not None:
        query = query.find(Content.is_featured == is_featured)
    if is_published is not None:
        query = query.find(Content.is_published == is_published)
    if is_kids_content is not None:
        query = query.find(Content.is_kids_content == is_kids_content)

    total = await query.count()
    skip = (page - 1) * page_size
    items = await query.sort(-Content.created_at).skip(skip).limit(page_size).to_list()

    return {
        "items": [{
            "id": str(item.id),
            "title": item.title,
            "description": item.description,
            "thumbnail": item.thumbnail,
            "backdrop": item.backdrop,
            "category_id": item.category_id,
            "category_name": item.category_name,
            "duration": item.duration,
            "year": item.year,
            "rating": item.rating,
            "genre": item.genre,
            "cast": item.cast,
            "director": item.director,
            "stream_url": item.stream_url,
            "stream_type": item.stream_type,
            "is_published": item.is_published,
            "is_featured": item.is_featured,
            "requires_subscription": item.requires_subscription,
            "is_kids_content": item.is_kids_content,
            "age_rating": item.age_rating,
            "view_count": item.view_count,
            "avg_rating": item.avg_rating,
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat(),
        } for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/content/{content_id}")
async def get_content_detail(
    content_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_READ))
):
    """Get single content item details."""
    try:
        content = await Content.get(content_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Content not found")
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    return {
        "id": str(content.id),
        "title": content.title,
        "description": content.description,
        "thumbnail": content.thumbnail,
        "backdrop": content.backdrop,
        "category_id": content.category_id,
        "category_name": content.category_name,
        "duration": content.duration,
        "year": content.year,
        "rating": content.rating,
        "genre": content.genre,
        "cast": content.cast,
        "director": content.director,
        "stream_url": content.stream_url,
        "stream_type": content.stream_type,
        "is_drm_protected": content.is_drm_protected,
        "is_series": content.is_series,
        "season": content.season,
        "episode": content.episode,
        "series_id": content.series_id,
        "is_published": content.is_published,
        "is_featured": content.is_featured,
        "requires_subscription": content.requires_subscription,
        "is_kids_content": content.is_kids_content,
        "age_rating": content.age_rating,
        "content_rating": content.content_rating,
        "educational_tags": content.educational_tags,
        "view_count": content.view_count,
        "avg_rating": content.avg_rating,
        "created_at": content.created_at.isoformat(),
        "updated_at": content.updated_at.isoformat(),
        "published_at": content.published_at.isoformat() if content.published_at else None,
    }
