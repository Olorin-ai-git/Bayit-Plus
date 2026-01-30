"""Retry logic with exponential backoff for email sending."""

import asyncio
import logging
import random
from typing import Callable, Awaitable

from .config import EmailSettings
from .provider.base import SendResult


logger = logging.getLogger(__name__)


RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


async def with_retry(
    fn: Callable[[], Awaitable[SendResult]],
    settings: EmailSettings
) -> SendResult:
    """Execute email send function with exponential backoff retry.

    Args:
        fn: Async function that returns SendResult
        settings: Email settings with retry configuration

    Returns:
        SendResult from successful attempt or final failure
    """
    max_retries = settings.EMAIL_MAX_RETRIES
    base_delay = settings.EMAIL_RETRY_BASE_DELAY_SECONDS

    for attempt in range(max_retries + 1):
        result = await fn()

        if result.success:
            if attempt > 0:
                logger.info(
                    "Email send succeeded after retries",
                    extra={
                        "attempt": attempt + 1,
                        "message_id": result.message_id
                    }
                )
            return result

        if attempt >= max_retries:
            logger.error(
                "Email send failed after all retries",
                extra={
                    "total_attempts": attempt + 1,
                    "final_error": result.error,
                    "status_code": result.status_code
                }
            )
            return result

        if not _should_retry(result):
            logger.warning(
                "Email send failed with non-retryable error",
                extra={
                    "attempt": attempt + 1,
                    "status_code": result.status_code,
                    "error": result.error
                }
            )
            return result

        delay = _calculate_backoff_delay(attempt, base_delay)
        logger.warning(
            "Email send failed, retrying",
            extra={
                "attempt": attempt + 1,
                "max_retries": max_retries,
                "retry_delay_seconds": delay,
                "status_code": result.status_code,
                "error": result.error
            }
        )

        await asyncio.sleep(delay)

    return result


def _should_retry(result: SendResult) -> bool:
    """Determine if send failure should be retried.

    Args:
        result: Send result to evaluate

    Returns:
        True if error is retryable
    """
    if result.status_code is None:
        return True

    return result.status_code in RETRYABLE_STATUS_CODES


def _calculate_backoff_delay(attempt: int, base_delay: float) -> float:
    """Calculate exponential backoff delay with jitter.

    Args:
        attempt: Attempt number (0-indexed)
        base_delay: Base delay in seconds

    Returns:
        Delay in seconds with exponential backoff and random jitter
    """
    exponential_delay = base_delay * (2 ** attempt)
    jitter = random.uniform(0, exponential_delay * 0.1)
    return exponential_delay + jitter
