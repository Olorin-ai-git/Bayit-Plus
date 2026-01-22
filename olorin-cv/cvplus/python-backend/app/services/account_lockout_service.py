"""
Account Lockout Service
Implements account lockout after failed login attempts
"""

from datetime import datetime, timedelta
from typing import Optional
from app.models.login_attempt import LoginAttempt
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Lockout configuration
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
ATTEMPT_WINDOW_MINUTES = 15


class AccountLockoutService:
    """Service for managing account lockout based on failed login attempts."""

    @staticmethod
    async def record_login_attempt(
        email: str,
        ip_address: str,
        success: bool,
        user_agent: Optional[str] = None,
    ) -> None:
        """
        Record a login attempt.

        Args:
            email: Email address used in login attempt
            ip_address: IP address of requester
            success: Whether login succeeded
            user_agent: Browser user agent string
        """
        attempt = LoginAttempt(
            email=email,
            ip_address=ip_address,
            success=success,
            user_agent=user_agent,
            timestamp=datetime.utcnow(),
        )
        await attempt.insert()

        logger.info(
            "Login attempt recorded",
            extra={
                "email": email,
                "ip_address": ip_address,
                "success": success,
            },
        )

    @staticmethod
    async def is_account_locked(email: str) -> bool:
        """
        Check if account is currently locked due to failed attempts.

        Args:
            email: Email address to check

        Returns:
            True if account is locked, False otherwise
        """
        cutoff_time = datetime.utcnow() - timedelta(minutes=ATTEMPT_WINDOW_MINUTES)

        failed_attempts = await LoginAttempt.find(
            LoginAttempt.email == email,
            LoginAttempt.success == False,
            LoginAttempt.timestamp >= cutoff_time,
        ).count()

        is_locked = failed_attempts >= MAX_FAILED_ATTEMPTS

        if is_locked:
            logger.warning(
                "Account is locked",
                extra={
                    "email": email,
                    "failed_attempts": failed_attempts,
                    "lockout_duration_minutes": LOCKOUT_DURATION_MINUTES,
                },
            )

        return is_locked

    @staticmethod
    async def get_lockout_info(email: str) -> dict:
        """
        Get information about account lockout status.

        Args:
            email: Email address to check

        Returns:
            Dictionary with lockout status and details
        """
        cutoff_time = datetime.utcnow() - timedelta(minutes=ATTEMPT_WINDOW_MINUTES)

        # Use aggregation pipeline to get count and min timestamp efficiently
        pipeline = [
            {
                "$match": {
                    "email": email,
                    "success": False,
                    "timestamp": {"$gte": cutoff_time}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "count": {"$sum": 1},
                    "first_failed": {"$min": "$timestamp"}
                }
            }
        ]

        result = await LoginAttempt.aggregate(pipeline).to_list(length=1)

        if not result:
            return {
                "is_locked": False,
                "failed_attempts": 0,
                "remaining_attempts": MAX_FAILED_ATTEMPTS,
            }

        failed_count = result[0]["count"]
        is_locked = failed_count >= MAX_FAILED_ATTEMPTS

        if is_locked:
            first_failed = result[0]["first_failed"]
            lockout_expires = first_failed + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            minutes_remaining = max(
                0, int((lockout_expires - datetime.utcnow()).total_seconds() / 60)
            )

            return {
                "is_locked": True,
                "failed_attempts": failed_count,
                "remaining_attempts": 0,
                "lockout_expires_minutes": minutes_remaining,
            }

        return {
            "is_locked": False,
            "failed_attempts": failed_count,
            "remaining_attempts": MAX_FAILED_ATTEMPTS - failed_count,
        }

    @staticmethod
    async def clear_failed_attempts(email: str) -> None:
        """
        Clear all failed login attempts for an email (called on successful login).

        Args:
            email: Email address to clear attempts for
        """
        await LoginAttempt.find(
            LoginAttempt.email == email,
            LoginAttempt.success == False,
        ).delete()

        logger.info("Failed login attempts cleared", extra={"email": email})
