"""Manual portrait upload — admin fallback for Task 5 face extraction.

The automated YuNet face-extraction stage (Task 5) sometimes fails to
find a usable face for a character — occluded faces, animated content,
low-resolution source video, or YuNet misdetections. This endpoint lets
a training admin upload a replacement portrait by hand, which:

1. Writes the image to GCS via the shared storage_service.
2. Updates Content.interactive_characters[name].frame_url.
3. If the latest IngestJob has a pending or failed face_extraction
   subtask for this character, marks it complete so the runner sees
   the manual resolution and the admin UI can drop the FAILED badge.

Admin-only. 5 MB limit. png/jpeg/webp only.
"""

import logging
from typing import Iterable

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.routes.training.dependencies import require_training_admin
from app.core.storage import storage_service
from app.models.content import Content
from app.models.ingest_job import IngestJob
from app.models.pipeline_stage import StageName, StageStatus
from app.models.training_user import TrainingUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/content", tags=["training-portraits"])

ALLOWED_CONTENT_TYPES: dict[str, str] = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}
MAX_PORTRAIT_BYTES = 5 * 1024 * 1024  # 5 MB


def _find_character(characters: Iterable, name: str):
    """Return the character entry matching `name`, or None.

    ``interactive_characters`` is a list of ContentCharacter pydantic
    models in production, but tests sometimes pass MagicMocks. Both
    expose a ``.name`` attribute.
    """
    for c in characters or []:
        if getattr(c, "name", None) == name:
            return c
    return None


@router.post(
    "/{content_id}/characters/{character_name}/portrait",
    status_code=status.HTTP_200_OK,
)
async def upload_character_portrait(
    content_id: str,
    character_name: str,
    portrait: UploadFile = File(...),
    admin: TrainingUser = Depends(require_training_admin),
):
    """Upload a manual portrait for one character.

    Returns the GCS URL where the portrait was stored and the character
    name for frontend confirmation.
    """
    if portrait.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported portrait content type: "
                f"{portrait.content_type!r}. "
                f"Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}"
            ),
        )

    try:
        content_oid = PydanticObjectId(content_id)
    except (InvalidId, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content not found",
        )

    content = await Content.get(content_oid)
    if not content or content.partner_id != admin.partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content not found",
        )

    character = _find_character(content.interactive_characters, character_name)
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Character {character_name!r} not found on this content"
            ),
        )

    blob = await portrait.read()
    if len(blob) > MAX_PORTRAIT_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Portrait too large "
                f"({len(blob)} bytes, max {MAX_PORTRAIT_BYTES})"
            ),
        )

    extension = ALLOWED_CONTENT_TYPES[portrait.content_type]
    safe_name = character_name.replace(" ", "_").replace("/", "_").lower()
    remote_path = (
        f"training-portraits/{content_id}/{safe_name}{extension}"
    )
    portrait_url = await storage_service.upload_bytes(
        blob, remote_path, portrait.content_type,
    )

    character.frame_url = portrait_url
    await content.save()

    # Resolve the corresponding face_extraction subtask if one exists so
    # the admin UI stops showing the FAILED badge and the runner sees
    # the manual intervention.
    job = await IngestJob.find_one(
        {"content_id": content_id}, sort=[("created_at", -1)],
    )
    if job is not None:
        stage = job.get_stage(StageName.FACE_EXTRACTION)
        if stage is not None and character_name in stage.subtasks:
            subtask = stage.subtasks[character_name]
            if subtask.status != StageStatus.COMPLETED:
                # start+complete so timestamps reflect the manual action
                stage.start_subtask(character_name)
                stage.complete_subtask(character_name)
                if (
                    stage.all_subtasks_complete()
                    and not stage.has_failed_subtasks()
                ):
                    stage.mark_completed()
                await job.save()
                logger.info(
                    "manual portrait upload resolved face_extraction subtask",
                    extra={
                        "content_id": content_id,
                        "character": character_name,
                        "job_id": job.job_id,
                    },
                )

    return {
        "frame_url": portrait_url,
        "character_name": character_name,
    }
