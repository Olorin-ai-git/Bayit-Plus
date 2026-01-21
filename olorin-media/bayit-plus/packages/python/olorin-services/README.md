# Olorin Services

Core services for the Olorin.ai ecosystem - resilience patterns, rate limiting, and cost calculations.

## Installation

```bash
poetry add olorin-services
```

## Features

### Circuit Breaker

Protect external service calls with circuit breaker patterns:

```python
from olorin_services import circuit_breaker, CircuitBreakerError

@circuit_breaker("openai_api")
async def call_openai(prompt: str) -> str:
    """This function is protected by a circuit breaker."""
    response = await openai_client.complete(prompt)
    return response.text

# When the service fails too many times, calls will fast-fail
try:
    result = await call_openai("Hello")
except CircuitBreakerError as e:
    print(f"Service unavailable: {e}")
```

### Rate Limiting

Per-partner rate limiting with sliding window counters:

```python
from olorin_services import partner_rate_limiter
from olorin_models import RateLimitConfig

# Check rate limits
limits = RateLimitConfig(
    requests_per_minute=100,
    requests_per_hour=1000,
)

is_allowed, error_msg = await partner_rate_limiter.check_rate_limit(
    partner_id="acme-corp",
    capability="realtime_dubbing",
    rate_limits=limits,
)

if not is_allowed:
    raise RateLimitError(error_msg)

# Record the request after successful processing
await partner_rate_limiter.record_request(
    partner_id="acme-corp",
    capability="realtime_dubbing",
)
```

### Cost Calculations

Calculate usage costs for billing:

```python
from olorin_services import (
    calculate_dubbing_cost,
    calculate_search_cost,
    calculate_llm_cost,
)

# Calculate dubbing session cost
cost = calculate_dubbing_cost(
    audio_seconds=300.0,
    characters_translated=5000,
    characters_synthesized=4500,
)
print(f"Estimated cost: ${cost:.4f}")

# Calculate search cost
search_cost = calculate_search_cost(tokens_used=1500)

# Calculate LLM cost
llm_cost = calculate_llm_cost(tokens_used=2000)
```

## Configuration

Customize the service configuration:

```python
from olorin_services import configure, ResilienceConfig, MeteringConfig

# Configure resilience settings
configure(
    resilience=ResilienceConfig(
        circuit_breaker_failure_threshold=10,
        circuit_breaker_recovery_timeout_seconds=60,
    ),
    metering=MeteringConfig(
        cost_per_audio_second_stt=0.0002,
        cost_per_1k_tokens_llm=0.02,
    ),
)
```

## License

Proprietary - Olorin.ai
