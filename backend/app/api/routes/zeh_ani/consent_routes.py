"""Zeh Ani Biometric Consent REST API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.biometric_consent import BiometricConsentType
from app.models.user import User
from app.services.zeh_ani.biometric_consent_service import (
    biometric_consent_service,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/zeh-ani/consent", tags=["zeh-ani"])


class BiometricConsentRequest(BaseModel):
    """Request to grant biometric consent."""

    profile_id: str
    consent_type: BiometricConsentType
    pin: str = Field(..., min_length=4, max_length=8)
    on_device_only: bool = True
    latent_features_cloud: bool = False


class BiometricConsentResponse(BaseModel):
    """Biometric consent status response."""

    consent_type: str
    active: bool


@router.post("/biometric")
async def grant_consent(
    request: BiometricConsentRequest,
    user: User = Depends(get_current_user),
):
    """Grant biometric consent with family PIN verification."""
    try:
        consent = await biometric_consent_service.grant_biometric_consent(
            user_id=str(user.id),
            profile_id=request.profile_id,
            consent_type=request.consent_type,
            pin=request.pin,
            on_device_only=request.on_device_only,
            latent_features_cloud=request.latent_features_cloud,
        )
        return {
            "id": str(consent.id),
            "consent_type": consent.consent_type.value,
            "active": consent.is_active,
            "granted_at": consent.granted_at.isoformat(),
            "on_device_only": consent.on_device_only,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/biometric/{profile_id}")
async def check_consent(
    profile_id: str,
    user: User = Depends(get_current_user),
):
    """Check all biometric consent statuses for a profile."""
    statuses = await biometric_consent_service.get_consent_status(
        user_id=str(user.id),
        profile_id=profile_id,
    )
    return {
        "profile_id": profile_id,
        "consents": [
            BiometricConsentResponse(
                consent_type=ctype,
                active=active,
            ).model_dump()
            for ctype, active in statuses.items()
        ],
    }


@router.delete("/biometric/{profile_id}")
async def revoke_consent(
    profile_id: str,
    consent_type: BiometricConsentType,
    user: User = Depends(get_current_user),
):
    """Revoke biometric consent for a specific type."""
    revoked = await biometric_consent_service.revoke_biometric_consent(
        user_id=str(user.id),
        profile_id=profile_id,
        consent_type=consent_type,
    )
    if not revoked:
        raise HTTPException(
            status_code=404,
            detail="No active consent found to revoke",
        )
    return {
        "profile_id": profile_id,
        "consent_type": consent_type.value,
        "revoked": True,
    }
