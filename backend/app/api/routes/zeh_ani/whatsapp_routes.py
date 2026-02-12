"""Zeh Ani WhatsApp Contact and Webhook REST API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from twilio.request_validator import RequestValidator

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.user import User
from app.services.zeh_ani.biometric_consent_service import (
    biometric_consent_service,
)
from app.services.zeh_ani.whatsapp_bot_service import whatsapp_bot_service

logger = get_logger(__name__)
router = APIRouter(prefix="/zeh-ani", tags=["zeh-ani"])


class AddContactRequest(BaseModel):
    """Request body for adding a grandparent contact."""

    profile_id: str
    phone_number: str = Field(..., min_length=8, max_length=20)
    display_name: str = Field(..., max_length=100)
    relationship: str = Field(default="grandparent", max_length=50)
    language: str = Field(default="he", max_length=5)
    pin: str = Field(..., min_length=4, max_length=8)


def _contact_dict(contact) -> dict:
    """Convert a WhatsAppContact to API response dict."""
    return {
        "id": str(contact.id),
        "profile_id": contact.profile_id,
        "display_name": contact.display_name,
        "relationship": contact.relationship,
        "language": contact.language,
        "last_sent_at": (
            contact.last_sent_at.isoformat()
            if contact.last_sent_at else None
        ),
        "total_reels_sent": contact.total_reels_sent,
        "created_at": contact.created_at.isoformat(),
    }


@router.post("/contacts")
async def add_contact(
    body: AddContactRequest,
    user: User = Depends(get_current_user),
):
    """Add an approved grandparent WhatsApp contact after PIN verification."""
    try:
        await biometric_consent_service.verify_pin(str(user.id), body.pin)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc))

    contact = await whatsapp_bot_service.add_contact(
        user_id=str(user.id),
        profile_id=body.profile_id,
        phone_number=body.phone_number,
        display_name=body.display_name,
        relationship=body.relationship,
        language=body.language,
        approved_by_user_id=str(user.id),
    )

    logger.info(
        "WhatsApp contact added via API",
        extra={
            "user_id": str(user.id),
            "profile_id": body.profile_id,
        },
    )

    return _contact_dict(contact)


@router.get("/contacts/{profile_id}")
async def list_contacts(
    profile_id: str,
    user: User = Depends(get_current_user),
):
    """List all approved WhatsApp contacts for a child profile."""
    contacts = await whatsapp_bot_service.list_contacts(
        user_id=str(user.id),
        profile_id=profile_id,
    )
    return [_contact_dict(c) for c in contacts]


@router.delete("/contacts/{contact_id}")
async def remove_contact(
    contact_id: str,
    user: User = Depends(get_current_user),
):
    """Remove a WhatsApp contact."""
    success = await whatsapp_bot_service.remove_contact(
        contact_id=contact_id,
        user_id=str(user.id),
    )
    if not success:
        raise HTTPException(
            status_code=404, detail="Contact not found",
        )
    return {"success": True}


@router.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request):
    """
    Twilio incoming WhatsApp webhook.

    Secured via Twilio request signature verification using X-Twilio-Signature
    header validated against the auth token and webhook URL.
    """
    form_data = await request.form()
    params = {k: str(v) for k, v in form_data.items()}

    signature = request.headers.get("X-Twilio-Signature", "")
    validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
    if not validator.validate(
        settings.TWILIO_WHATSAPP_WEBHOOK_URL,
        params,
        signature,
    ):
        logger.warning(
            "Twilio webhook signature verification failed",
            extra={"path": request.url.path},
        )
        raise HTTPException(status_code=403, detail="Invalid signature")

    from_number = params.get("From", "")
    message_body = params.get("Body") or None
    media_url = params.get("MediaUrl0") or None

    from_hash = whatsapp_bot_service.hash_phone_number(
        from_number.replace("whatsapp:", ""),
    )

    result = await whatsapp_bot_service.handle_incoming_reply(
        from_number_hash=from_hash,
        message_body=message_body,
        media_url=media_url,
    )

    logger.info(
        "WhatsApp webhook processed",
        extra={"status": result.get("status")},
    )

    return result
