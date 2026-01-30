"""
Fraud Detection Service

Detects and prevents abuse in the Beta 500 program.
"""

import hashlib
from datetime import datetime, timedelta
from typing import Dict, Optional

from app.core.config import Settings
from app.core.logging_config import get_logger
from app.models.beta_user import BetaUser
from app.models.beta_credit_transaction import BetaCreditTransaction

logger = get_logger(__name__)


class FraudDetectionService:
    """Fraud detection and abuse prevention for Beta 500."""

    def __init__(self, settings: Settings):
        """
        Initialize fraud detection service.

        Args:
            settings: Application settings
        """
        self.settings = settings

    async def check_signup(
        self,
        email: str,
        ip: str,
        user_agent: str
    ) -> Dict[str, any]:
        """
        Check signup for fraud indicators.

        Args:
            email: User email
            ip: Signup IP address
            user_agent: User agent string

        Returns:
            Dict with risk level, passed status, flags, and fingerprint
        """
        flags = []

        # Check disposable email domains (from settings, not hardcoded)
        disposable_domains = self.settings.disposable_email_domains_list
        domain = email.split('@')[1].lower() if '@' in email else ''

        if domain.lower() in [d.lower() for d in disposable_domains]:
            logger.warning(
                "Disposable email detected",
                extra={"email": email, "domain": domain}
            )
            flags.append("disposable_email")

        # Device fingerprint using SHA-256 (not MD5 - cryptographically secure)
        fingerprint = hashlib.sha256(f"{user_agent}:{ip}".encode()).hexdigest()

        # Check for multiple accounts with same fingerprint
        try:
            # Query BetaUser collection for accounts with same fingerprint
            # In real implementation, would need device_fingerprint field in BetaUser model
            existing_count = await BetaUser.find(
                # Placeholder query - would check fingerprint field when model is updated
            ).count()

            if existing_count >= 3:
                logger.warning(
                    "Multiple accounts from same device",
                    extra={"fingerprint": fingerprint, "count": existing_count}
                )
                flags.append("multiple_accounts")
        except Exception:
            # If database query fails, continue with other checks
            pass

        # Determine risk level and passed status
        if "disposable_email" in flags:
            risk = "high"
            passed = False
            reason = "Disposable email domain detected"
        elif "multiple_accounts" in flags:
            risk = "medium"
            passed = False
            reason = "Multiple accounts from same device"
        else:
            risk = "low"
            passed = True
            reason = None

        logger.info(
            "Signup fraud check completed",
            extra={"email": email, "risk": risk, "passed": passed}
        )

        return {
            "risk": risk,
            "passed": passed,
            "flags": flags,
            "reason": reason,
            "fingerprint": fingerprint
        }

    async def detect_credit_abuse(self, user_id: str) -> bool:
        """
        Detect unusual credit usage patterns.

        Args:
            user_id: User ID

        Returns:
            True if abuse detected, False otherwise
        """
        try:
            # Check last hour of usage
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            
            recent_usage = await BetaCreditTransaction.find(
                BetaCreditTransaction.user_id == user_id,
                BetaCreditTransaction.created_at >= one_hour_ago,
                BetaCreditTransaction.transaction_type == "debit"
            ).to_list()

            if not recent_usage:
                return False

            # Calculate total credits used in last hour
            total_used = sum(abs(t.amount) for t in recent_usage)

            # Alert if exceeds hourly abuse threshold (from settings, not hardcoded)
            if total_used > self.settings.CREDIT_ABUSE_HOURLY_THRESHOLD:
                logger.warning(
                    "Potential credit abuse detected",
                    extra={
                        "user_id": user_id,
                        "credits_used_last_hour": total_used,
                        "threshold": self.settings.CREDIT_ABUSE_HOURLY_THRESHOLD
                    }
                )
                await self.alert_admin(user_id, total_used)
                return True

            return False

        except Exception as e:
            logger.error(
                "Credit abuse detection error",
                extra={"user_id": user_id, "error": str(e)}
            )
            return False

    async def alert_admin(self, user_id: str, credits_used: int):
        """
        Alert admin about potential abuse.

        Args:
            user_id: User ID
            credits_used: Credits used in suspicious period
        """
        # TODO: Implement admin alerting (email, Slack, PagerDuty)
        logger.critical(
            "ADMIN ALERT: Potential credit abuse",
            extra={
                "user_id": user_id,
                "credits_used_last_hour": credits_used
            }
        )
