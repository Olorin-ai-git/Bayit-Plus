"""
Retry Patterns
Exponential backoff retry logic for resilient operations
"""

import asyncio
from functools import wraps
from typing import Callable

from app.core.logging_config import get_logger

logger = get_logger(__name__)


def retry_with_exponential_backoff(
    max_attempts: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    exceptions: tuple = (Exception,)
):
    """
    Retry decorator with exponential backoff

    Args:
        max_attempts: Maximum number of retry attempts
        initial_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        exponential_base: Base for exponential backoff
        exceptions: Tuple of exceptions to retry on

    Usage:
        @retry_with_exponential_backoff(max_attempts=3)
        async def flaky_operation():
            ...
    """

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)

                except exceptions as e:
                    last_exception = e

                    if attempt < max_attempts - 1:
                        delay = min(
                            initial_delay * (exponential_base ** attempt),
                            max_delay
                        )

                        logger.warning(
                            f"Retry attempt {attempt + 1}/{max_attempts}",
                            extra={
                                "function": func.__name__,
                                "delay": delay,
                                "error": str(e),
                            },
                        )

                        await asyncio.sleep(delay)
                    else:
                        logger.error(
                            f"All retry attempts exhausted for {func.__name__}",
                            extra={"attempts": max_attempts, "error": str(e)},
                            exc_info=True,
                        )

            raise last_exception

        return wrapper

    return decorator


async def with_timeout(coro, timeout_seconds: float, timeout_exception: Exception = None):
    """
    Execute coroutine with timeout

    Args:
        coro: Coroutine to execute
        timeout_seconds: Timeout in seconds
        timeout_exception: Exception to raise on timeout

    Returns:
        Coroutine result

    Raises:
        asyncio.TimeoutError or custom exception on timeout
    """
    try:
        return await asyncio.wait_for(coro, timeout=timeout_seconds)
    except asyncio.TimeoutError:
        logger.error(
            "Operation timed out",
            extra={"timeout_seconds": timeout_seconds},
        )

        if timeout_exception:
            raise timeout_exception
        raise
