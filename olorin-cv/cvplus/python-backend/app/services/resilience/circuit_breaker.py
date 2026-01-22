"""
Circuit Breaker Pattern
Prevents cascading failures by failing fast when service is down
"""

import time
from enum import Enum
from functools import wraps
from typing import Callable, Optional

from app.core.logging_config import get_logger

logger = get_logger(__name__)


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
