"""
Partner CRUD — database operations for IntegrationPartner documents.

Covers create, authenticate, get, update, regenerate_api_key, suspend,
unsuspend. Crypto helpers are passed in via a PartnerService reference to
avoid a circular import.
"""

import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from app.models.integration_partner import CapabilityConfig, IntegrationPartner

from .partner_defaults import get_default_rate_limits

if TYPE_CHECKING:
    from .partner_service import PartnerService

logger = logging.getLogger(__name__)


async def create_partner(
    svc: "PartnerService",
    partner_id: str,
    name: str,
    contact_email: str,
    *,
    name_en: Optional[str] = None,
    contact_name: Optional[str] = None,
    billing_tier: str = "standard",
    capabilities: Optional[list[str]] = None,
) -> tuple[IntegrationPartner, str]:
    """Create a new integration partner; raises ValueError if ID exists."""
    existing = await IntegrationPartner.find_one({"partner_id": partner_id})
    if existing:
        raise ValueError(f"Partner with ID '{partner_id}' already exists")

    raw_api_key = svc._generate_api_key()
    api_key_hash = svc._hash_api_key(raw_api_key)
    api_key_prefix = raw_api_key[:8]

    capability_configs: dict[str, CapabilityConfig] = {}
    if capabilities:
        for capability in capabilities:
            capability_configs[capability] = CapabilityConfig(
                enabled=True,
                rate_limits=get_default_rate_limits(billing_tier, capability),
            )

    partner = IntegrationPartner(
        partner_id=partner_id,
        name=name,
        name_en=name_en,
        api_key_hash=api_key_hash,
        api_key_prefix=api_key_prefix,
        contact_email=contact_email,
        contact_name=contact_name,
        billing_tier=billing_tier,
        capabilities=capability_configs,
    )

    await partner.insert()
    logger.info("Created integration partner: %s", partner_id)
    return partner, raw_api_key


async def authenticate_by_api_key(
    svc: "PartnerService",
    api_key: str,
) -> Optional[IntegrationPartner]:
    """Return the active, non-suspended partner matching api_key, or None."""
    if not api_key or len(api_key) < 8:
        return None

    prefix = api_key[:8]
    candidates = await IntegrationPartner.find(
        {"api_key_prefix": prefix, "is_active": True},
    ).to_list()

    if not candidates:
        return None

    partner = None
    for candidate in candidates:
        if svc._verify_api_key(api_key, candidate.api_key_hash):
            partner = candidate
            break

    if not partner:
        logger.warning("API key verification failed for partner prefix: %s", prefix)
        return None

    if partner.suspended_at:
        logger.warning("Partner %s is suspended", partner.partner_id)
        return None

    partner.last_active_at = datetime.now(timezone.utc)
    await partner.save()
    return partner


async def get_partner(partner_id: str) -> Optional[IntegrationPartner]:
    """Fetch a partner document by partner_id slug."""
    return await IntegrationPartner.find_one({"partner_id": partner_id})


async def update_partner(
    partner_id: str,
    **updates,
) -> Optional[IntegrationPartner]:
    """Apply arbitrary field updates to a partner; returns None if not found."""
    partner = await get_partner(partner_id)
    if not partner:
        return None

    for key, value in updates.items():
        if hasattr(partner, key):
            setattr(partner, key, value)

    partner.updated_at = datetime.now(timezone.utc)
    await partner.save()
    logger.info("Updated partner %s: %s", partner_id, list(updates.keys()))
    return partner


async def regenerate_api_key(
    svc: "PartnerService",
    partner_id: str,
) -> Optional[tuple[IntegrationPartner, str]]:
    """Issue a new API key, invalidating the previous one."""
    partner = await get_partner(partner_id)
    if not partner:
        return None

    raw_api_key = svc._generate_api_key()
    partner.api_key_hash = svc._hash_api_key(raw_api_key)
    partner.api_key_prefix = raw_api_key[:8]
    partner.updated_at = datetime.now(timezone.utc)

    await partner.save()
    logger.info("Regenerated API key for partner: %s", partner_id)
    return partner, raw_api_key


async def suspend_partner(
    partner_id: str,
    reason: str,
) -> Optional[IntegrationPartner]:
    """Suspend a partner, blocking future authentication."""
    partner = await get_partner(partner_id)
    if not partner:
        return None

    partner.suspended_at = datetime.now(timezone.utc)
    partner.suspension_reason = reason
    partner.updated_at = datetime.now(timezone.utc)

    await partner.save()
    logger.warning("Suspended partner %s: %s", partner_id, reason)
    return partner


async def unsuspend_partner(partner_id: str) -> Optional[IntegrationPartner]:
    """Lift the suspension on a partner."""
    partner = await get_partner(partner_id)
    if not partner:
        return None

    partner.suspended_at = None
    partner.suspension_reason = None
    partner.updated_at = datetime.now(timezone.utc)

    await partner.save()
    logger.info("Unsuspended partner: %s", partner_id)
    return partner
