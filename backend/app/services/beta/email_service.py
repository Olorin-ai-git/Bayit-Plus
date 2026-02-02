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
from app.services.email_service import send_email

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

            # Create HTML email template
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #6B46C1;">🎉 Welcome to Bayit+ Beta!</h1>
                    </div>

                    <div style="background-color: #f7fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h2 style="color: #2D3748; margin-top: 0;">Verify Your Email</h2>
                        <p style="color: #4A5568; line-height: 1.6;">
                            Thank you for joining the Bayit+ Beta 500 program! You're one of 500
                            exclusive beta testers with access to AI-powered features.
                        </p>
                        <p style="color: #4A5568; line-height: 1.6;">
                            Click the button below to verify your email and activate your account:
                        </p>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{verification_url}"
                               style="background-color: #6B46C1; color: white; padding: 12px 32px;
                                      text-decoration: none; border-radius: 6px; display: inline-block;
                                      font-weight: bold;">
                                Verify Email Address
                            </a>
                        </div>

                        <p style="color: #718096; font-size: 14px;">
                            Or copy and paste this link into your browser:<br/>
                            <a href="{verification_url}" style="color: #6B46C1; word-break: break-all;">
                                {verification_url}
                            </a>
                        </p>
                    </div>

                    <div style="background-color: #EDF2F7; border-left: 4px solid #6B46C1; padding: 15px; margin-bottom: 20px;">
                        <p style="margin: 0; color: #2D3748; font-weight: bold;">🎁 Your Beta Benefits:</p>
                        <ul style="color: #4A5568; margin: 10px 0;">
                            <li>500 AI credits for testing features</li>
                            <li>AI-powered search and recommendations</li>
                            <li>Early access to new features</li>
                            <li>Direct feedback channel to our team</li>
                        </ul>
                    </div>

                    <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: center;">
                        <p style="color: #718096; font-size: 12px; margin: 5px 0;">
                            This verification link expires in 24 hours.
                        </p>
                        <p style="color: #718096; font-size: 12px; margin: 5px 0;">
                            If you didn't request this email, you can safely ignore it.
                        </p>
                        <p style="color: #A0AEC0; font-size: 12px; margin: 20px 0 5px 0;">
                            © 2026 Bayit+ | Premium Jewish Streaming
                        </p>
                    </div>
                </body>
            </html>
            """

            # Send email via centralized email service
            success = await send_email(
                to_emails=[email],
                subject="🎉 Verify Your Bayit+ Beta Account",
                html_content=html_content
            )

            if success:
                logger.info(
                    "Verification email sent successfully",
                    extra={"email": email, "verification_url": verification_url}
                )
            else:
                logger.warning(
                    "Email service not configured - verification URL logged only",
                    extra={"email": email, "verification_url": verification_url}
                )

            return success

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
