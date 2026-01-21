"""
Enhanced Tool Base

Advanced framework for creating robust, observable, and self-healing tools.
Provides validation, retry orchestration, caching, and comprehensive monitoring.
"""

import asyncio
import hashlib
import json
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Union

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ValidationLevel(Enum):
    """Tool validation levels"""

    NONE = "none"
    BASIC = "basic"
    STRICT = "strict"
    COMPREHENSIVE = "comprehensive"


class RetryStrategy(Enum):
    """Tool retry strategies"""

    NONE = "none"
    EXPONENTIAL_BACKOFF = "exponential_backoff"
    FIXED_INTERVAL = "fixed_interval"
    LINEAR_BACKOFF = "linear_backoff"
    CIRCUIT_BREAKER = "circuit_breaker"


class CacheStrategy(Enum):
    """Tool caching strategies"""

    NONE = "none"
    MEMORY = "memory"
    REDIS = "redis"
    HYBRID = "hybrid"
    CONTENT_HASH = "content_hash"


@dataclass
class ToolConfig:
    """Configuration for enhanced tools"""

    # Basic settings
    name: str
    version: str = "1.0.0"
    timeout_seconds: int = 30
    max_retries: int = 3

    # Validation settings
    validation_level: ValidationLevel = ValidationLevel.BASIC
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None

    # Retry settings
    retry_strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
    retry_delay_base: float = 1.0
    retry_delay_max: float = 60.0
    retry_on_exceptions: List[type] = field(default_factory=lambda: [Exception])

    # Caching settings
    cache_strategy: CacheStrategy = CacheStrategy.MEMORY
    cache_ttl_seconds: int = 300
    cache_key_prefix: str = ""

    # Monitoring settings
    enable_metrics: bool = True
    enable_tracing: bool = True
    log_level: str = "INFO"

    # Custom settings
    custom_params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolMetrics:
    """Tool execution metrics"""

    execution_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    retry_count: int = 0
    cache_hit_count: int = 0
    cache_miss_count: int = 0

    total_execution_time: float = 0.0
    avg_execution_time: float = 0.0
    min_execution_time: float = float("inf")
    max_execution_time: float = 0.0

    last_execution_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    last_failure_time: Optional[datetime] = None

    error_counts: Dict[str, int] = field(default_factory=dict)

    def update_execution(
        self, duration: float, success: bool, error_type: Optional[str] = None
    ):
        """Update metrics after execution"""
        self.execution_count += 1
        self.total_execution_time += duration
        self.avg_execution_time = self.total_execution_time / self.execution_count
        self.min_execution_time = min(self.min_execution_time, duration)
        self.max_execution_time = max(self.max_execution_time, duration)
        self.last_execution_time = datetime.now()

        if success:
            self.success_count += 1
            self.last_success_time = datetime.now()
        else:
            self.failure_count += 1
            self.last_failure_time = datetime.now()
            if error_type:
                self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1

    @property
    def success_rate(self) -> float:
        """Calculate success rate"""
        return (
            self.success_count / self.execution_count
            if self.execution_count > 0
            else 0.0
        )

    @property
    def failure_rate(self) -> float:
        """Calculate failure rate"""
        return (
            self.failure_count / self.execution_count
            if self.execution_count > 0
            else 0.0
        )

    @property
    def cache_hit_rate(self) -> float:
        """Calculate cache hit rate"""
        total_cache_requests = self.cache_hit_count + self.cache_miss_count
        return (
            self.cache_hit_count / total_cache_requests
            if total_cache_requests > 0
            else 0.0
        )


@dataclass
class ToolResult:
    """Enhanced tool execution result"""

    success: bool
    result: Any
    error: Optional[str] = None
    error_type: Optional[str] = None
    execution_time: float = 0.0
    from_cache: bool = False
    retry_count: int = 0
    validation_passed: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def success_result(
        cls,
        result: Any,
        execution_time: float = 0.0,
        from_cache: bool = False,
        retry_count: int = 0,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> "ToolResult":
        """Create successful result"""
        return cls(
            success=True,
            result=result,
            execution_time=execution_time,
            from_cache=from_cache,
            retry_count=retry_count,
            metadata=metadata or {},
        )

    @classmethod
    def failure_result(
        cls,
        error: str,
        error_type: Optional[str] = None,
        execution_time: float = 0.0,
        retry_count: int = 0,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> "ToolResult":
        """Create failure result"""
        return cls(
            success=False,
            result=None,
            error=error,
            error_type=error_type,
            execution_time=execution_time,
            retry_count=retry_count,
            metadata=metadata or {},
        )


class ToolValidationError(Exception):
    """Tool validation error"""

    pass


class ToolExecutionError(Exception):
    """Tool execution error"""

    pass


class ToolTimeoutError(Exception):
    """Tool timeout error"""

    pass


class EnhancedToolBase(ABC):
    """
    Enhanced tool base class with advanced capabilities.

    Features:
    - Input/output validation with configurable levels
    - Retry orchestration with multiple strategies
    - Advanced caching with TTL and content hashing
    - Comprehensive metrics and monitoring
    - Circuit breaker pattern for resilience
    - Async/await support with timeout handling
    """

    def __init__(self, config: ToolConfig):
        """Initialize enhanced tool"""
        self.config = config
        self.metrics = ToolMetrics()
        self.logger = get_bridge_logger(f"{__name__}.{config.name}")
        self.logger.setLevel(getattr(logging, config.log_level.upper()))

        # Circuit breaker state
        self.circuit_breaker_failures = 0
        self.circuit_breaker_last_failure = None
        self.circuit_breaker_open = False
        self.circuit_breaker_threshold = 5  # Open after 5 consecutive failures
        self.circuit_breaker_timeout = 30  # Reset after 30 seconds

        # Cache
        self._cache = {}
        self._cache_timestamps = {}

    async def execute(
        self, input_data: Dict[str, Any], context: Optional[Dict[str, Any]] = None
    ) -> ToolResult:
        """Execute tool with all enhancements"""

        start_time = time.time()
        retry_count = 0
        last_error = None

        try:
            # Circuit breaker check
            if self._is_circuit_breaker_open():
                return ToolResult.failure_result(
                    error="Circuit breaker is open due to repeated failures",
                    error_type="CircuitBreakerOpen",
                    retry_count=retry_count,
                )

            # Input validation
            if self.config.validation_level != ValidationLevel.NONE:
                await self._validate_input(input_data)

            # Check cache
            cache_key = self._generate_cache_key(input_data, context)
            cached_result = await self._get_from_cache(cache_key)

            if cached_result is not None:
                self.metrics.cache_hit_count += 1
                execution_time = time.time() - start_time

                return ToolResult.success_result(
                    result=cached_result,
                    execution_time=execution_time,
                    from_cache=True,
                    metadata={"cache_key": cache_key},
                )

            self.metrics.cache_miss_count += 1

            # Execute with retry logic
            while retry_count <= self.config.max_retries:
                try:
                    # Execute the actual tool logic
                    exec_start = time.time()
                    result = await asyncio.wait_for(
                        self._execute_impl(input_data, context),
                        timeout=self.config.timeout_seconds,
                    )
                    exec_time = time.time() - exec_start

                    # Output validation
                    if self.config.validation_level != ValidationLevel.NONE:
                        await self._validate_output(result)

                    # Cache result
                    await self._set_cache(cache_key, result)

                    # Update metrics
                    total_execution_time = time.time() - start_time
                    self.metrics.update_execution(total_execution_time, True)

                    # Reset circuit breaker on success
                    self._reset_circuit_breaker()

                    self.logger.info(
                        f"Tool {self.config.name} executed successfully in {exec_time:.3f}s"
                    )

                    return ToolResult.success_result(
                        result=result,
                        execution_time=total_execution_time,
                        retry_count=retry_count,
                        metadata={
                            "cache_key": cache_key,
                            "actual_execution_time": exec_time,
                        },
                    )

                except asyncio.TimeoutError as e:
                    last_error = ToolTimeoutError(
                        f"Tool execution timed out after {self.config.timeout_seconds}s"
                    )
                    self.logger.warning(
                        f"Tool {self.config.name} timed out (attempt {retry_count + 1})"
                    )

                except Exception as e:
                    last_error = e
                    error_type = type(e).__name__

                    # Check if we should retry
                    if not self._should_retry(e, retry_count):
                        break

                    self.logger.warning(
                        f"Tool {self.config.name} failed: {str(e)} (attempt {retry_count + 1})"
                    )

                # Implement retry delay
                if retry_count < self.config.max_retries:
                    delay = self._calculate_retry_delay(retry_count)
                    await asyncio.sleep(delay)

                retry_count += 1
                self.metrics.retry_count += 1

            # All retries exhausted
            self._update_circuit_breaker_failure()

            execution_time = time.time() - start_time
            error_type = type(last_error).__name__ if last_error else "UnknownError"
            error_message = str(last_error) if last_error else "Unknown error occurred"

            self.metrics.update_execution(execution_time, False, error_type)

            self.logger.error(
                f"Tool {self.config.name} failed after {retry_count} attempts: {error_message}"
            )

            return ToolResult.failure_result(
                error=error_message,
                error_type=error_type,
                execution_time=execution_time,
                retry_count=retry_count,
            )

        except ToolValidationError as e:
            execution_time = time.time() - start_time
            self.metrics.update_execution(execution_time, False, "ValidationError")

            self.logger.error(f"Tool {self.config.name} validation failed: {str(e)}")

            return ToolResult.failure_result(
                error=f"Validation failed: {str(e)}",
                error_type="ValidationError",
                execution_time=execution_time,
                retry_count=retry_count,
            )

        except Exception as e:
            execution_time = time.time() - start_time
            error_type = type(e).__name__
            self.metrics.update_execution(execution_time, False, error_type)

            self.logger.error(
                f"Tool {self.config.name} unexpected error: {str(e)}", exc_info=True
            )

            return ToolResult.failure_result(
                error=f"Unexpected error: {str(e)}",
                error_type=error_type,
                execution_time=execution_time,
                retry_count=retry_count,
            )

    @abstractmethod
    async def _execute_impl(
        self, input_data: Dict[str, Any], context: Optional[Dict[str, Any]] = None
    ) -> Any:
        """Implement the actual tool logic"""
        pass

    async def _validate_input(self, input_data: Dict[str, Any]) -> None:
        """Validate tool input"""
        if self.config.input_schema:
            # Basic schema validation (could be enhanced with jsonschema library)
            required_fields = self.config.input_schema.get("required", [])
            for field in required_fields:
                if field not in input_data:
                    raise ToolValidationError(
                        f"Required field '{field}' missing from input"
                    )

        # Custom validation hook
        await self._validate_input_custom(input_data)

    async def _validate_output(self, result: Any) -> None:
        """Validate tool output"""
        if self.config.output_schema:
            # Basic output validation
            if (
                isinstance(result, dict)
                and "required_fields" in self.config.output_schema
            ):
                required_fields = self.config.output_schema["required_fields"]
                for field in required_fields:
                    if field not in result:
                        raise ToolValidationError(
                            f"Required output field '{field}' missing from result"
                        )

        # Custom validation hook
        await self._validate_output_custom(result)

    async def _validate_input_custom(self, input_data: Dict[str, Any]) -> None:
        """Override for custom input validation"""
        pass

    async def _validate_output_custom(self, result: Any) -> None:
        """Override for custom output validation"""
        pass

    def _should_retry(self, error: Exception, retry_count: int) -> bool:
        """Determine if we should retry after an error"""
        if retry_count >= self.config.max_retries:
            return False

        if self.config.retry_strategy == RetryStrategy.NONE:
            return False

        # Check if error type is in retry list
        for exc_type in self.config.retry_on_exceptions:
            if isinstance(error, exc_type):
                return True

        return False

    def _calculate_retry_delay(self, retry_count: int) -> float:
        """Calculate delay before retry"""
        if self.config.retry_strategy == RetryStrategy.EXPONENTIAL_BACKOFF:
            delay = self.config.retry_delay_base * (2**retry_count)
            return min(delay, self.config.retry_delay_max)

        elif self.config.retry_strategy == RetryStrategy.FIXED_INTERVAL:
            return self.config.retry_delay_base

        elif self.config.retry_strategy == RetryStrategy.LINEAR_BACKOFF:
            delay = self.config.retry_delay_base * (retry_count + 1)
            return min(delay, self.config.retry_delay_max)

        else:
            return self.config.retry_delay_base

    def _generate_cache_key(
        self, input_data: Dict[str, Any], context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate cache key for input"""
        if self.config.cache_strategy == CacheStrategy.NONE:
            return ""

        # Create deterministic key from input data
        key_data = {
            "tool": self.config.name,
            "version": self.config.version,
            "input": input_data,
            "context": context or {},
        }

        # Sort keys for consistent hashing
        key_json = json.dumps(key_data, sort_keys=True)

        if self.config.cache_strategy == CacheStrategy.CONTENT_HASH:
            # Use content hash for cache key
            hash_obj = hashlib.sha256(key_json.encode())
            cache_key = hash_obj.hexdigest()[:16]  # First 16 chars of hash
        else:
            # Use simple hash
            cache_key = str(hash(key_json))

        return f"{self.config.cache_key_prefix}{self.config.name}:{cache_key}"

    async def _get_from_cache(self, cache_key: str) -> Optional[Any]:
        """Get result from cache"""
        if self.config.cache_strategy == CacheStrategy.NONE or not cache_key:
            return None

        if self.config.cache_strategy == CacheStrategy.MEMORY:
            # Check if cache entry exists and is not expired
            if cache_key in self._cache and cache_key in self._cache_timestamps:
                cache_time = self._cache_timestamps[cache_key]
                if datetime.now() - cache_time < timedelta(
                    seconds=self.config.cache_ttl_seconds
                ):
                    return self._cache[cache_key]
                else:
                    # Remove expired entry
                    del self._cache[cache_key]
                    del self._cache_timestamps[cache_key]

        # TODO: Implement Redis and hybrid caching
        return None

    async def _set_cache(self, cache_key: str, result: Any) -> None:
        """Set result in cache"""
        if self.config.cache_strategy == CacheStrategy.NONE or not cache_key:
            return

        if self.config.cache_strategy == CacheStrategy.MEMORY:
            self._cache[cache_key] = result
            self._cache_timestamps[cache_key] = datetime.now()

            # Simple cache cleanup (remove oldest entries if cache gets too large)
            if len(self._cache) > 1000:  # Configurable limit
                oldest_key = min(self._cache_timestamps.items(), key=lambda x: x[1])[0]
                del self._cache[oldest_key]
                del self._cache_timestamps[oldest_key]

        # TODO: Implement Redis and hybrid caching

    def _is_circuit_breaker_open(self) -> bool:
        """Check if circuit breaker is open"""
        if not self.circuit_breaker_open:
            return False

        # Check if timeout has passed
        if self.circuit_breaker_last_failure:
            timeout_passed = (
                datetime.now() - self.circuit_breaker_last_failure
            ).total_seconds() > self.circuit_breaker_timeout

            if timeout_passed:
                self._reset_circuit_breaker()
                return False

        return True

    def _update_circuit_breaker_failure(self) -> None:
        """Update circuit breaker on failure"""
        if self.config.retry_strategy == RetryStrategy.CIRCUIT_BREAKER:
            self.circuit_breaker_failures += 1
            self.circuit_breaker_last_failure = datetime.now()

            if self.circuit_breaker_failures >= self.circuit_breaker_threshold:
                self.circuit_breaker_open = True
                self.logger.warning(
                    f"Circuit breaker opened for tool {self.config.name}"
                )

    def _reset_circuit_breaker(self) -> None:
        """Reset circuit breaker on success"""
        if self.circuit_breaker_open:
            self.logger.info(f"Circuit breaker reset for tool {self.config.name}")

        self.circuit_breaker_failures = 0
        self.circuit_breaker_last_failure = None
        self.circuit_breaker_open = False

    def get_metrics(self) -> ToolMetrics:
        """Get tool metrics"""
        return self.metrics

    def get_health_status(self) -> Dict[str, Any]:
        """Get tool health status"""
        return {
            "tool_name": self.config.name,
            "tool_version": self.config.version,
            "circuit_breaker_open": self.circuit_breaker_open,
            "success_rate": self.metrics.success_rate,
            "failure_rate": self.metrics.failure_rate,
            "cache_hit_rate": self.metrics.cache_hit_rate,
            "avg_execution_time": self.metrics.avg_execution_time,
            "last_success": (
                self.metrics.last_success_time.isoformat()
                if self.metrics.last_success_time
                else None
            ),
            "last_failure": (
                self.metrics.last_failure_time.isoformat()
                if self.metrics.last_failure_time
                else None
            ),
            "error_counts": self.metrics.error_counts,
        }

    async def clear_cache(self) -> None:
        """Clear tool cache"""
        self._cache.clear()
        self._cache_timestamps.clear()
        self.logger.info(f"Cache cleared for tool {self.config.name}")

    async def health_check(self) -> bool:
        """Perform health check"""
        try:
            # Basic health check - override in subclasses for specific checks
            return not self.circuit_breaker_open
        except Exception as e:
            self.logger.error(
                f"Health check failed for tool {self.config.name}: {str(e)}"
            )
            return False
