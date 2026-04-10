"""Manual portrait upload — admin fallback for Task 5 face extraction.

The automated YuNet face-extraction stage (Task 5) sometimes fails to
find a usable face for a character — occluded faces, animated content,
low-resolution source video, or YuNet misdetections. This endpoint lets
a training admin upload a replacement portrait by hand, which:

1. Validates the upload (magic bytes + size, streamed) and normalizes
   it to JPEG so the GCS key matches Task 5's deterministic
   ``training-portraits/{content_id}/{safe_name}.jpg`` layout.
2. Uploads via the shared storage_service to keep auth/bucket config in
   one place.
3. Updates Content.interactive_characters[name].frame_url.
4. Marks the corresponding face_extraction subtask complete if one
   exists, preserving the original failure text as an audit trail so
   Task 12's admin UI can distinguish "manually resolved" from
   "auto-extracted" via (status == COMPLETED AND error is not None).

Admin-only. 5 MB hard cap enforced via streaming read. png/jpeg/webp
content types accepted on the wire; everything is transcoded to JPEG
before upload to prevent content-type spoofing attacks on the serving
CDN.
"""

import logging
from typing import Iterable

import cv2
import numpy as np
from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.routes.training.dependencies import require_training_admin
from app.core.storage import storage_service
from app.models.content import Content
from app.models.ingest_job import IngestJob
from app.models.pipeline_stage import StageName, StageStatus
from app.models.training_user import TrainingUser
from app.services.olorin.face_extraction import _sanitize_name

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/content", tags=["training-portraits"])

ALLOWED_CONTENT_TYPES = frozenset(
    {"image/png", "image/jpeg", "image/webp"}
)

# 5 MB hard cap on decoded bytes. Enforced via streaming read so a 1 GB
# upload cannot buffer in memory before we reject it.
MAX_PORTRAIT_BYTES = 5 * 1024 * 1024
# Chunk size for the streaming read loop.
UPLOAD_CHUNK_BYTES = 64 * 1024
# JPEG output quality for the transcoded portrait. Matches Task 5's
# cv2.imwrite default, which produces ~50-200 KB portraits at 1080p.
JPEG_QUALITY = 90


def _magic_bytes_match(content_type: str, head: bytes) -> bool:
    """Verify that the first 12 bytes of the upload match the declared
    Content-Type header. Guards against content-type spoofing where a
    client sends HTML / SVG with ``Content-Type: image/png`` so the
    bytes end up being served as script by a content-sniffing CDN.
    """
    if content_type == "image/png":
        return head.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/jpeg":
        return head.startswith(b"\xff\xd8\xff")
    if content_type == "image/webp":
        return len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WEBP"
    return False


async def _read_upload_streaming(portrait: UploadFile) -> bytes:
    """Read the upload body in fixed-size chunks, 413'ing past the cap.

    Raises HTTPException(413) the instant the cumulative size exceeds
    MAX_PORTRAIT_BYTES — before the oversized bytes are all in RAM.
    """
    buf = bytearray()
    while True:
        chunk = await portrait.read(UPLOAD_CHUNK_BYTES)
        if not chunk:
            break
        buf.extend(chunk)
        if len(buf) > MAX_PORTRAIT_BYTES:
            raise HTTPException(
                # 413 Content Too Large — raw int to avoid picking between
                # the deprecated REQUEST_ENTITY_TOO_LARGE and the newer
                # CONTENT_TOO_LARGE constant (Starlette version drift).
                status_code=413,
                detail=(
                    f"Portrait too large (max {MAX_PORTRAIT_BYTES} bytes)"
                ),
            )
    return bytes(buf)


def _transcode_to_jpeg(blob: bytes) -> bytes:
    """Decode any supported upload format and re-encode as JPEG.

    Task 5 writes ``{safe_name}.jpg`` as a hardcoded extension. Task 11
    normalizes manual uploads to the same extension so both paths land
    on the same GCS key — no orphans on retry, no format-hint drift
    visible to frontend consumers, and no trust placed in the client's
    content-type header (the bytes are verified by cv2 decode).
    """
    arr = np.frombuffer(blob, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Portrait bytes could not be decoded as an image",
        )
    ok, jpeg_bytes = cv2.imencode(
        ".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY],
    )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to transcode portrait to JPEG",
        )
    return jpeg_bytes.tobytes()


def _find_character(characters: Iterable, name: str):
    """Return the character entry matching ``name``, or None."""
    for c in characters or []:
        if getattr(c, "name", None) == name:
            return c
    return None


async def _resolve_face_extraction_subtask(
    content_id: str, character_name: str,
) -> None:
    """Mark the FACE_EXTRACTION subtask for this character complete.

    Called after a successful manual portrait upload so the admin UI
    drops the FAILED badge. Preserves the original error text on the
    subtask — the admin UI can detect "manually resolved" as
    (status == COMPLETED AND error is not None), which keeps the
    YuNet failure reason visible for forensics without a model change.

    No-op if there is no job, no face_extraction stage, or no subtask
    for this character name (e.g. character was added post-ingest).
    """
    job = await IngestJob.find_one(
        {"content_id": content_id}, sort=[("created_at", -1)],
    )
    if job is None:
        return
    stage = job.get_stage(StageName.FACE_EXTRACTION)
    if stage is None or character_name not in stage.subtasks:
        return
    subtask = stage.subtasks[character_name]
    if subtask.status == StageStatus.COMPLETED:
        return

    # Do NOT call start_subtask — it would wipe the error string and
    # destroy the audit trail of why YuNet failed. complete_subtask
    # only touches status + completed_at, leaving error intact.
    stage.complete_subtask(character_name)
    if stage.all_subtasks_complete():
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

    blob = await _read_upload_streaming(portrait)

    if not _magic_bytes_match(portrait.content_type, blob[:12]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Portrait bytes do not match declared content type "
                f"{portrait.content_type!r}"
            ),
        )

    jpeg_blob = _transcode_to_jpeg(blob)

    safe_name = _sanitize_name(character_name)
    remote_path = f"training-portraits/{content_id}/{safe_name}.jpg"
    portrait_url = await storage_service.upload_bytes(
        jpeg_blob, remote_path, "image/jpeg",
    )

    character.frame_url = portrait_url
    await content.save()

    await _resolve_face_extraction_subtask(content_id, character_name)

    return {
        "frame_url": portrait_url,
        "character_name": character_name,
    }
