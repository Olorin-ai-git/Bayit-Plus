"""
Olorin.ai Platform API Dependencies

Authentication, rate limiting, and capability verification.
"""

import logging
from typing import Optional

from fastapi import Header, HTTPException, status, Request

from app.core.config import settings
from app.models.integration_partner import IntegrationPartner
from app.services.olorin.partner_service import partner_service
from app.services.olorin.metering_service import metering_service
from app.api.routes.olorin.errors import get_error_message, OlorinErrors

logger = logging.getLogger(__name__)

# API key header name
API_KEY_HEADER = "X-Olorin-API-Key"


async def get_current_partner(
    x_olorin_api_key: Optional[str] = Header(None, alias=API_KEY_HEADER),
) -> IntegrationPartner:
    """
    Authenticate partner via API key header.

    Args:
        x_olorin_api_key: API key from header

    Returns:
        Authenticated partner document

    Raises:
        HTTPException: If authentication fails
    """
    if not x_olorin_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=get_error_message(OlorinErrors.MISSING_API_KEY, header=API_KEY_HEADER),
            headers={"WWW-Authenticate": "ApiKey"},
        )

    partner = await partner_service.authenticate_by_api_key(x_olorin_api_key)
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=get_error_message(OlorinErrors.INVALID_API_KEY),
            headers={"WWW-Authenticate": "ApiKey"},
        )

    return partner


async def verify_capability(
    partner: IntegrationPartner,
    capability: str,
) -> None:
    """
    Verify partner has access to a specific capability.

    Args:
        partner: Authenticated partner
        capability: Capability type to verify

    Raises:
        HTTPException: If capability not enabled or rate limited
    """
    # Check feature flag
    feature_flags = {
        "realtime_dubbing": getattr(settings, "OLORIN_DUBBING_ENABLED", False),
        "semantic_search": getattr(settings, "OLORIN_SEMANTIC_SEARCH_ENABLED", False),
        "cultural_context": getattr(settings, "OLORIN_CULTURAL_CONTEXT_ENABLED", False),
        "recap_agent": getattr(settings, "OLORIN_RECAP_ENABLED", False),
    }

    if not feature_flags.get(capability, False):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=get_error_message(OlorinErrors.CAPABILITY_DISABLED, capability=capability),
        )

    # Check partner has capability
    if not partner.has_capability(capability):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=get_error_message(OlorinErrors.CAPABILITY_NOT_ENABLED, capability=capability),
        )

    # Check usage limits
    within_limits, error_message = await metering_service.check_usage_limit(
        partner, capability
    )
    if not within_limits:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=error_message,
        )


class RequireCapability:
    """
    Dependency class to verify a specific capability.

    Usage:
        @router.get("/search")
        async def search(
            partner: IntegrationPartner = Depends(get_current_partner),
            _: None = Depends(RequireCapability("semantic_search")),
        ):
            ...
    """

    def __init__(self, capability: str):
        self.capability = capability

    async def __call__(
        self,
        partner: IntegrationPartner,
    ) -> None:
        await verify_capability(partner, self.capability)


def get_client_info(request: Request) -> dict:
    """
    Extract client information from request.

    Args:
        request: FastAPI request object

    Returns:
        Dictionary with client IP and user agent
    """
    # Get real IP from forwarded headers (Cloud Run, load balancers)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else None

    user_agent = request.headers.get("User-Agent")

    return {
        "client_ip": client_ip,
        "client_user_agent": user_agent,
    }
