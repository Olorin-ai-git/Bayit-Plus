"""Hourly trial state scheduler. See spec section 'Cron scheduler'.

Queries all partners with active/grace/locked trials and transitions
them when their time boundary has been crossed. Idempotent — re-running
produces the same result. Email dispatch is delegated to trial_emails
(idempotent — safe to call even if marker was already written).
"""
import logging
from datetime import datetime, timedelta, timezone

from app.models.integration_partner import IntegrationPartner
from app.models.platform_config import PlatformConfig
from app.models.trial_history import TrialHistory
from app.services.training import trial_emails

logger = logging.getLogger(__name__)

_SCHEDULABLE_STATES = ["active", "grace", "locked"]


def _to_dt(val) -> datetime | None:
    """Coerce a value to a tz-aware datetime.

    Handles BSON datetimes (naive UTC from PyMongo), aware datetimes,
    and ISO-8601 strings (from model_dump(mode='json')).
    """
    if val is None:
        return None
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    if isinstance(val, str):
        dt = datetime.fromisoformat(val)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return None


async def run_trial_scheduler() -> None:
    """Check all active/grace/locked trials and transition if boundary crossed."""
    now = datetime.now(timezone.utc)
    pc = await PlatformConfig.get_singleton()

    cursor = IntegrationPartner.get_pymongo_collection().find(
        {"training_config.trial_config.state": {"$in": _SCHEDULABLE_STATES}},
    )

    async for doc in cursor:
        doc_id = doc["_id"]
        partner_slug = doc.get("partner_id", str(doc_id))
        tconf = doc.get("training_config") or {}
        tc = tconf.get("trial_config") or {}
        state = tc.get("state")
        if not state:
            continue

        email = doc.get("contact_email", "")
        org = tconf.get("org_display_name", doc.get("name", ""))

        if state == "active":
            await _handle_active(now, doc_id, partner_slug, tc, pc, email, org)
        elif state == "grace":
            await _handle_grace(now, doc_id, partner_slug, tc, pc, email, org)
        elif state == "locked":
            await _handle_locked(now, doc_id, partner_slug, tc, email, org)


async def _handle_active(
    now: datetime,
    doc_id,
    partner_slug: str,
    tc: dict,
    pc: PlatformConfig,
    email: str,
    org: str,
) -> None:
    """active -> grace on expiry; mid-trial email markers + dispatch."""
    coll = IntegrationPartner.get_pymongo_collection()
    expires_at = _to_dt(tc.get("expires_at"))

    if expires_at and now >= expires_at:
        locked_at = now + timedelta(days=pc.trial_defaults.grace_days)
        await coll.update_one(
            {"_id": doc_id},
            {"$set": {
                "training_config.trial_config.state": "grace",
                "training_config.trial_config.locked_at": locked_at,
            }},
        )
        logger.info("trial.active_to_grace", extra={"partner_id": partner_slug})
        return

    started_at = _to_dt(tc.get("started_at"))
    if not started_at:
        return
    days_elapsed = (now - started_at).days
    sent = tc.get("sent_emails") or {}

    if days_elapsed >= 7 and "training_trial_midpoint" not in sent:
        await coll.update_one(
            {"_id": doc_id},
            {"$set": {"training_config.trial_config.sent_emails.training_trial_midpoint": now}},
        )
        await trial_emails.send_trial_midpoint(doc_id, email, org)
    elif days_elapsed >= 3 and "training_trial_activation" not in sent:
        await coll.update_one(
            {"_id": doc_id},
            {"$set": {"training_config.trial_config.sent_emails.training_trial_activation": now}},
        )
        await trial_emails.send_trial_activation(doc_id, email, org)


async def _handle_grace(
    now: datetime,
    doc_id,
    partner_slug: str,
    tc: dict,
    pc: PlatformConfig,
    email: str,
    org: str,
) -> None:
    """grace -> locked when locked_at reached."""
    locked_at = _to_dt(tc.get("locked_at"))
    if not locked_at or now < locked_at:
        return

    purge_at = now + timedelta(days=pc.trial_defaults.lock_days)
    await IntegrationPartner.get_pymongo_collection().update_one(
        {"_id": doc_id},
        {"$set": {
            "training_config.trial_config.state": "locked",
            "training_config.trial_config.purge_at": purge_at,
        }},
    )

    await TrialHistory.get_pymongo_collection().update_one(
        {"partner_id": partner_slug, "outcome": None},
        {"$set": {"outcome": "locked", "outcome_at": now}},
    )
    logger.info("trial.grace_to_locked", extra={"partner_id": partner_slug})
    await trial_emails.send_trial_locked(doc_id, email, org)


async def _handle_locked(
    now: datetime, doc_id, partner_slug: str, tc: dict,
    email: str, org: str,
) -> None:
    """locked -> purged when purge_at reached; mid-lock email markers."""
    purge_at = _to_dt(tc.get("purge_at"))
    if not purge_at:
        return

    if now >= purge_at:
        await IntegrationPartner.get_pymongo_collection().update_one(
            {"_id": doc_id},
            {"$set": {
                "training_config.trial_config.state": "purged",
                "training_config.branding": None,
            }},
        )
        await TrialHistory.get_pymongo_collection().update_one(
            {"partner_id": partner_slug, "outcome": None},
            {"$set": {"outcome": "purged", "outcome_at": now}},
        )
        logger.info("trial.locked_to_purged", extra={"partner_id": partner_slug})
        return

    sent = tc.get("sent_emails") or {}
    days_until_purge = (purge_at - now).days

    if days_until_purge <= 3 and "training_final_warning" not in sent:
        await IntegrationPartner.get_pymongo_collection().update_one(
            {"_id": doc_id},
            {"$set": {"training_config.trial_config.sent_emails.training_final_warning": now}},
        )
        await trial_emails.send_final_warning(doc_id, email, org)
    elif days_until_purge <= 20 and "training_last_chance" not in sent:
        await IntegrationPartner.get_pymongo_collection().update_one(
            {"_id": doc_id},
            {"$set": {"training_config.trial_config.sent_emails.training_last_chance": now}},
        )
        await trial_emails.send_last_chance(doc_id, email, org)
