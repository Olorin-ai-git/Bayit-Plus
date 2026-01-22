"""
Olorin Resilience Patterns
Retry logic, circuit breakers, and error handling
Follows Olorin ecosystem resilience patterns
"""

import asyncio
import time
from typing import Callable, TypeVar, Optional
from functools import wraps
from enum import Enum

from app.core.logging_config import get_logger

logger = get_logger(__name__)

T = TypeVar("T")


class CircuitState(str, Enum):
    """Circuit breaker states"""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Circuit broken, rejecting requests
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitBreaker:
    """
    Circuit breaker pattern implementation
    Prevents cascading failures by failing fast when service is down
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        timeout_seconds: int = 60,
        expected_exception: type = Exception
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.timeout_seconds = timeout_seconds
        self.expected_exception = expected_exception

        self.failure_count = 0
        self.last_failure_time: Optional[float] = None
        self.state = CircuitState.CLOSED

    def call(self, func: Callable):
        """Decorator to wrap function with circuit breaker"""

        @wraps(func)
        async def wrapper(*args, **kwargs):
            if self.state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    logger.info(f"Circuit breaker {self.name}: Attempting reset (HALF_OPEN)")
                    self.state = CircuitState.HALF_OPEN
                else:
                    logger.warning(f"Circuit breaker {self.name}: Circuit OPEN, rejecting call")
                    raise Exception(f"Circuit breaker {self.name} is OPEN")

            try:
                result = await func(*args, **kwargs)

                if self.state == CircuitState.HALF_OPEN:
                    logger.info(f"Circuit breaker {self.name}: Reset successful (CLOSED)")
                    self._reset()

                return result

            except self.expected_exception as e:
                self._record_failure()
                logger.error(
                    f"Circuit breaker {self.name}: Call failed",
                    extra={"error": str(e), "state": self.state},
                    exc_info=True,
                )
                raise

        return wrapper

    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset"""
        return (
            self.last_failure_time is not None
            and time.time() - self.last_failure_time >= self.timeout_seconds
        )

    def _record_failure(self):
        """Record a failure and update circuit state"""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.failure_count >= self.failure_threshold:
            logger.warning(
                f"Circuit breaker {self.name}: Opening circuit",
                extra={"failure_count": self.failure_count},
            )
            self.state = CircuitState.OPEN

    def _reset(self):
        """Reset circuit breaker to closed state"""
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED


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


class Bulkhead:
    """
    Bulkhead pattern for resource isolation
    Limits concurrent operations to prevent resource exhaustion
    """

    def __init__(self, name: str, max_concurrent: int = 10):
        self.name = name
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.active_count = 0

    async def execute(self, func: Callable, *args, **kwargs):
        """Execute function with bulkhead protection"""

        async with self.semaphore:
            self.active_count += 1
            logger.debug(
                f"Bulkhead {self.name}: Executing",
                extra={"active_count": self.active_count, "max": self.max_concurrent},
            )

            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                self.active_count -= 1


# Global circuit breakers for external services
ai_service_breaker = CircuitBreaker(
    name="ai_service",
    failure_threshold=5,
    timeout_seconds=60
)

storage_service_breaker = CircuitBreaker(
    name="storage_service",
    failure_threshold=3,
    timeout_seconds=30
)

database_breaker = CircuitBreaker(
    name="database",
    failure_threshold=10,
    timeout_seconds=120
)
