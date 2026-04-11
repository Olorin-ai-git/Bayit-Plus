"""Character portrait management — upload, preset gallery, face validation.

Three portrait source paths:

1. **Auto-detect from video** — driven by the face_extraction pipeline stage
   (ingest_orchestrator / face_extraction.py). Not handled here.
2. **Upload custom portrait** — admin uploads a JPG/PNG/WebP. This handler
   validates the bytes, runs YuNet face detection to ensure the image
   contains a single usable face, transcodes to JPEG, uploads to GCS,
   and updates the character record.
3. **Choose from preset avatar gallery** — admin picks a curated stock
   avatar by its manifest id. Handler resolves the static URL and a
   gender-matched ElevenLabs voice, writes both to the character, and
   marks the face_extraction subtask resolved.

Admin-only. 5 MB hard cap on uploaded images enforced via streaming
read. png/jpeg/webp content types accepted; everything is transcoded to
JPEG before GCS upload. Preset selection requires zero upload — just a
JSON body with ``preset_id``.
"""

import logging
from typing import Iterable, Optional

import cv2
import numpy as np
from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import (
    APIRouter, Depends, File, Form, HTTPException, UploadFile, status,
)

from app.api.routes.training.dependencies import (
    get_current_training_user,
    require_training_admin,
)
from app.core.storage import storage_service
from app.models.content import Content
from app.models.ingest_job import IngestJob
from app.models.pipeline_stage import StageName, StageStatus
from app.models.training_user import TrainingUser
from app.services.olorin.avatar_gallery import (
    avatar_static_url,
    get_avatar,
    list_avatars,
    resolve_voice_id,
)
from app.services.olorin.face_extraction import (
    FaceExtractionService,
    _sanitize_name,
)
from app.services.olorin.ingest_orchestrator import (
    MANUAL_PORTRAIT_UPLOAD_MARKER,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["training-portraits"])

# Minimum acceptable face crop dimensions (width/height in pixels).
# Portraits below this threshold are too small for training platform
# thumbnails and interactive moment overlays.
MIN_FACE_CROP_PX = 100


# -----------------------------------------------------------------------
# Preset avatar gallery endpoint
# -----------------------------------------------------------------------

@router.get("/avatars/presets")
async def list_preset_avatars(
    user: TrainingUser = Depends(get_current_training_user),
):
    """Return the curated avatar gallery for character portrait selection."""
    return {
        "avatars": [
            {
                "id": a["id"],
                "url": avatar_static_url(a),
                "gender": a["gender"],
                "name_key": a["name_key"],
            }
            for a in list_avatars()
        ],
    }


# -----------------------------------------------------------------------
# Face validation helper
# -----------------------------------------------------------------------

def _validate_face_in_image(jpeg_blob: bytes) -> None:
    """Run YuNet on a JPEG blob and reject non-face / multi-face / tiny-face.

    Raises HTTPException(422) with a machine-readable ``code`` field so
    the frontend can map to the right i18n key.
    """
    arr = np.frombuffer(jpeg_blob, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_image", "message": "Image could not be decoded"},
        )
    h, w = img.shape[:2]

    try:
        svc = FaceExtractionService.__new__(FaceExtractionService)
        svc._model_path = FaceExtractionService._get_detector  # trigger lazy init
        # Build a fresh detector sized to the uploaded image
        from app.services.olorin.face_extraction import DEFAULT_MODEL_PATH
        detector = cv2.FaceDetectorYN.create(
            model=str(DEFAULT_MODEL_PATH),
            config="",
            input_size=(w, h),
            score_threshold=0.6,
            nms_threshold=0.3,
            top_k=5000,
        )
    except Exception:
        logger.warning("YuNet model load failed; skipping face validation")
        return

    _, faces = detector.detect(img)
    if faces is None or len(faces) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "no_face_detected",
                "message": "No face detected in the uploaded image. "
                "Please upload a clear headshot portrait.",
            },
        )
    if len(faces) > 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "multiple_faces",
                "message": "Multiple faces detected. Please upload a "
                "single-person portrait.",
            },
        )
    # Check face crop size
    fx, fy, fw, fh = (
        float(faces[0][0]), float(faces[0][1]),
        float(faces[0][2]), float(faces[0][3]),
    )
    if fw < MIN_FACE_CROP_PX or fh < MIN_FACE_CROP_PX:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "face_too_small",
                "message": (
                    f"Detected face is too small ({int(fw)}x{int(fh)}px). "
                    f"Minimum {MIN_FACE_CROP_PX}x{MIN_FACE_CROP_PX}px required."
                ),
            },
        )


# -----------------------------------------------------------------------
# Preset avatar application
# -----------------------------------------------------------------------

async def _apply_preset_portrait(
    content: Content,
    character,
    preset_id: str,
    content_id: str,
) -> dict:
    """Set a character's portrait to a preset gallery avatar."""
    avatar = get_avatar(preset_id)
    if avatar is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown preset avatar: {preset_id!r}",
        )
    character.frame_url = avatar_static_url(avatar)
    character.portrait_source = "preset_avatar"
    character.preset_avatar_id = preset_id
    # Loose voice pairing: only set voice_id if empty or already a preset
    voice_id = resolve_voice_id(avatar)
    if voice_id and (not character.voice_id or character.preset_avatar_id):
        character.voice_id = voice_id
    character.gender = avatar["gender"]
    await content.save()

    await _resolve_face_extraction_subtask(content_id, character.name)

    return {
        "frame_url": character.frame_url,
        "character_name": character.name,
        "portrait_source": "preset_avatar",
        "preset_avatar_id": preset_id,
        "voice_id": character.voice_id,
    }


# -----------------------------------------------------------------------
# Shared upload + content lookup helpers (prefix: /content)
# -----------------------------------------------------------------------

_content_router = APIRouter(prefix="/content", tags=["training-portraits"])

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
    # If the subtask had no prior error (e.g. it was PENDING because
    # face_extraction never actually ran for this character), stamp
    # the canonical marker so the frontend "manually resolved" badge
    # still renders. This also helps the _run_face_extraction handler
    # recognize on a subsequent retry that the character was admin-
    # resolved and should be skipped.
    if subtask.error is None:
        subtask.error = MANUAL_PORTRAIT_UPLOAD_MARKER
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


@_content_router.post(
    "/{content_id}/characters/{character_name}/portrait",
    status_code=status.HTTP_200_OK,
)
async def set_character_portrait(
    content_id: str,
    character_name: str,
    portrait: Optional[UploadFile] = File(None),
    preset_id: Optional[str] = Form(None),
    admin: TrainingUser = Depends(require_training_admin),
):
    """Set a character portrait — upload a file OR pick a preset.

    Two mutually exclusive paths:

    - **Upload:** multipart ``portrait`` file → face validation → GCS.
    - **Preset:** form field ``preset_id`` → gallery lookup → static URL.

    Returns the resolved ``frame_url``, ``character_name``, and
    ``portrait_source`` in both cases.
    """
    if portrait and preset_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either portrait file or preset_id, not both",
        )
    if not portrait and not preset_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide portrait file or preset_id",
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
            detail=f"Character {character_name!r} not found on this content",
        )

    # --- Preset path ---
    if preset_id:
        return await _apply_preset_portrait(
            content, character, preset_id, content_id,
        )

    # --- Upload path ---
    if portrait.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported portrait content type: "
                f"{portrait.content_type!r}. "
                f"Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}"
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

    # Face validation — reject non-face images before spending GCS quota
    _validate_face_in_image(jpeg_blob)

    safe_name = _sanitize_name(character_name)
    remote_path = f"training-portraits/{content_id}/{safe_name}.jpg"
    portrait_url = await storage_service.upload_bytes(
        jpeg_blob, remote_path, "image/jpeg",
    )

    character.frame_url = portrait_url
    character.portrait_source = "custom_upload"
    character.preset_avatar_id = None
    await content.save()

    await _resolve_face_extraction_subtask(content_id, character_name)

    return {
        "frame_url": portrait_url,
        "character_name": character_name,
        "portrait_source": "custom_upload",
    }


# Include the content sub-router into the main portraits router
router.include_router(_content_router)
