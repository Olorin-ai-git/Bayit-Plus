"""
Olorin.ai Clip Share API

Generate shareable 15s clips from Pause & Ask exchanges with
"Powered by Olorin" watermark. Viral mechanic #1.
"""

import subprocess
import tempfile
import uuid
from pathlib import Path

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.api.routes.olorin.dependencies import get_current_partner
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.integration_partner import IntegrationPartner
from app.models.vod_interaction import VODInteractionSession
from app.services.olorin.storage_service import storage_service

logger = get_logger(__name__)

router = APIRouter()

WATERMARK_TEXT = "Powered by Olorin | olorin.ai"
CLIP_MAX_SECONDS = 15
CLIP_TTL_HOURS = 24


class ClipRequest(BaseModel):
    """Request to generate a shareable clip."""

    session_id: str = Field(..., description="Pause & Ask session ID")
    exchange_index: int = Field(
        default=0, ge=0,
        description="Index of the dialogue exchange to clip",
    )


class ClipResponse(BaseModel):
    """Generated clip details."""

    clip_url: str = Field(description="Downloadable MP4 URL (24hr TTL)")
    clip_id: str = Field(description="Unique clip identifier")
    duration_seconds: float
    watermark: str = WATERMARK_TEXT


@router.post(
    "/generate",
    response_model=ClipResponse,
    summary="Generate shareable clip with watermark",
)
async def generate_clip(
    request: ClipRequest,
    http_request: Request,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> ClipResponse:
    """Generate a 15s clip from a Pause & Ask exchange with Olorin branding."""
    session = await VODInteractionSession.get(
        PydanticObjectId(request.session_id),
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if request.exchange_index >= len(session.dialogue_exchanges):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Exchange index {request.exchange_index} out of range "
                f"(session has {len(session.dialogue_exchanges)} exchanges)"
            ),
        )

    exchange = session.dialogue_exchanges[request.exchange_index]
    source_url = exchange.animated_video_url or exchange.audio_url
    if not source_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No video/audio available for this exchange",
        )

    clip_id = uuid.uuid4().hex
    remote_path = (
        f"olorin-clips/{partner.partner_id}/{clip_id}.mp4"
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        input_file = tmp / "input.mp4"
        output_file = tmp / "clip.mp4"

        # Download source
        import httpx
        async with httpx.AsyncClient(
            timeout=60.0, follow_redirects=True,
        ) as client:
            resp = await client.get(source_url)
            resp.raise_for_status()
            input_file.write_bytes(resp.content)

        safe_text = WATERMARK_TEXT.replace("'", "\\'")
        cmd = [
            "ffmpeg", "-y",
            "-i", str(input_file),
            "-t", str(CLIP_MAX_SECONDS),
            "-vf", (
                f"drawtext=text='{safe_text}'"
                f":fontsize=18:fontcolor=white@0.7"
                f":x=10:y=H-th-10"
                f":borderw=1:bordercolor=black@0.4"
            ),
            "-c:v", "libx264", "-preset", "fast",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            str(output_file),
        ]

        result = subprocess.run(
            cmd, capture_output=True, timeout=120,
        )
        if result.returncode != 0:
            logger.error(
                "FFmpeg clip generation failed",
                extra={
                    "clip_id": clip_id,
                    "stderr": result.stderr.decode()[:500],
                },
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Clip generation failed",
            )

        clip_bytes = output_file.read_bytes()

    url = await storage_service.upload_bytes(
        clip_bytes, remote_path, "video/mp4",
    )

    logger.info(
        "Clip generated",
        extra={
            "clip_id": clip_id,
            "partner_id": partner.partner_id,
            "session_id": request.session_id,
            "size_bytes": len(clip_bytes),
        },
    )

    return ClipResponse(
        clip_url=url,
        clip_id=clip_id,
        duration_seconds=min(CLIP_MAX_SECONDS, 15.0),
    )
