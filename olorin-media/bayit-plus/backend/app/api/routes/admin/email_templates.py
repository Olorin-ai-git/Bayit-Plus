"""
Admin Email Template Preview API

Provides template listing and preview rendering for admin UI.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email/templates", tags=["admin", "email-templates"])


def _get_sample_context(template_name: str, lang: str) -> dict:
    """Generate sample context data for template preview."""
    from datetime import datetime

    base = {
        "lang": lang,
        "recipient_name": "Test User",
        "recipient_email": "test@example.com",
        "platform_name": "Bayit+",
        "logo_url": "",
        "header_url": "https://bayitplus.com",
        "unsubscribe_url": "https://bayitplus.com/unsubscribe",
        "privacy_url": "https://bayitplus.com/privacy",
        "terms_url": "https://bayitplus.com/terms",
        "support_url": "https://bayitplus.com/support",
        "company_name": "Bayit+ by Olorin.ai",
        "current_year": datetime.now().year,
    }

    # Template-specific sample data
    samples = {
        "transactional/welcome": {
            "dashboard_url": "https://bayitplus.com/dashboard",
        },
        "transactional/email_verification": {
            "verification_url": "https://bayitplus.com/verify?token=sample",
            "expiry_hours": 24,
        },
        "transactional/password_reset": {
            "reset_url": "https://bayitplus.com/reset?token=sample",
            "expiry_hours": 24,
        },
        "transactional/beta_invitation": {
            "invitation_url": "https://bayitplus.com/beta/join",
            "beta_credits": 5000,
            "beta_duration_days": 90,
        },
        "payment/payment_confirmation": {
            "transaction_id": "TXN-SAMPLE-001",
            "plan_name": "Premium",
            "amount": "9.99",
            "currency": "USD",
            "payment_date": "2026-01-30",
            "next_billing_date": "2026-02-28",
        },
        "payment/subscription_activated": {
            "plan_name": "Premium",
            "features": ["Live Dubbing", "AI Search", "Unlimited Streaming"],
            "expires_at": "2027-01-30",
        },
        "notification/support_ticket_created": {
            "ticket_id": "TKT-12345",
            "ticket_subject": "Sample Support Issue",
            "ticket_url": "https://bayitplus.com/support/tickets/12345",
        },
        "notification/gdpr_deletion_confirmation": {
            "deletion_date": "2026-02-15",
            "data_categories": [
                "Account data",
                "Watch history",
                "Preferences",
            ],
        },
    }

    return {**base, **samples.get(template_name, {})}


@router.get("")
async def list_templates(
    settings: Settings = Depends(get_settings),
) -> dict:
    """List all available email templates with metadata."""
    from app.services.email import get_email_service

    service = get_email_service(settings)
    templates = service._registry.list_templates()

    return {
        "templates": [
            {
                "name": t.name,
                "category": t.category,
                "description": t.description,
                "path": t.path,
            }
            for t in templates
        ],
        "total": len(templates),
    }


@router.get("/{template_name:path}/preview")
async def preview_template(
    template_name: str,
    lang: str = Query("en", description="Language code for preview"),
    settings: Settings = Depends(get_settings),
) -> dict:
    """
    Render a template preview with sample data.

    Template name uses path format: category/template_name
    Example: transactional/welcome
    """
    from datetime import datetime

    from app.services.email import get_email_service

    service = get_email_service(settings)

    # Verify template exists
    template_meta = service._registry.get_template(template_name)
    if not template_meta:
        raise HTTPException(
            status_code=404,
            detail=f"Template '{template_name}' not found",
        )

    # Generate sample context
    context = _get_sample_context(template_name, lang)

    try:
        rendered = service._engine.render(template_name, context)
        return {
            "template_name": template_name,
            "language": lang,
            "html": rendered.html,
            "plain_text": rendered.plain_text,
            "rendered_at": datetime.now().isoformat(),
        }
    except Exception as exc:
        logger.error(
            "Template preview rendering failed",
            extra={
                "template": template_name,
                "lang": lang,
                "error": str(exc),
            },
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to render template: {exc}",
        )
