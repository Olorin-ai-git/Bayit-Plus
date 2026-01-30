"""
Verification Service
Orchestrates email and phone verification with rate limiting
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.config import settings
from app.models.user import User
from app.models.verification import VerificationToken
from app.services.email_service import send_email
from app.services.twilio_service import twilio_service

logger = logging.getLogger(__name__)


class VerificationService:
    """Orchestrates email and phone verification processes."""

    async def check_rate_limit(self, user: User) -> bool:
        """
        Check if user has exceeded verification rate limit.

        Returns:
            True if within rate limit, False if exceeded
        """
        if not user.last_verification_attempt:
            return True

        hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        if user.last_verification_attempt > hour_ago:
            if (
                user.verification_attempts
                >= settings.MAX_VERIFICATION_ATTEMPTS_PER_HOUR
            ):
                logger.warning(f"Rate limit exceeded for user {user.id}")
                return False

        if user.last_verification_attempt < hour_ago:
            user.verification_attempts = 0

        return True

    async def initiate_email_verification(self, user: User) -> bool:
        """
        Send email verification link to user.

        Args:
            user: User to send verification email to

        Returns:
            True if email sent successfully
        """
        if not await self.check_rate_limit(user):
            raise Exception("Too many verification attempts. Please try again later.")

        token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(
            hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
        )

        verification_token = VerificationToken(
            user_id=str(user.id),
            token=token,
            type="email",
            contact=user.email,
            expires_at=expires_at,
        )
        await verification_token.insert()

        user.email_verification_token = token
        user.email_verification_sent_at = datetime.now(timezone.utc)
        user.verification_attempts += 1
        user.last_verification_attempt = datetime.now(timezone.utc)
        await user.save()

        verification_url = f"{settings.FRONTEND_WEB_URL}/verify-email?token={token}"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Bayit+!</h2>
            <p>Hi {user.name},</p>
            <p>Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verification_url}"
                   style="background-color: #6366f1; color: white; padding: 12px 30px;
                          text-decoration: none; border-radius: 8px; display: inline-block;">
                    Verify Email
                </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6366f1;">{verification_url}</p>
            <p style="color: #666; font-size: 12px;">This link expires in 24 hours.</p>
        </div>
        """

        success = await send_email(
            to_emails=[user.email],
            subject="Verify your Bayit+ account",
            html_content=html_content,
        )

        if success:
            logger.info(f"✅ Email verification sent to {user.email}")
        else:
            logger.warning(f"⚠️  Failed to send verification email to {user.email}")

        return success

    async def verify_email(self, token: str) -> Optional[User]:
        """
        Verify email with token.

        Returns:
            User if verification successful, None otherwise
        """
        verification_token = await VerificationToken.find_one(
            VerificationToken.token == token, VerificationToken.type == "email"
        )

        if not verification_token or not verification_token.is_valid():
            return None

        user = await User.get(verification_token.user_id)
        if not user:
            return None

        user.email_verified = True
        user.email_verified_at = datetime.now(timezone.utc)
        user.update_verification_status()
        await user.save()

        verification_token.used = True
        verification_token.used_at = datetime.now(timezone.utc)
        await verification_token.save()

        logger.info(f"✅ Email verified for user {user.email}")
        return user

    async def initiate_phone_verification(self, user: User, phone_number: str) -> bool:
        """
        Send SMS verification code to user.

        Args:
            user: User to send verification code to
            phone_number: Phone number in any format (will be validated and formatted)

        Returns:
            True if SMS sent successfully
        """
        if not await self.check_rate_limit(user):
            raise Exception("Too many verification attempts. Please try again later.")

        formatted_phone = twilio_service.validate_phone_number(phone_number)
        if not formatted_phone:
            raise Exception("Invalid phone number format")

        code = twilio_service.generate_code()
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.PHONE_VERIFICATION_CODE_EXPIRE_MINUTES
        )

        verification_token = VerificationToken(
            user_id=str(user.id),
            token=code,
            type="phone",
            contact=formatted_phone,
            expires_at=expires_at,
        )
        await verification_token.insert()

        user.phone_number = formatted_phone
        user.phone_verification_code = code
        user.phone_verification_sent_at = datetime.now(timezone.utc)
        user.verification_attempts += 1
        user.last_verification_attempt = datetime.now(timezone.utc)
        await user.save()

        await twilio_service.send_verification_code(formatted_phone, code)

        logger.info(f"✅ Phone verification code sent to {formatted_phone[:8]}***")
        return True

    async def verify_phone(self, user: User, code: str) -> bool:
        """
        Verify phone with code.

        Returns:
            True if verification successful
        """
        verification_token = await VerificationToken.find_one(
            VerificationToken.user_id == str(user.id),
            VerificationToken.type == "phone",
            VerificationToken.token == code,
        )

        if not verification_token or not verification_token.is_valid():
            return False

        user.phone_verified = True
        user.phone_verified_at = datetime.now(timezone.utc)
        user.update_verification_status()
        await user.save()

        verification_token.used = True
        verification_token.used_at = datetime.now(timezone.utc)
        await verification_token.save()

        logger.info(f"✅ Phone verified for user {user.email}")
        return True


verification_service = VerificationService()
