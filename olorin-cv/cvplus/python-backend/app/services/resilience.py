"""
Resilience Patterns - Backward Compatibility Module
Re-exports from app.services.resilience for backward compatibility

DEPRECATED: Import directly from app.services.resilience instead
"""

from app.services.resilience import (
    Bulkhead,
    CircuitBreaker,
    CircuitState,
    ai_service_breaker,
    database_breaker,
    retry_with_exponential_backoff,
    storage_service_breaker,
    with_timeout,
)

__all__ = [
    "Bulkhead",
    "CircuitBreaker",
    "CircuitState",
    "ai_service_breaker",
    "database_breaker",
    "retry_with_exponential_backoff",
    "storage_service_breaker",
    "with_timeout",
]
