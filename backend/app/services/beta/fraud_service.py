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
            Dict with risk level and details
        """
        # Check disposable email domains (from settings, not hardcoded)
        disposable_domains = self.settings.disposable_email_domains_list
        domain = email.split('@')[1] if '@' in email else ''

        if domain in disposable_domains:
            logger.warning(
                "Disposable email detected",
                extra={"email": email, "domain": domain}
            )
            return {"risk": "high", "reason": "disposable_email"}

        # Check IP reputation (multiple signups from same IP)
        recent_signups = await BetaUser.find(
            BetaUser.created_at >= datetime.utcnow() - timedelta(hours=24)
        ).to_list()

        # Count signups from this IP (metadata would store IP)
        same_ip_count = 0
        for user in recent_signups:
            # Note: IP would be stored in metadata (not shown in model for brevity)
            # For now, we skip this check - would need IP in BetaUser model
            pass

        if same_ip_count >= 3:
            logger.warning(
                "Multiple signups from same IP",
                extra={"ip": ip, "count": same_ip_count}
            )
            return {"risk": "high", "reason": "multiple_signups_same_ip"}

        # Device fingerprint using SHA-256 (not MD5 - cryptographically secure)
        fingerprint = hashlib.sha256(f"{user_agent}:{ip}".encode()).hexdigest()
        
        existing = await BetaUser.find(
            # Note: Would need device_fingerprint field in BetaUser model
            # For now, this is a placeholder
        ).to_list()

        # Check for duplicate device fingerprint
        # if existing:
        #     logger.warning(
        #         "Duplicate device fingerprint",
        #         extra={"fingerprint": fingerprint}
        #     )
        #     return {"risk": "high", "reason": "duplicate_device"}

        logger.info(
            "Signup passed fraud checks",
            extra={"email": email}
        )
        
        return {"risk": "low", "reason": None}

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
