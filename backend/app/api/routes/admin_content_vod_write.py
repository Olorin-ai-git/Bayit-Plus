"""
Admin VOD Content Write Endpoints
Create, update, delete, and modify VOD content
"""

import logging
from datetime import datetime

from beanie import PydanticObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request

from app.models.admin import AuditAction, Permission
from app.models.content import Content
from app.models.content_taxonomy import ContentSection
from app.models.user import User
from app.services.image_storage import download_and_encode_image
from app.services.subtitle_extraction_service import \
    analyze_and_extract_subtitles

from .admin_content_schemas import (ContentCreateRequest, ContentUpdateRequest,
                                    MergeContentRequest)
from .admin_content_utils import has_permission, log_audit

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/content")
async def create_content(
    data: ContentCreateRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """Create new VOD content."""
    category = await ContentSection.get(data.category_id)
    if not category:
        raise HTTPException(status_code=400, detail="Category not found")

    content = Content(
        title=data.title,
        description=data.description,
        thumbnail=data.thumbnail,
        backdrop=data.backdrop,
        category_id=data.category_id,
        category_name=category.slug,  # Using slug for legacy compatibility
        duration=data.duration,
        year=data.year,
        rating=data.rating,
        genre=data.genre,
        cast=data.cast or [],
        director=data.director,
        stream_url=data.stream_url,
        stream_type=data.stream_type,
        is_drm_protected=data.is_drm_protected,
        drm_key_id=data.drm_key_id,
        is_series=data.is_series,
        season=data.season,
        episode=data.episode,
        series_id=data.series_id,
        is_published=data.is_published,
        is_featured=data.is_featured,
        requires_subscription=data.requires_subscription,
        is_kids_content=data.is_kids_content,
        age_rating=data.age_rating,
        content_rating=data.content_rating,
        educational_tags=data.educational_tags,
    )
    await content.insert()
    await log_audit(
        str(current_user.id),
        AuditAction.CONTENT_CREATED,
        "content",
        str(content.id),
        {"title": content.title, "category": content.category_name},
        request,
    )

    # Trigger subtitle extraction if stream URL provided
    if data.stream_url:
        background_tasks.add_task(
            analyze_and_extract_subtitles, str(content.id), data.stream_url
        )
        logger.info(f"Queued subtitle extraction for content {content.id}")

    return {
        "id": str(content.id),
        "title": content.title,
        "category_name": content.category_name,
        "created_at": content.created_at.isoformat(),
    }


@router.patch("/content/{content_id}")
async def update_content(
    content_id: str,
    data: ContentUpdateRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """Update VOD content fields."""
    try:
        content = await Content.get(content_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Content not found")
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    changes = {}
    stream_url_changed = False
    if data.title is not None:
        changes["title"] = {"old": content.title, "new": data.title}
        content.title = data.title
    if data.category_id is not None:
        category = await ContentSection.get(data.category_id)
        if not category:
            raise HTTPException(status_code=400, detail="Category not found")
        changes["category_id"] = {"old": content.category_id, "new": data.category_id}
        content.category_id = data.category_id
        # category_name is deprecated, using slug for legacy compatibility
        content.category_name = category.slug
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
        if data.thumbnail and data.thumbnail.startswith(("http://", "https://")):
            logger.info(f"Downloading thumbnail from URL: {data.thumbnail}")
            thumbnail_data = await download_and_encode_image(
                data.thumbnail, max_size=(800, 1200)
            )
            if thumbnail_data:
                content.thumbnail_data = thumbnail_data
                logger.info(
                    f"Successfully stored thumbnail data for content {content_id}"
                )
            else:
                logger.warning(f"Failed to download thumbnail from {data.thumbnail}")
    if data.backdrop is not None:
        changes["backdrop"] = {"old": content.backdrop, "new": data.backdrop}
        content.backdrop = data.backdrop
        # Download and store image if it's a valid URL
        if data.backdrop and data.backdrop.startswith(("http://", "https://")):
            logger.info(f"Downloading backdrop from URL: {data.backdrop}")
            backdrop_data = await download_and_encode_image(
                data.backdrop, max_size=(1920, 1080)
            )
            if backdrop_data:
                content.backdrop_data = backdrop_data
                logger.info(
                    f"Successfully stored backdrop data for content {content_id}"
                )
            else:
                logger.warning(f"Failed to download backdrop from {data.backdrop}")
    if data.stream_url is not None:
        changes["stream_url"] = {"changed": True}
        content.stream_url = data.stream_url
        stream_url_changed = True
    if data.stream_type is not None:
        changes["stream_type"] = {"old": content.stream_type, "new": data.stream_type}
        content.stream_type = data.stream_type
    if data.is_published is not None:
        changes["is_published"] = {
            "old": content.is_published,
            "new": data.is_published,
        }
        content.is_published = data.is_published
        if data.is_published and not content.published_at:
            content.published_at = datetime.utcnow()
    if data.is_featured is not None:
        changes["is_featured"] = {"old": content.is_featured, "new": data.is_featured}
        content.is_featured = data.is_featured
    if data.requires_subscription is not None:
        changes["requires_subscription"] = {
            "old": content.requires_subscription,
            "new": data.requires_subscription,
        }
        content.requires_subscription = data.requires_subscription
    if data.is_kids_content is not None:
        changes["is_kids_content"] = {
            "old": content.is_kids_content,
            "new": data.is_kids_content,
        }
        content.is_kids_content = data.is_kids_content
    if data.age_rating is not None:
        changes["age_rating"] = {"old": content.age_rating, "new": data.age_rating}
        content.age_rating = data.age_rating
    if data.educational_tags is not None:
        changes["educational_tags"] = {"changed": True}
        content.educational_tags = data.educational_tags

    content.updated_at = datetime.utcnow()
    await content.save()
    await log_audit(
        str(current_user.id),
        AuditAction.CONTENT_UPDATED,
        "content",
        content_id,
        changes,
        request,
    )

    # Trigger subtitle extraction if stream URL was updated
    if stream_url_changed and content.stream_url:
        background_tasks.add_task(
            analyze_and_extract_subtitles, content_id, content.stream_url
        )
        logger.info(f"Queued subtitle extraction for updated content {content_id}")

    return {"message": "Content updated", "id": content_id}


@router.delete("/content/{content_id}")
async def delete_content(
    content_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_DELETE)),
):
    """Delete VOD content."""
    try:
        content = await Content.get(content_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Content not found")
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    await log_audit(
        str(current_user.id),
        AuditAction.CONTENT_DELETED,
        "content",
        content_id,
        {"title": content.title},
        request,
    )
    await content.delete()
    return {"message": "Content deleted"}


@router.post("/content/batch/delete")
async def batch_delete_content(
    data: dict,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_DELETE)),
):
    """Batch delete multiple content items."""
    content_ids = data.get("content_ids", [])

    if not content_ids:
        raise HTTPException(status_code=400, detail="No content IDs provided")

    deleted_count = 0
    errors = []

    for content_id in content_ids:
        try:
            content = await Content.get(content_id)
            if content:
                await log_audit(
                    str(current_user.id),
                    AuditAction.CONTENT_DELETED,
                    "content",
                    content_id,
                    {"title": content.title},
                    request,
                )
                await content.delete()
                deleted_count += 1
            else:
                errors.append(f"Content {content_id} not found")
        except Exception as e:
            logger.error(f"Failed to delete content {content_id}: {e}")
            errors.append(f"Failed to delete {content_id}: {str(e)}")

    return {
        "deleted_count": deleted_count,
        "errors": errors
    }


@router.post("/content/batch/feature")
async def batch_feature_content(
    data: dict,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """Batch update featured status for multiple content items."""
    content_ids = data.get("content_ids", [])
    featured = data.get("featured", True)

    if not content_ids:
        raise HTTPException(status_code=400, detail="No content IDs provided")

    updated_count = 0
    errors = []

    for content_id in content_ids:
        try:
            content = await Content.get(content_id)
            if content:
                content.is_featured = featured
                content.updated_at = datetime.utcnow()
                await content.save()

                await log_audit(
                    str(current_user.id),
                    AuditAction.CONTENT_UPDATED,
                    "content",
                    content_id,
                    {"is_featured": {"old": not featured, "new": featured}},
                    request,
                )
                updated_count += 1
            else:
                errors.append(f"Content {content_id} not found")
        except Exception as e:
            logger.error(f"Failed to update content {content_id}: {e}")
            errors.append(f"Failed to update {content_id}: {str(e)}")

    return {
        "updated_count": updated_count,
        "errors": errors
    }


@router.post("/content/batch/merge")
async def merge_content(
    data: MergeContentRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """Merge multiple content items into one base item."""
    from datetime import datetime, timezone

    # Validate base_id and merge_ids
    if not data.merge_ids:
        raise HTTPException(
            status_code=400, detail="At least one item required for merging"
        )

    try:
        # Convert IDs to ObjectId
        try:
            base_obj_id = PydanticObjectId(data.base_id)
            merge_obj_ids = [PydanticObjectId(mid) for mid in data.merge_ids]
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid content ID format: {str(e)}"
            )

        # Get base content
        base_content = await Content.get(base_obj_id)
        if not base_content:
            raise HTTPException(
                status_code=404, detail=f"Base content {data.base_id} not found"
            )

        # Get merge contents
        merge_contents = await Content.find({"_id": {"$in": merge_obj_ids}}).to_list()

        if len(merge_contents) != len(data.merge_ids):
            raise HTTPException(
                status_code=404, detail="Some merge content items not found"
            )

        # Validate all contents are same type (series/movie)
        if not all(c.is_series == base_content.is_series for c in merge_contents):
            raise HTTPException(
                status_code=400,
                detail="All content items must be of the same type (series or movie)",
            )

        seasons_transferred = 0
        episodes_transferred = 0
        errors = []

        # For series, transfer seasons and episodes
        if base_content.is_series:
            for merge_series in merge_contents:
                try:
                    # Transfer seasons if requested
                    if data.transfer_seasons:
                        seasons = await Content.find(
                            {
                                "series_id": merge_series.id,
                                "is_series": False,
                                "season_number": {"$exists": True, "$ne": None},
                            }
                        ).to_list()

                        for season in seasons:
                            if not data.dry_run:
                                season.series_id = base_obj_id
                                await season.save()
                            seasons_transferred += 1

                    # Transfer episodes if requested
                    if data.transfer_episodes:
                        episodes = await Content.find(
                            {
                                "series_id": merge_series.id,
                                "is_series": False,
                                "episode_number": {"$exists": True, "$ne": None},
                            }
                        ).to_list()

                        for episode in episodes:
                            if not data.dry_run:
                                episode.series_id = base_obj_id
                                await episode.save()
                            episodes_transferred += 1

                except Exception as e:
                    logger.error(
                        f"Error transferring content from {merge_series.id}: {e}"
                    )
                    errors.append(
                        f"Failed to transfer from {merge_series.title}: {str(e)}"
                    )

            # Update base series metadata if not preserving
            if not data.dry_run:
                if not data.preserve_metadata.useBasePoster:
                    # Use poster from first merge series that has one
                    for merge_series in merge_contents:
                        if merge_series.poster_url or merge_series.thumbnail:
                            base_content.poster_url = (
                                merge_series.poster_url or merge_series.thumbnail
                            )
                            base_content.thumbnail = (
                                merge_series.thumbnail or merge_series.poster_url
                            )
                            break

                if not data.preserve_metadata.useBaseDescription:
                    # Use description from first merge series that has one
                    for merge_series in merge_contents:
                        if merge_series.description:
                            base_content.description = merge_series.description
                            break

                base_content.updated_at = datetime.now(timezone.utc)
                await base_content.save()

        # Mark merged contents as merged (unpublish and add review reason)
        if not data.dry_run:
            for merge_content in merge_contents:
                merge_content.is_published = False
                merge_content.needs_review = (
                    False  # No review needed, this is intentional
                )
                merge_content.review_reason = (
                    f"Merged into '{base_content.title}' (ID: {str(base_obj_id)})"
                )
                merge_content.review_issue_type = "merged"
                merge_content.updated_at = datetime.now(timezone.utc)
                await merge_content.save()

        # Log audit
        await log_audit(
            str(current_user.id),
            AuditAction.CONTENT_UPDATED,
            "content",
            data.base_id,
            {
                "action": "merge",
                "base_id": data.base_id,
                "merged_ids": data.merge_ids,
                "seasons_transferred": seasons_transferred,
                "episodes_transferred": episodes_transferred,
                "dry_run": data.dry_run,
            },
            request,
        )

        return {
            "success": True,
            "items_merged": len(data.merge_ids),
            "base_content_id": data.base_id,
            "merged_content_ids": data.merge_ids,
            "seasons_transferred": seasons_transferred,
            "episodes_transferred": episodes_transferred,
            "errors": errors,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error merging content: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
