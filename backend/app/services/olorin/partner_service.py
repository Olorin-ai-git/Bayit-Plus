"""
Partner Service — capability/webhook management, crypto helpers, singleton.

Split: partner_defaults.py (rate-limit tables), partner_crud.py (DB ops).
All original import paths remain valid via delegation and re-export.
"""

import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timezone
from typing import Optional

import bcrypt

from app.core.config import settings
from app.models.integration_partner import (
    CapabilityConfig,
    IntegrationPartner,
    RateLimitConfig,
    WebhookEventType,
)

from . import partner_crud as _crud
from .partner_defaults import (
    get_default_rate_limits,
    get_training_tier_defaults,
)

logger = logging.getLogger(__name__)


class PartnerService:
    """Service for managing integration partners."""

    def __init__(self) -> None:
        self._api_key_salt = settings.olorin.partner.api_key_salt

    # CRUD delegation — keeps the original method signatures intact

    async def create_partner(
        self,
        partner_id: str,
        name: str,
        contact_email: str,
        *,
        name_en: Optional[str] = None,
        contact_name: Optional[str] = None,
        billing_tier: str = "standard",
        capabilities: Optional[list[str]] = None,
    ) -> tuple[IntegrationPartner, str]:
        """Create a new integration partner. See partner_crud.create_partner."""
        return await _crud.create_partner(
            self,
            partner_id,
            name,
            contact_email,
            name_en=name_en,
            contact_name=contact_name,
            billing_tier=billing_tier,
            capabilities=capabilities,
        )

    async def authenticate_by_api_key(self, api_key: str) -> Optional[IntegrationPartner]:
        return await _crud.authenticate_by_api_key(self, api_key)

    async def get_partner(self, partner_id: str) -> Optional[IntegrationPartner]:
        return await _crud.get_partner(partner_id)

    async def update_partner(self, partner_id: str, **updates) -> Optional[IntegrationPartner]:
        return await _crud.update_partner(partner_id, **updates)

    async def regenerate_api_key(self, partner_id: str) -> Optional[tuple[IntegrationPartner, str]]:
        return await _crud.regenerate_api_key(self, partner_id)

    async def suspend_partner(self, partner_id: str, reason: str) -> Optional[IntegrationPartner]:
        return await _crud.suspend_partner(partner_id, reason)

    async def unsuspend_partner(self, partner_id: str) -> Optional[IntegrationPartner]:
        return await _crud.unsuspend_partner(partner_id)

    # Capability management

    async def enable_capability(
        self,
        partner_id: str,
        capability: str,
        rate_limits: Optional[RateLimitConfig] = None,
    ) -> Optional[IntegrationPartner]:
        """Enable a capability for a partner."""
        partner = await self.get_partner(partner_id)
        if not partner:
            return None

        if rate_limits is None:
            rate_limits = get_default_rate_limits(partner.billing_tier, capability)

        partner.capabilities[capability] = CapabilityConfig(
            enabled=True,
            rate_limits=rate_limits,
        )
        partner.updated_at = datetime.now(timezone.utc)

        await partner.save()
        logger.info("Enabled capability '%s' for partner: %s", capability, partner_id)

        return partner

    async def disable_capability(
        self,
        partner_id: str,
        capability: str,
    ) -> Optional[IntegrationPartner]:
        """Disable a capability for a partner."""
        partner = await self.get_partner(partner_id)
        if not partner:
            return None

        if capability in partner.capabilities:
            partner.capabilities[capability].enabled = False
            partner.updated_at = datetime.now(timezone.utc)
            await partner.save()
            logger.info(
                "Disabled capability '%s' for partner: %s", capability, partner_id
            )

        return partner

    # Webhook management

    async def configure_webhook(
        self,
        partner_id: str,
        webhook_url: str,
        events: list[WebhookEventType],
        secret: Optional[str] = None,
    ) -> Optional[IntegrationPartner]:
        """Configure webhook for a partner."""
        partner = await self.get_partner(partner_id)
        if not partner:
            return None

        partner.webhook_url = webhook_url
        partner.webhook_events = events
        partner.webhook_secret = secret or secrets.token_urlsafe(32)
        partner.updated_at = datetime.now(timezone.utc)

        await partner.save()
        logger.info("Configured webhook for partner: %s", partner_id)

        return partner

    def generate_webhook_signature(
        self, partner: IntegrationPartner, payload: str
    ) -> str:
        """Return ``sha256=<hex>`` HMAC signature; raises ValueError if no secret."""
        if not partner.webhook_secret:
            raise ValueError("Partner has no webhook secret configured")

        signature = hmac.new(
            partner.webhook_secret.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        return f"sha256={signature}"

    # Training-tier helper (re-exported from partner_defaults)

    def get_training_tier_defaults(self) -> dict[str, CapabilityConfig]:
        """Return default capability configs for a training-tier partner."""
        return get_training_tier_defaults()

    # Cryptography helpers (internal, used by partner_crud via svc arg)

    def _generate_api_key(self) -> str:
        """Generate a secure API key with the olorin_ prefix."""
        return f"olorin_{secrets.token_urlsafe(32)}"

    def _hash_api_key(self, api_key: str) -> str:
        """Hash an API key using bcrypt + configured salt."""
        salted = f"{api_key}{self._api_key_salt}"
        return bcrypt.hashpw(salted.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def _verify_api_key(self, api_key: str, hashed: str) -> bool:
        """Verify a raw API key against its stored bcrypt hash."""
        salted = f"{api_key}{self._api_key_salt}"
        try:
            return bcrypt.checkpw(salted.encode("utf-8"), hashed.encode("utf-8"))
        except Exception:
            return False


# Singleton instance — importable from the original path.
partner_service = PartnerService()
