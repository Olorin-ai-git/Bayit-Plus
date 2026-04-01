"""Training platform Watch Party endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.models.integration_partner import IntegrationPartner
from app.models.realtime import WatchPartyCreate
from app.models.training_user import TrainingUser
from app.api.routes.training.dependencies import get_current_training_user
from app.services.room_manager import room_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/party", tags=["training-party"])

ORG_TIER_REQUIRED = "organization"


class CreatePartyRequest(BaseModel):
    """Request body for creating a training Watch Party."""

    content_id: str = Field(..., description="Content to watch together")


async def _check_org_tier(user: TrainingUser) -> IntegrationPartner:
    """Load partner and enforce Organization tier gate."""
    partner = await IntegrationPartner.find_one(
        {"partner_id": user.partner_id}
    )
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    tc = partner.training_config or {}
    if tc.get("org_tier", "team") != ORG_TIER_REQUIRED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Watch Party requires Organization tier",
        )
    return partner


@router.post("/create")
async def create_party(
    body: CreatePartyRequest,
    user: TrainingUser = Depends(get_current_training_user),
):
    """Create a Watch Party (Organization tier only)."""
    await _check_org_tier(user)

    party_data = WatchPartyCreate(
        content_id=body.content_id,
        content_type="vod",
        is_private=True,
        audio_enabled=True,
        chat_enabled=True,
        sync_playback=True,
    )
    party = await room_manager.create_party(
        host_id=str(user.id),
        host_name=user.display_name,
        data=party_data,
    )

    logger.info(
        "Training Watch Party created: %s", party.room_code,
        extra={"partner_id": user.partner_id},
    )
    return {
        "party_id": str(party.id),
        "room_code": party.room_code,
        "host": True,
    }


@router.get("/join/{code}")
async def join_party(
    code: str,
    user: TrainingUser = Depends(get_current_training_user),
):
    """Join a Watch Party by room code (Organization tier only)."""
    await _check_org_tier(user)

    party = await room_manager.get_party_by_code(code)
    if not party:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Party not found or ended",
        )

    if party.participant_count >= party.max_participants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Party is full",
        )

    party = await room_manager.join_party(
        party_id=str(party.id),
        user_id=str(user.id),
        user_name=user.display_name,
    )

    return {
        "party_id": str(party.id),
        "room_code": party.room_code,
        "host": False,
    }
