"""
Submission Queue Processor

Cloud Scheduler-triggered endpoint that processes consumer URL submissions
in priority order. Protected by INTERNAL_CRON_API_KEY (HMAC).
"""

import hmac

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.consumer_submission import ConsumerSubmission
from app.services.consumer_submission_service import consumer_submission_service

logger = get_logger(__name__)

router = APIRouter()


class ProcessSubmissionsRequest(BaseModel):
    api_key: str = Field(..., min_length=1)
    batch_size: int = Field(default=1, ge=1, le=5)


class ProcessSubmissionsResponse(BaseModel):
    processed: int = 0
    skipped: int = 0
    pending: int = 0


def _verify_cron_key(provided: str) -> None:
    if not settings.INTERNAL_CRON_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Processor not configured",
        )
    if not hmac.compare_digest(provided, settings.INTERNAL_CRON_API_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )


@router.post(
    "/internal/process-submissions",
    response_model=ProcessSubmissionsResponse,
    tags=["internal"],
    summary="Process queued consumer submissions in priority order",
)
async def process_submissions(
    body: ProcessSubmissionsRequest,
) -> ProcessSubmissionsResponse:
    _verify_cron_key(body.api_key)

    pending_count = await ConsumerSubmission.find(
        ConsumerSubmission.status == "pending",
    ).count()

    if pending_count == 0:
        return ProcessSubmissionsResponse(pending=0)

    pending = await ConsumerSubmission.find(
        ConsumerSubmission.status == "pending",
    ).sort("+priority", "+created_at").limit(body.batch_size).to_list()

    processed = 0
    skipped = 0

    for submission in pending:
        fresh = await ConsumerSubmission.find_one(
            ConsumerSubmission.id == submission.id,
            ConsumerSubmission.status == "pending",
        )
        if not fresh:
            skipped += 1
            continue

        logger.info(
            "Queue processor: starting extraction",
            extra={
                "job_id": submission.job_id,
                "priority": submission.priority,
                "source_tier": submission.source_tier,
            },
        )
        await consumer_submission_service.run_extraction(fresh)
        processed += 1

    remaining = await ConsumerSubmission.find(
        ConsumerSubmission.status == "pending",
    ).count()

    return ProcessSubmissionsResponse(
        processed=processed,
        skipped=skipped,
        pending=remaining,
    )
