"""Training platform Pause & Ask proxy with org tier and credit gates."""

import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.models.integration_partner import IntegrationPartner
from app.models.training_user import TrainingUser
from app.models.vod_interaction import VODInteractionSession
from app.api.routes.training.dependencies import get_current_training_user
from app.services.vod_interaction.pause_ask_orchestrator import (
    pause_ask_orchestrator,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["training-pause-ask"])

LIP_SYNC_CREDIT_COST = 3
VOICE_CREDIT_COST = 1
ORG_TIER_REQUIRED = "organization"


class TrainingPauseAskRequest(BaseModel):
    """Request body for training Pause & Ask."""

    content_id: str = Field(..., description="Content ID")
    character: str = Field(..., description="Character name")
    question: str = Field(
        ..., min_length=1, max_length=500, description="User question"
    )
    mode: Literal["voice", "lip_sync"] = Field(
        ..., description="Response mode"
    )


@router.post("/pause-ask")
async def training_pause_ask(
    body: TrainingPauseAskRequest,
    user: TrainingUser = Depends(get_current_training_user),
):
    """Process a Pause & Ask exchange with tier and credit gates."""
    partner = await IntegrationPartner.find_one(
        {"partner_id": user.partner_id}
    )
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    tc = partner.training_config or {}
    is_lip_sync = body.mode == "lip_sync"
    credit_cost = LIP_SYNC_CREDIT_COST if is_lip_sync else VOICE_CREDIT_COST

    if is_lip_sync and tc.get("org_tier", "team") != ORG_TIER_REQUIRED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lip-sync requires Organization tier",
        )

    cap = tc.get("credit_limit_monthly", 0)
    used = tc.get("credits_used", 0)
    if (cap - used) < credit_cost:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits for this interaction",
        )

    session = VODInteractionSession(
        user_id=str(user.id),
        profile_id=str(user.id),
        content_id=body.content_id,
        character_name=body.character,
        status="active",
    )
    await session.insert()

    try:
        result = await pause_ask_orchestrator.process_exchange(
            session=session,
            user_message=body.question,
            voice_only=(body.mode == "voice"),
        )
    except Exception:
        logger.error(
            "Training Pause & Ask failed",
            extra={
                "user_id": str(user.id),
                "content_id": body.content_id,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Pause & Ask processing failed",
        )
    finally:
        session.status = "completed"
        await session.save()

    tc["credits_used"] = tc.get("credits_used", 0) + credit_cost
    partner.training_config = tc
    await partner.save()
    logger.info(
        "Pause & Ask credits deducted",
        extra={
            "partner_id": user.partner_id,
            "cost": credit_cost,
            "mode": body.mode,
        },
    )

    return result.model_dump()
