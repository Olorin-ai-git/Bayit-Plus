"""
Admin VOD Content Write Endpoints
Create, update, delete, and modify VOD content
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request
import logging

from app.models.user import User
from app.models.content import Content, Category
from app.models.admin import Permission, AuditAction
from .admin_content_utils import has_permission, log_audit
from .admin_content_schemas import ContentCreateRequest, ContentUpdateRequest
from app.services.image_storage import download_and_encode_image

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/content")
async def create_content(
    data: ContentCreateRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """Create new VOD content."""
    category = await Category.get(data.category_id)
    if not category:
        raise HTTPException(status_code=400, detail="Category not found")

    content = Content(
        title=data.title, description=data.description, thumbnail=data.thumbnail,
        backdrop=data.backdrop, category_id=data.category_id, category_name=category.name,
        duration=data.duration, year=data.year, rating=data.rating, genre=data.genre,
        cast=data.cast or [], director=data.director, stream_url=data.stream_url,
        stream_type=data.stream_type, is_drm_protected=data.is_drm_protected,
        drm_key_id=data.drm_key_id, is_series=data.is_series, season=data.season,
        episode=data.episode, series_id=data.series_id, is_published=data.is_published,
        is_featured=data.is_featured, requires_subscription=data.requires_subscription,
        is_kids_content=data.is_kids_content, age_rating=data.age_rating,
        content_rating=data.content_rating, educational_tags=data.educational_tags,
    )
    await content.insert()
    await log_audit(str(current_user.id), AuditAction.CONTENT_CREATED, "content",
        str(content.id), {"title": content.title, "category": content.category_name}, request)
    return {"id": str(content.id), "title": content.title, "category_name": content.category_name,
            "created_at": content.created_at.isoformat()}


@router.patch("/content/{content_id}")
async def update_content(
    content_id: str,
    data: ContentUpdateRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE))
):
    """Update VOD content fields."""
    try:
        content = await Content.get(content_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Content not found")
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    changes = {}
    if data.title is not None:
        changes["title"] = {"old": content.title, "new": data.title}
        content.title = data.title
    if data.category_id is not None:
        category = await Category.get(data.category_id)
        if not category:
            raise HTTPException(status_code=400, detail="Category not found")
        changes["category_id"] = {"old": content.category_id, "new": data.category_id}
        content.category_id, content.category_name = data.category_id, category.name
    if data.description is not None:
        changes["description"] = {"old": content.description, "new": data.description}
        content.description = data.description
    if data.duration is not None:
        changes["duration"] = {"old": content.duration, "new": data.duration}
        content.duration = data.duration
    if data.year is not None:
        changes["year"] = {"old": content.year, "new": data.year}
        content.year = data.year
    if data.rating is not None:
        changes["rating"] = {"old": content.rating, "new": data.rating}
        content.rating = data.rating
    if data.genre is not None:
        changes["genre"] = {"old": content.genre, "new": data.genre}
        content.genre = data.genre
    if data.cast is not None:
        changes["cast"] = {"changed": True}
        content.cast = data.cast
    if data.director is not None:
        changes["director"] = {"old": content.director, "new": data.director}
        content.director = data.director
    if data.thumbnail is not None:
        changes["thumbnail"] = {"old": content.thumbnail, "new": data.thumbnail}
        content.thumbnail = data.thumbnail
        # Download and store image if it's a valid URL
        if data.thumbnail and data.thumbnail.startswith(('http://', 'https://')):
            logger.info(f"Downloading thumbnail from URL: {data.thumbnail}")
            thumbnail_data = await download_and_encode_image(data.thumbnail, max_size=(800, 1200))
            if thumbnail_data:
                content.thumbnail_data = thumbnail_data
                logger.info(f"Successfully stored thumbnail data for content {content_id}")
            else:
                logger.warning(f"Failed to download thumbnail from {data.thumbnail}")
    if data.backdrop is not None:
        changes["backdrop"] = {"old": content.backdrop, "new": data.backdrop}
        content.backdrop = data.backdrop
        # Download and store image if it's a valid URL
        if data.backdrop and data.backdrop.startswith(('http://', 'https://')):
            logger.info(f"Downloading backdrop from URL: {data.backdrop}")
            backdrop_data = await download_and_encode_image(data.backdrop, max_size=(1920, 1080))
            if backdrop_data:
                content.backdrop_data = backdrop_data
                logger.info(f"Successfully stored backdrop data for content {content_id}")
            else:
                logger.warning(f"Failed to download backdrop from {data.backdrop}")
    if data.stream_url is not None:
        changes["stream_url"] = {"changed": True}
        content.stream_url = data.stream_url
    if data.stream_type is not None:
        changes["stream_type"] = {"old": content.stream_type, "new": data.stream_type}
        content.stream_type = data.stream_type
    if data.is_published is not None:
        changes["is_published"] = {"old": content.is_published, "new": data.is_published}
        content.is_published = data.is_published
        if data.is_published and not content.published_at:
            content.published_at = datetime.utcnow()
    if data.is_featured is not None:
        changes["is_featured"] = {"old": content.is_featured, "new": data.is_featured}
        content.is_featured = data.is_featured
    if data.requires_subscription is not None:
        changes["requires_subscription"] = {"old": content.requires_subscription, "new": data.requires_subscription}
        content.requires_subscription = data.requires_subscription
    if data.is_kids_content is not None:
        changes["is_kids_content"] = {"old": content.is_kids_content, "new": data.is_kids_content}
        content.is_kids_content = data.is_kids_content
    if data.age_rating is not None:
        changes["age_rating"] = {"old": content.age_rating, "new": data.age_rating}
        content.age_rating = data.age_rating
    if data.educational_tags is not None:
        changes["educational_tags"] = {"changed": True}
        content.educational_tags = data.educational_tags

    content.updated_at = datetime.utcnow()
    await content.save()
    await log_audit(str(current_user.id), AuditAction.CONTENT_UPDATED, "content", content_id, changes, request)
    return {"message": "Content updated", "id": content_id}


@router.delete("/content/{content_id}")
async def delete_content(
    content_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_DELETE))
):
    """Delete VOD content."""
    try:
        content = await Content.get(content_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Content not found")
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    await log_audit(str(current_user.id), AuditAction.CONTENT_DELETED, "content", content_id,
                    {"title": content.title}, request)
    await content.delete()
    return {"message": "Content deleted"}


@router.post("/content/{content_id}/publish")
async def toggle_content_publish(
    content_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE))
):
    """Toggle content publish status."""
    try:
        content = await Content.get(content_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Content not found")
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    content.is_published = not content.is_published
    if content.is_published and not content.published_at:
        content.published_at = datetime.utcnow()
    content.updated_at = datetime.utcnow()
    await content.save()

    action = AuditAction.CONTENT_PUBLISHED if content.is_published else AuditAction.CONTENT_UNPUBLISHED
    await log_audit(str(current_user.id), action, "content", content_id,
                    {"title": content.title, "is_published": content.is_published}, request)
    return {"message": f"Content {'published' if content.is_published else 'unpublished'}",
            "is_published": content.is_published}


@router.post("/content/{content_id}/feature")
async def toggle_content_feature(
    content_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE))
):
    """Toggle content featured status."""
    try:
        content = await Content.get(content_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Content not found")
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    content.is_featured = not content.is_featured
    content.updated_at = datetime.utcnow()
    await content.save()
    await log_audit(str(current_user.id), AuditAction.CONTENT_UPDATED, "content", content_id,
                    {"title": content.title, "is_featured": content.is_featured}, request)
    return {"message": f"Content {'featured' if content.is_featured else 'unfeatured'}",
            "is_featured": content.is_featured}
