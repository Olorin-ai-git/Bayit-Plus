"""
API Circuit Breaker Pattern Implementation

Provides fault tolerance for API calls with intelligent failure handling,
automatic recovery, and graceful degradation for the Olorin investigation system.

Author: Gil Klainert
Date: 2025-09-07
Plan: /docs/plans/2025-09-07-api-cost-management-system-plan.md
"""

import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import logging

from ..logging.integration_bridge import get_bridge_logger


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"          # Normal operation
    OPEN = "open"              # Circuit is open, calls fail fast
    HALF_OPEN = "half_open"    # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker behavior"""
    failure_threshold: int = 5              # Failures before opening
    recovery_timeout: float = 60.0          # Seconds before trying half-open
    success_threshold: int = 3              # Successes in half-open to close
    timeout: float = 30.0                   # Request timeout seconds
    expected_exception_types: Tuple = ()    # Exceptions that trigger circuit
    
    # Advanced settings
    sliding_window_size: int = 10           # Size of failure tracking window
    minimum_requests: int = 5               # Min requests before considering failure rate
    failure_rate_threshold: float = 0.5     # 50% failure rate triggers opening
    slow_request_threshold: float = 10.0    # Seconds - what counts as "slow"
    slow_request_rate_threshold: float = 0.5 # 50% slow requests triggers opening


@dataclass
class CircuitBreakerStats:
    """Circuit breaker operational statistics"""
    state: CircuitState
    failure_count: int
    success_count: int
    request_count: int
    last_failure_time: Optional[datetime]
    last_success_time: Optional[datetime]
    state_changed_time: datetime
    consecutive_failures: int
    consecutive_successes: int
    
    # Performance metrics
    average_response_time: float
    slow_request_count: int
    total_requests: int
    total_failures: int
    total_timeouts: int
    
    # Recovery metrics
    recovery_attempts: int
    last_recovery_attempt: Optional[datetime]


class APICircuitBreakerError(Exception):
    """Exception raised when circuit breaker is open"""
    def __init__(self, message: str, stats: CircuitBreakerStats):
        super().__init__(message)
        self.stats = stats


class APICircuitBreaker:
    """
    Circuit breaker implementation for API calls with advanced failure detection
    and recovery strategies.
    """
    
    def __init__(self, name: str, config: Optional[CircuitBreakerConfig] = None):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.logger = get_bridge_logger(f"circuit_breaker.{name}", structured=True)
        
        # State management
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.consecutive_failures = 0
        self.consecutive_successes = 0
        self.last_failure_time: Optional[datetime] = None
        self.last_success_time: Optional[datetime] = None
        self.state_changed_time = datetime.now()
        
        # Performance tracking
        self.request_times = []
        self.slow_requests = 0
        self.total_requests = 0
        self.total_failures = 0
        self.total_timeouts = 0
        
        # Recovery tracking
        self.recovery_attempts = 0
        self.last_recovery_attempt: Optional[datetime] = None
        
        # Sliding window for failure rate calculation
        self.sliding_window = []
        
        self.logger.info(f"Circuit breaker '{name}' initialized", extra={
            "config": {
                "failure_threshold": self.config.failure_threshold,
                "recovery_timeout": self.config.recovery_timeout,
                "timeout": self.config.timeout
            }
        })
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute a function call through the circuit breaker
        
        Args:
            func: Function to execute
            *args, **kwargs: Arguments for the function
            
        Returns:
            Function result
            
        Raises:
            APICircuitBreakerError: If circuit is open
            Original exceptions: If function fails and circuit allows
        """
        # Check if circuit allows the call
        if not self._can_execute():
            stats = self._get_stats()
            raise APICircuitBreakerError(
                f"Circuit breaker '{self.name}' is OPEN - calls not allowed",
                stats
            )
        
        self.total_requests += 1
        start_time = time.time()
        
        try:
            # Execute the function with timeout
            result = await asyncio.wait_for(
                func(*args, **kwargs) if asyncio.iscoroutinefunction(func) 
                else asyncio.to_thread(func, *args, **kwargs),
                timeout=self.config.timeout
            )
            
            # Record successful execution
            execution_time = time.time() - start_time
            await self._on_success(execution_time)
            
            return result
            
        except asyncio.TimeoutError as e:
            execution_time = time.time() - start_time
            self.total_timeouts += 1
            await self._on_failure(e, execution_time)
            raise
            
        except Exception as e:
            execution_time = time.time() - start_time
            
            # Check if this is an expected exception type
            if (self.config.expected_exception_types and 
                isinstance(e, self.config.expected_exception_types)):
                await self._on_failure(e, execution_time)
            else:
                # For unexpected exceptions, still track but don't necessarily fail
                await self._on_success(execution_time)
            
            raise
    
    def _can_execute(self) -> bool:
        """Check if circuit allows execution"""
        if self.state == CircuitState.CLOSED:
            return True
        
        if self.state == CircuitState.OPEN:
            # Check if recovery timeout has elapsed
            if self.last_failure_time:
                time_since_failure = datetime.now() - self.last_failure_time
                if time_since_failure.total_seconds() >= self.config.recovery_timeout:
                    self._transition_to_half_open()
                    return True
            return False
        
        if self.state == CircuitState.HALF_OPEN:
            return True
        
        return False
    
    async def _on_success(self, execution_time: float):
        """Handle successful execution"""
        self.success_count += 1
        self.consecutive_successes += 1
        self.consecutive_failures = 0
        self.last_success_time = datetime.now()
        
        # Track performance
        self.request_times.append(execution_time)
        if len(self.request_times) > self.config.sliding_window_size:
            self.request_times.pop(0)
        
        if execution_time > self.config.slow_request_threshold:
            self.slow_requests += 1
        
        # Update sliding window
        self.sliding_window.append(True)  # True for success
        if len(self.sliding_window) > self.config.sliding_window_size:
            self.sliding_window.pop(0)
        
        # State transitions based on success
        if self.state == CircuitState.HALF_OPEN:
            if self.consecutive_successes >= self.config.success_threshold:
                self._transition_to_closed()
        
        self.logger.debug(f"Circuit breaker '{self.name}' recorded success", extra={
            "execution_time": execution_time,
            "consecutive_successes": self.consecutive_successes,
            "state": self.state.value
        })
    
    async def _on_failure(self, exception: Exception, execution_time: float):
        """Handle failed execution"""
        self.failure_count += 1
        self.total_failures += 1
        self.consecutive_failures += 1
        self.consecutive_successes = 0
        self.last_failure_time = datetime.now()
        
        # Track performance
        self.request_times.append(execution_time)
        if len(self.request_times) > self.config.sliding_window_size:
            self.request_times.pop(0)
        
        if execution_time > self.config.slow_request_threshold:
            self.slow_requests += 1
        
        # Update sliding window
        self.sliding_window.append(False)  # False for failure
        if len(self.sliding_window) > self.config.sliding_window_size:
            self.sliding_window.pop(0)
        
        # Check if circuit should open
        should_open = self._should_open_circuit()
        
        if should_open and self.state == CircuitState.CLOSED:
            self._transition_to_open()
        elif self.state == CircuitState.HALF_OPEN:
            # Any failure in half-open state reopens circuit
            self._transition_to_open()
        
        self.logger.warning(f"Circuit breaker '{self.name}' recorded failure", extra={
            "exception": str(exception),
            "execution_time": execution_time,
            "consecutive_failures": self.consecutive_failures,
            "state": self.state.value,
            "should_open": should_open
        })
    
    def _should_open_circuit(self) -> bool:
        """Determine if circuit should open based on failure patterns"""
        # Simple threshold check
        if self.consecutive_failures >= self.config.failure_threshold:
            return True
        
        # Sliding window failure rate check
        if len(self.sliding_window) >= self.config.minimum_requests:
            failures = sum(1 for success in self.sliding_window if not success)
            failure_rate = failures / len(self.sliding_window)
            
            if failure_rate >= self.config.failure_rate_threshold:
                return True
        
        # Slow request rate check
        if (self.total_requests >= self.config.minimum_requests and 
            self.slow_requests > 0):
            slow_rate = self.slow_requests / self.total_requests
            if slow_rate >= self.config.slow_request_rate_threshold:
                return True
        
        return False
    
    def _transition_to_open(self):
        """Transition circuit to OPEN state"""
        if self.state != CircuitState.OPEN:
            self.state = CircuitState.OPEN
            self.state_changed_time = datetime.now()
            
            self.logger.warning(f"Circuit breaker '{self.name}' OPENED", extra={
                "consecutive_failures": self.consecutive_failures,
                "failure_rate": self._calculate_failure_rate(),
                "slow_request_rate": self._calculate_slow_request_rate()
            })
    
    def _transition_to_half_open(self):
        """Transition circuit to HALF_OPEN state"""
        if self.state != CircuitState.HALF_OPEN:
            self.state = CircuitState.HALF_OPEN
            self.state_changed_time = datetime.now()
            self.recovery_attempts += 1
            self.last_recovery_attempt = datetime.now()
            self.consecutive_successes = 0
            
            self.logger.info(f"Circuit breaker '{self.name}' HALF-OPEN - testing recovery", extra={
                "recovery_attempt": self.recovery_attempts,
                "time_since_last_failure": (
                    (datetime.now() - self.last_failure_time).total_seconds()
                    if self.last_failure_time else 0
                )
            })
    
    def _transition_to_closed(self):
        """Transition circuit to CLOSED state"""
        if self.state != CircuitState.CLOSED:
            self.state = CircuitState.CLOSED
            self.state_changed_time = datetime.now()
            
            # Reset failure counters
            self.consecutive_failures = 0
            self.failure_count = 0
            
            self.logger.info(f"Circuit breaker '{self.name}' CLOSED - normal operation resumed", extra={
                "consecutive_successes": self.consecutive_successes,
                "recovery_attempts": self.recovery_attempts
            })
    
    def _calculate_failure_rate(self) -> float:
        """Calculate current failure rate from sliding window"""
        if not self.sliding_window:
            return 0.0
        
        failures = sum(1 for success in self.sliding_window if not success)
        return failures / len(self.sliding_window)
    
    def _calculate_slow_request_rate(self) -> float:
        """Calculate slow request rate"""
        if self.total_requests == 0:
            return 0.0
        return self.slow_requests / self.total_requests
    
    def _get_average_response_time(self) -> float:
        """Calculate average response time"""
        if not self.request_times:
            return 0.0
        return sum(self.request_times) / len(self.request_times)
    
    def _get_stats(self) -> CircuitBreakerStats:
        """Get current circuit breaker statistics"""
        return CircuitBreakerStats(
            state=self.state,
            failure_count=self.failure_count,
            success_count=self.success_count,
            request_count=self.total_requests,
            last_failure_time=self.last_failure_time,
            last_success_time=self.last_success_time,
            state_changed_time=self.state_changed_time,
            consecutive_failures=self.consecutive_failures,
            consecutive_successes=self.consecutive_successes,
            average_response_time=self._get_average_response_time(),
            slow_request_count=self.slow_requests,
            total_requests=self.total_requests,
            total_failures=self.total_failures,
            total_timeouts=self.total_timeouts,
            recovery_attempts=self.recovery_attempts,
            last_recovery_attempt=self.last_recovery_attempt
        )
    
    def get_stats_dict(self) -> Dict[str, Any]:
        """Get statistics as dictionary"""
        stats = self._get_stats()
        return {
            "name": self.name,
            "state": stats.state.value,
            "failure_count": stats.failure_count,
            "success_count": stats.success_count,
            "request_count": stats.request_count,
            "consecutive_failures": stats.consecutive_failures,
            "consecutive_successes": stats.consecutive_successes,
            "average_response_time": stats.average_response_time,
            "slow_request_count": stats.slow_request_count,
            "failure_rate": self._calculate_failure_rate(),
            "slow_request_rate": self._calculate_slow_request_rate(),
            "recovery_attempts": stats.recovery_attempts,
            "time_in_current_state": (
                datetime.now() - stats.state_changed_time
            ).total_seconds(),
            "last_failure": (
                stats.last_failure_time.isoformat() 
                if stats.last_failure_time else None
            ),
            "last_success": (
                stats.last_success_time.isoformat() 
                if stats.last_success_time else None
            )
        }
    
    def reset(self):
        """Reset circuit breaker to initial state"""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.consecutive_failures = 0
        self.consecutive_successes = 0
        self.last_failure_time = None
        self.last_success_time = None
        self.state_changed_time = datetime.now()
        
        # Reset performance tracking
        self.request_times.clear()
        self.sliding_window.clear()
        self.slow_requests = 0
        self.total_requests = 0
        self.total_failures = 0
        self.total_timeouts = 0
        
        # Reset recovery tracking
        self.recovery_attempts = 0
        self.last_recovery_attempt = None
        
        self.logger.info(f"Circuit breaker '{self.name}' reset to initial state")
    
    def force_open(self):
        """Manually force circuit to OPEN state"""
        self._transition_to_open()
        self.logger.warning(f"Circuit breaker '{self.name}' manually forced OPEN")
    
    def force_closed(self):
        """Manually force circuit to CLOSED state"""
        self._transition_to_closed()
        self.logger.info(f"Circuit breaker '{self.name}' manually forced CLOSED")


class CircuitBreakerRegistry:
    """Registry for managing multiple circuit breakers"""
    
    def __init__(self):
        self.breakers: Dict[str, APICircuitBreaker] = {}
        self.logger = get_bridge_logger("circuit_breaker_registry", structured=True)
    
    def get_breaker(self, name: str, config: Optional[CircuitBreakerConfig] = None) -> APICircuitBreaker:
        """Get or create a circuit breaker by name"""
        if name not in self.breakers:
            self.breakers[name] = APICircuitBreaker(name, config)
            self.logger.info(f"Created new circuit breaker: {name}")
        
        return self.breakers[name]
    
    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all circuit breakers"""
        return {name: breaker.get_stats_dict() 
                for name, breaker in self.breakers.items()}
    
    def reset_all(self):
        """Reset all circuit breakers"""
        for breaker in self.breakers.values():
            breaker.reset()
        self.logger.info("Reset all circuit breakers")
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get health summary of all circuit breakers"""
        total_breakers = len(self.breakers)
        open_breakers = sum(1 for b in self.breakers.values() if b.state == CircuitState.OPEN)
        half_open_breakers = sum(1 for b in self.breakers.values() if b.state == CircuitState.HALF_OPEN)
        
        return {
            "total_breakers": total_breakers,
            "healthy_breakers": total_breakers - open_breakers - half_open_breakers,
            "open_breakers": open_breakers,
            "half_open_breakers": half_open_breakers,
            "overall_health": "healthy" if open_breakers == 0 else "degraded" if open_breakers < total_breakers else "critical"
        }


# Global registry instance
_circuit_breaker_registry: Optional[CircuitBreakerRegistry] = None


def get_circuit_breaker_registry() -> CircuitBreakerRegistry:
    """Get global circuit breaker registry"""
    global _circuit_breaker_registry
    if _circuit_breaker_registry is None:
        _circuit_breaker_registry = CircuitBreakerRegistry()
    return _circuit_breaker_registry


def get_circuit_breaker(name: str, config: Optional[CircuitBreakerConfig] = None) -> APICircuitBreaker:
    """Convenience function to get a circuit breaker"""
    return get_circuit_breaker_registry().get_breaker(name, config)