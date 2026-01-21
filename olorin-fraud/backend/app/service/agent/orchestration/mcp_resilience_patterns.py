"""MCP resilience patterns implementation with circuit breakers and rate limiting."""

import asyncio
import time
from collections import defaultdict
from typing import Any, Dict, List

import httpx
import tenacity
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MCPCircuitBreaker:
    """Circuit breaker implementation for MCP servers."""

    def __init__(
        self,
        server_name: str,
        failure_threshold: int = 3,
        recovery_timeout: float = 60.0,
    ):
        """Initialize circuit breaker."""
        self.server_name = server_name
        self.state = {
            "state": "closed",  # closed, open, half_open
            "failure_count": 0,
            "last_failure_time": 0,
            "failure_threshold": failure_threshold,
            "recovery_timeout": recovery_timeout,
        }

    def can_execute(self) -> bool:
        """Check if circuit breaker allows requests."""
        current_time = time.time()

        if self.state["state"] == "closed":
            return True
        elif self.state["state"] == "open":
            # Check if recovery timeout has passed
            if (
                current_time - self.state["last_failure_time"]
                > self.state["recovery_timeout"]
            ):
                self.state["state"] = "half_open"
                logger.info(
                    f"Circuit breaker for {self.server_name} moved to half-open state"
                )
                return True
            return False
        elif self.state["state"] == "half_open":
            return True

        return False

    def record_success(self) -> None:
        """Record successful request."""
        if self.state["state"] in ("open", "half_open"):
            self.state["state"] = "closed"
            self.state["failure_count"] = 0
            logger.info(f"Circuit breaker for {self.server_name} reset to closed state")

    def record_failure(self) -> None:
        """Record failed request."""
        self.state["failure_count"] += 1
        self.state["last_failure_time"] = time.time()

        if self.state["failure_count"] >= self.state["failure_threshold"]:
            self.state["state"] = "open"
            logger.warning(
                f"Circuit breaker for {self.server_name} opened after {self.state['failure_count']} failures"
            )


class MCPRateLimiter:
    """Rate limiter using token bucket algorithm."""

    def __init__(self, server_name: str, rate_limit: int = 10):
        """Initialize rate limiter."""
        self.server_name = server_name
        self.rate_limit = rate_limit
        self.bucket: List[float] = []

    async def acquire(self) -> None:
        """Acquire rate limit token."""
        current_time = time.time()

        # Remove old tokens (older than 1 second)
        self.bucket[:] = [t for t in self.bucket if current_time - t < 1.0]

        # Check rate limit
        if len(self.bucket) >= self.rate_limit:
            sleep_time = 1.0 - (current_time - self.bucket[0])
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)

        # Add current request token
        self.bucket.append(current_time)


class MCPResilienceManager:
    """Manager for all resilience patterns per server."""

    def __init__(self):
        """Initialize resilience manager."""
        self.circuit_breakers: Dict[str, MCPCircuitBreaker] = {}
        self.rate_limiters: Dict[str, MCPRateLimiter] = {}
        self.connection_semaphores: Dict[str, asyncio.Semaphore] = {}

    def register_server(
        self,
        server_name: str,
        max_connections: int = 10,
        failure_threshold: int = 3,
        recovery_timeout: float = 60.0,
        rate_limit: int = 10,
    ) -> None:
        """Register resilience patterns for a server."""
        self.circuit_breakers[server_name] = MCPCircuitBreaker(
            server_name, failure_threshold, recovery_timeout
        )
        self.rate_limiters[server_name] = MCPRateLimiter(server_name, rate_limit)
        self.connection_semaphores[server_name] = asyncio.Semaphore(max_connections)

    async def execute_with_resilience(
        self, server_name: str, operation: callable, retry_count: int = 3
    ) -> Any:
        """Execute operation with full resilience pattern stack."""
        circuit_breaker = self.circuit_breakers[server_name]
        rate_limiter = self.rate_limiters[server_name]
        semaphore = self.connection_semaphores[server_name]

        # Check circuit breaker
        if not circuit_breaker.can_execute():
            raise RuntimeError(f"Circuit breaker open for server {server_name}")

        # Apply rate limiting
        await rate_limiter.acquire()

        @tenacity.retry(
            stop=stop_after_attempt(retry_count),
            wait=wait_exponential(multiplier=1, min=1, max=5),
            retry=retry_if_exception_type((httpx.HTTPError, asyncio.TimeoutError)),
        )
        async def _execute():
            # Apply connection semaphore (bulkhead pattern)
            async with semaphore:
                return await operation()

        try:
            result = await _execute()
            circuit_breaker.record_success()
            return result
        except Exception as e:
            circuit_breaker.record_failure()
            raise

    def get_server_state(self, server_name: str) -> Dict[str, Any]:
        """Get resilience state for a server."""
        if server_name not in self.circuit_breakers:
            return {}

        cb = self.circuit_breakers[server_name]
        rl = self.rate_limiters[server_name]
        sem = self.connection_semaphores[server_name]

        return {
            "circuit_breaker_state": cb.state["state"],
            "failure_count": cb.state["failure_count"],
            "rate_limit_tokens": len(rl.bucket),
            "active_connections": sem._initial_value - sem._value,
            "max_connections": sem._initial_value,
        }
