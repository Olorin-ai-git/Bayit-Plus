"""In-memory rate limiter for email sending."""

import logging
import time
from collections import defaultdict

from .config import EmailSettings


logger = logging.getLogger(__name__)


class EmailRateLimiter:
    """In-memory sliding window rate limiter per recipient."""

    def __init__(self, settings: EmailSettings):
        """Initialize rate limiter.

        Args:
            settings: Email settings with rate limit configuration
        """
        self.settings = settings
        self.window_seconds = 3600
        self._send_times: dict[str, list[float]] = defaultdict(list)

    def check(self, recipient: str) -> bool:
        """Check if recipient is under rate limit.

        Args:
            recipient: Recipient email address

        Returns:
            True if under limit, False if limit exceeded
        """
        self._cleanup_old_entries(recipient)

        send_count = len(self._send_times[recipient])
        is_under_limit = send_count < self.settings.EMAIL_RATE_LIMIT_PER_RECIPIENT_PER_HOUR

        if not is_under_limit:
            logger.warning(
                "Rate limit exceeded for recipient",
                extra={
                    "recipient": recipient,
                    "current_count": send_count,
                    "limit": self.settings.EMAIL_RATE_LIMIT_PER_RECIPIENT_PER_HOUR
                }
            )

        return is_under_limit

    def record(self, recipient: str) -> None:
        """Record email send for recipient.

        Args:
            recipient: Recipient email address
        """
        current_time = time.time()
        self._send_times[recipient].append(current_time)

        logger.debug(
            "Email send recorded",
            extra={
                "recipient": recipient,
                "send_count": len(self._send_times[recipient])
            }
        )

    def _cleanup_old_entries(self, recipient: str) -> None:
        """Remove send times outside the sliding window.

        Args:
            recipient: Recipient email address
        """
        current_time = time.time()
        cutoff_time = current_time - self.window_seconds

        if recipient in self._send_times:
            original_count = len(self._send_times[recipient])
            self._send_times[recipient] = [
                send_time for send_time in self._send_times[recipient]
                if send_time > cutoff_time
            ]

            cleaned_count = original_count - len(self._send_times[recipient])
            if cleaned_count > 0:
                logger.debug(
                    "Cleaned up old rate limit entries",
                    extra={
                        "recipient": recipient,
                        "cleaned": cleaned_count
                    }
                )

            if not self._send_times[recipient]:
                del self._send_times[recipient]

    def reset(self, recipient: str) -> None:
        """Reset rate limit for recipient.

        Args:
            recipient: Recipient email address
        """
        if recipient in self._send_times:
            del self._send_times[recipient]
            logger.info(
                "Rate limit reset",
                extra={"recipient": recipient}
            )

    def get_remaining(self, recipient: str) -> int:
        """Get remaining sends allowed for recipient.

        Args:
            recipient: Recipient email address

        Returns:
            Number of emails that can still be sent in current window
        """
        self._cleanup_old_entries(recipient)
        current_count = len(self._send_times.get(recipient, []))
        return max(0, self.settings.EMAIL_RATE_LIMIT_PER_RECIPIENT_PER_HOUR - current_count)
