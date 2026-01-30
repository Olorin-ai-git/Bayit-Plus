"""AI catch-up summary REST API endpoint for Beta 500 users."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.api.routes.catchup_models import (
    ProgramInfo,
    CatchUpSummaryResponse,
    CatchUpAvailabilityResponse,
    validate_id
)
from app.core.config import Settings, get_settings
from app.core.database import get_database
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.user import User
from app.services.catchup.integration import CatchUpIntegration
from app.services.beta.credit_service import BetaCreditService
from app.services.olorin.metering.service import MeteringService

router = APIRouter()
logger = get_logger(__name__)


async def get_credit_service(
    app_settings: Settings = Depends(get_settings),
    db = Depends(get_database)
) -> BetaCreditService:
    """Get BetaCreditService instance with proper dependency injection."""
    metering_service = MeteringService()
    return BetaCreditService(settings=app_settings, metering_service=metering_service, db=db)


@router.get("/live/{channel_id}/catchup", response_model=CatchUpSummaryResponse)
async def generate_catchup_summary(
    channel_id: str,
    response: Response,
    window_minutes: Optional[int] = Query(None, ge=1, le=30, description="Time window in minutes"),
    target_language: str = Query(default="en", description="Target language (ISO 639-1)"),
    current_user: User = Depends(get_current_user),
    credit_service: BetaCreditService = Depends(get_credit_service),
    settings: Settings = Depends(get_settings)
) -> CatchUpSummaryResponse:
    """
    Generate or retrieve AI catch-up summary (Beta 500 users only).

    Returns 402 if insufficient credits, 503 if service unavailable.
    """
    validate_id(channel_id, "channel_id")

    if window_minutes is None:
        window_minutes = 15

    logger.info(
        "Catch-up summary requested",
        extra={
            "channel_id": channel_id,
            "user_id": str(current_user.id),
            "window_minutes": window_minutes,
            "target_language": target_language
        }
    )

    try:
        integration = CatchUpIntegration(
            user_id=str(current_user.id),
            channel_id=channel_id,
            credit_service=credit_service
        )

        result = await integration.generate_catchup_with_credits(
            target_language=target_language,
            window_minutes=window_minutes
        )

        logger.info(
            "Catch-up summary generated",
            extra={
                "channel_id": channel_id,
                "user_id": str(current_user.id),
                "cached": result.get("cached", False),
                "credits_used": result.get("credits_used", 0)
            }
        )

        program_info_model = None
        if program_info := result.get("program_info"):
            program_info_model = ProgramInfo(
                title=program_info.get("title"),
                description=program_info.get("description"),
                genre=program_info.get("genre"),
                host=program_info.get("host")
            )

        return CatchUpSummaryResponse(
            summary=result["summary"],
            key_points=result.get("key_points", []),
            program_info=program_info_model,
            window_start=result["window_start"],
            window_end=result["window_end"],
            cached=result.get("cached", False),
            credits_used=result.get("credits_used", 0),
            remaining_credits=result["remaining_credits"]
        )

    except ValueError as e:
        error_message = str(e)
        logger.warning(
            "Catch-up generation failed",
            extra={"channel_id": channel_id, "user_id": str(current_user.id), "error": error_message}
        )

        if "insufficient credits" in error_message.lower():
            try:
                balance = await credit_service.get_balance(str(current_user.id))
                raise HTTPException(
                    status_code=402,
                    detail={
                        "error": "Insufficient credits",
                        "message": error_message,
                        "remaining_credits": balance if balance is not None else 0
                    }
                )
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(
                    status_code=402,
                    detail={"error": "Insufficient credits", "message": error_message, "remaining_credits": 0}
                )

        raise HTTPException(status_code=400, detail=error_message)

    except Exception as e:
        logger.error(
            "Catch-up generation failed",
            extra={"channel_id": channel_id, "user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )

        response.headers["Retry-After"] = "300"

        raise HTTPException(
            status_code=503,
            detail={
                "error": "Service temporarily unavailable",
                "message": "AI catch-up service is experiencing issues. Please try again later.",
                "retry_after": 300
            }
        )


@router.get("/live/{channel_id}/catchup/available", response_model=CatchUpAvailabilityResponse)
async def check_catchup_availability(
    channel_id: str,
    current_user: User = Depends(get_current_user),
    credit_service: BetaCreditService = Depends(get_credit_service)
) -> CatchUpAvailabilityResponse:
    """Check if catch-up summary is available for a channel."""
    validate_id(channel_id, "channel_id")

    logger.info(
        "Catch-up availability check",
        extra={"channel_id": channel_id, "user_id": str(current_user.id)}
    )

    try:
        integration = CatchUpIntegration(
            user_id=str(current_user.id),
            channel_id=channel_id,
            credit_service=credit_service
        )

        availability = await integration.check_available()

        logger.info(
            "Catch-up availability checked",
            extra={
                "channel_id": channel_id,
                "user_id": str(current_user.id),
                "available": availability.get("available", False),
                "is_beta_user": availability.get("is_beta_user", False)
            }
        )

        return CatchUpAvailabilityResponse(
            available=availability["available"],
            is_beta_user=availability["is_beta_user"],
            has_credits=availability["has_credits"],
            balance=availability.get("balance", 0),
        )

    except Exception as e:
        logger.error(
            "Catch-up availability check failed",
            extra={"channel_id": channel_id, "user_id": str(current_user.id), "error": str(e)},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Failed to check catch-up availability")
