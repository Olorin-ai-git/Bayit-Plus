"""
Admin Interactive Moments API Routes

Admin endpoints for curating interactive moments in VOD content.
"""

import tempfile
import subprocess
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.models.user import User
from app.models.content import Content
from app.models.vod_interaction import InteractiveMoment
from app.core.security import get_current_user
from app.api.routes.admin.auth import require_admin
from app.core.storage import storage_service
from app.core.logging_config import get_logger
from app.services.vod_interaction.character_ai import character_ai_service
from app.services.vod_interaction.character_animator import character_animator_service
from app.models.character import Character
from app.core.config import settings

logger = get_logger(__name__)


router = APIRouter(prefix="/admin/interactive-moments", tags=["Admin - Interactive Moments"])


class UpdateMomentsRequest(BaseModel):
    """Request to update interactive moments for content"""
    moments: List[InteractiveMoment] = Field(..., description="List of interactive moments")


class ExtractFrameRequest(BaseModel):
    """Request to extract video frame at timestamp"""
    content_id: str = Field(..., description="Content ID")
    timestamp: float = Field(..., ge=0, description="Timestamp in seconds")


class ExtractFrameResponse(BaseModel):
    """Response with extracted frame URL"""
    gcs_url: str = Field(..., description="GCS URL of extracted frame")


@router.patch("/content/{content_id}/moments")
async def update_interactive_moments(
    content_id: str,
    request: UpdateMomentsRequest,
    current_user: User = Depends(require_admin)
):
    """
    Update interactive moments for content (admin only)

    Args:
        content_id: Content ID
        request: List of interactive moments
        current_user: Admin user

    Returns:
        Update confirmation
    """
    try:
        content = await Content.get(content_id)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found"
            )

        invalid = [m for m in request.moments if m.timestamp <= 0]
        if invalid:
            names = ", ".join(m.character_name for m in invalid)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"All moments must have timestamp > 0. Invalid: {names}",
            )

        content.interactive_moments = request.moments
        content.supports_avatar_interaction = len(request.moments) > 0
        await content.save()

        logger.info(
            "Interactive moments updated",
            extra={
                "content_id": content_id,
                "moments_count": len(request.moments),
                "admin_id": str(current_user.id)
            }
        )

        return {
            "message": "Interactive moments updated successfully",
            "content_id": content_id,
            "moments_count": len(request.moments),
            "supports_avatar_interaction": content.supports_avatar_interaction
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to update interactive moments",
            extra={
                "content_id": content_id,
                "error": str(e)
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update interactive moments"
        )


@router.post("/extract-frame", response_model=ExtractFrameResponse)
async def extract_character_frame(
    request: ExtractFrameRequest,
    current_user: User = Depends(require_admin)
):
    """
    Extract video frame at timestamp for character animation (admin only)

    Args:
        request: Content ID and timestamp
        current_user: Admin user

    Returns:
        GCS URL of extracted frame
    """
    try:
        content = await Content.get(request.content_id)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found"
            )

        frame_path = await _extract_frame_ffmpeg(
            video_url=content.stream_url,
            timestamp=request.timestamp
        )

        gcs_path = f"interactive-moments/{request.content_id}/frame_{int(request.timestamp)}.jpg"
        gcs_url = await storage_service.upload_file(
            frame_path,
            gcs_path,
            content_type="image/jpeg"
        )

        import os
        os.unlink(frame_path)

        logger.info(
            "Frame extracted for interactive moment",
            extra={
                "content_id": request.content_id,
                "timestamp": request.timestamp,
                "gcs_url": gcs_url,
                "admin_id": str(current_user.id)
            }
        )

        return ExtractFrameResponse(gcs_url=gcs_url)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to extract frame",
            extra={
                "content_id": request.content_id,
                "timestamp": request.timestamp,
                "error": str(e)
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extract video frame"
        )


@router.get("/content/{content_id}/moments", response_model=List[InteractiveMoment])
async def get_interactive_moments(
    content_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get interactive moments for content

    Args:
        content_id: Content ID
        current_user: Authenticated user

    Returns:
        List of interactive moments
    """
    try:
        content = await Content.get(content_id)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found"
            )

        return [m for m in content.interactive_moments if m.is_complete]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get interactive moments",
            extra={"content_id": content_id, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve interactive moments"
        )


@router.post("/content/{content_id}/generate-responses")
async def generate_character_responses(
    content_id: str,
    current_user: User = Depends(require_admin)
):
    """
    Pre-generate character response videos for all interactive moments.

    For each moment that has a lipsync_video_url (avatar video) but no
    character_response_video_url, generates AI dialogue, TTS audio,
    and lip-sync video using the character's cloned voice.
    """
    try:
        content = await Content.get(content_id)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found"
            )

        if not content.interactive_moments:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Content has no interactive moments"
            )

        generated_count = 0
        errors = []

        for idx, moment in enumerate(content.interactive_moments):
            if not moment.lipsync_video_url:
                continue
            if moment.character_response_video_url:
                continue
            if not moment.character_frame_url:
                errors.append(
                    f"Moment at {moment.timestamp}s: missing character_frame_url"
                )
                continue

            try:
                char_record = await Character.find_one(
                    Character.name == moment.character_name
                )
                voice_id = (
                    char_record.voice_id
                    if char_record
                    else settings.CHARACTER_VOICE_DEFAULT
                )

                ai_response = await character_ai_service.generate_response(
                    character_name=moment.character_name,
                    scene_context=moment.scene_context,
                    user_message=moment.interaction_prompt,
                    conversation_history=[]
                )

                animated = await character_animator_service.animate_character_response(
                    character_name=moment.character_name,
                    dialogue_text=ai_response.text,
                    character_frame_url=moment.character_frame_url,
                    voice_id=voice_id
                )

                moment.character_response_text = ai_response.text
                moment.character_response_audio_url = animated.audio_url
                moment.character_response_video_url = animated.video_url
                generated_count += 1

                logger.info(
                    "Character response generated for moment",
                    extra={
                        "content_id": content_id,
                        "timestamp": moment.timestamp,
                        "character_name": moment.character_name,
                    }
                )

            except Exception as e:
                errors.append(
                    f"Moment at {moment.timestamp}s ({moment.character_name}): {e}"
                )
                logger.error(
                    "Failed to generate character response for moment",
                    extra={
                        "content_id": content_id,
                        "timestamp": moment.timestamp,
                        "error": str(e),
                    }
                )

        if generated_count > 0:
            await content.save()

        return {
            "content_id": content_id,
            "total_moments": len(content.interactive_moments),
            "generated": generated_count,
            "errors": errors,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to generate character responses",
            extra={"content_id": content_id, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate character responses"
        )


class GenerateKidVideosRequest(BaseModel):
    """Optional overrides for kid video generation."""
    kid_voice_id: str = Field(
        default="",
        description="ElevenLabs voice ID for kid (defaults to MOVIE_INTERACTION_KID_VOICE_ID config)",
    )
    kid_image_url: str = Field(
        default="",
        description="Kid avatar image URL (defaults to MOVIE_INTERACTION_DEFAULT_KID_IMAGE_URL config)",
    )


@router.post("/content/{content_id}/generate-kid-videos")
async def generate_kid_videos(
    content_id: str,
    request: GenerateKidVideosRequest = GenerateKidVideosRequest(),
    current_user: User = Depends(require_admin),
):
    """
    (Re)generate kid avatar question videos for all interactive moments.

    Uses dialogue_options[0] as the question text (the real kid question),
    Etai's cloned voice ID (MOVIE_INTERACTION_KID_VOICE_ID), and
    MOVIE_INTERACTION_DEFAULT_KID_IMAGE_URL. Safe to re-run: overwrites
    any existing lipsync_video_url.
    """
    kid_image = request.kid_image_url or settings.MOVIE_INTERACTION_DEFAULT_KID_IMAGE_URL
    kid_voice = request.kid_voice_id or settings.MOVIE_INTERACTION_KID_VOICE_ID
    if not kid_image or not kid_voice:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="kid_image_url and kid_voice_id must be provided or configured via "
                   "MOVIE_INTERACTION_DEFAULT_KID_IMAGE_URL / MOVIE_INTERACTION_KID_VOICE_ID",
        )
    content = await Content.get(content_id)
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    if not content.interactive_moments:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No interactive moments")

    generated_count = 0
    errors = []
    for moment in content.interactive_moments:
        # Use dialogue_options[0] — the actual kid question text.
        # interaction_prompt is a generic placeholder ("Ask Daniel a question!").
        question_text = (moment.dialogue_options[0] if moment.dialogue_options else "")
        if not question_text:
            continue
        try:
            kid_animated = await character_animator_service.animate_character_response(
                character_name="kid",
                dialogue_text=question_text,
                character_frame_url=kid_image,
                voice_id=kid_voice,
            )
            moment.lipsync_video_url = kid_animated.video_url
            generated_count += 1
        except Exception as exc:
            errors.append(f"Moment at {moment.timestamp}s: {exc}")
            logger.error(
                "Failed to generate kid video for moment",
                extra={"content_id": content_id, "timestamp": moment.timestamp, "error": str(exc)},
            )

    if generated_count > 0:
        await content.save()

    logger.info(
        "Kid video generation complete",
        extra={"content_id": content_id, "generated": generated_count, "errors": len(errors)},
    )
    return {"content_id": content_id, "generated": generated_count, "errors": errors}


async def _extract_frame_ffmpeg(video_url: str, timestamp: float) -> str:
    """
    Extract single frame from video using FFmpeg

    Args:
        video_url: URL of video
        timestamp: Timestamp in seconds

    Returns:
        Path to extracted frame (temporary file)
    """
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        output_path = tmp.name

    cmd = [
        "ffmpeg",
        "-ss", str(timestamp),
        "-i", video_url,
        "-frames:v", "1",
        "-q:v", "2",
        "-y",
        output_path
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=30
    )

    if result.returncode != 0:
        raise Exception(f"FFmpeg frame extraction failed: {result.stderr}")

    return output_path
