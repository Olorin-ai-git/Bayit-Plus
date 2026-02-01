# LLM Configuration Guide

**Version:** 1.0.0
**Last Updated:** 2026-01-30
**Status:** ✅ Production

---

## Overview

This guide covers configuring Large Language Models (LLMs) for Bayit+ AI features. All configuration is managed through **Google Cloud Secret Manager** as the single source of truth.

**Key Components:**
- Google Cloud Secret Manager for API keys and model configs
- Model selection strategies (Sonnet vs Haiku vs GPT)
- Cost optimization techniques
- Rate limiting and quota management
- Fallback strategies and circuit breakers
- Monitoring and alerting

---

## Google Cloud Secret Manager

### Required Secrets

```bash
# Anthropic Claude API
gcloud secrets create ANTHROPIC_API_KEY \
  --data-file=- <<< "sk-ant-api03-..."

# OpenAI API
gcloud secrets create OPENAI_API_KEY \
  --data-file=- <<< "sk-proj-..."

# Model Configuration
gcloud secrets create LLM_MODEL_CONFIG \
  --data-file=model_config.json

# Rate Limits
gcloud secrets create LLM_RATE_LIMITS \
  --data-file=rate_limits.json
```

### Grant Access to Service Accounts

```bash
# Backend service account
gcloud secrets add-iam-policy-binding ANTHROPIC_API_KEY \
  --member="serviceAccount:bayit-backend-production@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
  --member="serviceAccount:bayit-backend-production@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding LLM_MODEL_CONFIG \
  --member="serviceAccount:bayit-backend-production@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Model Configuration Schema

```json
{
  "models": {
    "claude-sonnet-4-5": {
      "provider": "anthropic",
      "name": "claude-sonnet-4-5-20250929",
      "cost_per_million_input_tokens": 15.00,
      "cost_per_million_output_tokens": 75.00,
      "max_tokens": 200000,
      "use_cases": ["complex_reasoning", "comprehensive_analysis", "agent_audits"]
    },
    "claude-haiku-3-5": {
      "provider": "anthropic",
      "name": "claude-haiku-3-5-20241022",
      "cost_per_million_input_tokens": 1.00,
      "cost_per_million_output_tokens": 5.00,
      "max_tokens": 200000,
      "use_cases": ["search", "quick_queries", "high_volume"]
    },
    "gpt-4-turbo": {
      "provider": "openai",
      "name": "gpt-4-turbo-2024-04-09",
      "cost_per_million_input_tokens": 10.00,
      "cost_per_million_output_tokens": 30.00,
      "max_tokens": 128000,
      "use_cases": ["fallback", "alternative"]
    },
    "text-embedding-ada-002": {
      "provider": "openai",
      "name": "text-embedding-ada-002",
      "cost_per_million_tokens": 0.13,
      "max_tokens": 8191,
      "use_cases": ["vector_embeddings", "semantic_search"]
    }
  },
  "feature_model_mapping": {
    "ai_search": "claude-haiku-3-5",
    "ai_recommendations": "claude-haiku-3-5",
    "catch_up": "claude-haiku-3-5",
    "agent_comprehensive_audit": "claude-sonnet-4-5",
    "content_analysis": "claude-sonnet-4-5"
  },
  "fallback_chain": {
    "claude-sonnet-4-5": ["claude-haiku-3-5", "gpt-4-turbo"],
    "claude-haiku-3-5": ["gpt-4-turbo", "claude-sonnet-4-5"],
    "gpt-4-turbo": ["claude-haiku-3-5", "claude-sonnet-4-5"]
  }
}
```

---

## Model Selection

### Decision Matrix

| Use Case | Model | Rationale | Cost/1K Queries |
|----------|-------|-----------|-----------------|
| **AI Search** | Claude Haiku 3.5 | Fast, cost-effective, high volume | $2-5 |
| **AI Recommendations** | Claude Haiku 3.5 | Real-time, frequent requests | $1-3 |
| **Auto Catch-Up** | Claude Haiku 3.5 | Quick summaries, acceptable quality | $3-7 |
| **Agent Audits** | Claude Sonnet 4.5 | Complex reasoning required | $50-150 |
| **Content Analysis** | Claude Sonnet 4.5 | High accuracy needed | $30-80 |
| **Vector Embeddings** | OpenAI ada-002 | Specialized for embeddings | $0.13-0.50 |

### Model Selection Code

```python
# backend/app/core/llm_config.py
from enum import Enum
from google.cloud import secretmanager
import json

class LLMProvider(str, Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"

class LLMConfig:
    """LLM configuration manager."""

    def __init__(self):
        self.client = secretmanager.SecretManagerServiceClient()
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        self._config = None

    async def load_config(self):
        """Load configuration from Google Cloud Secret Manager."""
        if self._config:
            return self._config

        secret_name = f"projects/{self.project_id}/secrets/LLM_MODEL_CONFIG/versions/latest"
        response = self.client.access_secret_version(request={"name": secret_name})
        self._config = json.loads(response.payload.data.decode("UTF-8"))
        return self._config

    async def get_model_for_feature(self, feature: str) -> dict:
        """Get recommended model for a feature."""
        config = await self.load_config()
        model_name = config["feature_model_mapping"].get(feature)
        if not model_name:
            raise ValueError(f"No model configured for feature: {feature}")

        model_config = config["models"].get(model_name)
        if not model_config:
            raise ValueError(f"Model {model_name} not found in config")

        return model_config

    async def get_fallback_models(self, primary_model: str) -> list[dict]:
        """Get fallback models for a primary model."""
        config = await self.load_config()
        fallback_names = config["fallback_chain"].get(primary_model, [])
        return [config["models"][name] for name in fallback_names if name in config["models"]]
```

---

## Cost Optimization

### 1. Caching Strategies

```python
# backend/app/services/llm/cache_service.py
from functools import lru_cache
import hashlib
import redis
import json

class LLMCacheService:
    """Cache LLM responses to reduce costs."""

    def __init__(self):
        self.redis = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT)
        self.ttl = 3600  # 1 hour

    def _generate_cache_key(self, model: str, prompt: str, **kwargs) -> str:
        """Generate cache key from prompt and parameters."""
        content = f"{model}:{prompt}:{json.dumps(kwargs, sort_keys=True)}"
        return f"llm_cache:{hashlib.sha256(content.encode()).hexdigest()}"

    async def get_cached_response(self, model: str, prompt: str, **kwargs) -> dict | None:
        """Get cached response if available."""
        key = self._generate_cache_key(model, prompt, **kwargs)
        cached = self.redis.get(key)
        if cached:
            return json.loads(cached)
        return None

    async def cache_response(self, model: str, prompt: str, response: dict, **kwargs):
        """Cache LLM response."""
        key = self._generate_cache_key(model, prompt, **kwargs)
        self.redis.setex(key, self.ttl, json.dumps(response))
```

### 2. Batch Operations

```python
# backend/app/services/llm/batch_service.py
from anthropic import AsyncAnthropic
from typing import List

class LLMBatchService:
    """Process multiple requests in a single batch."""

    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def batch_analyze(self, items: List[dict]) -> List[dict]:
        """Analyze multiple items in one request."""
        # Combine all items into single prompt
        combined_prompt = "\n\n".join([
            f"Item {i+1}:\n{json.dumps(item)}"
            for i, item in enumerate(items)
        ])

        prompt = f"""Analyze the following items and return structured JSON:

{combined_prompt}

Return JSON array with analysis for each item."""

        response = await self.client.messages.create(
            model="claude-haiku-3-5-20241022",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )

        # Parse response
        return json.loads(response.content[0].text)
```

### 3. Token Limits

```python
# backend/app/services/llm/token_optimizer.py
import tiktoken

class TokenOptimizer:
    """Optimize token usage for cost efficiency."""

    def __init__(self):
        self.encoder = tiktoken.encoding_for_model("gpt-4")

    def truncate_to_limit(self, text: str, max_tokens: int) -> str:
        """Truncate text to token limit."""
        tokens = self.encoder.encode(text)
        if len(tokens) <= max_tokens:
            return text

        # Truncate tokens and decode
        truncated_tokens = tokens[:max_tokens]
        return self.encoder.decode(truncated_tokens)

    def estimate_cost(self, input_text: str, output_tokens: int, model_config: dict) -> float:
        """Estimate cost for a request."""
        input_tokens = len(self.encoder.encode(input_text))
        input_cost = (input_tokens / 1_000_000) * model_config["cost_per_million_input_tokens"]
        output_cost = (output_tokens / 1_000_000) * model_config["cost_per_million_output_tokens"]
        return input_cost + output_cost
```

### 4. Prompt Optimization

```python
# Use concise, efficient prompts
PROMPT_TEMPLATES = {
    "search": "Find content matching: {query}. Return top 10 results as JSON.",
    "summary": "Summarize: {content}. Max 200 words.",
    "classify": "Classify content: {title}. Categories: {categories}. Return JSON.",
}

# ❌ Inefficient
verbose_prompt = """
Please analyze the following content very carefully and provide a comprehensive
analysis including all relevant details, metadata, and contextual information...
"""

# ✅ Efficient
concise_prompt = "Analyze content: {content}. Return JSON with: genre, mood, themes."
```

### 5. Model Downgrading

```python
# backend/app/services/llm/model_selector.py
class ModelSelector:
    """Select appropriate model based on task complexity."""

    def select_model(self, task_complexity: str, content_length: int) -> str:
        """Select cost-effective model."""
        if task_complexity == "simple" or content_length < 1000:
            return "claude-haiku-3-5"  # $1/M tokens
        elif task_complexity == "medium":
            return "claude-haiku-3-5"  # Still cost-effective
        else:
            return "claude-sonnet-4-5"  # $15/M tokens, only when necessary
```

### 6. Result Caching

```python
# Cache search results
@lru_cache(maxsize=1000)
def cached_search(query_hash: str) -> List[dict]:
    """Cache search results for identical queries."""
    pass

# Redis caching for longer TTL
redis_cache_key = f"search:{hashlib.sha256(query.encode()).hexdigest()}"
cached_results = redis.get(redis_cache_key)
if cached_results:
    return json.loads(cached_results)

# Perform search and cache
results = await search_service.search(query)
redis.setex(redis_cache_key, 3600, json.dumps(results))
```

---

## Rate Limiting

### Per-User Rate Limits

```json
{
  "rate_limits": {
    "free_tier": {
      "requests_per_minute": 60,
      "requests_per_hour": 1000,
      "requests_per_day": 5000
    },
    "beta_500": {
      "requests_per_minute": 120,
      "requests_per_hour": 2000,
      "requests_per_day": 10000
    },
    "premium": {
      "requests_per_minute": 300,
      "requests_per_hour": 5000,
      "requests_per_day": 25000
    },
    "admin": {
      "requests_per_minute": -1,
      "requests_per_hour": -1,
      "requests_per_day": -1
    }
  },
  "feature_specific_limits": {
    "ai_search": {
      "requests_per_minute": 10,
      "requests_per_hour": 100
    },
    "ai_recommendations": {
      "requests_per_minute": 20,
      "requests_per_hour": 200
    },
    "catch_up": {
      "requests_per_minute": 5,
      "requests_per_hour": 50
    }
  }
}
```

### Rate Limiter Implementation

```python
# backend/app/core/rate_limiter.py
from app.services.olorin.rate_limiter import OlorinRateLimiter

class LLMRateLimiter:
    """Rate limiter for LLM API calls."""

    def __init__(self):
        self.limiter = OlorinRateLimiter()

    async def check_rate_limit(
        self,
        user_id: str,
        feature: str,
        tier: str = "free_tier",
    ) -> bool:
        """Check if request is within rate limit."""
        # Per-user global limit
        global_key = f"llm_global:{user_id}"
        if not await self.limiter.check_limit(global_key, tier):
            raise RateLimitExceededError("Global rate limit exceeded")

        # Per-feature limit
        feature_key = f"llm_feature:{user_id}:{feature}"
        if not await self.limiter.check_limit(feature_key, feature):
            raise RateLimitExceededError(f"{feature} rate limit exceeded")

        return True
```

---

## Fallback Strategies

### Circuit Breaker Pattern

```python
# backend/app/services/llm/circuit_breaker.py
from enum import Enum
from datetime import datetime, timedelta

class CircuitState(str, Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failures detected, reject requests
    HALF_OPEN = "half_open"  # Testing recovery

class CircuitBreaker:
    """Circuit breaker for LLM API calls."""

    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout  # seconds
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED

    async def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection."""
        if self.state == CircuitState.OPEN:
            if datetime.utcnow() - self.last_failure_time > timedelta(seconds=self.timeout):
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitOpenError("Circuit breaker is open")

        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        """Handle successful call."""
        self.failure_count = 0
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED

    def _on_failure(self):
        """Handle failed call."""
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
```

### Fallback Chain

```python
# backend/app/services/llm/fallback_service.py
from typing import List, Callable

class LLMFallbackService:
    """Manages fallback between LLM providers."""

    def __init__(self):
        self.config = LLMConfig()
        self.circuit_breakers = {}

    async def execute_with_fallback(
        self,
        feature: str,
        operation: Callable,
        *args,
        **kwargs,
    ):
        """Execute operation with automatic fallback."""
        # Get primary model
        primary_model = await self.config.get_model_for_feature(feature)

        # Get fallback models
        fallback_models = await self.config.get_fallback_models(primary_model["name"])

        # Try primary model
        models_to_try = [primary_model] + fallback_models

        last_exception = None
        for model in models_to_try:
            try:
                circuit_breaker = self._get_circuit_breaker(model["name"])
                result = await circuit_breaker.call(
                    operation,
                    model=model,
                    *args,
                    **kwargs,
                )
                return result
            except Exception as e:
                last_exception = e
                logger.warning(
                    f"Model {model['name']} failed, trying fallback",
                    extra={"error": str(e)},
                )
                continue

        # All models failed
        raise LLMFallbackExhaustedError(
            f"All fallback models failed for feature: {feature}",
            original_error=last_exception,
        )

    def _get_circuit_breaker(self, model_name: str) -> CircuitBreaker:
        """Get or create circuit breaker for model."""
        if model_name not in self.circuit_breakers:
            self.circuit_breakers[model_name] = CircuitBreaker()
        return self.circuit_breakers[model_name]
```

---

## Monitoring

### Prometheus Metrics

```python
# backend/app/core/metrics.py
from prometheus_client import Counter, Histogram, Gauge

# Request metrics
llm_requests_total = Counter(
    "bayit_llm_requests_total",
    "Total LLM requests",
    ["model", "feature", "status"],
)

llm_request_duration_seconds = Histogram(
    "bayit_llm_request_duration_seconds",
    "LLM request duration",
    ["model", "feature"],
)

llm_tokens_used_total = Counter(
    "bayit_llm_tokens_used_total",
    "Total tokens used",
    ["model", "type"],  # type: input/output
)

llm_cost_dollars_total = Counter(
    "bayit_llm_cost_dollars_total",
    "Total LLM cost",
    ["model", "feature"],
)

# Error metrics
llm_errors_total = Counter(
    "bayit_llm_errors_total",
    "Total LLM errors",
    ["model", "error_type"],
)

llm_fallback_triggered_total = Counter(
    "bayit_llm_fallback_triggered_total",
    "Fallback invocations",
    ["primary_model", "fallback_model"],
)

# Circuit breaker metrics
llm_circuit_breaker_state = Gauge(
    "bayit_llm_circuit_breaker_state",
    "Circuit breaker state",
    ["model"],  # 0=closed, 1=half_open, 2=open
)
```

### Grafana Alerts

```yaml
# config/grafana/alerts/llm_alerts.yml
groups:
  - name: llm_alerts
    interval: 30s
    rules:
      - alert: LLMHighErrorRate
        expr: rate(bayit_llm_errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High LLM error rate detected"
          description: "Error rate above 5% for {{ $labels.model }}"

      - alert: LLMHighCost
        expr: rate(bayit_llm_cost_dollars_total[1h]) > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "LLM costs exceeding budget"
          description: "Cost rate > $100/hour for {{ $labels.feature }}"

      - alert: LLMCircuitBreakerOpen
        expr: bayit_llm_circuit_breaker_state == 2
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "LLM circuit breaker open"
          description: "Circuit breaker open for {{ $labels.model }}"

      - alert: LLMHighLatency
        expr: histogram_quantile(0.95, rate(bayit_llm_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "LLM high latency detected"
          description: "P95 latency > 2s for {{ $labels.model }}"
```

---

## Environment-Specific Configuration

### Development

```bash
# .env.development
LLM_ENVIRONMENT=development
LLM_ENABLE_CACHING=true
LLM_CACHE_TTL=3600
LLM_DEFAULT_MODEL=claude-haiku-3-5
LLM_ENABLE_FALLBACK=true
LLM_BUDGET_LIMIT_DAILY=50.00  # $50/day
```

### Staging

```bash
# .env.staging
LLM_ENVIRONMENT=staging
LLM_ENABLE_CACHING=true
LLM_CACHE_TTL=1800
LLM_DEFAULT_MODEL=claude-haiku-3-5
LLM_ENABLE_FALLBACK=true
LLM_BUDGET_LIMIT_DAILY=200.00  # $200/day
```

### Production

```bash
# .env.production
LLM_ENVIRONMENT=production
LLM_ENABLE_CACHING=true
LLM_CACHE_TTL=3600
LLM_DEFAULT_MODEL=claude-haiku-3-5
LLM_ENABLE_FALLBACK=true
LLM_BUDGET_LIMIT_DAILY=1000.00  # $1000/day
LLM_ENABLE_CIRCUIT_BREAKER=true
```

---

## Troubleshooting

### API Key Issues

```bash
# Verify secret exists
gcloud secrets describe ANTHROPIC_API_KEY

# Test secret access
gcloud secrets versions access latest --secret="ANTHROPIC_API_KEY"

# Check IAM permissions
gcloud secrets get-iam-policy ANTHROPIC_API_KEY
```

### Rate Limit Errors

```python
# Check current rate limit status
from app.services.olorin.rate_limiter import OlorinRateLimiter

limiter = OlorinRateLimiter()
status = await limiter.get_limit_status(user_id, "ai_search")
print(f"Remaining: {status['remaining']}/{status['limit']}")
print(f"Resets at: {status['reset_time']}")
```

### High Costs

```python
# Analyze cost breakdown
from app.services.llm.cost_analyzer import CostAnalyzer

analyzer = CostAnalyzer()
report = await analyzer.generate_cost_report(period="day")
print(f"Total cost: ${report['total_cost']:.2f}")
print(f"Top features: {report['top_features']}")
print(f"Top models: {report['top_models']}")
```

---

## Best Practices

1. **Always use Google Cloud Secret Manager** - Never hardcode API keys
2. **Enable caching** - Reduce costs by 40-60%
3. **Use Haiku for high-volume operations** - 15x cheaper than Sonnet
4. **Implement fallback chains** - Ensure high availability
5. **Monitor costs daily** - Set budget alerts
6. **Optimize prompts** - Concise prompts reduce token usage
7. **Batch when possible** - Process multiple items per request
8. **Enable circuit breakers** - Prevent cascade failures

---

## Related Documentation

- [AI Features Overview](../features/AI_FEATURES_OVERVIEW.md) - AI feature catalog
- [Secrets Management](SECRETS_MANAGEMENT.md) - Google Cloud Secret Manager guide
- [Credit System](../technical/CREDIT_SYSTEM.md) - Credit metering architecture

---

**Document Status:** ✅ Complete
**Last Updated:** 2026-01-30
**Maintained by:** Infrastructure Team
**Next Review:** 2026-03-30
