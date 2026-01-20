"""
Resilience Module for External Services

Circuit breakers and resilience patterns for Olorin external service calls.
"""

import asyncio
import functools
import logging
import time
from enum import Enum
from typing import Callable, Dict, Optional, TypeVar

from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CircuitState(Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation, calls go through
    OPEN = "open"  # Failing, calls fast-fail immediately
    HALF_OPEN = "half_open"  # Testing if service has recovered


class CircuitBreakerError(Exception):
    """Exception raised when circuit is open."""

    def __init__(self, service_name: str, message: str):
        self.service_name = service_name
        super().__init__(f"Circuit breaker open for {service_name}: {message}")


class CircuitBreaker:
    """
    Circuit breaker implementation for external services.

    States:
    - CLOSED: Normal operation, counting failures
    - OPEN: Service unavailable, fast-failing all requests
    - HALF_OPEN: Testing recovery with limited requests
    """

    def __init__(
        self,
        service_name: str,
        failure_threshold: Optional[int] = None,
        recovery_timeout: Optional[int] = None,
        half_open_max_calls: Optional[int] = None,
    ):
        """
        Initialize circuit breaker.

        Args:
            service_name: Name of the service for logging
            failure_threshold: Failures before opening (default: from config)
            recovery_timeout: Seconds before trying to recover (default: from config)
            half_open_max_calls: Max calls in half-open state (default: from config)
        """
        self.service_name = service_name

        # Load from config if not provided
        config = settings.olorin.resilience
        self.failure_threshold = (
            failure_threshold or config.circuit_breaker_failure_threshold
        )
        self.recovery_timeout = (
            recovery_timeout or config.circuit_breaker_recovery_timeout_seconds
        )
        self.half_open_max_calls = (
            half_open_max_calls or config.circuit_breaker_half_open_max_calls
        )

        # State tracking
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: Optional[float] = None
        self._half_open_calls = 0

        # Lock for thread-safe state changes
        self._lock = asyncio.Lock()

    @property
    def state(self) -> CircuitState:
        """
        Get current circuit state (for monitoring/debugging only).

        WARNING: This property is NOT thread-safe. The state may change
        immediately after being read. For decision-making, use can_execute().
        """
        return self._state

    @property
    def is_closed(self) -> bool:
        """
        Check if circuit allows calls (for monitoring/debugging only).

        WARNING: This property is NOT thread-safe. The state may change
        immediately after being read. For decision-making, use can_execute().
        """
        return self._state == CircuitState.CLOSED

    @property
    def is_open(self) -> bool:
        """
        Check if circuit is blocking calls (for monitoring/debugging only).

        WARNING: This property is NOT thread-safe. The state may change
        immediately after being read. For decision-making, use can_execute().
        """
        return self._state == CircuitState.OPEN

    async def _check_state_transition(self) -> None:
        """Check if state should transition based on time or success count."""
        async with self._lock:
            if self._state == CircuitState.OPEN:
                # Check if recovery timeout has passed
                if (
                    self._last_failure_time
                    and (time.time() - self._last_failure_time) >= self.recovery_timeout
                ):
                    self._state = CircuitState.HALF_OPEN
                    self._half_open_calls = 0
                    self._success_count = 0
                    logger.info(
                        f"Circuit breaker {self.service_name}: OPEN -> HALF_OPEN"
                    )

    async def record_success(self) -> None:
        """Record a successful call."""
        async with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.half_open_max_calls:
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    self._success_count = 0
                    logger.info(
                        f"Circuit breaker {self.service_name}: HALF_OPEN -> CLOSED (recovered)"
                    )
            elif self._state == CircuitState.CLOSED:
                # Reset failure count on success
                if self._failure_count > 0:
                    self._failure_count = max(0, self._failure_count - 1)

    async def record_failure(self, exception: Exception) -> None:
        """Record a failed call."""
        async with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()

            if self._state == CircuitState.HALF_OPEN:
                # Any failure in half-open state reopens the circuit
                self._state = CircuitState.OPEN
                logger.warning(
                    f"Circuit breaker {self.service_name}: HALF_OPEN -> OPEN "
                    f"(failure during recovery: {exception})"
                )
            elif self._state == CircuitState.CLOSED:
                if self._failure_count >= self.failure_threshold:
                    self._state = CircuitState.OPEN
                    logger.warning(
                        f"Circuit breaker {self.service_name}: CLOSED -> OPEN "
                        f"(failure threshold {self.failure_threshold} reached: {exception})"
                    )

    async def can_execute(self) -> bool:
        """
        Check if a call should be allowed.

        Returns:
            True if call should proceed, False if should fast-fail
        """
        await self._check_state_transition()

        if self._state == CircuitState.CLOSED:
            return True

        if self._state == CircuitState.OPEN:
            return False

        if self._state == CircuitState.HALF_OPEN:
            async with self._lock:
                if self._half_open_calls < self.half_open_max_calls:
                    self._half_open_calls += 1
                    return True
                return False

        return False


# Global registry of circuit breakers
_circuit_breakers: Dict[str, CircuitBreaker] = {}


def get_circuit_breaker(
    service_name: str,
    failure_threshold: Optional[int] = None,
    recovery_timeout: Optional[int] = None,
) -> CircuitBreaker:
    """
    Get or create a circuit breaker for a service.

    Args:
        service_name: Unique service name
        failure_threshold: Override default failure threshold
        recovery_timeout: Override default recovery timeout

    Returns:
        CircuitBreaker instance
    """
    if service_name not in _circuit_breakers:
        _circuit_breakers[service_name] = CircuitBreaker(
            service_name=service_name,
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
        )
    return _circuit_breakers[service_name]


def circuit_breaker(
    service_name: str,
    failure_threshold: Optional[int] = None,
    recovery_timeout: Optional[int] = None,
) -> Callable:
    """
    Circuit breaker decorator for async functions.

    Args:
        service_name: Unique service name for this breaker
        failure_threshold: Override default failure threshold
        recovery_timeout: Override default recovery timeout

    Returns:
        Decorated function with circuit breaker protection

    Example:
        @circuit_breaker("openai_embeddings")
        async def get_embeddings(text):
            ...
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            breaker = get_circuit_breaker(
                service_name,
                failure_threshold=failure_threshold,
                recovery_timeout=recovery_timeout,
            )

            if not await breaker.can_execute():
                raise CircuitBreakerError(
                    service_name,
                    f"Service unavailable, retry after {breaker.recovery_timeout}s",
                )

            try:
                result = await func(*args, **kwargs)
                await breaker.record_success()
                return result
            except Exception as e:
                await breaker.record_failure(e)
                raise

        return wrapper

    return decorator


# Pre-configured circuit breakers for common services
PINECONE_BREAKER = "pinecone"
OPENAI_BREAKER = "openai"
CLAUDE_BREAKER = "claude"
ELEVENLABS_BREAKER = "elevenlabs"
GOOGLE_TRANSLATE_BREAKER = "google_translate"


def reset_all_breakers() -> None:
    """Reset all circuit breakers (for testing)."""
    global _circuit_breakers
    _circuit_breakers.clear()
    logger.info("All circuit breakers reset")
