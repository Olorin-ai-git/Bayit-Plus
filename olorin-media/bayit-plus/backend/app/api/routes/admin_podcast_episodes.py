"""
Admin Podcast Episode Management Routes
CRUD operations for podcast episodes
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_user
from app.models.admin import AuditAction, Permission
from app.models.content import Podcast, PodcastEpisode
from app.models.user import User
from app.services.podcast_translation_worker import get_translation_worker

from .admin_content_schemas import (PodcastEpisodeCreateRequest,
                                    PodcastEpisodeUpdateRequest)
from .admin_content_utils import has_permission, log_audit

router = APIRouter()


@router.get("/podcasts/{podcast_id}/episodes")
async def get_podcast_episodes(
    podcast_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, le=500),
    translation_status: str = Query(default=None),
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """Get episodes for a podcast with optional translation status filter."""
    podcast = await Podcast.get(podcast_id)
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")

    # Build query with optional translation status filter
    query = PodcastEpisode.find(PodcastEpisode.podcast_id == podcast_id)
    if translation_status:
        query = query.find(PodcastEpisode.translation_status == translation_status)

    total = await query.count()
    skip = (page - 1) * page_size
    items = (
        await query.sort(-PodcastEpisode.published_at)
        .skip(skip)
        .limit(page_size)
        .to_list()
    )

    return {
        "items": [
            {
                "id": str(item.id),
                "podcast_id": item.podcast_id,
                "title": item.title,
                "description": item.description,
                "audio_url": item.audio_url,
                "duration": item.duration,
                "episode_number": item.episode_number,
                "season_number": item.season_number,
                "published_at": item.published_at.isoformat(),
                "thumbnail": item.thumbnail,
                "translation_status": item.translation_status,
                "available_languages": item.available_languages,
                "original_language": item.original_language,
                "retry_count": item.retry_count,
                "translation_progress": item.translation_progress,
                "translation_eta_seconds": item.translation_eta_seconds,
                "translation_started_at": item.translation_started_at.isoformat() if item.translation_started_at else None,
            }
            for item in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/podcasts/{podcast_id}/episodes")
async def create_podcast_episode(
    podcast_id: str,
    data: PodcastEpisodeCreateRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """Create new podcast episode."""
    podcast = await Podcast.get(podcast_id)
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")

    episode = PodcastEpisode(
        podcast_id=podcast_id,
        title=data.title,
        description=data.description,
        audio_url=data.audio_url,
        duration=data.duration,
        episode_number=data.episode_number,
        season_number=data.season_number,
        published_at=data.published_at,
        thumbnail=data.thumbnail,
    )
    await episode.insert()

    podcast.episode_count += 1
    podcast.latest_episode_date = data.published_at
    podcast.updated_at = datetime.now(timezone.utc)
    await podcast.save()

    await log_audit(
        str(current_user.id),
        AuditAction.PODCAST_EPISODE_CREATED,
        "podcast_episode",
        str(episode.id),
        {"podcast_id": podcast_id, "title": episode.title},
        request,
    )
    return {"id": str(episode.id), "title": episode.title, "podcast_id": podcast_id}


@router.patch("/podcasts/{podcast_id}/episodes/{episode_id}")
async def update_podcast_episode(
    podcast_id: str,
    episode_id: str,
    data: PodcastEpisodeUpdateRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """Update podcast episode fields."""
    podcast = await Podcast.get(podcast_id)
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")

    try:
        episode = await PodcastEpisode.get(episode_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Episode not found")

    if not episode or episode.podcast_id != podcast_id:
        raise HTTPException(status_code=404, detail="Episode not found")

    changes = {}
    if data.title is not None:
        changes["title"] = {"old": episode.title, "new": data.title}
        episode.title = data.title
    if data.description is not None:
        changes["description"] = {"old": episode.description, "new": data.description}
        episode.description = data.description
    if data.audio_url is not None:
        changes["audio_url"] = {"changed": True}
        episode.audio_url = data.audio_url
    if data.duration is not None:
        changes["duration"] = {"old": episode.duration, "new": data.duration}
        episode.duration = data.duration
    if data.episode_number is not None:
        changes["episode_number"] = {
            "old": episode.episode_number,
            "new": data.episode_number,
        }
        episode.episode_number = data.episode_number
    if data.season_number is not None:
        changes["season_number"] = {
            "old": episode.season_number,
            "new": data.season_number,
        }
        episode.season_number = data.season_number
    if data.published_at is not None:
        changes["published_at"] = {"changed": True}
        episode.published_at = data.published_at
        if (
            not podcast.latest_episode_date
            or episode.published_at > podcast.latest_episode_date
        ):
            podcast.latest_episode_date = episode.published_at
    if data.thumbnail is not None:
        changes["thumbnail"] = {"changed": True}
        episode.thumbnail = data.thumbnail

    await episode.save()
    if data.published_at is not None:
        podcast.updated_at = datetime.now(timezone.utc)
        await podcast.save()

    await log_audit(
        str(current_user.id),
        AuditAction.PODCAST_EPISODE_UPDATED,
        "podcast_episode",
        episode_id,
        changes,
        request,
    )
    return {"message": "Episode updated", "id": episode_id}


@router.delete("/podcasts/{podcast_id}/episodes/{episode_id}")
async def delete_podcast_episode(
    podcast_id: str,
    episode_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_DELETE)),
):
    """Delete podcast episode."""
    podcast = await Podcast.get(podcast_id)
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")

    try:
        episode = await PodcastEpisode.get(episode_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Episode not found")

    if not episode or episode.podcast_id != podcast_id:
        raise HTTPException(status_code=404, detail="Episode not found")

    podcast.episode_count = max(0, podcast.episode_count - 1)
    podcast.updated_at = datetime.now(timezone.utc)
    await podcast.save()

    await log_audit(
        str(current_user.id),
        AuditAction.PODCAST_EPISODE_DELETED,
        "podcast_episode",
        episode_id,
        {"podcast_id": podcast_id, "title": episode.title},
        request,
    )
    await episode.delete()
    return {"message": "Episode deleted"}


@router.post("/podcasts/{podcast_id}/episodes/{episode_id}/translate")
@limiter.limit(RATE_LIMITS.get("translation_single", "10/minute"))
async def trigger_translation(
    podcast_id: str,
    episode_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    Trigger translation for a specific episode.

    Available to all authenticated users (Beta users will be charged credits).
    Rate limited to 10 requests per minute to prevent abuse.
    """
    # Verify podcast exists
    podcast = await Podcast.get(podcast_id)
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")

    # Verify episode exists and belongs to podcast
    try:
        episode = await PodcastEpisode.get(episode_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Episode not found")

    if not episode or episode.podcast_id != podcast_id:
        raise HTTPException(status_code=404, detail="Episode not found")

    # Store requesting user for Beta credit tracking
    await PodcastEpisode.find_one({"_id": episode.id}).update(
        {"$set": {"requested_by_user_id": str(current_user.id)}}
    )

    # Get translation worker
    worker = get_translation_worker()
    if not worker:
        raise HTTPException(
            status_code=503,
            detail="Translation service not available. Check PODCAST_TRANSLATION_ENABLED configuration.",
        )

    # Queue episode for translation
    success = await worker.queue_episode(episode_id)

    # Audit logging
    await log_audit(
        str(current_user.id),
        AuditAction.PODCAST_EPISODE_UPDATED,
        "podcast_episode",
        episode_id,
        {"action": "translation_triggered", "podcast_id": podcast_id},
        request,
    )

    return {
        "status": "queued" if success else "already_queued",
        "episode_id": episode_id,
        "message": (
            "Episode queued for translation"
            if success
            else "Episode already queued or processing"
        ),
    }


@router.post("/podcasts/{podcast_id}/translate-all")
@limiter.limit(RATE_LIMITS.get("translation_bulk", "5/hour"))
async def trigger_bulk_translation(
    podcast_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """Trigger translation for all pending/failed episodes of a podcast. Rate limited to 5/hour."""
    # Verify podcast exists
    podcast = await Podcast.get(podcast_id)
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")

    # Get translation worker
    worker = get_translation_worker()
    if not worker:
        raise HTTPException(
            status_code=503,
            detail="Translation service not available. Check configuration.",
        )

    # Find all episodes with status = pending or failed (with retry_count < max_retries)
    episodes = await PodcastEpisode.find(
        PodcastEpisode.podcast_id == podcast_id,
        {
            "$or": [
                {"translation_status": "pending"},
                {"translation_status": "failed", "retry_count": {"$lt": 3}},
            ]
        },
    ).to_list()

    queued_count = 0
    for episode in episodes:
        success = await worker.queue_episode(str(episode.id))
        if success:
            queued_count += 1

    # Audit logging
    await log_audit(
        str(current_user.id),
        AuditAction.PODCAST_UPDATED,
        "podcast",
        podcast_id,
        {
            "action": "bulk_translation_triggered",
            "episodes_queued": queued_count,
            "total_eligible": len(episodes),
        },
        request,
    )

    return {
        "status": "queued",
        "podcast_id": podcast_id,
        "episodes_queued": queued_count,
        "total_eligible": len(episodes),
        "message": f"Queued {queued_count} episodes for translation",
    }


@router.get("/translation/status")
@limiter.limit(RATE_LIMITS.get("translation_status", "30/minute"))
async def get_translation_status(
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """Get overall translation status and queue size using aggregation."""
    # Single aggregation query for better performance
    pipeline = [{"$group": {"_id": "$translation_status", "count": {"$sum": 1}}}]

    results = await PodcastEpisode.aggregate(pipeline).to_list(length=None)
    status_map = {r["_id"]: r["count"] for r in results}

    return {
        "pending": status_map.get("pending", 0),
        "processing": status_map.get("processing", 0),
        "completed": status_map.get("completed", 0),
        "failed": status_map.get("failed", 0),
        "total": sum(status_map.values()),
    }


@router.get("/translation/failed")
@limiter.limit(RATE_LIMITS.get("translation_status", "30/minute"))
async def get_failed_translations(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """Get list of failed translation episodes for the dashboard."""
    query = PodcastEpisode.find(PodcastEpisode.translation_status == "failed")
    total = await query.count()
    skip = (page - 1) * page_size

    items = (
        await query.sort(-PodcastEpisode.updated_at)
        .skip(skip)
        .limit(page_size)
        .to_list()
    )

    # Get podcast titles for display
    podcast_ids = list(set(item.podcast_id for item in items))
    podcasts = await Podcast.find({"_id": {"$in": podcast_ids}}).to_list()
    podcast_map = {str(p.id): p.title for p in podcasts}

    return {
        "items": [
            {
                "id": str(item.id),
                "podcast_id": item.podcast_id,
                "podcast_title": podcast_map.get(item.podcast_id, "Unknown"),
                "title": item.title,
                "retry_count": item.retry_count,
                "max_retries": item.max_retries,
                "updated_at": item.updated_at.isoformat(),
            }
            for item in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/translation/retry-all-failed")
@limiter.limit("3/hour")  # Rate limit: 3 requests per hour to prevent abuse
async def retry_all_failed_translations(
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """
    Retry all failed translation episodes that haven't exceeded max retries.

    Rate limited to 3 requests per hour.
    Requires CONTENT_UPDATE permission.

    Returns:
        Summary of queued episodes, total failed, and skipped episodes with reasons.
    """
    # Find all failed episodes that can be retried
    failed_episodes = await PodcastEpisode.find(
        {
            "translation_status": "failed",
            "$expr": {"$lt": ["$retry_count", "$max_retries"]},
        }
    ).to_list()

    # Skip episodes already being processed
    eligible_episodes = [
        ep for ep in failed_episodes if ep.translation_status != "processing"
    ]

    # Episodes that will be skipped with reasons
    skipped = []
    total_failed = len(failed_episodes)

    for episode in failed_episodes:
        if episode.retry_count >= episode.max_retries:
            skipped.append({
                "episode_id": str(episode.id),
                "podcast_id": episode.podcast_id,
                "title": episode.title,
                "reason": "max_retries_exceeded",
                "retry_count": episode.retry_count,
                "max_retries": episode.max_retries,
            })
        elif episode.translation_status == "processing":
            skipped.append({
                "episode_id": str(episode.id),
                "podcast_id": episode.podcast_id,
                "title": episode.title,
                "reason": "already_processing",
            })

    # Queue eligible episodes for translation
    worker = get_translation_worker()
    queued_count = 0

    for episode in eligible_episodes:
        try:
            # Queue the episode (worker will pick it up)
            await PodcastEpisode.find_one({"_id": episode.id}).update(
                {"$set": {"translation_status": "pending"}}
            )
            # Add to worker queue
            await worker.queue_episode(str(episode.id))
            queued_count += 1
        except Exception as e:
            skipped.append({
                "episode_id": str(episode.id),
                "podcast_id": episode.podcast_id,
                "title": episode.title,
                "reason": f"queue_error: {str(e)}",
            })

    # Log audit action
    await log_audit(
        user=current_user,
        action=AuditAction.UPDATE,
        resource_type="podcast_translation",
        resource_id="bulk",
        details={
            "episodes_queued": queued_count,
            "total_failed": total_failed,
            "skipped": len(skipped),
        },
    )

    return {
        "status": "queued",
        "episodes_queued": queued_count,
        "total_failed": total_failed,
        "skipped": len(skipped),
        "skipped_episodes": skipped,
        "message": f"Queued {queued_count} of {total_failed} failed episodes for translation retry",
    }
