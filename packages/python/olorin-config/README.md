# olorin-config

Centralized Pydantic configuration models for the Olorin.ai AI overlay platform.

## Installation

```bash
# Using Poetry (recommended)
poetry add olorin-config

# Or from local path
poetry add ../packages/python/olorin-config
```

## Usage

```python
from olorin_config import OlorinSettings

# Load configuration from environment variables
settings = OlorinSettings()

# Check if features are enabled
if settings.semantic_search_enabled:
    # Access nested configuration
    api_key = settings.pinecone.api_key
    index_name = settings.pinecone.index_name

# Validate configuration
errors = settings.validate_enabled_features()
if errors:
    raise ValueError(f"Configuration errors: {errors}")

# Check which features are enabled
enabled = settings.get_enabled_features()
print(f"Enabled features: {enabled}")
```

## Configuration

All configuration values can be set via environment variables:

### Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `OLORIN_DUBBING_ENABLED` | Enable realtime dubbing | `false` |
| `OLORIN_SEMANTIC_SEARCH_ENABLED` | Enable semantic search | `false` |
| `OLORIN_CULTURAL_CONTEXT_ENABLED` | Enable cultural context | `false` |
| `OLORIN_RECAP_ENABLED` | Enable recap agent | `false` |

### Partner API

| Variable | Description | Default |
|----------|-------------|---------|
| `PARTNER_API_KEY_SALT` | Salt for API key hashing | Required |
| `PARTNER_DEFAULT_RATE_LIMIT_RPM` | Rate limit (requests/min) | `60` |
| `PARTNER_WEBHOOK_TIMEOUT_SECONDS` | Webhook timeout | `10.0` |

### Pinecone (Semantic Search)

| Variable | Description | Default |
|----------|-------------|---------|
| `PINECONE_API_KEY` | Pinecone API key | Required |
| `PINECONE_ENVIRONMENT` | Pinecone environment | `us-east-1-aws` |
| `PINECONE_INDEX_NAME` | Index name | `olorin-content` |

### Embedding

| Variable | Description | Default |
|----------|-------------|---------|
| `EMBEDDING_MODEL` | OpenAI embedding model | `text-embedding-3-small` |
| `EMBEDDING_DIMENSIONS` | Vector dimensions | `1536` |

### Dubbing

| Variable | Description | Default |
|----------|-------------|---------|
| `DUBBING_MAX_CONCURRENT_SESSIONS` | Max concurrent sessions | `100` |
| `DUBBING_SESSION_TIMEOUT_MINUTES` | Session timeout | `120` |
| `DUBBING_TARGET_LATENCY_MS` | Target latency | `2000` |

### Recap

| Variable | Description | Default |
|----------|-------------|---------|
| `RECAP_MAX_CONTEXT_TOKENS` | Max context tokens | `8000` |
| `RECAP_WINDOW_DEFAULT_MINUTES` | Default time window | `15` |
| `RECAP_SUMMARY_MAX_TOKENS` | Max summary tokens | `300` |

### Metering

| Variable | Description | Default |
|----------|-------------|---------|
| `METERING_COST_PER_AUDIO_SECOND_STT` | STT cost/second | `0.00004` |
| `METERING_COST_PER_AUDIO_SECOND_TTS` | TTS cost/second | `0.00024` |
| `METERING_COST_PER_1K_TRANSLATION_CHARS` | Translation cost/1k chars | `0.00002` |

### Resilience

| Variable | Description | Default |
|----------|-------------|---------|
| `RESILIENCE_CIRCUIT_BREAKER_FAILURE_THRESHOLD` | Failures before open | `5` |
| `RESILIENCE_CIRCUIT_BREAKER_RECOVERY_TIMEOUT_SECONDS` | Recovery timeout | `30` |
| `RESILIENCE_RETRY_MAX_ATTEMPTS` | Max retries | `3` |

## Development

```bash
# Install dependencies
poetry install

# Run tests
poetry run pytest

# Type checking
poetry run mypy olorin_config

# Formatting
poetry run black olorin_config
poetry run isort olorin_config
```

## License

Proprietary - Olorin.ai
