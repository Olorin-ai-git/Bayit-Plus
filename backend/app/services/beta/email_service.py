"""
Email Verification Service

HMAC-SHA256 token generation and verification for beta user email validation.
"""

import hmac
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Tuple

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
                    return (False, email, "expired")
                    
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
                return (False, email, "invalid_signature")

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
        Send verification email via Twilio SendGrid.

        Args:
            email: Recipient email
            token: Verification token

        Returns:
            True if sent successfully, False otherwise
        """
        try:
            # Build verification URL
            verification_url = f"{self.settings.BETA_LANDING_PAGE_URL}/verify?token={token}"

            # TODO: Integrate with Twilio SendGrid
            # For now, log the verification URL
            logger.info(
                "Verification email sent",
                extra={
                    "email": email,
                    "verification_url": verification_url
                }
            )

            return True

        except Exception as e:
            logger.error(
                "Failed to send verification email",
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

            return (True, None)

        except Exception as e:
            logger.error(
                "Email verification error",
                extra={"email": email, "error": str(e)}
            )
            return (False, "database_error")
