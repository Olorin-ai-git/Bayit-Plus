"""
Admin Kids Content Routes

Endpoints for managing kids content:
- Seed initial kids content
- Import from Archive.org public domain
- Sync kids podcasts
- Sync YouTube channels
- Curate and moderate content
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.api.routes.admin_content_utils import (AuditAction, Permission,
                                                has_permission, log_audit)
from app.models.content import Content
from app.models.content_taxonomy import ContentSection
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


# Request/Response Models


class SeedKidsContentRequest(BaseModel):
    """Request for seeding kids content."""

    age_max: Optional[int] = Field(
        default=None, description="Maximum age rating to seed"
    )
    categories: Optional[List[str]] = Field(
        default=None, description="Category keys to seed"
    )


class ImportArchiveRequest(BaseModel):
    """Request for importing public domain content."""

    verify_availability: bool = Field(
        default=True, description="Verify each item is accessible"
    )
    age_max: Optional[int] = Field(
        default=None, description="Maximum age rating to import"
    )
    categories: Optional[List[str]] = Field(
        default=None, description="Category keys to import"
    )


class SyncPodcastsRequest(BaseModel):
    """Request for syncing kids podcasts."""

    pass


class SyncYouTubeRequest(BaseModel):
    """Request for syncing YouTube channels."""

    max_videos_per_channel: int = Field(default=20, ge=1, le=50)


class CurateContentRequest(BaseModel):
    """Request for curating kids content."""

    is_kids_content: Optional[bool] = None
    age_rating: Optional[int] = Field(default=None, ge=3, le=18)
    content_rating: Optional[str] = None
    educational_tags: Optional[List[str]] = None
    kids_moderation_status: Optional[str] = None


class TagVodRequest(BaseModel):
    """Request for tagging VOD as kids content."""

    category_id: Optional[str] = None
    limit: Optional[int] = Field(default=100, ge=1, le=1000)
    dry_run: bool = True


# Routes


@router.post("/kids/seed")
async def seed_kids_content(
    data: SeedKidsContentRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Run initial kids content seeder.

    Seeds curated kids content from hardcoded data including:
    - Hebrew learning videos
    - Jewish educational content
    - General kids entertainment
    """
    from app.services.kids_content_seeder import kids_content_seeder

    try:
        result = await kids_content_seeder.seed_content(
            age_max=data.age_max,
            categories=data.categories,
        )

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.CREATE,
            resource_type="kids_content",
            details={
                "operation": "seed",
                "seeded": result.get("seeded", 0),
                "skipped": result.get("skipped", 0),
            },
            request=request,
        )

        return result

    except Exception as e:
        logger.error(f"Error seeding kids content: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kids/import/archive")
async def import_archive_content(
    data: ImportArchiveRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Import public domain kids content from Archive.org.

    Imports curated classic cartoons, educational films, and fairy tales
    that are in the public domain.
    """
    from app.services.kids_public_domain_importer import \
        kids_public_domain_importer

    try:
        result = await kids_public_domain_importer.import_curated_content(
            verify_availability=data.verify_availability,
            age_max=data.age_max,
            categories=data.categories,
        )

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.CREATE,
            resource_type="kids_content",
            details={
                "operation": "archive_import",
                "imported": result.get("imported", 0),
            },
            request=request,
        )

        return result

    except Exception as e:
        logger.error(f"Error importing archive content: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kids/import/podcasts")
async def sync_kids_podcasts(
    data: SyncPodcastsRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Sync kids podcast feeds.

    Fetches episodes from configured kids podcast RSS feeds including:
    - Story Pirates
    - Brains On!
    - Hebrew story podcasts
    - Jewish educational podcasts
    """
    from app.services.kids_podcast_service import kids_podcast_service

    try:
        result = await kids_podcast_service.sync_all_kids_podcasts()

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.CREATE,
            resource_type="kids_content",
            details={
                "operation": "podcast_sync",
                "podcasts_created": result.get("podcasts_created", 0),
                "episodes_created": result.get("episodes_created", 0),
            },
            request=request,
        )

        return result

    except Exception as e:
        logger.error(f"Error syncing podcasts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kids/import/youtube")
async def sync_youtube_channels(
    data: SyncYouTubeRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Sync kids content from YouTube channels.

    Imports videos from configured kids YouTube channels using the
    YouTube Data API v3. Requires YOUTUBE_API_KEY to be configured.

    Target channels include:
    - Hebrew: HOP! Kids, Kan Kids
    - Jewish: Chabad Kids, Torah Live
    - Educational: Numberblocks, StoryBots
    """
    from app.services.youtube_kids_service import youtube_kids_service

    try:
        result = await youtube_kids_service.sync_all_channels(
            max_videos_per_channel=data.max_videos_per_channel,
        )

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.CREATE,
            resource_type="kids_content",
            details={
                "operation": "youtube_sync",
                "imported": result.get("total_imported", 0),
            },
            request=request,
        )

        return result

    except Exception as e:
        logger.error(f"Error syncing YouTube: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/kids/curate/{content_id}")
async def curate_content(
    content_id: str,
    data: CurateContentRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """
    Curate a specific content item for kids section.

    Allows setting:
    - is_kids_content: Enable/disable kids section visibility
    - age_rating: Minimum age (3, 5, 7, 10, 12)
    - content_rating: G, PG, etc.
    - educational_tags: Subject tags
    - kids_moderation_status: pending, approved, rejected
    """
    content = await Content.get(content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # Store before state for audit
    before_state = {
        "is_kids_content": content.is_kids_content,
        "age_rating": content.age_rating,
        "content_rating": content.content_rating,
        "educational_tags": content.educational_tags,
    }

    # Apply updates
    if data.is_kids_content is not None:
        content.is_kids_content = data.is_kids_content
    if data.age_rating is not None:
        content.age_rating = data.age_rating
    if data.content_rating is not None:
        content.content_rating = data.content_rating
    if data.educational_tags is not None:
        content.educational_tags = data.educational_tags

    content.updated_at = datetime.utcnow()
    await content.save()

    await log_audit(
        user_id=str(current_user.id),
        action=AuditAction.UPDATE,
        resource_type="kids_content",
        resource_id=content_id,
        details={
            "operation": "curate",
            "before": before_state,
            "after": {
                "is_kids_content": content.is_kids_content,
                "age_rating": content.age_rating,
                "content_rating": content.content_rating,
                "educational_tags": content.educational_tags,
            },
        },
        request=request,
    )

    return {
        "message": "Content curated successfully",
        "content_id": content_id,
        "is_kids_content": content.is_kids_content,
        "age_rating": content.age_rating,
    }


@router.post("/kids/tag-vod")
async def tag_existing_vod(
    data: TagVodRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """
    Tag existing VOD content as kids content.

    Reviews the VOD library and tags family-friendly content with:
    - is_kids_content: true
    - age_rating: Based on content rating
    - educational_tags: Based on metadata analysis
    """
    from scripts.content.tag_kids_vod import tag_kids_vod_content

    try:
        result = await tag_kids_vod_content(
            category_id=data.category_id,
            dry_run=data.dry_run,
            limit=data.limit,
        )

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.UPDATE,
            resource_type="kids_content",
            details={
                "operation": "tag_vod",
                "dry_run": data.dry_run,
                "tagged": result.get("tagged", 0),
            },
            request=request,
        )

        return result

    except Exception as e:
        logger.error(f"Error tagging VOD: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kids/stats")
async def get_kids_content_stats(
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """
    Get statistics about kids content.

    Returns counts by category, age rating, and overall health.
    """
    from app.services.kids_content_seeder import kids_content_seeder
    from app.services.kids_podcast_service import kids_podcast_service

    seeder_stats = await kids_content_seeder.get_seeding_stats()
    podcast_stats = await kids_podcast_service.get_kids_podcast_stats()

    # Get moderation stats
    pending_moderation = await Content.find(
        {
            "is_kids_content": True,
            "kids_moderation_status": "pending",
        }
    ).count()

    approved_content = await Content.find(
        {
            "is_kids_content": True,
            "kids_moderation_status": "approved",
        }
    ).count()

    return {
        "content_stats": seeder_stats,
        "podcast_stats": podcast_stats,
        "moderation": {
            "pending_review": pending_moderation,
            "approved": approved_content,
        },
    }


@router.delete("/kids/clear")
async def clear_kids_content(
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_DELETE)),
):
    """
    Clear all seeded kids content.

    WARNING: This removes all content marked as is_kids_content=True.
    Use with caution.
    """
    from app.services.kids_content_seeder import kids_content_seeder

    try:
        result = await kids_content_seeder.clear_kids_content()

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.DELETE,
            resource_type="kids_content",
            details={
                "operation": "clear_all",
                "deleted": result.get("deleted", 0),
            },
            request=request,
        )

        return result

    except Exception as e:
        logger.error(f"Error clearing kids content: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kids/pending-moderation")
async def get_pending_moderation(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """
    Get kids content pending moderation review.
    """
    skip = (page - 1) * page_size

    content = (
        await Content.find(
            {
                "is_kids_content": True,
                "$or": [
                    {"kids_moderation_status": "pending"},
                    {"kids_moderation_status": None},
                ],
            }
        )
        .skip(skip)
        .limit(page_size)
        .to_list()
    )

    total = await Content.find(
        {
            "is_kids_content": True,
            "$or": [
                {"kids_moderation_status": "pending"},
                {"kids_moderation_status": None},
            ],
        }
    ).count()

    return {
        "items": [
            {
                "id": str(c.id),
                "title": c.title,
                "title_en": c.title_en,
                "category_name": c.category_name,
                "age_rating": c.age_rating,
                "content_rating": c.content_rating,
                "educational_tags": c.educational_tags,
                "thumbnail": c.thumbnail,
            }
            for c in content
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }
