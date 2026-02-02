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
from app.services.email_service import send_email

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
        logger.critical(
            "ADMIN ALERT: Potential credit abuse",
            extra={
                "user_id": user_id,
                "credits_used_last_hour": credits_used
            }
        )

        # Send email alert to admins
        try:
            # Get admin emails from settings
            admin_emails = [
                email.strip()
                for email in self.settings.ADMIN_EMAIL_ADDRESSES.split(",")
                if email.strip()
            ]

            if not admin_emails:
                logger.warning("No admin emails configured for fraud alerts")
                return

            # Get current timestamp
            timestamp = datetime.utcnow().isoformat()

            # Create HTML email template for fraud alert
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 20px; margin-bottom: 20px;">
                        <h1 style="color: #DC2626; margin-top: 0;">
                            🚨 FRAUD ALERT: Potential Credit Abuse
                        </h1>
                    </div>

                    <div style="background-color: #f7fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h2 style="color: #2D3748; margin-top: 0;">Suspicious Activity Detected</h2>

                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <tr style="border-bottom: 1px solid #E2E8F0;">
                                <td style="padding: 12px 0; color: #718096; font-weight: bold;">User ID:</td>
                                <td style="padding: 12px 0; color: #2D3748; font-family: monospace;">{user_id}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #E2E8F0;">
                                <td style="padding: 12px 0; color: #718096; font-weight: bold;">Credits Used (1 hour):</td>
                                <td style="padding: 12px 0; color: #DC2626; font-weight: bold; font-size: 18px;">
                                    {credits_used}
                                </td>
                            </tr>
                            <tr style="border-bottom: 1px solid #E2E8F0;">
                                <td style="padding: 12px 0; color: #718096; font-weight: bold;">Timestamp:</td>
                                <td style="padding: 12px 0; color: #2D3748;">{timestamp}</td>
                            </tr>
                        </table>

                        <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #92400E; font-weight: bold;">⚠️ Threshold Exceeded</p>
                            <p style="margin: 10px 0 0 0; color: #78350F;">
                                This user has exceeded the maximum allowed credit usage per hour (100 credits).
                                This may indicate automated abuse or fraudulent activity.
                            </p>
                        </div>
                    </div>

                    <div style="background-color: #EDF2F7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h3 style="color: #2D3748; margin-top: 0;">Recommended Actions:</h3>
                        <ul style="color: #4A5568; line-height: 1.8;">
                            <li>Review user's recent activity and transaction history</li>
                            <li>Check for patterns of automated requests or abuse</li>
                            <li>Consider temporarily suspending the account if abuse is confirmed</li>
                            <li>Contact the user to investigate the unusual activity</li>
                        </ul>

                        <div style="text-align: center; margin: 20px 0;">
                            <a href="https://admin.bayitplus.com/beta/users/{user_id}"
                               style="background-color: #DC2626; color: white; padding: 12px 24px;
                                      text-decoration: none; border-radius: 6px; display: inline-block;
                                      font-weight: bold;">
                                View User Details
                            </a>
                        </div>
                    </div>

                    <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: center;">
                        <p style="color: #718096; font-size: 12px; margin: 5px 0;">
                            This is an automated fraud alert from Bayit+ Beta 500 program.
                        </p>
                        <p style="color: #A0AEC0; font-size: 12px; margin: 20px 0 5px 0;">
                            © 2026 Bayit+ | Premium Jewish Streaming
                        </p>
                    </div>
                </body>
            </html>
            """

            # Send fraud alert email
            success = await send_email(
                to_emails=admin_emails,
                subject=f"🚨 FRAUD ALERT: User {user_id[:8]}... exceeded credit limit ({credits_used} credits/hour)",
                html_content=html_content
            )

            if success:
                logger.info(
                    "Fraud alert email sent to admins",
                    extra={
                        "user_id": user_id,
                        "admin_count": len(admin_emails),
                        "credits_used": credits_used
                    }
                )
            else:
                logger.warning(
                    "Failed to send fraud alert email (email service not configured)",
                    extra={"user_id": user_id}
                )

        except Exception as e:
            logger.error(
                "Error sending fraud alert email",
                extra={"user_id": user_id, "error": str(e)}
            )
