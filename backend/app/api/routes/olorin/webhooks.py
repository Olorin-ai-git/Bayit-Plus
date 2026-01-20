"""
Olorin.ai Webhook Delivery API

Endpoints for managing and delivering webhook events to partners.
"""

import hashlib
import hmac
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from app.api.routes.olorin.dependencies import get_current_partner
from app.api.routes.olorin.errors import OlorinErrors, get_error_message
from app.core.config import settings
from app.models.integration_partner import (
    IntegrationPartner,
    WebhookDelivery,
    WebhookEventType,
)
from app.services.olorin.partner_service import partner_service
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================
# Request/Response Models
# ============================================


class WebhookConfigRequest(BaseModel):
    """Request to configure webhook settings."""

    webhook_url: str = Field(..., description="URL to receive webhook events")
    events: list[WebhookEventType] = Field(
        ...,
        min_length=1,
        description="List of event types to subscribe to",
    )


class WebhookConfigResponse(BaseModel):
    """Webhook configuration response."""

    webhook_url: str
    events: list[WebhookEventType]
    webhook_secret: str
    is_configured: bool


class WebhookDeliveryResponse(BaseModel):
    """Webhook delivery record."""

    id: str
    event_type: WebhookEventType
    delivered: bool
    attempts: int
    response_status_code: Optional[int]
    error_message: Optional[str]
    created_at: datetime


class WebhookTestRequest(BaseModel):
    """Request to test webhook delivery."""

    event_type: WebhookEventType = Field(
        default="partner.updated",
        description="Event type to test",
    )


class WebhookTestResponse(BaseModel):
    """Response from webhook test."""

    success: bool
    response_status_code: Optional[int]
    response_time_ms: float
    error_message: Optional[str]


# ============================================
# REST Endpoints
# ============================================


@router.get(
    "/config",
    response_model=WebhookConfigResponse,
    summary="Get webhook configuration",
    description="Get current webhook configuration for the partner.",
)
async def get_webhook_config(
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Get webhook configuration."""
    return WebhookConfigResponse(
        webhook_url=partner.webhook_url or "",
        events=partner.webhook_events,
        webhook_secret=partner.webhook_secret or "",
        is_configured=bool(partner.webhook_url and partner.webhook_events),
    )


@router.put(
    "/config",
    response_model=WebhookConfigResponse,
    summary="Configure webhooks",
    description="Configure webhook URL and subscribed events.",
)
async def configure_webhooks(
    request: WebhookConfigRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Configure webhook settings."""
    updated = await partner_service.configure_webhook(
        partner_id=partner.partner_id,
        webhook_url=request.webhook_url,
        events=request.events,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_error_message(OlorinErrors.WEBHOOK_CONFIG_FAILED),
        )

    return WebhookConfigResponse(
        webhook_url=updated.webhook_url or "",
        events=updated.webhook_events,
        webhook_secret=updated.webhook_secret or "",
        is_configured=True,
    )


@router.delete(
    "/config",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove webhook configuration",
    description="Remove webhook configuration and stop receiving events.",
)
async def remove_webhook_config(
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Remove webhook configuration."""
    await partner_service.update_partner(
        partner_id=partner.partner_id,
        webhook_url=None,
        webhook_events=[],
        webhook_secret=None,
    )


@router.post(
    "/test",
    response_model=WebhookTestResponse,
    summary="Test webhook delivery",
    description="Send a test webhook to verify configuration.",
)
async def test_webhook(
    request: WebhookTestRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Test webhook delivery."""
    if not partner.webhook_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=get_error_message(OlorinErrors.WEBHOOK_URL_NOT_CONFIGURED),
        )

    if not partner.webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=get_error_message(OlorinErrors.WEBHOOK_SECRET_NOT_CONFIGURED),
        )

    # Build test payload
    payload = {
        "event_type": request.event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "partner_id": partner.partner_id,
        "test": True,
        "data": {
            "message": "This is a test webhook delivery",
        },
    }

    # Deliver webhook
    result = await _deliver_webhook(
        partner=partner,
        event_type=request.event_type,
        payload=payload,
        is_test=True,
    )

    return WebhookTestResponse(
        success=result["success"],
        response_status_code=result.get("status_code"),
        response_time_ms=result.get("response_time_ms", 0),
        error_message=result.get("error"),
    )


@router.get(
    "/deliveries",
    response_model=list[WebhookDeliveryResponse],
    summary="List webhook deliveries",
    description="Get recent webhook delivery attempts.",
)
async def list_deliveries(
    limit: int = 50,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """List recent webhook deliveries."""
    deliveries = (
        await WebhookDelivery.find(WebhookDelivery.partner_id == partner.partner_id)
        .sort(-WebhookDelivery.created_at)
        .limit(limit)
        .to_list()
    )

    return [
        WebhookDeliveryResponse(
            id=str(d.id),
            event_type=d.event_type,
            delivered=d.delivered,
            attempts=d.attempts,
            response_status_code=d.response_status_code,
            error_message=d.error_message,
            created_at=d.created_at,
        )
        for d in deliveries
    ]


# ============================================
# Webhook Delivery Functions
# ============================================


async def send_webhook_event(
    partner: IntegrationPartner,
    event_type: WebhookEventType,
    data: dict,
    background_tasks: Optional[BackgroundTasks] = None,
) -> Optional[WebhookDelivery]:
    """
    Send a webhook event to a partner.

    Args:
        partner: Partner to send to
        event_type: Type of event
        data: Event data payload
        background_tasks: Optional FastAPI background tasks

    Returns:
        WebhookDelivery record or None if not configured
    """
    if not partner.webhook_url:
        return None

    if event_type not in partner.webhook_events:
        return None

    payload = {
        "event_type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "partner_id": partner.partner_id,
        "data": data,
    }

    # Create delivery record
    delivery = WebhookDelivery(
        partner_id=partner.partner_id,
        event_type=event_type,
        payload=payload,
    )
    await delivery.insert()

    # Deliver in background if available
    if background_tasks:
        background_tasks.add_task(
            _deliver_webhook_with_retry,
            delivery=delivery,
            partner=partner,
        )
    else:
        await _deliver_webhook_with_retry(delivery=delivery, partner=partner)

    return delivery


async def _deliver_webhook(
    partner: IntegrationPartner,
    event_type: WebhookEventType,
    payload: dict,
    is_test: bool = False,
) -> dict:
    """Deliver a webhook and return result."""
    import json
    import time

    if not partner.webhook_url or not partner.webhook_secret:
        return {"success": False, "error": "Webhook not configured"}

    # Generate signature
    payload_str = json.dumps(payload, sort_keys=True)
    signature = hmac.new(
        partner.webhook_secret.encode("utf-8"),
        payload_str.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    headers = {
        "Content-Type": "application/json",
        "X-Olorin-Signature": f"sha256={signature}",
        "X-Olorin-Event": event_type,
        "X-Olorin-Delivery": "test"
        if is_test
        else str(datetime.now(timezone.utc).timestamp()),
    }

    start_time = time.time()

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                partner.webhook_url,
                json=payload,
                headers=headers,
                timeout=settings.PARTNER_WEBHOOK_TIMEOUT_SECONDS,
            )

        response_time_ms = (time.time() - start_time) * 1000

        return {
            "success": response.status_code < 400,
            "status_code": response.status_code,
            "response_time_ms": response_time_ms,
        }

    except httpx.TimeoutException:
        return {
            "success": False,
            "error": "Request timed out",
            "response_time_ms": (time.time() - start_time) * 1000,
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "response_time_ms": (time.time() - start_time) * 1000,
        }


async def _deliver_webhook_with_retry(
    delivery: WebhookDelivery,
    partner: IntegrationPartner,
    max_attempts: int = 3,
) -> None:
    """Deliver webhook with retry logic."""
    import asyncio
    import json

    for attempt in range(max_attempts):
        delivery.attempts = attempt + 1
        delivery.last_attempt_at = datetime.now(timezone.utc)

        result = await _deliver_webhook(
            partner=partner,
            event_type=delivery.event_type,
            payload=delivery.payload,
        )

        if result["success"]:
            delivery.delivered = True
            delivery.response_status_code = result.get("status_code")
            await delivery.save()
            logger.info(
                f"Webhook delivered to {partner.partner_id}: {delivery.event_type}"
            )
            return

        delivery.error_message = result.get("error")
        delivery.response_status_code = result.get("status_code")
        await delivery.save()

        # Exponential backoff before retry
        if attempt < max_attempts - 1:
            await asyncio.sleep(2**attempt)

    logger.warning(
        f"Webhook delivery failed after {max_attempts} attempts: "
        f"{partner.partner_id} - {delivery.event_type}"
    )
