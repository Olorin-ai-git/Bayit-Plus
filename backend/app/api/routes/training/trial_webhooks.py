"""Stripe webhook handlers for trial lifecycle transitions (Tasks 13-16).

Each handler receives the full Stripe event dict and performs atomic
MongoDB updates via PyMongo collection to avoid Beanie save() issues
with nested dicts.
"""

import logging
from datetime import datetime, timedelta, timezone

from app.api.routes.training.dependencies import _parse_trial_config
from app.models.integration_partner import IntegrationPartner
from app.models.platform_config import PlatformConfig
from app.models.trial_history import TrialHistory
from app.services.training import trial_emails

logger = logging.getLogger(__name__)


def _org_name(partner) -> str:
    """Extract org display name from partner training_config."""
    tc = partner.training_config
    if isinstance(tc, dict):
        return tc.get("org_display_name", partner.name or "")
    return getattr(tc, "org_display_name", partner.name or "")


async def _find_partner_by_sub(sub_id: str):
    """Look up partner by stripe_subscription_id inside trial_config."""
    return await IntegrationPartner.find_one(
        {"training_config.trial_config.stripe_subscription_id": sub_id}
    )


async def handle_invoice_paid(event: dict) -> None:
    """Task 13: invoice.paid -> transition trial to 'converted'.

    Sets org_tier to selected_tier, updates credit and seat limits
    from PlatformConfig, records outcome in TrialHistory.
    """
    invoice = event["data"]["object"]
    sub_id = invoice.get("subscription")
    if not sub_id:
        return

    partner = await _find_partner_by_sub(sub_id)
    if partner is None:
        return

    tc = _parse_trial_config(partner)
    if tc is None or tc.state == "converted":
        return  # idempotent

    pc = await PlatformConfig.get_singleton()
    selected_tier = tc.selected_tier

    credit_limit = pc.tier_limits.get(selected_tier, pc.tier_limits.get("team"))
    seat_limit = pc.seat_limits.get(selected_tier, pc.seat_limits.get("team"))

    now = datetime.now(timezone.utc)
    await IntegrationPartner.get_pymongo_collection().update_one(
        {"_id": partner.id},
        {"$set": {
            "training_config.trial_config.state": "converted",
            "training_config.org_tier": selected_tier,
            "training_config.credit_limit_monthly": credit_limit,
            "training_config.seat_limit": seat_limit,
        }},
    )

    await TrialHistory.get_pymongo_collection().update_one(
        {"partner_id": str(partner.partner_id)},
        {"$set": {"outcome": "converted", "outcome_at": now}},
    )
    logger.info(
        "Trial converted for partner %s -> tier %s",
        partner.partner_id, selected_tier,
    )
    await trial_emails.send_converted(
        partner.id, partner.contact_email, _org_name(partner), selected_tier,
    )


async def handle_invoice_payment_failed(event: dict) -> None:
    """Task 14: invoice.payment_failed -> transition active trial to 'grace'.

    Sets locked_at to now + grace_days.  Only transitions from 'active'.
    """
    invoice = event["data"]["object"]
    sub_id = invoice.get("subscription")
    if not sub_id:
        return

    partner = await _find_partner_by_sub(sub_id)
    if partner is None:
        return

    tc = _parse_trial_config(partner)
    if tc is None or tc.state != "active":
        return

    pc = await PlatformConfig.get_singleton()
    now = datetime.now(timezone.utc)
    locked_at = now + timedelta(days=pc.trial_defaults.grace_days)

    await IntegrationPartner.get_pymongo_collection().update_one(
        {"_id": partner.id},
        {"$set": {
            "training_config.trial_config.state": "grace",
            "training_config.trial_config.locked_at": locked_at,
        }},
    )
    logger.info(
        "Trial payment failed for %s, transitioned to grace (locked_at=%s)",
        partner.partner_id, locked_at.isoformat(),
    )
    await trial_emails.send_payment_failed(
        partner.id, partner.contact_email, _org_name(partner),
    )


async def handle_trial_will_end(event: dict) -> None:
    """Task 15: customer.subscription.trial_will_end -> record + send warning.

    No state change. Idempotent via sent_emails dict check.
    """
    subscription = event["data"]["object"]
    sub_id = subscription.get("id")
    if not sub_id:
        return

    partner = await _find_partner_by_sub(sub_id)
    if partner is None:
        return

    tc = _parse_trial_config(partner)
    if tc is None:
        return

    if "training_trial_ending_soon" in tc.sent_emails:
        return  # idempotent

    await IntegrationPartner.get_pymongo_collection().update_one(
        {"_id": partner.id},
        {"$set": {
            "training_config.trial_config.sent_emails.training_trial_ending_soon": (
                datetime.now(timezone.utc)
            ),
        }},
    )
    logger.info("Trial ending-soon email marked for %s", partner.partner_id)
    await trial_emails.send_trial_ending_soon(
        partner.id, partner.contact_email, _org_name(partner),
    )


async def handle_subscription_deleted(event: dict) -> None:
    """Task 16: customer.subscription.deleted -> transition to 'cancelled'.

    Replaces the old handler that incorrectly reverted org_tier to 'team'
    with 500 credits. Now sets purge_at and records TrialHistory outcome.
    """
    subscription = event["data"]["object"]
    sub_id = subscription.get("id")
    if not sub_id:
        return

    partner = await _find_partner_by_sub(sub_id)
    if partner is None:
        return

    tc = _parse_trial_config(partner)
    if tc is None:
        return

    pc = await PlatformConfig.get_singleton()
    now = datetime.now(timezone.utc)
    purge_at = now + timedelta(days=pc.trial_defaults.lock_days)

    await IntegrationPartner.get_pymongo_collection().update_one(
        {"_id": partner.id},
        {"$set": {
            "training_config.trial_config.state": "cancelled",
            "training_config.trial_config.purge_at": purge_at,
        }},
    )

    await TrialHistory.get_pymongo_collection().update_one(
        {"partner_id": str(partner.partner_id)},
        {"$set": {"outcome": "cancelled", "outcome_at": now}},
    )
    logger.info(
        "Trial cancelled for %s, purge_at=%s",
        partner.partner_id, purge_at.isoformat(),
    )
