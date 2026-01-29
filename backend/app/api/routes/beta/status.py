"""
Beta Program Status API

Public endpoint for program status and availability.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.models.beta_user import BetaUser
from app.core.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/beta", tags=["beta-status"])


class ProgramStatusResponse(BaseModel):
    """Beta program status response."""
    is_open: bool
    total_slots: int
    filled_slots: int
    available_slots: int
    program_name: str
    duration_days: int
    credits_per_user: int


@router.get("/status", response_model=ProgramStatusResponse)
async def get_program_status(
    settings: Settings = Depends(get_settings)
):
    """
    Get Beta 500 program status.

    Returns:
        Program status with availability information
    """
    try:
        # Count active and pending users
        filled_slots = await BetaUser.find(
            BetaUser.status.in_(["pending_verification", "active"])
        ).count()

        available_slots = max(0, settings.BETA_MAX_USERS - filled_slots)
        is_open = available_slots > 0

        return ProgramStatusResponse(
            is_open=is_open,
            total_slots=settings.BETA_MAX_USERS,
            filled_slots=filled_slots,
            available_slots=available_slots,
            program_name="Beta 500",
            duration_days=settings.BETA_DURATION_DAYS,
            credits_per_user=settings.BETA_AI_CREDITS
        )

    except Exception as e:
        logger.error(
            "Error fetching program status",
            extra={"error": str(e)}
        )
        # Return safe defaults on error
        return ProgramStatusResponse(
            is_open=False,
            total_slots=settings.BETA_MAX_USERS,
            filled_slots=settings.BETA_MAX_USERS,
            available_slots=0,
            program_name="Beta 500",
            duration_days=settings.BETA_DURATION_DAYS,
            credits_per_user=settings.BETA_AI_CREDITS
        )
