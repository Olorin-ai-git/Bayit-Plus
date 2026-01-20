"""
Admin Youngsters Content Routes

Endpoints for managing youngsters content (ages 12-17):
- Seed initial youngsters content
- Import from Archive.org public domain (PG-13)
- Sync youngsters podcasts
- Sync YouTube channels (teen channels)
- Curate and moderate content
- PG-13 content rating enforcement
"""

import logging
from datetime import datetime
from typing import List, Optional

from app.api.routes.admin_content_utils import (
    AuditAction,
    Permission,
    has_permission,
    log_audit,
)
from app.models.content import Content
from app.models.content_taxonomy import ContentSection
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()


# Request/Response Models


class SeedYoungstersContentRequest(BaseModel):
    """Request for seeding youngsters content."""

    age_max: Optional[int] = Field(
        default=None, ge=12, le=17, description="Maximum age rating to seed"
    )
    categories: Optional[List[str]] = Field(
        default=None, description="Category keys to seed"
    )
    clear_existing: bool = Field(
        default=False, description="Clear existing youngsters content before seeding"
    )


class ImportArchiveRequest(BaseModel):
    """Request for importing public domain content (PG-13 and below)."""

    verify_availability: bool = Field(
        default=True, description="Verify each item is accessible"
    )
    age_max: Optional[int] = Field(
        default=None, ge=12, le=17, description="Maximum age rating to import"
    )
    categories: Optional[List[str]] = Field(
        default=None, description="Category keys to import"
    )


class SyncPodcastsRequest(BaseModel):
    """Request for syncing youngsters podcasts."""

    pass


class SyncYouTubeRequest(BaseModel):
    """Request for syncing YouTube channels."""

    max_videos_per_channel: int = Field(default=20, ge=1, le=50)


class CurateContentRequest(BaseModel):
    """Request for curating youngsters content."""

    is_youngsters_content: Optional[bool] = None
    youngsters_age_rating: Optional[int] = Field(default=None, ge=12, le=17)
    content_rating: Optional[str] = None  # Must be PG-13 or below
    youngsters_educational_tags: Optional[List[str]] = None
    youngsters_moderation_status: Optional[str] = None


class TagVodRequest(BaseModel):
    """Request for tagging VOD as youngsters content."""

    category_id: Optional[str] = None
    limit: Optional[int] = Field(default=100, ge=1, le=1000)
    dry_run: bool = True


# Routes


@router.post("/youngsters/seed")
async def seed_youngsters_content(
    data: SeedYoungstersContentRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Run initial youngsters content seeder.

    Seeds curated youngsters content from hardcoded data including:
    - Educational content (study help, career prep)
    - Bar/Bat Mitzvah preparation
    - Teen news and trending content
    - Technology (coding, gaming, gadgets)
    - PG-13 entertainment

    All content is filtered to PG-13 rating or below.
    """
    from app.services.youngsters_content_seeder import YoungstersContentSeeder

    try:
        seeder = YoungstersContentSeeder()
        result = await seeder.seed_content(
            clear_existing=data.clear_existing,
            categories=data.categories,
        )

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.CREATE,
            resource_type="youngsters_content",
            details={
                "operation": "seed",
                "created": result.get("created", 0),
                "updated": result.get("updated", 0),
                "skipped": result.get("skipped", 0),
                "errors": result.get("errors", 0),
            },
            request=request,
        )

        return result

    except Exception as e:
        logger.error(f"Error seeding youngsters content: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/youngsters/import/archive")
async def import_archive_content(
    data: ImportArchiveRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Import public domain youngsters content from Archive.org.

    Imports curated PG-13 content including:
    - Classic teen movies and documentaries
    - Educational films
    - Historical content
    - Science and nature documentaries

    Content is filtered to ensure PG-13 rating or below.
    """
    # NOTE: This service needs to be created following the kids pattern
    # from app.services.youngsters_public_domain_importer import youngsters_public_domain_importer

    try:
        # Placeholder - implement youngsters_public_domain_importer service
        result = {
            "status": "not_implemented",
            "message": "Archive.org import for youngsters content not yet implemented",
            "imported": 0,
        }

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.CREATE,
            resource_type="youngsters_content",
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


@router.post("/youngsters/import/podcasts")
async def sync_youngsters_podcasts(
    data: SyncPodcastsRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Sync youngsters podcast feeds.

    Fetches episodes from configured youngsters podcast RSS feeds including:
    - Kan Noar (Israeli teen radio)
    - Teen Torah podcasts (Chabad, Aish)
    - Educational podcasts
    - Career guidance podcasts
    - Science and tech podcasts
    """
    # NOTE: This service needs to be created following the kids pattern
    # from app.services.youngsters_podcast_service import youngsters_podcast_service

    try:
        # Placeholder - implement youngsters_podcast_service
        result = {
            "status": "not_implemented",
            "message": "Podcast sync for youngsters content not yet implemented",
            "podcasts_created": 0,
            "episodes_created": 0,
        }

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.CREATE,
            resource_type="youngsters_content",
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


@router.post("/youngsters/import/youtube")
async def sync_youtube_channels(
    data: SyncYouTubeRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Sync youngsters content from YouTube channels.

    Imports videos from configured youngsters YouTube channels using the
    YouTube Data API v3. Requires YOUTUBE_API_KEY to be configured.

    Target channels include:
    - Hebrew: Kan Noar, teen educational channels
    - Jewish: Teen Torah classes, Bar/Bat Mitzvah prep
    - Educational: CrashCourse, Khan Academy
    - Tech: Coding tutorials, gadget reviews
    - Culture: Israeli teen content creators

    All content is verified for PG-13 rating or below.
    """
    # NOTE: This service needs to be created following the kids pattern
    # from app.services.youtube_youngsters_service import youtube_youngsters_service

    try:
        # Placeholder - implement youtube_youngsters_service
        result = {
            "status": "not_implemented",
            "message": "YouTube sync for youngsters content not yet implemented",
            "total_imported": 0,
        }

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.CREATE,
            resource_type="youngsters_content",
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


@router.patch("/youngsters/curate/{content_id}")
async def curate_content(
    content_id: str,
    data: CurateContentRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """
    Curate a specific content item for youngsters section.

    Allows setting:
    - is_youngsters_content: Enable/disable youngsters section visibility
    - youngsters_age_rating: Age rating (12, 13, 14, 15, 16, 17)
    - content_rating: Must be PG-13 or below (G, PG, PG-13, TV-G, TV-PG, TV-14)
    - youngsters_educational_tags: Subject tags
    - youngsters_moderation_status: pending, approved, rejected

    PG-13 Enforcement: Content rated R, NC-17, or TV-MA will be rejected.
    """
    ALLOWED_RATINGS = ["G", "PG", "PG-13", "TV-G", "TV-PG", "TV-14"]

    content = await Content.get(content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # Validate PG-13 compliance
    if data.content_rating and data.content_rating not in ALLOWED_RATINGS:
        raise HTTPException(
            status_code=400,
            detail=f"Content rating must be PG-13 or below. Allowed: {', '.join(ALLOWED_RATINGS)}",
        )

    # Store before state for audit
    before_state = {
        "is_youngsters_content": content.is_youngsters_content,
        "youngsters_age_rating": content.youngsters_age_rating,
        "content_rating": content.content_rating,
        "youngsters_educational_tags": content.youngsters_educational_tags,
    }

    # Apply updates
    if data.is_youngsters_content is not None:
        content.is_youngsters_content = data.is_youngsters_content
    if data.youngsters_age_rating is not None:
        content.youngsters_age_rating = data.youngsters_age_rating
    if data.content_rating is not None:
        content.content_rating = data.content_rating
    if data.youngsters_educational_tags is not None:
        content.youngsters_educational_tags = data.youngsters_educational_tags
    if data.youngsters_moderation_status is not None:
        content.youngsters_moderation_status = data.youngsters_moderation_status
        content.youngsters_moderated_by = str(current_user.id)
        content.youngsters_moderated_at = datetime.utcnow()

    content.updated_at = datetime.utcnow()
    await content.save()

    await log_audit(
        user_id=str(current_user.id),
        action=AuditAction.UPDATE,
        resource_type="youngsters_content",
        resource_id=content_id,
        details={
            "operation": "curate",
            "before": before_state,
            "after": {
                "is_youngsters_content": content.is_youngsters_content,
                "youngsters_age_rating": content.youngsters_age_rating,
                "content_rating": content.content_rating,
                "youngsters_educational_tags": content.youngsters_educational_tags,
            },
        },
        request=request,
    )

    return {
        "message": "Content curated successfully",
        "content_id": content_id,
        "is_youngsters_content": content.is_youngsters_content,
        "youngsters_age_rating": content.youngsters_age_rating,
        "content_rating": content.content_rating,
    }


@router.post("/youngsters/tag-vod")
async def tag_existing_vod(
    data: TagVodRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """
    Tag existing VOD content as youngsters content.

    Reviews the VOD library and tags teen-appropriate content with:
    - is_youngsters_content: true
    - youngsters_age_rating: Based on content rating (12-17)
    - youngsters_educational_tags: Based on metadata analysis

    Filters:
    - Excludes kids content (is_kids_content=true)
    - Excludes mature content (R, NC-17, TV-MA)
    - Only includes PG-13 and below
    - Focuses on teen-appropriate genres
    """
    # NOTE: This script needs to be created in scripts/content/tag_youngsters_vod.py
    # from scripts.content.tag_youngsters_vod import tag_youngsters_vod_content

    try:
        # Placeholder - implement tag_youngsters_vod script
        result = {
            "status": "not_implemented",
            "message": "VOD tagging for youngsters content not yet implemented",
            "dry_run": data.dry_run,
            "tagged": 0,
            "skipped": 0,
        }

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.UPDATE,
            resource_type="youngsters_content",
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


@router.get("/youngsters/stats")
async def get_youngsters_content_stats(
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """
    Get statistics about youngsters content.

    Returns counts by category, age rating, and overall health.
    """
    from app.services.youngsters_content_seeder import YoungstersContentSeeder

    seeder = YoungstersContentSeeder()
    seeder_stats = await seeder.get_seeding_stats()

    # Get moderation stats
    pending_moderation = await Content.find(
        {
            "is_youngsters_content": True,
            "youngsters_moderation_status": "pending",
        }
    ).count()

    approved_content = await Content.find(
        {
            "is_youngsters_content": True,
            "youngsters_moderation_status": "approved",
        }
    ).count()

    # Get content by age rating
    age_rating_distribution = {}
    for age in [12, 13, 14, 15, 16, 17]:
        count = await Content.find(
            {
                "is_youngsters_content": True,
                "youngsters_age_rating": age,
            }
        ).count()
        if count > 0:
            age_rating_distribution[age] = count

    # Get content by rating (PG-13 compliance check)
    content_rating_distribution = {}
    for rating in ["G", "PG", "PG-13", "TV-G", "TV-PG", "TV-14"]:
        count = await Content.find(
            {
                "is_youngsters_content": True,
                "content_rating": rating,
            }
        ).count()
        if count > 0:
            content_rating_distribution[rating] = count

    return {
        "content_stats": seeder_stats,
        "moderation": {
            "pending_review": pending_moderation,
            "approved": approved_content,
        },
        "age_rating_distribution": age_rating_distribution,
        "content_rating_distribution": content_rating_distribution,
    }


@router.delete("/youngsters/clear")
async def clear_youngsters_content(
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_DELETE)),
):
    """
    Clear all seeded youngsters content.

    WARNING: This removes all content marked as is_youngsters_content=True.
    Use with caution.
    """
    from app.services.youngsters_content_seeder import YoungstersContentSeeder

    try:
        seeder = YoungstersContentSeeder()
        result = await seeder.clear_youngsters_content()

        await log_audit(
            user_id=str(current_user.id),
            action=AuditAction.DELETE,
            resource_type="youngsters_content",
            details={
                "operation": "clear_all",
                "deleted": result.get("deleted_count", 0),
            },
            request=request,
        )

        return result

    except Exception as e:
        logger.error(f"Error clearing youngsters content: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/youngsters/pending-moderation")
async def get_pending_moderation(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """
    Get youngsters content pending moderation review.

    Returns teen content that needs manual review for:
    - Age appropriateness (12-17)
    - PG-13 rating compliance
    - Educational value assessment
    """
    skip = (page - 1) * page_size

    content = (
        await Content.find(
            {
                "is_youngsters_content": True,
                "$or": [
                    {"youngsters_moderation_status": "pending"},
                    {"youngsters_moderation_status": None},
                ],
            }
        )
        .skip(skip)
        .limit(page_size)
        .to_list()
    )

    total = await Content.find(
        {
            "is_youngsters_content": True,
            "$or": [
                {"youngsters_moderation_status": "pending"},
                {"youngsters_moderation_status": None},
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
                "youngsters_age_rating": c.youngsters_age_rating,
                "content_rating": c.content_rating,
                "youngsters_educational_tags": c.youngsters_educational_tags or [],
                "thumbnail": c.thumbnail,
            }
            for c in content
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }
