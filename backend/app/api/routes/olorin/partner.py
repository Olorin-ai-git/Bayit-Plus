"""
Olorin.ai Partner Management API

Endpoints for partner registration, configuration, and usage tracking.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field

from app.models.integration_partner import IntegrationPartner, WebhookEventType
from app.services.olorin.partner_service import partner_service
from app.services.olorin.metering_service import metering_service
from app.api.routes.olorin.dependencies import get_current_partner
from app.api.routes.olorin.errors import get_error_message, OlorinErrors
from app.core.rate_limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================
# Request/Response Models
# ============================================


class PartnerRegisterRequest(BaseModel):
    """Request to register a new partner."""

    partner_id: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-z0-9-]+$")
    name: str = Field(..., min_length=2, max_length=100)
    name_en: Optional[str] = Field(None, max_length=100)
    contact_email: EmailStr
    contact_name: Optional[str] = Field(None, max_length=100)
    billing_tier: str = Field(default="standard", pattern=r"^(free|standard|enterprise)$")
    capabilities: Optional[List[str]] = Field(
        default=None,
        description="List of capabilities to enable (realtime_dubbing, semantic_search, etc.)",
    )


class PartnerRegisterResponse(BaseModel):
    """Response with new partner info and API key."""

    partner_id: str
    name: str
    api_key: str = Field(..., description="Store this securely - it cannot be retrieved again")
    api_key_prefix: str
    billing_tier: str
    capabilities: List[str]
    created_at: datetime


class PartnerInfoResponse(BaseModel):
    """Partner information response."""

    partner_id: str
    name: str
    name_en: Optional[str]
    contact_email: str
    billing_tier: str
    capabilities: List[str]
    is_active: bool
    is_verified: bool
    webhook_url: Optional[str]
    webhook_events: List[str]
    created_at: datetime
    last_active_at: Optional[datetime]


class PartnerUpdateRequest(BaseModel):
    """Request to update partner configuration."""

    name: Optional[str] = Field(None, max_length=100)
    name_en: Optional[str] = Field(None, max_length=100)
    contact_name: Optional[str] = Field(None, max_length=100)
    technical_contact_email: Optional[EmailStr] = None
    description: Optional[str] = Field(None, max_length=500)
    logo_url: Optional[str] = None
    website_url: Optional[str] = None


class WebhookConfigRequest(BaseModel):
    """Request to configure webhooks."""

    webhook_url: str = Field(..., min_length=10)
    events: List[WebhookEventType]


class UsageSummaryResponse(BaseModel):
    """Usage summary response."""

    partner_id: str
    period: dict
    by_capability: dict
    totals: dict


class ApiKeyRegenerateResponse(BaseModel):
    """Response with new API key."""

    api_key: str = Field(..., description="Store this securely - it cannot be retrieved again")
    api_key_prefix: str


# ============================================
# Endpoints
# ============================================


@router.post(
    "/register",
    response_model=PartnerRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new integration partner",
    description="Register a new third-party platform for Olorin.ai integration. "
    "Returns an API key that must be stored securely.",
)
@limiter.limit("3/hour")
async def register_partner(http_request: Request, request: PartnerRegisterRequest):
    """Register a new integration partner."""
    try:
        partner, api_key = await partner_service.create_partner(
            partner_id=request.partner_id,
            name=request.name,
            contact_email=request.contact_email,
            name_en=request.name_en,
            contact_name=request.contact_name,
            billing_tier=request.billing_tier,
            capabilities=request.capabilities,
        )

        logger.info(f"Registered new partner: {request.partner_id}")

        return PartnerRegisterResponse(
            partner_id=partner.partner_id,
            name=partner.name,
            api_key=api_key,
            api_key_prefix=partner.api_key_prefix,
            billing_tier=partner.billing_tier,
            capabilities=list(partner.capabilities.keys()),
            created_at=partner.created_at,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Error registering partner: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_error_message(OlorinErrors.PARTNER_REGISTRATION_FAILED),
        )


@router.get(
    "/me",
    response_model=PartnerInfoResponse,
    summary="Get current partner info",
    description="Get information about the authenticated partner.",
)
async def get_partner_info(
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Get current partner information."""
    return PartnerInfoResponse(
        partner_id=partner.partner_id,
        name=partner.name,
        name_en=partner.name_en,
        contact_email=partner.contact_email,
        billing_tier=partner.billing_tier,
        capabilities=[k for k, v in partner.capabilities.items() if v.enabled],
        is_active=partner.is_active,
        is_verified=partner.is_verified,
        webhook_url=partner.webhook_url,
        webhook_events=[str(e) for e in partner.webhook_events],
        created_at=partner.created_at,
        last_active_at=partner.last_active_at,
    )


@router.put(
    "/me",
    response_model=PartnerInfoResponse,
    summary="Update partner configuration",
    description="Update partner profile and configuration.",
)
async def update_partner(
    request: PartnerUpdateRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Update partner configuration."""
    updates = request.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=get_error_message(OlorinErrors.NO_UPDATES_PROVIDED),
        )

    updated = await partner_service.update_partner(
        partner_id=partner.partner_id,
        **updates,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.PARTNER_NOT_FOUND),
        )

    return PartnerInfoResponse(
        partner_id=updated.partner_id,
        name=updated.name,
        name_en=updated.name_en,
        contact_email=updated.contact_email,
        billing_tier=updated.billing_tier,
        capabilities=[k for k, v in updated.capabilities.items() if v.enabled],
        is_active=updated.is_active,
        is_verified=updated.is_verified,
        webhook_url=updated.webhook_url,
        webhook_events=[str(e) for e in updated.webhook_events],
        created_at=updated.created_at,
        last_active_at=updated.last_active_at,
    )


@router.post(
    "/me/webhook",
    response_model=PartnerInfoResponse,
    summary="Configure webhook",
    description="Configure webhook URL and events for real-time notifications.",
)
async def configure_webhook(
    request: WebhookConfigRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Configure webhook for partner."""
    updated = await partner_service.configure_webhook(
        partner_id=partner.partner_id,
        webhook_url=request.webhook_url,
        events=request.events,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.PARTNER_NOT_FOUND),
        )

    return PartnerInfoResponse(
        partner_id=updated.partner_id,
        name=updated.name,
        name_en=updated.name_en,
        contact_email=updated.contact_email,
        billing_tier=updated.billing_tier,
        capabilities=[k for k, v in updated.capabilities.items() if v.enabled],
        is_active=updated.is_active,
        is_verified=updated.is_verified,
        webhook_url=updated.webhook_url,
        webhook_events=[str(e) for e in updated.webhook_events],
        created_at=updated.created_at,
        last_active_at=updated.last_active_at,
    )


@router.post(
    "/me/api-key/regenerate",
    response_model=ApiKeyRegenerateResponse,
    summary="Regenerate API key",
    description="Generate a new API key. The old key will be invalidated immediately.",
)
async def regenerate_api_key(
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Regenerate API key for partner."""
    result = await partner_service.regenerate_api_key(partner.partner_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.PARTNER_NOT_FOUND),
        )

    updated_partner, new_api_key = result

    logger.info(f"Regenerated API key for partner: {partner.partner_id}")

    return ApiKeyRegenerateResponse(
        api_key=new_api_key,
        api_key_prefix=updated_partner.api_key_prefix,
    )


@router.get(
    "/usage",
    response_model=UsageSummaryResponse,
    summary="Get usage statistics",
    description="Get usage summary for the current billing period.",
)
async def get_usage(
    partner: IntegrationPartner = Depends(get_current_partner),
    capability: Optional[str] = None,
):
    """Get usage statistics for partner."""
    summary = await metering_service.get_usage_summary(
        partner_id=partner.partner_id,
        capability=capability,
    )

    return UsageSummaryResponse(**summary)


@router.get(
    "/usage/{capability}",
    response_model=UsageSummaryResponse,
    summary="Get usage for specific capability",
    description="Get detailed usage statistics for a specific capability.",
)
async def get_capability_usage(
    capability: str,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Get usage statistics for a specific capability."""
    summary = await metering_service.get_usage_summary(
        partner_id=partner.partner_id,
        capability=capability,
    )

    return UsageSummaryResponse(**summary)
