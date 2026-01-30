"""
Email Verification Service

HMAC-SHA256 token generation and verification for beta user email validation.
Uses olorin-email shared package for email delivery.
"""

import hmac
import hashlib
import httpx
from datetime import datetime, timedelta
from typing import Optional, Tuple

from olorin_email import (
    EmailSettings,
    SendGridProvider,
    TemplateEngine,
    EmailSender,
    EmailBuilder
)

from app.core.config import Settings
from app.core.logging_config import get_logger
from app.models.beta_user import BetaUser

logger = get_logger(__name__)


class EmailVerificationService:
    """Email verification with HMAC-SHA256 tokens."""

    def __init__(self, settings: Settings):
        """
        Initialize email verification service.

        Args:
            settings: Application settings
        """
        self.settings = settings
        
        if not self.settings.EMAIL_VERIFICATION_SECRET_KEY:
            logger.warning(
                "EMAIL_VERIFICATION_SECRET_KEY not set - email verification will fail"
            )

    def generate_verification_token(self, email: str) -> str:
        """
        Generate HMAC-SHA256 verification token.

        Token format: email|expiry|hmac
        
        Args:
            email: User email address

        Returns:
            Verification token string
        """
        # Calculate expiry timestamp
        expiry = datetime.utcnow() + timedelta(
            hours=self.settings.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS
        )
        expiry_timestamp = int(expiry.timestamp())

        # Create payload: email|expiry
        payload = f"{email}|{expiry_timestamp}"

        # Generate HMAC-SHA256 signature
        signature = hmac.new(
            self.settings.EMAIL_VERIFICATION_SECRET_KEY.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()

        # Token format: email|expiry|hmac
        token = f"{payload}|{signature}"

        logger.info(
            "Generated verification token",
            extra={
                "email": email,
                "expires_at": expiry.isoformat()
            }
        )

        return token

    def verify_token(self, token: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Verify HMAC-SHA256 token and extract email.

        Args:
            token: Verification token

        Returns:
            Tuple of (valid: bool, email: Optional[str], error: Optional[str])
        """
        try:
            # Parse token: email|expiry|hmac
            parts = token.split("|")
            
            if len(parts) != 3:
                return (False, None, "invalid_format")

            email, expiry_str, provided_signature = parts

            # Verify expiry
            try:
                expiry_timestamp = int(expiry_str)
                expiry = datetime.fromtimestamp(expiry_timestamp)
                
                if datetime.utcnow() > expiry:
                    logger.warning(
                        "Token expired",
                        extra={"email": email, "expired_at": expiry.isoformat()}
                    )
                    return (False, None, "expired")
                    
            except ValueError:
                return (False, None, "invalid_expiry")

            # Verify HMAC signature
            payload = f"{email}|{expiry_str}"
            expected_signature = hmac.new(
                self.settings.EMAIL_VERIFICATION_SECRET_KEY.encode(),
                payload.encode(),
                hashlib.sha256
            ).hexdigest()

            if not hmac.compare_digest(expected_signature, provided_signature):
                logger.warning(
                    "Invalid token signature",
                    extra={"email": email}
                )
                return (False, None, "invalid_signature")

            logger.info(
                "Token verified successfully",
                extra={"email": email}
            )
            
            return (True, email, None)

        except Exception as e:
            logger.error(
                "Token verification error",
                extra={"error": str(e)}
            )
            return (False, None, "verification_error")

    async def send_verification_email(
        self,
        email: str,
        token: str
    ) -> bool:
        """
        Send verification email using olorin-email shared package.

        Args:
            email: Recipient email
            token: Verification token

        Returns:
            True if sent successfully, False otherwise
        """
        try:
            # Build verification URL
            verification_url = f"{self.settings.FRONTEND_URL}/verify-email?token={token}"

            # Initialize olorin-email components
            # Add backend templates directory to template search path
            from pathlib import Path
            backend_templates = str(Path(__file__).resolve().parents[3] / "templates")

            email_settings = EmailSettings(
                SENDGRID_API_KEY=self.settings.SENDGRID_API_KEY,
                SENDGRID_FROM_EMAIL=self.settings.SENDGRID_FROM_EMAIL,
                SENDGRID_FROM_NAME=self.settings.SENDGRID_FROM_NAME,
                EMAIL_TEMPLATE_DIRS=[backend_templates]
            )

            http_client = httpx.AsyncClient()
            try:
                provider = SendGridProvider(http_client, email_settings)
                template_engine = TemplateEngine(email_settings)
                sender = EmailSender(email_settings, provider, template_engine)

                # Send email using template
                result = await sender.send(
                    EmailBuilder(email_settings)
                    .to(email)
                    .subject("Verify Your Bayit+ Beta Account")
                    .template("beta/verification-email.html.j2", {
                        "verification_url": verification_url,
                        "expiry_hours": self.settings.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS
                    })
                    .category("beta")
                    .tag("verification")
                    .custom_arg("email", email)
                    .custom_arg("token_expiry_hours", str(self.settings.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS))
                )

                if result.success:
                    logger.info(
                        "Verification email sent successfully",
                        extra={
                            "email": email,
                            "message_id": result.message_id,
                            "verification_url": verification_url
                        }
                    )
                    return True
                else:
                    logger.error(
                        "Failed to send verification email",
                        extra={
                            "email": email,
                            "error": result.error,
                            "status_code": result.status_code
                        }
                    )
                    return False

            finally:
                await http_client.aclose()

        except Exception as e:
            logger.error(
                "Failed to send verification email",
                extra={"email": email, "error": str(e)}
            )
            return False

    async def send_welcome_email(
        self,
        email: str,
        user_name: str,
        credits_balance: int = 500
    ) -> bool:
        """
        Send welcome email after successful email verification.

        Args:
            email: Recipient email
            user_name: User's display name
            credits_balance: Current credit balance (default 500)

        Returns:
            True if sent successfully, False otherwise
        """
        try:
            # Initialize olorin-email components
            from pathlib import Path
            backend_templates = str(Path(__file__).resolve().parents[3] / "templates")

            email_settings = EmailSettings(
                SENDGRID_API_KEY=self.settings.SENDGRID_API_KEY,
                SENDGRID_FROM_EMAIL=self.settings.SENDGRID_FROM_EMAIL,
                SENDGRID_FROM_NAME=self.settings.SENDGRID_FROM_NAME,
                EMAIL_TEMPLATE_DIRS=[backend_templates]
            )

            http_client = httpx.AsyncClient()
            try:
                provider = SendGridProvider(http_client, email_settings)
                template_engine = TemplateEngine(email_settings)
                sender = EmailSender(email_settings, provider, template_engine)

                # Send welcome email using template
                result = await sender.send(
                    EmailBuilder(email_settings)
                    .to(email)
                    .subject("Welcome to Bayit+ Beta 500!")
                    .template("beta/welcome-email.html.j2", {
                        "user_name": user_name,
                        "credits_balance": credits_balance,
                        "support_url": f"{self.settings.FRONTEND_URL}/support"
                    })
                    .category("beta")
                    .tag("welcome")
                    .custom_arg("email", email)
                    .custom_arg("credits_balance", str(credits_balance))
                )

                if result.success:
                    logger.info(
                        "Welcome email sent successfully",
                        extra={
                            "email": email,
                            "message_id": result.message_id,
                            "credits_balance": credits_balance
                        }
                    )
                    return True
                else:
                    logger.error(
                        "Failed to send welcome email",
                        extra={
                            "email": email,
                            "error": result.error,
                            "status_code": result.status_code
                        }
                    )
                    return False

            finally:
                await http_client.aclose()

        except Exception as e:
            logger.error(
                "Failed to send welcome email",
                extra={"email": email, "error": str(e)}
            )
            return False

    async def send_low_credit_warning(
        self,
        email: str,
        user_name: str,
        credits_remaining: int,
        threshold: int = 50,
        usage_summary: list = None
    ) -> bool:
        """
        Send low credit warning email when credits drop below threshold.

        Args:
            email: Recipient email
            user_name: User's display name
            credits_remaining: Current remaining credits
            threshold: Warning threshold (default 50)
            usage_summary: List of recent usage items

        Returns:
            True if sent successfully, False otherwise
        """
        try:
            from pathlib import Path
            backend_templates = str(Path(__file__).resolve().parents[3] / "templates")

            email_settings = EmailSettings(
                SENDGRID_API_KEY=self.settings.SENDGRID_API_KEY,
                SENDGRID_FROM_EMAIL=self.settings.SENDGRID_FROM_EMAIL,
                SENDGRID_FROM_NAME=self.settings.SENDGRID_FROM_NAME,
                EMAIL_TEMPLATE_DIRS=[backend_templates]
            )

            http_client = httpx.AsyncClient()
            try:
                provider = SendGridProvider(http_client, email_settings)
                template_engine = TemplateEngine(email_settings)
                sender = EmailSender(email_settings, provider, template_engine)

                # Default usage summary if not provided
                if usage_summary is None:
                    usage_summary = []

                result = await sender.send(
                    EmailBuilder(email_settings)
                    .to(email)
                    .subject("⚠️ Low Credit Balance - Bayit+ Beta 500")
                    .template("beta/credit-low-warning.html.j2", {
                        "user_name": user_name,
                        "credits_remaining": credits_remaining,
                        "threshold": threshold,
                        "usage_summary": usage_summary,
                        "upgrade_url": f"{self.settings.FRONTEND_URL}/upgrade"
                    })
                    .category("beta")
                    .tag("credit-warning")
                    .custom_arg("email", email)
                    .custom_arg("credits_remaining", str(credits_remaining))
                )

                if result.success:
                    logger.info(
                        "Low credit warning email sent",
                        extra={
                            "email": email,
                            "message_id": result.message_id,
                            "credits_remaining": credits_remaining
                        }
                    )
                    return True
                else:
                    logger.error(
                        "Failed to send low credit warning",
                        extra={
                            "email": email,
                            "error": result.error
                        }
                    )
                    return False

            finally:
                await http_client.aclose()

        except Exception as e:
            logger.error(
                "Failed to send low credit warning",
                extra={"email": email, "error": str(e)}
            )
            return False

    async def send_credits_depleted(
        self,
        email: str,
        user_name: str,
        total_used: int = 500,
        top_features: list = None
    ) -> bool:
        """
        Send credits depleted email when all credits are used.

        Args:
            email: Recipient email
            user_name: User's display name
            total_used: Total credits used (default 500)
            top_features: List of top features used with stats

        Returns:
            True if sent successfully, False otherwise
        """
        try:
            from pathlib import Path
            backend_templates = str(Path(__file__).resolve().parents[3] / "templates")

            email_settings = EmailSettings(
                SENDGRID_API_KEY=self.settings.SENDGRID_API_KEY,
                SENDGRID_FROM_EMAIL=self.settings.SENDGRID_FROM_EMAIL,
                SENDGRID_FROM_NAME=self.settings.SENDGRID_FROM_NAME,
                EMAIL_TEMPLATE_DIRS=[backend_templates]
            )

            http_client = httpx.AsyncClient()
            try:
                provider = SendGridProvider(http_client, email_settings)
                template_engine = TemplateEngine(email_settings)
                sender = EmailSender(email_settings, provider, template_engine)

                # Default top features if not provided
                if top_features is None:
                    top_features = []

                result = await sender.send(
                    EmailBuilder(email_settings)
                    .to(email)
                    .subject("🔴 Credits Depleted - Bayit+ Beta 500")
                    .template("beta/credit-depleted.html.j2", {
                        "user_name": user_name,
                        "total_used": total_used,
                        "top_features": top_features,
                        "upgrade_url": f"{self.settings.FRONTEND_URL}/upgrade",
                        "support_url": f"{self.settings.FRONTEND_URL}/support"
                    })
                    .category("beta")
                    .tag("credit-depleted")
                    .custom_arg("email", email)
                    .custom_arg("total_used", str(total_used))
                )

                if result.success:
                    logger.info(
                        "Credits depleted email sent",
                        extra={
                            "email": email,
                            "message_id": result.message_id,
                            "total_used": total_used
                        }
                    )
                    return True
                else:
                    logger.error(
                        "Failed to send credits depleted email",
                        extra={
                            "email": email,
                            "error": result.error
                        }
                    )
                    return False

            finally:
                await http_client.aclose()

        except Exception as e:
            logger.error(
                "Failed to send credits depleted email",
                extra={"email": email, "error": str(e)}
            )
            return False

    async def verify_user_email(self, token: str) -> Tuple[bool, Optional[str]]:
        """
        Verify token and mark user email as verified.

        Args:
            token: Verification token

        Returns:
            Tuple of (success: bool, error: Optional[str])
        """
        # Verify token
        valid, email, error = self.verify_token(token)
        
        if not valid:
            return (False, error)

        try:
            # Find user by email
            user = await BetaUser.find_one(BetaUser.email == email)
            
            if not user:
                logger.warning(
                    "User not found for verification",
                    extra={"email": email}
                )
                return (False, "user_not_found")

            # Check if already verified
            if user.status == "active" and user.verified_at:
                logger.info(
                    "User already verified",
                    extra={"email": email}
                )
                return (True, None)  # Success (idempotent)

            # Mark as verified
            user.status = "active"
            user.verified_at = datetime.utcnow()
            user.verification_token = None  # Clear token after use
            await user.save()

            logger.info(
                "User email verified",
                extra={"email": email, "user_id": str(user.id)}
            )

            # Send welcome email (non-blocking - don't fail verification if email fails)
            try:
                # Get user's display name (use email prefix if no name)
                user_name = user.name if hasattr(user, 'name') and user.name else email.split('@')[0]

                # Get credit balance (should be 500 for new beta users)
                from app.models.beta_credit import BetaCredit
                credit_record = await BetaCredit.find_one(BetaCredit.user_id == str(user.id))
                credits_balance = credit_record.remaining_credits if credit_record else 500

                # Send welcome email asynchronously
                await self.send_welcome_email(email, user_name, credits_balance)

            except Exception as e:
                # Log error but don't fail the verification
                logger.warning(
                    "Failed to send welcome email after verification",
                    extra={"email": email, "error": str(e)}
                )

            return (True, None)

        except Exception as e:
            logger.error(
                "Email verification error",
                extra={"email": email, "error": str(e)}
            )
            return (False, "database_error")
