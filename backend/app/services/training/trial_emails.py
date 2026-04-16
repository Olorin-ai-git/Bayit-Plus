"""Idempotent trial email dispatch. See spec section 'Email Cadence'.

Each send_* function checks the partner's sent_emails dict before sending,
and records the timestamp after. Safe to call multiple times.
"""
import logging
from datetime import datetime, timezone

from app.models.integration_partner import IntegrationPartner
from app.services.bayit_email_service import get_bayit_email_service

logger = logging.getLogger(__name__)

_SUBJECTS: dict[str, str] = {
    "training_trial_welcome": "Welcome to Olorin Training - Your trial has started",
    "training_trial_activation": "Getting started with Olorin Training",
    "training_trial_midpoint": "You're halfway through your trial",
    "training_trial_ending_soon": "Your Olorin Training trial ends soon",
    "training_converted": "Welcome aboard - subscription confirmed",
    "training_payment_failed": "Action needed: payment issue on your account",
    "training_locked": "Your Olorin Training account has been locked",
    "training_last_chance": "Last chance to reactivate your account",
    "training_final_warning": "Final notice: data deletion in 3 days",
    "training_retrial_blocked": "Unable to start a new trial",
}


async def _send_idempotent(
    partner_id, template: str, to_email: str, context: dict,
) -> bool:
    """Send email if not already sent for this partner+template.

    Returns True if sent (or send attempted), False if already sent.
    """
    key = f"training_config.trial_config.sent_emails.{template}"
    coll = IntegrationPartner.get_pymongo_collection()

    doc = await coll.find_one(
        {"_id": partner_id, key: {"$exists": True}},
        {"_id": 1},
    )
    if doc:
        return False

    await _dispatch_email(template, to_email, context)

    await coll.update_one(
        {"_id": partner_id},
        {"$set": {key: datetime.now(timezone.utc)}},
    )
    return True


async def _dispatch_email(template: str, to_email: str, context: dict) -> None:
    """Render template and send via BayitEmailService.

    Errors are logged but never raised — email failures must not block
    state transitions or API responses.
    """
    try:
        svc = get_bayit_email_service()
        html = svc.template_renderer.render(f"{template}.html", context)
        subject = _SUBJECTS.get(template, "Olorin Training")
        await svc.core_service.send(
            to=[to_email], subject=subject, html_content=html,
        )
    except Exception:
        logger.exception(
            "trial_email.dispatch_failed",
            extra={"template": template, "to": to_email},
        )


async def send_trial_welcome(
    partner_id, email: str, org_name: str, expires_at: str,
) -> bool:
    return await _send_idempotent(
        partner_id, "training_trial_welcome", email,
        {"org_name": org_name, "expires_at": expires_at},
    )


async def send_trial_activation(
    partner_id, email: str, org_name: str,
) -> bool:
    return await _send_idempotent(
        partner_id, "training_trial_activation", email,
        {"org_name": org_name},
    )


async def send_trial_midpoint(
    partner_id, email: str, org_name: str,
) -> bool:
    return await _send_idempotent(
        partner_id, "training_trial_midpoint", email,
        {"org_name": org_name},
    )


async def send_trial_ending_soon(
    partner_id, email: str, org_name: str,
) -> bool:
    return await _send_idempotent(
        partner_id, "training_trial_ending_soon", email,
        {"org_name": org_name},
    )


async def send_converted(
    partner_id, email: str, org_name: str, tier: str,
) -> bool:
    return await _send_idempotent(
        partner_id, "training_converted", email,
        {"org_name": org_name, "tier": tier},
    )


async def send_payment_failed(
    partner_id, email: str, org_name: str,
) -> bool:
    return await _send_idempotent(
        partner_id, "training_payment_failed", email,
        {"org_name": org_name},
    )


async def send_trial_locked(
    partner_id, email: str, org_name: str,
) -> bool:
    return await _send_idempotent(
        partner_id, "training_locked", email,
        {"org_name": org_name},
    )


async def send_last_chance(
    partner_id, email: str, org_name: str,
) -> bool:
    return await _send_idempotent(
        partner_id, "training_last_chance", email,
        {"org_name": org_name},
    )


async def send_final_warning(
    partner_id, email: str, org_name: str,
) -> bool:
    return await _send_idempotent(
        partner_id, "training_final_warning", email,
        {"org_name": org_name},
    )


async def send_retrial_blocked(email: str) -> None:
    """Not idempotent (no partner context). Direct dispatch."""
    await _dispatch_email("training_retrial_blocked", email, {})
