"""
Star in Story Admin Routes.

Safety review queue, approve/reject episodes, and generation stats.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.story_episode import EpisodeStatus, StoryEpisode
from app.models.story_generation_job import StoryGenerationJob
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/star-story/admin", tags=["star-story-admin"])


class ReviewRequest(BaseModel):
    approved: bool
    reviewer_notes: str = Field(default="", max_length=500)


@router.get("/review-queue")
async def get_review_queue(
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
):
    """Get episodes pending human safety review."""
    episodes = await StoryEpisode.find(
        {"status": EpisodeStatus.REJECTED}
).sort(-StoryEpisode.created_at).limit(limit).to_list()

    return [
        {
            "episode_id": str(ep.id),
            "user_id": ep.user_id,
            "profile_id": ep.profile_id,
            "title": ep.title,
            "theme": ep.theme,
            "safety_score": ep.safety.overall_safety if ep.safety else None,
            "flagged_issues": (
                ep.safety.flagged_issues if ep.safety else []
            ),
            "created_at": ep.created_at.isoformat(),
        }
        for ep in episodes
    ]


@router.post("/review/{episode_id}")
async def review_episode(
    episode_id: str,
    request: ReviewRequest,
    user: User = Depends(get_current_user),
):
    """Approve or reject an episode after human review."""
    episode = await StoryEpisode.get(episode_id)
    if not episode:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Episode not found",
        )

    if episode.safety:
        episode.safety.reviewed_by_human = True
        episode.safety.reviewer_notes = request.reviewer_notes

    if request.approved:
        episode.status = EpisodeStatus.READY
        episode.error_message = None
    else:
        episode.status = EpisodeStatus.REJECTED
        episode.error_message = f"Rejected by reviewer: {request.reviewer_notes}"

    await episode.save()

    logger.info(
        "Episode reviewed",
        extra={
            "episode_id": episode_id,
            "approved": request.approved,
            "reviewer": str(user.id),
        },
    )
    return {
        "episode_id": episode_id,
        "status": episode.status.value,
        "approved": request.approved,
    }


@router.get("/stats")
async def get_generation_stats(
    user: User = Depends(get_current_user),
):
    """Get overall Star in Story generation statistics."""
    total = await StoryEpisode.find().count()
    ready = await StoryEpisode.find(
        {"status": EpisodeStatus.READY}
).count()
    failed = await StoryEpisode.find(
        {"status": EpisodeStatus.FAILED}
).count()
    rejected = await StoryEpisode.find(
        {"status": EpisodeStatus.REJECTED}
).count()
    in_progress = await StoryEpisode.find(
        {"status": {"$nin": [
            EpisodeStatus.READY.value,
            EpisodeStatus.FAILED.value,
            EpisodeStatus.REJECTED.value,
            EpisodeStatus.DELETED.value,
        ]}},
    ).count()

    return {
        "total_episodes": total,
        "ready": ready,
        "in_progress": in_progress,
        "failed": failed,
        "rejected": rejected,
    }
