"""
Retry Decorator

Standardized retry logic with exponential backoff for external service calls.
"""

import asyncio
import functools
import logging
import random
from typing import Callable, Optional, Sequence, Type, TypeVar, Union

from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T")


def _get_resilience_config():
    """Get resilience config from settings."""
    return settings.olorin.resilience


def async_retry(
    max_attempts: Optional[int] = None,
    initial_delay: Optional[float] = None,
    max_delay: Optional[float] = None,
    exponential_base: Optional[float] = None,
    retryable_exceptions: Sequence[Type[Exception]] = (Exception,),
    on_retry: Optional[Callable[[Exception, int], None]] = None,
) -> Callable:
    """
    Async retry decorator with exponential backoff.

    Uses configuration from settings if parameters not provided.

    Args:
        max_attempts: Maximum retry attempts (default: from config)
        initial_delay: Initial delay between retries in seconds (default: from config)
        max_delay: Maximum delay between retries in seconds (default: from config)
        exponential_base: Base for exponential backoff (default: from config)
        retryable_exceptions: Tuple of exception types to retry on
        on_retry: Optional callback called on each retry (exception, attempt_number)

    Returns:
        Decorated async function with retry logic

    Example:
        @async_retry(retryable_exceptions=(httpx.RequestError, httpx.TimeoutException))
        async def fetch_data():
            ...
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            config = _get_resilience_config()

            _max_attempts = max_attempts or config.retry_max_attempts
            _initial_delay = initial_delay or config.retry_initial_delay_seconds
            _max_delay = max_delay or config.retry_max_delay_seconds
            _exponential_base = exponential_base or config.retry_exponential_base

            last_exception: Optional[Exception] = None

            for attempt in range(1, _max_attempts + 1):
                try:
                    return await func(*args, **kwargs)

                except retryable_exceptions as e:
                    last_exception = e

                    if attempt == _max_attempts:
                        logger.error(
                            f"Retry exhausted for {func.__name__} after {_max_attempts} attempts: {e}"
                        )
                        raise

                    # Calculate delay with jitter
                    delay = min(
                        _initial_delay * (_exponential_base ** (attempt - 1)),
                        _max_delay,
                    )
                    # Add jitter (10-20% randomization)
                    jitter = delay * random.uniform(0.1, 0.2)
                    delay += jitter

                    logger.warning(
                        f"Retry {attempt}/{_max_attempts} for {func.__name__} "
                        f"after {delay:.2f}s: {e}"
                    )

                    if on_retry:
                        on_retry(e, attempt)

                    await asyncio.sleep(delay)

            # Should not reach here, but satisfy type checker
            if last_exception:
                raise last_exception
            raise RuntimeError("Retry logic error")

        return wrapper

    return decorator


def sync_retry(
    max_attempts: Optional[int] = None,
    initial_delay: Optional[float] = None,
    max_delay: Optional[float] = None,
    exponential_base: Optional[float] = None,
    retryable_exceptions: Sequence[Type[Exception]] = (Exception,),
    on_retry: Optional[Callable[[Exception, int], None]] = None,
) -> Callable:
    """
    Synchronous retry decorator with exponential backoff.

    WARNING: This decorator is for SYNCHRONOUS functions ONLY.
    For async functions, use async_retry instead.
    Using this decorator on async functions will cause blocking behavior
    due to time.sleep() being used for delays.

    Uses configuration from settings if parameters not provided.

    Args:
        max_attempts: Maximum retry attempts (default: from config)
        initial_delay: Initial delay between retries in seconds (default: from config)
        max_delay: Maximum delay between retries in seconds (default: from config)
        exponential_base: Base for exponential backoff (default: from config)
        retryable_exceptions: Tuple of exception types to retry on
        on_retry: Optional callback called on each retry (exception, attempt_number)

    Returns:
        Decorated function with retry logic

    Raises:
        TypeError: If applied to an async function
    """
    import inspect
    import time

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        if asyncio.iscoroutinefunction(func):
            raise TypeError(
                f"sync_retry cannot be applied to async function {func.__name__}. "
                "Use async_retry instead."
            )

        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            config = _get_resilience_config()

            _max_attempts = max_attempts or config.retry_max_attempts
            _initial_delay = initial_delay or config.retry_initial_delay_seconds
            _max_delay = max_delay or config.retry_max_delay_seconds
            _exponential_base = exponential_base or config.retry_exponential_base

            last_exception: Optional[Exception] = None

            for attempt in range(1, _max_attempts + 1):
                try:
                    return func(*args, **kwargs)

                except retryable_exceptions as e:
                    last_exception = e

                    if attempt == _max_attempts:
                        logger.error(
                            f"Retry exhausted for {func.__name__} after {_max_attempts} attempts: {e}"
                        )
                        raise

                    # Calculate delay with jitter
                    delay = min(
                        _initial_delay * (_exponential_base ** (attempt - 1)),
                        _max_delay,
                    )
                    jitter = delay * random.uniform(0.1, 0.2)
                    delay += jitter

                    logger.warning(
                        f"Retry {attempt}/{_max_attempts} for {func.__name__} "
                        f"after {delay:.2f}s: {e}"
                    )

                    if on_retry:
                        on_retry(e, attempt)

                    time.sleep(delay)

            if last_exception:
                raise last_exception
            raise RuntimeError("Retry logic error")

        return wrapper

    return decorator
