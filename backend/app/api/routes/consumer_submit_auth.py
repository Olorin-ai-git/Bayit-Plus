"""
Authenticated Consumer URL Submission Endpoints

POST /consumer/submit-url  — Submit a video URL for character extraction
GET  /consumer/submissions — List current user's submissions
GET  /consumer/submissions/{job_id} — Poll extraction status
"""

from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.consumer_submission_service import (
    InvalidVideoUrl,
    SubmissionLimitReached,
    consumer_submission_service,
)
from app.utils.priority_utils import should_process_immediately, tier_to_priority

logger = get_logger(__name__)

router = APIRouter()

_TIER_SUBMISSION_LIMITS = {
    "free": settings.CONSUMER_SUBMIT_LIMIT_FREE,
    "fan": settings.CONSUMER_SUBMIT_LIMIT_FAN,
    "superfan": settings.CONSUMER_SUBMIT_LIMIT_SUPERFAN,
}


class AuthSubmitUrlRequest(BaseModel):
    url: str = Field(..., min_length=10, max_length=2048)


class SubmitUrlResponse(BaseModel):
    job_id: str
    status: str
    priority: int
    queued: bool


class SubmissionStatusResponse(BaseModel):
    job_id: str
    status: str
    content_id: Optional[str] = None
    video_title: Optional[str] = None
    character_count: int = 0
    error: Optional[str] = None


class SubmissionListItem(BaseModel):
    job_id: str
    status: str
    url: str
    content_id: Optional[str] = None
    video_title: Optional[str] = None
    character_count: int = 0
    created_at: str


@router.post(
    "/consumer/submit-url",
    response_model=SubmitUrlResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["consumer"],
    summary="Submit a video URL for character extraction (authenticated)",
)
@limiter.limit(RATE_LIMITS.get("consumer_submit", "3/minute"))
async def submit_url(
    request: Request,
    body: AuthSubmitUrlRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
) -> SubmitUrlResponse:
    """Accept a video URL from an authenticated user, start extraction."""
    tier = current_user.olorin_tier or "free"
    priority = tier_to_priority(tier)
    max_submissions = _TIER_SUBMISSION_LIMITS.get(
        tier, settings.CONSUMER_SUBMIT_LIMIT_FREE,
    )

    try:
        submission = await consumer_submission_service.submit_url_for_user(
            url=body.url,
            user_id=str(current_user.id),
            email=current_user.email,
            max_submissions=max_submissions,
            priority=priority,
            source_tier=tier,
        )
    except InvalidVideoUrl as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.reason,
        ) from exc
    except SubmissionLimitReached as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Submission limit reached ({exc.current}/{exc.maximum}). "
                "Upgrade your plan for more submissions."
            ),
        ) from exc

    queued = True
    if should_process_immediately(tier):
        background_tasks.add_task(
            consumer_submission_service.run_extraction, submission,
        )
        queued = False

    logger.info(
        "Authenticated URL submission",
        extra={
            "job_id": submission.job_id,
            "user_id": str(current_user.id),
            "tier": tier,
            "priority": priority,
            "queued": queued,
        },
    )

    return SubmitUrlResponse(
        job_id=submission.job_id,
        status=submission.status,
        priority=priority,
        queued=queued,
    )


@router.get(
    "/consumer/submissions",
    response_model=List[SubmissionListItem],
    tags=["consumer"],
    summary="List current user's video submissions",
)
@limiter.limit(RATE_LIMITS.get("consumer_submissions_list", "30/minute"))
async def list_submissions(
    request: Request,
    current_user: User = Depends(get_current_active_user),
) -> List[SubmissionListItem]:
    """Return all submissions for the authenticated user."""
    submissions = await consumer_submission_service.get_user_submissions(
        user_id=str(current_user.id),
    )
    return [
        SubmissionListItem(
            job_id=s.job_id,
            status=s.status,
            url=s.url,
            content_id=s.content_id,
            video_title=s.video_title,
            character_count=s.character_count,
            created_at=s.created_at.isoformat(),
        )
        for s in submissions
    ]


@router.get(
    "/consumer/submissions/{job_id}",
    response_model=SubmissionStatusResponse,
    tags=["consumer"],
    summary="Check extraction status for a submission",
)
@limiter.limit(RATE_LIMITS.get("consumer_submission_status", "30/minute"))
async def get_submission_status(
    request: Request,
    job_id: str,
    current_user: User = Depends(get_current_active_user),
) -> SubmissionStatusResponse:
    """Poll for extraction completion (scoped to current user)."""
    submission = await consumer_submission_service.get_user_submission_by_job_id(
        job_id=job_id,
        user_id=str(current_user.id),
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )
    return SubmissionStatusResponse(
        job_id=submission.job_id,
        status=submission.status,
        content_id=submission.content_id,
        video_title=submission.video_title,
        character_count=submission.character_count,
        error=submission.error,
    )
