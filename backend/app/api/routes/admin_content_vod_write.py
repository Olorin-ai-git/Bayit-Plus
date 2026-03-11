"""
Admin VOD Content Write Endpoints
Create, update, delete, and modify VOD content
"""

import logging
from datetime import datetime
from uuid import uuid4

from beanie import PydanticObjectId
from beanie.exceptions import RevisionIdWasChanged
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request

from app.models.admin import AuditAction, Permission
from app.models.content import Content
from app.models.content_taxonomy import ContentSection
from app.models.user import User
from app.services.image_storage import download_and_encode_image
from app.services.content_deletion_service import content_deletion_service
from app.services.subtitle_extraction_service import \
    analyze_and_extract_subtitles

from .admin_content_schemas import (ContentCreateRequest,
                                    ContentUpdateRequest, MergeContentRequest)
from .admin_content_utils import has_permission, log_audit
from app.api.routes.content.utils import is_series_content

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
        # NOTE: is_series field removed - determined from category_name/series structure
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

    # Check if this is a legacy document without proper revision control
    is_legacy = not hasattr(content, 'revision_id') or content.revision_id is None or not isinstance(content.revision_id, str)
    if is_legacy:
        logger.info(f"Legacy content detected {content_id}, will use replace() instead of save()")

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

    # Use replace() for legacy documents, save() for documents with revision control
    if is_legacy:
        # Replace bypasses revision control entirely
        await content.replace()
    else:
        # Handle optimistic concurrency control with retry
        max_retries = 3
        for attempt in range(max_retries):
            try:
                await content.save()
                break
            except RevisionIdWasChanged:
                if attempt == max_retries - 1:
                    logger.error(
                        f"Failed to save content {content_id} after {max_retries} attempts due to concurrent modifications"
                    )
                    raise HTTPException(
                        status_code=409,
                        detail="Content was modified by another process. Please refresh and try again."
                    )
                # Refetch the latest version and reapply changes
                logger.warning(
                    f"Revision conflict on content {content_id}, retrying (attempt {attempt + 1}/{max_retries})"
                )
                # Store image data before refetch
                thumbnail_data_to_preserve = content.thumbnail_data if hasattr(content, 'thumbnail_data') else None
                backdrop_data_to_preserve = content.backdrop_data if hasattr(content, 'backdrop_data') else None

                content = await Content.get(content_id)
                if not content:
                    raise HTTPException(status_code=404, detail="Content not found")

                # Reapply all changes to the fresh document
                if data.title is not None:
                    content.title = data.title
                if data.category_id is not None:
                    content.category_id = data.category_id
                    category = await ContentSection.get(data.category_id)
                    if category:
                        content.category_name = category.slug
                if data.description is not None:
                    content.description = data.description
                if data.duration is not None:
                    content.duration = data.duration
                if data.year is not None:
                    content.year = data.year
                if data.rating is not None:
                    content.rating = data.rating
                if data.genre is not None:
                    content.genre = data.genre
                if data.cast is not None:
                    content.cast = data.cast
                if data.director is not None:
                    content.director = data.director
                if data.thumbnail is not None:
                    content.thumbnail = data.thumbnail
                    if thumbnail_data_to_preserve:
                        content.thumbnail_data = thumbnail_data_to_preserve
                if data.backdrop is not None:
                    content.backdrop = data.backdrop
                    if backdrop_data_to_preserve:
                        content.backdrop_data = backdrop_data_to_preserve
                if data.stream_url is not None:
                    content.stream_url = data.stream_url
                if data.stream_type is not None:
                    content.stream_type = data.stream_type
                if data.is_published is not None:
                    content.is_published = data.is_published
                    if data.is_published and not content.published_at:
                        content.published_at = datetime.utcnow()
                if data.is_featured is not None:
                    content.is_featured = data.is_featured
                if data.requires_subscription is not None:
                    content.requires_subscription = data.requires_subscription
                if data.is_kids_content is not None:
                    content.is_kids_content = data.is_kids_content
                if data.age_rating is not None:
                    content.age_rating = data.age_rating
                if data.educational_tags is not None:
                    content.educational_tags = data.educational_tags
                content.updated_at = datetime.utcnow()

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
    delete_files: bool = True,
    delete_episodes: bool = True,
    current_user: User = Depends(has_permission(Permission.CONTENT_DELETE)),
):
    """
    Delete VOD content completely.

    Args:
        content_id: The content ID to delete
        delete_files: If True, also delete GCS files (default: True)
        delete_episodes: If True and content is a series, delete all episodes
    """
    try:
        content = await Content.get(content_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Content not found")
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    content_title = content.title
    # Determine if series using helper function (NOT is_series field)
    is_series = is_series_content(content.model_dump())

    # Use the deletion service for complete cleanup
    if delete_files:
        result = await content_deletion_service.delete_content_complete(
            content_id, delete_episodes=delete_episodes
        )
    else:
        # Just delete from DB (legacy behavior)
        await content.delete()
        result = {"content_deleted": True, "gcs_files_deleted": 0, "episodes_deleted": 0}

    await log_audit(
        str(current_user.id),
        AuditAction.CONTENT_DELETED,
        "content",
        content_id,
        {
            "title": content_title,
            "is_series": is_series,  # Computed from category/structure
            "gcs_files_deleted": result.get("gcs_files_deleted", 0),
            "episodes_deleted": result.get("episodes_deleted", 0),
        },
        request,
    )

    return {
        "message": "Content deleted",
        "gcs_files_deleted": result.get("gcs_files_deleted", 0),
        "episodes_deleted": result.get("episodes_deleted", 0),
        "errors": result.get("errors", []),
    }


@router.post("/content/batch/delete")
async def batch_delete_content(
    data: dict,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_DELETE)),
):
    """Batch delete multiple content items with GCS file cleanup."""
    content_ids = data.get("content_ids", [])
    delete_files = data.get("delete_files", True)
    delete_episodes = data.get("delete_episodes", True)

    if not content_ids:
        raise HTTPException(status_code=400, detail="No content IDs provided")

    # Use the deletion service for complete cleanup
    if delete_files:
        result = await content_deletion_service.batch_delete_content_complete(
            content_ids, delete_episodes=delete_episodes
        )
        deleted_count = result["content_deleted"]
        errors = result["errors"]
        gcs_files_deleted = result["gcs_files_deleted"]
        episodes_deleted = result["episodes_deleted"]
    else:
        # Legacy behavior - just delete from DB
        deleted_count = 0
        errors = []
        gcs_files_deleted = 0
        episodes_deleted = 0

        for content_id in content_ids:
            try:
                content = await Content.get(content_id)
                if content:
                    await content.delete()
                    deleted_count += 1
                else:
                    errors.append(f"Content {content_id} not found")
            except Exception as e:
                logger.error(f"Failed to delete content {content_id}: {e}")
                errors.append(f"Failed to delete {content_id}: {str(e)}")

    # Log audit for batch operation
    await log_audit(
        str(current_user.id),
        AuditAction.CONTENT_DELETED,
        "content",
        "batch",
        {
            "content_ids": content_ids,
            "deleted_count": deleted_count,
            "gcs_files_deleted": gcs_files_deleted,
            "episodes_deleted": episodes_deleted,
        },
        request,
    )

    return {
        "deleted_count": deleted_count,
        "gcs_files_deleted": gcs_files_deleted,
        "episodes_deleted": episodes_deleted,
        "errors": errors,
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
        base_is_series = is_series_content(base_content.model_dump())
        if not all(is_series_content(c.model_dump()) == base_is_series for c in merge_contents):
            raise HTTPException(
                status_code=400,
                detail="All content items must be of the same type (series or movie)",
            )

        seasons_transferred = 0
        episodes_transferred = 0
        errors = []

        # For series, transfer seasons and episodes
        if base_is_series:
            for merge_series in merge_contents:
                try:
                    # Transfer seasons if requested
                    if data.transfer_seasons:
                        seasons = await Content.find(
                            {
                                "series_id": merge_series.id,
                                # Episodes have series_id, not parent series
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
                                # Episodes have series_id, not parent series
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


@router.post("/batch/featured-order")
async def batch_save_featured_order(
    data: dict,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """Batch save featured item ordering for multiple sections."""
    sections_data = data.get("sections", [])

    if not sections_data:
        raise HTTPException(status_code=400, detail="No sections provided")

    updated_count = 0
    sections_updated = []
    errors = []

    for section_data in sections_data:
        section_id = section_data.get("section_id")
        items = section_data.get("items", [])

        if not section_id:
            errors.append("Section ID missing")
            continue

        try:
            # Verify section exists
            section = await ContentSection.get(section_id)
            if not section:
                errors.append(f"Section {section_id} not found")
                continue

            # Update each content item
            for item_data in items:
                content_id = item_data.get("content_id")
                order = item_data.get("order")

                if not content_id or order is None:
                    errors.append(f"Invalid item data in section {section_id}")
                    continue

                try:
                    content = await Content.get(content_id)
                    if not content:
                        errors.append(f"Content {content_id} not found")
                        continue

                    # Update featured_order dictionary
                    featured_order = content.featured_order or {}
                    featured_order[section_id] = order
                    content.featured_order = featured_order
                    content.is_featured = True
                    content.updated_at = datetime.utcnow()

                    await content.save()
                    updated_count += 1

                except Exception as e:
                    logger.error(f"Failed to update content {content_id}: {e}")
                    errors.append(f"Failed to update {content_id}: {str(e)}")

            sections_updated.append(section_data.get("slug", section_id))

        except Exception as e:
            logger.error(f"Error processing section {section_id}: {e}")
            errors.append(f"Section {section_id} error: {str(e)}")

    # Log audit
    await log_audit(
        str(current_user.id),
        AuditAction.CONTENT_UPDATED,
        "featured_order",
        "batch",
        {
            "sections": len(sections_data),
            "items_updated": updated_count,
            "sections_updated": sections_updated,
        },
        request,
    )

    return {
        "success": len(errors) == 0,
        "updated_count": updated_count,
        "sections_updated": sections_updated,
        "errors": errors,
    }
