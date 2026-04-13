"""
Pause & Ask Job API

Unified async job endpoints for all portals (training, demo, B2B).
Replaces the three portal-specific synchronous pause-ask endpoints.
"""

import asyncio
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.api.dependencies.olorin_tier import is_demo_portal_request
from app.api.routes.olorin.dependencies import (
    get_current_partner,
    verify_capability,
)
from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_user
from app.models.integration_partner import IntegrationPartner
from app.models.pause_ask_job import (
    JobStatus,
    PauseAskJob,
    TERMINAL_STATUSES,
)
from app.models.user import User
from app.api.dependencies.training_context import (
    deduct_training_credits_if_applicable,
    get_training_partner_id,
)
from app.services import demo_usage_service
from app.services.beta.credit_service import credit_service
from app.services.vod_interaction.pause_ask_orchestrator import (
    pause_ask_orchestrator,
)

logger = get_logger(__name__)

router = APIRouter(
    prefix="/pause-ask",
    tags=["Pause & Ask Jobs"],
)


class SubmitJobRequest(BaseModel):
    """Request body to submit a Pause & Ask job."""

    content_id: str = Field(..., min_length=1)
    character: str = Field(..., min_length=1, max_length=200)
    question: str = Field(..., min_length=1, max_length=500)
    mode: str = Field(default="lip_sync", pattern="^(lip_sync|voice)$")
    language_hint: str = Field(default="", max_length=10)
    upgrade_for: Optional[str] = Field(
        default=None,
        description="Job ID of an earlier voice job this upgrades to lip-sync. "
        "Skips usage/credit gating since the original job already counted.",
    )


class SubmitJobResponse(BaseModel):
    """Response after submitting a job."""

    job_id: str
    status: str


class JobStatusResponse(BaseModel):
    """Response for job status polling."""

    job_id: str
    status: str
    stage: str
    progress_message: str
    result: Optional[dict] = None
    error: Optional[dict] = None


@router.post(
    "/jobs",
    response_model=SubmitJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
@limiter.limit(RATE_LIMITS.get("vod_interaction_pause_ask", "10/minute"))
async def submit_job(
    request: Request,
    body: SubmitJobRequest,
    current_user: User = Depends(get_current_user),
) -> SubmitJobResponse:
    """Submit a Pause & Ask job for async processing."""
    if not settings.VOD_INTERACTION_PAUSE_ASK_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pause & Ask feature is disabled",
        )

    # Training portal credit deduction (no-op for B2C users).
    # Skipped for upgrade jobs — the original voice job already deducted.
    if not body.upgrade_for:
        training_feature = (
            "pause_ask_lipsync" if body.mode == "lip_sync" else "pause_ask_voice"
        )
        await deduct_training_credits_if_applicable(
            current_user, training_feature,
        )

    # Credit / usage gating — three mutually exclusive paths:
    # 1. Training portal users: handled above via deduct_training_credits_if_applicable
    # 2. Demo portal users: per-feature usage caps via demo_usage_service
    # 3. B2C users: Beta credit system
    # Skipped entirely for upgrade jobs (lipsync upgrade of a prior voice job).
    is_training_user = get_training_partner_id(current_user) is not None
    is_demo = is_demo_portal_request(request)
    credit_amount = 0
    is_upgrade = bool(body.upgrade_for)

    if is_upgrade:
        # Validate the original job exists and belongs to this user
        original = await PauseAskJob.find_one({"job_id": body.upgrade_for})
        if not original or original.user_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid upgrade_for job reference",
            )
    elif is_demo and not is_training_user:
        allowed = await demo_usage_service.check_limit(
            str(current_user.id), "pause_ask",
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demo pause & ask limit reached",
            )
        await demo_usage_service.increment(str(current_user.id), "pause_ask")
    elif not is_training_user:
        is_lip_sync = body.mode == "lip_sync"
        credit_amount = (
            settings.CREDIT_RATE_VOD_PAUSE_ASK
            if is_lip_sync
            else settings.CREDIT_RATE_VOD_PAUSE_ASK_VOICE_ONLY
        )

        has_balance = await credit_service.has_sufficient_credits(
            user_id=str(current_user.id),
            amount=credit_amount,
        )
        if not has_balance:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Insufficient credits",
            )

        charged, _ = await credit_service.charge_credits(
            user_id=str(current_user.id),
            amount=credit_amount,
            reason="pause_ask_job_submit",
            metadata={"content_id": body.content_id, "mode": body.mode},
        )
        if not charged:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Credit deduction failed",
            )

    # Create job
    job_id = str(uuid.uuid4())
    job = PauseAskJob(
        job_id=job_id,
        content_id=body.content_id,
        character=body.character,
        question=body.question,
        mode=body.mode,
        language_hint=body.language_hint,
        portal="training" if is_training_user else ("demo" if is_demo else "consumer"),
        user_id=str(current_user.id),
        credits_charged=credit_amount,
    )
    await job.insert()

    # Spawn background task
    asyncio.create_task(
        pause_ask_orchestrator.run_job(job),
        name=f"pause-ask-job-{job_id}",
    )

    logger.info(
        "Pause & Ask job submitted",
        extra={"job_id": job_id, "user_id": str(current_user.id)},
    )

    return SubmitJobResponse(job_id=job_id, status="accepted")


@router.get(
    "/jobs/{job_id}",
    response_model=JobStatusResponse,
)
async def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
) -> JobStatusResponse:
    """Poll job status."""
    job = await PauseAskJob.find_one({"job_id": job_id})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    if job.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Job does not belong to this user",
        )

    response = JobStatusResponse(
        job_id=job.job_id,
        status=job.status.value,
        stage=job.stage,
        progress_message=job.progress_message,
    )

    if job.status in TERMINAL_STATUSES:
        if job.result:
            response.result = job.result.model_dump()
        if job.error:
            response.error = job.error.model_dump()

    return response


@router.post(
    "/jobs/{job_id}/retry",
    response_model=SubmitJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
@limiter.limit(RATE_LIMITS.get("vod_interaction_pause_ask", "10/minute"))
async def retry_job(
    request: Request,
    job_id: str,
    current_user: User = Depends(get_current_user),
) -> SubmitJobResponse:
    """Retry a failed job by creating a new one with the same parameters."""
    original = await PauseAskJob.find_one({"job_id": job_id})
    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    if original.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Job does not belong to this user",
        )
    if original.status not in TERMINAL_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Job is still running",
        )
    if original.error and not original.error.can_retry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job cannot be retried",
        )

    # Submit new job with same parameters
    body = SubmitJobRequest(
        content_id=original.content_id,
        character=original.character,
        question=original.question,
        mode=original.mode,
        language_hint=original.language_hint,
    )
    return await submit_job(request, body, current_user)


@router.post(
    "/jobs/b2b",
    response_model=SubmitJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
@limiter.limit(RATE_LIMITS.get("vod_interaction_pause_ask", "10/minute"))
async def submit_b2b_job(
    request: Request,
    body: SubmitJobRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> SubmitJobResponse:
    """Submit a B2B Pause & Ask job."""
    await verify_capability(partner, "pause_ask")

    job_id = str(uuid.uuid4())
    job = PauseAskJob(
        job_id=job_id,
        content_id=body.content_id,
        character=body.character,
        question=body.question,
        mode=body.mode,
        language_hint=body.language_hint,
        portal="b2b",
        user_id=f"partner:{partner.partner_id}",
        partner_id=partner.partner_id,
        credits_charged=0,
    )
    await job.insert()

    asyncio.create_task(
        pause_ask_orchestrator.run_job(job),
        name=f"pause-ask-job-{job_id}",
    )

    from app.services.olorin.metering_service import metering_service
    await metering_service.record_usage(
        partner_id=partner.partner_id,
        capability="pause_ask",
        metadata={"content_id": body.content_id, "job_id": job_id},
    )

    logger.info(
        "B2B Pause & Ask job submitted",
        extra={"job_id": job_id, "partner_id": partner.partner_id},
    )

    return SubmitJobResponse(job_id=job_id, status="accepted")


@router.get(
    "/jobs/b2b/{job_id}",
    response_model=JobStatusResponse,
)
async def get_b2b_job_status(
    job_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> JobStatusResponse:
    """Poll B2B job status."""
    job = await PauseAskJob.find_one({"job_id": job_id})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    if job.partner_id != partner.partner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Job does not belong to this partner",
        )

    response = JobStatusResponse(
        job_id=job.job_id,
        status=job.status.value,
        stage=job.stage,
        progress_message=job.progress_message,
    )
    if job.status in TERMINAL_STATUSES:
        if job.result:
            response.result = job.result.model_dump()
        if job.error:
            response.error = job.error.model_dump()
    return response
