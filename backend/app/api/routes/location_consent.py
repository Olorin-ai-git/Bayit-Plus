"""Location consent management endpoints for GDPR compliance."""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_optional_user
from app.models.user import User
from app.services.location_consent_service import LocationConsentService

router = APIRouter()
logger = logging.getLogger(__name__)


class ConsentRequest(BaseModel):
    """Request to grant location consent."""

    consent_given: bool = True
    retention_days: int = 90


class ConsentResponse(BaseModel):
    """Response with consent status."""

    consent_given: bool
    timestamp: str = None
    retention_days: int


def get_consent_service() -> LocationConsentService:
    """Dependency injection for LocationConsentService."""
    return LocationConsentService()


@router.post("/location-consent", response_model=ConsentResponse)
async def update_location_consent(
    request: ConsentRequest,
    current_user: User = Depends(get_optional_user),
    service: LocationConsentService = Depends(get_consent_service),
) -> ConsentResponse:
    """Grant or revoke location consent."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )

    user_id = str(current_user.id)
    success = False
    if request.consent_given:
        success = await service.grant_location_consent(user_id, request.retention_days)
    else:
        success = await service.revoke_location_consent(user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update location consent",
        )

    status_dict = await service.get_consent_status(user_id)
    logger.info(
        "Location consent updated",
        extra={"user_id": user_id, "consent_given": request.consent_given},
    )
    return ConsentResponse(
        consent_given=status_dict["consent_given"],
        timestamp=status_dict["timestamp"],
        retention_days=status_dict["retention_days"],
    )


@router.get("/location-consent", response_model=ConsentResponse)
async def get_location_consent(
    current_user: User = Depends(get_optional_user),
    service: LocationConsentService = Depends(get_consent_service),
) -> ConsentResponse:
    """Get current user's location consent status."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )

    status_dict = await service.get_consent_status(str(current_user.id))
    return ConsentResponse(
        consent_given=status_dict["consent_given"],
        timestamp=status_dict["timestamp"],
        retention_days=status_dict["retention_days"],
    )
