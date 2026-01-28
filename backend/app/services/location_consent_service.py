"""Location consent tracking service for GDPR compliance."""
import logging
from datetime import datetime, timezone

from app.models.user import User

logger = logging.getLogger(__name__)


class LocationConsentService:
    """Manages user location consent and data retention policies."""

    async def grant_location_consent(
        self, user_id: str, retention_days: int = 90
    ) -> bool:
        """Record user granting location consent.

        Args:
            user_id: User ID granting consent
            retention_days: Days to retain location data (default 90)

        Returns:
            True if consent was recorded successfully
        """
        try:
            user = await User.get(user_id)
            if not user:
                logger.warning("User not found for consent", extra={"user_id": user_id})
                return False

            user.preferences["location_consent_given"] = True
            user.preferences["location_consent_timestamp"] = datetime.now(
                timezone.utc
            ).isoformat()
            user.preferences["location_data_retention_days"] = retention_days
            await user.save()

            logger.info(
                "Location consent granted",
                extra={"user_id": user_id, "retention_days": retention_days},
            )
            return True
        except Exception as e:
            logger.error("Error granting location consent", extra={"error": str(e)})
            return False

    async def revoke_location_consent(self, user_id: str) -> bool:
        """Revoke user's location consent.

        Args:
            user_id: User ID revoking consent

        Returns:
            True if consent was revoked successfully
        """
        try:
            user = await User.get(user_id)
            if not user:
                logger.warning("User not found for revocation", extra={"user_id": user_id})
                return False

            user.preferences["location_consent_given"] = False
            user.preferences["detected_location"] = None
            await user.save()

            logger.info("Location consent revoked", extra={"user_id": user_id})
            return True
        except Exception as e:
            logger.error("Error revoking location consent", extra={"error": str(e)})
            return False

    async def has_location_consent(self, user_id: str) -> bool:
        """Check if user has valid location consent.

        Args:
            user_id: User ID to check

        Returns:
            True if user has granted location consent
        """
        try:
            user = await User.get(user_id)
            if not user:
                return False
            return user.preferences.get("location_consent_given", False)
        except Exception as e:
            logger.error("Error checking location consent", extra={"error": str(e)})
            return False

    async def get_consent_status(self, user_id: str) -> dict:
        """Get user's location consent status.

        Returns:
            Dict with consent_given, timestamp, retention_days
        """
        try:
            user = await User.get(user_id)
            if not user:
                return {"consent_given": False, "timestamp": None, "retention_days": 90}

            return {
                "consent_given": user.preferences.get("location_consent_given", False),
                "timestamp": user.preferences.get("location_consent_timestamp"),
                "retention_days": user.preferences.get("location_data_retention_days", 90),
            }
        except Exception as e:
            logger.error("Error getting consent status", extra={"error": str(e)})
            return {"consent_given": False, "timestamp": None, "retention_days": 90}
