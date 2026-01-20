"""
Chat SFX Endpoints - Sound effect generation

Endpoints for generating wizard gesture sound effects and custom sound effects
using ElevenLabs Sound Generation API.
"""

from app.core.security import get_current_active_user
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from .models import SFXRequest

router = APIRouter()

# SFX constraints
SFX_MAX_DESCRIPTION_LENGTH = 500
SFX_MIN_DURATION_SECONDS = 0.5
SFX_MAX_DURATION_SECONDS = 22


@router.post("/sound-effect/{gesture}")
async def get_wizard_sfx(
    gesture: str,
    current_user: User = Depends(get_current_active_user),
) -> StreamingResponse:
    """Get a sound effect for a wizard gesture animation."""
    from app.services.elevenlabs_sfx_service import (
        WIZARD_SFX_DESCRIPTIONS,
        get_sfx_service,
    )

    valid_gestures = list(WIZARD_SFX_DESCRIPTIONS.keys())
    if gesture not in valid_gestures:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid gesture: {gesture}. Valid options: {valid_gestures}",
        )

    try:
        sfx_service = get_sfx_service()
        audio_bytes = await sfx_service.get_wizard_sfx(gesture)

        return StreamingResponse(
            iter([audio_bytes]),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'inline; filename="wizard_{gesture}.mp3"',
                "Cache-Control": "public, max-age=86400",
                "X-SFX-Gesture": gesture,
            },
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[SFX] Error generating sound effect: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to generate sound effect: {str(e)}"
        )


@router.post("/sound-effect")
async def generate_custom_sfx(
    request: SFXRequest,
    current_user: User = Depends(get_current_active_user),
) -> StreamingResponse:
    """Generate a custom sound effect from a text description."""
    from app.services.elevenlabs_sfx_service import get_sfx_service

    if not request.custom_description:
        raise HTTPException(
            status_code=400,
            detail="custom_description is required for custom SFX generation",
        )

    if len(request.custom_description) > SFX_MAX_DESCRIPTION_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"custom_description must be {SFX_MAX_DESCRIPTION_LENGTH} characters or less",
        )

    if request.duration_seconds is not None:
        if (
            not SFX_MIN_DURATION_SECONDS
            <= request.duration_seconds
            <= SFX_MAX_DURATION_SECONDS
        ):
            raise HTTPException(
                status_code=400,
                detail=f"duration_seconds must be between {SFX_MIN_DURATION_SECONDS} and {SFX_MAX_DURATION_SECONDS}",
            )

    try:
        sfx_service = get_sfx_service()
        audio_bytes = await sfx_service.generate_sfx(
            text=request.custom_description,
            duration_seconds=request.duration_seconds,
        )

        return StreamingResponse(
            iter([audio_bytes]),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": 'inline; filename="custom_sfx.mp3"',
                "Cache-Control": "public, max-age=3600",
            },
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[SFX] Error generating custom sound effect: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to generate sound effect: {str(e)}"
        )
