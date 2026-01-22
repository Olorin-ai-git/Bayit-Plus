"""
Global Resilience Instances
Pre-configured circuit breakers for external services
"""

from app.services.resilience.circuit_breaker import CircuitBreaker

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
