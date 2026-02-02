"""
Family Controls PIN Lockout Logic.

Provides account lockout protection against brute force PIN attacks.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional


class FamilyControlsLockoutMixin:
    """
    Mixin for PIN lockout functionality.

    Provides brute force protection with automatic account locking
    after repeated failed PIN attempts.
    """

    failed_pin_attempts: int
    pin_locked_until: Optional[datetime]
    updated_at: datetime

    def is_pin_locked(self) -> bool:
        """
        Check if PIN is currently locked due to failed attempts.

        Returns:
            True if PIN is locked and lockout period has not expired
        """
        if self.pin_locked_until is None:
            return False

        now = datetime.now(timezone.utc)
        if now >= self.pin_locked_until:
            # Lockout period expired, not locked anymore
            return False

        return True

    async def record_failed_attempt(
        self, max_attempts: int = 5, lockout_minutes: int = 15
    ) -> None:
        """
        Record a failed PIN verification attempt and lock if threshold exceeded.

        Args:
            max_attempts: Maximum attempts before locking (default: 5)
            lockout_minutes: Minutes to lock account (default: 15)
        """
        self.failed_pin_attempts += 1
        self.updated_at = datetime.now(timezone.utc)

        if self.failed_pin_attempts >= max_attempts:
            # Lock the PIN for the specified duration
            self.pin_locked_until = datetime.now(timezone.utc) + timedelta(
                minutes=lockout_minutes
            )

        await self.save()

    async def reset_failed_attempts(self) -> None:
        """
        Reset failed PIN attempts counter and unlock PIN.

        Called on successful PIN verification.
        """
        self.failed_pin_attempts = 0
        self.pin_locked_until = None
        self.updated_at = datetime.now(timezone.utc)
        await self.save()

    async def unlock_pin(self) -> None:
        """
        Manually unlock PIN and reset failed attempts.

        Used for admin override or after security review.
        """
        await self.reset_failed_attempts()
