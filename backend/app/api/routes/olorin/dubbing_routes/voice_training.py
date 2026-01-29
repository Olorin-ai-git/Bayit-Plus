"""
Voice Training API Routes (P3-1)

REST endpoints for partner-scoped custom voice management.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.routes.olorin.dependencies import (get_current_partner,
                                                verify_capability)
from app.api.routes.olorin.dubbing_routes.models import (
    CreateCustomVoiceRequest,
    CustomVoiceListResponse,
    CustomVoiceResponse,
)
from app.api.routes.olorin.errors import OlorinErrors, get_error_message
from app.models.integration_partner import IntegrationPartner
from app.services.olorin.dubbing.voice_training import VoiceTrainingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voices/custom", tags=["dubbing-voices"])

_training_service: Optional[VoiceTrainingService] = None


def _get_training_service() -> VoiceTrainingService:
    """Get or create the voice training service singleton."""
    global _training_service
    if _training_service is None:
        _training_service = VoiceTrainingService()
    return _training_service


def _voice_to_response(voice) -> CustomVoiceResponse:
    """Convert a CustomVoiceMetadata document to API response."""
    return CustomVoiceResponse(
        id=str(voice.id),
        partner_id=voice.partner_id,
        voice_id=voice.voice_id,
        voice_name=voice.voice_name,
        description=voice.description,
        language=voice.language,
        status=voice.status,
        training_sample_count=voice.training_sample_count,
        created_at=voice.created_at.isoformat(),
        ready_at=voice.ready_at.isoformat() if voice.ready_at else None,
    )


@router.post(
    "",
    response_model=CustomVoiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create custom voice",
    description="Create a new custom voice for training.",
)
async def create_custom_voice(
    request: CreateCustomVoiceRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """P3-1: Create a custom voice placeholder for training."""
    await verify_capability(partner, "realtime_dubbing")

    service = _get_training_service()
    voice = await service.create_voice(
        partner_id=partner.partner_id,
        voice_name=request.voice_name,
        description=request.description,
        language=request.language,
    )

    logger.info(
        f"Created custom voice '{request.voice_name}' "
        f"for partner {partner.partner_id}"
    )
    return _voice_to_response(voice)


@router.get(
    "",
    response_model=CustomVoiceListResponse,
    summary="List custom voices",
    description="List all custom voices for the authenticated partner.",
)
async def list_custom_voices(
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """P3-1: List partner's custom voices."""
    await verify_capability(partner, "realtime_dubbing")

    service = _get_training_service()
    voices = await service.list_voices(partner.partner_id)

    return CustomVoiceListResponse(
        voices=[_voice_to_response(v) for v in voices]
    )


@router.get(
    "/{voice_id}",
    response_model=CustomVoiceResponse,
    summary="Get custom voice",
)
async def get_custom_voice(
    voice_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """P3-1: Get a specific custom voice by ElevenLabs voice ID."""
    await verify_capability(partner, "realtime_dubbing")

    service = _get_training_service()
    voice = await service.get_voice(partner.partner_id, voice_id)

    if not voice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom voice not found",
        )

    return _voice_to_response(voice)


@router.post(
    "/{voice_doc_id}/samples",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload training sample",
    description="Upload an audio sample for voice training.",
)
async def upload_training_sample(
    voice_doc_id: str,
    request: Request,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """P3-1: Upload audio sample for voice training."""
    await verify_capability(partner, "realtime_dubbing")

    audio_data = await request.body()
    if len(audio_data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty audio data",
        )

    service = _get_training_service()
    success = await service.upload_training_sample(
        partner_id=partner.partner_id,
        voice_doc_id=voice_doc_id,
        audio_data=audio_data,
        sample_name=f"sample_{voice_doc_id}",
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Failed to process training sample",
        )

    return {"status": "accepted", "bytes_received": len(audio_data)}


@router.delete(
    "/{voice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Archive custom voice",
    description="Archive (soft-delete) a custom voice.",
)
async def archive_custom_voice(
    voice_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """P3-1: Archive a custom voice."""
    await verify_capability(partner, "realtime_dubbing")

    service = _get_training_service()
    archived = await service.archive_voice(
        partner.partner_id, voice_id
    )

    if not archived:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom voice not found",
        )

    logger.info(
        f"Archived custom voice {voice_id} "
        f"for partner {partner.partner_id}"
    )
