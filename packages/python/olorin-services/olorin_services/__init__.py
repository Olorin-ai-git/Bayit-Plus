"""
Olorin.ai Core Services

Provides resilience patterns, rate limiting, and cost calculation
for the Olorin.ai ecosystem.
"""

from olorin_services.config import (
    MeteringConfig,
    OlorinServicesConfig,
    ResilienceConfig,
    configure,
    get_config,
    set_config,
)
from olorin_services.costs import (
    calculate_dubbing_cost,
    calculate_llm_cost,
    calculate_search_cost,
    calculate_session_cost,
)
from olorin_services.rate_limiter import (
    PartnerRateLimiter,
    SlidingWindowCounter,
    partner_rate_limiter,
)
from olorin_services.resilience import (
    CLAUDE_BREAKER,
    ELEVENLABS_BREAKER,
    GOOGLE_TRANSLATE_BREAKER,
    OPENAI_BREAKER,
    PINECONE_BREAKER,
    CircuitBreaker,
    CircuitBreakerError,
    CircuitState,
    circuit_breaker,
    get_circuit_breaker,
    reset_all_breakers,
)

__all__ = [
    # Configuration
    "OlorinServicesConfig",
    "ResilienceConfig",
    "MeteringConfig",
    "get_config",
    "set_config",
    "configure",
    # Resilience
    "CircuitBreaker",
    "CircuitBreakerError",
    "CircuitState",
    "circuit_breaker",
    "get_circuit_breaker",
    "reset_all_breakers",
    # Breaker names
    "PINECONE_BREAKER",
    "OPENAI_BREAKER",
    "CLAUDE_BREAKER",
    "ELEVENLABS_BREAKER",
    "GOOGLE_TRANSLATE_BREAKER",
    # Rate limiting
    "PartnerRateLimiter",
    "SlidingWindowCounter",
    "partner_rate_limiter",
    # Cost calculations
    "calculate_dubbing_cost",
    "calculate_search_cost",
    "calculate_llm_cost",
    "calculate_session_cost",
]

__version__ = "1.0.0"
