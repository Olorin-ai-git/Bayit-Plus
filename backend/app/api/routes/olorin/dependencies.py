"""
Olorin.ai Platform API Dependencies

Authentication, rate limiting, and capability verification.
"""

import logging
from typing import Optional, Tuple

from app.api.routes.olorin.errors import OlorinErrors, get_error_message
from app.core.config import settings
from app.models.integration_partner import IntegrationPartner
from app.services.olorin.metering_service import metering_service
from app.services.olorin.partner_service import partner_service
from app.services.olorin.rate_limiter import partner_rate_limiter
from fastapi import Header, HTTPException, Request, status

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
            detail=get_error_message(
                OlorinErrors.MISSING_API_KEY, header=API_KEY_HEADER
            ),
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


def _get_global_feature_flag(capability: str) -> bool:
    """
    Get global feature flag status for a capability.

    Global flags act as system kill switches. When disabled, the capability
    is unavailable to ALL partners, regardless of their individual settings.

    Args:
        capability: Capability name (realtime_dubbing, semantic_search, etc.)

    Returns:
        True if globally enabled, False otherwise
    """
    feature_flags = {
        "realtime_dubbing": settings.olorin.dubbing_enabled,
        "semantic_search": settings.olorin.semantic_search_enabled,
        "cultural_context": settings.olorin.cultural_context_enabled,
        "recap_agent": settings.olorin.recap_enabled,
    }
    return feature_flags.get(capability, False)


async def verify_capability(
    partner: IntegrationPartner,
    capability: str,
) -> None:
    """
    Verify partner has access to a specific capability.

    Implements 3-step verification:
    1. Check global feature flag (system kill switch) -> 503 if disabled
    2. Check partner.get_capability_config(capability) -> 403 if not enabled
    3. Check usage limits via metering service -> 429 if exceeded

    Args:
        partner: Authenticated partner
        capability: Capability type to verify

    Raises:
        HTTPException: 503 if globally disabled, 403 if not enabled, 429 if rate limited
    """
    # Step 1: Check global feature flag (system kill switch)
    if not _get_global_feature_flag(capability):
        logger.warning(
            f"Capability '{capability}' globally disabled - "
            f"partner {partner.partner_id} request rejected (503)"
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=get_error_message(
                OlorinErrors.CAPABILITY_DISABLED, capability=capability
            ),
        )

    # Step 2: Check partner has capability enabled
    cap_config = partner.get_capability_config(capability)

    if cap_config is None:
        # Partner doesn't have this capability configured at all
        logger.warning(
            f"Partner {partner.partner_id} attempted to use unconfigured "
            f"capability: {capability} (403)"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=get_error_message(
                OlorinErrors.CAPABILITY_NOT_ENABLED, capability=capability
            ),
        )

    if not cap_config.enabled:
        # Partner has capability but it's disabled
        logger.warning(
            f"Partner {partner.partner_id} attempted to use disabled "
            f"capability: {capability} (403)"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=get_error_message(
                OlorinErrors.CAPABILITY_NOT_ENABLED, capability=capability
            ),
        )

    # Step 3: Check usage limits (may have per-partner overrides)
    within_limits, error_message = await metering_service.check_usage_limit(
        partner, capability
    )
    if not within_limits:
        logger.warning(
            f"Partner {partner.partner_id} exceeded usage limits for "
            f"capability: {capability} (429)"
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=error_message,
        )


async def check_partner_rate_limit(
    partner: IntegrationPartner,
    capability: str,
) -> Tuple[bool, Optional[str]]:
    """
    Check if partner is within rate limits for a capability.

    Uses partner.get_capability_config() to get per-partner rate limits,
    falling back to global defaults if not configured.

    Args:
        partner: Authenticated partner
        capability: Capability being accessed

    Returns:
        Tuple of (is_within_limit, error_message)
    """
    cap_config = partner.get_capability_config(capability)

    if cap_config is None or cap_config.rate_limits is None:
        # No per-partner rate limits - use global defaults via metering
        return await metering_service.check_usage_limit(partner, capability)

    # Per-partner rate limits configured - use rate limiter service
    return await partner_rate_limiter.check_rate_limit(
        partner_id=partner.partner_id,
        capability=capability,
        rate_limits=cap_config.rate_limits,
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
