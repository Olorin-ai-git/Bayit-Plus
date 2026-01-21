"""
Admin Podcast Episode Management Routes
CRUD operations for podcast episodes
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.models.admin import AuditAction, Permission
from app.models.content import Podcast, PodcastEpisode
from app.models.user import User

from .admin_content_schemas import (PodcastEpisodeCreateRequest,
                                    PodcastEpisodeUpdateRequest)
from .admin_content_utils import has_permission, log_audit

router = APIRouter()


@router.get("/podcasts/{podcast_id}/episodes")
async def get_podcast_episodes(
    podcast_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, le=500),
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """Get episodes for a podcast."""
    podcast = await Podcast.get(podcast_id)
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")

    query = PodcastEpisode.find(PodcastEpisode.podcast_id == podcast_id)
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
    podcast.updated_at = datetime.utcnow()
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
        podcast.updated_at = datetime.utcnow()
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
    podcast.updated_at = datetime.utcnow()
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
