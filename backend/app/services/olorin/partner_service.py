"""
Partner Service for Olorin.ai Platform

Handles partner registration, authentication, and management.
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

logger = logging.getLogger(__name__)


class PartnerService:
    """Service for managing integration partners."""

    def __init__(self):
        """Initialize partner service."""
        # Use new nested configuration
        self._api_key_salt = settings.olorin.partner.api_key_salt

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
        """
        Create a new integration partner.

        Args:
            partner_id: Unique slug identifier
            name: Display name (Hebrew)
            contact_email: Primary contact email
            name_en: Display name (English)
            contact_name: Contact person name
            billing_tier: Billing tier (free, standard, enterprise)
            capabilities: List of capability types to enable

        Returns:
            Tuple of (partner document, raw API key)

        Raises:
            ValueError: If partner_id already exists
        """
        # Check for existing partner
        existing = await IntegrationPartner.find_one(
            IntegrationPartner.partner_id == partner_id
        )
        if existing:
            raise ValueError(f"Partner with ID '{partner_id}' already exists")

        # Generate API key
        raw_api_key = self._generate_api_key()
        api_key_hash = self._hash_api_key(raw_api_key)
        api_key_prefix = raw_api_key[:8]

        # Build capability configurations
        capability_configs: dict[str, CapabilityConfig] = {}
        if capabilities:
            for capability in capabilities:
                capability_configs[capability] = CapabilityConfig(
                    enabled=True,
                    rate_limits=self._get_default_rate_limits(billing_tier, capability),
                )

        # Create partner document
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
        logger.info(f"Created integration partner: {partner_id}")

        return partner, raw_api_key

    async def authenticate_by_api_key(
        self, api_key: str
    ) -> Optional[IntegrationPartner]:
        """
        Authenticate a partner by API key.

        Args:
            api_key: Raw API key from request header

        Returns:
            Partner document if authenticated, None otherwise
        """
        if not api_key or len(api_key) < 8:
            return None

        # Find by prefix first (efficient lookup)
        prefix = api_key[:8]
        partner = await IntegrationPartner.find_one(
            IntegrationPartner.api_key_prefix == prefix,
            IntegrationPartner.is_active == True,  # noqa: E712
        )

        if not partner:
            return None

        # Verify full key hash
        if not self._verify_api_key(api_key, partner.api_key_hash):
            logger.warning(f"API key verification failed for partner prefix: {prefix}")
            return None

        # Check if suspended
        if partner.suspended_at:
            logger.warning(f"Partner {partner.partner_id} is suspended")
            return None

        # Update last active timestamp
        partner.last_active_at = datetime.now(timezone.utc)
        await partner.save()

        return partner

    async def get_partner(self, partner_id: str) -> Optional[IntegrationPartner]:
        """Get partner by ID."""
        return await IntegrationPartner.find_one(
            IntegrationPartner.partner_id == partner_id
        )

    async def update_partner(
        self,
        partner_id: str,
        **updates,
    ) -> Optional[IntegrationPartner]:
        """
        Update partner configuration.

        Args:
            partner_id: Partner identifier
            **updates: Fields to update

        Returns:
            Updated partner document
        """
        partner = await self.get_partner(partner_id)
        if not partner:
            return None

        # Apply updates
        for key, value in updates.items():
            if hasattr(partner, key):
                setattr(partner, key, value)

        partner.updated_at = datetime.now(timezone.utc)
        await partner.save()

        logger.info(f"Updated partner {partner_id}: {list(updates.keys())}")
        return partner

    async def regenerate_api_key(
        self, partner_id: str
    ) -> Optional[tuple[IntegrationPartner, str]]:
        """
        Generate a new API key for a partner.

        Args:
            partner_id: Partner identifier

        Returns:
            Tuple of (updated partner, new raw API key) or None
        """
        partner = await self.get_partner(partner_id)
        if not partner:
            return None

        # Generate new key
        raw_api_key = self._generate_api_key()
        partner.api_key_hash = self._hash_api_key(raw_api_key)
        partner.api_key_prefix = raw_api_key[:8]
        partner.updated_at = datetime.now(timezone.utc)

        await partner.save()
        logger.info(f"Regenerated API key for partner: {partner_id}")

        return partner, raw_api_key

    async def suspend_partner(
        self,
        partner_id: str,
        reason: str,
    ) -> Optional[IntegrationPartner]:
        """Suspend a partner."""
        partner = await self.get_partner(partner_id)
        if not partner:
            return None

        partner.suspended_at = datetime.now(timezone.utc)
        partner.suspension_reason = reason
        partner.updated_at = datetime.now(timezone.utc)

        await partner.save()
        logger.warning(f"Suspended partner {partner_id}: {reason}")

        return partner

    async def unsuspend_partner(self, partner_id: str) -> Optional[IntegrationPartner]:
        """Remove suspension from a partner."""
        partner = await self.get_partner(partner_id)
        if not partner:
            return None

        partner.suspended_at = None
        partner.suspension_reason = None
        partner.updated_at = datetime.now(timezone.utc)

        await partner.save()
        logger.info(f"Unsuspended partner: {partner_id}")

        return partner

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
            rate_limits = self._get_default_rate_limits(
                partner.billing_tier, capability
            )

        partner.capabilities[capability] = CapabilityConfig(
            enabled=True,
            rate_limits=rate_limits,
        )
        partner.updated_at = datetime.now(timezone.utc)

        await partner.save()
        logger.info(f"Enabled capability '{capability}' for partner: {partner_id}")

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
            logger.info(f"Disabled capability '{capability}' for partner: {partner_id}")

        return partner

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
        logger.info(f"Configured webhook for partner: {partner_id}")

        return partner

    def generate_webhook_signature(
        self, partner: IntegrationPartner, payload: str
    ) -> str:
        """
        Generate HMAC signature for webhook payload.

        Args:
            partner: Partner document
            payload: JSON payload string

        Returns:
            HMAC-SHA256 signature
        """
        if not partner.webhook_secret:
            raise ValueError("Partner has no webhook secret configured")

        signature = hmac.new(
            partner.webhook_secret.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        return f"sha256={signature}"

    def _generate_api_key(self) -> str:
        """Generate a secure API key."""
        # Format: olorin_<random_bytes>
        random_part = secrets.token_urlsafe(32)
        return f"olorin_{random_part}"

    def _hash_api_key(self, api_key: str) -> str:
        """Hash an API key using bcrypt."""
        salted = f"{api_key}{self._api_key_salt}"
        return bcrypt.hashpw(salted.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def _verify_api_key(self, api_key: str, hashed: str) -> bool:
        """Verify an API key against its hash."""
        salted = f"{api_key}{self._api_key_salt}"
        try:
            return bcrypt.checkpw(salted.encode("utf-8"), hashed.encode("utf-8"))
        except Exception:
            return False

    def _get_default_rate_limits(
        self, billing_tier: str, capability: str
    ) -> RateLimitConfig:
        """Get default rate limits based on billing tier and capability."""
        # Base limits by tier
        tier_multipliers = {
            "free": 1,
            "standard": 5,
            "enterprise": 20,
        }
        multiplier = tier_multipliers.get(billing_tier, 1)

        # Base limits (for "free" tier)
        base_limits = {
            "realtime_dubbing": RateLimitConfig(
                requests_per_minute=10 * multiplier,
                requests_per_hour=100 * multiplier,
                requests_per_day=500 * multiplier,
                concurrent_sessions=2 * multiplier,
                max_audio_seconds_per_request=300,
            ),
            "semantic_search": RateLimitConfig(
                requests_per_minute=30 * multiplier,
                requests_per_hour=500 * multiplier,
                requests_per_day=5000 * multiplier,
                concurrent_sessions=10 * multiplier,
            ),
            "cultural_context": RateLimitConfig(
                requests_per_minute=60 * multiplier,
                requests_per_hour=1000 * multiplier,
                requests_per_day=10000 * multiplier,
                concurrent_sessions=20 * multiplier,
            ),
            "recap_agent": RateLimitConfig(
                requests_per_minute=10 * multiplier,
                requests_per_hour=100 * multiplier,
                requests_per_day=500 * multiplier,
                concurrent_sessions=5 * multiplier,
            ),
        }

        return base_limits.get(capability, RateLimitConfig())


# Singleton instance
partner_service = PartnerService()
