"""Discover character generation endpoints.

On-demand character extraction + voice cloning for Pause & Ask,
with free quota tracking and Beta 500 credit deduction.
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_active_user
from app.models.ai_generation_job import AIGenerationJob, JobStatus, JobType
from app.models.content import Content
from app.models.user import User

logger = get_logger(__name__)

router = APIRouter()


class CharacterGenerationStatusResponse(BaseModel):
    """Status of character generation quota."""

    free_remaining: int
    free_limit: int


class CharacterJobResponse(BaseModel):
    """Response for character generation request."""

    job_id: str
    status: str
    already_exists: bool = False


@router.get(
    "/character-generation-status",
    response_model=CharacterGenerationStatusResponse,
)
async def get_character_generation_status(
    current_user: User = Depends(get_current_active_user),
) -> CharacterGenerationStatusResponse:
    """Return how many free character generations the user has left."""
    used = current_user.character_generation_count
    limit = settings.CHARACTER_GENERATION_FREE_LIMIT
    return CharacterGenerationStatusResponse(
        free_remaining=max(0, limit - used),
        free_limit=limit,
    )


@router.post(
    "/generate-characters/{content_id}",
    response_model=CharacterJobResponse,
)
async def generate_characters(
    content_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
) -> CharacterJobResponse:
    """Trigger character extraction + voice cloning for a movie.

    Returns immediately if characters already exist.
    Otherwise creates a background job and returns its ID for polling.
    """
    content = await Content.get(content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    if content.interactive_characters:
        return CharacterJobResponse(
            job_id="", status="completed", already_exists=True
        )

    active = await AIGenerationJob.get_active_job(
        content_id, JobType.NIKUD
    )
    if active:
        return CharacterJobResponse(
            job_id=str(active.id), status=active.status.value
        )

    is_free = await _check_and_deduct_quota(current_user)
    if not is_free:
        logger.info(
            "character_generation_credit_deducted",
            extra={"user_id": str(current_user.id)},
        )

    job = await AIGenerationJob.create_job(
        content_id=content_id,
        job_type=JobType.NIKUD,
        total_cues=4,
        user_id=str(current_user.id),
    )

    background_tasks.add_task(
        _run_pipeline, str(job.id), content_id
    )

    return CharacterJobResponse(
        job_id=str(job.id), status=job.status.value
    )


async def _check_and_deduct_quota(user: User) -> bool:
    """Check free quota; deduct credit if exhausted. Returns True if free."""
    limit = settings.CHARACTER_GENERATION_FREE_LIMIT
    if user.character_generation_count < limit:
        user.character_generation_count += 1
        await user.save()
        return True

    from app.services.beta.credit_service import BetaCreditService
    from app.core.database import get_database
    from app.services.olorin.metering.service import MeteringService

    db = get_database()
    credit_svc = BetaCreditService(
        settings=settings,
        metering_service=MeteringService(settings),
        db=db,
    )
    authorized, _ = await credit_svc.authorize(
        str(user.id), "character_generation", 1.0
    )
    if not authorized:
        raise HTTPException(
            status_code=402,
            detail="No free generations remaining and insufficient credits",
        )
    success, _ = await credit_svc.deduct_credits(
        str(user.id),
        "character_generation",
        1.0,
        {"content_id": "discover_characters"},
    )
    if not success:
        raise HTTPException(status_code=402, detail="Credit deduction failed")
    return False


async def _run_pipeline(job_id: str, content_id: str) -> None:
    """Background task: extract characters then clone voices."""
    from bson import ObjectId
    job = await AIGenerationJob.get(ObjectId(job_id))
    if not job:
        return
    await job.start_processing()

    try:
        content = await Content.get(content_id)
        if not content:
            await job.fail("Content not found")
            return

        await job.update_progress(1)
        from app.services.vod_interaction.character_extractor import (
            CharacterExtractorService,
        )

        extractor = CharacterExtractorService()
        characters = await extractor.extract_characters(content)
        if not characters:
            await job.fail("No characters extracted")
            return

        await job.update_progress(2)
        content.interactive_characters = characters
        content.supports_avatar_interaction = True
        await content.save()

        await job.update_progress(3)
        from app.services.vod_interaction.voice_cloner import (
            CharacterVoiceClonerService,
        )

        cloner = CharacterVoiceClonerService()
        content = await Content.get(content_id)
        if content:
            await cloner.clone_character_voices(content)
        await job.update_progress(4)
        await job.complete()

        logger.info(
            "character_generation_complete",
            extra={
                "content_id": content_id,
                "character_count": str(len(characters)),
            },
        )
    except Exception as exc:
        logger.error(
            "character_generation_failed",
            extra={"content_id": content_id, "error": str(exc)},
        )
        await job.fail(str(exc))
