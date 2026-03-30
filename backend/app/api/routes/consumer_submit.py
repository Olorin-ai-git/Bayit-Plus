"""
Consumer URL Submission Endpoints

POST /demo/submit-url — Submit a video URL for character extraction
GET  /demo/submissions/{job_id} — Poll extraction status
"""

from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.services.consumer_submission_service import (
    InvalidVideoUrl,
    SubmissionLimitReached,
    consumer_submission_service,
)

logger = get_logger(__name__)

router = APIRouter()


class SubmitUrlRequest(BaseModel):
    url: str = Field(..., min_length=10, max_length=2048)
    fingerprint: str = Field(..., min_length=8, max_length=128)
    email: Optional[str] = Field(None, max_length=254)


class SubmitUrlResponse(BaseModel):
    job_id: str
    status: str


class SubmissionStatusResponse(BaseModel):
    job_id: str
    status: str
    content_id: Optional[str] = None
    video_title: Optional[str] = None
    character_count: int = 0
    error: Optional[str] = None


@router.post(
    "/demo/submit-url",
    response_model=SubmitUrlResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["consumer-demo"],
    summary="Submit a video URL for character extraction",
)
@limiter.limit(RATE_LIMITS.get("consumer_demo_submit", "3/minute"))
async def submit_url(
    request: Request,
    body: SubmitUrlRequest,
    background_tasks: BackgroundTasks,
) -> SubmitUrlResponse:
    """Accept a video URL, start background extraction, return job_id."""
    try:
        submission = await consumer_submission_service.submit_url(
            url=body.url,
            fingerprint=body.fingerprint,
            email=body.email,
            max_submissions=settings.CONSUMER_DEMO_MAX_SUBMISSIONS,
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
                "Sign up for more."
            ),
        ) from exc

    background_tasks.add_task(
        consumer_submission_service.run_extraction, submission,
    )

    return SubmitUrlResponse(
        job_id=submission.job_id, status=submission.status,
    )


@router.get(
    "/demo/submissions/{job_id}",
    response_model=SubmissionStatusResponse,
    tags=["consumer-demo"],
    summary="Check URL submission extraction status",
)
@limiter.limit(RATE_LIMITS.get("consumer_demo_status", "30/minute"))
async def get_submission_status(
    request: Request,
    job_id: str,
) -> SubmissionStatusResponse:
    """Poll for extraction completion."""
    submission = await consumer_submission_service.get_by_job_id(job_id)
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
